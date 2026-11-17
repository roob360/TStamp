@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Memasang komponen pertama kali, mohon tunggu...
  call npm install
)
call npm start
