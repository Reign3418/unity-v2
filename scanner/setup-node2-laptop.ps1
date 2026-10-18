# ==============================================================================
# UNITY AUTONOMOUS TELEMETRY CLUSTER — NODE 2 (64GB QUADRO LAPTOP) PROVISIONER
# File: E:\Unity\scanner\setup-node2-laptop.ps1
# Target Hardware: Node 2 (64GB RAM / NVIDIA Quadro Workstation Laptop)
# Connects To: Node 1 (MIXERV3 — 192.168.50.41) & Unity AWS DynamoDB
# ==============================================================================

$ErrorActionPreference = "Continue"
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  UNITY AUTONOMOUS TELEMETRY — NODE 2 EMULATOR CLUSTER SETUP" -ForegroundColor Cyan
Write-Host "  Target: 64GB RAM / NVIDIA Quadro Workstation Laptop" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Install Python 3.12 & Android Platform Tools (ADB) via winget if missing
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[1/5] Installing Python 3.12 via winget..." -ForegroundColor Yellow
    winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "[1/5] Python already installed: $(python --version)" -ForegroundColor Green
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "[2/5] Installing Google Android Platform Tools (ADB) via winget..." -ForegroundColor Yellow
    winget install -e --id Google.PlatformTools --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "[2/5] ADB already installed: $(adb --version | Select-Object -First 1)" -ForegroundColor Green
}

# 2. Create Python Virtual Environment & Install Zero-Cost Local OCR Stack
$ScannerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScannerDir

Write-Host "[3/5] Setting up Python virtual environment & RapidOCR ONNX engine..." -ForegroundColor Yellow
if (-not (Test-Path "$ScannerDir\.venv")) {
    python -m venv .venv
}

& "$ScannerDir\.venv\Scripts\pip.exe" install --upgrade pip
& "$ScannerDir\.venv\Scripts\pip.exe" install rapidocr-onnxruntime Pillow numpy requests

# 3. Configure Private LAN Firewall Rule so Node 1 (MIXERV3 192.168.50.41) can reach ADB if needed
Write-Host "[4/5] Allowing Private LAN (192.168.50.0/24) access to ADB ports 5555-5595..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Unity Node2 ADB Telemetry Cluster" `
    -Direction Inbound -Protocol TCP -LocalPort 5555-5595 `
    -Profile Private -RemoteAddress 192.168.50.0/24 -Action Allow -ErrorAction SilentlyContinue | Out-Null

# 4. Print Emulator Configuration Checklist for Node 2 (64GB RAM)
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  [5/5] NODE 2 READY! EMULATOR INSTANCE SETTINGS (MuMu 12 / LDPlayer 9)" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  With 64GB RAM on Node 2, configure up to 4 instances as follows:"
Write-Host "  • Resolution:     1600 x 900 (240 DPI) — MANDATORY for pixel boxes" -ForegroundColor White
Write-Host "  • CPU / RAM:      2 Cores / 4096 MB RAM per instance" -ForegroundColor White
Write-Host "  • Frame Rate:     30 FPS (Low Graphics inside Rise of Kingdoms)" -ForegroundColor White
Write-Host "  • ADB Debugging:  Enable 'Local Connection / ADB Debugging'" -ForegroundColor White
Write-Host ""
Write-Host "  Instance Allocation Plan on Node 2:" -ForegroundColor Amber
Write-Host "  • Emulator #1 (127.0.0.1:5555 or 16384): 24/7 Alliance Rally & Activity Watcher"
Write-Host "  • Emulator #2 (127.0.0.1:5565 or 16416): Kingdom Scanner Worker A (Ranks 1-150)"
Write-Host "  • Emulator #3 (127.0.0.1:5575 or 16448): Kingdom Scanner Worker B (Ranks 151-300)"
Write-Host ""
Write-Host "  Test calibration anytime with:" -ForegroundColor Cyan
Write-Host "  .\.venv\Scripts\python.exe unity_autonomous_scanner.py --mode calibrate --adb 127.0.0.1:5555" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Green
