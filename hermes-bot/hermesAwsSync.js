/**
 * ============================================================================
 * VALHEON HERMES — ZERO-DEPENDENCY AWS SIGV4 DYNAMODB DISASTER RECOVERY ENGINE
 * ============================================================================
 * Mirrors HERMES critical state to AWS DynamoDB (`Unity2AWSRoster`, us-east-2)
 * using pure Node.js `crypto` + `fetch` (zero external npm packages required):
 *
 *   1. `PK = "VALHEON#COUPON_LEDGER"` / `SK = "SEQ#<padded>"` & `SK = "MASTER_CHAIN"`
 *      -> Full SHA-256 hash-chained non-repudiation audit log (Who, What, Where, When, Why).
 *   2. `PK = "VALHEON#GUILD_TIERS"` / `SK = "MASTER_STATE"`
 *      -> All licensed Discord Server IDs, Rarity Tiers (COMMON/LEGENDARY),
 *         and saved 1-Click Kingdom Blueprints for Lifetime Free Repair.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATHS = [
  path.resolve(__dirname, './.env.railway'),
  path.resolve(__dirname, '../.env.local'),
];

function getAwsConfig() {
  const vars = { ...process.env };
  for (const envPath of ENV_PATHS) {
    try {
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
          if (m && !vars[m[1]]) vars[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
        }
      }
    } catch {}
  }
  return {
    accessKeyId: (vars.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (vars.AWS_SECRET_ACCESS_KEY || '').trim(),
    region: (vars.AWS_REGION || 'us-east-2').trim(),
    tableName: (vars.AWS_TABLE_NAME || 'Unity2AWSRoster').trim(),
  };
}

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest(encoding);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Executes a signed AWS Signature Version 4 request against DynamoDB JSON RPC API.
 */
export async function dynamoRequest(targetAction, bodyObj) {
  const { accessKeyId, secretAccessKey, region, tableName } = getAwsConfig();
  if (!accessKeyId || !secretAccessKey || !tableName) {
    return { ok: false, reason: 'MISSING_AWS_CREDENTIALS' };
  }

  const service = 'dynamodb';
  const host = `dynamodb.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const amzTarget = `DynamoDB_20120810.${targetAction}`;
  const payload = JSON.stringify({ TableName: tableName, ...bodyObj });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = '/';
  const canonicalQuerystring = '';
  const contentType = 'application/x-amz-json-1.0';
  const payloadHash = sha256(payload);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${amzTarget}\n`;
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    'POST',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');

  const authorizationHeader =
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'X-Amz-Date': amzDate,
        'X-Amz-Target': amzTarget,
        Authorization: authorizationHeader,
      },
      body: payload,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`[HERMES AWS DynamoDB ${targetAction} Error]:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Mirrors an individual SHA-256 Coupon Audit Ledger entry AND the full JSONL chain
 * to AWS DynamoDB (`Unity2AWSRoster`) under `PK = "VALHEON#COUPON_LEDGER"`.
 */
export async function syncCouponLedgerToAws(entry, fullJsonlText) {
  const seqPadded = String(entry?.seq || 1).padStart(6, '0');
  const nowIso = new Date().toISOString();

  // 1. Write immutable individual sequence record
  await dynamoRequest('PutItem', {
    Item: {
      PK: { S: 'VALHEON#COUPON_LEDGER' },
      SK: { S: `SEQ#${seqPadded}` },
      seq: { N: String(entry?.seq || 1) },
      when_utc: { S: String(entry?.when_utc || nowIso) },
      event_type: { S: String(entry?.event_type || 'AUDIT') },
      entry_hash: { S: String(entry?.entry_hash || '') },
      prev_hash: { S: String(entry?.prev_hash || '') },
      payload_json: { S: JSON.stringify(entry) },
    },
  });

  // 2. Update MASTER_CHAIN snapshot for 1-request disaster recovery hydration
  if (fullJsonlText) {
    await dynamoRequest('PutItem', {
      Item: {
        PK: { S: 'VALHEON#COUPON_LEDGER' },
        SK: { S: 'MASTER_CHAIN' },
        updated_at_utc: { S: nowIso },
        latest_seq: { N: String(entry?.seq || 1) },
        latest_hash: { S: String(entry?.entry_hash || '') },
        jsonl_snapshot: { S: fullJsonlText },
      },
    });
  }
}

/**
 * Hydrates `coupon_audit_ledger.jsonl` from AWS DynamoDB if local disk is empty/missing
 * (e.g. after a Railway container redeploy or hardware replacement).
 */
export async function hydrateCouponLedgerFromAws(ledgerFilePath) {
  try {
    if (fs.existsSync(ledgerFilePath) && fs.statSync(ledgerFilePath).size > 0) {
      return { hydrated: false, source: 'LOCAL_DISK' };
    }
    const res = await dynamoRequest('GetItem', {
      Key: {
        PK: { S: 'VALHEON#COUPON_LEDGER' },
        SK: { S: 'MASTER_CHAIN' },
      },
    });
    const snapshot = res?.data?.Item?.jsonl_snapshot?.S;
    if (res.ok && snapshot) {
      fs.writeFileSync(ledgerFilePath, snapshot, 'utf8');
      console.log(
        `☁️ [HERMES AWS DR] Restored coupon_audit_ledger.jsonl from AWS DynamoDB (Seq #${res.data.Item.latest_seq?.N || '?'})`
      );
      return { hydrated: true, source: 'AWS_DYNAMODB' };
    }
  } catch (err) {
    console.error('[HERMES AWS DR Ledger Restore Error]:', err.message);
  }
  return { hydrated: false, source: 'NONE' };
}

/**
 * Mirrors `guild_tiers.json` (all licensed Discord Servers & 1-Click Blueprints)
 * to AWS DynamoDB (`Unity2AWSRoster`) under `PK = "VALHEON#GUILD_TIERS"`, `SK = "MASTER_STATE"`.
 */
export async function syncGuildTiersToAws(storeObj) {
  try {
    const nowIso = new Date().toISOString();
    await dynamoRequest('PutItem', {
      Item: {
        PK: { S: 'VALHEON#GUILD_TIERS' },
        SK: { S: 'MASTER_STATE' },
        updated_at_utc: { S: nowIso },
        state_json: { S: JSON.stringify(storeObj) },
      },
    });
  } catch (err) {
    console.error('[HERMES AWS DR GuildTiers Sync Error]:', err.message);
  }
}

/**
 * Hydrates `GUILD_TIERS` from AWS DynamoDB on startup so Railway restarts or PC wipes
 * never lose a single paid Kingdom Server license or Lifetime Repair blueprint.
 */
export async function hydrateGuildTiersFromAws(currentStoreObj, tierStatePath) {
  try {
    const res = await dynamoRequest('GetItem', {
      Key: {
        PK: { S: 'VALHEON#GUILD_TIERS' },
        SK: { S: 'MASTER_STATE' },
      },
    });
    const remoteJson = res?.data?.Item?.state_json?.S;
    if (res.ok && remoteJson) {
      const parsed = JSON.parse(remoteJson);
      Object.assign(currentStoreObj, parsed);
      fs.writeFileSync(tierStatePath, JSON.stringify(currentStoreObj, null, 2), 'utf8');
      console.log(
        `☁️ [HERMES AWS DR] Hydrated GUILD_TIERS from AWS DynamoDB (${Object.keys(currentStoreObj).length} records)`
      );
      return { hydrated: true };
    } else if (res.ok && !remoteJson) {
      // Seed initial state to AWS if not yet present
      await syncGuildTiersToAws(currentStoreObj);
      console.log('☁️ [HERMES AWS DR] Seeded initial GUILD_TIERS state to AWS DynamoDB');
    }
  } catch (err) {
    console.error('[HERMES AWS DR GuildTiers Restore Error]:', err.message);
  }
  return { hydrated: false };
}
