@echo off
setlocal EnableDelayedExpansion
title Giveaway Deduplicator - Setup and Build

echo ================================================
echo   Giveaway Deduplicator - Setup and Build
echo ================================================
echo.

:: ── Check for Python ────────────────────────────────────────────────────────

set PYTHON=python
set PY_INSTALL_DIR=%LOCALAPPDATA%\Programs\Python\Python312

python --version >nul 2>&1
if %errorlevel% neq 0 (
    :: Not in PATH - check the default per-user install location
    if exist "%PY_INSTALL_DIR%\python.exe" (
        set PYTHON=%PY_INSTALL_DIR%\python.exe
        set PATH=%PY_INSTALL_DIR%;%PY_INSTALL_DIR%\Scripts;%PATH%
        echo Found Python at %PY_INSTALL_DIR%
    ) else (
        goto :download_python
    )
) else (
    echo Found: && python --version
)
goto :install_deps

:: ── Download and install Python ──────────────────────────────────────────────

:download_python
echo Python not found. Downloading Python 3.12.9...
echo.

set PY_URL=https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe
set PY_INSTALLER=%TEMP%\python_installer.exe

:: Use PowerShell to download (available on all modern Windows)
powershell -NoProfile -Command "Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_INSTALLER%' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Download failed. Check your internet connection.
    echo You can also install Python manually from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Installing Python for current user (no administrator rights required)...
"%PY_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_launcher=1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python installation failed.
    pause
    exit /b 1
)

del "%PY_INSTALLER%"

set PYTHON=%PY_INSTALL_DIR%\python.exe
set PATH=%PY_INSTALL_DIR%;%PY_INSTALL_DIR%\Scripts;%PATH%

echo Python installed successfully.
echo.

:: ── Install dependencies and build ──────────────────────────────────────────

:install_deps
echo Installing dependencies...
"%PYTHON%" -m pip install --upgrade pip --quiet
"%PYTHON%" -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo Building executable...
"%PYTHON%" -m PyInstaller --onefile --windowed --name GiveawayDeduplicator --clean deduplicator.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Done!
echo   Executable: dist\GiveawayDeduplicator.exe
echo   Share that single file - no install needed.
echo ================================================
pause
