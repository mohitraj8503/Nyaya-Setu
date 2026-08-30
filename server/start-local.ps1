$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverDir = $PSScriptRoot

if (-not (Test-Path (Join-Path $serverDir ".env"))) {
    Copy-Item (Join-Path $serverDir ".env.example") (Join-Path $serverDir ".env")
}

$env:NODE_ENV = "development"
$env:PORT = "5000"

Set-Location $serverDir
node server.js
