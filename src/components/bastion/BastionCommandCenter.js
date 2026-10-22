'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import {
  Shield,
  Cpu,
  Activity,
  Bot,
  Play,
  RefreshCw,
  PlusCircle,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Server,
  Clock,
  Terminal,
  Database,
  Lock,
  X,
  Layers,
  Eye,
} from 'lucide-react';

const MODES = [
  {
    key: 'OFF',
    label: 'OFF (Kill Switch)',
    cls: 'border-slate-500/50 text-slate-300',
    activeCls: 'bg-slate-500/25 border-slate-400 text-white ring-1 ring-slate-400/40',
    hint: 'Hard kill switch: no Ring 1/2 planning or job dispatch',
  },
  {
    key: 'DRY_RUN',
    label: 'DRY_RUN (Plan Only)',
    cls: 'border-cyan-500/50 text-cyan-300',
    activeCls: 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/40',
    hint: 'Full Ring 1 -> Ring 2 -> NUMNUM evaluation & audit logging, zero SQS dispatch',
  },
  {
    key: 'SUPERVISED',
    label: 'SUPERVISED (Routine Ops)',
    cls: 'border-amber-500/50 text-amber-300',
    activeCls: 'bg-amber-500/25 border-amber-400 text-amber-200 ring-1 ring-amber-400/40',
    hint: 'Auto-dispatches NUMNUM-approved probe_status, sleep, grow_city, switch_character & scan_kingdom; holds provision_character for operator approval',
  },
  {
    key: 'AUTONOMOUS',
    label: 'AUTONOMOUS (Full Fleet)',
    cls: 'border-pink-500/50 text-pink-300',
    activeCls: 'bg-pink-500/25 border-pink-400 text-pink-200 ring-1 ring-pink-400/40',
    hint: 'Dispatches all NUMNUM-approved jobs including self-healing & cross-instance twin provisioning',
  },
];

const AGENT_DEFINITIONS = [
  // ================= RING 1: INTELLIGENCE & DEMAND =================
  {
    id: 'scout',
    actorKey: 'SCOUT',
    name: 'SCOUT',
    icon: '🔭',
    role: 'Ring 1 Leader — Intelligence & Genesis Discovery',
    ringKey: 'RING_1_INTEL',
    cadence: 'Every 60s Tick',
    color: '#06b6d4',
    defaultModelType: 'gemini-2.5-flash-lite + Deterministic Fallback',
    helpers: ['R1_KINGDOM_WATCHER', 'R1_LEAD_TRIAGE'],
    output: 'Triaged Demand Signals (SCAN_REQUESTED · LOCATE_REQUESTED · EXPAND_REQUESTED · GROWTH_REQUESTED · SCAN_DUE · BOT_LOST · REDUNDANCY_GAP) → Ring 2',
    directive:
      'Leads Ring 1 (Intelligence). Coordinates KENT (R5 & Unity intent ingestion across 4 mission types) and NULL (watched-kingdom staleness, BOT_LOST & REDUNDANCY_GAP math) to emit prioritized Demand signals into Ring 2. Spawns bounded R1 helpers when surge demand requires triage.',
  },
  {
    id: 'kent',
    actorKey: 'KENT',
    name: 'KENT',
    icon: '📋',
    role: 'Unity R5 & Demand Intent Ingestor',
    ringKey: 'RING_1_INTEL',
    cadence: 'Every Tick (0 Tokens)',
    color: '#38bdf8',
    defaultModelType: 'DETERMINISTIC_RULE (0 Tokens)',
    helpers: ['R1_LEAD_TRIAGE'],
    output: 'Validated BastionIntents (PENDING → TRIAGED_BY_SCOUT → PLANNED_BY_TANK)',
    directive:
      'Queries BastionIntents (status-index = PENDING, TRIAGED_BY_SCOUT, PLANNED_BY_TANK) submitted by R5 Command Desks, Unity API Demand, Data Leads, or Operators. Validates against events.schema.json and promotes SCAN_KINGDOM, LOCATE_GOVERNOR, EXPAND_TO_KINGDOM, and PRIORITIZE_GROWTH requests into Ring 1 signals.',
  },
  {
    id: 'null',
    actorKey: 'NULL',
    name: 'NULL',
    icon: '🧮',
    role: 'Watched-Kingdom Cadence, Self-Heal & Twin Redundancy Calculator',
    ringKey: 'RING_1_INTEL',
    cadence: 'Every Tick (0 Tokens)',
    color: '#22d3ee',
    defaultModelType: 'PURE_MATH (0 Tokens)',
    helpers: [],
    output: 'SCAN_DUE · BOT_LOST · REDUNDANCY_GAP Signals',
    directive:
      'Pure math cadence & redundancy evaluator in Ring 1. Compares each watched kingdom’s last AUDIT-verified scan timestamp (KINGDOM#<id>) against its configured cadence (3h Surge or 12h Steady), detects SUSPECT/LOST bots, and verifies mumu-0 <-> mumu-1 twin coverage.',
  },

  // ================= RING 2: FLEET OPERATIONS & SAFETY GATE =================
  {
    id: 'tank',
    actorKey: 'TANK',
    name: 'TANK',
    icon: '🎯',
    role: 'Ring 2 Leader — Chief of Fleet Operations',
    ringKey: 'RING_2_OPS',
    cadence: 'Every 60s Tick',
    color: '#f59e0b',
    defaultModelType: 'gemini-2.5-flash + Deterministic Fallback',
    helpers: ['R2_COHORT_SCHEDULER', 'R2_REPLACEMENT_PLANNER'],
    output: 'Typed BastionJob Proposals → NUMNUM Gate → bastion-jobs.fifo',
    directive:
      'Leads Ring 2 (Operations). Evaluates each SIDEKICK instance’s active bot, enforces human-like sleep windows, session breaks, daily active caps, CH8 growth progression, self-healing replacements, cross-instance twins, and R5/scheduled kingdom scan missions before submitting typed job proposals to NUMNUM.',
  },
  {
    id: 'bigjon',
    actorKey: 'BIG_JON',
    name: 'BIG JON',
    icon: '🥊',
    role: 'Mission Priority & Preemption Referee',
    ringKey: 'RING_2_OPS',
    cadence: 'Per Plan (0 Tokens)',
    color: '#f97316',
    defaultModelType: 'DETERMINISTIC_RULE (0 Tokens)',
    helpers: [],
    output: 'Mission Preemption (Self-Heal > R5 Expand/Scan/Locate > Twin Convergence > Due Scan > R5 Growth > CH8 Growth > Probe)',
    directive:
      'Deterministic priority referee inside Ring 2. Ensures self-healing replacements, R5/Operator mission intents, cross-instance twin convergence, and overdue kingdom scans preempt routine city growth or status probes whenever the stationed bot is awake.',
  },
  {
    id: 'numnum',
    actorKey: 'NUMNUM',
    name: 'NUMNUM',
    icon: '🔢',
    role: 'Deterministic 11-Rule Safety, Redundancy & Budget Gate',
    ringKey: 'RING_2_OPS',
    cadence: 'Every Job (0 Tokens)',
    color: '#a78bfa',
    defaultModelType: 'PURE_MATH_GATE (0 Tokens)',
    helpers: [],
    output: 'Pass/Fail 11-Rule Table · Approval ID (nn_*) or Hard Hold',
    directive:
      'Non-bypassable 11-rule deterministic veto gate. Evaluates SLEEP_WINDOW_CHECK, SESSION_DURATION_CAP, DAILY_ACTIVE_MINUTES_CAP, INSTANCE_SINGLE_TENANT_MUTEX, ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM, CROSS_INSTANCE_REDUNDANCY, JOB_SCHEMA_BOUNDS, IDEMPOTENCY_DEDUP, RING_TOKEN_BUDGET, HELPER_CONCURRENCY_CAP, and EXECUTOR_CAPABILITY.',
  },
  {
    id: 'cipher',
    actorKey: 'CIPHER',
    name: 'CIPHER',
    icon: '⚡',
    role: 'SIDEKICK SQS Executor & S3 Evidence Producer',
    ringKey: 'RING_2_OPS',
    cadence: 'Continuous SQS Poller',
    color: '#10b981',
    defaultModelType: 'ADB + RapidOCR + SQLite Ledger (6 Live Skills)',
    helpers: [],
    output: 'BastionJobResult → bastion-results + PNG Proof → S3',
    directive:
      'Runs on SIDEKICK (C:\\UnityScanner) polling bastion-jobs.fifo. Executes probe_status, sleep, grow_city, switch_character, provision_character, and scan_kingdom on MuMu instances (:16384, :16416, :16448), uploads SHA-256 screenshot proof to S3, and posts results to bastion-results.',
  },

  // ================= RING 3: VERIFICATION, RECONCILIATION & LIFECYCLE =================
  {
    id: 'audit',
    actorKey: 'AUDIT',
    name: 'BASTION AUDIT',
    icon: '🔍',
    role: 'Ring 3 Leader — Chief Verification & Lifecycle Officer',
    ringKey: 'RING_3_AUDIT',
    cadence: 'On Every Job Result',
    color: '#ec4899',
    defaultModelType: 'gemini-2.5-pro + Deterministic Fallback',
    helpers: ['R3_MIGRATION_ANALYST', 'R3_BAN_INVESTIGATOR'],
    output: 'Sole Writer of BastionBots · BastionAccountSlots · KINGDOM#<id> · VERIFIED_BY_AUDIT',
    directive:
      'Leads Ring 3 (Audit). The ONLY component permitted to mutate BastionBots, BastionAccountSlots, stamp KINGDOM#<id>, or transition BastionIntents to VERIFIED_BY_AUDIT. Inspects CIPHER results + DOZER checks, updates verified CH level/power/screenshots, registers newly provisioned characters with staggered twin sleep windows, and spawns R3_BAN_INVESTIGATOR on anomalies.',
  },
  {
    id: 'dozer',
    actorKey: 'DOZER',
    name: 'DOZER',
    icon: '🏗️',
    role: 'Evidence Integrity & OCR Reconciler',
    ringKey: 'RING_3_AUDIT',
    cadence: 'Per Result (0 Tokens)',
    color: '#c084fc',
    defaultModelType: 'PURE_MATH (0 Tokens)',
    helpers: [],
    output: 'SHA-256 Proof Verification · OCR Line Count · Step Count Audit',
    directive:
      'Pure math evidence verifier in Ring 3. Validates every BastionJobResult from bastion-results against jobs.schema.json, verifies S3 screenshot presence and 64-char SHA-256 digest integrity, and feeds structured verification checks to AUDIT.',
  },
];

const RING_GROUPS = [
  {
    key: 'RING_1_INTEL',
    badge: 'RING 01 // INTELLIGENCE, R5 INTENT INGEST, TWIN REDUNDANCY & STALENESS DETECTION',
    leader: 'SCOUT',
    members: 'SCOUT (Leader) · KENT (R5 & Demand Intake) · NULL (Staleness, Loss & Twin Math)',
    accent: 'border-cyan-500/40 from-cyan-950/30 via-[#0b0e17] to-[#0b0e17]',
    badgeCls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    key: 'RING_2_OPS',
    badge: 'RING 02 // FLEET OPERATIONS, PRIORITY PREEMPTION, NUMNUM 11-RULE GATE & CIPHER',
    leader: 'TANK',
    members: 'TANK (Leader) · BIG JON (Priority) · NUMNUM (11-Rule Gate) · CIPHER (6-Skill Executor)',
    accent: 'border-amber-500/40 from-amber-950/30 via-[#0b0e17] to-[#0b0e17]',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    key: 'RING_3_AUDIT',
    badge: 'RING 03 // EVIDENCE VERIFICATION, DOZER RECONCILIATION, BOT LIFECYCLE & MISSION PROOF',
    leader: 'AUDIT',
    members: 'AUDIT (Leader & Sole Bot/Intent Verifier) · DOZER (SHA-256 & Evidence Math)',
    accent: 'border-pink-500/40 from-pink-950/30 via-[#0b0e17] to-[#0b0e17]',
    badgeCls: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
];

const INSTANCE_META = {
  'sidekick-mumu-0': {
    adb: '127.0.0.1:16384',
    accountId: 'mumu-account-0',
    label: 'Primary Multi-Kingdom Fleet Worker (8 Chars / 7 Kingdoms)',
  },
  'sidekick-mumu-1': {
    adb: '127.0.0.1:16416',
    accountId: 'mumu-account-1',
    label: 'Parallel Multi-Kingdom Fleet Worker (7 Tracked Chars / 7 Kingdoms)',
  },
  'sidekick-mumu-2': {
    adb: '127.0.0.1:16448',
    accountId: 'mumu-account-2',
    label: 'Standby Reserve / Expansion Instance',
  },
};

const SEVERITY_CLS = {
  INFO: 'text-slate-300',
  NOTICE: 'text-cyan-300',
  WARN: 'text-amber-300',
  CRITICAL: 'text-red-400 font-bold',
};

const RING_PILL_CLS = {
  RING_1_INTEL: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  RING_2_OPS: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  RING_3_AUDIT: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  SYSTEM: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const STATE_BADGE_CLS = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  GROWING: 'bg-lime-500/15 text-lime-300 border-lime-500/40',
  SLEEPING: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  ON_MISSION: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  SUSPECT: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  LOST: 'bg-red-500/20 text-red-300 border-red-500/50',
  RETIRED: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
  PROVISIONING: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
};

function ago(iso, nowMs) {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, Math.round((nowMs - t) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${(s / 3600).toFixed(1)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function EventAuditRow({ ev, nowMs, onApprovePlan, approvedPlans = [], busyAction }) {
  const [open, setOpen] = useState(false);
  const o = ev.oversight || {};
  const checks = o.numnum_checks || [];
  const isHeldPlan =
    ev.event_type === 'PLAN_APPROVED' &&
    Boolean(ev.bot_id) &&
    Boolean(o.operator_action_required) &&
    String(ev.summary || '').includes('held for approval');
  const isAlreadyApproved = isHeldPlan && approvedPlans.includes(ev.bot_id);

  return (
    <div className="border-b border-slate-800/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/40 flex flex-wrap items-center gap-2.5 text-[11px] cursor-pointer transition-colors"
      >
        <span className="text-slate-500 w-16 shrink-0 font-mono">{ago(ev.timestamp, nowMs)}</span>
        <span className={`px-2 py-0.5 rounded border text-[10px] font-black ${RING_PILL_CLS[ev.ring] || RING_PILL_CLS.SYSTEM}`}>
          {ev.actor}
        </span>
        <span className="text-slate-400 w-36 shrink-0 font-mono text-[10px]">{ev.event_type}</span>
        {ev.kingdom_id && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
            #{ev.kingdom_id}
          </span>
        )}
        {ev.instance_id && (
          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
            {ev.instance_id}
          </span>
        )}
        <span className={`flex-1 min-w-[14rem] font-sans ${SEVERITY_CLS[ev.severity] || 'text-slate-200'}`}>
          {ev.summary}
        </span>
        <span className="text-slate-500 text-xs">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3.5 pt-1 space-y-2.5 text-[11px] font-sans bg-[#070a11]/90 border-t border-slate-800/50">
          <div className="p-2.5 rounded-lg bg-[#0b101b] border border-slate-800">
            <span className="text-amber-400 font-mono font-bold text-[10px] uppercase mr-2">WHY //</span>
            <span className="text-slate-200">{o.why}</span>
          </div>

          {o.operator_action_required && (
            <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 font-bold flex flex-wrap items-center justify-between gap-2">
              <span>⚠️ OPERATOR ACTION REQUIRED: {o.operator_instructions}</span>
              {isHeldPlan && onApprovePlan && (
                isAlreadyApproved ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono">
                    ✓ APPROVED · DISPATCHES ON NEXT TICK
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyAction === `approve-${ev.bot_id}`}
                    onClick={() => onApprovePlan(ev.bot_id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] font-mono cursor-pointer transition-all"
                  >
                    ✓ Approve & Dispatch ({ev.bot_id})
                  </button>
                )
              )}
            </div>
          )}

          {checks.length > 0 && (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <div className="bg-slate-900/90 px-3 py-1.5 text-[10px] font-mono font-bold text-purple-300 uppercase">
                NUMNUM DETERMINISTIC SAFETY GATE EVALUATION ({checks.filter((c) => c.passed).length}/{checks.length} PASSED)
              </div>
              <table className="w-full text-[10px] font-mono">
                <thead className="bg-black/40 text-slate-500">
                  <tr className="text-left">
                    <th className="py-1 px-2.5">STATUS</th>
                    <th className="py-1 px-2.5">RULE ID</th>
                    <th className="py-1 px-2.5">ACTUAL / LIMIT</th>
                    <th className="py-1 px-2.5">DETAIL</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.rule_id} className="border-t border-slate-800/80">
                      <td className={`py-1 px-2.5 font-black ${c.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.passed ? '✓ PASS' : '✗ HOLD'}
                      </td>
                      <td className="py-1 px-2.5 text-slate-200 font-bold">{c.rule_id}</td>
                      <td className="py-1 px-2.5 text-slate-400">
                        {String(c.actual_value ?? '—')} / {String(c.limit_value ?? '—')}
                      </td>
                      <td className="py-1 px-2.5 text-slate-300 font-sans">{c.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {o.trigger_inputs && Object.keys(o.trigger_inputs).length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Trigger Inputs</div>
              <pre className="bg-black/50 border border-slate-800 rounded-lg p-2.5 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-48">
                {JSON.stringify(o.trigger_inputs, null, 2)}
              </pre>
            </div>
          )}

          {(o.evidence_refs || []).length > 0 && (
            <div className="text-[10px] font-mono text-emerald-300 break-all bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2">
              📸 S3 EVIDENCE: {o.evidence_refs.join('  ')}
            </div>
          )}

          <div className="text-[10px] font-mono text-slate-500 flex flex-wrap items-center gap-3 pt-1">
            <span>event: {ev.event_id}</span>
            <span>corr: {ev.correlation_id}</span>
            <span>ts: {ev.timestamp}</span>
            <span>mode: {ev.operating_mode}</span>
            {ev.bot_id && <span>bot: {ev.bot_id}</span>}
            {ev.job_id && <span>job: {ev.job_id}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BastionCommandCenter() {
  const { effectiveIsValheonFounder, effectiveIsSuperAdmin } = useRolePreview();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null);
  const [bannerMsg, setBannerMsg] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Intent / Scan dispatch form
  const [scanKingdom, setScanKingdom] = useState('4194');
  const [scanIntentType, setScanIntentType] = useState('SCAN_KINGDOM');
  const [scanSource, setScanSource] = useState('R5_COMMAND_DESK');
  const [scanRanks, setScanRanks] = useState('650');
  const [scanPriority, setScanPriority] = useState('85');
  const [scanTargetGov, setScanTargetGov] = useState('');

  // Fleet & Event filters
  const [instanceFilter, setInstanceFilter] = useState('ALL');
  const [ringFilter, setRingFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [severityFloor, setSeverityFloor] = useState('INFO');

  const fetchBrain = useCallback(async () => {
    try {
      const res = await fetch('/api/bastion/brain', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setBannerMsg((prev) => prev || { type: 'error', text: err.message });
    } finally {
      setNowMs(Date.now());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrain();
    const iv = setInterval(fetchBrain, 10000);
    return () => clearInterval(iv);
  }, [fetchBrain]);

  const postBrainAction = async (payload, label, confirmText = null) => {
    if (confirmText && typeof window !== 'undefined' && !window.confirm(confirmText)) {
      return;
    }
    setBusyAction(label);
    setBannerMsg(null);
    try {
      const res = await fetch('/api/bastion/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      if (payload.action === 'SET_MODE') {
        setBannerMsg({
          type: 'success',
          text: `Requested operating mode ${payload.mode}. Bastion Brain applies mode changes on its next 60s tick.`,
        });
      } else if (payload.action === 'SUBMIT_INTENT') {
        setBannerMsg({
          type: 'success',
          text: json.deduped
            ? `Intent ${json.intent?.intent_id} (${json.intent?.intent_type}) is already active in ${json.intent?.status} for Kingdom #${payload.kingdom_id}.`
            : `Submitted ${json.intent?.intent_type || 'SCAN_KINGDOM'} intent (${json.intent?.intent_id}) for Kingdom #${payload.kingdom_id}. Ring 1 (KENT) will triage on the next tick.`,
        });
      } else if (payload.action === 'SET_ACTIVE_BOT') {
        setBannerMsg({
          type: 'success',
          text: `Bound ${payload.bot_id} as the active bot on ${payload.instance_id}.`,
        });
      } else if (payload.action === 'SET_KINGDOM_CADENCE') {
        setBannerMsg({
          type: 'success',
          text: `Updated Kingdom #${payload.kingdom_id} scan cadence to ${payload.cadence_hours}h.`,
        });
      } else if (payload.action === 'APPROVE_HELD_PLAN') {
        setBannerMsg({
          type: 'success',
          text: `Approved held plan for ${payload.bot_id}. Ring 2 (TANK) will dispatch on the next 60s tick.`,
        });
      } else if (payload.action === 'SET_BRAIN_LEASE_OVERRIDE') {
        setBannerMsg({
          type: 'success',
          text:
            payload.forced_leader === 'AUTO'
              ? 'Brain leader selection set to AUTO (Priority Failover: Railway P1 -> SIDEKICK P2 -> MIXERV3 P3).'
              : `Pinned active Brain leader to ${payload.forced_leader}. Takes effect on the next 60s tick.`,
        });
      }
      await fetchBrain();
    } catch (err) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  if (!effectiveIsValheonFounder && !effectiveIsSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center font-mono p-8">
        <div className="p-6 rounded-2xl bg-[#0b0e17] border border-rose-500/40 max-w-md space-y-3">
          <Lock className="text-rose-400 mx-auto" size={36} />
          <div className="text-sm font-black text-white uppercase tracking-widest">
            SUPERADMIN / FOUNDER CLEARANCE REQUIRED
          </div>
          <p className="text-xs text-slate-400 font-sans">
            The Bastion Brain Autonomous Fleet Orchestrator is restricted exclusively to SuperAdmin and Principal Systems
            Architect clearance.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center font-mono">
        <RefreshCw className="animate-spin text-emerald-400 mb-3" size={32} />
        <div className="text-sm font-bold text-slate-200 tracking-widest uppercase">
          CONNECTING TO BASTION BRAIN (AWS DYNAMODB · US-EAST-2)...
        </div>
      </div>
    );
  }

  const hb = data?.heartbeat || null;
  const online = Boolean(hb?.ts && nowMs - new Date(hb.ts).getTime() < 180000);
  const requestedMode = data?.requestedMode?.mode || null;
  const effectiveMode = hb?.mode || requestedMode || 'SUPERVISED';
  const fleet = data?.fleet || {};
  const activeByInstance = fleet.active_by_instance || {};
  const config = data?.config || {};
  const capabilities = config.capabilities || [
    'probe_status',
    'grow_city',
    'sleep',
    'switch_character',
    'provision_character',
    'scan_kingdom',
  ];
  const watchedKingdoms = [...(config.watched_kingdoms || [])].sort(
    (a, b) => Number(a.kingdom_id || 0) - Number(b.kingdom_id || 0)
  );
  const bots = [...(data?.bots || [])].sort((a, b) => {
    if (a.instance_id !== b.instance_id) return String(a.instance_id).localeCompare(String(b.instance_id));
    return Number(b.verified_state?.power || 0) - Number(a.verified_state?.power || 0);
  });
  const botsById = Object.fromEntries(bots.map((b) => [b.bot_id, b]));
  const accountSlots = data?.accountSlots || [];
  const instancesMap = data?.instances || {};
  const botRuntimes = data?.botRuntimes || {};
  const kingdomRecords = data?.kingdomRecords || {};
  const intents = data?.intents || [];
  const allEvents = data?.events || [];
  const helpers = data?.helpers || [];
  const ringBudget = data?.ringBudget || {};
  const approvedPlans = data?.approvedPlans || [];
  const brainLease = data?.brainLease || null;
  const brainNodes = data?.brainNodes || {};
  const forcedLeader = brainLease?.forced_leader || 'AUTO';
  const activeLeaderNode = brainLease?.holder_id || hb?.node_id || 'railway-primary';

  const activeIntentsCount = intents.filter((i) =>
    ['PENDING', 'TRIAGED_BY_SCOUT', 'PLANNED_BY_TANK', 'IN_PROGRESS'].includes(i.status)
  ).length;
  const verifiedIntentsCount = intents.filter((i) => i.status === 'VERIFIED_BY_AUDIT').length;

  // Count events per actor in loaded window
  const actorEventCounts = {};
  allEvents.forEach((ev) => {
    actorEventCounts[ev.actor] = (actorEventCounts[ev.actor] || 0) + 1;
  });

  const severityOrder = ['INFO', 'NOTICE', 'WARN', 'CRITICAL'];
  const filteredEvents = allEvents.filter((ev) => {
    if (ringFilter !== 'ALL' && ev.ring !== ringFilter) return false;
    if (actorFilter !== 'ALL' && ev.actor !== actorFilter) return false;
    if (severityOrder.indexOf(ev.severity) < severityOrder.indexOf(severityFloor)) return false;
    return true;
  });

  const filteredBots = bots.filter((b) => instanceFilter === 'ALL' || b.instance_id === instanceFilter);
  const activeCount = bots.filter((b) => b.lifecycle_state === 'ACTIVE').length;
  const growingCount = bots.filter((b) => b.lifecycle_state === 'GROWING').length;
  const healthyAccounts = accountSlots.filter((a) => a.account_status === 'HEALTHY').length;

  return (
    <div className="space-y-6 pb-14 font-mono text-slate-200">
      {/* =====================================================================
          TOP COMMAND HEADER & OPERATING MODE CONTROL BAR
      ===================================================================== */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#101829] to-[#0b0e17] border border-emerald-500/35 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black tracking-widest uppercase">
                ◈ BASTION BRAIN v{hb?.version || '0.7.0-step7'} // SPEC-DRIVEN 3-RING MOE ORCHESTRATOR
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-black border flex items-center gap-1.5 ${
                  online
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {online
                  ? `BRAIN ONLINE (${activeLeaderNode.toUpperCase()}) · TICK #${hb?.tick || 1} (${ago(hb?.ts, nowMs)})`
                  : 'BRAIN HEARTBEAT STALE'}
              </span>
              <span className="px-2.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px]">
                HA FAILOVER LEASE: {activeLeaderNode.toUpperCase()} ({forcedLeader === 'AUTO' ? 'AUTO-PRIORITY' : `PINNED: ${forcedLeader}`})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center gap-3 pt-1">
              <Shield className="text-emerald-400 shrink-0" size={28} />
              <span>BASTION BRAIN AUTONOMOUS COMMAND & OVERSIGHT DECK</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl font-sans leading-relaxed">
              Contract-validated 3-Ring Mixture-of-Experts (<span className="text-cyan-300 font-semibold">Ring 1: SCOUT · KENT · NULL</span>,{' '}
              <span className="text-amber-300 font-semibold">Ring 2: TANK · BIG JON · NUMNUM · CIPHER</span>,{' '}
              <span className="text-pink-300 font-semibold">Ring 3: AUDIT · DOZER</span>) orchestrating{' '}
              <span className="text-emerald-300 font-semibold">SIDEKICK</span> MuMu instances via AWS SQS FIFO queues and S3 SHA-256 screenshot proof.
            </p>
          </div>

          {/* Live Fleet Telemetry Strip */}
          <div className="flex flex-wrap items-center gap-3 bg-[#06080d]/90 border border-slate-800 px-4 py-3 rounded-xl">
            <div className="text-center px-2">
              <div className="text-[10px] text-slate-500 uppercase">EFFECTIVE MODE</div>
              <div className="text-xs font-black text-emerald-400">{effectiveMode}</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">FLEET BOTS</div>
              <div className="text-xs font-black text-amber-300">
                {bots.length} ({activeCount} CH8+ · {growingCount} GROWING)
              </div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">ACCOUNT POOL</div>
              <div className="text-xs font-black text-cyan-300">{healthyAccounts}/3 HEALTHY (≤2/KD)</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">WATCHED KDS</div>
              <div className="text-xs font-black text-pink-300">{watchedKingdoms.length} KINGDOMS</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">CIPHER SKILLS</div>
              <div className="text-xs font-black text-purple-300">{capabilities.length} LIVE</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">R5 MISSIONS</div>
              <div className="text-xs font-black text-cyan-300">
                {verifiedIntentsCount} VERIFIED · {activeIntentsCount} ACTIVE
              </div>
            </div>
          </div>
        </div>

        {/* 7-Stage Build Architecture Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {[
            { step: 'STEP 1', label: 'Contracts & Schemas', detail: '4 JSON Schemas Live' },
            { step: 'STEP 2', label: 'AWS CloudFormation', detail: 'SQS FIFO + 4 DDB Tables' },
            { step: 'STEP 3', label: 'CIPHER v2 Executor', detail: 'CH8 Verified on SIDEKICK' },
            { step: 'STEP 4', label: '3-Ring Brain + NUMNUM', detail: '11-Rule Gate + Audit Log' },
            { step: 'STEP 5', label: 'Self-Heal & Twin Rule', detail: 'M0 ↔ M1 Convergence' },
            { step: 'STEP 6', label: 'Gemini Leaders + Helpers', detail: 'SUPERVISED + 6 Live Skills' },
            { step: 'STEP 7', label: 'R5 Mission Desk Intake', detail: '5-Stage Verified Loop' },
          ].map((s) => (
            <div
              key={s.step}
              className="px-2.5 py-2 rounded-xl bg-[#06080d]/90 border border-emerald-500/30 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[9px] font-black text-emerald-400">
                <span>{s.step}</span>
                <span>✓ LIVE</span>
              </div>
              <div className="text-[10px] font-bold text-white mt-0.5 truncate">{s.label}</div>
              <div className="text-[9px] text-slate-400 font-sans truncate">{s.detail}</div>
            </div>
          ))}
        </div>

        {/* High-Availability Brain Failover & Outage Continuity Bar (Railway P1 <-> SIDEKICK P2 <-> MIXERV3 P3) */}
        <div className="p-3.5 rounded-xl bg-[#06080d]/95 border border-purple-500/35 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider">
                🛡️ High-Availability Brain Failover Lease (`BRAIN_LEASE` · 180s Auto-Promotion)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                Leader: {activeLeaderNode}
              </span>
              {brainLease?.failover_count > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px]">
                  Failovers: {brainLease.failover_count}
                </span>
              )}
              {brainLease?.last_transition_reason && (
                <span className="text-[10px] text-slate-400 font-sans truncate max-w-md" title={brainLease.last_transition_reason}>
                  · {brainLease.last_transition_reason}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 mr-1">Leader Policy:</span>
              {[
                { key: 'AUTO', label: 'AUTO (P1→P2→P3)' },
                { key: 'sidekick', label: 'Pin SIDEKICK' },
                { key: 'mixerv3', label: 'Pin MIXERV3' },
                { key: 'railway-primary', label: 'Pin Railway' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={busyAction === `lease-${opt.key}`}
                  onClick={() =>
                    postBrainAction(
                      { action: 'SET_BRAIN_LEASE_OVERRIDE', forced_leader: opt.key },
                      `lease-${opt.key}`
                    )
                  }
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    forcedLeader === opt.key
                      ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                      : 'bg-[#0b101b] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px]">
            {[
              { id: 'railway-primary', title: 'railway-primary', subtitle: 'Cloud Primary (Priority 1)' },
              { id: 'sidekick', title: 'sidekick', subtitle: 'On-Prem Standby #1 (Priority 2)' },
              { id: 'mixerv3', title: 'mixerv3', subtitle: 'On-Prem Standby #2 (Priority 3)' },
            ].map((nodeDef) => {
              const n = brainNodes[nodeDef.id] || null;
              const seenMs = n?.last_seen_at ? nowMs - new Date(n.last_seen_at).getTime() : Infinity;
              const isFresh = seenMs < 180000;
              const isLeader = activeLeaderNode === nodeDef.id && isFresh;
              return (
                <div
                  key={nodeDef.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                    isLeader
                      ? 'bg-emerald-950/25 border-emerald-500/45'
                      : isFresh
                      ? 'bg-[#0b101b] border-cyan-500/35'
                      : 'bg-[#0b101b]/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-black text-white flex items-center gap-1.5">
                      <span>{nodeDef.title}</span>
                      <span className="text-[9px] text-slate-400 font-normal">({nodeDef.subtitle})</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-sans mt-0.5">
                      Last heartbeat: <span className="text-slate-200 font-mono">{ago(n?.last_seen_at, nowMs)}</span>
                      {n?.version ? ` · v${n.version}` : ''}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border text-[9px] font-black shrink-0 ${
                      isLeader
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : isFresh
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                        : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                    }`}
                  >
                    {isLeader ? '★ ACTIVE LEADER' : isFresh ? 'HOT STANDBY' : 'OFFLINE / OUTAGE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode Switcher + On-Demand Scan Intent Bar */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Operating Mode:</span>
              {MODES.map((m) => {
                const isSelected = (requestedMode || effectiveMode) === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    title={m.hint}
                    disabled={busyAction === `mode-${m.key}`}
                    onClick={() =>
                      postBrainAction(
                        { action: 'SET_MODE', mode: m.key },
                        `mode-${m.key}`,
                        m.key === 'SUPERVISED' || m.key === 'AUTONOMOUS'
                          ? `Switch Bastion Brain to ${m.key}? NUMNUM-approved jobs will dispatch to SIDEKICK emulators.`
                          : null
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected ? m.activeCls : `${m.cls} opacity-70 hover:opacity-100 bg-[#06080d]`
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={fetchBrain}
                className="p-2 rounded-xl bg-[#06080d] border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh Brain Telemetry"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              Effective mode on last tick: <span className="text-slate-200 font-bold font-mono">{effectiveMode}</span>
              {requestedMode && requestedMode !== effectiveMode && (
                <span className="text-amber-300 ml-2">
                  · Requested <span className="font-mono font-bold">{requestedMode}</span> (applies on next tick ≤60s)
                </span>
              )}
              {data?.requestedMode?.set_by && (
                <span className="ml-2">
                  · Last set by <span className="text-slate-300">{data.requestedMode.set_by}</span> ({ago(data.requestedMode.set_at, nowMs)})
                </span>
              )}
            </div>
          </div>

          {/* Submit R5 / Demand Intent to Ring 1 (KENT) */}
          <div className="flex flex-wrap items-center gap-2 bg-[#06080d] border border-cyan-500/30 p-2 rounded-xl">
            <span className="text-[10px] font-bold text-cyan-300 px-1.5 uppercase">Queue Mission (→ KENT):</span>
            <select
              value={scanIntentType}
              onChange={(e) => setScanIntentType(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-cyan-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="SCAN_KINGDOM">SCAN_KINGDOM</option>
              <option value="LOCATE_GOVERNOR">LOCATE_GOVERNOR</option>
              <option value="EXPAND_TO_KINGDOM">EXPAND_TO_KINGDOM</option>
              <option value="PRIORITIZE_GROWTH">PRIORITIZE_GROWTH</option>
            </select>

            <select
              value={scanSource}
              onChange={(e) => setScanSource(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="R5_COMMAND_DESK">R5_COMMAND_DESK</option>
              <option value="OPERATOR_OVERRIDE">OPERATOR_OVERRIDE</option>
              <option value="UNITY_API_DEMAND">UNITY_API_DEMAND</option>
              <option value="DATA_LEAD_INGEST">DATA_LEAD_INGEST</option>
            </select>

            {scanIntentType === 'EXPAND_TO_KINGDOM' ? (
              <input
                type="number"
                min={1000}
                max={9999}
                value={scanKingdom}
                onChange={(e) => setScanKingdom(e.target.value)}
                placeholder="4-digit KD"
                className="w-24 px-2.5 py-1 rounded-lg bg-[#0f1420] border border-amber-500/50 text-xs text-amber-200 font-bold focus:outline-none focus:border-cyan-400"
                title="Enter any 4-digit Kingdom ID (1000-9999) to expand Bastion coverage"
              />
            ) : (
              <select
                value={scanKingdom}
                onChange={(e) => setScanKingdom(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-amber-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {Array.from(
                  new Set([
                    ...watchedKingdoms.map((w) => String(w.kingdom_id)),
                    ...bots.map((b) => String(b.kingdom_id)),
                  ])
                )
                  .sort((a, b) => Number(a) - Number(b))
                  .map((kd) => (
                    <option key={kd} value={kd}>
                      Kingdom #{kd}
                    </option>
                  ))}
              </select>
            )}

            {scanIntentType === 'LOCATE_GOVERNOR' && (
              <input
                type="text"
                value={scanTargetGov}
                onChange={(e) => setScanTargetGov(e.target.value)}
                placeholder="Target Gov Name/ID"
                className="w-36 px-2.5 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            )}

            {(scanIntentType === 'SCAN_KINGDOM' || scanIntentType === 'LOCATE_GOVERNOR') && (
              <select
                value={scanRanks}
                onChange={(e) => setScanRanks(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="300">Top 300 Ranks</option>
                <option value="465">Top 465 (Core 3 Alliances)</option>
                <option value="650">Top 650 (KvK Sweet Spot)</option>
                <option value="1000">Top 1,000 (Full Census)</option>
              </select>
            )}

            <select
              value={scanPriority}
              onChange={(e) => setScanPriority(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="70">Priority 70 (Standard)</option>
              <option value="85">Priority 85 (R5 Urgent)</option>
              <option value="95">Priority 95 (Immediate Preempt)</option>
            </select>

            <button
              type="button"
              disabled={busyAction === 'submit-scan-intent'}
              onClick={() =>
                postBrainAction(
                  {
                    action: 'SUBMIT_INTENT',
                    intent_type: scanIntentType,
                    source: scanSource,
                    kingdom_id: Number(scanKingdom),
                    max_ranks: Number(scanRanks),
                    priority: Number(scanPriority),
                    ...(scanIntentType === 'LOCATE_GOVERNOR' && scanTargetGov.trim()
                      ? { target_governor_name: scanTargetGov.trim() }
                      : {}),
                  },
                  'submit-scan-intent'
                )
              }
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play size={12} />
              <span>Dispatch #{scanKingdom}</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {bannerMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              bannerMsg.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 font-sans">
              {bannerMsg.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              <span>{bannerMsg.text}</span>
            </div>
            <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          SECTION 1: LIVE SIDEKICK EMULATOR INSTANCES & ACTIVE BOT BINDINGS
      ===================================================================== */}
      <div className="p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Server size={15} />
              <span>SIDEKICK EMULATOR INSTANCES · SINGLE-FLIGHT LOCKS & HUMAN ROUTINE PROFILES</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Each MuMu Player instance on <span className="text-emerald-300 font-semibold">SIDEKICK</span> is permanently bound to a single Google account (`mumu-account-0..2`) and dispatches through its own SQS FIFO `MessageGroupId`.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Implemented CIPHER Skills: <span className="text-emerald-300 font-bold">{capabilities.join(' · ')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {['sidekick-mumu-0', 'sidekick-mumu-1', 'sidekick-mumu-2'].map((instId) => {
            const meta = INSTANCE_META[instId];
            const activeBotId = activeByInstance[instId] || null;
            const activeBot = activeBotId ? botsById[activeBotId] : null;
            const instCtrl = instancesMap[instId] || {};
            const inFlight = instCtrl.in_flight || null;
            const lastPlan = hb?.plans?.[instId] || '—';
            const instanceBots = bots.filter((b) => b.instance_id === instId);
            const rt = activeBotId ? botRuntimes[activeBotId] : null;
            const prof = activeBot?.routine_profile || null;
            const vs = activeBot?.verified_state || null;

            return (
              <div
                key={instId}
                className={`p-4 rounded-xl border space-y-3 ${
                  inFlight
                    ? 'bg-emerald-950/20 border-emerald-500/50'
                    : activeBot
                    ? 'bg-[#06080d] border-slate-800'
                    : 'bg-[#06080d]/60 border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-cyan-300">🖥️ {instId}</span>
                      <span className="text-[10px] text-slate-500">({meta.adb})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">{meta.label}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      inFlight
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                        : activeBot
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {inFlight ? `IN-FLIGHT: ${inFlight.job_type}` : `PLAN: ${lastPlan}`}
                  </span>
                </div>

                {/* Active Bot Selector for this Instance */}
                <div className="p-2.5 rounded-lg bg-[#0b101b] border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Bound Active Bot:</span>
                    {instanceBots.length > 0 ? (
                      <select
                        value={activeBotId || ''}
                        disabled={busyAction === `bind-${instId}`}
                        onChange={(e) =>
                          postBrainAction(
                            { action: 'SET_ACTIVE_BOT', instance_id: instId, bot_id: e.target.value },
                            `bind-${instId}`
                          )
                        }
                        className="bg-[#06080d] border border-slate-700 text-amber-200 text-[11px] font-bold px-2 py-1 rounded focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {instanceBots.map((b) => (
                          <option key={b.bot_id} value={b.bot_id}>
                            #{b.kingdom_id} · {b.governor_name} (CH{b.verified_state?.ch_level})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] text-slate-500">Standby (No bots provisioned)</span>
                    )}
                  </div>

                  {activeBot ? (
                    <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-800/70">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">
                          {activeBot.governor_name}{' '}
                          <span className="text-amber-300 font-mono">(#{activeBot.kingdom_id})</span>
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${
                            STATE_BADGE_CLS[activeBot.lifecycle_state] || ''
                          }`}
                        >
                          {activeBot.lifecycle_state}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-0.5">
                        <div className="bg-[#06080d] p-1.5 rounded border border-slate-800/80">
                          <div className="text-slate-500">VERIFIED CH</div>
                          <div className="font-bold text-emerald-300">CH {vs?.ch_level} → {prof?.target_ch_level}</div>
                        </div>
                        <div className="bg-[#06080d] p-1.5 rounded border border-slate-800/80">
                          <div className="text-slate-500">POWER</div>
                          <div className="font-bold text-cyan-300">{Number(vs?.power || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-[#06080d] p-1.5 rounded border border-slate-800/80">
                          <div className="text-slate-500">VERIFIED</div>
                          <div className="font-bold text-slate-300">{ago(vs?.last_verified_at, nowMs)}</div>
                        </div>
                      </div>

                      {prof && (
                        <div className="text-[10px] text-slate-400 font-sans flex flex-wrap items-center justify-between gap-1 pt-1">
                          <span>
                            🌙 Sleep: <strong className="text-slate-200">{prof.sleep_window_start_hour}:00–{prof.sleep_window_end_hour}:00</strong> EDT
                          </span>
                          <span>
                            ⏱️ Active Today:{' '}
                            <strong className="text-emerald-300">
                              {rt?.active_minutes_today ?? prof.active_minutes_today ?? 0}/{prof.daily_active_cap_minutes}m
                            </strong>
                          </span>
                        </div>
                      )}

                      {vs?.last_screenshot_uri && (
                        <div className="text-[9px] font-mono text-emerald-400/90 truncate pt-0.5" title={vs.last_screenshot_uri}>
                          📸 Proof: {vs.last_screenshot_uri.split('/').slice(-2).join('/')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-sans">
                      Instance powered off / reserve slot. Ready when mumu-account-2 is launched on SIDEKICK.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: THE 3-RING MOE ARCHITECTURE & HELPER REGISTRY
      ===================================================================== */}
      <div className="space-y-4">
        {RING_GROUPS.map((rg) => {
          const ringAgents = AGENT_DEFINITIONS.filter((a) => a.ringKey === rg.key);
          const defaultCap = rg.key === 'RING_1_INTEL' ? 30000 : rg.key === 'RING_2_OPS' ? 50000 : 40000;
          const rb = ringBudget[rg.key] || null;
          const activeRingHelpers = helpers.filter(
            (h) => (h.parent_ring === rg.key || h.ring === rg.key) && (h.status === 'ACTIVE' || h.status === 'RUNNING')
          );
          return (
            <div
              key={rg.key}
              className={`p-5 rounded-2xl bg-gradient-to-r ${rg.accent} border shadow-xl space-y-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${rg.badgeCls}`}>
                    {rg.badge}
                  </span>
                  <div className="text-xs text-slate-400 mt-1.5 font-sans">
                    Roster: <span className="text-slate-200 font-semibold">{rg.members}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[10px] text-slate-400 font-mono bg-[#06080d] border border-slate-800 px-3 py-1.5 rounded-xl">
                    Hourly Budget:{' '}
                    <span className="text-emerald-300 font-bold">
                      {Number(rb?.used ?? rb?.tokens_used_hour ?? 0).toLocaleString()} /{' '}
                      {Number(rb?.cap ?? rb?.hourly_cap ?? defaultCap).toLocaleString()} tok
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono bg-[#06080d] border border-slate-800 px-3 py-1.5 rounded-xl">
                    Bounded Helpers:{' '}
                    <span className="text-purple-300 font-bold">{activeRingHelpers.length}/3 Active</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono bg-[#06080d] border border-slate-800 px-3 py-1.5 rounded-xl">
                    Ring Leader: <span className="text-white font-black">{rg.leader}</span>
                  </div>
                </div>
              </div>

              {activeRingHelpers.length > 0 && (
                <div className="p-3 rounded-xl bg-[#06080d]/90 border border-purple-500/35 space-y-2">
                  <div className="text-[10px] font-mono font-bold text-purple-300 uppercase">
                    Active Bounded Helpers (`helpers.schema.json` · Max 3/Ring · Auto-Reaped on TTL)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {activeRingHelpers.map((h) => (
                      <div key={h.helper_id} className="p-2.5 rounded-lg bg-[#0b101b] border border-purple-500/30 text-[10px] space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-black text-purple-300">{h.template_id}</span>
                          <span className="text-emerald-300">
                            {Number(h.tokens_used_this_hour ?? h.tokens_used ?? 0).toLocaleString()}/
                            {Number(h.hourly_token_cap ?? h.max_tokens ?? 12000).toLocaleString()} tok · {h.model_tier || 'LLM'}
                          </span>
                        </div>
                        <div className="text-slate-300 font-sans truncate" title={h.scope?.objective || h.objective}>
                          {h.scope?.objective || h.objective}
                        </div>
                        <div className="text-slate-500 font-mono text-[9px]">
                          {h.helper_id} · spawned {ago(h.spawned_at, nowMs)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {ringAgents.map((ag) => {
                  const evCount = actorEventCounts[ag.actorKey] || 0;
                  return (
                    <div
                      key={ag.id}
                      onClick={() => setSelectedAgent(ag)}
                      className="p-3.5 rounded-xl bg-[#070a12]/90 border border-slate-800/90 hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{ag.icon}</span>
                            <span className="text-sm font-black tracking-wider" style={{ color: ag.color }}>
                              {ag.name}
                            </span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                            {ag.cadence}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-200 mt-1.5 font-sans">{ag.role}</div>
                        <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-3 font-sans leading-relaxed">
                          {ag.directive}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/70 space-y-1.5">
                        {ag.helpers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ag.helpers.map((h) => (
                              <span
                                key={h}
                                className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[9px] font-mono"
                              >
                                +{h}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>Events (48h): <strong className="text-emerald-300">{evCount}</strong></span>
                          <span className="text-emerald-400 group-hover:underline">Inspect Spec →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION 3: WATCHED KINGDOM CADENCE MATRIX & QUEUED INTENTS
      ===================================================================== */}
      <div className="p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={15} />
              <span>WATCHED KINGDOM CADENCE MATRIX (NULL STALENESS ENGINE) & ACTIVE INTENTS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Ring 1 (<span className="text-cyan-300 font-semibold">NULL</span>) compares each watched kingdom’s{' '}
              <span className="text-pink-300 font-semibold">AUDIT-verified</span> scan timestamp (`KINGDOM#&lt;id&gt;`) against its cadence (`3h Surge` vs `12h Steady`) and emits `SCAN_DUE` demands when stale.
            </p>
          </div>
          {intents.length > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
              {intents.length} Active Scan Intent(s) in Queue
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <th className="py-2.5 px-3">Kingdom</th>
                <th className="py-2.5 px-3">Stationed Bastion Bots</th>
                <th className="py-2.5 px-3">Cadence Mode</th>
                <th className="py-2.5 px-3">Last Verified Scan (AUDIT)</th>
                <th className="py-2.5 px-3">Staleness Status</th>
                <th className="py-2.5 px-3 text-right">Operator Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {watchedKingdoms.map((w) => {
                const kdId = Number(w.kingdom_id);
                const cadenceH = Number(w.cadence_hours || 12);
                const isSurge = cadenceH <= 3;
                const kdRec = kingdomRecords[String(kdId)] || {};
                const lastIso = kdRec.last_scan_verified_at || null;
                const ageHours = lastIso ? (nowMs - new Date(lastIso).getTime()) / 3600000 : null;
                const isDue = ageHours === null || ageHours >= cadenceH;
                const stationedBots = bots.filter((b) => Number(b.kingdom_id) === kdId);
                const hasM0 = stationedBots.some((b) => b.instance_id === 'sidekick-mumu-0');
                const hasM1 = stationedBots.some((b) => b.instance_id === 'sidekick-mumu-1');
                const isConverged = hasM0 && hasM1;
                const hasActiveCh8 = stationedBots.some((b) => b.lifecycle_state === 'ACTIVE');
                const hasGrowing = stationedBots.some((b) => b.lifecycle_state === 'GROWING');

                return (
                  <tr key={kdId} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-white text-sm">#{kdId}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                            isConverged
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 font-bold'
                              : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                          }`}
                        >
                          {isConverged ? 'M0+M1 ✓' : '1x INST · TWIN QUEUED'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">{w.source || 'Watched Kingdom'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1.5">
                        {stationedBots.map((b) => (
                          <span
                            key={b.bot_id}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200"
                          >
                            {b.governor_name} <span className="text-emerald-300">CH{b.verified_state?.ch_level}</span>{' '}
                            <span className="text-slate-400">({b.instance_id.replace('sidekick-', '')})</span>
                          </span>
                        ))}
                        {stationedBots.length === 0 && (
                          <span className="text-[10px] text-rose-300">No bot stationed</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          isSurge
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {isSurge ? `SURGE (${cadenceH}h)` : `STEADY (${cadenceH}h)`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-200 font-bold text-[11px]">{ago(lastIso, nowMs)}</span>
                        {kdRec.governors_extracted != null && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-mono font-bold">
                            ✓ {kdRec.governors_extracted} govs
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {lastIso || 'Never AUDIT-verified'}
                        {kdRec.verified_by_bot ? ` · ${kdRec.verified_by_bot}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isDue
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isDue ? 'SCAN_DUE (Signaled by NULL)' : 'FRESH (Within Cadence)'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {!hasActiveCh8 && hasGrowing && (
                          <button
                            type="button"
                            disabled={busyAction === `growth-${kdId}`}
                            onClick={() =>
                              postBrainAction(
                                {
                                  action: 'SUBMIT_INTENT',
                                  intent_type: 'PRIORITIZE_GROWTH',
                                  source: 'OPERATOR_OVERRIDE',
                                  kingdom_id: kdId,
                                  priority: 88,
                                },
                                `growth-${kdId}`
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-lime-500/20 hover:bg-lime-500/35 border border-lime-500/40 text-lime-200 font-bold text-[10px] cursor-pointer"
                            title="Prioritize CH8 growth for stationed governor"
                          >
                            ⚡ Boost CH8
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyAction === `cadence-${kdId}`}
                          onClick={() =>
                            postBrainAction(
                              {
                                action: 'SET_KINGDOM_CADENCE',
                                kingdom_id: kdId,
                                cadence_hours: isSurge ? 12 : 3,
                              },
                              `cadence-${kdId}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-200 cursor-pointer"
                        >
                          {isSurge ? 'Set 12h Steady' : 'Promote 3h Surge'}
                        </button>
                        <button
                          type="button"
                          disabled={busyAction === `intent-${kdId}`}
                          onClick={() =>
                            postBrainAction(
                              {
                                action: 'SUBMIT_INTENT',
                                intent_type: 'SCAN_KINGDOM',
                                source: 'OPERATOR_OVERRIDE',
                                kingdom_id: kdId,
                                max_ranks: 650,
                                priority: 85,
                              },
                              `intent-${kdId}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 font-bold text-[10px] cursor-pointer"
                        >
                          Queue Scan Intent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Step 7: R5 & Unity Demand Intake Mission Pipeline (PENDING -> TRIAGED -> PLANNED -> IN_PROGRESS -> VERIFIED_BY_AUDIT) */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">
              Step 7 // R5 Command Desk & Unity Demand Intake Pipeline (`BastionIntents` · End-to-End Verification)
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              5-Stage Loop: <span className="text-slate-200">PENDING → TRIAGED_BY_SCOUT → PLANNED_BY_TANK → IN_PROGRESS → VERIFIED_BY_AUDIT</span>
            </div>
          </div>

          {intents.length === 0 ? (
            <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800 text-xs text-slate-500 font-sans">
              No R5 or Unity demand intents in history yet. Submit a mission above or from the R5 Kingdom Workbench (`/[locale]/analysis/kingdom`).
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#06080d]/90">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-black/40">
                    <th className="py-2 px-3">Age</th>
                    <th className="py-2 px-3">Kingdom</th>
                    <th className="py-2 px-3">Mission Type</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Priority</th>
                    <th className="py-2 px-3">Pipeline Stage</th>
                    <th className="py-2 px-3">AUDIT Verification & Execution Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {intents.slice(0, 15).map((it) => {
                    const rm = it.result_meta || {};
                    const pl = it.payload || {};
                    return (
                      <tr key={it.intent_id} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3 text-slate-400">{ago(it.created_at, nowMs)}</td>
                        <td className="py-2 px-3 font-black text-amber-300">#{it.kingdom_id}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                            {it.intent_type}
                          </span>
                          {pl.max_ranks && <span className="text-[10px] text-slate-400 ml-1.5">Top {pl.max_ranks}</span>}
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-300">{it.source}</td>
                        <td className="py-2 px-3 font-bold text-slate-200">{it.priority}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              it.status === 'VERIFIED_BY_AUDIT'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : it.status === 'IN_PROGRESS'
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 animate-pulse'
                                : it.status === 'FAILED' || it.status === 'REJECTED'
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {it.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-300 font-sans">
                          <div className="flex flex-wrap items-center gap-2">
                            {rm.instance_id && <span className="font-mono text-slate-400">{rm.instance_id}</span>}
                            {rm.governor_name && <span className="text-amber-200 font-semibold">{rm.governor_name}</span>}
                            {rm.governors_extracted != null && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono font-bold">
                                ✓ {rm.governors_extracted} govs synced
                              </span>
                            )}
                            {rm.verified_by_job && <span className="font-mono text-slate-500">{rm.verified_by_job}</span>}
                            {rm.screenshot_uri && (
                              <span className="font-mono text-emerald-400 truncate max-w-[14rem]" title={rm.screenshot_uri}>
                                📸 {rm.screenshot_uri.split('/').slice(-2).join('/')}
                              </span>
                            )}
                            {rm.rejected_reason && <span className="text-rose-300">{rm.rejected_reason}</span>}
                            {!rm.instance_id && !rm.verified_by_job && !rm.rejected_reason && (
                              <span className="text-slate-500">Awaiting Ring 1/2 scheduling ({it.intent_id})</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          SECTION 4: GOOGLE ACCOUNT SLOT POOL & 15-BOT PROVISIONED FLEET
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 5 cols: Google Account Slot Pool & Cross-Instance Convergence */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={15} />
                <span>GOOGLE ACCOUNT SLOT POOL (≤ 2 CHARS / KINGDOM)</span>
              </div>
              <span className="text-[10px] text-emerald-300 font-mono">NUMNUM + Twin Rule Enforced</span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Rise of Kingdoms permits at most 2 characters per kingdom per Google account (`ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM`), and `CROSS_INSTANCE_REDUNDANCY` ensures every active kingdom on `sidekick-mumu-0` also has a twin governor on `sidekick-mumu-1` (and vice versa) for convergence and failover.
            </p>

            {/* Cross-Instance Convergence Matrix (sidekick-mumu-0 <-> sidekick-mumu-1) */}
            {(() => {
              const slotM0 = accountSlots.find((s) => s.instance_id === 'sidekick-mumu-0')?.kingdom_slots || {};
              const slotM1 = accountSlots.find((s) => s.instance_id === 'sidekick-mumu-1')?.kingdom_slots || {};
              const activeKds = Array.from(
                new Set([
                  ...watchedKingdoms.map((w) => String(w.kingdom_id)),
                  ...Object.keys(slotM0).filter((k) => Number(k) >= 4000),
                  ...Object.keys(slotM1).filter((k) => Number(k) >= 4000),
                ])
              ).sort((a, b) => Number(a) - Number(b));
              const convergedCount = activeKds.filter((k) => (slotM0[k]?.length || 0) > 0 && (slotM1[k]?.length || 0) > 0).length;
              return (
                <div className="p-3 rounded-xl bg-[#06080d] border border-cyan-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                      Cross-Instance Twin Convergence (`mumu-0` ↔ `mumu-1`)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      {convergedCount}/{activeKds.length} Converged
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {activeKds.map((kd) => {
                      const hasM0 = (slotM0[kd]?.length || 0) > 0;
                      const hasM1 = (slotM1[kd]?.length || 0) > 0;
                      const converged = hasM0 && hasM1;
                      const missingInst = !hasM0 ? 'mumu-0' : !hasM1 ? 'mumu-1' : null;
                      return (
                        <div
                          key={kd}
                          className={`px-2 py-1.5 rounded border text-[10px] flex items-center justify-between ${
                            converged
                              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                              : 'bg-cyan-500/10 border-cyan-500/25 text-slate-200'
                          }`}
                        >
                          <span className="font-bold">#{kd}</span>
                          <span className={`text-[9px] font-mono ${converged ? 'text-emerald-300 font-bold' : 'text-cyan-300'}`}>
                            {converged ? 'M0+M1 ✓' : `+${missingInst} twin`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3">
              {accountSlots.map((slot) => {
                const kdEntries = Object.entries(slot.kingdom_slots || {}).sort(
                  (a, b) => Number(a[0]) - Number(b[0])
                );
                const peerInst =
                  slot.instance_id === 'sidekick-mumu-0'
                    ? 'sidekick-mumu-1'
                    : slot.instance_id === 'sidekick-mumu-1'
                    ? 'sidekick-mumu-0'
                    : null;
                const peerSlots = peerInst
                  ? accountSlots.find((s) => s.instance_id === peerInst)?.kingdom_slots || {}
                  : {};
                const totalChars = kdEntries.reduce((acc, [, arr]) => acc + (arr?.length || 0), 0);
                return (
                  <div key={slot.account_id} className="p-3.5 rounded-xl bg-[#06080d] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-white">{slot.account_id}</span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          ({slot.instance_id} · {slot.adb_serial})
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          slot.account_status === 'HEALTHY'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {slot.account_status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-sans">
                      Occupied Kingdom Slots: <strong className="text-slate-200">{kdEntries.length} Kingdoms</strong> ·{' '}
                      <strong className="text-cyan-300">{totalChars} Characters</strong> (Max {slot.max_slots_per_kingdom}/kingdom)
                    </div>

                    {kdEntries.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {kdEntries.map(([kd, botIdList]) => {
                          const count = (botIdList || []).length;
                          const full = count >= slot.max_slots_per_kingdom;
                          const hasPeerTwin = (peerSlots[kd]?.length || 0) > 0;
                          return (
                            <div
                              key={kd}
                              className={`p-2 rounded border text-[10px] ${
                                full
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                  : 'bg-[#0b101b] border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>#{kd}</span>
                                <div className="flex items-center gap-1">
                                  {peerInst && Number(kd) >= 4000 && (
                                    <span
                                      className={`px-1 rounded text-[8px] font-mono ${
                                        hasPeerTwin
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-cyan-500/20 text-cyan-300'
                                      }`}
                                      title={
                                        hasPeerTwin
                                          ? `Converged: ${peerInst} also has a governor in #${kd}`
                                          : `Twin queued on ${peerInst} via CROSS_INSTANCE_REDUNDANCY`
                                      }
                                    >
                                      {hasPeerTwin ? '2xINST' : '1xINST'}
                                    </span>
                                  )}
                                  <span className={full ? 'text-amber-300' : 'text-emerald-300'}>
                                    {count}/{slot.max_slots_per_kingdom}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                                {(botIdList || []).map((id) => botsById[id]?.governor_name || id).join(', ')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">0 slots occupied (all kingdoms 0/2 open)</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* COOP & Red-Team Fleet Continuity Summary Card at bottom of Left Column */}
          <div className="p-3.5 rounded-xl bg-[#06080d] border border-purple-500/30 space-y-1.5 text-[10px] font-sans">
            <div className="font-mono font-black text-purple-300 uppercase flex items-center justify-between">
              <span>🛡️ COOP & Red-Team Fleet Continuity</span>
              <span className="text-emerald-300">ACTIVE</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every active kingdom maintains staggered sleep windows across <code className="text-slate-200">sidekick-mumu-0</code> (`2:00–9:00 EDT`) and <code className="text-slate-200">sidekick-mumu-1</code> (`4:00–11:00 EDT`) so at least one governor is awake for urgent R5 scans while `AUDIT` + `TANK` self-heal any lost slot.
            </p>
          </div>
        </div>

        {/* Right 7 cols: Full-Height 15-Bot Provisioned Fleet (Extended All the Way Down) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <Bot size={15} />
                  <span>BASTION BOTS FLEET ({filteredBots.length} OF {bots.length} GOVERNORS)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Full governor roster across all instances (`BastionBots` · Solely mutated by Ring 3 `AUDIT` with S3 SHA-256 proof).
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'sidekick-mumu-0', 'sidekick-mumu-1', 'sidekick-mumu-2'].map((f) => {
                  const count = f === 'ALL' ? bots.length : bots.filter((b) => b.instance_id === f).length;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setInstanceFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        instanceFilter === f
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-[#06080d] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'ALL' ? `All (${count})` : `${f.replace('sidekick-', '')} (${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 flex-1">
              {filteredBots.map((b) => {
                const isActiveOnInstance = activeByInstance[b.instance_id] === b.bot_id;
                const vs = b.verified_state || {};
                const prof = b.routine_profile || {};
                const peerInst =
                  b.instance_id === 'sidekick-mumu-0'
                    ? 'sidekick-mumu-1'
                    : b.instance_id === 'sidekick-mumu-1'
                    ? 'sidekick-mumu-0'
                    : null;
                const peerBot = peerInst
                  ? bots.find(
                      (other) =>
                        other.instance_id === peerInst &&
                        Number(other.kingdom_id) === Number(b.kingdom_id) &&
                        other.lifecycle_state !== 'RETIRED'
                    )
                  : null;
                return (
                  <div
                    key={b.bot_id}
                    className={`p-3 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                      isActiveOnInstance
                        ? 'bg-emerald-950/20 border-emerald-500/45'
                        : 'bg-[#06080d] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                          #{b.kingdom_id}
                        </span>
                        <span className="text-xs font-bold text-white">{b.governor_name}</span>
                        {b.governor_id && <span className="text-[10px] text-slate-400">ID: {b.governor_id}</span>}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold">
                          CH{vs.ch_level}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-black ${
                            STATE_BADGE_CLS[b.lifecycle_state] || ''
                          }`}
                        >
                          {b.lifecycle_state}
                        </span>
                        {peerInst && Number(b.kingdom_id) >= 4000 && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${
                              peerBot
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                : 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300'
                            }`}
                            title={
                              peerBot
                                ? `Twin on ${peerInst}: ${peerBot.governor_name} (CH${peerBot.verified_state?.ch_level})`
                                : `Twin governor queued on ${peerInst} via CROSS_INSTANCE_REDUNDANCY`
                            }
                          >
                            {peerBot ? `✓ Twin on ${peerInst.replace('sidekick-', '')}` : `+ Twin queued (${peerInst.replace('sidekick-', '')})`}
                          </span>
                        )}
                        {isActiveOnInstance && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black">
                            ★ ACTIVE ON {b.instance_id.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans flex flex-wrap items-center gap-3">
                        <span>Instance: <strong className="text-slate-200 font-mono">{b.instance_id}</strong></span>
                        <span>Slot: <strong className="text-slate-200">{b.character_slot}/2</strong></span>
                        <span>Power: <strong className="text-cyan-300 font-mono">{Number(vs.power || 0).toLocaleString()}</strong></span>
                        <span>Sleep: <strong className="text-slate-300">{prof.sleep_window_start_hour}:00–{prof.sleep_window_end_hour}:00 EDT</strong></span>
                        <span>Verified: <strong className="text-slate-300">{ago(vs.last_verified_at, nowMs)}</strong></span>
                        {vs.last_screenshot_uri && (
                          <span className="text-emerald-400/90 font-mono" title={vs.last_screenshot_uri}>
                            📸 Proof Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {b.lifecycle_state === 'GROWING' && Number(b.kingdom_id) >= 4000 && (
                        <button
                          type="button"
                          disabled={busyAction === `bot-grow-${b.bot_id}`}
                          onClick={() =>
                            postBrainAction(
                              {
                                action: 'SUBMIT_INTENT',
                                intent_type: 'PRIORITIZE_GROWTH',
                                source: 'OPERATOR_OVERRIDE',
                                kingdom_id: Number(b.kingdom_id),
                                priority: 88,
                              },
                              `bot-grow-${b.bot_id}`
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-lime-500/15 hover:bg-lime-500/30 border border-lime-500/40 text-lime-200 text-[10px] font-bold cursor-pointer"
                          title={`Queue PRIORITIZE_GROWTH mission for #${b.kingdom_id}`}
                        >
                          ⚡ Boost CH8
                        </button>
                      )}
                      {b.lifecycle_state === 'ACTIVE' && Number(b.kingdom_id) >= 4000 && (
                        <button
                          type="button"
                          disabled={busyAction === `bot-scan-${b.bot_id}`}
                          onClick={() =>
                            postBrainAction(
                              {
                                action: 'SUBMIT_INTENT',
                                intent_type: 'SCAN_KINGDOM',
                                source: 'OPERATOR_OVERRIDE',
                                kingdom_id: Number(b.kingdom_id),
                                max_ranks: 650,
                                priority: 85,
                              },
                              `bot-scan-${b.bot_id}`
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold cursor-pointer"
                          title={`Queue SCAN_KINGDOM mission for #${b.kingdom_id}`}
                        >
                          📡 Scan #{b.kingdom_id}
                        </button>
                      )}
                      {!isActiveOnInstance && (
                        <button
                          type="button"
                          disabled={busyAction === `set-active-${b.bot_id}`}
                          onClick={() =>
                            postBrainAction(
                              { action: 'SET_ACTIVE_BOT', instance_id: b.instance_id, bot_id: b.bot_id },
                              `set-active-${b.bot_id}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRightLeft size={11} />
                          <span>Bind Active</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 5: DETAILED DECISION AUDIT LOG (BASTIONEVENTS)
      ===================================================================== */}
      <div className="p-5 rounded-2xl bg-[#0b0e17] border border-emerald-500/30 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Terminal size={15} />
              <span>BASTION BRAIN DECISION AUDIT LOG (`BastionEvents` · NEWEST FIRST)</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Every Ring 1 signal, Ring 2 plan proposal, `NUMNUM` 11-rule evaluation, `CIPHER` execution result, and Ring 3 `AUDIT` verification is permanently logged with a mandatory `oversight` block (`why`, `trigger_inputs`, `numnum_checks`, `evidence_refs`). Click any row to expand.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ringFilter}
              onChange={(e) => setRingFilter(e.target.value)}
              className="bg-[#06080d] border border-slate-700 rounded-lg text-[10px] px-2.5 py-1.5 text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Rings</option>
              <option value="RING_1_INTEL">Ring 1 (Intel)</option>
              <option value="RING_2_OPS">Ring 2 (Ops & Gate)</option>
              <option value="RING_3_AUDIT">Ring 3 (Audit)</option>
              <option value="SYSTEM">System / Mode</option>
            </select>

            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="bg-[#06080d] border border-slate-700 rounded-lg text-[10px] px-2.5 py-1.5 text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Actors</option>
              {Array.from(
                new Set([
                  'SCOUT',
                  'KENT',
                  'NULL',
                  'TANK',
                  'BIG_JON',
                  'NUMNUM',
                  'CIPHER',
                  'AUDIT',
                  'DOZER',
                  'OPERATOR',
                  ...Object.keys(actorEventCounts).filter((k) => k.startsWith('HELPER:')),
                ])
              ).map((act) => (
                <option key={act} value={act}>
                  {act} ({actorEventCounts[act] || 0})
                </option>
              ))}
            </select>

            <select
              value={severityFloor}
              onChange={(e) => setSeverityFloor(e.target.value)}
              className="bg-[#06080d] border border-slate-700 rounded-lg text-[10px] px-2.5 py-1.5 text-slate-200 cursor-pointer"
            >
              {severityOrder.map((s) => (
                <option key={s} value={s}>
                  Severity: {s}+
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-slate-800 bg-[#06080d]/90">
          {filteredEvents.map((ev) => (
            <EventAuditRow
              key={ev.event_id}
              ev={ev}
              nowMs={nowMs}
              approvedPlans={approvedPlans}
              busyAction={busyAction}
              onApprovePlan={(botId) =>
                postBrainAction(
                  { action: 'APPROVE_HELD_PLAN', bot_id: botId },
                  `approve-${botId}`,
                  `Approve held plan for ${botId} to dispatch on the next 60s tick?`
                )
              }
            />
          ))}
          {filteredEvents.length === 0 && (
            <div className="p-4 text-xs text-slate-500 text-center font-sans">
              No oversight events match the current filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Agent Inspection Modal */}
      {selectedAgent && (
        <div
          onClick={() => setSelectedAgent(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedAgent.icon}</span>
                <div>
                  <div className="text-lg font-black text-white">{selectedAgent.name}</div>
                  <div className="text-xs text-slate-400 font-sans">{selectedAgent.role}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06080d] border border-slate-800 space-y-2 text-xs font-sans">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                Contract Directive & Role in Ring
              </div>
              <p className="text-slate-300 leading-relaxed">{selectedAgent.directive}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500">CADENCE</div>
                <div className="font-bold text-cyan-300 mt-0.5">{selectedAgent.cadence}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500">EXECUTION ENGINE</div>
                <div className="font-bold text-amber-300 mt-0.5">{selectedAgent.defaultModelType}</div>
              </div>
            </div>

            {selectedAgent.helpers?.length > 0 && (
              <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800 text-xs">
                <div className="text-[10px] text-slate-500">BOUNDED HELPER TEMPLATES (`helpers.schema.json`)</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedAgent.helpers.map((h) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800 text-xs">
              <div className="text-[10px] text-slate-500">CONTRACT OUTPUTS</div>
              <div className="text-slate-200 mt-0.5">{selectedAgent.output}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
