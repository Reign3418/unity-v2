"""Static checks on infra/aws-bastion-brain.yaml: least-privilege claims and contract/table alignment.

Needs PyYAML (see requirements-dev.txt); skipped if unavailable.
Run:  python -m unittest discover -s bastion-brain/tests -t bastion-brain
"""

import unittest
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

TEMPLATE = Path(__file__).resolve().parents[1] / "infra" / "aws-bastion-brain.yaml"


def _load():
    class Loader(yaml.SafeLoader):
        pass

    def tag(loader, suffix, node):
        key = suffix if suffix == "Ref" else f"Fn::{suffix}"
        if isinstance(node, yaml.ScalarNode):
            return {key: loader.construct_scalar(node)}
        if isinstance(node, yaml.SequenceNode):
            return {key: loader.construct_sequence(node, deep=True)}
        return {key: loader.construct_mapping(node, deep=True)}

    Loader.add_multi_constructor("!", tag)
    return yaml.load(TEMPLATE.read_text(encoding="utf-8"), Loader=Loader)


def _statements(resource):
    props = resource["Properties"]
    if "Policies" in props:
        out = []
        for pol in props["Policies"]:
            out += pol["PolicyDocument"]["Statement"]
        return out
    return props["PolicyDocument"]["Statement"]


def _actions(statements):
    acts = set()
    for st in statements:
        a = st["Action"]
        acts.update([a] if isinstance(a, str) else a)
    return acts


@unittest.skipIf(yaml is None, "PyYAML not installed")
class InfraTemplate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.t = _load()
        cls.r = cls.t["Resources"]

    def test_no_secrets_or_access_keys_in_template(self):
        types = {v["Type"] for v in self.r.values()}
        self.assertNotIn("AWS::IAM::AccessKey", types)
        self.assertNotIn("AWS::SecretsManager::Secret", types)

    def test_no_wildcard_actions_or_resources(self):
        for name in ("BrainUser", "SidekickUser", "VercelAccessPolicy"):
            for st in _statements(self.r[name]):
                self.assertEqual(st["Effect"], "Allow")
                acts = [st["Action"]] if isinstance(st["Action"], str) else st["Action"]
                for a in acts:
                    self.assertNotIn("*", a, f"{name}: wildcard action {a}")
                res = st["Resource"] if isinstance(st["Resource"], list) else [st["Resource"]]
                for x in res:
                    self.assertNotEqual(x, "*", f"{name}: wildcard resource")

    def test_sidekick_has_no_database_and_cannot_send_jobs(self):
        acts = _actions(_statements(self.r["SidekickUser"]))
        self.assertFalse([a for a in acts if a.startswith("dynamodb:")])
        send = [st for st in _statements(self.r["SidekickUser"]) if "sqs:SendMessage" in
                ([st["Action"]] if isinstance(st["Action"], str) else st["Action"])]
        self.assertEqual(len(send), 1)
        self.assertEqual(send[0]["Resource"], {"Fn::GetAtt": "ResultsQueue.Arn"})

    def test_brain_cannot_receive_jobs_and_sidekick_cannot_send_them(self):
        for st in _statements(self.r["BrainUser"]):
            acts = [st["Action"]] if isinstance(st["Action"], str) else st["Action"]
            if "sqs:ReceiveMessage" in acts:
                self.assertEqual(st["Resource"], {"Fn::GetAtt": "ResultsQueue.Arn"})
            if "sqs:SendMessage" in acts:
                self.assertEqual(st["Resource"], {"Fn::GetAtt": "JobsQueue.Arn"})

    def test_vercel_cannot_touch_queues_or_delete(self):
        acts = _actions(_statements(self.r["VercelAccessPolicy"]))
        self.assertFalse([a for a in acts if a.startswith("sqs:")])
        self.assertFalse([a for a in acts if "Delete" in a])

    def test_vercel_cannot_write_bots_events_or_slots(self):
        for st in _statements(self.r["VercelAccessPolicy"]):
            acts = [st["Action"]] if isinstance(st["Action"], str) else st["Action"]
            if any(a in ("dynamodb:PutItem", "dynamodb:UpdateItem") for a in acts):
                res = str(st["Resource"])
                self.assertIn("IntentsTable", res)
                self.assertIn("ControlTable", res)
                for forbidden in ("BotsTable", "EventsTable", "AccountSlotsTable"):
                    self.assertNotIn(forbidden, res)

    def test_state_tables_retained_and_encrypted(self):
        for name in ("BotsTable", "EventsTable", "IntentsTable", "AccountSlotsTable", "ControlTable"):
            res = self.r[name]
            self.assertEqual(res["DeletionPolicy"], "Retain")
            self.assertTrue(res["Properties"]["SSESpecification"]["SSEEnabled"])

    def test_jobs_queue_is_fifo_with_dlq(self):
        q = self.r["JobsQueue"]["Properties"]
        self.assertTrue(q["FifoQueue"])
        self.assertIn("RedrivePolicy", q)
        self.assertTrue(self.r["JobsDeadLetterQueue"]["Properties"]["FifoQueue"])
        self.assertFalse(q["ContentBasedDeduplication"])

    def test_evidence_bucket_private(self):
        pab = self.r["EvidenceBucket"]["Properties"]["PublicAccessBlockConfiguration"]
        self.assertTrue(all(pab.values()))

    def test_events_ttl_and_indexes_match_writer_contract(self):
        p = self.r["EventsTable"]["Properties"]
        self.assertEqual(p["TimeToLiveSpecification"]["AttributeName"], "expires_at_epoch")
        self.assertEqual({g["IndexName"] for g in p["GlobalSecondaryIndexes"]}, {"correlation-index", "bot-index"})

    def test_every_declared_gsi_key_has_an_attribute_definition(self):
        for name, res in self.r.items():
            if res["Type"] != "AWS::DynamoDB::Table":
                continue
            defined = {a["AttributeName"] for a in res["Properties"]["AttributeDefinitions"]}
            used = {k["AttributeName"] for k in res["Properties"]["KeySchema"]}
            for g in res["Properties"].get("GlobalSecondaryIndexes", []):
                used |= {k["AttributeName"] for k in g["KeySchema"]}
            self.assertEqual(defined, used, name)


if __name__ == "__main__":
    unittest.main()
