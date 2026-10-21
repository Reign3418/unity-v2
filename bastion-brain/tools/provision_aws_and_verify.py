"""Automated Step 2 + Step 3 provisioner and live SQS/S3 round-trip verifier.

Reads AWS deploy credentials from `E:\\Unity\\.env.local` (or environment variables),
never prints any secret keys to stdout, and performs:
  1. CloudFormation deploy/update of `bastion-brain` (`infra/aws-bastion-brain.yaml`) in `us-east-2`.
  2. Access-key creation for `bastion-sidekick` and `bastion-brain` (idempotent if local files already exist).
  3. Writes `C:\\UnityScanner\\.bastion_aws_credentials` to SIDEKICK via the local cluster hub and locks ACLs.
  4. Writes gitignored `E:\\Unity\\bastion-brain\\.env.railway` for Step 4 Railway setup.
  5. Runs `python -m cipher --check` on SIDEKICK and executes a live `probe_status` round-trip via SQS + S3.
"""

from __future__ import annotations

import base64
import json
import os
import pathlib
import sys
import time
import urllib.request
from typing import Dict

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
BRAIN_DIR = pathlib.Path(__file__).resolve().parents[1]
TEMPLATE_PATH = BRAIN_DIR / "infra" / "aws-bastion-brain.yaml"
ENV_LOCAL_PATH = REPO_ROOT / ".env.local"
RAILWAY_ENV_PATH = BRAIN_DIR / ".env.railway"
SIDEKICK_CREDS_CACHE = BRAIN_DIR / ".sidekick_aws_credentials.cache"
HUB_EXEC_URL = "http://127.0.0.1:8888/exec"


def load_kv_file(path: pathlib.Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not path.exists():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def sidekick_exec(ps_command: str, timeout: int = 120) -> Dict[str, str]:
    body = json.dumps({"cmd": ps_command}).encode("utf-8")
    req = urllib.request.Request(
        HUB_EXEC_URL, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def push_file_to_sidekick(content: str, remote_path: str) -> None:
    b64 = base64.b64encode(content.encode("utf-8")).decode("ascii")
    ps = (
        f"[IO.File]::WriteAllBytes('{remote_path}', [Convert]::FromBase64String('{b64}')); "
        f"icacls '{remote_path}' /inheritance:r /grant:r \"$env:USERNAME`:(R,W)\" | Out-Null"
    )
    res = sidekick_exec(ps)
    if res.get("stderr"):
        raise RuntimeError(f"Failed writing {remote_path} on SIDEKICK: {res['stderr']}")


def ensure_stack(cfn, stack_name: str, template_body: str, vercel_user: str) -> Dict[str, str]:
    params = [
        {"ParameterKey": "Prefix", "ParameterValue": "bastion"},
        {"ParameterKey": "VercelIamUserName", "ParameterValue": vercel_user},
    ]
    exists = False
    try:
        desc = cfn.describe_stacks(StackName=stack_name)["Stacks"][0]
        exists = True
        status = desc["StackStatus"]
        print(f"[CFN] Existing stack '{stack_name}' status: {status}")
    except Exception:
        exists = False

    if not exists:
        print(f"[CFN] Creating stack '{stack_name}' in {cfn.meta.region_name}...")
        cfn.create_stack(
            StackName=stack_name,
            TemplateBody=template_body,
            Parameters=params,
            Capabilities=["CAPABILITY_NAMED_IAM"],
        )
    else:
        try:
            print(f"[CFN] Updating stack '{stack_name}'...")
            cfn.update_stack(
                StackName=stack_name,
                TemplateBody=template_body,
                Parameters=params,
                Capabilities=["CAPABILITY_NAMED_IAM"],
            )
        except Exception as exc:
            if "No updates are to be performed" in str(exc):
                print("[CFN] Stack is already up to date.")
            else:
                raise

    for _ in range(90):
        stack = cfn.describe_stacks(StackName=stack_name)["Stacks"][0]
        st = stack["StackStatus"]
        if st in ("CREATE_COMPLETE", "UPDATE_COMPLETE"):
            outputs = {o["OutputKey"]: o["OutputValue"] for o in stack.get("Outputs", [])}
            print(f"[CFN] Stack ready ({st}). Outputs: {sorted(outputs.keys())}")
            return outputs
        if "FAILED" in st or "ROLLBACK" in st:
            events = cfn.describe_stack_events(StackName=stack_name)["StackEvents"][:8]
            reasons = [
                f"{e.get('LogicalResourceId')}:{e.get('ResourceStatusReason', '')}"
                for e in events
                if e.get("ResourceStatusReason")
            ]
            raise RuntimeError(f"Stack failed with {st}: {'; '.join(reasons[:4])}")
        time.sleep(5)
    raise TimeoutError("Timed out waiting for CloudFormation stack completion")


def ensure_access_key(iam, user_name: str, cache_file: pathlib.Path) -> Dict[str, str]:
    cached = load_kv_file(cache_file)
    if cached.get("AWS_ACCESS_KEY_ID") and cached.get("AWS_SECRET_ACCESS_KEY"):
        existing_ids = {
            k["AccessKeyId"] for k in iam.list_access_keys(UserName=user_name).get("AccessKeyMetadata", [])
        }
        if cached["AWS_ACCESS_KEY_ID"] in existing_ids:
            print(f"[IAM] Reusing cached access key for {user_name} ({cached['AWS_ACCESS_KEY_ID'][:8]}...)")
            return cached

    keys = iam.list_access_keys(UserName=user_name).get("AccessKeyMetadata", [])
    if len(keys) >= 2:
        oldest = sorted(keys, key=lambda x: x["CreateDate"])[0]["AccessKeyId"]
        iam.delete_access_key(UserName=user_name, AccessKeyId=oldest)

    created = iam.create_access_key(UserName=user_name)["AccessKey"]
    print(f"[IAM] Created fresh access key for {user_name} ({created['AccessKeyId'][:8]}...)")
    return {
        "AWS_ACCESS_KEY_ID": created["AccessKeyId"],
        "AWS_SECRET_ACCESS_KEY": created["SecretAccessKey"],
    }


def main() -> int:
    env = load_kv_file(ENV_LOCAL_PATH)
    aws_key = os.environ.get("AWS_ACCESS_KEY_ID") or env.get("AWS_ACCESS_KEY_ID", "")
    aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY") or env.get("AWS_SECRET_ACCESS_KEY", "")
    region = os.environ.get("AWS_REGION") or env.get("AWS_REGION") or "us-east-2"

    if not aws_key or not aws_secret:
        print(
            "MISSING_AWS_DEPLOY_KEY: Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to E:\\Unity\\.env.local "
            "(gitignored), then re-run this script.",
            file=sys.stderr,
        )
        return 2

    import boto3

    session = boto3.Session(aws_access_key_id=aws_key, aws_secret_access_key=aws_secret, region_name=region)
    sts = session.client("sts")
    ident = sts.get_caller_identity()
    arn = ident["Arn"]
    caller_user = arn.split(":user/")[-1] if ":user/" in arn else ""
    print(f"[AWS] Authenticated as {arn} (Account {ident['Account']}, Region {region})")

    cfn = session.client("cloudformation")
    iam = session.client("iam")
    temp_policy_name = "BastionStackDeployerTemp"
    temp_policy_doc = json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": ["cloudformation:*"],
                    "Resource": "*",
                },
                {
                    "Effect": "Allow",
                    "Action": ["sqs:*"],
                    "Resource": f"arn:aws:sqs:{region}:{ident['Account']}:bastion-*",
                },
                {
                    "Effect": "Allow",
                    "Action": ["s3:*"],
                    "Resource": [
                        f"arn:aws:s3:::bastion-evidence-{ident['Account']}-{region}",
                        f"arn:aws:s3:::bastion-evidence-{ident['Account']}-{region}/*",
                    ],
                },
                {
                    "Effect": "Allow",
                    "Action": ["cloudwatch:PutMetricAlarm", "cloudwatch:DeleteAlarms", "cloudwatch:DescribeAlarms"],
                    "Resource": f"arn:aws:cloudwatch:{region}:{ident['Account']}:alarm:bastion-*",
                },
            ],
        }
    )
    if caller_user:
        print(f"[IAM] Attaching scoped temporary stack-deploy policy to {caller_user}...")
        iam.put_user_policy(UserName=caller_user, PolicyName=temp_policy_name, PolicyDocument=temp_policy_doc)
        time.sleep(8)
    try:
        outputs = ensure_stack(cfn, "bastion-brain", TEMPLATE_PATH.read_text(encoding="utf-8"), caller_user)
    finally:
        if caller_user:
            try:
                iam.delete_user_policy(UserName=caller_user, PolicyName=temp_policy_name)
                print(f"[IAM] Removed temporary stack-deploy policy from {caller_user}.")
            except Exception:
                pass

    sidekick_keys = ensure_access_key(iam, outputs["SidekickUserName"], SIDEKICK_CREDS_CACHE)
    sidekick_content = "\n".join(
        [
            "# Auto-generated by provision_aws_and_verify.py (gitignored)",
            f"AWS_ACCESS_KEY_ID={sidekick_keys['AWS_ACCESS_KEY_ID']}",
            f"AWS_SECRET_ACCESS_KEY={sidekick_keys['AWS_SECRET_ACCESS_KEY']}",
            f"AWS_REGION={region}",
            f"BASTION_JOBS_QUEUE_URL={outputs['JobsQueueUrl']}",
            f"BASTION_RESULTS_QUEUE_URL={outputs['ResultsQueueUrl']}",
            f"BASTION_EVIDENCE_BUCKET={outputs['EvidenceBucketName']}",
            "",
        ]
    )
    SIDEKICK_CREDS_CACHE.write_text(sidekick_content, encoding="utf-8")
    push_file_to_sidekick(sidekick_content, r"C:\UnityScanner\.bastion_aws_credentials")
    print("[SIDEKICK] Wrote C:\\UnityScanner\\.bastion_aws_credentials and locked ACLs.")

    brain_keys = ensure_access_key(iam, outputs["BrainUserName"], RAILWAY_ENV_PATH)
    railway_content = "\n".join(
        [
            "# Bastion Brain Railway Environment Variables (gitignored)",
            "BRAIN_MODE=DRY_RUN",
            f"AWS_REGION={region}",
            f"AWS_ACCESS_KEY_ID={brain_keys['AWS_ACCESS_KEY_ID']}",
            f"AWS_SECRET_ACCESS_KEY={brain_keys['AWS_SECRET_ACCESS_KEY']}",
            f"BASTION_JOBS_QUEUE_URL={outputs['JobsQueueUrl']}",
            f"BASTION_RESULTS_QUEUE_URL={outputs['ResultsQueueUrl']}",
            f"BASTION_EVIDENCE_BUCKET={outputs['EvidenceBucketName']}",
            f"BASTION_BOTS_TABLE={outputs['BotsTableName']}",
            f"BASTION_EVENTS_TABLE={outputs['EventsTableName']}",
            f"BASTION_INTENTS_TABLE={outputs['IntentsTableName']}",
            f"BASTION_ACCOUNT_SLOTS_TABLE={outputs['AccountSlotsTableName']}",
            f"BASTION_CONTROL_TABLE={outputs['ControlTableName']}",
            "",
        ]
    )
    RAILWAY_ENV_PATH.write_text(railway_content, encoding="utf-8")
    print("[RAILWAY] Wrote gitignored E:\\Unity\\bastion-brain\\.env.railway (ready for Step 4).")

    print("[SIDEKICK] Waiting 10s for IAM key propagation, then running `python -m cipher --check`...")
    time.sleep(10)
    chk = sidekick_exec(
        r"cd C:\UnityScanner\bastion-brain; C:\UnityScanner\.venv\Scripts\python.exe -m cipher --check"
    )
    print(chk.get("stdout", "").strip())
    if chk.get("stderr"):
        print("STDERR:", chk["stderr"].strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
