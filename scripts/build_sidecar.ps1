#Requires -Version 5.1
<#
.SYNOPSIS
    Compila el sidecar Django con PyInstaller y lo copia a src-tauri/binaries/.
.DESCRIPTION
    Reproduce localmente los mismos pasos del Job 1 de release-local.yml:
    1. Build del frontend React
    2. collectstatic con env vars de modo local
    3. pyinstaller mallor-server.spec
    4. Copia del sidecar a src-tauri/binaries/ con el nombre de target triple
.EXAMPLE
    .\scripts\build_sidecar.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

Write-Host "[build-sidecar] 1/4 — Construyendo frontend React..."
npm run build --prefix frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend build fallido" }

Write-Host "[build-sidecar] 2/4 — Ejecutando collectstatic..."
$env:MALLOR_MODE = "local"
$env:MALLOR_LOCAL_SERVER = "true"
$env:DATABASE_URL = "sqlite:///tmp_build.db"
$env:DB_SSL_REQUIRE = "false"
$env:DEBUG = "false"
$env:SECURE_SSL_REDIRECT = "false"
$env:SECRET_KEY = "build-secret-key-not-used-in-production"

.\venv\Scripts\python.exe manage.py collectstatic --noinput --clear
if ($LASTEXITCODE -ne 0) { throw "collectstatic fallido" }

Remove-Item "tmp_build.db" -Force -ErrorAction SilentlyContinue

Write-Host "[build-sidecar] 3/4 — Compilando sidecar con PyInstaller..."
.\venv\Scripts\pyinstaller.exe mallor-server.spec --noconfirm
if ($LASTEXITCODE -ne 0) { throw "PyInstaller fallido" }

Write-Host "[build-sidecar] 4/4 — Copiando sidecar a src-tauri/binaries/..."
$binDir = "src-tauri\binaries"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$sidecarDir = "dist\mallor-server"
$targetExe = "$binDir\mallor-server-x86_64-pc-windows-msvc.exe"

Copy-Item -Path "$sidecarDir\*" -Destination $binDir -Recurse -Force
Rename-Item -Path "$binDir\mallor-server.exe" -NewName "mallor-server-x86_64-pc-windows-msvc.exe" -Force -ErrorAction SilentlyContinue

if (Test-Path $targetExe) {
    $size = (Get-Item $targetExe).Length / 1MB
    Write-Host "[build-sidecar] Listo: $targetExe ($([math]::Round($size, 1)) MB)"
    Write-Host "[build-sidecar] Ahora puedes ejecutar: npm run tauri:build"
} else {
    throw "No se encontró el sidecar en $targetExe"
}
