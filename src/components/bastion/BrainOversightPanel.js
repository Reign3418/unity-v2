'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';

/**
 * Bastion Brain oversight panel (Step 4): live heartbeat, mode control, bot roster, and the
 * decision audit log (why, triggers, NUMNUM rule table, evidence) written by the Railway brain.
 */

const MODES = [
  { key: 'OFF', cls: 'border-slate-500/50 text-slate-300', hint: 'Kill switch: no new jobs' },
  { key: 'DRY_RUN', cls: 'border-cyan-500/50 text-cyan-300', hint: 'Plans only, nothing dispatched' },
  { key: 'SUPERVISED', cls: 'border-amber-500/50 text-amber-300', hint: 'Routine jobs dispatch' },
  { key: 'AUTONOMOUS', cls: 'border-pink-500/50 text-pink-300', hint: 'Full autonomy within NUMNUM' },
];

const SEVERITY_CLS = {
  INFO: 'text-slate-300',
  NOTICE: 'text-cyan-300',
  WARN: 'text-amber-300',
  CRITICAL: 'text-red-400 font-bold',
};

const RING_CLS = {
  RING_1_INTEL: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  RING_2_OPS: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  RING_3_AUDIT: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  SYSTEM: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const STATE_CLS = {
  ACTIVE: 'text-emerald-300',
  GROWING: 'text-lime-300',
  SLEEPING: 'text-indigo-300',
  ON_MISSION: 'text-cyan-300',
  SUSPECT: 'text-amber-300',
  LOST: 'text-red-400',
  RETIRED: 'text-slate-500',
  PROVISIONING: 'text-slate-300',
};

function ago(iso, nowMs) {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function EventRow({ ev, nowMs }) {
  const [open, setOpen] = useState(false);
  const o = ev.oversight || {};
  const checks = o.numnum_checks || [];
  return (
    <div className="border-b border-slate-800/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 hover:bg-slate-800/40 flex flex-wrap items-center gap-2 text-[11px]"
      >
        <span className="text-slate-500 w-16 shrink-0">{ago(ev.timestamp, nowMs)}</span>
        <span className={`px-1.5 py-0.5 rounded border text-[10px] ${RING_CLS[ev.ring] || RING_CLS.SYSTEM}`}>{ev.actor}</span>
        <span className="text-slate-400 w-36 shrink-0">{ev.event_type}</span>
        <span className={`flex-1 min-w-[12rem] font-sans ${SEVERITY_CLS[ev.severity] || ''}`}>{ev.summary}</span>
        <span className="text-slate-600">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-[11px] font-sans">
          <div>
            <span className="text-slate-500 font-mono">WHY </span>
            <span className="text-slate-200">{o.why}</span>
          </div>
          {o.operator_action_required && (
            <div className="text-red-300 font-bold">OPERATOR ACTION: {o.operator_instructions}</div>
          )}
          {checks.length > 0 && (
            <table className="w-full text-[10px] font-mono">
              <tbody>
                {checks.map((c) => (
                  <tr key={c.rule_id} className="border-t border-slate-800">
                    <td className={`py-0.5 pr-2 ${c.passed ? 'text-emerald-400' : 'text-red-400'}`}>{c.passed ? 'PASS' : 'FAIL'}</td>
                    <td className="pr-2 text-slate-300">{c.rule_id}</td>
                    <td className="pr-2 text-slate-500">
                      {String(c.actual_value ?? '')} / {String(c.limit_value ?? '')}
                    </td>
                    <td className="text-slate-400">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {o.trigger_inputs && Object.keys(o.trigger_inputs).length > 0 && (
            <pre className="bg-black/40 rounded p-2 text-[10px] text-slate-400 overflow-x-auto max-h-48">
              {JSON.stringify(o.trigger_inputs, null, 2)}
            </pre>
          )}
          {(o.evidence_refs || []).length > 0 && (
            <div className="text-[10px] font-mono text-slate-500 break-all">EVIDENCE {o.evidence_refs.join('  ')}</div>
          )}
          <div className="text-[10px] font-mono text-slate-600">
            {ev.event_id} · corr {ev.correlation_id} · {ev.timestamp} · mode {ev.operating_mode}
            {ev.job_id ? ` · ${ev.job_id}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrainOversightPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [severityFloor, setSeverityFloor] = useState('INFO');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bastion/brain', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  const setMode = async (mode) => {
    if ((mode === 'AUTONOMOUS' || mode === 'SUPERVISED') &&
        !window.confirm(`Switch the Bastion Brain to ${mode}? Approved jobs will be sent to the emulators.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/bastion/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_MODE', mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const hb = data?.heartbeat;
  const online = hb?.ts && nowMs - new Date(hb.ts).getTime() < 180000;
  const requested = data?.requestedMode?.mode;
  const effective = hb?.mode;
  const order = ['INFO', 'NOTICE', 'WARN', 'CRITICAL'];
  const events = (data?.events || []).filter((e) => order.indexOf(e.severity) >= order.indexOf(severityFloor));

  return (
    <div className="p-5 rounded-2xl bg-[#0b0e17] border border-emerald-500/30 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Cpu className="text-emerald-400" size={22} />
          <div>
            <div className="text-sm font-black tracking-widest text-white">BASTION BRAIN · ORCHESTRATOR (RAILWAY)</div>
            <div className="text-[10px] text-slate-500">
              {hb ? `v${hb.version} · tick ${hb.tick} · last heartbeat ${ago(hb.ts, nowMs)}` : 'No heartbeat recorded yet'}
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
              online ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-red-500/15 text-red-300 border-red-500/40'
            }`}
          >
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              title={m.hint}
              disabled={busy}
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold ${m.cls} ${
                (requested || effective) === m.key ? 'bg-white/10 ring-1 ring-white/30' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {m.key}
            </button>
          ))}
          <button type="button" onClick={load} className="p-1 text-slate-400 hover:text-white" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="text-[10px] text-slate-500">
        Effective mode: <span className="text-slate-200 font-bold">{effective || '—'}</span>
        {requested && requested !== effective && (
          <span className="text-amber-300"> · requested {requested} (applies on next tick, ≤60s; Railway BRAIN_MODE=OFF overrides)</span>
        )}
        {data?.requestedMode?.set_by && <span> · set by {data.requestedMode.set_by} {ago(data.requestedMode.set_at, nowMs)}</span>}
      </div>

      {error && <div className="text-[11px] text-red-300">Brain API: {error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-slate-500 text-[10px]">
            <tr className="text-left">
              <th className="py-1 pr-3">BOT</th>
              <th className="pr-3">KINGDOM</th>
              <th className="pr-3">INSTANCE</th>
              <th className="pr-3">STATE</th>
              <th className="pr-3">CH</th>
              <th className="pr-3">POWER</th>
              <th className="pr-3">VERIFIED</th>
              <th className="pr-3">FAILS</th>
              <th>LAST PLAN</th>
            </tr>
          </thead>
          <tbody>
            {(data?.bots || []).map((b) => (
              <tr key={b.bot_id} className="border-t border-slate-800">
                <td className="py-1 pr-3 text-slate-200">{b.governor_name}</td>
                <td className="pr-3">#{b.kingdom_id}</td>
                <td className="pr-3 text-slate-400">{b.instance_id}</td>
                <td className={`pr-3 font-bold ${STATE_CLS[b.lifecycle_state] || ''}`}>{b.lifecycle_state}</td>
                <td className="pr-3">{b.verified_state?.ch_level}</td>
                <td className="pr-3">{Number(b.verified_state?.power || 0).toLocaleString()}</td>
                <td className="pr-3 text-slate-400">{ago(b.verified_state?.last_verified_at, nowMs)}</td>
                <td className={`pr-3 ${b.health?.consecutive_failures ? 'text-amber-300' : 'text-slate-500'}`}>
                  {b.health?.consecutive_failures || 0}
                </td>
                <td className="text-slate-400">{hb?.plans?.[b.instance_id] || '—'}</td>
              </tr>
            ))}
            {data && !(data.bots || []).length && (
              <tr>
                <td colSpan={9} className="py-2 text-slate-500">No bots registered with the brain yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-black tracking-widest text-slate-400">DECISION AUDIT LOG · newest first</div>
          <select
            value={severityFloor}
            onChange={(e) => setSeverityFloor(e.target.value)}
            className="bg-black/40 border border-slate-700 rounded text-[10px] px-1 py-0.5 text-slate-300"
          >
            {order.map((s) => (
              <option key={s} value={s}>
                {s}+
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-[28rem] overflow-y-auto rounded border border-slate-800 bg-black/20">
          {events.map((ev) => (
            <EventRow key={ev.event_id} ev={ev} nowMs={nowMs} />
          ))}
          {data && !events.length && <div className="p-3 text-[11px] text-slate-500">No events in the last two days.</div>}
        </div>
      </div>
    </div>
  );
}
