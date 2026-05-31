'use client';
import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Crown, UserPlus, UserMinus, Zap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

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

  useEffect(() => {
    if (!kd || !end) { setError('Invalid link — missing kingdom or date parameters.'); setLoading(false); return; }
    const anchor = new Date(end + 'T23:59:59Z');
    const start = new Date(anchor.getTime() - parseInt(tf)*3600000).toISOString().split('T')[0];
    fetch(`/api/aws/public/polygraph?kds=${kd}&start=${start}&end=${end}&depth=${depth}`)
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
            <div className="ml-auto text-right">
              <div className="text-gray-600 text-[10px] uppercase tracking-wider">Kingdom · Window</div>
              <div className="text-gray-300 font-mono font-bold">KD {kd} · {tf}h ending {end}</div>
            </div>
          </div>
        </div>

        {/* Dossier */}
        <div className="bg-[#0d1017] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">

          {/* KD Bar */}
          <div className="bg-[#15181e] px-6 py-4 border-b border-[#1e222b] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-fuchsia-500/20 text-fuchsia-400 font-black text-2xl px-4 py-1 rounded border border-fuchsia-500/30">KD {kdd.kd}</div>
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
              <div className="overflow-x-auto border border-[#1e222b] rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#15181e] text-[10px] uppercase tracking-wider text-gray-500">
                    <tr>{[['tag','Tag'],['govCount','Govs'],['powerDelta','Power'],['troopDelta','Troops'],['cmdDelta','Cmdr'],['techDelta','Tech'],['kpDelta','KP'],['deadsDelta','Deads']].map(([k,l])=>(
                      <th key={k} className="p-2 font-bold cursor-pointer hover:text-white transition-colors" onClick={()=>doSort(k)}>{l} <span className="text-gray-600 ml-1">{si(k)}</span></th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e222b] text-xs font-mono">
                    {sorted(kdd.alliances).map(a=>(
                      <tr key={a.tag} className="hover:bg-[#15181e] transition-colors">
                        <td className="p-2 font-bold text-cyan-400">[{a.tag}]</td>
                        <td className="p-2 text-right text-gray-400">{a.govCount}</td>
                        <td className={`p-2 text-right font-bold ${a.powerDelta>=0?'text-emerald-400':'text-rose-400'}`}>{fd(a.powerDelta)}</td>
                        <td className={`p-2 text-right ${a.troopDelta>=0?'text-cyan-400':'text-rose-400'}`}>{fd(a.troopDelta)}</td>
                        <td className={`p-2 text-right ${a.cmdDelta>=0?'text-amber-400':'text-rose-400'}`}>{fd(a.cmdDelta)}</td>
                        <td className={`p-2 text-right ${a.techDelta>=0?'text-violet-400':'text-rose-400'}`}>{fd(a.techDelta)}</td>
                        <td className={`p-2 text-right ${a.kpDelta>0?'text-orange-400':'text-gray-600'}`}>{a.kpDelta>0?fd(a.kpDelta):'-'}</td>
                        <td className={`p-2 text-right ${a.deadsDelta>0?'text-rose-400 font-bold':'text-gray-600'}`}>{a.deadsDelta>0?fd(a.deadsDelta):'-'}</td>
                      </tr>
                    ))}
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
          {tab==='leadership' && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0"/>
                <p className="text-amber-200/70 text-xs leading-relaxed"><span className="font-bold text-amber-400">Behavioral Proxies — Not Confirmed Leaders.</span> Power rank does not equal leadership. These signatures identify governors whose behavior suggests influence or coordination.</p>
              </div>
              {ai?.leadershipAssessment && <div className="bg-[#0f1115] border border-amber-500/20 rounded-lg p-4"><div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1">AI Leadership Assessment</div><p className="text-gray-300 text-sm">{ai.leadershipAssessment}</p></div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[{title:'Operators',color:'orange',desc:'High KP, low power grind — likely coordinating.',items:kdd.behavioralSigs?.operators||[],render:g=><><div className="text-[10px] text-gray-600">KP +{fmt(g.kpDelta)} | Pwr {g.powerDelta>=0?'+':''}{fmt(g.powerDelta)}</div></>},
                  {title:'Veterans',color:'violet',desc:'High accumulated power, quiet this window.',items:kdd.behavioralSigs?.veterans||[],render:g=><><div className="text-[10px] text-gray-600">{fmt(g.powerEnd)} total | Δ {g.powerDelta>=0?'+':''}{fmt(g.powerDelta)}</div></>},
                  {title:'Gravity Centers',color:'fuchsia',desc:'Alliances attracting new migrants.',items:kdd.followSignals||[],isFollow:true}
                ].map(({title,color,desc,items,render,isFollow})=>(
                  <div key={title} className={`bg-[#0a0c0f] border border-${color}-500/20 rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2"><div className={`w-2 h-2 rounded-full bg-${color}-400`}/><div className={`text-[10px] uppercase font-bold text-${color}-400 tracking-wider`}>{title}</div></div>
                    <div className="text-[10px] text-gray-600 mb-3">{desc}</div>
                    <div className="space-y-1.5">
                      {items.length===0 && <div className="text-gray-700 text-xs italic">None detected</div>}
                      {items.map((g,i)=>isFollow?(
                        <div key={i} className="text-xs">
                          <div className="flex items-center gap-1.5"><span className="text-fuchsia-400 font-mono font-bold">[{g.leaderAlliance}]</span><span className="text-gray-500">{g.followerCount} arrival{g.followerCount!==1?'s':''}</span></div>
                          <div className="text-[10px] text-gray-600 truncate">{g.followers.join(', ')}</div>
                        </div>
                      ):(
                        <div key={g.id} className="text-xs">
                          <div className="flex items-center gap-1.5"><span className={`text-${color}-400/70 font-mono`}>[{g.alliance}]</span><span className="text-gray-200 font-medium flex-1 truncate">{g.name}</span></div>
                          {render(g)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spenders */}
          {tab==='spenders' && (
            <div className="p-6 space-y-4">
              <div className="text-xs text-gray-500">Governors who gained <span className="text-amber-400 font-bold">500k+</span> power in the selected window. <span className="text-blue-400">[NEW]</span> = migrated in.</div>
              {kdd.whales?.length===0 && <div className="text-gray-600 text-sm italic text-center py-8">No high-velocity spenders detected.</div>}
              <div className="grid grid-cols-1 gap-1.5">
                {kdd.whales?.map((w,i)=>(
                  <div key={i} className="flex items-center gap-3 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2">
                    <span className="text-gray-600 font-mono text-xs w-4 text-right">{i+1}</span>
                    <span className="text-cyan-400 text-xs font-bold">[{w.alliance}]</span>
                    <span className="text-gray-200 text-sm font-medium flex-1">{w.name}</span>
                    {w.isMigrant && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">NEW</span>}
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${mb(w.powerDelta)}`}>{mbt(w.powerDelta)}</span>
                    <span className="text-gray-300 font-mono text-xs">+{fmt(w.powerDelta)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="text-center text-[10px] font-black uppercase tracking-widest text-gray-700">
          Powered by Unity Combat Intelligence · unity-v2.vercel.app
        </div>
      </div>
    </div>
  );
}
