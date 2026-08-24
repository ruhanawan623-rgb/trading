@echo off
title Olymp Trade / TradingView Pro Launcher
cd /d "%~dp0"
echo ===================================================
echo   Starting Trading Web Platform & Live Feed Server
echo ===================================================
echo.
start "" http://127.0.0.1:5000
python server.py
pause
