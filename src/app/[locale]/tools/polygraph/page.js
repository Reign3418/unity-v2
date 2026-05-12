"use client";
import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Shield, Users, Zap, ChevronUp, ChevronDown, CheckCircle2, Crown, UserPlus, UserMinus, ArrowUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";

function Tooltip({ text, children }) {
  if (!text) return children;
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute z-50 bottom-full mb-2 right-0 w-72 p-3 bg-[#0a0c0f] border border-[#2d323e] rounded-xl shadow-2xl text-xs text-gray-300 leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {text}
        <div className="absolute bottom-[-5px] right-4 w-2.5 h-2.5 bg-[#0a0c0f] border-r border-b border-[#2d323e] rotate-45" />
      </div>
    </div>
  );
}

export default function Polygraph() {
  const { data: session } = useSession();
  const t = useTranslations("Polygraph");
  const locale = useLocale();
  const defaultKd = session?.user?.allowedKingdoms?.[0] || "2648";
  const [kd, setKd] = useState(defaultKd);
  const [endDate, setEndDate] = useState("");
  const [timeframe, setTimeframe] = useState("48");
  const [depth, setDepth] = useState(300);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [sort, setSort] = useState({ key: "powerDelta", dir: "desc" });
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = sessionStorage;
    if (s.getItem("pg_kd")) setKd(s.getItem("pg_kd"));
    if (s.getItem("pg_end")) setEndDate(s.getItem("pg_end"));
    if (s.getItem("pg_tf")) setTimeframe(s.getItem("pg_tf"));
    if (s.getItem("pg_depth")) setDepth(parseInt(s.getItem("pg_depth")));
    if (s.getItem("pg_data")) setData(JSON.parse(s.getItem("pg_data")));
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || typeof window === "undefined") return;
    sessionStorage.setItem("pg_kd", kd);
    sessionStorage.setItem("pg_end", endDate);
    sessionStorage.setItem("pg_tf", timeframe);
    sessionStorage.setItem("pg_depth", String(depth));
    if (data) sessionStorage.setItem("pg_data", JSON.stringify(data));
    else sessionStorage.removeItem("pg_data");
  }, [kd, endDate, timeframe, depth, data, restored]);

  useEffect(() => {
    if (!defaultKd || !restored || sessionStorage.getItem("pg_end")) return;
    fetch(`/api/aws/trends?kd=${defaultKd}`).then(r => r.json()).then(d => {
      if (d.trends?.length) {
        const sorted = d.trends.sort((a,b) => new Date(a.scanDate)-new Date(b.scanDate));
        setEndDate(sorted[sorted.length-1].scanDate.split("T")[0].split(" ")[0]);
      }
    }).catch(() => {});
  }, [defaultKd, restored]);

  const scan = async () => {
    if (!kd || !endDate) { setError(t("err_provide_input")); return; }
    setLoading(true); setError(null); setData(null);
    const anchor = new Date(endDate + "T23:59:59Z");
    const start = new Date(anchor.getTime() - parseInt(timeframe)*3600000).toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/aws/health-report?kds=${kd.trim()}&start=${start}&end=${endDate}&depth=${depth}&locale=${locale}`);
      const json = await res.json();
      if (res.ok && json.success) setData(json);
      else setError(json.error || t("err_scan_failed"));
    } catch(e) { setError(t("err_network")); }
    setLoading(false);
  };

  const sorted = (list) => [...(list||[])].sort((a,b) => {
    const va = a[sort.key]||0, vb = b[sort.key]||0;
    return sort.dir === "asc" ? va-vb : vb-va;
  });
  const doSort = (key) => setSort(s => ({ key, dir: s.key===key && s.dir==="desc" ? "asc" : "desc" }));
  const si = (k) => sort.key===k ? (sort.dir==="desc" ? "↓" : "↑") : "↕";

  const fmt = (n) => Math.abs(n) >= 1e6 ? `${(n/1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(Math.round(n/100)*100/1e3).toFixed(0)}k` : String(n||0);
  const fd = (n) => (n>0?"+":"")+fmt(n);
  const gc = (g) => g==="A"||g==="B" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : g==="C" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-rose-400 bg-rose-500/10 border-rose-500/30";
  const mb = (d) => { const m=Math.floor(d/1e6); return m>=3?"bg-rose-600 text-white":m>=2?"bg-fuchsia-600 text-white":m>=1?"bg-amber-500 text-black":"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"; };
  const mbt = (d) => { const m=Math.floor(d/1e6); return m>=1?`${m}M+`:"500k+"; };

  const kdd = data?.kingdom;
  const ai = data?.ai;
  const me = kdd?.metrics;

  const TABS = ["overview","alliance","migration","leadership","spenders"];
  const TLABELS = { overview:t("tab_overview"), alliance:t("tab_alliance_intel"), migration:t("tab_migration"), leadership:t("tab_leadership"), spenders:t("tab_spenders") };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4 md:p-8 animate-fade-in">

      {/* Header */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="flex flex-col md:flex-row md:items-end gap-4 relative z-10">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]"><Activity className="text-fuchsia-500" size={28}/></div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">{t("title")}</h1>
              <p className="text-fuchsia-400 text-xs font-bold uppercase tracking-[0.2em]">{t("subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t("kingdom_label")}</label>
              <input type="text" value={kd} onChange={e=>setKd(e.target.value)} placeholder="e.g. 2648" className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-fuchsia-500 px-3 py-2 rounded-lg font-mono font-bold outline-none w-32 transition-colors"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t("anchor_scan_label")}</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-fuchsia-500 px-3 py-2 rounded-lg text-xs font-mono outline-none cursor-pointer transition-colors" style={{colorScheme:"dark"}}/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t("timeframe_label")}</label>
              <select value={timeframe} onChange={e=>setTimeframe(e.target.value)} className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-fuchsia-500 px-3 py-2 rounded-lg text-xs font-bold outline-none cursor-pointer transition-colors">
                <option value="24">{t("hours_24")}</option><option value="48">{t("hours_48")}</option><option value="72">{t("hours_72")}</option><option value="96">{t("hours_96")}</option><option value="120">{t("hours_120")}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t("depth_label")}</label>
              <div className="flex bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-1">
                {[300,400].map(d=><button key={d} onClick={()=>setDepth(d)} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${depth===d?"bg-fuchsia-500/20 text-fuchsia-400":"text-gray-500 hover:text-gray-300"}`}>{d}</button>)}
              </div>
            </div>
            <button onClick={scan} disabled={loading} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(192,38,211,0.3)] transition-colors">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/> : <Zap size={16}/>} {t("btn_scan")}
            </button>
            {data && <button onClick={()=>{setData(null);sessionStorage.removeItem("pg_data");}} className="text-gray-600 hover:text-gray-400 text-xs font-bold py-2 px-3 rounded-lg border border-[#1e222b] transition-colors">{t("btn_clear")}</button>}
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3"><AlertTriangle size={16}/>{error}</div>}

      {/* Results */}
      {!loading && kdd && (
        <div className="bg-[#0d1017] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">

          {/* KD Header + Grade */}
          <div className="bg-[#15181e] px-6 py-4 border-b border-[#1e222b] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-fuchsia-500/20 text-fuchsia-400 font-black text-2xl px-4 py-1 rounded border border-fuchsia-500/30">KD {kdd.kd}</div>
              <div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">{t("roster_analyzed")}</div>
                <div className="text-gray-200 font-mono font-bold">{t("governors_count", {count: kdd.rosterSize})}</div>
              </div>
              {ai?.posture && <div className="flex items-center gap-1.5 bg-[#1e222b] px-3 py-1 rounded-full border border-[#2d323e]"><CheckCircle2 size={12} className="text-fuchsia-400"/><span className="text-xs font-bold text-gray-300">{ai.posture}</span></div>}
            </div>
            {ai && (
              <div className="flex items-center gap-4">
                <Tooltip text={ai.civilWarRationale}>
                  <div className="text-right cursor-help">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5 flex items-center justify-end gap-1">{t("civil_war_risk")} <span className="text-gray-700">(?)</span></div>
                    <div className={`font-mono font-black text-lg ${parseInt(ai.civilWarProbability)>50?"text-rose-400":"text-emerald-400"}`}>{ai.civilWarProbability}%</div>
                  </div>
                </Tooltip>
                <Tooltip text={ai.gradeRationale}>
                  <div className={`text-4xl font-black px-4 py-2 rounded border cursor-help ${gc(ai.grade)}`}>{ai.grade}</div>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1e222b] bg-[#0a0c0f] overflow-x-auto">
            {TABS.map(tabId=>(
              <button key={tabId} onClick={()=>setTab(tabId)} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${tab===tabId?"border-fuchsia-500 text-fuchsia-400":"border-transparent text-gray-500 hover:text-gray-300"}`}>
                {TLABELS[tabId]}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {tab === "overview" && (
            <div className="p-6 space-y-5">
              {/* Metric Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {label:t("metric_power"),val:me?.totalPowerGained,color:"text-fuchsia-400"},
                  {label:t("metric_troops"),val:me?.totalTroopPowerGained,color:"text-cyan-400"},
                  {label:t("metric_cmdr"),val:me?.totalCmdPowerGained,color:"text-amber-400"},
                  {label:t("metric_tech"),val:me?.totalTechPowerGained,color:"text-violet-400"},
                  {label:t("metric_deads"),val:me?.totalDeadsGained,color:"text-rose-400"},
                ].map(({label,val,color})=>(
                  <div key={label} className={`bg-[#0a0c0f] border rounded-lg p-4 text-center ${label===t("metric_deads")&&val>0?"border-rose-500/30":"border-[#1e222b]"}`}>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{label}</div>
                    <div className={`text-lg font-black font-mono ${color}`}>{val>0?"+":""}{fmt(val||0)}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{t("metric_kp_gained")}</div>
                  <div className="text-sm font-bold font-mono text-orange-400">+{fmt(me?.totalKPGained||0)}</div>
                </div>
                <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{t("metric_switchers")}</div>
                  <div className={`text-sm font-bold font-mono ${me?.switchersCount>5?"text-rose-400":"text-gray-300"}`}>{me?.switchersCount||0}</div>
                </div>
                <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{t("metric_spenders")}</div>
                  <div className={`text-sm font-bold font-mono ${me?.whalesCount>0?"text-amber-400":"text-gray-500"}`}>{me?.whalesCount||0}</div>
                </div>
              </div>
              {ai && (
                <div className="space-y-4">
                  <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-5">
                    <div className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider mb-2">{t("ai_diagnosis")}</div>
                    <p className="text-gray-300 text-sm leading-relaxed">{ai.diagnosis}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {label:t("ai_stability_index"),val:ai.stabilityIndex,color:"text-cyan-400"},
                      {label:t("ai_economic_intel"),val:ai.economicIntel,color:"text-amber-400"},
                      {label:t("ai_migrant_intel"),val:ai.migrantIntel,color:"text-violet-400"},
                      {label:t("ai_recommendation"),val:ai.recommendation,color:"text-emerald-400"},
                    ].map(({label,val,color})=>val&&(
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

          {/* Tab: Alliance Intel */}
          {tab === "alliance" && (
            <div className="p-6 space-y-4">
              {ai?.conflictTheories?.length > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-rose-400"/><div className="text-xs font-bold text-rose-400 uppercase tracking-wider">{t("ai_conflict_theories")}</div></div>
                  <ul className="space-y-2">{ai.conflictTheories.map((theory,i)=><li key={i} className="text-gray-400 text-xs flex items-start gap-2"><span className="text-rose-500/50 mt-0.5">•</span>{theory}</li>)}</ul>
                </div>
              )}
              <div className="overflow-x-auto border border-[#1e222b] rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#15181e] text-[10px] uppercase tracking-wider text-gray-500">
                    <tr>
                      {[["tag",t("col_tag")],["govCount",t("col_govs")],["powerDelta",t("col_power")],["troopDelta",t("col_troops")],["cmdDelta",t("col_cmdr")],["techDelta",t("col_tech")],["kpDelta",t("col_kp")],["deadsDelta",t("col_deads")]].map(([k,l])=>(
                        <th key={k} className="p-2 font-bold cursor-pointer hover:text-white transition-colors" onClick={()=>doSort(k)}>{l} <span className="text-gray-600 ml-1">{si(k)}</span></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e222b] text-xs font-mono">
                    {sorted(kdd.alliances).map(a=>(
                      <tr key={a.tag} className="hover:bg-[#15181e] transition-colors">
                        <td className="p-2 font-bold text-cyan-400">[{a.tag}]</td>
                        <td className="p-2 text-right text-gray-400">{a.govCount}</td>
                        <td className={`p-2 text-right font-bold ${a.powerDelta>=0?"text-emerald-400":"text-rose-400"}`}>{fd(a.powerDelta)}</td>
                        <td className={`p-2 text-right ${a.troopDelta>=0?"text-cyan-400":"text-rose-400"}`}>{fd(a.troopDelta)}</td>
                        <td className={`p-2 text-right ${a.cmdDelta>=0?"text-amber-400":"text-rose-400"}`}>{fd(a.cmdDelta)}</td>
                        <td className={`p-2 text-right ${a.techDelta>=0?"text-violet-400":"text-rose-400"}`}>{fd(a.techDelta)}</td>
                        <td className={`p-2 text-right ${a.kpDelta>0?"text-orange-400":"text-gray-600"}`}>{a.kpDelta>0?fd(a.kpDelta):"-"}</td>
                        <td className={`p-2 text-right ${a.deadsDelta>0?"text-rose-400 font-bold":"text-gray-600"}`}>{a.deadsDelta>0?fd(a.deadsDelta):"-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {kdd.switchers?.length>0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-3">{t("alliance_switchers")} ({kdd.switchers.length})</div>
                  <div className="space-y-1.5">
                    {kdd.switchers.map((s,i)=>(
                      <div key={i} className="flex items-center gap-3 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <span className="text-gray-300 font-medium flex-1">{s.name}</span>
                        <span className="text-rose-400 font-mono">[{s.from}]</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-emerald-400 font-mono">[{s.to}]</span>
                        <span className="text-gray-500 font-mono">{fmt(s.power)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Migration */}
          {tab === "migration" && (
            <div className="p-6 space-y-6">
              {ai?.migrantIntel && <div className="bg-[#0f1115] border border-violet-500/20 rounded-lg p-4"><div className="text-[10px] uppercase font-bold text-violet-400 tracking-wider mb-1">{t("migration_intel")}</div><p className="text-gray-300 text-sm">{ai.migrantIntel}</p></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3"><UserPlus size={14} className="text-emerald-400"/><div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t("new_arrivals")} ({kdd.migration?.newArrivals?.length||0})</div></div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {(kdd.migration?.newArrivals||[]).length === 0 && <div className="text-gray-600 text-xs italic">{t("no_new_arrivals")}</div>}
                    {(kdd.migration?.newArrivals||[]).map((a,i)=>(
                      <div key={i} className="flex items-center gap-2 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <span className="text-[10px] font-bold text-cyan-400">[{a.alliance||"?"}]</span>
                        <span className="text-gray-300 font-medium flex-1">{a.name}</span>
                        <span className="text-emerald-400 font-mono">{fmt(a.power)}</span>
                        {a.isWhale && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-black">WHALE</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3"><UserMinus size={14} className="text-rose-400"/><div className="text-xs font-bold text-rose-400 uppercase tracking-wider">{t("departed")} ({kdd.migration?.departed?.length||0})</div></div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {(kdd.migration?.departed||[]).length === 0 && <div className="text-gray-600 text-xs italic">{t("no_departures")}</div>}
                    {(kdd.migration?.departed||[]).map((d,i)=>(
                      <div key={i} className="flex flex-col gap-1 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-400">[{d.alliance||"?"}]</span>
                          <span className="text-gray-300 font-medium flex-1">{d.name}</span>
                          <span className="text-gray-500 font-mono">{fmt(d.power)}</span>
                        </div>
                        {d.destination && d.destination !== "Unknown" && <div className="text-[10px] text-gray-600 pl-1">{d.destination}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {kdd.followSignals?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider mb-3">{t("follow_signals")}</div>
                  <div className="space-y-2">
                    {kdd.followSignals.map((f,i)=>(
                      <div key={i} className="bg-[#0f1115] border border-fuchsia-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Crown size={12} className="text-fuchsia-400"/>
                          <span className="text-sm font-bold text-white">{f.leader}</span>
                          <span className="text-xs text-cyan-400 font-mono">[{f.leaderAlliance}]</span>
                          <span className="text-xs text-gray-500">{fmt(f.leaderPower)} power</span>
                        </div>
                        <div className="text-xs text-gray-400">{t("new_arrivals_joined", {count: f.followerCount})} [{f.leaderAlliance}]: <span className="text-gray-300">{f.followers.join(", ")}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ai?.followAnalysis && (
                <div className="bg-[#0f1115] border border-fuchsia-500/20 rounded-lg p-4">
                  <div className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider mb-1">{t("ai_follow_analysis")}</div>
                  <p className="text-gray-300 text-sm">{ai.followAnalysis}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Leadership */}
          {tab === "leadership" && (
            <div className="p-6 space-y-5">
              {ai?.leadershipAssessment && <div className="bg-[#0f1115] border border-amber-500/20 rounded-lg p-4"><div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1">{t("ai_leadership_assessment")}</div><p className="text-gray-300 text-sm">{ai.leadershipAssessment}</p></div>}
              {kdd.leadershipIntel && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {label:t("stability_score"),val:`${kdd.leadershipIntel.stabilityScore}%`,note:t("stability_note"),color:kdd.leadershipIntel.stabilityScore>=70?"text-emerald-400":kdd.leadershipIntel.stabilityScore>=40?"text-amber-400":"text-rose-400"},
                    {label:t("activity_rate"),val:`${kdd.leadershipIntel.activityRate}%`,note:t("activity_note"),color:kdd.leadershipIntel.activityRate>=70?"text-emerald-400":kdd.leadershipIntel.activityRate>=40?"text-amber-400":"text-rose-400"},
                    {label:t("power_concentration"),val:`${kdd.leadershipIntel.powerConcentration}%`,note:t("power_concentration_note"),color:"text-fuchsia-400"},
                  ].map(({label,val,note,color})=>(
                    <div key={label} className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                      <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{label}</div>
                      <div className={`text-2xl font-black font-mono ${color}`}>{val}</div>
                      <div className="text-[10px] text-gray-600 mt-1">{note}</div>
                    </div>
                  ))}
                </div>
              )}
              {kdd.leadershipIntel?.top10Snapshot?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-3">{t("top_10_governors")}</div>
                  <div className="space-y-1.5">
                    {kdd.leadershipIntel.top10Snapshot.map((g,i)=>(
                      <div key={g.id} className="flex items-center gap-3 bg-[#0a0c0f] border border-[#1e222b] rounded-md px-3 py-2 text-xs">
                        <span className="text-gray-600 font-mono w-4 text-right">{i+1}</span>
                        <span className="text-cyan-400 font-mono">[{g.alliance}]</span>
                        <span className="text-gray-200 font-medium flex-1">{g.name}</span>
                        <span className="text-gray-300 font-mono">{fmt(g.power)}</span>
                        <span className={`font-mono text-xs ${g.powerDelta>0?"text-emerald-400":g.powerDelta<0?"text-rose-400":"text-gray-600"}`}>{g.powerDelta>0?`+${fmt(g.powerDelta)}`:g.powerDelta<0?fmt(g.powerDelta):"—"}</span>
                        {g.isNew && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-fuchsia-600 text-white">{t("badge_climber")}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Spenders */}
          {tab === "spenders" && (
            <div className="p-6 space-y-4">
              <div className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: t.raw("spenders_desc").replace("<highlight>", '<span className="text-amber-400 font-bold">').replace("</highlight>", "</span>").replace("<new>", '<span className="text-blue-400">').replace("</new>", "</span>") }} />
              {kdd.whales?.length === 0 && <div className="text-gray-600 text-sm italic text-center py-8">{t("no_spenders")}</div>}
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
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500"/>
          <div className="text-gray-400 text-sm font-medium">{t("loading_sweep", {kd: kd})}</div>
          <div className="text-gray-600 text-xs">{t("loading_sub")}</div>
        </div>
      )}
    </div>
  );
}