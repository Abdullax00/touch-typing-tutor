#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Локальный сервер тренажёра слепой печати «В стране клавиш» с поддержкой общего рейтинга класса.
Позволяет открыть тренажёр для всего компьютерного класса по сети Wi-Fi/LAN,
автоматически собирает результаты каждого ПК и выстраивает общий рейтинг учеников.
"""

import http.server
import socketserver
import socket
import webbrowser
import os
import sys
import json
import urllib.parse
from datetime import datetime, timezone

PORT = 8080
LEADERBOARD_FILE = "leaderboard.json"

def get_utc_now():
    return datetime.now(timezone.utc).isoformat()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def load_leaderboard():
    if os.path.exists(LEADERBOARD_FILE):
        try:
            with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[!] Ошибка чтения {LEADERBOARD_FILE}: {e}")
    return {"students": {}}

def save_leaderboard(data):
    try:
        temp_file = LEADERBOARD_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        if os.path.exists(LEADERBOARD_FILE):
            os.replace(temp_file, LEADERBOARD_FILE)
        else:
            os.rename(temp_file, LEADERBOARD_FILE)
    except Exception as e:
        print(f"[!] Ошибка записи {LEADERBOARD_FILE}: {e}")

class ClassroomServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS заголовки и отключение кэширования
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # 1. API получения общего рейтинга класса
        if path == '/api/leaderboard':
            lb = load_leaderboard()
            students_list = list(lb.get("students", {}).values())
            
            # Сортировка по умолчанию: количество звёзд desc, затем средняя скорость desc
            students_list.sort(key=lambda x: (x.get("totalStars", 0), x.get("avgWpm", 0), x.get("completedLessons", 0)), reverse=True)
            
            response_data = {
                "serverTime": get_utc_now(),
                "totalStudents": len(students_list),
                "leaderboard": students_list
            }
            self.send_json_response(200, response_data)
            return

        # 2. API получения данных конкретного пользователя
        if path == '/api/user':
            username = query.get("username", [None])[0]
            if not username:
                self.send_json_response(400, {"error": "Missing username parameter"})
                return
            lb = load_leaderboard()
            student = lb.get("students", {}).get(username)
            if student:
                self.send_json_response(200, {"status": "ok", "student": student})
            else:
                self.send_json_response(404, {"status": "not_found", "username": username})
            return

        # Иначе раздаём обычные статические файлы
        super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # 1. API сохранения прогресса и обновления рейтинга
        if path == '/api/progress':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len)
                payload = json.loads(post_body.decode('utf-8'))
            except Exception as e:
                self.send_json_response(400, {"error": f"Invalid JSON payload: {e}"})
                return

            username = payload.get("username", "").strip()
            if not username:
                self.send_json_response(400, {"error": "username is required"})
                return

            display_name = payload.get("displayName", "").strip() or username
            pc_name = payload.get("pcName", "").strip() or "ПК"
            client_ip = self.client_address[0]

            lb = load_leaderboard()
            students = lb.setdefault("students", {})
            student_entry = students.get(username, {})

            # Обновляем профиль
            student_entry["username"] = username
            student_entry["displayName"] = display_name
            student_entry["pcName"] = pc_name
            student_entry["ipAddress"] = client_ip
            student_entry["lastActive"] = get_utc_now()

            # Объединяем прогресс по урокам
            incoming_lessons = payload.get("lessons", {})
            existing_lessons = student_entry.get("lessons", {})

            for les_num_str, les_data in incoming_lessons.items():
                if les_num_str not in existing_lessons:
                    existing_lessons[les_num_str] = les_data
                else:
                    curr = existing_lessons[les_num_str]
                    # Сохраняем лучший результат
                    existing_lessons[les_num_str] = {
                        "completed": curr.get("completed", False) or les_data.get("completed", False),
                        "stars": max(curr.get("stars", 0), les_data.get("stars", 0)),
                        "wpm": max(curr.get("wpm", 0), les_data.get("wpm", 0)),
                        "cpm": max(curr.get("cpm", 0), les_data.get("cpm", 0)),
                        "accuracy": max(curr.get("accuracy", 0), les_data.get("accuracy", 0)),
                        "lastDate": les_data.get("lastDate", curr.get("lastDate"))
                    }

            student_entry["lessons"] = existing_lessons

            # Пересчитываем суммарную статистику
            total_stars = 0
            completed_count = 0
            total_wpm = 0
            best_wpm = 0
            total_acc = 0

            for l_info in existing_lessons.values():
                if l_info.get("completed"):
                    completed_count += 1
                    total_stars += l_info.get("stars", 0)
                    w = l_info.get("wpm", 0)
                    total_wpm += w
                    if w > best_wpm:
                        best_wpm = w
                    total_acc += l_info.get("accuracy", 100)

            avg_wpm = round(total_wpm / completed_count) if completed_count > 0 else 0
            avg_acc = round(total_acc / completed_count) if completed_count > 0 else 100

            student_entry["totalStars"] = total_stars
            student_entry["completedLessons"] = completed_count
            student_entry["avgWpm"] = avg_wpm
            student_entry["bestWpm"] = best_wpm
            student_entry["avgAccuracy"] = avg_acc

            students[username] = student_entry
            save_leaderboard(lb)

            # Формируем и отдаём актуальный рейтинг
            students_list = list(students.values())
            students_list.sort(key=lambda x: (x.get("totalStars", 0), x.get("avgWpm", 0), x.get("completedLessons", 0)), reverse=True)

            print(f"[+] Прогресс сохранён: {display_name} ({username}@{pc_name}) — Звёзд: {total_stars}, Уроков: {completed_count}, Скорость: {avg_wpm} СВМ")

            self.send_json_response(200, {
                "status": "ok",
                "student": student_entry,
                "leaderboard": students_list
            })
            return

        # 2. API сброса рейтинга (для учителя)
        if path == '/api/reset_leaderboard':
            save_leaderboard({"students": {}})
            print("[!] Рейтинг класса был сброшен преподавателем.")
            self.send_json_response(200, {"status": "ok", "message": "Leaderboard reset"})
            return

        self.send_json_response(404, {"error": "Endpoint not found"})

    def send_json_response(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    local_url = f"http://localhost:{PORT}"
    lan_url = f"http://{local_ip}:{PORT}"

    print("=" * 68)
    print("  ⌨️  СЕРВЕР ТРЕНАЖЁРА «В СТРАНЕ КЛАВИШ» + ОБЩИЙ РЕЙТИНГ КЛАССА")
    print("=" * 68)
    print(f"Сервер успешно запущен!\n")
    print(f"👉 На компьютере учителя:           {local_url}")
    print(f"👉 Адрес для компьютеров учеников:  {lan_url}\n")
    print(f"📊 Рейтинг класса сохраняется в:     {os.path.abspath(LEADERBOARD_FILE)}")
    print("Все компьютеры в классе автоматически синхронизируют свои результаты.")
    print("Чтобы остановить сервер, нажмите Ctrl + C в этом окне.")
    print("=" * 68)

    try:
        webbrowser.open(local_url)
    except Exception:
        pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ClassroomServerHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер остановлен.")
            sys.exit(0)

if __name__ == '__main__':
    main()
