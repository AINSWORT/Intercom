# Script para subir proyecto a GitHub
Write-Host "Configurando repositorio Git..." -ForegroundColor Green

# Cambiar al directorio del proyecto
Set-Location "C:\Users\pc-1\OneDrive\Escritorio\intercom\Intercom-web"

# Inicializar Git
git init
git remote add origin https://github.com/JesseAinsworth/Intercom.git

# Agregar archivos
git add .

# Hacer commit
git commit -m "Initial commit: NetTrack Pro login interface with React + Tailwind CSS v4"

# Subir a GitHub
git push -u origin main

Write-Host "¡Proyecto subido exitosamente!" -ForegroundColor Green
Read-Host "Presiona Enter para continuar"