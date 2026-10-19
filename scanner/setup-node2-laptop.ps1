# ==============================================================================
# UNITY AUTONOMOUS TELEMETRY CLUSTER - NODE 2 (64GB QUADRO LAPTOP) PROVISIONER
# File: E:\Unity\scanner\setup-node2-laptop.ps1
# Target Hardware: Node 2 (SIDEKICK - 64GB RAM / NVIDIA Quadro P3000)
# Connects To: Node 1 (MIXERV3 - 192.168.50.41) and Unity AWS DynamoDB
# ==============================================================================

$ErrorActionPreference = "Continue"
$ScannerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScannerDir) { $ScannerDir = "C:\UnityScanner" }
Set-Location $ScannerDir

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  UNITY AUTONOMOUS TELEMETRY - NODE 2 EMULATOR CLUSTER SETUP" -ForegroundColor Cyan
Write-Host "  Target: SIDEKICK (64GB RAM / NVIDIA Quadro P3000 Workstation)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Helper to find real Python 3 executable (ignoring Windows Store stub)
function Find-PythonExe {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "C:\Python312\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd -and ($cmd.Source -notlike "*WindowsApps*")) {
        return $cmd.Source
    }
    return $null
}

$PythonExe = Find-PythonExe
if (-not $PythonExe) {
    Write-Host "[1/5] Installing Python 3.12 (64-bit) directly from python.org..." -ForegroundColor Yellow
    $pyInstaller = "$ScannerDir\python-3.12.8-amd64.exe"
    Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe" -OutFile $pyInstaller -UseBasicParsing
    Start-Process -FilePath $pyInstaller -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait
    Remove-Item $pyInstaller -Force -ErrorAction SilentlyContinue
    $PythonExe = Find-PythonExe
}
Write-Host "[1/5] Python ready: $PythonExe" -ForegroundColor Green

# 2. Install Google Android Platform Tools (ADB) into C:\UnityScanner\platform-tools
$AdbExe = "$ScannerDir\platform-tools\adb.exe"
if (-not (Test-Path $AdbExe)) {
    Write-Host "[2/5] Downloading Google Android Platform Tools (ADB)..." -ForegroundColor Yellow
    $adbZip = "$ScannerDir\platform-tools.zip"
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/platform-tools-latest-windows.zip" -OutFile $adbZip -UseBasicParsing
    Expand-Archive -Path $adbZip -DestinationPath $ScannerDir -Force
    Remove-Item $adbZip -Force -ErrorAction SilentlyContinue
}
$env:Path = "$ScannerDir\platform-tools;$env:Path"
Write-Host "[2/5] ADB ready: $(& $AdbExe --version | Select-Object -First 1)" -ForegroundColor Green

# 3. Create Python Virtual Environment and Install Zero-Cost Local OCR Stack
Write-Host "[3/5] Setting up Python virtual environment and RapidOCR ONNX engine..." -ForegroundColor Yellow
if (-not (Test-Path "$ScannerDir\.venv\Scripts\python.exe")) {
    & $PythonExe -m venv "$ScannerDir\.venv"
}

& "$ScannerDir\.venv\Scripts\python.exe" -m pip install --upgrade pip
& "$ScannerDir\.venv\Scripts\pip.exe" install rapidocr-onnxruntime Pillow numpy requests

# 4. Configure Private LAN Firewall Rule so Node 1 (MIXERV3 192.168.50.41) can reach ADB if needed
Write-Host "[4/5] Allowing Private LAN (192.168.50.0/24) access to ADB ports 5555-5595 and 16384-16480..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Unity Node2 ADB Telemetry Cluster" `
    -Direction Inbound -Protocol TCP -LocalPort 5555-5595,16384-16480 `
    -Profile Private -RemoteAddress 192.168.50.0/24 -Action Allow -ErrorAction SilentlyContinue | Out-Null

# 5. Print Summary
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  [5/5] NODE 2 (SIDEKICK) PROVISIONING COMPLETE!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  - Resolution:     1600 x 900 (240 DPI) - MANDATORY for pixel boxes"
Write-Host "  - CPU / RAM:      2 Cores / 4096 MB RAM per instance"
Write-Host "  - Frame Rate:     30 FPS (Low Graphics inside Rise of Kingdoms)"
Write-Host "  - ADB Binary:     C:\UnityScanner\platform-tools\adb.exe"
Write-Host "  - Python OCR:     C:\UnityScanner\.venv\Scripts\python.exe"
Write-Host "==================================================================" -ForegroundColor Green
