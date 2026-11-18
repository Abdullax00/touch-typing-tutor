@echo off
chcp 65001 > nul
title Локальный тренажёр слепой печати «В стране клавиш»

set "CURRENT_DIR=%~dp0"
set "HTML_FILE=%CURRENT_DIR%index.html"
set "USER_ENV=%CURRENT_DIR%user_env.js"

:: Записываем данные учётной записи Windows
echo window.WINDOWS_USER = { username: "%USERNAME%", pcName: "%COMPUTERNAME%", domain: "%USERDOMAIN%" }; > "%USER_ENV%"

echo Запуск тренажёра слепой печати «В стране клавиш» для пользователя %USERNAME% (%COMPUTERNAME%)...

set "URL=file:///%HTML_FILE:\=/%?user=%USERNAME%&pc=%COMPUTERNAME%"

:: Попробуем запустить в режиме настольного приложения (App Mode) через Edge или Chrome
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --user-data-dir="%CURRENT_DIR%UserData"
    exit /b
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --user-data-dir="%CURRENT_DIR%UserData"
    exit /b
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%URL%" --user-data-dir="%CURRENT_DIR%UserData"
    exit /b
)

:: Если пути нестандартные, открываем в браузере по умолчанию
start "" "%URL%"
exit /b
