@echo off
setlocal enabledelayedexpansion

echo ========================================
echo PropFirms Ticketing MCP Server Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    echo         Download from: https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo         Please run this script from the mcp-server directory
    exit /b 1
)

REM Install dependencies
echo [STEP] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

REM Build the project
echo [STEP] Building MCP server...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build project
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo [STEP] Creating .env file...
    copy .env.example .env >nul
    echo [OK] .env file created
    echo.
    echo [WARNING] IMPORTANT: Edit .env and set your configuration:
    echo           - TICKETING_BASE_URL (your server URL^)
    echo           - TICKETING_API_KEY (generate a secure key^)
    echo.
) else (
    echo [OK] .env file already exists
)

REM Get absolute path
set "BUILD_PATH=%CD%\build\index.js"

echo.
echo [OK] Setup complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Generate an API key:
echo    node -e "console.log('mcp_sk_' + require('crypto'^).randomBytes(32^).toString('hex'^)^)"
echo.
echo 2. Add the API key to your main project's .env file:
echo    MCP_API_KEY=your_generated_key
echo.
echo 3. Edit mcp-server\.env and set:
echo    TICKETING_BASE_URL=https://your-domain.com
echo    TICKETING_API_KEY=your_generated_key
echo.
echo 4. Add to Claude Desktop config:
echo    Location: %%APPDATA%%\Claude\claude_desktop_config.json
echo.
echo    {
echo      "mcpServers": {
echo        "propfirms-ticketing": {
echo          "command": "node",
echo          "args": ["%BUILD_PATH%"],
echo          "env": {
echo            "TICKETING_BASE_URL": "https://your-domain.com",
echo            "TICKETING_API_KEY": "your_generated_key"
echo          }
echo        }
echo      }
echo    }
echo.
echo 5. Restart Claude Desktop
echo.
echo For detailed instructions, see README.md
echo For team usage guide, see TEAM_GUIDE.md
echo.
pause
