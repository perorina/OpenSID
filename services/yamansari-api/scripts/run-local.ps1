param(
    [string] $Addr = "127.0.0.1:8090",
    [string] $ConfigId = "1",
    [string] $AllowedOrigins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    [string] $OpenSIDBaseUrl = "http://127.0.0.1:8081",
    [string] $InternalApiKey = "dev-internal-key",
    [switch] $SkipOpenSIDConfig
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiRoot = Split-Path -Parent $ScriptRoot
$RepoRoot = Resolve-Path (Join-Path $ApiRoot "..\..")

function Resolve-Php {
    $localPhp = Join-Path $RepoRoot "tools\php-8.2.30-nts-Win32-vs16-x64\php.exe"
    if (Test-Path $localPhp) {
        return $localPhp
    }

    $globalPhp = Get-Command php -ErrorAction SilentlyContinue
    if ($null -ne $globalPhp) {
        return $globalPhp.Source
    }

    throw "PHP executable not found. Install PHP or keep tools\php-8.2.30-nts-Win32-vs16-x64\php.exe available."
}

if (-not $env:YMS_DB_DSN -and -not $env:YMS_DB_CONFIG_JSON -and -not $SkipOpenSIDConfig) {
    $php = Resolve-Php
    $phpIni = Join-Path $RepoRoot "tools\opensid-php.ini"
    $dbConfigScript = Join-Path $ScriptRoot "opensid-db-config.php"
    $phpArgs = @()
    if (Test-Path $phpIni) {
        $phpArgs += @("-c", $phpIni)
    }
    $phpArgs += @($dbConfigScript, "--format=json")

    $configJson = & $php @phpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot read OpenSID database config."
    }
    $env:YMS_DB_CONFIG_JSON = ($configJson | Out-String).Trim()
}

if (-not $env:YMS_API_ADDR) {
    $env:YMS_API_ADDR = $Addr
}
if (-not $env:YMS_CONFIG_ID) {
    $env:YMS_CONFIG_ID = $ConfigId
}
if (-not $env:YMS_ALLOWED_ORIGINS) {
    $env:YMS_ALLOWED_ORIGINS = $AllowedOrigins
}
if (-not $env:YMS_OPENSID_BASE_URL) {
    $env:YMS_OPENSID_BASE_URL = $OpenSIDBaseUrl
}
if (-not $env:YMS_INTERNAL_API_KEY) {
    $env:YMS_INTERNAL_API_KEY = $InternalApiKey
}
if (-not $env:YMS_JWT_SECRET) {
    $env:YMS_JWT_SECRET = "dev-change-me"
}
if (-not $env:YMS_COOKIE_SECURE) {
    $env:YMS_COOKIE_SECURE = "false"
}

Write-Host "Starting Yamansari API at http://$($env:YMS_API_ADDR)/api/yms"
Push-Location $ApiRoot
try {
    go run .
}
finally {
    Pop-Location
}
