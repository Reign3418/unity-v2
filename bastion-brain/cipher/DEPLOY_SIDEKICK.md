# CIPHER v2 on SIDEKICK — Setup & Round-Trip Test

Prerequisite: the AWS stack from [`infra/DEPLOY.md`](../infra/DEPLOY.md) is `CREATE_COMPLETE`.

## 1. Code & dependencies (already done by the build session)
- Code lives in `C:\UnityScanner\bastion-brain\` (SIDEKICK has no git; copies are pushed from the repo through the cluster hub).
- `boto3` + `jsonschema` are installed in `C:\UnityScanner\.venv`.

## 2. Credentials file (you do this; never paste keys into chat)
Create `C:\UnityScanner\.bastion_aws_credentials` (gitignored) with the `bastion-sidekick` key and the stack Outputs:

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
BASTION_JOBS_QUEUE_URL=<JobsQueueUrl output>
BASTION_RESULTS_QUEUE_URL=<ResultsQueueUrl output>
BASTION_EVIDENCE_BUCKET=<EvidenceBucketName output>
```
Restrict it: `icacls C:\UnityScanner\.bastion_aws_credentials /inheritance:r /grant:r "%USERNAME%:R"`

## 3. Preflight (read-only, consumes no messages)
```
cd C:\UnityScanner\bastion-brain
C:\UnityScanner\.venv\Scripts\python.exe -m cipher --check
```
Expect `[OK]` for settings, both queues, each emulator, and the skill script. An emulator that is powered off shows `[FAIL] adb ...` — that is accurate, not a CIPHER bug.

## 4. Start CIPHER
```
C:\UnityScanner\.venv\Scripts\python.exe -m cipher            # run forever
C:\UnityScanner\.venv\Scripts\python.exe -m cipher --dry-run  # acknowledge jobs without touching any emulator
C:\UnityScanner\.venv\Scripts\python.exe -m cipher --once     # drain queued jobs, then exit
```
Log (one JSON object per line): `C:\UnityScanner\cipher_state\cipher.log.jsonl`.

## 5. Round-trip test (from any machine, using the `bastion-brain` key as env vars)
```
python tools/smoke_test.py --job-type probe_status --instance sidekick-mumu-1
python tools/smoke_test.py --job-type grow_city    --instance sidekick-mumu-1   # drives the emulator: only if you want it to
```
`probe_status` is read-only. Expect `RESULT VALID`, an `s3://` screenshot, and a 64-char sha256.

## 6. Things CIPHER will NOT do yet
- Job types other than `probe_status`, `grow_city` (CH ≤ 8), `sleep` return `UNSUPPORTED_JOB_TYPE` (non-retryable).
- `probe_status` does not read CH level or power yet (reports `null`); `grow_city` reports `ch_level: 8` only when the skill prints its "TARGET REACHED" marker.

## 7. Cutover caution (do not run both brains)
`sidekick_cloud_agent.py` (legacy autopilot) is still running on SIDEKICK — **two copies** at the time of writing (venv + system Python). Before CIPHER starts accepting real jobs, stop the legacy autopilot so two controllers never drive the same emulator. CIPHER checks for legacy scripts already running on an emulator and answers `INSTANCE_BUSY` (retryable) rather than fighting them.
