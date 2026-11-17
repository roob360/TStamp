@echo off
cd /d "%~dp0"
call npm install
call npm run build
echo.
echo Selesai. Hasil: dist\TStamp.exe
pause
