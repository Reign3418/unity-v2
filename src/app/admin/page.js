"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Lock, ShieldAlert, Key, Database, Users, Trash2, Save, Skull, 
  UserMinus, Activity, RefreshCw, Bot, BotOff, CheckCircle, XCircle, Plus, Server, Clock, TextSelect, Radio
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
  const [uploadLogs, setUploadLogs] = useState(globalMatrixCache?.uploadLogs || []);

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
      
      const resLogs = await fetch("/api/aws/admin/uploads");
      const logsData = resLogs.ok ? await resLogs.json() : { uploads: [] };
      
      setAwsEnv(data.env);
      setUsers(data.users || []);
      setTenants(data.tenants || []);
      setPasscodes(data.passcodes || []);
      setPendingUsers(data.pendingUsers || []);
      setUploadLogs(logsData.uploads || []);
      
      // Update the Global Memory Hook
      globalMatrixCache = { ...data, uploadLogs: logsData.uploads };
      globalMatrixTimestamp = Date.now();
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTenantAi = async (guildId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      // Optimistic update
      setTenants(prev => prev.map(t => t.guildId === guildId ? { ...t, globalAiAccess: newStatus } : t));
      
      const res = await fetch("/api/aws/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_TENANT_AI", payload: { guildId, newStatus } })
      });
      if (!res.ok) throw new Error("Failed to update tenant AI access");
      
      // Update cache
      if (globalMatrixCache) {
        globalMatrixCache.tenants = globalMatrixCache.tenants.map(t => t.guildId === guildId ? { ...t, globalAiAccess: newStatus } : t);
      }
    } catch (e) {
      alert(e.message);
      fetchAdminMatrix(); // Revert on failure
    }
  };

  const toggleUserAi = async (discordId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      // Optimistic update
      setUsers(prev => prev.map(u => u.discordId === discordId ? { ...u, globalAiAccess: newStatus } : u));
      
      const res = await fetch("/api/aws/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_USER_AI", payload: { discordId, newStatus } })
      });
      if (!res.ok) throw new Error("Failed to update user AI access");
      
      // Update cache
      if (globalMatrixCache) {
        globalMatrixCache.users = globalMatrixCache.users.map(u => u.discordId === discordId ? { ...u, globalAiAccess: newStatus } : u);
      }
    } catch (e) {
      alert(e.message);
      fetchAdminMatrix(); // Revert on failure
    }
  };

  const handleEditTenantNotes = async (guildId, currentNotes) => {
    const newNotes = window.prompt(`Enter tracking notes/infractions for Server ${guildId}:`, currentNotes || "");
    if (newNotes === null) return; // Cancelled
    
    try {
      // Optimistic Update
      setTenants(prev => prev.map(t => t.guildId === guildId ? { ...t, notes: newNotes } : t));
      
      const res = await fetch("/api/aws/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_TENANT_NOTES", payload: { guildId, notes: newNotes } })
      });
      if (!res.ok) throw new Error("Failed to save Tenant notes");
      
      if (globalMatrixCache) {
        globalMatrixCache.tenants = globalMatrixCache.tenants.map(t => t.guildId === guildId ? { ...t, notes: newNotes } : t);
      }
    } catch (e) {
      alert(e.message);
      fetchAdminMatrix();
    }
  };

  const handleEditUserNotes = async (discordId, currentNotes) => {
    const newNotes = window.prompt(`Enter tracking notes/infractions for User ${discordId}:`, currentNotes || "");
    if (newNotes === null) return; // Cancelled
    
    try {
      // Optimistic Update
      setUsers(prev => prev.map(u => u.discordId === discordId ? { ...u, notes: newNotes } : u));
      
      const res = await fetch("/api/aws/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_USER_NOTES", payload: { discordId, notes: newNotes } })
      });
      if (!res.ok) throw new Error("Failed to save User notes");
      
      if (globalMatrixCache) {
        globalMatrixCache.users = globalMatrixCache.users.map(u => u.discordId === discordId ? { ...u, notes: newNotes } : u);
      }
    } catch (e) {
      alert(e.message);
      fetchAdminMatrix();
    }
  };

  // --- LEGACY ADMIN PORT STATE AND HANDLERS ---
  const [passcodes, setPasscodes] = useState(globalMatrixCache?.passcodes || []);
  const [pendingUsers, setPendingUsers] = useState(globalMatrixCache?.pendingUsers || []);
  
  // Forms
  const [passForm, setPassForm] = useState({ kingdomId: "", role: "Member", poc: "", expireDays: "7" });
  const [manualUserForm, setManualUserForm] = useState({ discordId: "", poc: "", kingdomId: "", role: "Member" });
  const [tenantForm, setTenantForm] = useState({ guildId: "", kingdomId: "" });

  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("ALL");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert("Message cannot be empty.");
    
    // Safety prompt differs based on scope
    const isGlobal = broadcastTarget === "ALL";
    const promptMsg = isGlobal 
        ? "Are you sure you want to blast this maintenance alert to ALL connected Discord servers natively?"
        : `Are you sure you want to dispatch a targeted webhook exclusively to Kingdom ${broadcastTarget}?`;
        
    if (!confirm(promptMsg)) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch("/api/aws/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMessage, targetKingdom: broadcastTarget })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to broadcast");
      alert(`Successfully broadcasted to ${data.targetsReached} actively connected Guilds!`);
      setBroadcastMessage("");
    } catch (e) {
      alert(`Broadcast Failed: ${e.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Update fetchAdminMatrix assignment payload natively
  useEffect(() => {
    if (globalMatrixCache) {
      setPasscodes(globalMatrixCache.passcodes || []);
      setPendingUsers(globalMatrixCache.pendingUsers || []);
    }
  }, [isLoading]);

  const handleGeneratePasscode = async () => {
    if (!passForm.kingdomId || !passForm.poc) return alert("Kingdom and POC required.");
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GENERATE_GUEST_PASSCODE", payload: passForm })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Passcode Generated: ${data.passcode}`);
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleRevokePasscode = async (passcode) => {
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_GUEST_PASSCODE", payload: { passcode } })
      });
      if (!res.ok) throw new Error("Failed to revoke.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleApprovePending = async (discordId, kingdomId, role) => {
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_MANUAL_USER", payload: { discordId, kingdomId, role } })
      });
      if (!res.ok) throw new Error("Failed to approve.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleRejectPending = async (discordId) => {
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT_MANUAL_USER", payload: { discordId } })
      });
      if (!res.ok) throw new Error("Failed to reject.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleAddManualUser = async () => {
    if (!manualUserForm.discordId || !manualUserForm.poc || !manualUserForm.kingdomId) return alert("All fields required.");
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_GLOBAL_MANUAL_USER", payload: manualUserForm })
      });
      if (!res.ok) throw new Error("Failed to add manual user.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleAddBonusKingdom = async () => {
    if (!tenantForm.guildId || !tenantForm.kingdomId) return alert("Server ID and Kingdom required.");
    try {
        const res = await fetch("/api/aws/admin", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "ADD_TENANT_KINGDOM", payload: { guildId: tenantForm.guildId, newKingdomId: tenantForm.kingdomId } })
        });
        if (!res.ok) throw new Error("Failed to add bonus kingdom.");
        fetchAdminMatrix();
    } catch (e) { alert(e.message); }
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
    <div className="w-full mx-auto space-y-8 animate-fade-in pb-12 mt-4 relative z-10">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-blue-500 border-r-blue-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(59,130,246,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjQ0LCA2MyLCA5NCwgMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>

        <div className="flex items-center justify-between relative z-10 w-full">
          <div className="flex items-center gap-4">
            <ShieldAlert className="text-blue-500" size={32} />
            <div>
              <h1 className="text-3xl font-black text-white tracking-widest uppercase">System Administrator Panel</h1>
              <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Authorized Operations • Identity Management</p>
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
        
        {/* Left Column: Tenant & User Management */}
        <div className="lg:col-span-1 space-y-8">
{/* Global Tenant Management */}
            <div className="border border-blue-500/20 bg-[#0a0c10] rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-50"></div>
              <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2"><Server size={18}/> Global Tenant Management</h3>
              
              <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-4 mb-4">
                <div className="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Grant Bonus Kingdom</div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Guild/Server ID" className="flex-1 bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" value={tenantForm.guildId} onChange={e => setTenantForm({...tenantForm, guildId: e.target.value})} />
                  <input type="number" placeholder="Kingdom ID (e.g. 3418)" className="w-1/3 bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" value={tenantForm.kingdomId} onChange={e => setTenantForm({...tenantForm, kingdomId: e.target.value})} />
                  <button onClick={handleAddBonusKingdom} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors"><Plus size={18}/></button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-none">
                {tenants.map(t => (
                  <div key={t.guildId} className="bg-[#161920] rounded p-3 text-sm flex flex-col gap-1 border border-transparent hover:border-blue-500/30 transition-colors">
                    <div className="flex justify-between font-mono">
                      <span className="text-blue-300">{t.guildId}</span>
                      <span className="text-gray-400 text-xs">{t.createdDate?.split('T')[0] || "Unknown"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                      <div className="bg-[#0a0c10] p-1.5 rounded border border-[#1e222b]">
                        <span className="text-gray-500 block">Primary Kingdom</span>
                        <span className="text-white font-bold">{t.kingdomId}</span>
                      </div>
                      <div className="bg-[#0a0c10] p-1.5 rounded border border-[#1e222b]">
                        <span className="text-gray-500 block">Bonus Domains</span>
                        <span className="text-indigo-400 font-bold">{t.allowedKingdoms?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

{/* Generate Web Passcode */}
            <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl p-6 relative">
              <h3 className="text-gray-300 font-bold mb-4 flex items-center gap-2"><Activity size={18}/> Generate Web Guest Passcode</h3>
               <div className="grid grid-cols-2 gap-3 mb-3">
                 <input type="text" placeholder="POC Nickname" className="bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" value={passForm.poc} onChange={e => setPassForm({...passForm, poc: e.target.value})} />
                 <input type="number" placeholder="Target Kingdom (e.g. 3418)" className="bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" value={passForm.kingdomId} onChange={e => setPassForm({...passForm, kingdomId: e.target.value})} />
                 <select className="bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" value={passForm.role} onChange={e => setPassForm({...passForm, role: e.target.value})}>
                    <option value="Member">R4/Member</option>
                    <option value="Leader">R5/Leader</option>
                    <option value="Admin">System Admin (CAUTION)</option>
                 </select>
                 <select className="bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" value={passForm.expireDays} onChange={e => setPassForm({...passForm, expireDays: e.target.value})}>
                    <option value="1">Expire in 24 Hours</option>
                    <option value="3">Expire in 3 Days</option>
                    <option value="7">Expire in 7 Days</option>
                    <option value="30">Expire in 30 Days</option>
                 </select>
               </div>
               <button onClick={handleGeneratePasscode} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 rounded py-2 text-sm font-bold uppercase tracking-widest transition-all">Generate 6-Digit Slice</button>
            </div>

{/* Active Guest Passcodes */}
            <div className="border border-green-500/20 bg-[#0a0c10] rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-600 opacity-50"></div>
              <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><Key size={18}/> Active Guest Passcodes</h3>
              
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-none">
                 {passcodes.length === 0 && <div className="text-gray-600 text-xs font-bold text-center py-4 border border-dashed border-[#1e222b] rounded">No active guest passes circulating.</div>}
                 {passcodes.map(p => (
                   <div key={p.passcode} className="bg-[#161920] border border-[#1e222b] rounded p-3 flex justify-between items-center group hover:border-emerald-500/30">
                     <div>
                       <div className="text-emerald-400 font-mono font-bold tracking-widest text-lg">{p.passcode}</div>
                       <div className="text-[10px] text-gray-500 uppercase tracking-wider flex gap-2">
                          <span>{p.playerName}</span> • <span>KD {p.kingdomId}</span> • <span>{p.role}</span>
                       </div>
                       <div className="text-[10px] text-emerald-600 font-bold mt-1 inline-block"><Clock size={10} className="inline mr-1"/> Expires: {new Date(p.expiresAt).toLocaleDateString()}</div>
                     </div>
                     <button onClick={() => handleRevokePasscode(p.passcode)} className="text-gray-600 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                   </div>
                 ))}
              </div>
            </div>

{/* Pending & Approved Manual Users */}
            <div className="border border-indigo-500/20 bg-[#0a0c10] rounded-xl p-6 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-50"></div>
               <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2"><Users size={18}/> Web User Approval Queue</h3>
               
               {/* Queued Approvals */}
               <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-none mb-6">
                 {pendingUsers.length === 0 && <div className="text-gray-600 text-xs font-bold text-center py-4 border border-dashed border-[#1e222b] rounded">No users awaiting manual clearance.</div>}
                 {pendingUsers.map(u => (
                    <div key={u.SK} className="bg-[#161920] border border-indigo-500/30 rounded p-3 flex justify-between items-center group">
                      <div>
                         <div className="text-indigo-300 font-bold text-sm">{u.attributes?.username?.S || (u.SK?.S || u.SK || '').replace('USER#', '')}</div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-wider">KD {u.attributes?.targetKingdom?.S || "Unknown"} | Discord ID {(u.SK?.S || u.SK || '').replace('USER#', '')}</div>
                      </div>
                      <div className="flex gap-2 opacity-100">
                         <button onClick={() => handleApprovePending((u.SK?.S || u.SK || '').replace('USER#', ''), u.attributes?.targetKingdom?.S || "0", "Member")} className="text-emerald-500 hover:bg-emerald-500/20 p-1.5 rounded transition-colors" title="Approve Request"><CheckCircle size={18}/></button>
                         <button onClick={() => handleRejectPending((u.SK?.S || u.SK || '').replace('USER#', ''))} className="text-rose-500 hover:bg-rose-500/20 p-1.5 rounded transition-colors" title="Reject Request"><XCircle size={18}/></button>
                      </div>
                    </div>
                 ))}
               </div>

               {/* Force Add Web User */}
               <div className="pt-4 border-t border-[#1e222b]">
                 <div className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Force Add Global Web User</div>
                 <div className="grid grid-cols-2 gap-2 mb-2">
                   <input type="text" placeholder="Target Discord ID" className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.discordId} onChange={e => setManualUserForm({...manualUserForm, discordId: e.target.value})} />
                   <input type="text" placeholder="Alias / POC" className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.poc} onChange={e => setManualUserForm({...manualUserForm, poc: e.target.value})} />
                   <input type="number" placeholder="Kingdom (e.g 3418)" className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.kingdomId} onChange={e => setManualUserForm({...manualUserForm, kingdomId: e.target.value})} />
                   <select className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.role} onChange={e => setManualUserForm({...manualUserForm, role: e.target.value})}>
                      <option value="Member">Member</option>
                      <option value="Leader">Leader</option>
                   </select>
                 </div>
                 <button onClick={handleAddManualUser} className="w-full bg-[#1e222b] hover:bg-indigo-600 text-white rounded py-1.5 text-xs font-bold uppercase tracking-widest transition-all">Direct Inject Profile</button>
               </div>
            </div>

{/* GLOBAL MAINTENANCE BROADCAST */}
            <div className="border border-rose-500/30 bg-[#130000] rounded-xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(225,29,72,0.1)]">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
               <h3 className="text-rose-500 font-bold mb-4 flex items-center gap-2"><Radio size={18} className="animate-pulse"/> Global Broadcast Terminal</h3>
               
               <p className="text-xs text-rose-300/70 mb-3 leading-relaxed">
                 Bypass all server caches and inject an administrative alert natively into connected Discord server channels.
               </p>
               
               <div className="mb-3">
                 <select 
                   className="w-full bg-[#1a0505] border border-rose-500/30 rounded p-2 text-sm text-white focus:outline-none focus:border-rose-500 font-bold"
                   value={broadcastTarget}
                   onChange={e => setBroadcastTarget(e.target.value)}
                   disabled={isBroadcasting}
                 >
                   <option value="ALL">🚨 ALL REGISTERED KINGDOMS GLOBAL BLAST</option>
                   
                   <optgroup label="Target by Kingdom Integration">
                     {Array.from(new Set(tenants.map(t => t.kingdomId))).filter(Boolean).sort((a,b)=>a-b).map(kd => (
                       <option key={`kd-${kd}`} value={kd}>Target Webhook: Kingdom {kd}</option>
                     ))}
                   </optgroup>

                   <optgroup label="Target by Specific Discord Server ID">
                     {tenants.map(t => (
                       <option key={`guild-${t.guildId}`} value={t.guildId}>Server Token: {t.guildId} (KD {t.kingdomId})</option>
                     ))}
                   </optgroup>
                 </select>
               </div>
               
               <textarea 
                 className="w-full bg-[#0a0000] border border-rose-500/30 rounded p-3 text-sm text-white focus:outline-none focus:border-rose-500 min-h-[100px] mb-3 resize-none font-mono"
                 placeholder="Enter targeted notification or update details here..."
                 value={broadcastMessage}
                 onChange={e => setBroadcastMessage(e.target.value)}
                 disabled={isBroadcasting}
               ></textarea>
               
               <button 
                 onClick={handleBroadcast} 
                 disabled={isBroadcasting || !broadcastMessage.trim()}
                 className={`w-full py-3 rounded text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                   isBroadcasting || !broadcastMessage.trim() 
                     ? 'bg-[#1a0505] text-rose-500/30 border border-rose-500/10 cursor-not-allowed' 
                     : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                 }`}
               >
                 {isBroadcasting ? <RefreshCw size={18} className="animate-spin" /> : <Radio size={18} />}
                 {isBroadcasting ? 'TRANSMITTING...' : 'INITIATE OVERRIDE'}
               </button>
            </div>
        </div>

        {/* Right Column: Identity Matrix */}
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
                      <div className="flex items-center justify-between gap-4 w-full z-10">
                         <div className="flex items-center gap-4">
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
                              {/* Display Notes if they exist */}
                              <div className="mt-2 text-xs text-gray-400 italic">
                                {tenant.notes ? `"${tenant.notes}"` : "No tracking notes."}
                              </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2 shrink-0">
                           <button 
                              onClick={() => handleEditTenantNotes(tenant.guildId, tenant.notes)}
                              className="p-2 rounded-lg bg-[#1e222b] border border-[#1e222b] text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                              title="Edit Tracking Notes"
                           >
                              📝
                           </button>
                           <button 
                              onClick={() => toggleTenantAi(tenant.guildId, tenant.globalAiAccess)}
                              className={`p-2 rounded-lg border transition-all ${tenant.globalAiAccess ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}
                              title={tenant.globalAiAccess ? "Global AI Active - Click to Disable" : "Global AI Disabled - Click to Enable"}
                           >
                              {tenant.globalAiAccess ? <Bot size={18} /> : <BotOff size={18} />}
                           </button>
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
                          <div className="text-[10px] text-gray-500 italic mt-1 max-w-[200px] sm:max-w-[300px] truncate" title={user.notes}>
                            {user.notes ? `"${user.notes}"` : "No tracking notes"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto z-10 mt-3 sm:mt-0">
                        <button 
                          onClick={() => handleEditUserNotes(user.discordId, user.notes)}
                          className="p-2 rounded-lg bg-[#1e222b] border border-[#1e222b] text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                          title="Edit Tracking Notes"
                        >
                          📝
                        </button>
                        <button 
                          onClick={() => toggleUserAi(user.discordId, user.globalAiAccess)}
                          className={`p-2 rounded-lg border transition-all ${user.globalAiAccess ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}
                          title={user.globalAiAccess ? "Global AI Active - Click to Disable" : "Global AI Disabled - Click to Enable"}
                        >
                          {user.globalAiAccess ? <Bot size={18} /> : <BotOff size={18} />}
                        </button>
                        <button className="flex-1 sm:flex-none px-4 py-2 bg-[#1e222b] hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-rose-500/30">
                          Revoke Clearance
                        </button>
                      </div>
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
                          <div className="text-[10px] text-gray-600 font-medium italic truncate max-w-[150px] mt-0.5">
                             {user.notes ? `"${user.notes}"` : "No tracking notes"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 z-10">
                        <button 
                          onClick={() => handleEditUserNotes(user.discordId, user.notes)}
                          className="w-8 h-8 rounded bg-[#1e222b] border border-[#1e222b] flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Edit Tracking Notes"
                        >
                          📝
                        </button>
                        <button 
                          onClick={() => toggleUserAi(user.discordId, user.globalAiAccess)}
                          className={`w-8 h-8 rounded flex items-center justify-center transition-all border ${user.globalAiAccess ? 'bg-[#1e222b] border-[#1e222b] text-cyan-500 hover:bg-cyan-500/10 hover:border-cyan-500/30' : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.2)]'}`}
                          title={user.globalAiAccess ? "Global AI Active - Click to Disable" : "Global AI Disabled - Click to Enable"}
                        >
                          {user.globalAiAccess ? <Bot size={14} /> : <BotOff size={14} />}
                        </button>
                        <button className="w-8 h-8 rounded bg-[#1e222b] border border-[#1e222b] flex items-center justify-center text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
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

      {/* ========================================================= */}
      {/* GLOBAL CLOUD CONTROL PANEL                                */}
      {/* ========================================================= */}
      
      <div className="mt-16 pt-12 border-t border-[#1e222b]">
        <div className="mb-8">
           <h2 className="text-3xl font-black text-rose-500 tracking-widest uppercase flex items-center gap-3 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">
             <Lock size={32} />
             Global Cloud Control
           </h2>
           <p className="text-gray-400 mt-2 text-sm uppercase tracking-wider font-bold">Encrypted Environment Parameters & Cloud Gateway</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
           
           {/* Telemetry Log */}
           <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl border-t-2 border-t-purple-500">
             <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
               <div className="flex items-center gap-3">
                 <Server className="text-purple-500" size={20} />
                 <h2 className="text-white font-bold tracking-widest uppercase">Database Ingestion Audit Log</h2>
               </div>
             </div>
             <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
               <table className="w-full text-left text-sm text-gray-400">
                 <thead className="text-xs uppercase bg-[#0a0c0f] border-b border-[#1e222b] text-gray-500">
                   <tr>
                     <th className="px-6 py-4">Ingestion Date</th>
                     <th className="px-6 py-4">Transaction Tag</th>
                     <th className="px-6 py-4">Target Kingdom</th>
                     <th className="px-6 py-4">Source Origin</th>
                     <th className="px-6 py-4">Rows Mapped</th>
                     <th className="px-6 py-4">Uploader Handle</th>
                     <th className="px-6 py-4">Uploader Discord ID</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1e222b]">
                   {uploadLogs.length === 0 && (
                     <tr>
                       <td colSpan="7" className="px-6 py-8 text-center text-gray-500 italic">No cloud injection signatures found.</td>
                     </tr>
                   )}
                   {uploadLogs.map((log, i) => (
                     <tr key={i} className="hover:bg-[#161920] transition-colors">
                       <td className="px-6 py-3 font-mono text-purple-400">{new Date(log.scanDate).toLocaleString()}</td>
                       <td className="px-6 py-3">
                         <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold tracking-widest uppercase ${log.importTag?.startsWith('UP_') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-[#1e222b] text-gray-500'}`}>
                           {log.importTag || "LEGACY"}
                         </span>
                       </td>
                       <td className="px-6 py-3 font-bold text-white">KD {log.kingdomId}</td>
                       <td className="px-6 py-3">
                         <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1 rounded truncate block max-w-[150px]" title={log.sourceFile || "Legacy_Upload"}>
                           {log.sourceFile || "Legacy_Upload"}
                         </span>
                       </td>
                       <td className="px-6 py-3">
                         <span className="bg-[#1e222b] text-gray-300 py-1 px-2 rounded uppercase text-xs font-bold tracking-wider">{log.rowCount} Nodes</span>
                       </td>
                       <td className="px-6 py-3 font-bold text-gray-200">{log.uploaderName}</td>
                       <td className="px-6 py-3 font-mono text-xs text-gray-500">{log.uploaderId}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-8">
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

          <div className="space-y-8">
{/* Master IAM Storage */}
            <div className="border border-orange-500/20 bg-[#0a0c10] rounded-xl p-6 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-600 opacity-50"></div>
               <h3 className="text-orange-400 font-bold mb-4 flex items-center gap-2"><Lock size={18}/> Local Storage Environment Variables</h3>
               <p className="text-xs text-gray-400 mb-4 line-clamp-3">These keys run in your browser. They securely supersede Global API variables for 100% cloud privacy. Never export these to a screenshot or public drive.</p>
               
               <div className="space-y-3">
                 <div>
                   <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">AWS Master Key ID</label>
                   <input type="password" placeholder="••••••••••••••••••••" className="w-full bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500" defaultValue="LOCKED IN SERVER ENV" />
                 </div>
                 <div>
                   <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">AWS Master Secret</label>
                   <input type="password" placeholder="••••••••••••••••••••••••••••••••••••••••••" className="w-full bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500" defaultValue="LOCKED IN SERVER ENV" />
                 </div>
                 <div>
                   <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Global Gemini AI Fallback Key</label>
                   <input type="password" placeholder="AIzaSy••••••••••••••••••••••••" className="w-full bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500" defaultValue="LOCKED IN SERVER ENV" />
                 </div>
                 <button className="w-full bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/50 rounded py-2 text-sm font-bold uppercase tracking-widest transition-all mt-2">Force Save Local Profile</button>
               </div>
            </div>

          </div>
        </div>
      </div>
      
    </div>
    </div>
  );
}
