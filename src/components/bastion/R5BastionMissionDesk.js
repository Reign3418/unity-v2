'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Play, RefreshCw, CheckCircle2, AlertTriangle, X, Bot, Crosshair, PlusCircle, Zap } from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'PENDING', label: '1. KENT Intake' },
  { key: 'TRIAGED_BY_SCOUT', label: '2. SCOUT Triage' },
  { key: 'PLANNED_BY_TANK', label: '3. TANK / NUMNUM' },
  { key: 'IN_PROGRESS', label: '4. CIPHER Exec' },
  { key: 'VERIFIED_BY_AUDIT', label: '5. AUDIT Verified' },
];

const STATUS_INDEX = {
  PENDING: 0,
  TRIAGED_BY_SCOUT: 1,
  PLANNED_BY_TANK: 2,
  IN_PROGRESS: 3,
  VERIFIED_BY_AUDIT: 4,
};

function ago(iso) {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${(s / 3600).toFixed(1)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function R5BastionMissionDesk({ kingdomId, onMissionVerified }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [banner, setBanner] = useState(null);

  // Mission form controls
  const [intentType, setIntentType] = useState('SCAN_KINGDOM');
  const [maxRanks, setMaxRanks] = useState('1000');
  const [priority, setPriority] = useState('85');
  const [targetGovName, setTargetGovName] = useState('');
  const [targetGovId, setTargetGovId] = useState('');

  const kdNum = Number(kingdomId);
  const validKd = Number.isInteger(kdNum) && kdNum >= 1000 && kdNum <= 9999;

  const fetchStatus = useCallback(async () => {
    if (!validKd) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bastion/intents?kingdomId=${kdNum}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setData((prev) => {
        const prevVerified = prev?.kingdomRecord?.last_scan_verified_at;
        const nextVerified = json?.kingdomRecord?.last_scan_verified_at;
        if (prevVerified && nextVerified && prevVerified !== nextVerified && onMissionVerified) {
          onMissionVerified(json);
        }
        return json;
      });
    } catch {
      /* ignore background poll errors */
    } finally {
      setLoading(false);
    }
  }, [kdNum, validKd, onMissionVerified]);

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, open ? 10000 : 30000);
    return () => clearInterval(iv);
  }, [fetchStatus, open]);

  if (!validKd) return null;

  const submitIntent = async (overridePayload = null) => {
    setBusy('submit');
    setBanner(null);
    try {
      const payload = overridePayload || {
        kingdom_id: kdNum,
        intent_type: intentType,
        max_ranks: Number(maxRanks),
        priority: Number(priority),
        source: 'R5_COMMAND_DESK',
        ...(intentType === 'LOCATE_GOVERNOR'
          ? { target_governor_name: targetGovName, target_governor_id: targetGovId }
          : {}),
      };
      const res = await fetch('/api/bastion/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBanner({
        type: 'success',
        text: json.deduped
          ? `Mission ${json.intent?.intent_id} (${json.intent?.intent_type}) is already active in ${json.intent?.status}.`
          : `Queued ${json.intent?.intent_type} mission (${json.intent?.intent_id}) for Kingdom #${kdNum}. Ring 1 (KENT) will triage on the next 60s tick.`,
      });
      await fetchStatus();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const intents = data?.intents || [];
  const activeIntent = intents.find((i) =>
    ['PENDING', 'TRIAGED_BY_SCOUT', 'PLANNED_BY_TANK', 'IN_PROGRESS'].includes(i.status)
  );
  const lastVerifiedAt = data?.kingdomRecord?.last_scan_verified_at || null;
  const stationedBots = data?.stationedBots || [];
  const hasActiveBot = stationedBots.some((b) => b.lifecycle_state === 'ACTIVE');
  const hasGrowingBot = stationedBots.some((b) => b.lifecycle_state === 'GROWING');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open R5 Bastion Autonomous Mission Desk (Step 7 Intake & Verified Feedback)"
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-mono font-bold border transition-all shadow-md shrink-0 cursor-pointer ${
          activeIntent
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 animate-pulse'
            : lastVerifiedAt
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
            : 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
        }`}
      >
        <Shield size={13} className="shrink-0" />
        <span>
          {activeIntent
            ? `📡 MISSION: ${activeIntent.status}`
            : lastVerifiedAt
            ? `✓ AUDIT VERIFIED (${ago(lastVerifiedAt)})`
            : `🤖 R5 BASTION DESK (#${kdNum})`}
        </span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e17] border border-cyan-500/40 rounded-2xl p-5 max-w-2xl w-full shadow-2xl space-y-4 text-slate-200 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase">
                    STEP 7 // R5 COMMAND DESK & VERIFIED MISSION INTAKE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      data?.brainOnline
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {data?.brainOnline ? `BRAIN ONLINE (${data?.effectiveMode})` : 'BRAIN STANDBY'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                  <Shield size={18} className="text-cyan-400" />
                  <span>KINGDOM #{kdNum} AUTONOMOUS MISSION DESK</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Dispatch R5 missions directly into <strong className="text-cyan-300">Ring 1 (KENT · SCOUT)</strong>. Every mission is safety-gated by <strong className="text-purple-300">NUMNUM</strong>, executed on <strong className="text-emerald-300">SIDEKICK</strong> by <strong className="text-emerald-300">CIPHER</strong>, and verified by <strong className="text-pink-300">Ring 3 (DOZER · AUDIT)</strong> with SHA-256 S3 proof.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Kingdom Stationed Bots & Verified Status Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">LAST AUDIT-VERIFIED SCAN</div>
                <div className="font-black text-emerald-300 mt-0.5">{ago(lastVerifiedAt)}</div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  {data?.kingdomRecord?.governors_extracted
                    ? `${data.kingdomRecord.governors_extracted} governors verified`
                    : lastVerifiedAt || 'No verified scan yet'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">STATIONED BASTION BOTS</div>
                <div className="font-black text-amber-300 mt-0.5">
                  {stationedBots.length} Governor(s) in #{kdNum}
                </div>
                <div className="text-[10px] text-slate-400 font-sans truncate mt-0.5">
                  {stationedBots.length > 0
                    ? stationedBots
                        .map((b) => `${b.governor_name} (CH${b.verified_state?.ch_level} · ${b.instance_id.replace('sidekick-', '')})`)
                        .join(', ')
                    : 'No bot stationed yet — request deployment below'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">NULL CADENCE SCHEDULE</div>
                <div className="font-black text-cyan-300 mt-0.5">
                  {data?.cadence ? `Every ${data.cadence.cadence_hours}h` : 'On-Demand R5 Mode'}
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  {data?.cadence?.source || 'Submit SCAN_KINGDOM anytime'}
                </div>
              </div>
            </div>

            {/* Quick Action Presets if no bot or growing bot */}
            {stationedBots.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-sans text-amber-200">
                  <strong>No Bastion Governor stationed in #{kdNum} yet.</strong> Request autonomous character provisioning (`EXPAND_TO_KINGDOM`) on `SIDEKICK`.
                </div>
                <button
                  type="button"
                  disabled={busy === 'submit'}
                  onClick={() =>
                    submitIntent({
                      kingdom_id: kdNum,
                      intent_type: 'EXPAND_TO_KINGDOM',
                      priority: 90,
                      cadence_hours: 12,
                      source: 'R5_COMMAND_DESK',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle size={13} />
                  <span>Deploy Bastion Bot to #{kdNum}</span>
                </button>
              </div>
            )}

            {!hasActiveBot && hasGrowingBot && (
              <div className="p-3 rounded-xl bg-lime-500/10 border border-lime-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-sans text-lime-200">
                  <strong>Stationed bot in #{kdNum} is GROWING toward CH8.</strong> Boost growth priority (`PRIORITIZE_GROWTH`) to accelerate CH8 unlock.
                </div>
                <button
                  type="button"
                  disabled={busy === 'submit'}
                  onClick={() =>
                    submitIntent({
                      kingdom_id: kdNum,
                      intent_type: 'PRIORITIZE_GROWTH',
                      priority: 88,
                      max_steps: 50,
                      source: 'R5_COMMAND_DESK',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap size={13} />
                  <span>Prioritize CH8 Growth</span>
                </button>
              </div>
            )}

            {/* Dispatch Mission Form */}
            <div className="p-3.5 rounded-xl bg-[#06080d] border border-cyan-500/30 space-y-3">
              <div className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                Queue New R5 Mission (`BastionIntents` → Ring 1 `KENT`)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Mission Type</label>
                  <select
                    value={intentType}
                    onChange={(e) => setIntentType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f1420] border border-slate-700 text-white font-bold text-xs"
                  >
                    <option value="SCAN_KINGDOM">SCAN_KINGDOM (Leaderboard Census)</option>
                    <option value="LOCATE_GOVERNOR">LOCATE_GOVERNOR (Target Refresh)</option>
                    <option value="EXPAND_TO_KINGDOM">EXPAND_TO_KINGDOM (Provision Bot)</option>
                    <option value="PRIORITIZE_GROWTH">PRIORITIZE_GROWTH (Boost CH8)</option>
                  </select>
                </div>

                {(intentType === 'SCAN_KINGDOM' || intentType === 'LOCATE_GOVERNOR') && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Leaderboard Depth</label>
                    <select
                      value={maxRanks}
                      onChange={(e) => setMaxRanks(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f1420] border border-slate-700 text-slate-200 text-xs"
                    >
                      <option value="300">Top 300 Governors</option>
                      <option value="465">Top 465 (Core 3 Alliances)</option>
                      <option value="650">Top 650 (KvK Sweet Spot)</option>
                      <option value="1000">Top 1,000 (Full Census)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">BIG JON Preemption Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f1420] border border-slate-700 text-slate-200 text-xs"
                  >
                    <option value="75">75 — Standard R5 Request</option>
                    <option value="85">85 — R5 Urgent Preempt</option>
                    <option value="95">95 — KvK War Room Immediate</option>
                  </select>
                </div>
              </div>

              {intentType === 'LOCATE_GOVERNOR' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <input
                    type="text"
                    placeholder="Target Governor Name (optional)"
                    value={targetGovName}
                    onChange={(e) => setTargetGovName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0f1420] border border-slate-700 text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Target Governor ID (optional)"
                    value={targetGovId}
                    onChange={(e) => setTargetGovId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0f1420] border border-slate-700 text-white text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-sans">
                  Source tag: <code className="text-cyan-300">R5_COMMAND_DESK</code> · Validated against <code className="text-slate-300">events.schema.json</code>
                </span>
                <button
                  type="button"
                  disabled={busy === 'submit'}
                  onClick={() => submitIntent()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={12} />
                  <span>Dispatch {intentType} (#{kdNum})</span>
                </button>
              </div>
            </div>

            {banner && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between font-sans ${
                  banner.type === 'error'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {banner.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                  <span>{banner.text}</span>
                </div>
                <button onClick={() => setBanner(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* 5-Stage Mission Pipeline History for this Kingdom */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Kingdom #{kdNum} Mission Pipeline (`BastionIntents` · Live 5-Stage Verification)
                </span>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="text-[10px] text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {intents.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#06080d] border border-slate-800 text-xs text-slate-500 text-center font-sans">
                  No R5 missions recorded for Kingdom #{kdNum} yet. Dispatch a mission above to watch it flow through Ring 1 → Ring 2 → Ring 3.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {intents.slice(0, 8).map((it) => {
                    const stageIdx = STATUS_INDEX[it.status] ?? -1;
                    const rm = it.result_meta || {};
                    const isFailed = it.status === 'FAILED' || it.status === 'REJECTED';
                    return (
                      <div key={it.intent_id} className="p-3 rounded-xl bg-[#06080d] border border-slate-800 space-y-2 text-[11px]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black">
                              {it.intent_type}
                            </span>
                            <span className="text-slate-400 text-[10px]">{it.source}</span>
                            <span className="text-slate-500 text-[10px]">{ago(it.created_at)}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              it.status === 'VERIFIED_BY_AUDIT'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : isFailed
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {it.status}
                          </span>
                        </div>

                        {/* 5-Stage Pipeline Progress Bar */}
                        {!isFailed && (
                          <div className="grid grid-cols-5 gap-1 pt-0.5">
                            {PIPELINE_STEPS.map((st, idx) => {
                              const done = stageIdx >= idx;
                              const current = stageIdx === idx && it.status !== 'VERIFIED_BY_AUDIT';
                              return (
                                <div
                                  key={st.key}
                                  className={`px-1.5 py-1 rounded text-[9px] text-center font-bold border ${
                                    done
                                      ? current
                                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                                        : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                      : 'bg-slate-900/70 border-slate-800 text-slate-500'
                                  }`}
                                >
                                  {st.label}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Audit Verification Metadata */}
                        {(rm.verified_by_job || rm.job_id || rm.switch_job_id || rm.rejected_reason) && (
                          <div className="text-[10px] text-slate-400 font-sans flex flex-wrap items-center gap-3 pt-0.5">
                            {rm.instance_id && <span>Instance: <strong className="text-slate-200 font-mono">{rm.instance_id}</strong></span>}
                            {rm.governor_name && <span>Bot: <strong className="text-amber-300">{rm.governor_name}</strong></span>}
                            {rm.governors_extracted != null && (
                              <span>Synced: <strong className="text-emerald-300">{rm.governors_extracted} governors</strong></span>
                            )}
                            {rm.verified_at && <span>Verified: <strong className="text-emerald-300">{ago(rm.verified_at)}</strong></span>}
                            {rm.screenshot_uri && (
                              <span className="text-emerald-400 font-mono truncate max-w-xs" title={rm.screenshot_uri}>
                                📸 {rm.screenshot_uri.split('/').slice(-2).join('/')}
                              </span>
                            )}
                            {rm.rejected_reason && <span className="text-rose-300">Reason: {rm.rejected_reason}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
