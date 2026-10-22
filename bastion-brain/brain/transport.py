"""Job/result transport for the brain: send to bastion-jobs.fifo, receive from bastion-results."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple


class SqsBrainTransport:
    def __init__(self, cfg):
        import boto3

        self.cfg = cfg
        self.sqs = boto3.client(
            "sqs",
            region_name=cfg.region,
            aws_access_key_id=cfg.access_key_id or None,
            aws_secret_access_key=cfg.secret_access_key or None,
        )

    def send_job(self, job: Dict[str, Any]) -> None:
        self.sqs.send_message(
            QueueUrl=self.cfg.jobs_queue_url,
            MessageBody=json.dumps(job),
            MessageGroupId=job["instance_id"],
            MessageDeduplicationId=job["idempotency_key"],
        )

    def receive_results(self, wait_seconds: int) -> List[Tuple[str, str]]:
        resp = self.sqs.receive_message(
            QueueUrl=self.cfg.results_queue_url, MaxNumberOfMessages=10, WaitTimeSeconds=wait_seconds,
            VisibilityTimeout=120,
        )
        return [(m["ReceiptHandle"], m["Body"]) for m in resp.get("Messages", [])]

    def delete_result(self, receipt: str) -> None:
        self.sqs.delete_message(QueueUrl=self.cfg.results_queue_url, ReceiptHandle=receipt)


class MemoryBrainTransport:
    def __init__(self):
        self.sent: List[Dict[str, Any]] = []
        self.results: List[Tuple[str, str]] = []
        self.deleted: List[str] = []
        self._n = 0

    def send_job(self, job: Dict[str, Any]) -> None:
        self.sent.append(json.loads(json.dumps(job)))

    def push_result(self, result: Dict[str, Any]) -> None:
        self._n += 1
        self.results.append((f"rr{self._n}", json.dumps(result)))

    def receive_results(self, wait_seconds: int) -> List[Tuple[str, str]]:
        out, self.results = self.results[:10], self.results[10:]
        return out

    def delete_result(self, receipt: str) -> None:
        self.deleted.append(receipt)
