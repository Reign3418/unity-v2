"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Lock, ShieldAlert, Key, Database, Users, Trash2, Save, Skull, 
  UserMinus, Activity, RefreshCw 
} from "lucide-react";

// Global SPA cache to eliminate redundant DynamoDB/Vercel fetch latency during route navigation
let globalMatrixCache = null;
let globalMatrixTimestamp = 0;

export default function AdminConsole() {
  const { data: session } = useSession();
  
  // Initialize state directly from the silent cache if it exists
  const [isLoading, setIsLoading] = useState(!globalMatrixCache);
  const [awsEnv, setAwsEnv] = useState(globalMatrixCache?.env || { region: "Scanning...", tableName: "Scanning..." });
  const [users, setUsers] = useState(globalMatrixCache?.users || []);
  const [tenants, setTenants] = useState(globalMatrixCache?.tenants || []);
  
  const [purgeTarget, setPurgeTarget] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    // Only fetch if session is valid and verified as Super Admin
    if (session?.user?.isSuperAdmin) {
      // If we have data from the last 60 seconds, don't brutally hammer AWS
      if (globalMatrixCache && Date.now() - globalMatrixTimestamp < 60000) {
        setIsLoading(false);
        return;
      }
      fetchAdminMatrix();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  const fetchAdminMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/aws/admin");
      if (!res.ok) throw new Error("Failed to fetch AWS Admin nodes.");
      const data = await res.json();
      
      setAwsEnv(data.env);
      setUsers(data.users || []);
      setTenants(data.tenants || []);
      
      // Update the Global Memory Hook
      globalMatrixCache = data;
      globalMatrixTimestamp = Date.now();
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDatumPurge = async () => {
    if (!purgeTarget) return alert("Must provide a Kingdom ID to purge.");
    
    if (!confirm(`WARNING: PURGE PROTOCOL INITIATED.\n\nAre you absolutely sure you want to permanently delete ALL Scan Data for Kingdom ${purgeTarget}?\n\nThis cannot be undone.`)) {
      return;
    }

    setIsPurging(true);
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PURGE_KINGDOM",
          payload: { kingdomId: purgeTarget }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`[AWS SUCCESS]: ${data.message}`);
      setPurgeTarget("");
    } catch (e) {
      alert(`[AWS FAILURE]: ${e.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  // If somehow a non-master admin routes here, block the UI entirely
  if (session && !session.user?.isSuperAdmin) {
    return (
      <div className="flex bg-[#0f1115] min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <ShieldAlert size={64} className="text-rose-500 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-rose-500 tracking-widest mb-2">ACCESS DENIED</h1>
          <p className="text-gray-400">Master Creator Clearance Required.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex bg-[#0f1115] min-h-[80vh] items-center justify-center flex-col text-indigo-500">
        <RefreshCw size={48} className="animate-spin mb-4" />
        <span className="font-mono font-bold uppercase tracking-widest text-sm animate-pulse">Decrypting AWS Environment Vault...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 mt-4 relative z-10">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-rose-500 border-r-rose-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(244,63,94,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjQ0LCA2MyLCA5NCwgMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>

        <div className="flex items-center justify-between relative z-10 w-full">
          <div className="flex items-center gap-4">
            <Lock className="text-rose-500" size={32} />
            <div>
              <h1 className="text-3xl font-black text-white tracking-widest uppercase">Global Cloud Control</h1>
              <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Authorized Protocol: Execution Parameters Unlocked</p>
            </div>
          </div>
          <button 
            onClick={() => {
              globalMatrixTimestamp = 0; // Force a hard reboot
              fetchAdminMatrix();
            }} 
            className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-[#1e222b]"
            title="Force Matrix Sync"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin text-cyan-500" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: API Configurations */}
        <div className="lg:col-span-1 space-y-8">
          
          <div className="bg-[#13161c] border border-[#1e222b] rounded-2xl overflow-hidden shadow-lg border-t-2 border-t-amber-500 relative">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
              <Key className="text-amber-500" size={20} />
              <h2 className="text-white font-bold">AWS Gateway Link</h2>
            </div>
            <div className="p-6 space-y-5">
              
              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Live Region Router</label>
                <div className="w-full bg-[#0a0c0f] border border-amber-500/50 text-amber-500 px-4 py-3 rounded-lg font-mono text-sm shadow-[inset_0_0_15px_rgba(245,158,11,0.1)] flex items-center gap-2">
                  <Activity size={14} className="animate-pulse" /> {awsEnv.region}
                </div>
              </div>

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">CloudDB Master Target</label>
                <div className="w-full bg-[#0a0c0f] border border-amber-500/50 text-amber-500 px-4 py-3 rounded-lg font-mono text-sm shadow-[inset_0_0_15px_rgba(245,158,11,0.1)] flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                  <Database size={14} className="animate-pulse flex-shrink-0" /> {awsEnv.tableName}
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs leading-relaxed font-bold">
                <span className="block mb-1 text-[10px] uppercase tracking-wider text-rose-500">Security Notice</span>
                Gateway Variables are now securely locked onto the Vercel Node runtime. They cannot be edited directly via Browser Dashboards.
              </div>

            </div>
          </div>

          <div className="bg-[#13161c] border border-[#1e222b] rounded-2xl overflow-hidden shadow-lg border-t-2 border-t-rose-600 relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(225,29,72,0.15)]">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
              <Skull className="text-rose-600" size={20} />
              <h2 className="text-white font-bold">Danger Zone</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Target KD Payload</label>
              <input 
                type="text" 
                placeholder="Ex. 3155"
                value={purgeTarget}
                onChange={(e) => setPurgeTarget(e.target.value)}
                className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm focus:border-rose-500 transition-colors outline-none" 
              />
              <button 
                onClick={executeDatumPurge}
                disabled={isPurging}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none disabled:border border-transparent text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all py-4 text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(225,29,72,0.4)]"
              >
                {isPurging ? <RefreshCw className="animate-spin" size={18} /> : <Skull size={18} />} 
                Purge Kingdom Database
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: User Clearance Logs */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl border-t-2 border-t-cyan-500 relative">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
              <div className="flex items-center gap-3">
                <Users className="text-cyan-500" size={20} />
                <h2 className="text-white font-bold">Identity & Authorization Matrix</h2>
              </div>
              <span className="text-xs bg-[#1e222b] text-gray-400 px-3 py-1 rounded-full">{users.length} Active Identity Links</span>
            </div>

            <div className="p-6 space-y-8 h-[750px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
              
              {/* Authorized Tenants */}
              <div>
                <h3 className="text-indigo-500 font-bold text-xs uppercase tracking-wider mb-4 border-b border-[#1e222b] pb-2 flex items-center justify-between">
                  <span>Registered Discord Gateways</span>
                  <span className="text-gray-500">{tenants.length} Guilds</span>
                </h3>
                <div className="space-y-3">
                  {tenants.map(tenant => (
                    <div key={tenant.guildId} className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 flex flex-col justify-between gap-3 group relative overflow-hidden">
                      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>
                      <div className="flex items-center gap-4 w-full">
                         <Database className="text-indigo-500 opacity-50 block" size={24} />
                         <div>
                            <div className="text-white font-bold text-sm tracking-widest font-mono">GUILD: {tenant.guildId}</div>
                            <div className="flex items-center gap-4 mt-1">
                               <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold bg-[#1e222b] px-2 py-0.5 rounded">
                                  Default KD: {tenant.kingdomId}
                               </span>
                               <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold bg-[#1e222b] px-2 py-0.5 rounded">
                                  Commander Role ID: {tenant.leadershipRoleId}
                               </span>
                            </div>
                         </div>
                      </div>
                      <div className="w-full h-[1px] bg-[#1e222b] my-1"></div>
                      <div className="text-xs text-indigo-400 font-bold flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                         <span className="text-gray-500">Allowed Routing KDs: </span> 
                         {tenant.allowedKingdoms?.length > 0 ? tenant.allowedKingdoms.join(", ") : tenant.kingdomId}
                      </div>
                    </div>
                  ))}
                  {tenants.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-[#1e222b] rounded-xl text-gray-500 text-sm font-bold">
                      No Tenant Guilds Installed
                    </div>
                  )}
                </div>
              </div>

              {/* Authorized Users */}
              <div>
                <h3 className="text-cyan-500 font-bold text-xs uppercase tracking-wider mb-4 border-b border-[#1e222b] pb-2 flex items-center justify-between">
                  <span>Verified Architecture Commanders</span>
                  <span className="text-gray-500">{users.filter(u => u.role !== "User").length} Commanders</span>
                </h3>
                <div className="space-y-3">
                  {users.filter(u => u.role !== "User" || u.isManualGuest).map(user => (
                    <div key={user.discordId} className="bg-[#0a0c0f] border border-cyan-500/20 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors relative overflow-hidden">
                      <div className="absolute right-0 top-0 h-full w-1 focus:outline-none bg-gradient-to-b from-cyan-500/50 to-transparent"></div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${user.discordId}/${session?.user?.avatar || ""}.png`} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full border border-cyan-500/30"
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png" }}
                        />
                        <div>
                          <div className="text-white font-bold font-mono">{user.discordId}</div>
                          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">{user.role || (user.isManualGuest ? "Guest Access" : "Admin Level")} | {user.governorIds?.length || 0} Linked Govs</div>
                        </div>
                      </div>
                      <button className="w-full sm:w-auto px-4 py-2 bg-[#1e222b] hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-rose-500/30">
                        Revoke Clearance
                      </button>
                    </div>
                  ))}
                </div>
              </div>

               {/* Standard Users */}
               <div>
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-4 border-b border-[#1e222b] pb-2 flex justify-between">
                  <span>Standard Infantry Nodes</span>
                  <span className="text-gray-600">{users.filter(u => u.role === "User").length} Soldiers</span>
                </h3>
                <div className="space-y-3">
                  {users.filter(u => u.role === "User").map(user => (
                    <div key={user.discordId} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 flex justify-between items-center gap-4 opacity-75 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#1e222b] flex items-center justify-center text-gray-500 text-xs font-bold">U</div>
                        <div>
                          <div className="text-gray-300 font-bold text-sm font-mono">{user.discordId}</div>
                          <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{user.governorIds?.length || 0} Game Profiles</div>
                        </div>
                      </div>
                      <button className="w-8 h-8 rounded shrink-0 bg-[#1e222b] flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {users.filter(u => u.role === "User").length === 0 && (
                    <div className="text-center py-6 border border-dashed border-[#1e222b] rounded-xl text-gray-500 text-sm font-bold">
                      No standard profiles found.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
