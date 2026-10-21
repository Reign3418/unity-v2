import json
import urllib.request
import sys

def exec_sidekick(cmd: str, timeout_sec: int = 60):
    url = "http://127.0.0.1:8888/exec"
    payload = json.dumps({"command": cmd, "timeoutMs": timeout_sec * 1000}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec + 5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "hostname"
    res = exec_sidekick(cmd)
    print(json.dumps(res, indent=2))
