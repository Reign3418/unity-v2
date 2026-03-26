import urllib.request
import json

ports = [3000, 3001, 8080]
endpoint = "/api/aws/behavior?kd=3155&start=2026-01-02&end=2026-03-21"

success = False
for port in ports:
    url = f"http://localhost:{port}{endpoint}"
    print(f"Trying {url}...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            print(f"✅ Success on port {port}!")
            roster = data.get("roster", [])
            print(f"Returned {len(roster)} governors.")
            if len(roster) > 0:
                print("Sample keys:", list(roster[0].keys()))
            success = True
            break
    except Exception as e:
        print(f"❌ Failed: {e}")

if not success:
    print("\nCould not connect to the dev server. It may be offline or on an unknown port.")
