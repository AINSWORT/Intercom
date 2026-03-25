# Instrucciones para subir el proyecto a GitHub

## Pasos para subir tu proyecto:

1. **Instalar Git** (si no lo tienes):
   - Descarga desde: https://git-scm.com/download/win
   - Instala con las opciones predeterminadas

2. **Inicializar el repositorio**:
   ```bash
   cd "C:\Users\pc-1\OneDrive\Escritorio\intercom\Intercom-web"
   git init
   ```

3. **Agregar el repositorio remoto**:
   ```bash
   git remote add origin https://github.com/JesseAinsworth/Intercom.git
   ```

4. **Agregar todos los archivos**:
   ```bash
   git add .
   ```

5. **Hacer commit**:
   ```bash
   git commit -m "Initial commit: NetTrack Pro login interface"
   ```

6. **Subir al repositorio**:
   ```bash
   git push -u origin main
   ```

## Si el repositorio ya tiene contenido:

Si obtienes un error al hacer push, primero haz:
```bash
git pull origin main --allow-unrelated-histories
```

Luego intenta el push nuevamente.

## Archivos incluidos en este commit:
- Aplicación React con Vite
- Interfaz de login de NetTrack Pro
- Configuración de Tailwind CSS v4
- Componentes UI personalizados
- Estructura del proyecto completa