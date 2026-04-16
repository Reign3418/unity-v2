'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Sword, Clock, Calendar, TrendingUp, Shield,
  Link2, Settings, ChevronRight, Zap, Users
} from 'lucide-react';
import MemberCoachingBrief from '@/components/member/MemberCoachingBrief';

// ─────────────────────────────────────────────────────────────────────────────
// Utility: format UTC uptime window from stored local values
// ─────────────────────────────────────────────────────────────────────────────
function formatUptimeDisplay(governorConfig) {
  const { timezone, playtimeStart, playtimeEnd } = governorConfig || {};
  if (!timezone || !playtimeStart || !playtimeEnd) return null;

  try {
    const toUTC = (timeStr, tz) => {
      const [h, m] = timeStr.split(':').map(Number);
      const ref = new Date();
      ref.setHours(h, m, 0, 0);
      const utcStr = ref.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
      });
      // Convert local → UTC offset
      const localOffset = new Date().getTimezoneOffset(); // browser local offset
      const formatter = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' });
      const parts = formatter.formatToParts(ref);
      const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const match = tzPart.match(/([+-])(\d+):?(\d*)/);
      if (!match) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} UTC`;
      const sign = match[1] === '+' ? 1 : -1;
      const offsetH = parseInt(match[2], 10);
      const offsetM = parseInt(match[3] || '0', 10);
      const totalOffset = sign * (offsetH * 60 + offsetM);
      let utcH = h - Math.floor(totalOffset / 60);
      let utcMin = m - (totalOffset % 60);
      if (utcMin < 0) { utcH -= 1; utcMin += 60; }
      if (utcMin >= 60) { utcH += 1; utcMin -= 60; }
      utcH = ((utcH % 24) + 24) % 24;
      return `${String(utcH).padStart(2,'0')}:${String(utcMin).padStart(2,'0')} UTC`;
    };

    const start = toUTC(playtimeStart, timezone);
    const end   = toUTC(playtimeEnd, timezone);
    return { start, end, local: `${playtimeStart}–${playtimeEnd}`, timezone };
  } catch {
    return { start: playtimeStart, end: playtimeEnd, local: `${playtimeStart}–${playtimeEnd}`, timezone };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card sub-component
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'cyan', icon: Icon }) {
  const colors = {
    cyan:    { ring: 'border-cyan-500/30',   text: 'text-cyan-400',   glow: 'bg-cyan-500/5'   },
    indigo:  { ring: 'border-indigo-500/30', text: 'text-indigo-400', glow: 'bg-indigo-500/5' },
    emerald: { ring: 'border-emerald-500/30',text: 'text-emerald-400',glow: 'bg-emerald-500/5'},
    amber:   { ring: 'border-amber-500/30',  text: 'text-amber-400',  glow: 'bg-amber-500/5'  },
  };
  const c = colors[color] || colors.cyan;
  return (
    <div className={`bg-[#0f1115] border ${c.ring} rounded-xl p-5 flex items-start gap-4 ${c.glow} relative overflow-hidden`}>
      <div className={`p-2.5 rounded-lg border ${c.ring} bg-[#0a0c0f] shrink-0`}>
        <Icon size={18} className={c.text} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-black text-white truncate">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MemberPortal Component
// ─────────────────────────────────────────────────────────────────────────────
export default function MemberPortal({ session }) {
  const router = useRouter();
  const locale = useLocale();
  const [govStats, setGovStats] = useState(null);
  const [events, setEvents]     = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const governorConfig = session?.user?.governorConfig || {};
  const govId = governorConfig?.governorId || governorConfig?.governorIds?.[0];
  const kingdomId = session?.user?.tenant?.kingdomId || governorConfig?.kingdomId;
  const uptimeDisplay = formatUptimeDisplay(governorConfig);

  // Fetch personal stats if governor ID is linked
  useEffect(() => {
    if (!govId || !kingdomId) return;
    setLoadingStats(true);
    fetch(`/api/aws/history?id=${govId}&kd=${kingdomId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setGovStats(d || null))
      .catch(() => setGovStats(null))
      .finally(() => setLoadingStats(false));
  }, [govId, kingdomId]);

  // Fetch upcoming events
  useEffect(() => {
    if (!kingdomId) return;
    setLoadingEvents(true);
    fetch(`/api/events?kd=${kingdomId}&limit=3`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setEvents(d?.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [kingdomId]);

  // Format large numbers
  const fmt = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return String(n);
  };

  // Most recent scan is last in chronological array (oldest→newest sort from API)
  const latestScan = govStats?.timeline?.[govStats.timeline.length - 1];
  const displayName = session?.user?.username || session?.user?.name || 'Governor';

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in pb-16 mt-6 px-4">

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500 mb-1">Commander Portal</p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
            Welcome back, <span className="text-cyan-400">{displayName}</span>
          </h1>
          {kingdomId && (
            <p className="text-sm text-gray-500 mt-1">Kingdom {kingdomId}</p>
          )}
        </div>
      </div>

      {/* ── Section 1: Governor Stats ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Your Stats</h2>
          {govId && (
            <button
              onClick={() => router.push(`/${locale}/stats?govId=${govId}`)}
              className="flex items-center gap-1 text-[10px] font-bold text-cyan-500 hover:text-cyan-300 transition-colors uppercase tracking-wider"
            >
              Full Timeline <ChevronRight size={12} />
            </button>
          )}
        </div>

        {!govId ? (
          /* No governor linked: prompt to link */
          <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="p-3 bg-[#1e222b] rounded-xl border border-[#2d323e]">
              <Link2 size={22} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">No Governor Card Linked</p>
              <p className="text-xs text-gray-500">Link your Governor ID to see your personal performance stats here.</p>
            </div>
            <button
              onClick={() => router.push(`/${locale}/settings`)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <Settings size={13} />
              Go to Settings
            </button>
          </div>
        ) : loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-3 ${latestScan?.t5Kills > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
            <StatCard
              label="Total Power"
              value={fmt(latestScan?.power)}
              sub="Current"
              color="cyan"
              icon={Sword}
            />
            <StatCard
              label="Kill Points"
              value={fmt(latestScan?.killPoints)}
              sub="All time"
              color="indigo"
              icon={TrendingUp}
            />
            <StatCard
              label="T4 Kills"
              value={fmt(latestScan?.t4Kills)}
              sub="Last scan"
              color="emerald"
              icon={Shield}
            />
            {/* T5 card only renders when kingdom data shows T5 activity */}
            {latestScan?.t5Kills > 0 && (
              <StatCard
                label="T5 Kills"
                value={fmt(latestScan?.t5Kills)}
                sub="Last scan"
                color="amber"
                icon={Zap}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: J.A.R.V.I.S. Coaching Brief ───────────────────── */}
      <MemberCoachingBrief
        govId={govId}
        kingdomId={kingdomId}
        session={session}
      />

      {/* ── Section 3: Presence & Uptime ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Your Schedule</h2>
          <button
            onClick={() => router.push(`/${locale}/settings`)}
            className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
          >
            Edit <ChevronRight size={12} />
          </button>
        </div>

        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5">
          {uptimeDisplay ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 shrink-0 self-start">
                <Clock size={18} className="text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">UTC Window</p>
                    <p className="text-base font-black text-white">{uptimeDisplay.start} – {uptimeDisplay.end}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Your Local Time</p>
                    <p className="text-base font-black text-gray-400">{uptimeDisplay.local}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Timezone</p>
                    <p className="text-sm font-bold text-gray-500 truncate max-w-[180px]">{uptimeDisplay.timezone}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg border border-dashed border-[#2d323e] bg-[#0a0c0f] shrink-0">
                <Clock size={18} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400">No uptime declared</p>
                <p className="text-xs text-gray-600 mt-0.5">Set your play schedule in Settings so leadership can plan events around your availability.</p>
              </div>
              <button
                onClick={() => router.push(`/${locale}/settings`)}
                className="ml-auto shrink-0 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-500/20 transition-colors"
              >
                Set Schedule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Upcoming Events ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Kingdom Events</h2>
          <button
            onClick={() => router.push(`/${locale}/events`)}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
          >
            View All <ChevronRight size={12} />
          </button>
        </div>

        {loadingEvents ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events.map((evt, i) => (
              <div key={i} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 shrink-0">
                  <Calendar size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{evt.title || evt.name || 'Kingdom Event'}</p>
                  {evt.date && <p className="text-xs text-gray-500 mt-0.5">{evt.date}</p>}
                </div>
                {evt.type && (
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {evt.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-6 flex items-center gap-4">
            <div className="p-2.5 rounded-lg border border-dashed border-[#2d323e] bg-[#0a0c0f]">
              <Calendar size={18} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400">No upcoming events</p>
              <p className="text-xs text-gray-600 mt-0.5">Check back later or visit the Events page for the full calendar.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: soft escalation prompt ───────────────────────────────────── */}
      <div className="pt-2 pb-4 text-center">
        <p className="text-[10px] text-gray-700 uppercase tracking-widest">
          Need access to more tools? Contact your R4 or R5.
        </p>
      </div>
    </div>
  );
}
