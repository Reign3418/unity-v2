/**
 * ============================================================================
 * UNITY STUDIO CLUSTER HUB (NODE 1 MIXERV3 -> NODE 2 SIDEKICK 192.168.50.218)
 * File: E:\Unity\scanner\node1_cluster_hub.js
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const HOST_IP = '192.168.50.41';
const SCANNER_DIR = __dirname;

const nodes = {}; // hostname -> { lastSeen, info }
const commandQueue = []; // { id, cmd, createdAt }
const commandHistory = [];
const activeTasksByInstance = {}; // instanceId -> taskProgressObj
let liveScanProgress = {
  running: false,
  status: 'IDLE',
  kingdom: '4194',
  currentRank: 0,
  targetRanks: 1000,
  percent: 0,
  lastGovernorName: null,
  lastGovernorPower: 0,
  governorsExtracted: 1000,
  updatedAt: null,
};

function resolveInstId(data) {
  if (data?.instanceId) return data.instanceId;
  const s = String(data?.workerSerial || data?.adbPort || '');
  if (s.includes('16416')) return 'sidekick-mumu-1';
  if (s.includes('16448')) return 'sidekick-mumu-2';
  return 'sidekick-mumu-0';
}

const WORKER_LOOP_PS1 = `
$ErrorActionPreference = "Continue"
$HubUrl = "http://${HOST_IP}:${PORT}"
$WorkDir = "C:\\UnityScanner"
Set-Location $WorkDir
[System.Net.ServicePointManager]::DefaultConnectionLimit = 50
$loopTick = 0

while ($true) {
    try {
        $loopTick++
        if ($loopTick % 15 -eq 1) {
            $venvPy = "$WorkDir\\.venv\\Scripts\\python.exe"
            $brainDir = "$WorkDir\\bastion-brain"
            if ((Test-Path $venvPy) -and (Test-Path $brainDir)) {
                $cProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -OperationTimeoutSec 3 -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*-m cipher*" }
                if (-not $cProc) {
                    Start-Process -FilePath $venvPy -ArgumentList "-u","-m","cipher","--settings","$WorkDir\\.bastion_aws_credentials" -WorkingDirectory $brainDir -RedirectStandardOutput "$WorkDir\\cipher_stdout.log" -RedirectStandardError "$WorkDir\\cipher_stderr.log" -WindowStyle Hidden
                }
                $bProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -OperationTimeoutSec 3 -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*-m brain*" }
                if (-not $bProc) {
                    Start-Process -FilePath $venvPy -ArgumentList "-u","-m","brain","--env-file","$WorkDir\\.bastion_brain_env","--node-id","sidekick","--node-role","STANDBY","--node-priority","2" -WorkingDirectory $brainDir -RedirectStandardOutput "$WorkDir\\brain_standby.log" -RedirectStandardError "$WorkDir\\brain_standby_err.log" -WindowStyle Hidden
                }
            }
        }
        $pyProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -OperationTimeoutSec 3 -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*unity_autonomous_scanner*" -or $_.CommandLine -like "*bastion_genesis_probe*" -or $_.CommandLine -like "*provision_neighbor*" -or $_.CommandLine -like "*auto_tutorial_ch8*" -or $_.CommandLine -like "*-m cipher*" } | Select-Object -First 1
        $progObj = $null
        if (Test-Path "$WorkDir\\scan_progress.json") {
            try { $progObj = Get-Content "$WorkDir\\scan_progress.json" -Raw | ConvertFrom-Json } catch {}
        }
        $payload = @{
            hostname = $env:COMPUTERNAME
            user = $env:USERNAME
            workdir = $WorkDir
            scannerRunning = [bool]($null -ne $pyProc)
            scannerPid = if ($pyProc) { $pyProc.ProcessId } else { $null }
            scannerCmd = if ($pyProc) { $pyProc.CommandLine } else { $null }
            scanProgress = $progObj
            timestamp = (Get-Date).ToString("o")
        } | ConvertTo-Json -Compress -Depth 4
        $resp = Invoke-RestMethod -Uri "$HubUrl/heartbeat" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 10
        if ($resp.commandId -and $resp.command) {
            Write-Host "[EXEC] $($resp.command)" -ForegroundColor Yellow
            $out = ""
            $err = ""
            try {
                $out = (Invoke-Expression $resp.command 2>&1 | Out-String)
            } catch {
                $err = $_.Exception.Message
            }
            $resPayload = @{
                commandId = $resp.commandId
                hostname = $env:COMPUTERNAME
                stdout = [string]$out
                stderr = [string]$err
            } | ConvertTo-Json -Compress -Depth 4
            Invoke-RestMethod -Uri "$HubUrl/result" -Method Post -Body $resPayload -ContentType "application/json; charset=utf-8" -TimeoutSec 30 | Out-Null
            Write-Host "[DONE] Sent output to MIXERV3." -ForegroundColor Cyan
        }
    } catch {
        Start-Sleep -Seconds 2
    }
    Start-Sleep -Milliseconds 1200
}
`;

const UNSTICK_PS1 = `
$ErrorActionPreference = "Continue"
$HubUrl = "http://${HOST_IP}:${PORT}"
$WorkDir = "C:\\UnityScanner"
Set-Location $WorkDir

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  AUTONOMOUS RESILIENCE & UNSTICK PROCEDURE (SIDEKICK)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Pull latest auto_tutorial_ch8.py with dynamic OCR & idle recovery
Write-Host "[1/4] Pulling updated auto_tutorial_ch8.py from Cluster Hub..." -ForegroundColor Yellow
Invoke-RestMethod "$HubUrl/files/auto_tutorial_ch8.py" -OutFile "$WorkDir\\auto_tutorial_ch8.py"
Write-Host "  -> auto_tutorial_ch8.py updated successfully ($((Get-Item "$WorkDir\\auto_tutorial_ch8.py").Length) bytes)." -ForegroundColor Green

# 2. Run inline Python inspector to detect and tap stuck buttons on both emulators
Write-Host "[2/4] Detecting stuck modals and pushing buttons autonomously..." -ForegroundColor Yellow
$py = "$WorkDir\\.venv\\Scripts\\python.exe"
if (-not (Test-Path $py)) { $py = "python.exe" }

$unstickScript = @'
import os, sys, time, subprocess
from PIL import Image
try:
    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR()
except Exception:
    ocr = None

adb = r"C:\\UnityScanner\\platform-tools\\adb.exe"
if not os.path.exists(adb): adb = "adb"

def tap(serial, x, y, s=1.0):
    subprocess.run([adb, "-s", serial, "shell", "input", "tap", str(int(x)), str(int(y))], capture_output=True)
    if s > 0: time.sleep(s)

def unstick_serial(serial):
    p = rf"C:\\UnityScanner\\unstick_{serial.split(':')[-1]}.png"
    subprocess.run([adb, "-s", serial, "shell", "screencap -p /sdcard/u.png"], capture_output=True)
    subprocess.run([adb, "-s", serial, "pull", "/sdcard/u.png", p], capture_output=True)
    if not os.path.exists(p) or ocr is None:
        print(f"[{serial}] No screencap or OCR unavailable")
        return
    res, _ = ocr(p)
    lines = [item[1].strip() for item in (res or [])]
    print(f"[{serial}] Screen OCR lines ({len(lines)}): {lines[:6]}")

    targets = ["CLAIM ALL", "CLAIM", "CONFIRM", "OK", "YES", "GOT IT", "CONTINUE", "TAP TO CONTINUE", "START", "COLLECT", "RECEIVE", "SPEED UP", "USE", "UPGRADE", "BUILD", "FREE"]
    tapped = False
    for t in targets:
        for box, txt, score in (res or []):
            t_upper = txt.strip().upper()
            if t == t_upper or (t in t_upper and len(t_upper) <= 25):
                cx = int(sum(pt[0] for pt in box) / 4)
                cy = int(sum(pt[1] for pt in box) / 4)
                if cy > 90 and not (cx < 260 and cy < 650):
                    print(f"[{serial}] -> Found '{txt}' at ({cx}, {cy}) (score={score:.2f}) -> PUSHING BUTTON!")
                    tap(serial, cx, cy, 1.2)
                    tapped = True
                    break
        if tapped: break

    if not tapped:
        print(f"[{serial}] -> No direct target match; sending Dismiss cycle (Close X 1380,108 + Back 48,52 + Android Back Key)")
        tap(serial, 1380, 108, 0.8)
        tap(serial, 48, 52, 0.8)
        subprocess.run([adb, "-s", serial, "shell", "input", "keyevent", "4"], capture_output=True)

unstick_serial("127.0.0.1:16384")
unstick_serial("127.0.0.1:16416")
'@

[System.IO.File]::WriteAllText("$WorkDir\\unstick_now.py", $unstickScript)
& $py "$WorkDir\\unstick_now.py"

# 3. Download updated worker.ps1 and ensure background link is running
Write-Host "[3/4] Ensuring background link daemon is active..." -ForegroundColor Yellow
Invoke-RestMethod "$HubUrl/worker.ps1" -OutFile "$WorkDir\\worker.ps1"
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID -and $_.CommandLine -like "*worker.ps1*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\\UnityScanner\\worker.ps1" -WindowStyle Hidden

# 4. Resume auto_tutorial_ch8.py on both emulators to CH8
Write-Host "[4/4] Resuming autonomous CH8 auto-builder on both instances..." -ForegroundColor Yellow
$p0 = Start-Process -FilePath $py -ArgumentList "$WorkDir\\auto_tutorial_ch8.py","--adb","127.0.0.1:16384","--kingdom","4021","--steps","350" -WorkingDirectory $WorkDir -PassThru -WindowStyle Hidden
$p1 = Start-Process -FilePath $py -ArgumentList "$WorkDir\\auto_tutorial_ch8.py","--adb","127.0.0.1:16416","--kingdom","4197","--steps","350" -WorkingDirectory $WorkDir -PassThru -WindowStyle Hidden

Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  AUTONOMOUS FIX COMPLETE! Bots resumed: PID $($p0.Id) & PID $($p1.Id)" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
`;

const BOOTSTRAP_PS1 = `
$ErrorActionPreference = "Continue"
$HubUrl = "http://${HOST_IP}:${PORT}"
$WorkDir = "C:\\UnityScanner"
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  LINKING NODE 2 ($env:COMPUTERNAME) -> MIXERV3 ($HubUrl)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Prevent AC sleep & unlock LAN firewall
powercfg /change standby-timeout-ac 0 2>$null
powercfg /change monitor-timeout-ac 0 2>$null
try {
    Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Unity Studio LAN All" -Direction Inbound -RemoteAddress 192.168.50.0/24 -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Enable-PSRemoting -Force -SkipNetworkProfileCheck -ErrorAction SilentlyContinue | Out-Null
    Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value "192.168.50.*" -Force -ErrorAction SilentlyContinue
} catch {}

# 2. Download scanner files + persistent worker script
Invoke-RestMethod "$HubUrl/files/rok_coordinates_1600x900.json" -OutFile "$WorkDir\\rok_coordinates_1600x900.json"
Invoke-RestMethod "$HubUrl/files/unity_autonomous_scanner.py" -OutFile "$WorkDir\\unity_autonomous_scanner.py"
Invoke-RestMethod "$HubUrl/files/setup-node2-laptop.ps1" -OutFile "$WorkDir\\setup-node2-laptop.ps1"
Invoke-RestMethod "$HubUrl/worker.ps1" -OutFile "$WorkDir\\worker.ps1"

# 3. Spawn a hidden background daemon process so clicking or closing the window never stops the link
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID -and $_.CommandLine -like "*worker.ps1*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\\UnityScanner\\worker.ps1" -WindowStyle Hidden
Write-Host "[ONLINE] Background daemon spawned on $env:COMPUTERNAME! Running foreground monitor as well..." -ForegroundColor Green

& "$WorkDir\\worker.ps1"
`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/join') {
    console.log(`[JOIN] Serving bootstrap to ${req.socket.remoteAddress}`);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(BOOTSTRAP_PS1);
  }

  if (req.method === 'GET' && url.pathname === '/unstick') {
    console.log(`[UNSTICK] Serving unstick procedure to ${req.socket.remoteAddress}`);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(UNSTICK_PS1);
  }

  if (req.method === 'GET' && url.pathname === '/worker.ps1') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(WORKER_LOOP_PS1);
  }

  if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
    const fname = path.basename(url.pathname);
    const fpath = path.join(SCANNER_DIR, fname);
    if (fs.existsSync(fpath)) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(fs.readFileSync(fpath, 'utf8'));
    }
    res.writeHead(404);
    return res.end('File not found');
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const compactHistory = commandHistory.slice(-10).map((item) => ({
      ...item,
      stdout: item.stdout ? String(item.stdout).slice(0, 600) : '',
      stderr: item.stderr ? String(item.stderr).slice(0, 400) : '',
    }));
    return res.end(
      JSON.stringify(
        {
          nodes,
          queueLength: commandQueue.length,
          liveScanProgress,
          activeTasks: Object.values(activeTasksByInstance),
          recentHistory: compactHistory,
        },
        null,
        2
      )
    );
  }

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    try {
      if (req.method === 'POST' && url.pathname === '/scan-progress') {
        const data = JSON.parse(body || '{}');
        const instId = resolveInstId(data);
        const prevInst = activeTasksByInstance[instId] || {};
        const pct =
          typeof data.percent === 'number'
            ? data.percent
            : data.currentRank && data.targetRanks
            ? Math.min(100, +((data.currentRank / data.targetRanks) * 100).toFixed(1))
            : prevInst.percent || 0;
        const updatedTask = {
          ...prevInst,
          ...data,
          preset:
            data.preset ||
            (['SCANNING_LIVE', 'PREPARING_LEADERBOARD', 'COMPLETED'].includes(data.status)
              ? 'SWEET_650'
              : prevInst.preset || 'SWEET_650'),
          instanceId: instId,
          percent: pct,
          updatedAt: new Date().toISOString(),
        };
        activeTasksByInstance[instId] = updatedTask;

        // Only overwrite primary liveScanProgress if no other instance is actively SCANNING_LIVE
        const allTasks = Object.values(activeTasksByInstance);
        const liveScans = allTasks.filter((t) => t.running && t.status === 'SCANNING_LIVE');
        const runningAny = allTasks.filter((t) => t.running);
        liveScanProgress = liveScans[0] || runningAny[0] || updatedTask;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, liveScanProgress, activeTasks: allTasks }));
      }

      if (req.method === 'POST' && url.pathname === '/heartbeat') {
        const data = JSON.parse(body || '{}');
        const ip = req.socket.remoteAddress;
        if (Array.isArray(data.activeTasks)) {
          data.activeTasks.forEach((t) => {
            const instId = resolveInstId(t);
            activeTasksByInstance[instId] = { ...activeTasksByInstance[instId], ...t, instanceId: instId };
          });
        }
        if (data.scanProgress) {
          const instId = resolveInstId(data.scanProgress);
          const merged = {
            ...(activeTasksByInstance[instId] || {}),
            ...data.scanProgress,
            preset:
              data.scanProgress.preset ||
              (['SCANNING_LIVE', 'PREPARING_LEADERBOARD', 'COMPLETED'].includes(data.scanProgress.status)
                ? 'SWEET_650'
                : (activeTasksByInstance[instId] || {}).preset || 'SWEET_650'),
            instanceId: instId,
            running: typeof data.scannerRunning === 'boolean' ? data.scannerRunning : Boolean(data.scanProgress.running),
            scannerPid: data.scannerPid || data.scanProgress.pid || null,
          };
          activeTasksByInstance[instId] = merged;
          const allTasks = Object.values(activeTasksByInstance);
          const liveScans = allTasks.filter((t) => t.running && t.status === 'SCANNING_LIVE');
          const runningAny = allTasks.filter((t) => t.running);
          liveScanProgress = liveScans[0] || runningAny[0] || merged;
        } else if (typeof data.scannerRunning === 'boolean') {
          liveScanProgress.running = data.scannerRunning;
          liveScanProgress.scannerPid = data.scannerPid || null;
          if (!data.scannerRunning && liveScanProgress.status === 'SCANNING_LIVE') {
            liveScanProgress.status = 'IDLE';
          }
        }
        nodes[data.hostname || ip] = {
          ...data,
          ip,
          lastSeen: new Date().toISOString(),
        };

        const nextCmd = commandQueue.shift();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (nextCmd) {
          console.log(`[DISPATCH -> ${data.hostname}] ${nextCmd.id}: ${nextCmd.cmd}`);
          return res.end(JSON.stringify({ commandId: nextCmd.id, command: nextCmd.cmd }));
        }
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'POST' && url.pathname === '/result') {
        const data = JSON.parse(body || '{}');
        console.log(`[RESULT <- ${data.hostname}] ${data.commandId} (${(data.stdout || '').length}b)`);
        commandHistory.push({ ...data, completedAt: new Date().toISOString() });
        const pending = global._pendingResolvers?.[data.commandId];
        if (pending) {
          pending(data);
          delete global._pendingResolvers[data.commandId];
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ received: true }));
      }

      if (req.method === 'POST' && url.pathname === '/exec') {
        const data = JSON.parse(body || '{}');
        const cmdStr = data.command || data.cmd;
        if (!cmdStr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing command or cmd field' }));
        }
        const id = 'cmd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        commandQueue.push({ id, cmd: cmdStr, createdAt: new Date().toISOString() });

        if (data.async) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ queued: true, commandId: id, command: cmdStr }));
        }

        global._pendingResolvers = global._pendingResolvers || {};
        const timeoutMs = data.timeoutMs || 120000;
        const timer = setTimeout(() => {
          if (global._pendingResolvers[id]) {
            delete global._pendingResolvers[id];
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Timed out waiting for Node 2 response', commandId: id }));
          }
        }, timeoutMs);

        global._pendingResolvers[id] = (result) => {
          clearTimeout(timer);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        };
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    } catch (e) {
      console.error('[ERROR]', url.pathname, e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[UNITY CLUSTER HUB] Listening on http://${HOST_IP}:${PORT}`);
  startDynamoCloudBridge();
});

function loadEnvLocal() {
  try {
    const envPath = path.join(SCANNER_DIR, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  } catch {}
}

function startDynamoCloudBridge() {
  loadEnvLocal();
  const tableName = process.env.AWS_TABLE_NAME;
  if (!tableName || !process.env.AWS_ACCESS_KEY_ID) {
    console.log('[CLOUD BRIDGE] No AWS credentials found in .env.local; running LAN-only.');
    return;
  }

  let DynamoDBClient, QueryCommand, PutItemCommand, dbClient;
  try {
    ({ DynamoDBClient, QueryCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb'));
    dbClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log(`[CLOUD BRIDGE] Connected to DynamoDB (${tableName}) — bridging Vercel Cloud <-> SIDEKICK LAN`);
  } catch (err) {
    console.error('[CLOUD BRIDGE] Failed to initialize DynamoDB client:', err.message);
    return;
  }

  let lastExecutedCmdId = null;

  setInterval(async () => {
    try {
      // 1. Push live SIDEKICK telemetry + scan progress to DynamoDB for Vercel
      const telemetryPayload = JSON.stringify({
        nodes,
        liveScanProgress,
        queueLength: commandQueue.length,
        updatedAt: new Date().toISOString(),
      });
      await dbClient.send(
        new PutItemCommand({
          TableName: tableName,
          Item: {
            PK: { S: 'GLOBAL_CONFIG' },
            SK: { S: 'CONFIG#BASTION_CLOUD_TELEMETRY' },
            attributes: { M: { value: { S: telemetryPayload } } },
          },
        })
      );

      // 2. Check if Vercel queued a command in BASTION_CLOUD_CMD
      const res = await dbClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_CONFIG' },
            ':sk': { S: 'CONFIG#BASTION_CLOUD_CMD' },
          },
        })
      );

      const rawCmd = res.Items?.[0]?.attributes?.M?.value?.S;
      if (rawCmd) {
        const cmdRecord = JSON.parse(rawCmd);
        if (cmdRecord.cmdId && cmdRecord.cmdId !== lastExecutedCmdId) {
          const ageMs = Date.now() - new Date(cmdRecord.queuedAt || 0).getTime();
          if (ageMs < 120000 && cmdRecord.command) {
            lastExecutedCmdId = cmdRecord.cmdId;
            console.log(`[CLOUD BRIDGE] Picked up Vercel command ${cmdRecord.cmdId}: ${cmdRecord.command}`);
            commandQueue.push({
              id: cmdRecord.cmdId,
              cmd: cmdRecord.command,
              createdAt: new Date().toISOString(),
            });
            if (cmdRecord.scanProgress) {
              liveScanProgress = {
                ...liveScanProgress,
                ...cmdRecord.scanProgress,
                updatedAt: new Date().toISOString(),
              };
            }
          } else {
            lastExecutedCmdId = cmdRecord.cmdId;
          }
        }
      }
    } catch {}
  }, 3000);
}

