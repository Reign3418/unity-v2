'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Swords,
  Map as MapIcon,
  Target,
  Clock,
  Send,
  Copy,
  Check,
  ArrowRight,
  Flame,
  Shield,
} from 'lucide-react';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';

export default function ValheonTheaterPage() {
  const t = useTranslations('Valheon');
  const { activeKd } = useValheonCommand();

  const [utcNow, setUtcNow] = useState('00:00:00 UTC');
  const [selectedZone, setSelectedZone] = useState(
    'Region 8 // Pass 7 Kingsland North'
  );
  const [rallyLead, setRallyLead] = useState('[3418] SovereignReign');
  const [garrisonLead, setGarrisonLead] = useState('[3418] ValkyrieSpear');
  const [utcTarget, setUtcTarget] = useState('14:00 UTC');
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null);

  // Lanchester Quick Battle Simulator state
  const [allyMarches, setAllyMarches] = useState(140);
  const [allyTechBonus, setAllyTechBonus] = useState(68);
  const [enemyMarches, setEnemyMarches] = useState(125);
  const [enemyTechBonus, setEnemyTechBonus] = useState(54);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtcNow(now.toISOString().slice(11, 19) + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Lanchester Square-Law Combat Calculation: Fighting Power ~ N^2 * (1 + techBonus/100)
  const lanchesterOutcome = useMemo(() => {
    const allyStrength =
      Math.pow(allyMarches, 2) * (1 + allyTechBonus / 100);
    const enemyStrength =
      Math.pow(enemyMarches, 2) * (1 + enemyTechBonus / 100);
    const total = allyStrength + enemyStrength || 1;
    const winProb = Math.max(
      2,
      Math.min(98, Math.round((allyStrength / total) * 100))
    );
    const remainingRatio =
      allyStrength >= enemyStrength
        ? Math.sqrt(1 - enemyStrength / allyStrength)
        : Math.sqrt(1 - allyStrength / enemyStrength);
    const survivingMarches = Math.round(
      (allyStrength >= enemyStrength ? allyMarches : enemyMarches) *
        remainingRatio
    );
    return {
      winProb,
      victor:
        allyStrength >= enemyStrength
          ? `COALITION [${activeKd}] VICTORY`
          : 'ENEMY COALITION ADVANTAGE',
      survivingMarches,
    };
  }, [allyMarches, allyTechBonus, enemyMarches, enemyTechBonus, activeKd]);

  const formattedWarOrder = useMemo(() => {
    return [
      `⚔️ **VALHEON THEATER // TACTICAL WAR ORDER [KD ${activeKd}]**`,
      `📍 **Objective:** ${selectedZone}`,
      `🕒 **Mandatory Form-Up:** ${utcTarget} (Current: ${utcNow})`,
      `👑 **Primary Rally Captain:** ${rallyLead}`,
      `🛡️ **Primary Flag Garrison:** ${garrisonLead}`,
      `📊 **Lanchester Win Forecast:** ${lanchesterOutcome.winProb}% (${allyMarches} vs ${enemyMarches} Marches)`,
      `⚡ *Pop 50% Army Expansion + KvK War Frenzy 5m prior to pass drop.*`,
    ].join('\n');
  }, [
    activeKd,
    selectedZone,
    utcTarget,
    utcNow,
    rallyLead,
    garrisonLead,
    lanchesterOutcome.winProb,
    allyMarches,
    enemyMarches,
  ]);

  const handleCopyWarOrder = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formattedWarOrder);
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 2000);
    }
  };

  const handleBroadcastDiscord = async () => {
    setBroadcastStatus('SENDING');
    try {
      await fetch('/api/telemetry/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'VALHEON_WAR_ORDER_BROADCAST',
          metadata: { activeKd, selectedZone, utcTarget },
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
    handleCopyWarOrder();
    setTimeout(() => {
      setBroadcastStatus('SENT');
      setTimeout(() => setBroadcastStatus(null), 3500);
    }, 450);
  };

  const passTimers = [
    {
      zone: 'Pass 4 // Hand in Hand (DKP Start)',
      status: 'OPEN // ACTIVE COMBAT',
      timer: 'LIVE NOW',
      tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
    {
      zone: 'Altar of Darkness // Region 6',
      status: 'NEXT OBJECTIVE',
      timer: 'T-Minus 04h 18m',
      tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    {
      zone: 'Pass 7 // Kingsland Gate',
      status: 'STAGING FLAGS (MST)',
      timer: 'T-Minus 38h 42m',
      tone: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      zone: 'The Great Ziggurat // Crown',
      status: 'FINAL PHASE',
      timer: 'T-Minus 6d 12h',
      tone: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Suite Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#1f0c14] to-[#0b0e17] border border-rose-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-black tracking-widest">
              SUITE 03 // LIVE KVK TACTICAL WAR ROOM
            </span>
            <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 text-[10px] font-mono flex items-center gap-1">
              <Clock size={11} />
              <span>{utcNow}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-2 flex items-center gap-2.5">
            <Swords className="text-rose-400" size={28} />
            <span>{t('suite_theater_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('theater_page_subtitle')}
          </p>
        </div>

        <Link
          href="/tools/map-planner"
          className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs font-mono flex items-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.3)] transition-all"
        >
          <MapIcon size={15} />
          <span>Open 128-Node Crystal Map</span>
        </Link>
      </div>

      {/* Live Pass-Opening UTC Countdown Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {passTimers.map((p, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedZone(p.zone)}
            className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638] hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-black ${p.tone}`}
              >
                {p.status}
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {p.timer}
              </span>
            </div>
            <div className="text-xs font-black text-slate-200 mt-2">
              {p.zone}
            </div>
          </div>
        ))}
      </div>

      {/* Main Tactical Grid: Lanchester Battle Predictor + Discord War Order Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Lanchester Square-Law Attrition Simulator */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0b0e17] border border-[#1e2638] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
            <div>
              <div className="text-xs font-mono font-black text-rose-400 uppercase">
                LANCHESTER SQUARE-LAW CLASH PREDICTOR
              </div>
              <div className="text-xs text-slate-400">
                Real-time pass fight & crystal tech attrition modeling
              </div>
            </div>
            <Link
              href="/creator/lab/battle-predictor"
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>AI Deep Sim</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-[#06080d] border border-cyan-500/30 space-y-3">
              <div className="text-xs font-mono font-bold text-cyan-400">
                ALLIED COALITION [{activeKd}]
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Active Field Marches</span>
                  <span className="font-bold text-white">{allyMarches}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={allyMarches}
                  onChange={(e) => setAllyMarches(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Crystal Tech & Buff Index</span>
                  <span className="font-bold text-white">+{allyTechBonus}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={allyTechBonus}
                  onChange={(e) => setAllyTechBonus(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06080d] border border-rose-500/30 space-y-3">
              <div className="text-xs font-mono font-bold text-rose-400">
                HOSTILE CAMP COALITION
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Enemy Field Marches</span>
                  <span className="font-bold text-white">{enemyMarches}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={enemyMarches}
                  onChange={(e) => setEnemyMarches(Number(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Enemy Crystal Tech Index</span>
                  <span className="font-bold text-white">
                    +{enemyTechBonus}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={enemyTechBonus}
                  onChange={(e) => setEnemyTechBonus(Number(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#06080d] border border-[#1e2638] flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-black text-emerald-400">
                {lanchesterOutcome.victor}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Est. Surviving Field Marches after Engagement:{' '}
                <strong className="text-white">
                  {lanchesterOutcome.survivingMarches}
                </strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-cyan-400">
                {lanchesterOutcome.winProb}%
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                Win Probability
              </div>
            </div>
          </div>
        </div>

        {/* Right: Broadcast War Order to Discord */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0b0e17] border border-rose-500/30 flex flex-col justify-between space-y-4">
          <div className="border-b border-[#1e2638] pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-black text-amber-400 uppercase">
                {t('theater_broadcast_btn')}
              </div>
              <div className="text-xs text-slate-400">
                Format map targets, rally leads & UTC timers into a Discord embed
              </div>
            </div>
            <Flame size={18} className="text-amber-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
            <div>
              <label className="text-[10px] uppercase text-slate-400 block mb-1">
                Target Bastion / Pass
              </label>
              <input
                type="text"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full bg-[#06080d] border border-[#1e2638] rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 block mb-1">
                Mandatory Form-Up Time
              </label>
              <input
                type="text"
                value={utcTarget}
                onChange={(e) => setUtcTarget(e.target.value)}
                className="w-full bg-[#06080d] border border-[#1e2638] rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 block mb-1">
                Primary Rally Lead
              </label>
              <input
                type="text"
                value={rallyLead}
                onChange={(e) => setRallyLead(e.target.value)}
                className="w-full bg-[#06080d] border border-[#1e2638] rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 block mb-1">
                Primary Garrison Lead
              </label>
              <input
                type="text"
                value={garrisonLead}
                onChange={(e) => setGarrisonLead(e.target.value)}
                className="w-full bg-[#06080d] border border-[#1e2638] rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          <pre className="p-3 rounded-xl bg-[#06080d] border border-[#1e2638] text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
            {formattedWarOrder}
          </pre>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleBroadcastDiscord}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send size={14} />
              <span>
                {broadcastStatus === 'SENT'
                  ? '✓ Dispatched & Copied to Clipboard!'
                  : t('theater_broadcast_btn')}
              </span>
            </button>
            <button
              type="button"
              onClick={handleCopyWarOrder}
              className="py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[#1e2638] text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              {copiedOrder ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedOrder ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tactical Sub-Module Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          {
            title: '128-Node Crystal Map (MST)',
            desc: 'Minimum Spanning Tree territory optimizer & bastion crystal calculator.',
            href: '/tools/map-planner',
            icon: MapIcon,
          },
          {
            title: 'KvK Tactical Hub',
            desc: 'Three-point scan model (Baseline -> Pass 4 -> Latest) & Heroic Anthem timelines.',
            href: '/analysis/kvk',
            icon: Target,
          },
          {
            title: 'AI Battle Predictor',
            desc: 'Gemini 2.5 Flash Tactical Thinking Engine for rally/garrison counter-pairings.',
            href: '/creator/lab/battle-predictor',
            icon: Swords,
          },
          {
            title: 'KvK Timeline Replay',
            desc: 'Chronological war replay across longitudinal kingdom scan snapshots.',
            href: '/creator/lab/timeline-replay',
            icon: Shield,
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638] hover:border-rose-500/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <Icon size={18} className="text-rose-400" />
                <div className="text-sm font-black text-white mt-2.5 group-hover:text-rose-300">
                  {item.title}
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono text-rose-400">
                <span>Launch War Module</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
