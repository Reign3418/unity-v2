Start-Process -FilePath "C:\UnityScanner\.venv\Scripts\python.exe" -ArgumentList "C:\UnityScanner\unity_autonomous_scanner.py --adb 127.0.0.1:16384 --kd 4194 --mode kingdom-scan --start-rank 1 --end-rank 650 --skip-switch" -WindowStyle Hidden
Start-Sleep -Seconds 3
$p = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*unity_autonomous_scanner*" } | Select-Object -First 1
Write-Host "Scanner PID: $($p.ProcessId)"
Write-Host "Command: $($p.CommandLine)"
