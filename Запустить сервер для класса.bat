@echo off
chcp 65001 > nul
title Сервер тренажёра слепой печати (для всего класса)

cd /d "%~dp0"
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ошибка: Python не найден. 
    echo Вы можете просто дважды нажать на файл index.html или "Запустить тренажёр.bat"
    pause
)
