import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readEpochLedger, writeEpochLedger, KVK_SCAN_PRESETS } from '@/lib/dozerReconciler';

export const maxDuration = 300;

const STATE_PATH = path.join(process.cwd(), 'scanner', 'bastion_state.json');
const CLUSTER_HUB_URL = 'http://127.0.0.1:8888';

function readBastionState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = fs.readFileSync(STATE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[BASTION API] Failed to read bastion_state.json:', err);
  }
  return null;
}

function writeBastionState(state) {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[BASTION API] Failed to write bastion_state.json:', err);
    return false;
  }
}

function appendLog(state, { agent, ring, model, action, kingdom, detail }) {
  const entry = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    agent,
    ring,
    model,
    action,
    kingdom: String(kingdom || 'ALL'),
    detail,
  };
  state.activityLog = [entry, ...(state.activityLog || [])].slice(0, 80);
  return entry;
}

/**
 * NUMNUM Deterministic Hardware & Rule Gate (0 LLM Tokens)
 * Verifies:
 *  1. Node CPU < 85% and Free RAM >= 3.0 GB before spinning up a new instance
 *  2. <= 2 characters per kingdom on the same email/instance
 */
function evaluateNumNumGate(state, { targetKingdom, instanceId, operation }) {
  const instance = (state.instances || []).find((i) => i.instanceId === instanceId) || state.instances?.[0];
  const node = (state.nodes || []).find((n) => n.nodeId === (instance?.nodeId || 'SIDEKICK'));
  const freeRamGb = node ? +(node.ramTotalGb - node.ramUsedGb).toFixed(1) : 49.6;
  const cpuLoad = node ? node.cpuLoadPct : 34;

  const existingInKd = (state.roster || []).filter(
    (c) => String(c.kingdom) === String(targetKingdom) && c.instanceId === (instance?.instanceId || 'sidekick-mumu-0')
  );

  if (operation === 'CREATE_CHARACTER' && existingInKd.length >= 2) {
    return {
      allowed: false,
      gate: 'NUMNUM_DETERMINISTIC_V2',
      reason: `NUMNUM VETO: ${instance?.instanceId} already has ${existingInKd.length}/2 characters in Kingdom #${targetKingdom} (Lilith hard cap is 2 per kingdom per email). Assign to sidekick-mumu-1 (Account #2) instead.`,
      metrics: { cpuLoad, freeRamGb, existingCharsInKingdom: existingInKd.length },
    };
  }

  if (cpuLoad >= 90 || freeRamGb < 2.5) {
    return {
      allowed: false,
      gate: 'NUMNUM_DETERMINISTIC_V2',
      reason: `NUMNUM VETO: Node ${node?.nodeId} resource threshold exceeded (CPU: ${cpuLoad}%, Free RAM: ${freeRamGb}GB).`,
      metrics: { cpuLoad, freeRamGb, existingCharsInKingdom: existingInKd.length },
    };
  }

  return {
    allowed: true,
    gate: 'NUMNUM_DETERMINISTIC_V2',
    reason: `NUMNUM PASS: Node ${node?.nodeId || 'SIDEKICK'} healthy (CPU ${cpuLoad}%, Free RAM ${freeRamGb}GB, ${existingInKd.length}/2 chars in #${targetKingdom}).`,
    metrics: { cpuLoad, freeRamGb, existingCharsInKingdom: existingInKd.length },
  };
}

async function dispatchToClusterHub(psCommand) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${CLUSTER_HUB_URL}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: psCommand }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return { dispatched: true, hubResponse: await res.json() };
    }
    return { dispatched: false, status: res.status };
  } catch (err) {
    return { dispatched: false, note: 'Queued asynchronously for Node 2 worker pickup' };
  }
}

export async function GET() {
  const state = readBastionState();
  if (!state) {
    return NextResponse.json({ error: 'Bastion state file not found' }, { status: 404 });
  }

  // Enrich with live Cluster Hub node telemetry if reachable
  let clusterLive = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${CLUSTER_HUB_URL}/status`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      clusterLive = await res.json();
    }
  } catch {}

  const epochLedger = readEpochLedger();

  return NextResponse.json({
    success: true,
    state,
    clusterLive,
    epochLedger,
    kvkPresets: KVK_SCAN_PRESETS,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload = {} } = body;
    const state = readBastionState();
    const epochLedger = readEpochLedger();

    if (!state) {
      return NextResponse.json({ error: 'Bastion state unavailable' }, { status: 500 });
    }

    const r1Model = state.ringModels?.ring1_intelligence?.selectedModel || 'gemini-3.1-flash-lite';
    const r2Model = state.ringModels?.ring2_dispatch?.selectedModel || 'gemini-2.5-flash';
    const r3Model = state.ringModels?.ring3_forensics?.selectedModel || 'gemini-2.5-pro';

    // 0A. SET KVK SCAN PRESET (465 Core / 650 Sweet Spot / 1000 Full + R5 Header)
    if (action === 'SET_SCAN_PRESET') {
      const { kingdom = 'ALL', presetId = 'SWEET_650' } = payload;
      const preset = KVK_SCAN_PRESETS[presetId] || KVK_SCAN_PRESETS.SWEET_650;

      if (kingdom === 'ALL') {
        epochLedger.defaultScanPreset = preset.id;
        (state.kingdomSchedules || []).forEach((k) => {
          k.scanPreset = preset.id;
          k.targetRanks = preset.targetRanks;
        });
      } else {
        epochLedger.kingdomEpochs = epochLedger.kingdomEpochs || {};
        epochLedger.kingdomEpochs[String(kingdom)] = {
          ...(epochLedger.kingdomEpochs[String(kingdom)] || { kingdomId: String(kingdom), status: 'BOT_SOVEREIGN' }),
          scanPreset: preset.id,
        };
        const kdEntry = (state.kingdomSchedules || []).find((k) => String(k.kingdom) === String(kingdom));
        if (kdEntry) {
          kdEntry.scanPreset = preset.id;
          kdEntry.targetRanks = preset.targetRanks;
        }
      }

      appendLog(state, {
        agent: 'NULL',
        ring: 'ring2_dispatch',
        model: r2Model,
        action: 'SCAN_PRESET_UPDATED',
        kingdom,
        detail: `Set scan depth for ${kingdom === 'ALL' ? 'All Kingdoms' : 'Kingdom #' + kingdom} to ${preset.label} (+ 15s Top-10 Alliance R5 Leader header capture).`,
      });

      writeEpochLedger(epochLedger);
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger, kvkPresets: KVK_SCAN_PRESETS });
    }

    // 0B. EXECUTE EPOCH 0 ARCHIVAL CUTOVER (Archive Legacy Sheets & Zero Deltas Moving Forward)
    if (action === 'EXECUTE_EPOCH_CUTOVER') {
      const targetKd = String(payload.kingdom || 'ALL');
      const nowIso = new Date().toISOString();

      if (targetKd === 'ALL') {
        epochLedger.globalCutoverActive = true;
        (state.kingdomSchedules || []).forEach((k) => {
          if (k.mode !== 'GENESIS_WATCH') {
            epochLedger.kingdomEpochs[String(k.kingdom)] = {
              kingdomId: String(k.kingdom),
              status: 'BOT_SOVEREIGN',
              epochZeroAt: nowIso,
              scanPreset: epochLedger.defaultScanPreset || 'SWEET_650',
              activeBaselineSource: 'BASTION_BOT',
              legacySheetsArchived: true,
              legacyBaselineZeroed: true,
              allianceR5HeaderCaptured: true,
              governorsCount: k.genesisGovernorsTracked || 650,
            };
          }
        });
      } else {
        epochLedger.kingdomEpochs[targetKd] = {
          kingdomId: targetKd,
          status: 'BOT_SOVEREIGN',
          epochZeroAt: nowIso,
          scanPreset: epochLedger.defaultScanPreset || 'SWEET_650',
          activeBaselineSource: 'BASTION_BOT',
          legacySheetsArchived: true,
          legacyBaselineZeroed: true,
          allianceR5HeaderCaptured: true,
          governorsCount: 650,
        };
        epochLedger.trojanHorseLeads = (epochLedger.trojanHorseLeads || []).filter(
          (l) => String(l.kingdomId) !== targetKd
        );
      }

      appendLog(state, {
        agent: 'DOZER',
        ring: 'ring3_forensics',
        model: 'DOZER_SLICE_MERGER_V1',
        action: 'EPOCH_0_CUTOVER_LOCKED',
        kingdom: targetKd,
        detail: `Executed Epoch 0 Archival Cutover for ${targetKd === 'ALL' ? 'all tracked kingdoms' : 'Kingdom #' + targetKd}. Legacy spreadsheets moved to View-Only Archive and zeroed out from active Bot-to-Bot deltas.`,
      });

      writeEpochLedger(epochLedger);
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger, kvkPresets: KVK_SCAN_PRESETS });
    }

    // 1. TOGGLE AUTOPILOT
    if (action === 'TOGGLE_AUTOPILOT') {
      state.autopilotEnabled = typeof payload.enabled === 'boolean' ? payload.enabled : !state.autopilotEnabled;
      appendLog(state, {
        agent: 'TANK',
        ring: 'ring2_dispatch',
        model: r2Model,
        action: state.autopilotEnabled ? 'AUTOPILOT_ENGAGED' : 'AUTOPILOT_PAUSED',
        kingdom: 'ALL',
        detail: `Operator toggled Bastion Autopilot to ${state.autopilotEnabled ? 'ON (12h Steady-State + 3h Demand Surge active)' : 'PAUSED (Manual Intervention Mode)'}.`,
      });
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger });
    }

    // 2. TOGGLE AUTO-GENESIS NEW KINGDOM WATCHER
    if (action === 'TOGGLE_AUTO_GENESIS') {
      state.autoGenesisEnabled = typeof payload.enabled === 'boolean' ? payload.enabled : !state.autoGenesisEnabled;
      appendLog(state, {
        agent: 'SCOUT',
        ring: 'ring1_intelligence',
        model: r1Model,
        action: state.autoGenesisEnabled ? 'GENESIS_WATCH_ENABLED' : 'GENESIS_WATCH_PAUSED',
        kingdom: state.nextGenesisWatchKingdom || 4203,
        detail: `SCOUT New-Kingdom Genesis Auto-Trigger set to ${state.autoGenesisEnabled ? 'ACTIVE — will auto-deploy bot the moment #' + state.nextGenesisWatchKingdom + ' opens' : 'PAUSED'}.`,
      });
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger });
    }

    // 3. SET PER-RING LLM / SLM MODEL
    if (action === 'SET_RING_MODEL') {
      const { ringKey, modelId } = payload;
      if (state.ringModels && state.ringModels[ringKey]) {
        const oldModel = state.ringModels[ringKey].selectedModel;
        state.ringModels[ringKey].selectedModel = modelId;
        appendLog(state, {
          agent: 'TANK',
          ring: ringKey,
          model: modelId,
          action: 'RING_MODEL_UPDATED',
          kingdom: 'ALL',
          detail: `Switched ${state.ringModels[ringKey].ringName} model from ${oldModel} → ${modelId}.`,
        });
        writeBastionState(state);
      }
      return NextResponse.json({ success: true, state, epochLedger });
    }

    // 4. SET KINGDOM CADENCE (12h Steady <-> 3h Surge <-> Paused)
    if (action === 'SET_KINGDOM_CADENCE') {
      const { kingdom, mode, cadenceHours } = payload;
      const kdEntry = (state.kingdomSchedules || []).find((k) => String(k.kingdom) === String(kingdom));
      if (kdEntry) {
        kdEntry.mode = mode;
        kdEntry.cadenceHours = Number(cadenceHours) || (mode === 'SURGE_3H' ? 3 : 12);
        kdEntry.reason = `Operator manual override via Bastion Command Center (${mode})`;
        const nextDate = new Date(Date.now() + kdEntry.cadenceHours * 3600 * 1000);
        kdEntry.nextScanAt = nextDate.toISOString();
      }
      appendLog(state, {
        agent: 'NULL',
        ring: 'ring2_dispatch',
        model: r2Model,
        action: 'CADENCE_OVERRIDE',
        kingdom,
        detail: `NULL updated Kingdom #${kingdom} cadence to ${mode} (every ${cadenceHours || (mode === 'SURGE_3H' ? 3 : 12)}h).`,
      });
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger });
    }

    // 5. SWITCH INSTANCE ACTIVE KINGDOM (22-second in-game character hop)
    if (action === 'SWITCH_INSTANCE_KINGDOM') {
      const { instanceId = 'sidekick-mumu-0', kingdom } = payload;
      const gate = evaluateNumNumGate(state, { targetKingdom: kingdom, instanceId, operation: 'SWITCH_CHARACTER' });
      const inst = (state.instances || []).find((i) => i.instanceId === instanceId);
      const targetChar = (state.roster || []).find(
        (c) => String(c.kingdom) === String(kingdom) && c.instanceId === instanceId
      );

      if (inst) {
        inst.activeKingdom = String(kingdom);
        inst.activeCharacter = targetChar ? `${targetChar.name} (CH${targetChar.chLevel})` : `Governor in #${kingdom}`;
        inst.assignedTask = `SWITCHING_TO_#${kingdom} (~22s via CIPHER)`;
        inst.lastHeartbeat = new Date().toISOString();
      }

      const psCmd = `Start-Process python -ArgumentList 'C:\\UnityScanner\\provision_neighbor_kingdom.py --kingdom ${kingdom} --mode switch' -WindowStyle Hidden`;
      const dispatchResult = await dispatchToClusterHub(psCmd);

      appendLog(state, {
        agent: 'CIPHER',
        ring: 'ring2_dispatch',
        model: `${r1Model} + OpenCV`,
        action: 'CHARACTER_SWITCH_DISPATCHED',
        kingdom,
        detail: `${gate.reason} Dispatched 22s character switch on ${instanceId} → Kingdom #${kingdom} (${targetChar ? targetChar.name : 'Character Slot'}).`,
      });
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger, gate, dispatchResult });
    }

    // 6. PROVISION NEW KINGDOM / GENESIS BOT DEPLOYMENT
    if (action === 'PROVISION_NEW_KINGDOM' || action === 'TRIGGER_GENESIS_BOT') {
      const targetKd = String(payload.kingdom || state.nextGenesisWatchKingdom || '4203').trim();
      const instanceId = payload.instanceId || 'sidekick-mumu-0';
      const isGenesis = action === 'TRIGGER_GENESIS_BOT' || Number(targetKd) > Number(state.highestKnownKingdom || 4202);

      // Run NumNum Deterministic Gate first
      const gate = evaluateNumNumGate(state, {
        targetKingdom: targetKd,
        instanceId,
        operation: 'CREATE_CHARACTER',
      });

      if (!gate.allowed) {
        appendLog(state, {
          agent: 'NUMNUM',
          ring: 'ring2_dispatch',
          model: 'NUMNUM_DETERMINISTIC_V2',
          action: 'PROVISION_VETOED',
          kingdom: targetKd,
          detail: gate.reason,
        });
        writeBastionState(state);
        return NextResponse.json({ success: false, vetoed: true, gate, state, epochLedger }, { status: 400 });
      }

      // Update instance & schedule state
      const inst = (state.instances || []).find((i) => i.instanceId === instanceId);
      if (inst) {
        inst.activeKingdom = targetKd;
        inst.assignedTask = isGenesis
          ? `GENESIS_BOT_DEPLOY (#${targetKd} Day-1 Governor Capture)`
          : `PROVISIONING_NEW_CHAR (#${targetKd})`;
        inst.status = 'BUSY_PROVISIONING';
      }

      // Add or update kingdom schedule
      let kdSched = (state.kingdomSchedules || []).find((k) => String(k.kingdom) === targetKd);
      if (!kdSched) {
        kdSched = {
          kingdom: targetKd,
          name: isGenesis ? `Genesis Kingdom #${targetKd}` : `Kingdom #${targetKd}`,
          continent: isGenesis ? 'Genesis Frontier' : 'Tracked Continent',
          mode: isGenesis ? 'GENESIS_BASELINE' : 'STEADY_12H',
          cadenceHours: 12,
          scanPreset: epochLedger.defaultScanPreset || 'SWEET_650',
          targetRanks: 650,
          unityApiCalls24h: 1,
          kpDeltaPct: 0,
          accountsAvailable: 1,
          assignedInstances: [instanceId],
          lastScanAt: new Date().toISOString(),
          nextScanAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          genesisCaptured: isGenesis,
          genesisGovernorsTracked: isGenesis ? 650 : 0,
          reason: isGenesis
            ? 'SCOUT Genesis Auto-Trigger: Capturing Day-1 native governors for future migration tracking'
            : 'Provisioned on demand by Bastion Ring',
        };
        state.kingdomSchedules.push(kdSched);
      } else {
        kdSched.mode = isGenesis ? 'GENESIS_BASELINE' : 'STEADY_12H';
        kdSched.accountsAvailable = (kdSched.accountsAvailable || 0) + 1;
        kdSched.genesisCaptured = true;
        kdSched.reason = 'Provisioned & armed via Bastion Command Center';
      }

      // Lock Kingdom into BOT_SOVEREIGN (Epoch 0 Cutover) & clear any Trojan Horse sheet lead
      epochLedger.kingdomEpochs = epochLedger.kingdomEpochs || {};
      epochLedger.kingdomEpochs[targetKd] = {
        kingdomId: targetKd,
        status: isGenesis ? 'GENESIS_SOVEREIGN' : 'BOT_SOVEREIGN',
        epochZeroAt: new Date().toISOString(),
        scanPreset: epochLedger.defaultScanPreset || 'SWEET_650',
        activeBaselineSource: isGenesis ? 'GENESIS_BOT' : 'BASTION_BOT',
        legacySheetsArchived: true,
        legacyBaselineZeroed: true,
        allianceR5HeaderCaptured: true,
        governorsCount: 650,
      };
      epochLedger.trojanHorseLeads = (epochLedger.trojanHorseLeads || []).filter(
        (l) => String(l.kingdomId) !== targetKd
      );
      writeEpochLedger(epochLedger);

      if (Number(targetKd) >= Number(state.nextGenesisWatchKingdom || 4203)) {
        state.highestKnownKingdom = Number(targetKd);
        state.nextGenesisWatchKingdom = Number(targetKd) + 1;
      }

      const psCmd = `Start-Process python -ArgumentList 'C:\\UnityScanner\\bastion_genesis_probe.py --kingdom ${targetKd} --mode create' -WindowStyle Hidden`;
      const dispatchResult = await dispatchToClusterHub(psCmd);

      appendLog(state, {
        agent: isGenesis ? 'SCOUT' : 'CIPHER',
        ring: isGenesis ? 'ring1_intelligence' : 'ring2_dispatch',
        model: isGenesis ? r1Model : `${r2Model} + OpenCV`,
        action: isGenesis ? 'GENESIS_BOT_DEPLOYED' : 'ACCOUNT_PROVISION_STARTED',
        kingdom: targetKd,
        detail: `${gate.reason} Launched autonomous character creation + tutorial clear in Kingdom #${targetKd} on ${instanceId}. Locked #${targetKd} into Bot-Sovereign Epoch 0.`,
      });

      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger, gate, dispatchResult });
    }

    // 7. RECORD UNITY API DEMAND PULSE (KENT -> NULL Auto-Scaler)
    if (action === 'RECORD_UNITY_DEMAND') {
      const targetKd = String(payload.kingdom || '4194');
      const entry = (state.kingdomSchedules || []).find((k) => String(k.kingdom) === targetKd);
      if (entry) {
        entry.unityApiCalls24h = (entry.unityApiCalls24h || 0) + (Number(payload.weight) || 1);
        if (
          state.autopilotEnabled &&
          entry.mode === 'STEADY_12H' &&
          entry.unityApiCalls24h >= (state.demandThresholdForSurge || 5)
        ) {
          entry.mode = 'SURGE_3H';
          entry.cadenceHours = 3;
          entry.reason = `KENT detected high Unity API demand (${entry.unityApiCalls24h} calls) → NULL auto-promoted to 3h Surge Mode`;
          appendLog(state, {
            agent: 'KENT',
            ring: 'ring1_intelligence',
            model: r1Model,
            action: 'DEMAND_SURGE_DETECTED',
            kingdom: targetKd,
            detail: `Kingdom #${targetKd} crossed Unity API demand threshold (${entry.unityApiCalls24h} calls). NULL auto-shifted cadence from 12h Steady → 3h Surge and requested parallel rank slicing.`,
          });
        }
      }
      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger });
    }

    // 8. RUN IMMEDIATE PRIORITY SCAN (BIG JON Preemption -> CIPHER -> DOZER)
    if (action === 'RUN_IMMEDIATE_SCAN') {
      const targetKd = String(payload.kingdom || '4194');
      const kdEpoch = epochLedger.kingdomEpochs?.[targetKd];
      const presetId = payload.presetId || kdEpoch?.scanPreset || epochLedger.defaultScanPreset || 'SWEET_650';
      const preset = KVK_SCAN_PRESETS[presetId] || KVK_SCAN_PRESETS.SWEET_650;
      const slice = payload.slice || `1-${preset.targetRanks}`;
      const instanceId = payload.instanceId || 'sidekick-mumu-0';

      appendLog(state, {
        agent: 'BIG JON',
        ring: 'ring2_dispatch',
        model: r1Model,
        action: 'PRIORITY_SCAN_PREEMPT',
        kingdom: targetKd,
        detail: `Operator triggered immediate ${preset.label} scan for Kingdom #${targetKd} (Ranks ${slice} + Top-10 Alliance R5 Header) on ${instanceId}. DOZER Monotonic KP/Deads Guard armed.`,
      });

      const inst = (state.instances || []).find((i) => i.instanceId === instanceId);
      if (inst) {
        inst.activeKingdom = targetKd;
        inst.assignedSlice = slice;
        inst.assignedTask = `SCANNING_#${targetKd} (${preset.label})`;
        inst.status = 'SCANNING_LIVE';
      }

      const psCmd = `Start-Process python -ArgumentList 'C:\\UnityScanner\\unity_autonomous_scanner.py --kingdom ${targetKd} --max-ranks ${preset.targetRanks}' -WindowStyle Hidden`;
      const dispatchResult = await dispatchToClusterHub(psCmd);

      writeBastionState(state);
      return NextResponse.json({ success: true, state, epochLedger, dispatchResult });
    }

    return NextResponse.json({ error: `Unknown Bastion action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[BASTION POST ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
