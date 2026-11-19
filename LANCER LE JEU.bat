@echo off
setlocal
cd /d "%~dp0"
title APEX RUN 2 - Lanceur

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo ===============================================
    echo       APEX RUN 2 - Premiere installation
    echo ===============================================
    echo.
    echo Il faut d'abord installer Node.js LTS.
    echo Le site d'installation s'ouvre maintenant.
    echo Relance ensuite ce fichier par double clic.
    echo.
    start "" "https://nodejs.org/fr"
    pause
    exit /b 1
)

if not exist "%~dp0server.js" (
    echo ERREUR : server.js est introuvable.
    echo Decompresse tout le ZIP et garde tous les fichiers dans leur dossier.
    pause
    exit /b 1
)

echo.
echo APEX RUN 2 - Lancement du serveur multijoueur...
echo Garde la fenetre du serveur ouverte pendant la course.
echo.
start "APEX RUN 2 - Serveur" /D "%~dp0" cmd /k "node server.js"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
echo Jeu ouvert sur http://localhost:3000
exit /b 0
