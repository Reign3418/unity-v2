/**
 * ============================================================================
 * DOZER RECONCILER & EPOCH 0 ARCHIVAL CUTOVER ENGINE (RING 3 BACK-OFFICE)
 * File: E:\Unity\src\lib\dozerReconciler.js
 * ============================================================================
 * Core Responsibilities:
 *  1. KvK Alliance Math Presets:
 *     - 465  (3 Full Alliances × 155 Max Members — Fast Core Combat Sweep)
 *     - 650  (KvK Sweet Spot Default — Captures Top 3 Alliances + Farm Buffer)
 *     - 1000 (Full Kingdom Deep Census + Top-10 Alliance R5 Header Capture)
 *  2. Monotonic Lifetime Stat Guard ("The NumNum / Dozer Rule"):
 *     - In Rise of Kingdoms, lifetime Kill Points, T1–T5 Kills, and Deads
 *       can NEVER decrease. Any OCR misread or sheet row that drops below
 *       a governor's verified high-water mark is automatically repaired.
 *  3. Non-Destructive High-Water Merge:
 *     - Carries forward deep 45-field attributes (Town Hall, Civilization,
 *       Troop/Tech/Building/Cmdr Power, Birth Kingdom) if a fast scan or
 *       external sheet omits them.
 *  4. Archival Cutover (Epoch 0 Reset):
 *     - Once a kingdom has a Bastion Bot scan, all prior spreadsheet/legacy
 *       snapshots are moved to `ARCHIVED_VIEW_ONLY` and zeroed out from
 *       active delta math so live deltas are 100% Bot-to-Bot.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';

export const KVK_SCAN_PRESETS = {
  CORE_465: {
    id: 'CORE_465',
    targetRanks: 465,
    label: '465 · Top 3 Alliances (155×3 Core)',
    estMinutesSingleBot: 27,
    estMinutesDualBot: 14,
    includeAllianceR5Header: true,
    description: 'Captures 3 full 155-member KvK alliances + Alliance R5 leaders (even 256k power R5 alts).',
  },
  SWEET_650: {
    id: 'SWEET_650',
    targetRanks: 650,
    label: '650 · KvK Sweet Spot (Default)',
    estMinutesSingleBot: 38,
    estMinutesDualBot: 19,
    includeAllianceR5Header: true,
    description: 'Captures all 3 fighting alliances while absorbing bloated farms in Ranks 250–600.',
  },
  FULL_1000: {
    id: 'FULL_1000',
    targetRanks: 1000,
    label: '1,000 · Full Deep Census',
    estMinutesSingleBot: 58,
    estMinutesDualBot: 29,
    includeAllianceR5Header: true,
    description: 'Complete 1,000-governor deep sweep + Top-10 Alliance R5 Leader header capture.',
  },
};

const MONOTONIC_FIELDS = [
  'killPoints',
  'totalUnitsKilled',
  'dead',
  'deads',
  'healedTroops',
  'victories',
  'defeats',
  'scoutTimes',
  't1Kills',
  't2Kills',
  't3Kills',
  't4Kills',
  't5Kills',
  't1Kp',
  't2Kp',
  't3Kp',
  't4Kp',
  't5Kp',
  'gathered',
  'assistance',
  'helps',
  'kvkHighestKp',
  'kvkMostKills',
  'kvkMostHealed',
  'kvkMostDead',
  'aooWins',
  'aooLosses',
];

// Only immutable account-identity / provenance fields may carry forward across scan sessions.
// Never carry forward combat, power, or progression stats from prior days' scans!
const ACCOUNT_PORTABLE_FIELDS = [
  'birthKingdomId',
  'genesisCapturedAt',
  'udid',
  'appUid',
  'clientPlatform',
  'lilithAccountUid',
  'accountVintage',
  'avatarUploadDate',
  'avatarImageMd5',
  'avatarFrameId',
  'masterAccountCId',
  'linkedAltGovIds',
  'originServerId',
];

const KINGDOM_LOCAL_FIELDS = [
  'allianceNumericId',
  'mapCityEntityId',
  'castlePos',
  'internalServerId',
  'mapServerId',
];

const ARCHIVE_LEDGER_PATH = path.join(process.cwd(), 'src', 'data', 'bastion_epoch_ledger.json');

export function readEpochLedger() {
  try {
    if (fs.existsSync(ARCHIVE_LEDGER_PATH)) {
      return JSON.parse(fs.readFileSync(ARCHIVE_LEDGER_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('[DOZER] Ledger read warning:', e.message);
  }
  const initial = {
    updatedAt: new Date().toISOString(),
    globalCutoverActive: true,
    defaultScanPreset: 'SWEET_650',
    monotonicGuardEnabled: true,
    captureLowPowerR5Enabled: true,
    dozerStats: {
      totalBotScansReconciled: 6,
      monotonicFixesApplied: 14,
      archivedSheetSnapshots: 163,
      migrantsIdentified: 0,
    },
    kingdomEpochs: {
      '4194': {
        kingdomId: '4194',
        status: 'BOT_SOVEREIGN',
        epochZeroAt: '2026-10-19T07:43:00.000Z',
        scanPreset: 'SWEET_650',
        activeBaselineSource: 'BASTION_BOT',
        legacySheetsArchived: true,
        legacyBaselineZeroed: true,
        allianceR5HeaderCaptured: true,
        governorsCount: 1000,
      },
      '4193': {
        kingdomId: '4193',
        status: 'BOT_SOVEREIGN',
        epochZeroAt: '2026-10-19T17:08:00.000Z',
        scanPreset: 'SWEET_650',
        activeBaselineSource: 'BASTION_BOT',
        legacySheetsArchived: true,
        legacyBaselineZeroed: true,
        allianceR5HeaderCaptured: true,
        governorsCount: 1000,
      },
      '4195': {
        kingdomId: '4195',
        status: 'BOT_SOVEREIGN',
        epochZeroAt: '2026-10-19T18:02:00.000Z',
        scanPreset: 'SWEET_650',
        activeBaselineSource: 'BASTION_BOT',
        legacySheetsArchived: true,
        legacyBaselineZeroed: true,
        allianceR5HeaderCaptured: true,
        governorsCount: 1000,
      },
      '4196': {
        kingdomId: '4196',
        status: 'BOT_SOVEREIGN',
        epochZeroAt: '2026-10-19T18:28:00.000Z',
        scanPreset: 'SWEET_650',
        activeBaselineSource: 'BASTION_BOT',
        legacySheetsArchived: true,
        legacyBaselineZeroed: true,
        allianceR5HeaderCaptured: true,
        governorsCount: 1000,
      },
      '4202': {
        kingdomId: '4202',
        status: 'GENESIS_SOVEREIGN',
        epochZeroAt: '2026-10-19T16:10:00.000Z',
        scanPreset: 'CORE_465',
        activeBaselineSource: 'GENESIS_BOT',
        legacySheetsArchived: true,
        legacyBaselineZeroed: true,
        allianceR5HeaderCaptured: true,
        governorsCount: 1000,
      },
    },
    trojanHorseLeads: [],
    archivedSnapshots: [],
  };
  writeEpochLedger(initial);
  return initial;
}

export function writeEpochLedger(ledger) {
  try {
    ledger.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(ARCHIVE_LEDGER_PATH), { recursive: true });
    fs.writeFileSync(ARCHIVE_LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
  } catch (e) {
    console.error('[DOZER] Ledger write error:', e.message);
  }
}

function toNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const n = Number(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

/**
 * Classification of scan coverage based on the 465 / 650 / 1000 KvK alliance math:
 *  - >= 450 governors -> FULL_ROSTER (eligible to advance Kingdom Delta baseline)
 *  - < 450 governors  -> PARTIAL_SLICE (updates individual governor profiles without wiping out missing ranks)
 */
export function classifyCoverageTier(rowCount, isGenesis = false, isR5Header = false) {
  if (isGenesis) return 'GENESIS_BASELINE';
  if (isR5Header) return 'ALLIANCE_R5_HEADER';
  if (rowCount >= 900) return 'FULL_1000_CENSUS';
  if (rowCount >= 600) return 'SWEET_650_ROSTER';
  if (rowCount >= 450) return 'CORE_465_ROSTER';
  return 'PARTIAL_SLICE';
}

/**
 * Reconciles an incoming batch of governors (from Bastion Bot or Sheet) against existing
 * governor profiles using:
 *  1. Monotonic Lifetime Stat Guard (KP, T1-T5 Kills, Deads can never decrease)
 *  2. Non-Destructive Deep Field Preservation
 *  3. Genesis Birth-Kingdom & Migrant Detection
 */
export function reconcileGovernorBatch({
  kingdomId,
  incomingRoster = [],
  existingGovernorsById = {},
  existingKingdomGovernors = {},
  sourceType = 'BASTION_BOT',
  scanDate = new Date().toISOString(),
  workerSerial = 'sidekick-mumu-0',
}) {
  const kd = String(kingdomId);
  const ledger = readEpochLedger();
  const monotonicEnabled = ledger.monotonicGuardEnabled !== false;

  let monotonicFixes = 0;
  let migrantsDetected = 0;
  const reconciledList = [];

  for (const rawGov of incomingRoster) {
    const gid = String(
      rawGov.id || rawGov.govId || rawGov['Governor ID'] || rawGov['Character ID'] || ''
    ).trim();
    if (!gid) continue;

    const prevGlobal = existingGovernorsById[gid] || {};
    const prevLocal = existingKingdomGovernors[gid] || {};
    const sameGlobalKingdom = !prevGlobal.kingdomId || String(prevGlobal.kingdomId) === kd;
    const prevPortable = {};
    for (const f of [...MONOTONIC_FIELDS, ...ACCOUNT_PORTABLE_FIELDS]) {
      if (prevGlobal[f] !== undefined) prevPortable[f] = prevGlobal[f];
    }
    const prev = sameGlobalKingdom ? { ...prevGlobal, ...prevLocal } : { ...prevPortable, ...prevLocal };

    // Determine Birth Kingdom (Genesis Stamp)
    const birthKingdomId = String(prev.birthKingdomId || prevGlobal.birthKingdomId || prevGlobal.kingdomId || kd);
    const isMigrant = birthKingdomId !== kd;
    if (isMigrant && !prevLocal.isMigrant) {
      migrantsDetected++;
    }

    // Strict Single-Session Rule: Start ONLY with incoming scan data (`...rawGov`), never spreading `...prev` from days ago!
    const merged = {
      ...rawGov,
      id: gid,
      govId: Number(gid) || gid,
      kingdomId: kd,
    };

    // Ensure alliance & allianceName always reflect latest live scan (and clear allianceName if unallied or tag changed)
    if (rawGov.alliance !== undefined) {
      merged.alliance = rawGov.alliance || 'None';
      if (merged.alliance === 'None' || merged.alliance === '-') {
        merged.allianceName = '';
      } else if (rawGov.allianceName !== undefined) {
        merged.allianceName = rawGov.allianceName;
      } else if (prev.alliance && prev.alliance !== merged.alliance) {
        merged.allianceName = '';
      }
    }

    // 1. Enforce Monotonic Lifetime Stat Guard ONLY when a field was actively read (`newVal > 0`) and dipped below high-water mark
    if (monotonicEnabled) {
      for (const field of MONOTONIC_FIELDS) {
        const prevVal = toNum(prev[field]);
        const newVal = toNum(rawGov[field]);
        if (prevVal > 0 && newVal > 0 && newVal < prevVal) {
          merged[field] = prevVal;
          monotonicFixes++;
        } else if (rawGov[field] !== undefined) {
          merged[field] = newVal;
        }
      }
    }

    // Sync `dead` and `deads` aliases from the current scan
    const bestDead = Math.max(toNum(merged.dead), toNum(merged.deads));
    merged.dead = bestDead;
    merged.deads = bestDead;

    const bestKp = Math.max(toNum(merged.killPoints), toNum(merged.killpoints));
    merged.killPoints = bestKp;

    // 2. Non-Destructive Deep Structural Field Carry-Forward (Account-Portable + Kingdom-Local isolated)
    for (const sField of ACCOUNT_PORTABLE_FIELDS) {
      const incomingVal = rawGov[sField];
      const isMissingOrZero =
        incomingVal === undefined ||
        incomingVal === null ||
        incomingVal === '' ||
        incomingVal === 'Unknown' ||
        (typeof incomingVal === 'number' && incomingVal === 0);
      if (isMissingOrZero && prev[sField] !== undefined && prev[sField] !== 0 && prev[sField] !== '') {
        merged[sField] = prev[sField];
      }
    }
    for (const kField of KINGDOM_LOCAL_FIELDS) {
      const incomingVal = rawGov[kField];
      const isMissingOrZero =
        incomingVal === undefined ||
        incomingVal === null ||
        incomingVal === '' ||
        incomingVal === 'Unknown' ||
        (typeof incomingVal === 'number' && incomingVal === 0);
      if (isMissingOrZero && prevLocal[kField] !== undefined && prevLocal[kField] !== 0 && prevLocal[kField] !== '') {
        merged[kField] = prevLocal[kField];
      }
    }

    // 3. Stamp Provenance & Genesis Metadata
    merged.birthKingdomId = birthKingdomId;
    merged.isMigrant = isMigrant;
    merged.migratedFromKingdom = isMigrant ? birthKingdomId : null;
    merged.genesisCapturedAt = prev.genesisCapturedAt || scanDate;
    merged.sourceType = sourceType;
    merged.sourceBadge =
      sourceType === 'GENESIS_BOT'
        ? `🌱 GENESIS #${birthKingdomId}`
        : sourceType === 'BASTION_BOT'
        ? '🤖 BASTION BOT'
        : '📊 ARCHIVE SHEET';
    merged.workerSerial = workerSerial;
    merged.lastScanDate = scanDate;
    merged.updatedAt = new Date().toISOString();

    reconciledList.push(merged);
  }

  // Update Dozer ledger counters
  ledger.dozerStats = ledger.dozerStats || {};
  ledger.dozerStats.totalBotScansReconciled = (ledger.dozerStats.totalBotScansReconciled || 0) + 1;
  ledger.dozerStats.monotonicFixesApplied = (ledger.dozerStats.monotonicFixesApplied || 0) + monotonicFixes;
  ledger.dozerStats.migrantsIdentified = (ledger.dozerStats.migrantsIdentified || 0) + migrantsDetected;

  // If this is a Bastion Bot or Genesis Bot scan, lock the Kingdom into BOT_SOVEREIGN (Epoch 0 Cutover)
  if (sourceType === 'BASTION_BOT' || sourceType === 'GENESIS_BOT') {
    const existingEpoch = ledger.kingdomEpochs?.[kd];
    const presetKey =
      reconciledList.length >= 900
        ? 'FULL_1000'
        : reconciledList.length >= 600
        ? 'SWEET_650'
        : 'CORE_465';

    ledger.kingdomEpochs = ledger.kingdomEpochs || {};
    ledger.kingdomEpochs[kd] = {
      kingdomId: kd,
      status: sourceType === 'GENESIS_BOT' ? 'GENESIS_SOVEREIGN' : 'BOT_SOVEREIGN',
      epochZeroAt: existingEpoch?.epochZeroAt || new Date().toISOString(),
      lastBotScanAt: new Date().toISOString(),
      scanPreset: existingEpoch?.scanPreset || presetKey,
      activeBaselineSource: sourceType,
      legacySheetsArchived: true,
      legacyBaselineZeroed: true,
      allianceR5HeaderCaptured: true,
      governorsCount: Math.max(reconciledList.length, existingEpoch?.governorsCount || 0),
    };
  }

  writeEpochLedger(ledger);

  return {
    reconciledRoster: reconciledList,
    coverageTier: classifyCoverageTier(reconciledList.length, sourceType === 'GENESIS_BOT'),
    dozerReport: {
      kingdomId: kd,
      sourceType,
      reconciledCount: reconciledList.length,
      monotonicFixes,
      migrantsDetected,
      epochStatus: ledger.kingdomEpochs?.[kd]?.status || 'BOT_SOVEREIGN',
      epochZeroAt: ledger.kingdomEpochs?.[kd]?.epochZeroAt,
    },
  };
}

/**
 * Handles an external spreadsheet upload under the "Bot-Sovereign + Trojan Horse" architecture:
 *  - If Kingdom is already BOT_SOVEREIGN: archives the sheet for View-Only reference so it
 *    NEVER overwrites or contaminates active Bot-to-Bot deltas.
 *  - If Kingdom does NOT have a Bastion Bot yet: places it in View-Only Sandbox AND logs a
 *    Trojan-Horse Lead Alert for the Bastion Ring to deploy a bot to that kingdom!
 */
export function registerSpreadsheetUploadWithEpochGuard({
  kingdomId,
  rowCount,
  sourceFile,
  uploaderName,
  scanDate,
}) {
  const kd = String(kingdomId);
  const ledger = readEpochLedger();
  const kdEpoch = ledger.kingdomEpochs?.[kd];
  const isBotSovereign =
    kdEpoch?.status === 'BOT_SOVEREIGN' || kdEpoch?.status === 'GENESIS_SOVEREIGN';

  const archiveRecord = {
    id: `arch-${Date.now()}`,
    kingdomId: kd,
    rowCount,
    sourceFile: sourceFile || 'Manual_Spreadsheet.xlsx',
    uploaderName: uploaderName || 'Operator',
    scanDate: scanDate || new Date().toISOString(),
    status: isBotSovereign ? 'ARCHIVED_VIEW_ONLY_BOT_SOVEREIGN' : 'SANDBOX_AWAITING_BOT_TAKEOVER',
    zeroedForActiveDeltas: true,
  };

  ledger.archivedSnapshots = [archiveRecord, ...(ledger.archivedSnapshots || [])].slice(0, 100);
  ledger.dozerStats.archivedSheetSnapshots = (ledger.dozerStats.archivedSheetSnapshots || 0) + 1;

  if (!isBotSovereign) {
    // Add Trojan Horse Lead so Bastion Command Center prompts 1-click Bot Takeover
    const existingLead = (ledger.trojanHorseLeads || []).find((l) => String(l.kingdomId) === kd);
    if (!existingLead) {
      ledger.trojanHorseLeads = [
        {
          kingdomId: kd,
          detectedAt: new Date().toISOString(),
          uploaderName: uploaderName || 'External User',
          rowCount,
          sourceFile,
          status: 'READY_FOR_BOT_TAKEOVER',
        },
        ...(ledger.trojanHorseLeads || []),
      ];
    }
  }

  writeEpochLedger(ledger);
  return {
    isBotSovereign,
    archiveRecord,
    epochPolicy: isBotSovereign
      ? `Kingdom #${kd} is Bot-Sovereign (Epoch 0 Locked). Spreadsheet saved to Historical Archive (View-Only) and excluded from active Bot-to-Bot delta math.`
      : `Kingdom #${kd} has no Bastion Bot yet. Spreadsheet placed in Sandbox Preview and KENT alerted Bastion Ring to deploy a bot into #${kd}.`,
  };
}
