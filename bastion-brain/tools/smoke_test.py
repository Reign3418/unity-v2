"""Step 3 smoke test: send ONE typed job as the brain would, wait for CIPHER's result, validate it.

Run on any machine, using the `bastion-brain` IAM key set as environment variables (never pasted anywhere):
    set AWS_ACCESS_KEY_ID=...  set AWS_SECRET_ACCESS_KEY=...  set AWS_REGION=us-east-2
    set BASTION_JOBS_QUEUE_URL=...  set BASTION_RESULTS_QUEUE_URL=...
    python tools/smoke_test.py --job-type probe_status --instance sidekick-mumu-1

The job is marked as issued by TANK with a clearly labelled manual approval id (nn_smoketest_*): it is a
human-triggered test, not a NUMNUM-approved plan.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from contracts import validator as V  # noqa: E402

ARGS_BY_TYPE = {
    "probe_status": lambda: {"capture_profile": True, "capture_resources": True},
    "sleep": lambda: {"duration_minutes": 5, "close_app": False, "reason": "COOLDOWN"},
    "grow_city": lambda: {"target_ch_level": 8, "max_steps": 20},
}


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def build_job(job_type: str, instance: str, kingdom: int, bot_id: str, deadline_minutes: int) -> dict:
    now = datetime.now(timezone.utc)
    tag = uuid.uuid4().hex[:10]
    return {
        "job_id": f"job_smoke_{tag}",
        "idempotency_key": f"idem_smoke_{job_type}_{tag}",
        "correlation_id": f"corr_smoke_{tag}",
        "job_type": job_type,
        "instance_id": instance,
        "adb_serial": V.INSTANCE_TO_ADB[instance],
        "bot_id": bot_id,
        "kingdom_id": kingdom,
        "priority": 50,
        "issued_by": {"ring": "RING_2_OPS", "leader": "TANK", "numnum_approval_id": f"nn_smoketest_{tag}"},
        "created_at": iso(now),
        "not_before": iso(now),
        "deadline": iso(now + timedelta(minutes=deadline_minutes)),
        "args": ARGS_BY_TYPE[job_type](),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--job-type", choices=sorted(ARGS_BY_TYPE), default="probe_status")
    ap.add_argument("--instance", choices=sorted(V.INSTANCE_TO_ADB), default="sidekick-mumu-1")
    ap.add_argument("--kingdom", type=int, default=4021)
    ap.add_argument("--bot-id", default="bot_smoke_0001")
    ap.add_argument("--deadline-minutes", type=int, default=30)
    ap.add_argument("--wait-seconds", type=int, default=900)
    args = ap.parse_args()

    import boto3

    region = os.environ.get("AWS_REGION", "us-east-2")
    sqs = boto3.client("sqs", region_name=region)
    jobs_url, results_url = os.environ["BASTION_JOBS_QUEUE_URL"], os.environ["BASTION_RESULTS_QUEUE_URL"]

    job = build_job(args.job_type, args.instance, args.kingdom, args.bot_id, args.deadline_minutes)
    V.validate_job(job)  # same gate the brain applies
    sqs.send_message(
        QueueUrl=jobs_url,
        MessageBody=json.dumps(job),
        MessageGroupId=job["instance_id"],
        MessageDeduplicationId=job["idempotency_key"],
    )
    print(f"sent {job['job_type']} job {job['job_id']} to {job['instance_id']}; waiting for result...")

    deadline = time.time() + args.wait_seconds
    while time.time() < deadline:
        resp = sqs.receive_message(QueueUrl=results_url, MaxNumberOfMessages=10, WaitTimeSeconds=20, VisibilityTimeout=30)
        for m in resp.get("Messages", []):
            body = json.loads(m["Body"])
            if body.get("job_id") != job["job_id"]:
                sqs.change_message_visibility(QueueUrl=results_url, ReceiptHandle=m["ReceiptHandle"], VisibilityTimeout=0)
                continue
            V.validate_job_result(body, job)
            sqs.delete_message(QueueUrl=results_url, ReceiptHandle=m["ReceiptHandle"])
            ev = body["evidence"]
            print("RESULT VALID")
            print(f"  status        : {body['status']}")
            print(f"  duration_ms   : {body['duration_ms']}")
            print(f"  observed_state: {json.dumps(body['observed_state'])}")
            print(f"  screenshot    : {ev['screenshot_uri']}")
            print(f"  sha256        : {ev['screenshot_sha256']}")
            print(f"  ocr_lines     : {len(ev['ocr_lines'])}")
            print(f"  steps         : {len(body['steps_executed'])}")
            if body.get("error"):
                print(f"  error         : {json.dumps(body['error'])}")
            return 0 if body["status"] in ("SUCCEEDED", "PARTIAL") else 1
    print("TIMED OUT waiting for a result (is CIPHER running on SIDEKICK?)", file=sys.stderr)
    return 3


if __name__ == "__main__":
    sys.exit(main())
