'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Users,
  Crosshair,
  Target,
  Mail,
  QrCode,
  Shield,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';
import {
  evaluateGovernorTrust,
  formatCompactNumber,
} from '@/lib/valheonTrustEngine';

const INITIAL_CANDIDATES = [
  {
    id: '61829401',
    name: 'AethelgardPrime',
    alliance: '3392',
    power: 88_500_000,
    killPoints: 3_920_000_000,
    deads: 15_400_000,
    stage: 'SCOUTED',
    roleTag: 'Infantry Rally Lead',
  },
  {
    id: '58910234',
    name: 'KaelenStorm',
    alliance: '3401',
    power: 79_200_000,
    killPoints: 2_840_000_000,
    deads: 11_900_000,
    stage: 'AUDITED',
    roleTag: 'Cavalry Open-Field',
  },
  {
    id: '49201844',
    name: 'NyxArcherQueen',
    alliance: '3388',
    power: 92_100_000,
    killPoints: 4_410_000_000,
    deads: 17_800_000,
    stage: 'INVITED',
    roleTag: 'Archer Garrison Captain',
  },
  {
    id: '48291044',
    name: 'SovereignReign',
    alliance: '3418',
    power: 98_400_000,
    killPoints: 4_820_000_000,
    deads: 18_200_000,
    stage: 'MIGRATED',
    roleTag: 'Sovereign Pillar',
  },
];

const STAGES = ['SCOUTED', 'AUDITED', 'INVITED', 'MIGRATED'];

export default function ValheonVanguardPage() {
  const t = useTranslations('Valheon');
  const { inspectGovernor, activeKd } = useValheonCommand();

  const [candidates, setCandidates] = useState(() =>
    INITIAL_CANDIDATES.map((c) => ({
      ...evaluateGovernorTrust(c),
      stage: c.stage,
      roleTag: c.roleTag,
    }))
  );

  const [activeMailCandidate, setActiveMailCandidate] = useState(null);
  const [copiedMail, setCopiedMail] = useState(false);
  const [newGovName, setNewGovName] = useState('');
  const [newGovId, setNewGovId] = useState('');

  const moveStage = (id, dir) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = STAGES.indexOf(c.stage);
        const nextIdx = Math.max(0, Math.min(STAGES.length - 1, idx + dir));
        return { ...c, stage: STAGES[nextIdx] };
      })
    );
  };

  const handleAddProspect = (e) => {
    e.preventDefault();
    if (!newGovName.trim()) return;
    const generatedId =
      newGovId.trim() || String(Math.floor(40_000_000 + Math.random() * 50_000_000));
    const evaluated = evaluateGovernorTrust({
      id: generatedId,
      name: newGovName.trim(),
      alliance: 'EXT',
      power: 76_000_000,
      killPoints: 2_600_000_000,
      deads: 10_200_000,
    });
    setCandidates((prev) => [
      {
        ...evaluated,
        stage: 'SCOUTED',
        roleTag: 'High-Priority Prospect',
      },
      ...prev,
    ]);
    setNewGovName('');
    setNewGovId('');
  };

  const buildRokColoredMail = (cand) => {
    if (!cand) return '';
    return `<color=#00e5ff><b>[VALHEON VANGUARD // KINGDOM ${activeKd}]</b></color>\nHail <b>${cand.name}</b>,\nOur Aegis Intelligence Engine ranked your combat dossier (<color=#10b981>${formatCompactNumber(cand.killPoints)} KP / ${formatCompactNumber(cand.deads)} Deads</color>) in the <b>Top 1% (${cand.trustIndex}/100 Trust Index)</b>.\nWe have reserved a Priority Migration Slot in <b>Kingdom ${activeKd}</b>. Scan the Runic Seal in our Profile Album or message High Command to claim your berth.`;
  };

  const handleCopyMail = (cand) => {
    const text = buildRokColoredMail(cand);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMail(true);
      setTimeout(() => setCopiedMail(false), 2000);
    }
  };

  const columnMeta = [
    {
      key: 'SCOUTED',
      label: t('vanguard_col_scouted'),
      color: 'border-slate-600/50 text-slate-300',
    },
    {
      key: 'AUDITED',
      label: t('vanguard_col_audited'),
      color: 'border-cyan-500/40 text-cyan-400',
    },
    {
      key: 'INVITED',
      label: t('vanguard_col_invited'),
      color: 'border-amber-500/40 text-amber-400',
    },
    {
      key: 'MIGRATED',
      label: t('vanguard_col_migrated'),
      color: 'border-emerald-500/40 text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Suite Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#091e18] to-[#0b0e17] border border-emerald-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-black tracking-widest">
              SUITE 04 // MIGRANT RECRUITING CRM & COMMS
            </span>
            <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono">
              KINGDOM [{activeKd}] PIPELINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-2 flex items-center gap-2.5">
            <Users className="text-emerald-400" size={28} />
            <span>{t('suite_vanguard_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('vanguard_page_subtitle')}
          </p>
        </div>

        {/* Add Prospect Quick Form */}
        <form
          onSubmit={handleAddProspect}
          className="flex flex-wrap items-center gap-2 bg-[#06080d] p-2 rounded-xl border border-[#1e2638]"
        >
          <input
            type="text"
            value={newGovName}
            onChange={(e) => setNewGovName(e.target.value)}
            placeholder="Governor Name..."
            className="bg-transparent px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 outline-none w-36"
          />
          <input
            type="text"
            value={newGovId}
            onChange={(e) => setNewGovId(e.target.value)}
            placeholder="ID (Optional)"
            className="bg-transparent px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 outline-none w-28 border-l border-[#1e2638]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} />
            <span>Scout</span>
          </button>
        </form>
      </div>

      {/* 4-Column Migrant Recruiting Kanban Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columnMeta.map((col) => {
          const items = candidates.filter((c) => c.stage === col.key);
          return (
            <div
              key={col.key}
              className="rounded-2xl bg-[#0b0e17] border border-[#1e2638] p-3.5 flex flex-col space-y-3 min-h-[380px]"
            >
              <div
                className={`pb-2.5 border-b border-[#1e2638] flex items-center justify-between ${col.color}`}
              >
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-mono font-bold text-white">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {items.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3.5 rounded-xl bg-[#06080d] border border-[#1e2638] hover:border-emerald-500/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">
                          [{cand.alliance}] {cand.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ID: {cand.id} • {cand.roleTag}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => inspectGovernor(cand)}
                        className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-black hover:bg-emerald-500/25 cursor-pointer"
                        title="Open 5-Model Aegis Forensics Dossier"
                      >
                        {cand.trustIndex} TRUST
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono bg-[#0b0e17] p-2 rounded-lg border border-[#1e2638]">
                      <div>
                        <div className="text-slate-500">POWER</div>
                        <div className="text-white font-bold">
                          {formatCompactNumber(cand.power)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">KP</div>
                        <div className="text-cyan-400 font-bold">
                          {formatCompactNumber(cand.killPoints)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">DEADS</div>
                        <div className="text-rose-400 font-bold">
                          {formatCompactNumber(cand.deads)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStage(cand.id, -1)}
                          disabled={cand.stage === 'SCOUTED'}
                          className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 cursor-pointer"
                        >
                          <ArrowLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStage(cand.id, 1)}
                          disabled={cand.stage === 'MIGRATED'}
                          className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 cursor-pointer"
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveMailCandidate(cand)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Mail size={11} />
                        <span>{t('vanguard_btn_mail')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Personalized RoK Colored Mail & Album QR Modal */}
      {activeMailCandidate && (
        <div className="p-5 rounded-2xl bg-[#0b0e17] border border-emerald-500/40 shadow-2xl space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-3">
            <div>
              <div className="text-xs font-mono font-black text-emerald-400 uppercase">
                ROK IN-GAME COLORED RECRUITMENT MAIL + ALBUM SEAL INVITE
              </div>
              <div className="text-xs text-slate-400">
                Generated for [{activeMailCandidate.alliance}]{' '}
                {activeMailCandidate.name} (ID: {activeMailCandidate.id})
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyMail(activeMailCandidate)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                {copiedMail ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedMail ? 'Copied RoK Mail!' : 'Copy RoK Mail Code'}</span>
              </button>
              <Link
                href="/album-card"
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5"
              >
                <QrCode size={13} />
                <span>Album Seal QR</span>
              </Link>
            </div>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#06080d] border border-[#1e2638] text-xs font-mono text-cyan-300 whitespace-pre-wrap">
            {buildRokColoredMail(activeMailCandidate)}
          </pre>
        </div>
      )}

      {/* Diplomacy & Recruiting Sub-Modules */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          {
            title: 'Player Hunter',
            desc: 'Cross-kingdom high-KP warrior search & behavioral filtering.',
            href: '/tools/hunter',
            icon: Crosshair,
          },
          {
            title: 'Recruitment Hitlist',
            desc: 'Track departed governors accelerating in power across external kingdoms.',
            href: '/tools/recruitment-hitlist',
            icon: Target,
          },
          {
            title: 'AI Vector Matchmaker',
            desc: '8-dimension cosine similarity recruiting engine.',
            href: '/creator/matchmaker',
            icon: Shield,
          },
          {
            title: 'RoK Mail Studio 3.0',
            desc: 'Rich HTML-to-RoK color tag formatter with live alliance templates.',
            href: '/mail',
            icon: Mail,
          },
          {
            title: 'Album Disguise QR Studio',
            desc: '1080x1080 Imperial Runic Seal card bypassing in-game album filters.',
            href: '/album-card',
            icon: QrCode,
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638] hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <Icon size={18} className="text-emerald-400" />
                <div className="text-sm font-black text-white mt-2.5 group-hover:text-emerald-300">
                  {item.title}
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono text-emerald-400">
                <span>Open Tool</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
