@echo off
setlocal EnableExtensions

title Yamansari Local Stack

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%frontend"
set "API_RUNNER=%ROOT%services\yamansari-api\scripts\run-local.ps1"
set "PHP_EXE=%ROOT%tools\php-8.2.30-nts-Win32-vs16-x64\php.exe"
set "PHP_INI=%ROOT%tools\opensid-php.ini"
set "MYSQLD_EXE=C:\xampp\mysql\bin\mysqld.exe"
set "MYSQL_BASE=C:\xampp\mysql"
set "MYSQL_INI=%ROOT%tools\mariadb-data\my.ini"
set "MYSQL_LOG=%ROOT%tools\mariadb-data\opensid-mariadb.err"
set "INTERNAL_API_KEY=dev-internal-key"
set "FRONTEND_URL=http://127.0.0.1:5174/"

if /i "%~1"=="status" goto :status

echo.
echo ==============================================
echo   Desa Yamansari - Local Development Stack
echo ==============================================
echo.

call :require_command powershell.exe "PowerShell"
if errorlevel 1 exit /b 1

call :require_command go.exe "Go"
if errorlevel 1 exit /b 1

call :require_command node.exe "Node.js"
if errorlevel 1 exit /b 1

call :require_command npm.cmd "npm"
if errorlevel 1 exit /b 1

call :require_file "%MYSQLD_EXE%" "MariaDB executable"
if errorlevel 1 exit /b 1

call :require_file "%MYSQL_INI%" "MariaDB config"
if errorlevel 1 exit /b 1

call :require_file "%PHP_EXE%" "PHP portable"
if errorlevel 1 exit /b 1

call :require_file "%PHP_INI%" "PHP config"
if errorlevel 1 exit /b 1

call :require_file "%API_RUNNER%" "Yamansari API runner"
if errorlevel 1 exit /b 1

if not exist "%FRONTEND_DIR%\node_modules\.bin\vite.cmd" (
  echo [setup] Installing frontend dependencies...
  pushd "%FRONTEND_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo [error] Frontend dependencies failed to install.
    exit /b 1
  )
  popd
)

call :is_listening 3307
if errorlevel 1 (
  echo [start] MariaDB OpenSID on 127.0.0.1:3307
  start "OpenSID MariaDB :3307" /min "%MYSQLD_EXE%" --defaults-file="%MYSQL_INI%" --basedir="%MYSQL_BASE%" --bind-address=127.0.0.1 --innodb-use-native-aio=0 --max-connections=100 --key-buffer-size=16M --log-error="%MYSQL_LOG%"
  call :wait_for_port 3307 30
  if errorlevel 1 (
    echo [error] MariaDB did not become ready. Check:
    echo         %MYSQL_LOG%
    exit /b 1
  )
) else (
  echo [ready] MariaDB already listening on :3307
)

call :is_listening 8081
if errorlevel 1 (
  echo [start] OpenSID PHP on http://127.0.0.1:8081/
  start "OpenSID PHP :8081" /min "%PHP_EXE%" -c "%PHP_INI%" -S 127.0.0.1:8081 -t "%ROOT%"
  call :wait_for_port 8081 20
  if errorlevel 1 (
    echo [error] OpenSID PHP server did not become ready.
    exit /b 1
  )
) else (
  echo [ready] OpenSID PHP already listening on :8081
)

call :is_listening 8090
if errorlevel 1 (
  echo [start] Yamansari Go API on http://127.0.0.1:8090/api/yms
  start "Yamansari Go API :8090" /min powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%API_RUNNER%" -Addr "127.0.0.1:8090" -OpenSIDBaseUrl "http://127.0.0.1:8081" -InternalApiKey "%INTERNAL_API_KEY%" -EnableSampleData
  call :wait_for_port 8090 45
  if errorlevel 1 (
    echo [error] Go API did not become ready. Check the API window.
    exit /b 1
  )
) else (
  echo [ready] Yamansari Go API already listening on :8090
)

call :is_listening 5174
if errorlevel 1 (
  echo [start] Vite SSR on %FRONTEND_URL%
  start "Yamansari Vite SSR :5174" /min powershell.exe -NoLogo -NoProfile -NoExit -Command "$env:SSR_PORT='5174'; $env:SSR_PUBLIC_SITE_URL='%FRONTEND_URL%'; $env:YMS_API_BASE_INTERNAL='http://127.0.0.1:8090/api/yms'; $env:YMS_INTERNAL_API_KEY='%INTERNAL_API_KEY%'; Set-Location -LiteralPath '%FRONTEND_DIR%'; npm.cmd run dev"
  call :wait_for_port 5174 45
  if errorlevel 1 (
    echo [error] Vite SSR did not become ready. Check the frontend window.
    exit /b 1
  )
) else (
  echo [ready] Vite SSR already listening on :5174
)

echo.
echo [ready] Local stack is running:
echo         Frontend : %FRONTEND_URL%
echo         Go API   : http://127.0.0.1:8090/api/yms/health
echo         OpenSID  : http://127.0.0.1:8081/
echo         MariaDB  : 127.0.0.1:3307
echo.
echo Close the service windows to stop the local stack.

if /i not "%YMS_NO_BROWSER%"=="1" start "" "%FRONTEND_URL%"
exit /b 0

:status
echo.
echo Desa Yamansari local stack status
echo ---------------------------------
call :print_status 3307 "MariaDB"
call :print_status 8081 "OpenSID PHP"
call :print_status 8090 "Go API"
call :print_status 5174 "Vite SSR"
exit /b 0

:require_command
where %~1 >nul 2>nul
if errorlevel 1 (
  echo [error] %~2 is not available in PATH.
  exit /b 1
)
exit /b 0

:require_file
if not exist "%~1" (
  echo [error] %~2 was not found:
  echo         %~1
  exit /b 1
)
exit /b 0

:is_listening
powershell.exe -NoLogo -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort %~1 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:wait_for_port
set "WAIT_PORT=%~1"
set "WAIT_SECONDS=%~2"
for /L %%I in (1,1,%WAIT_SECONDS%) do (
  call :is_listening %WAIT_PORT%
  if not errorlevel 1 exit /b 0
  timeout /t 1 /nobreak >nul
)
exit /b 1

:print_status
call :is_listening %~1
if errorlevel 1 (
  echo [down]  %~2 :%~1
) else (
  echo [up]    %~2 :%~1
)
exit /b 0
