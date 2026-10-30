@echo off
title Voice Character Studio
cd /d "%~dp0"
echo ===================================================
echo        VOICE CHARACTER STUDIO (LOCALHOST)
echo ===================================================
echo Starting localhost studio server...
echo URL: http://localhost:5173
echo.
npm run dev
pause
