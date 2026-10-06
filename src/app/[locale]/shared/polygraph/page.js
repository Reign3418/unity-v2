'use client';
import { useState, useEffect, Fragment } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Crown, UserPlus, UserMinus, Zap, Clock, Send, Scale, ChevronRight, ChevronDown, Users, Search, QrCode } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { MomentumTachometer, SeismicTensionGauge, DeceptionRadarCard, CombatCausalityCard, SuspectsModal, MailDispatchModal, SpendersAccordionList } from '@/app/[locale]/tools/polygraph/PolygraphGauges';
import PolygraphShareModal from '@/app/[locale]/tools/polygraph/PolygraphShareModal';

const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n/1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(Math.round(n/100)*100/1e3).toFixed(0)}k`;
  return String(n||0);
};
const fd = (n) => (n>0?'+':'')+fmt(n);
const gc = (g) => g==='A'||g==='B' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : g==='C' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30';
const mb = (d) => { const m=Math.floor(d/1e6); return m>=3?'bg-rose-600 text-white':m>=2?'bg-fuchsia-600 text-white':m>=1?'bg-amber-500 text-black':'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; };
const mbt = (d) => { const m=Math.floor(d/1e6); return m>=1?`${m}M+`:'500k+'; };

export default function SharedPolygraph() {
  const t = useTranslations("Polygraph");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const kd = searchParams.get('kd');
  const end = searchParams.get('end');
  const tf = searchParams.get('tf') || '48';
  const depth = searchParams.get('depth') || '300';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [sort, setSort] = useState({ key: 'powerDelta', dir: 'desc' });

  // Alliance Intel expansion & search
  const [expandedTag, setExpandedTag] = useState(null);
  const [govSearch, setGovSearch] = useState('');

  // Remastered modals
  const [inspectCategory, setInspectCategory] = useState(null);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (!kd) { setError('Invalid link — missing kingdom parameter.'); setLoading(false); return; }
    let url = `/api/aws/public/polygraph?kds=${kd}&depth=${depth}`;
    if (end) {
      const anchor = new Date(end + 'T23:59:59Z');
      const start = new Date(anchor.getTime() - parseInt(tf || 24)*3600000).toISOString().split('T')[0];
      url += `&start=${start}&end=${end}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError(d.error || 'Failed to load intelligence brief.'); })
      .catch(() => setError('Network error — unable to reach the Unity server.'))
      .finally(() => setLoading(false));
  }, [kd, end, tf, depth]);

  if (loading) return (
    <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center gap-4 text-gray-400 font-mono">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500"/>
      <p className="text-xs uppercase tracking-widest font-bold">Connecting to Unity Network...</p>
      <p className="text-[10px] opacity-50">Pulling intelligence brief for KD {kd}</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center gap-4 text-center p-6">
      <AlertTriangle className="w-16 h-16 text-rose-500"/>
      <h1 className="text-2xl font-black text-rose-400 uppercase tracking-widest">Access Failed</h1>
      <p className="text-gray-500 font-mono max-w-md text-sm">{error}</p>
    </div>
  );

  const kdd = data?.kingdom;
  const ai = data?.ai;
  const me = kdd?.metrics;

  const sorted = (list) => [...(list||[])].sort((a,b) => sort.dir==='asc' ? (a[sort.key]||0)-(b[sort.key]||0) : (b[sort.key]||0)-(a[sort.key]||0));
  const doSort = (key) => setSort(s => ({ key, dir: s.key===key && s.dir==='desc' ? 'asc' : 'desc' }));
  const si = (k) => sort.key===k ? (sort.dir==='desc' ? '↓' : '↑') : '↕';

  const TABS = ['overview','alliance','migration','leadership','spenders'];
  const TLABELS = { overview:'Overview', alliance:'Alliance Intel', migration:'Migration', leadership:'Leadership', spenders:'Spenders' };

  return (
    <div className="min-h-screen bg-[#060810] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"/>
          <div className="flex items-center gap-3">
            <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]"><Activity className="text-fuchsia-500" size={28}/></div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">EK Polygraph</h1>
              <p className="text-fuchsia-400 text-xs font-bold uppercase tracking-[0.2em]">Kingdom Intelligence Brief — Shared View</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <div className="text-gray-600 text-[10px] uppercase tracking-wider">Kingdom · Window</div>
                <div className="text-gray-300 font-mono font-bold">KD {kd} · {tf}h ending {end}</div>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              >
                <QrCode size={13} /> {t("btn_share_card")}
              </button>
              <button 
                onClick={() => setIsMailModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                <Send size={13} /> {t("dispatch_mail_btn")}
              </button>
            </div>
          </div>
        </div>

        {/* Dossier */}
        <div className="bg-[#0d1017] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">

          {/* KD Bar */}
          <div className="bg-[#15181e] px-6 py-4 border-b border-[#1e222b] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-fuchsia-500/20 text-fuchsia-400 font-black text-2xl px-4 py-1 rounded border border-fuchsia-500/30">KD {kdd.kd}</div>
              {kdd.kingdomName && (
                <div className="text-sm font-bold text-white font-mono bg-[#1a1f2c] px-3 py-1 rounded border border-[#2d323e]">
                  {kdd.kingdomName}
                </div>
              )}
              {kdd.serverAgeDays !== null && kdd.serverAgeDays !== undefined && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 px-3 py-1 rounded-full border border-cyan-500/30">
                  <Clock size={12} className="text-cyan-400" />
                  <span className="text-xs font-bold font-mono text-cyan-300">{kdd.serverAgeDays}d</span>
                  <span className="text-[10px] text-gray-400 font-mono">({kdd.era || kdd.kingdomProgress})</span>
                </div>
              )}
              <div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Roster Analyzed</div>
                <div className="text-gray-200 font-mono font-bold">{kdd.rosterSize} Governors</div>
              </div>
              {ai?.posture && <div className="flex items-center gap-1.5 bg-[#1e222b] px-3 py-1 rounded-full border border-[#2d323e]"><CheckCircle2 size={12} className="text-fuchsia-400"/><span className="text-xs font-bold text-gray-300">{ai.posture}</span></div>}
            </div>
            {ai && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Civil War Risk</div>
                  <div className={`font-mono font-black text-lg ${parseInt(ai.civilWarProbability)>50?'text-rose-400':'text-emerald-400'}`}>{ai.civilWarProbability}%</div>
                </div>
                <div className={`text-4xl font-black px-4 py-2 rounded border ${gc(ai.grade)}`}>{ai.grade}</div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1e222b] bg-[#0a0c0f] overflow-x-auto">
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${tab===t?'border-fuchsia-500 text-fuchsia-400':'border-transparent text-gray-500 hover:text-gray-300'}`}>
                {TLABELS[t]}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab==='overview' && (
            <div className="p-6 space-y-5">
              
              {/* Remastered Cyber-Tactical Visual Gauges */}
              {kdd.velocityMetrics && (
                <MomentumTachometer
                  velocityMetrics={kdd.velocityMetrics}
                  serverAgeDays={kdd.serverAgeDays}
                  t={t}
                />
              )}

              <SeismicTensionGauge
                civilWarProbability={ai?.civilWarProbability}
                civilWarRationale={ai?.civilWarRationale}
                switchersCount={me?.switchersCount}
                alliances={kdd.alliances}
                t={t}
              />

              <CombatCausalityCard
                combatCausality={kdd.combatCausality}
                serverAgeDays={kdd.serverAgeDays}
                t={t}
              />

              <DeceptionRadarCard
                anomalies={kdd.anomalies}
                t={t}
                onInspect={(cat) => setInspectCategory(cat)}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[{label:'Power',val:me?.totalPowerGained,color:'text-fuchsia-400'},{label:'Troops',val:me?.totalTroopPowerGained,color:'text-cyan-400'},{label:'Cmdr',val:me?.totalCmdPowerGained,color:'text-amber-400'},{label:'Tech',val:me?.totalTechPowerGained,color:'text-violet-400'},{label:'Deads',val:me?.totalDeadsGained,color:'text-rose-400'}].map(({label,val,color})=>(
                  <div key={label} className={`bg-[#0a0c0f] border rounded-lg p-4 text-center ${label==='Deads'&&val>0?'border-rose-500/30':'border-[#1e222b]'}`}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{label}</div>
                    <div className={`text-lg font-black font-mono ${color}`}>{val>0?'+':''}{fmt(val||0)}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{label:'KP Gained',val:`+${fmt(me?.totalKPGained||0)}`,color:'text-orange-400'},{label:'Switchers',val:me?.switchersCount||0,color:me?.switchersCount>5?'text-rose-400':'text-gray-300'},{label:'Spenders',val:me?.whalesCount||0,color:me?.whalesCount>0?'text-amber-400':'text-gray-500'}].map(({label,val,color})=>(
                  <div key={label} className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{label}</div>
                    <div className={`text-sm font-bold font-mono ${color}`}>{val}</div>
                  </div>
                ))}
              </div>
              {ai && (
                <div className="space-y-4">
                  <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-5">
                    <div className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider mb-2">J.A.R.V.I.S. Diagnosis</div>
                    <p className="text-gray-300 text-sm leading-relaxed">{ai.diagnosis}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{label:'Stability Index',val:ai.stabilityIndex,color:'text-cyan-400'},{label:'Economic Intel',val:ai.economicIntel,color:'text-amber-400'},{label:'Migrant Intel',val:ai.migrantIntel,color:'text-violet-400'},{label:'Recommendation',val:ai.recommendation,color:'text-emerald-400'}].map(({label,val,color})=>val&&(
                      <div key={label} className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4">
                        <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${color}`}>{label}</div>
                        <p className="text-gray-400 text-xs leading-relaxed">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alliance Intel */}
          {tab==='alliance' && (
            <div className="p-6 space-y-4">
              {ai?.conflictTheories?.length > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-rose-400"/><div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Conflict Theories</div></div>
                  <ul className="space-y-2">{ai.conflictTheories.map((t,i)=><li key={i} className="text-gray-400 text-xs flex items-start gap-2"><span className="text-rose-500/50 mt-0.5">•</span>{t}</li>)}</ul>
                </div>
              )}
              {/* Alliance Intel Table Header + Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-gray-400">{t("expand_roster_hint")}</span>
                  {expandedTag && (
                    <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      Viewing [{expandedTag}]
                    </span>
                  )}
                </div>
                {expandedTag && (
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={govSearch}
                      onChange={e => setGovSearch(e.target.value)}
                      placeholder="Search governors in alliance..."
                      className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="overflow-x-auto border border-[#1e222b] rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#15181e] text-[10px] uppercase tracking-wider text-gray-500">
                    <tr>
                      {[["tag",t("col_tag")],["govCount",t("col_govs")],["powerDelta",t("col_power")],["troopDelta",t("col_troops")],["cmdDelta",t("col_cmdr")],["techDelta",t("col_tech")],["kpDelta",t("col_kp")],["deadsDelta",t("col_deads")]].map(([k,l])=>(
                        <th key={k} className="p-2.5 font-bold cursor-pointer hover:text-white transition-colors" onClick={()=>doSort(k)}>{l} <span className="text-gray-600 ml-1">{si(k)}</span></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e222b] text-xs font-mono">
                    {sorted(kdd.alliances).map(a => {
                      const isExpanded = expandedTag === a.tag;
                      const govs = a.governors || [];
                      const filteredGovs = govSearch.trim()
                        ? govs.filter(g => (g.name || "").toLowerCase().includes(govSearch.toLowerCase()))
                        : govs;

                      return (
                        <Fragment key={a.tag}>
                          <tr 
                            onClick={() => {
                              setExpandedTag(isExpanded ? null : a.tag);
                              setGovSearch("");
                            }}
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? "bg-[#171b24] border-l-2 border-l-cyan-400" : "hover:bg-[#15181e]"
                            }`}
                            title="Click to view governors"
                          >
                            <td className="p-2.5 font-bold text-cyan-400">
                              <div className="flex items-center gap-1.5">
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-cyan-400 shrink-0" />
                                ) : (
                                  <ChevronRight size={14} className="text-gray-500 shrink-0" />
                                )}
                                <span>[{a.tag}]</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-right text-gray-300">
                              <span className="px-1.5 py-0.5 rounded bg-[#101319] border border-[#232834] text-[11px]">
                                {a.govCount}
                              </span>
                            </td>
                            <td className={`p-2.5 text-right font-bold ${a.powerDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fd(a.powerDelta)}</td>
                            <td className={`p-2.5 text-right ${a.troopDelta >= 0 ? "text-cyan-400" : "text-rose-400"}`}>{fd(a.troopDelta)}</td>
                            <td className={`p-2.5 text-right ${a.cmdDelta >= 0 ? "text-amber-400" : "text-rose-400"}`}>{fd(a.cmdDelta)}</td>
                            <td className={`p-2.5 text-right ${a.techDelta >= 0 ? "text-violet-400" : "text-rose-400"}`}>{fd(a.techDelta)}</td>
                            <td className={`p-2.5 text-right ${a.kpDelta > 0 ? "text-orange-400" : "text-gray-600"}`}>{a.kpDelta > 0 ? fd(a.kpDelta) : "-"}</td>
                            <td className={`p-2.5 text-right ${a.deadsDelta > 0 ? "text-rose-400 font-bold" : "text-gray-600"}`}>{a.deadsDelta > 0 ? fd(a.deadsDelta) : "-"}</td>
                          </tr>

                          {/* Expanded Governors Roster Drawer */}
                          {isExpanded && (
                            <tr className="bg-[#090b10] border-b border-[#1e222b]">
                              <td colSpan={8} className="p-3 sm:p-4">
                                <div className="bg-[#0d1017] border border-[#222735] rounded-xl overflow-hidden shadow-2xl space-y-3 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e222b]">
                                    <div className="flex items-center gap-2">
                                      <Users size={16} className="text-cyan-400" />
                                      <span className="font-black text-cyan-300 text-xs font-mono uppercase tracking-wider">
                                        [{a.tag}] {t("alliance_roster_title")}
                                      </span>
                                      <span className="text-[10px] font-mono text-gray-400 bg-[#141722] px-2 py-0.5 rounded border border-[#232834]">
                                        {govs.length} {t("col_govs")}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-mono">
                                      Showing {filteredGovs.length} of {govs.length} governors
                                    </div>
                                  </div>

                                  <div className="max-h-80 overflow-y-auto border border-[#1e222b] rounded-lg">
                                    {govs.length === 0 ? (
                                      <div className="text-center py-8 text-gray-500 text-xs italic font-mono">
                                        {t("no_govs_in_alliance")}
                                      </div>
                                    ) : filteredGovs.length === 0 ? (
                                      <div className="text-center py-8 text-gray-500 text-xs italic font-mono">
                                        No governors match &quot;{govSearch}&quot;
                                      </div>
                                    ) : (
                                      <table className="w-full text-left border-collapse text-xs font-mono">
                                        <thead className="bg-[#12151d] text-[10px] uppercase text-gray-500 sticky top-0 z-10">
                                          <tr>
                                            <th className="p-2.5">#</th>
                                            <th className="p-2.5">{t("col_gov")}</th>
                                            <th className="p-2.5 text-right">{t("col_power")}</th>
                                            <th className="p-2.5 text-right">Power &Delta;</th>
                                            <th className="p-2.5 text-right">{t("col_troops")} &Delta;</th>
                                            <th className="p-2.5 text-right">{t("col_kp")} &Delta;</th>
                                            <th className="p-2.5 text-right">{t("col_deads")} &Delta;</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#171b24]">
                                          {filteredGovs.map((g, idx) => (
                                            <tr key={g.id || idx} className="hover:bg-[#141722] transition-colors">
                                              <td className="p-2.5 text-gray-600 font-bold w-10">{idx + 1}</td>
                                              <td className="p-2.5">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-gray-200">{g.name}</span>
                                                  {g.isWhale && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                      WHALE
                                                    </span>
                                                  )}
                                                  {(g.isMigrant || g.isLateStartOrEmergence || g.isNew) && (
                                                    <span 
                                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                                        (kdd.serverAgeDays !== null && kdd.serverAgeDays < 90) || g.isLateStartOrEmergence
                                                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                                          : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                                      }`}
                                                      title={(kdd.serverAgeDays !== null && kdd.serverAgeDays < 90) || g.isLateStartOrEmergence ? t("badge_new_entry_tooltip") : "Migrant"}
                                                    >
                                                      {(kdd.serverAgeDays !== null && kdd.serverAgeDays < 90) || g.isLateStartOrEmergence ? t("badge_new_entry") : "NEW"}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="p-2.5 text-right text-gray-300 font-bold">{fmt(g.powerEnd || 0)}</td>
                                              <td className={`p-2.5 text-right font-bold ${g.powerDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                {fd(g.powerDelta || 0)}
                                              </td>
                                              <td className={`p-2.5 text-right ${g.troopDelta >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                                                {fd(g.troopDelta || 0)}
                                              </td>
                                              <td className={`p-2.5 text-right ${g.kpDelta > 0 ? "text-orange-400 font-bold" : "text-gray-600"}`}>
                                                {g.kpDelta > 0 ? fd(g.kpDelta) : "-"}
                                              </td>
                                              <td className={`p-2.5 text-right ${g.deadsDelta > 0 ? "text-rose-400 font-bold" : "text-gray-600"}`}>
                                                {g.deadsDelta > 0 ? fd(g.deadsDelta) : "-"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Migration */}
          {tab==='migration' && (
            <div className="p-6 space-y-6">
              {ai?.migrantIntel && <div className="bg-[#0f1115] border border-violet-500/20 rounded-lg p-4"><div className="text-[10px] uppercase font-bold text-violet-400 tracking-wider mb-1">Migration Intel</div><p className="text-gray-300 text-sm">{ai.migrantIntel}</p></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3"><UserPlus size={14} className="text-emerald-400"/><div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">New Arrivals ({kdd.migration?.newArrivals?.length||0})</div></div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {(kdd.migration?.newArrivals||[]).length===0 && <div className="text-gray-600 text-xs italic">No new arrivals detected.</div>}
                    {(kdd.migration?.newArrivals||[]).map((a,i)=>(
                      <div key={i} className="flex items-center gap-2 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <span className="text-[10px] font-bold text-cyan-400">[{a.alliance||'?'}]</span>
                        <span className="text-gray-300 font-medium flex-1">{a.name}</span>
                        <span className="text-emerald-400 font-mono">{fmt(a.power)}</span>
                        {a.isWhale && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-black">WHALE</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3"><UserMinus size={14} className="text-rose-400"/><div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Departed ({kdd.migration?.departed?.length||0})</div></div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {(kdd.migration?.departed||[]).length===0 && <div className="text-gray-600 text-xs italic">No departures detected.</div>}
                    {(kdd.migration?.departed||[]).map((d,i)=>(
                      <div key={i} className="flex flex-col gap-1 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-400">[{d.alliance||'?'}]</span>
                          <span className="text-gray-300 font-medium flex-1">{d.name}</span>
                          <span className="text-gray-500 font-mono">{fmt(d.power)}</span>
                        </div>
                        {d.destination && d.destination!=='Unknown' && <div className="text-[10px] text-gray-600 pl-1">{d.destination}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leadership */}
          {tab === 'leadership' && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0"/>
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  <span className="font-bold text-amber-400">{t("leadership_disclaimer_title")}</span>{" "}
                  {t("leadership_disclaimer_body")}
                </p>
              </div>

              {/* Age Calibration Banner */}
              {kdd.behavioralSigs?.calibration && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1017] border border-cyan-500/20 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Activity size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                        <span>{t("calibration_badge_title")}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {kdd.behavioralSigs.calibration.era} · {kdd.serverAgeDays !== null ? `${kdd.serverAgeDays}d` : 'Calibrated'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {t("calibration_badge_desc", {
                          era: kdd.behavioralSigs.calibration.era,
                          age: kdd.serverAgeDays !== null ? kdd.serverAgeDays : '0',
                          window: kdd.behavioralSigs.calibration.windowDays || 1
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    <div className="bg-[#141722] border border-orange-500/30 px-2.5 py-1 rounded text-orange-300">
                      Operators: <span className="font-bold text-white">KP ≥ {fmt(kdd.behavioralSigs.calibration.kpOperatorThreshold)}</span>
                    </div>
                    <div className="bg-[#141722] border border-violet-500/30 px-2.5 py-1 rounded text-violet-300">
                      Veterans: <span className="font-bold text-white">Power ≥ {fmt(kdd.behavioralSigs.calibration.minVeteranPower)}</span>
                    </div>
                    <div className="bg-[#141722] border border-fuchsia-500/30 px-2.5 py-1 rounded text-fuchsia-300">
                      Hub Mode: <span className="font-bold text-white">{kdd.behavioralSigs.calibration.gravityCenterType === 'consolidation' ? 'Internal Consolidation' : 'Migrant Influx'}</span>
                    </div>
                  </div>
                </div>
              )}

              {ai?.leadershipAssessment && (
                <div className="bg-[#0f1115] border border-amber-500/20 rounded-lg p-4">
                  <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1">{t("ai_leadership_assessment")}</div>
                  <p className="text-gray-300 text-sm">{ai.leadershipAssessment}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Operators */}
                <div className="bg-[#0a0c0f] border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"/>
                      <div className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">{t("operators_title")}</div>
                    </div>
                    {kdd.behavioralSigs?.calibration && (
                      <span className="text-[9px] font-mono text-orange-400/80 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                        KP ≥ {fmt(kdd.behavioralSigs.calibration.kpOperatorThreshold)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3">{t("operators_desc")}</div>
                  <div className="space-y-1.5">
                    {(kdd.behavioralSigs?.operators || []).length === 0 && <div className="text-gray-700 text-xs italic">{t("none_detected")}</div>}
                    {(kdd.behavioralSigs?.operators || []).map((g,i)=>(
                      <div key={g.id || i} className="text-xs bg-[#11141c] border border-[#1b202c] rounded p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-orange-400/80 font-mono font-bold">[{g.alliance}]</span>
                          <span className="text-gray-200 font-medium flex-1 truncate">{g.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 pl-0.5 mt-0.5 flex items-center justify-between">
                          <span className="text-orange-400 font-mono font-bold">KP +{fmt(g.kpDelta)}</span>
                          <span className="font-mono text-gray-400">Pwr {g.powerDelta>=0?"+":""}{fmt(g.powerDelta)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Veterans */}
                <div className="bg-[#0a0c0f] border border-violet-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-violet-400"/>
                      <div className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">{t("veterans_title")}</div>
                    </div>
                    {kdd.behavioralSigs?.calibration && (
                      <span className="text-[9px] font-mono text-violet-400/80 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                        Power ≥ {fmt(kdd.behavioralSigs.calibration.minVeteranPower)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3">{t("veterans_desc")}</div>
                  <div className="space-y-1.5">
                    {(kdd.behavioralSigs?.veterans || []).length === 0 && <div className="text-gray-700 text-xs italic">{t("none_detected")}</div>}
                    {(kdd.behavioralSigs?.veterans || []).map((g,i)=>(
                      <div key={g.id || i} className="text-xs bg-[#11141c] border border-[#1b202c] rounded p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-violet-400/80 font-mono font-bold">[{g.alliance}]</span>
                          <span className="text-gray-200 font-medium flex-1 truncate">{g.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 pl-0.5 mt-0.5 flex items-center justify-between">
                          <span className="text-violet-300 font-mono font-bold">{fmt(g.powerEnd)} total</span>
                          <span className="font-mono text-gray-400">Δ {g.powerDelta>=0?"+":""}{fmt(g.powerDelta)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gravity Centers */}
                <div className="bg-[#0a0c0f] border border-fuchsia-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown size={12} className="text-fuchsia-400"/>
                      <div className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider">{t("gravity_centers_title")}</div>
                    </div>
                    {kdd.behavioralSigs?.calibration && (
                      <span className="text-[9px] font-mono text-fuchsia-400/80 bg-fuchsia-500/10 px-1.5 py-0.5 rounded border border-fuchsia-500/20">
                        {kdd.behavioralSigs.calibration.gravityCenterType === 'consolidation' ? 'Consolidation' : 'Migrant Influx'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3">
                    {kdd.behavioralSigs?.calibration?.gravityCenterType === 'consolidation'
                      ? t("gravity_consolidation_desc")
                      : t("gravity_migration_desc")}
                  </div>
                  <div className="space-y-2">
                    {(!kdd.followSignals || kdd.followSignals.length === 0) && <div className="text-gray-700 text-xs italic">{t("none_detected")}</div>}
                    {(kdd.followSignals || []).map((f,i)=>(
                      <div key={i} className="text-xs bg-[#11141c] border border-[#1b202c] rounded p-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-fuchsia-400 font-mono font-black text-xs">[{f.leaderAlliance}]</span>
                          <span className="text-[10px] font-mono text-gray-400 bg-[#161a25] px-1.5 py-0.5 rounded border border-[#232837]">
                            {f.label || (f.signalType === 'consolidation' ? `${f.followerCount} switchers absorbed` : `${f.followerCount} arrivals`)}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 truncate">
                          {f.followers?.length ? f.followers.join(", ") : "No player names"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Anchors — full width */}
              {(kdd.behavioralSigs?.anchors || []).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"/>
                    <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">{t("anchors_title")}</div>
                    <span className="text-gray-600 text-[10px]">{t("anchors_desc")}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {kdd.behavioralSigs.anchors.map((g,i)=>(
                      <div key={g.id || i} className="flex items-center gap-2 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <span className="text-cyan-400/70 font-mono">[{g.alliance}]</span>
                        <span className="text-gray-300 font-medium flex-1 truncate">{g.name}</span>
                        <span className="text-gray-600 font-mono">{fmt(g.powerEnd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Spenders */}
          {tab === 'spenders' && (
            <div className="p-6 space-y-4">
              <div
                className="text-xs text-gray-500"
                dangerouslySetInnerHTML={{
                  __html: (kdd.serverAgeDays !== null && kdd.serverAgeDays < 90 ? t.raw("spenders_desc_nascent") : t.raw("spenders_desc"))
                    .replace("<highlight>", '<span className="text-amber-400 font-bold">')
                    .replace("</highlight>", "</span>")
                    .replace("<new>", '<span className="text-blue-400">')
                    .replace("</new>", "</span>")
                }}
              />
              <SpendersAccordionList
                whales={kdd.whales || []}
                serverAgeDays={kdd.serverAgeDays}
                era={kdd.era || kdd.kingdomProgress}
                windowDays={kdd.velocityMetrics?.windowDays || 1}
                t={t}
              />
            </div>
          )}

        </div>

        <div className="text-center text-[10px] font-black uppercase tracking-widest text-gray-700">
          Powered by Unity Combat Intelligence · unity-v2.vercel.app
        </div>
      </div>

      {/* Remastered Modals */}
      <SuspectsModal
        isOpen={!!inspectCategory}
        onClose={() => setInspectCategory(null)}
        category={inspectCategory}
        list={kdd?.anomalies?.[inspectCategory] || []}
        t={t}
      />

      <MailDispatchModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        kd={kd}
        kdd={kdd}
        ai={ai}
        t={t}
        locale={locale}
      />

      <PolygraphShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        kd={kd}
        data={data}
        endDate={end}
        timeframe={tf}
        depth={depth}
        locale={locale}
        t={t}
      />
    </div>
  );
}
