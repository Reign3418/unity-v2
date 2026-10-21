# Step 2 Runbook — Deploy the Bastion Brain AWS Foundation

Template: [`aws-bastion-brain.yaml`](./aws-bastion-brain.yaml) · Region: **us-east-2** (same as Unity) · Cost: pay-per-use, expected ≈ free tier at 10–20 bots.

> **Rule:** AWS secret keys are shown once, on your screen. Paste them straight into Railway / the SIDEKICK file. Never paste them into chat, the repo, or the cluster hub.

## 1. What gets created

| Resource | Name | Purpose |
|---|---|---|
| SQS FIFO | `bastion-jobs.fifo` (+ `-dlq.fifo`) | Ring 2 → CIPHER typed jobs. Group = instance (ordered per emulator), dedup = `idempotency_key`. 3 failed receives → DLQ. |
| SQS | `bastion-results` (+ `-dlq`) | CIPHER → Ring 3 results + evidence. |
| DynamoDB | `BastionBots`, `BastionEvents`, `BastionIntents`, `BastionAccountSlots`, `BastionControl` | Bot truth, oversight log (90-day TTL), Unity intents, account slot pool, operator mode/budgets. All encrypted; state tables have point-in-time recovery and are `Retain` on stack delete. |
| S3 | `bastion-evidence-<acct>-us-east-2` | Screenshot proof (private, 30-day expiry, TLS only). |
| IAM user | `bastion-brain` | Railway. Send jobs, read results, read/write state. **No access to the jobs queue receive side.** |
| IAM user | `bastion-sidekick` | SIDEKICK. Receive jobs, send results, upload evidence. **No database access.** |
| IAM policy | `bastion-vercel-access` | Unity. Write intents/controls, read bots/events/evidence. **Cannot send jobs.** |
| Alarms | 3 CloudWatch alarms | Jobs DLQ not empty, results DLQ not empty, oldest queued job > 1 h (SIDEKICK offline). Optional email via `AlertEmail`. |

Blast radius if a key leaks: SIDEKICK's key can only run queued jobs it is handed and cannot read state; the brain's key cannot touch Unity's existing table; Vercel's addition cannot dispatch work to emulators.

## 2. Deploy (AWS Console, ~5 minutes)

1. Sign in to AWS → switch region to **US East (Ohio) us-east-2**.
2. **CloudFormation → Create stack → With new resources → Upload a template file** → choose `aws-bastion-brain.yaml`.
3. Stack name: `bastion-brain`. Parameters:
   - `Prefix`: `bastion`
   - `VercelIamUserName`: the IAM user behind Vercel's `AWS_ACCESS_KEY_ID` (IAM → Users). Leave empty to attach manually later.
   - `AlertEmail`: your email (confirm the SNS subscription email afterwards).
4. On the review page tick **"I acknowledge that AWS CloudFormation might create IAM resources with custom names"** → Submit.
5. Wait for `CREATE_COMPLETE`, then open the **Outputs** tab (you'll need the queue URLs and bucket name).

## 3. Create access keys (once each)

IAM → Users → open the user → **Security credentials → Create access key → "Application running outside AWS"**.

| User | Where the key goes |
|---|---|
| `bastion-brain` | **Railway** service variables (Step 4): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `bastion-sidekick` | **SIDEKICK** only: file `C:\UnityScanner\.bastion_aws_credentials` (Step 3 will read it) |
| Vercel's existing user | Already configured — nothing to do |

## 4. Values the later steps will need (copy from Outputs)

`AWS_REGION=us-east-2` · `BASTION_JOBS_QUEUE_URL` · `BASTION_RESULTS_QUEUE_URL` · `BASTION_EVIDENCE_BUCKET` · table names (`BastionBots`, …).

## 5. Verify

- CloudFormation stack shows `CREATE_COMPLETE`.
- SQS shows 4 queues; `bastion-jobs.fifo` → *Dead-letter queue* tab shows `bastion-jobs-dlq.fifo`.
- DynamoDB shows 5 `Bastion*` tables; `BastionEvents` has TTL on `expires_at_epoch`.
- If you set `AlertEmail`, confirm the SNS subscription email.
- Tell me when it's done; Step 3 begins with a round-trip smoke test using the keys you created.

## 6. Writer rules (enforced in Steps 3–4)

- **DynamoDB cannot store JSON `null` in key/index attributes** — writers omit null contract fields (`bot_id`, `job_id`, …) before `PutItem`.
- `BastionEvents` item = contract event + `sort_key` (`<timestamp>#<event_id>`) + `expires_at_epoch` (writer sets now + 90 days; change the writer constant to change retention — DynamoDB TTL deletes expired items automatically).
- Job messages: `MessageGroupId = instance_id`, `MessageDeduplicationId = idempotency_key` (SQS dedups for 5 minutes; the brain's idempotency check covers beyond that).

## 7. Rollback

Delete the stack. Tables, bucket and the DynamoDB data are `Retain`ed and survive; queues and IAM users are removed. Revoke the two access keys.
