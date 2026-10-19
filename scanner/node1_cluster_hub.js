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

const WORKER_LOOP_PS1 = `
$ErrorActionPreference = "Continue"
$HubUrl = "http://${HOST_IP}:${PORT}"
$WorkDir = "C:\\UnityScanner"
Set-Location $WorkDir

while ($true) {
    try {
        $payload = @{
            hostname = $env:COMPUTERNAME
            user = $env:USERNAME
            workdir = $WorkDir
            timestamp = (Get-Date).ToString("o")
        } | ConvertTo-Json -Compress
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
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($resPayload)
            Invoke-RestMethod -Uri "$HubUrl/result" -Method Post -Body $bytes -ContentType "application/json; charset=utf-8" -TimeoutSec 30 | Out-Null
            Write-Host "[DONE] Sent output to MIXERV3." -ForegroundColor Cyan
        }
    } catch {
        Start-Sleep -Seconds 2
    }
    Start-Sleep -Milliseconds 1200
}
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
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/join') {
    console.log(`[JOIN] Serving bootstrap to ${req.socket.remoteAddress}`);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(BOOTSTRAP_PS1);
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
    return res.end(
      JSON.stringify(
        {
          nodes,
          queueLength: commandQueue.length,
          recentHistory: commandHistory.slice(-10),
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
      if (req.method === 'POST' && url.pathname === '/heartbeat') {
        const data = JSON.parse(body || '{}');
        const ip = req.socket.remoteAddress;
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
        const id = 'cmd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        global._pendingResolvers = global._pendingResolvers || {};

        const timeoutMs = data.timeoutMs || 120000;
        const timer = setTimeout(() => {
          if (global._pendingResolvers[id]) {
            delete global._pendingResolvers[id];
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Timed out waiting for Node 2 response' }));
          }
        }, timeoutMs);

        global._pendingResolvers[id] = (result) => {
          clearTimeout(timer);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        };

        commandQueue.push({ id, cmd: data.command, createdAt: new Date().toISOString() });
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
});
