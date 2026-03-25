@echo off
echo Instalando Git...
winget install --id Git.Git -e --source winget

echo.
echo Configurando repositorio...
cd "C:\Users\pc-1\OneDrive\Escritorio\intercom\Intercom-web"

git init
git remote add origin https://github.com/JesseAinsworth/Intercom.git
git add .
git commit -m "Initial commit: NetTrack Pro login interface with React + Tailwind CSS"
git push -u origin main

echo.
echo ¡Proyecto subido exitosamente a GitHub!
pause