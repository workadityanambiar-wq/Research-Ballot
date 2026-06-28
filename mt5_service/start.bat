@echo off
echo Starting MT5 Market Data Service...
cd /d "%~dp0"

if not exist ".env" (
    echo ERROR: .env file not found. Copy .env.example to .env and fill in credentials.
    pause
    exit /b 1
)

pip install -r requirements.txt --quiet
python main.py
pause
