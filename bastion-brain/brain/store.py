"""State store: DynamoDB (production) and in-memory (tests) with one interface.

The brain's IAM user cannot Scan, so the bot roster is indexed in BastionControl under `FLEET`
(`bot_ids`, `instances` -> active bot) and bots are fetched with BatchGetItem.
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional


def to_ddb(value: Any) -> Any:
    """Python -> DynamoDB-safe (floats become Decimal)."""
    return json.loads(json.dumps(value), parse_float=Decimal)


def from_ddb(value: Any) -> Any:
    """DynamoDB -> plain Python (Decimal becomes int when integral, else float)."""
    if isinstance(value, list):
        return [from_ddb(v) for v in value]
    if isinstance(value, dict):
        return {k: from_ddb(v) for k, v in value.items()}
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    return value


def event_item(event: Dict[str, Any], retention_days: int) -> Dict[str, Any]:
    """Contract event -> stored item: adds sort key + TTL, drops top-level nulls (GSI keys must not be NULL)."""
    item = {k: v for k, v in event.items() if v is not None}
    item["sort_key"] = f"{event['timestamp']}#{event['event_id']}"
    ts = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
    item["expires_at_epoch"] = int((ts + timedelta(days=retention_days)).timestamp())
    return item


class MemoryStore:
    def __init__(self):
        self.control: Dict[str, Dict[str, Any]] = {}
        self.bots: Dict[str, Dict[str, Any]] = {}
        self.slots: Dict[str, Dict[str, Any]] = {}
        self.intents: Dict[str, Dict[str, Any]] = {}
        self.events: List[Dict[str, Any]] = []
        self.retention_days = 90

    def get_control(self, key: str) -> Optional[Dict[str, Any]]:
        v = self.control.get(key)
        return copy.deepcopy(v) if v else None

    def put_control(self, key: str, item: Dict[str, Any]) -> None:
        self.control[key] = copy.deepcopy(dict(item, control_key=key))

    def get_bots(self, bot_ids: Iterable[str]) -> Dict[str, Dict[str, Any]]:
        return {b: copy.deepcopy(self.bots[b]) for b in bot_ids if b in self.bots}

    def put_bot(self, bot: Dict[str, Any]) -> None:
        self.bots[bot["bot_id"]] = copy.deepcopy(bot)

    def get_account_slots(self, account_id: str) -> Optional[Dict[str, Any]]:
        v = self.slots.get(account_id)
        return copy.deepcopy(v) if v else None

    def put_account_slots(self, record: Dict[str, Any]) -> None:
        self.slots[record["account_id"]] = copy.deepcopy(record)

    def query_intents(self, status: str) -> List[Dict[str, Any]]:
        return [copy.deepcopy(i) for i in self.intents.values() if i["status"] == status]

    def update_intent_status(self, intent_id: str, status: str) -> None:
        if intent_id in self.intents:
            self.intents[intent_id]["status"] = status

    def append_event(self, event: Dict[str, Any]) -> None:
        self.events.append(event_item(event, self.retention_days))


class DynamoStore:
    def __init__(self, cfg):
        import boto3

        session = boto3.Session(
            aws_access_key_id=cfg.access_key_id or None,
            aws_secret_access_key=cfg.secret_access_key or None,
            region_name=cfg.region,
        )
        self.ddb = session.resource("dynamodb")
        self.cfg = cfg
        self.control_t = self.ddb.Table(cfg.control_table)
        self.bots_t = self.ddb.Table(cfg.bots_table)
        self.slots_t = self.ddb.Table(cfg.slots_table)
        self.intents_t = self.ddb.Table(cfg.intents_table)
        self.events_t = self.ddb.Table(cfg.events_table)
        self.retention_days = cfg.event_retention_days

    def get_control(self, key: str) -> Optional[Dict[str, Any]]:
        item = self.control_t.get_item(Key={"control_key": key}, ConsistentRead=True).get("Item")
        return from_ddb(item) if item else None

    def put_control(self, key: str, item: Dict[str, Any]) -> None:
        self.control_t.put_item(Item=to_ddb(dict(item, control_key=key)))

    def get_bots(self, bot_ids: Iterable[str]) -> Dict[str, Dict[str, Any]]:
        ids = list(dict.fromkeys(bot_ids))
        out: Dict[str, Dict[str, Any]] = {}
        for i in range(0, len(ids), 100):
            keys = [{"bot_id": b} for b in ids[i : i + 100]]
            request = {self.cfg.bots_table: {"Keys": keys, "ConsistentRead": True}}
            while request:
                resp = self.ddb.batch_get_item(RequestItems=request)
                for item in resp.get("Responses", {}).get(self.cfg.bots_table, []):
                    out[item["bot_id"]] = from_ddb(item)
                request = resp.get("UnprocessedKeys") or None
        return out

    def put_bot(self, bot: Dict[str, Any]) -> None:
        self.bots_t.put_item(Item=to_ddb(bot))

    def get_account_slots(self, account_id: str) -> Optional[Dict[str, Any]]:
        item = self.slots_t.get_item(Key={"account_id": account_id}, ConsistentRead=True).get("Item")
        return from_ddb(item) if item else None

    def put_account_slots(self, record: Dict[str, Any]) -> None:
        self.slots_t.put_item(Item=to_ddb(record))

    def query_intents(self, status: str) -> List[Dict[str, Any]]:
        from boto3.dynamodb.conditions import Key

        resp = self.intents_t.query(IndexName="status-index", KeyConditionExpression=Key("status").eq(status), Limit=50)
        return [from_ddb(i) for i in resp.get("Items", [])]

    def update_intent_status(self, intent_id: str, status: str) -> None:
        self.intents_t.update_item(
            Key={"intent_id": intent_id},
            UpdateExpression="SET #s = :s",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": status},
        )

    def append_event(self, event: Dict[str, Any]) -> None:
        self.events_t.put_item(Item=to_ddb(event_item(event, self.retention_days)))


class ReadOnlyOverlay:
    """Rehearsal store: reads production, keeps every write in memory (nothing reaches DynamoDB)."""

    def __init__(self, base):
        self.base = base
        self.mem = MemoryStore()
        self._written_control = set()

    def get_control(self, key):
        if key in self._written_control:
            return self.mem.get_control(key)
        return self.base.get_control(key)

    def put_control(self, key, item):
        self._written_control.add(key)
        self.mem.put_control(key, item)

    def get_bots(self, bot_ids):
        ids = list(bot_ids)
        out = self.base.get_bots([b for b in ids if b not in self.mem.bots])
        out.update(self.mem.get_bots([b for b in ids if b in self.mem.bots]))
        return out

    def put_bot(self, bot):
        self.mem.put_bot(bot)

    def get_account_slots(self, account_id):
        if account_id in self.mem.slots:
            return self.mem.get_account_slots(account_id)
        return self.base.get_account_slots(account_id)

    def put_account_slots(self, record):
        self.mem.put_account_slots(record)

    def query_intents(self, status):
        return self.base.query_intents(status)

    def update_intent_status(self, intent_id, status):
        pass

    def append_event(self, event):
        self.mem.append_event(event)

    @property
    def events(self):
        return self.mem.events


class NullTransport:
    """Rehearsal transport: never sends, never consumes."""

    def __init__(self):
        self.sent = []

    def send_job(self, job):
        self.sent.append(job)

    def receive_results(self, wait_seconds):
        return []

    def delete_result(self, receipt):
        pass
