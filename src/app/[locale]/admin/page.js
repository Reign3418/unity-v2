"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Lock, ShieldAlert, Key, Database, Users, Trash2, Save, Skull, 
  UserMinus, Activity, RefreshCw, Bot, BotOff, CheckCircle, XCircle, Plus, Server, Clock, TextSelect, Radio, PowerOff, LayoutDashboard, ChevronRight, ExternalLink
} from "lucide-react";

// Global SPA cache to eliminate redundant DynamoDB/Vercel fetch latency during route navigation
let globalMatrixCache = null;
let globalMatrixTimestamp = 0;

export default function AdminConsole() {
  const { data: session } = useSession();
  
  // State from cache
  const [isLoading, setIsLoading] = useState(!globalMatrixCache);
  const [awsEnv, setAwsEnv] = useState(globalMatrixCache?.env || { region: "Scanning...", tableName: "Scanning..." });
  const [users, setUsers] = useState(globalMatrixCache?.users || []);
  const [tenants, setTenants] = useState(globalMatrixCache?.tenants || []);
  const [uploadLogs, setUploadLogs] = useState(globalMatrixCache?.uploadLogs || []);
  const [passcodes, setPasscodes] = useState(globalMatrixCache?.passcodes || []);
  const [pendingUsers, setPendingUsers] = useState(globalMatrixCache?.pendingUsers || []);
  
  // UX State
  const [activeTab, setActiveTab] = useState("overview");

  // Forms
  const [passForm, setPassForm] = useState({ kingdomId: "", role: "Member", poc: "", expireDays: "7" });
  const [manualUserForm, setManualUserForm] = useState({ discordId: "", poc: "", kingdomId: "", role: "Member" });
  const [tenantForm, setTenantForm] = useState({ guildId: "", kingdomId: "" });
  const [localKeys, setLocalKeys] = useState({ awsKey: "", awsSecret: "", geminiKey: "" });
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("ALL");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
      setLocalKeys({
        awsKey: prefs.awsKey || "",
        awsSecret: prefs.awsSecret || "",
        geminiKey: prefs.geminiKey || ""
      });
    } catch(e){}
  }, []);

  useEffect(() => {
    if (session?.user?.isSuperAdmin) {
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
      
      globalMatrixCache = { ...data, uploadLogs: logsData.uploads };
      globalMatrixTimestamp = Date.now();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  const toggleTenantAi = async (guildId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      setTenants(prev => prev.map(t => t.guildId === guildId ? { ...t, globalAiAccess: newStatus } : t));
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "TOGGLE_TENANT_AI", payload: { guildId, newStatus } }) });
      if (!res.ok) throw new Error("Failed");
      if (globalMatrixCache) globalMatrixCache.tenants = globalMatrixCache.tenants.map(t => t.guildId === guildId ? { ...t, globalAiAccess: newStatus } : t);
    } catch (e) { alert(e.message); fetchAdminMatrix(); }
  };

  const toggleUserAi = async (discordId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      setUsers(prev => prev.map(u => u.discordId === discordId ? { ...u, globalAiAccess: newStatus } : u));
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "TOGGLE_USER_AI", payload: { discordId, newStatus } }) });
      if (!res.ok) throw new Error("Failed");
      if (globalMatrixCache) globalMatrixCache.users = globalMatrixCache.users.map(u => u.discordId === discordId ? { ...u, globalAiAccess: newStatus } : u);
    } catch (e) { alert(e.message); fetchAdminMatrix(); }
  };

  const handleEditTenantNotes = async (guildId, currentNotes) => {
    const newNotes = window.prompt(`Enter tracking notes/infractions for Server ${guildId}:`, currentNotes || "");
    if (newNotes === null) return;
    try {
      setTenants(prev => prev.map(t => t.guildId === guildId ? { ...t, notes: newNotes } : t));
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE_TENANT_NOTES", payload: { guildId, notes: newNotes } }) });
      if (!res.ok) throw new Error("Failed to save Tenant notes");
      if (globalMatrixCache) globalMatrixCache.tenants = globalMatrixCache.tenants.map(t => t.guildId === guildId ? { ...t, notes: newNotes } : t);
    } catch (e) { alert(e.message); fetchAdminMatrix(); }
  };

  const handleEditUserNotes = async (discordId, currentNotes) => {
    const newNotes = window.prompt(`Enter tracking notes/infractions for User ${discordId}:`, currentNotes || "");
    if (newNotes === null) return;
    try {
      setUsers(prev => prev.map(u => u.discordId === discordId ? { ...u, notes: newNotes } : u));
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE_USER_NOTES", payload: { discordId, notes: newNotes } }) });
      if (!res.ok) throw new Error("Failed");
      if (globalMatrixCache) globalMatrixCache.users = globalMatrixCache.users.map(u => u.discordId === discordId ? { ...u, notes: newNotes } : u);
    } catch (e) { alert(e.message); fetchAdminMatrix(); }
  };

  const handleUpdateUserRole = async (discordId, role) => {
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE_USER_ROLE", payload: { discordId, role } }) });
      if (!res.ok) throw new Error("Failed to update role.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleDeleteUserAccess = async (discordId) => {
    if (!confirm(`CRITICAL WARNING: Are you sure you want to permanently revoke network access for User ${discordId}?`)) return;
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "DELETE_USER_ACCESS", payload: { discordId } }) });
      if (!res.ok) throw new Error("Failed to revoke access.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleSaveLocalKeys = () => {
    try {
      const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
      if (localKeys.awsKey) prefs.awsKey = localKeys.awsKey;
      if (localKeys.awsSecret) prefs.awsSecret = localKeys.awsSecret;
      if (localKeys.geminiKey) prefs.geminiKey = localKeys.geminiKey;
      localStorage.setItem('unty_prefs', JSON.stringify(prefs));
      alert("Local Engine Credentials securely written to Browser Storage.");
    } catch (e) { alert("Failed to save credentials."); }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert("Message cannot be empty.");
    const isGlobal = broadcastTarget === "ALL";
    const promptMsg = isGlobal ? "Are you sure you want to blast this maintenance alert to ALL connected Discord servers natively?" : `Are you sure you want to dispatch a targeted webhook exclusively to Kingdom ${broadcastTarget}?`;
    if (!confirm(promptMsg)) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch("/api/aws/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: broadcastMessage, targetKingdom: broadcastTarget }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to broadcast");
      alert(`Successfully broadcasted to ${data.targetsReached} actively connected Guilds!`);
      setBroadcastMessage("");
    } catch (e) { alert(e.message); } finally { setIsBroadcasting(false); }
  };

  const handleGeneratePasscode = async () => {
    if (!passForm.kingdomId || !passForm.poc) return alert("Kingdom and POC required.");
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "GENERATE_GUEST_PASSCODE", payload: passForm }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Passcode Generated: ${data.passcode}`);
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleRevokePasscode = async (passcode) => {
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "DELETE_GUEST_PASSCODE", payload: { passcode } }) });
      if (!res.ok) throw new Error("Failed to revoke.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleApprovePending = async (discordId, kingdomId, role) => {
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "APPROVE_MANUAL_USER", payload: { discordId, kingdomId, role } }) });
      if (!res.ok) throw new Error("Failed to approve.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleRejectPending = async (discordId) => {
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REJECT_MANUAL_USER", payload: { discordId } }) });
      if (!res.ok) throw new Error("Failed to reject.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleAddManualUser = async () => {
    if (!manualUserForm.discordId || !manualUserForm.poc || !manualUserForm.kingdomId) return alert("All fields required.");
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ADD_GLOBAL_MANUAL_USER", payload: manualUserForm }) });
      if (!res.ok) throw new Error("Failed to add manual user.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleAddBonusKingdom = async () => {
    if (!tenantForm.guildId || !tenantForm.kingdomId) return alert("Server ID and Kingdom required.");
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ADD_TENANT_KINGDOM", payload: { guildId: tenantForm.guildId, newKingdomId: tenantForm.kingdomId } }) });
      if (!res.ok) throw new Error("Failed to add bonus kingdom.");
      tenantForm.kingdomId = "";
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleRemoveTenantKingdom = async (guildId, removeKingdomId) => {
    if (!confirm(`Remove Kingdom ${removeKingdomId} access from Guild ${guildId}?`)) return;
    try {
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REMOVE_TENANT_KINGDOM", payload: { guildId, removeKingdomId } }) });
      if (!res.ok) throw new Error("Failed to remove kingdom.");
      fetchAdminMatrix();
    } catch (e) { alert(e.message); }
  };

  const handleTerminateTenant = async (guildId, kingdomId) => {
    if (!confirm(`⚠️ TERMINATE ACCESS\n\nThis will permanently remove Guild ${guildId} (KD ${kingdomId}).\nProceed?`)) return;
    try {
      setTenants(prev => prev.filter(t => t.guildId !== guildId));
      const res = await fetch("/api/aws/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "DELETE_TENANT", payload: { guildId } }) });
      if (!res.ok) throw new Error("Failed to terminate.");
      if (globalMatrixCache) globalMatrixCache.tenants = globalMatrixCache.tenants.filter(t => t.guildId !== guildId);
    } catch (e) { alert(e.message); fetchAdminMatrix(); }
  };

  // ----------------------------------------------------
  // RENDER BLOCKS
  // ----------------------------------------------------

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-[#111318] border border-[#1e222b] rounded-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase mb-2">System Overview</h2>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Global Telemetry Dashboard</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div onClick={() => setActiveTab('identity')} className="cursor-pointer group bg-[#0a0c10] border border-[#1e222b] rounded-lg p-6 shadow-md border-t-2 border-t-cyan-500 hover:bg-[#111318] transition-colors relative overflow-hidden">
           <div className="absolute right-4 top-4 text-cyan-500/20 group-hover:text-cyan-500/50 transition-colors"><ExternalLink size={16}/></div>
           <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Connected Users</div>
           <div className="text-4xl font-black text-white mt-2 group-hover:scale-105 transition-transform origin-left">{users.length}</div>
        </div>
        <div onClick={() => setActiveTab('tenants')} className="cursor-pointer group bg-[#0a0c10] border border-[#1e222b] rounded-lg p-6 shadow-md border-t-2 border-t-indigo-500 hover:bg-[#111318] transition-colors relative overflow-hidden">
           <div className="absolute right-4 top-4 text-indigo-500/20 group-hover:text-indigo-500/50 transition-colors"><ExternalLink size={16}/></div>
           <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Tenant Guilds</div>
           <div className="text-4xl font-black text-white mt-2 group-hover:scale-105 transition-transform origin-left">{tenants.length}</div>
        </div>
        <div onClick={() => setActiveTab('passcodes')} className="cursor-pointer group bg-[#0a0c10] border border-[#1e222b] rounded-lg p-6 shadow-md border-t-2 border-t-emerald-500 hover:bg-[#111318] transition-colors relative overflow-hidden">
           <div className="absolute right-4 top-4 text-emerald-500/20 group-hover:text-emerald-500/50 transition-colors"><ExternalLink size={16}/></div>
           <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Active Passes</div>
           <div className="text-4xl font-black text-white mt-2 group-hover:scale-105 transition-transform origin-left">{passcodes.length}</div>
        </div>
        <div onClick={() => setActiveTab('cloud')} className="cursor-pointer group bg-[#0a0c10] border border-[#1e222b] rounded-lg p-6 shadow-md border-t-2 border-t-amber-500 hover:bg-[#111318] transition-colors relative overflow-hidden">
           <div className="absolute right-4 top-4 text-amber-500/20 group-hover:text-amber-500/50 transition-colors"><ExternalLink size={16}/></div>
           <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-amber-400 transition-colors">Database Node</div>
           <div className="text-sm font-mono text-cyan-400 mt-4 overflow-hidden text-ellipsis group-hover:text-cyan-300 transition-colors">{awsEnv.tableName}</div>
        </div>
      </div>
      
      <div className="mt-8 border border-indigo-500/20 bg-[#0a0c10] rounded-lg p-6">
         <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Users size={18}/> Web User Approval Queue</h3>
         <div className="space-y-2">
           {pendingUsers.length === 0 && <div className="text-gray-600 text-xs font-bold text-center py-6 border border-dashed border-[#1e222b] rounded">System Clear. No users awaiting manual clearance.</div>}
           {pendingUsers.map(u => {
              const discordId = (u.SK?.S || u.SK || '').replace('USER#', '');
              const discordLink = `https://discord.com/users/${discordId}`;
              return (
                <div key={u.SK} className="bg-[#161920] border border-[#1e222b] rounded p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 group hover:border-indigo-500/30 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                     <img src={`https://cdn.discordapp.com/avatars/${discordId}/${u.attributes?.avatar?.S || ""}.png`} onError={(e)=>{e.target.src="https://cdn.discordapp.com/embed/avatars/0.png"}} className="w-10 h-10 rounded-full bg-[#1e222b] shrink-0 border border-[#1e222b]" alt="" />
                     <div>
                       <div className="text-indigo-300 font-bold text-sm flex items-center gap-2">
                           {u.attributes?.username?.S || discordId}
                           <a href={discordLink} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-indigo-400 transition-colors" title="View Discord Profile">
                               <ExternalLink size={14} />
                           </a>
                       </div>
                       <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 flex items-center gap-2">
                           <span className="text-rose-400 font-bold">Unverified</span>
                           <span>• KD {u.attributes?.targetKingdom?.S || "Unknown"}</span>
                           <span className="hidden md:inline">• Discord ID {discordId}</span>
                       </div>
                     </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                     <button onClick={() => handleApprovePending(discordId, u.attributes?.targetKingdom?.S || "0", "Member")} className="flex-1 md:flex-none flex items-center justify-center text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 p-2 rounded transition-colors" title="Approve Request"><CheckCircle size={18}/></button>
                     <button onClick={() => handleRejectPending(discordId)} className="flex-1 md:flex-none flex items-center justify-center text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 p-2 rounded transition-colors" title="Reject Request"><XCircle size={18}/></button>
                  </div>
                </div>
              );
           })}
         </div>
      </div>
    </div>
  );

  const renderIdentity = () => (
    <div className="space-y-6 animate-fade-in pb-12">
      <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
        Identity & Access Matrix
        <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-cyan-500"></div>
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-4">
             <h3 className="text-cyan-500 font-bold text-xs uppercase tracking-wider flex justify-between">
                <span>Verified Architecture Commanders</span>
                <span className="text-gray-500">{users.filter(u => u.role !== "User").length} Commanders</span>
             </h3>
             <div className="space-y-3 h-[600px] overflow-y-auto pr-2 scrollbar-none">
                {users.filter(u => u.role !== "User" || u.isManualGuest).map(user => (
                  <div key={user.discordId} className="bg-[#0a0c0f] border border-[#1e222b] hover:border-cyan-500/30 rounded-lg p-4 flex flex-col gap-3 transition-colors relative overflow-hidden">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#161920] text-cyan-500 flex items-center justify-center font-bold border border-[#1e222b] shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                           {(user.notes || user.username || "A").charAt(0).toUpperCase()}
                         </div>
                         <div>
                           <div className="text-white font-bold text-sm tracking-widest">{user.notes || user.username || `Agent ${user.discordId.substring(0, 6)}`}</div>
                           <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">{user.role || (user.isManualGuest ? "Guest Access" : "Admin Level")}</span>
                             <span className="text-[10px] text-gray-700 font-mono tracking-widest">UID: {user.discordId}</span>
                           </div>
                         </div>
                       </div>
                       <div className="flex gap-2">
                           <select 
                             className="bg-transparent border border-indigo-500/30 text-indigo-400 text-[10px] uppercase font-bold tracking-widest rounded p-1.5 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                             value={user.role || "User"}
                             onChange={(e) => {
                               const newRole = e.target.value;
                               if(newRole && newRole !== user.role) handleUpdateUserRole(user.discordId, newRole);
                             }}
                           >
                             <option value="User" className="bg-[#0a0c10] text-gray-300">USER (NODE)</option>
                             <option value="DATA ANALYST" className="bg-[#0a0c10] text-cyan-400">DATA ANALYST</option>
                             <option value="LEADER" className="bg-[#0a0c10] text-indigo-400">LEADER</option>
                             <option value="System Admin" className="bg-[#0a0c10] text-rose-500">SYSTEM ADMIN</option>
                           </select>
                           <button title={user.globalAiAccess ? "Revoke Gemini AI Access" : "Grant Gemini AI Access"} onClick={() => toggleUserAi(user.discordId, user.globalAiAccess)} className={`p-1.5 rounded-lg border transition-all ${user.globalAiAccess ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}><Bot size={14} /></button>
                           <button onClick={() => handleDeleteUserAccess(user.discordId)} className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 transition-all" title="Revoke Network Access"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase flex gap-4 mt-1">
                       <span>{user.governorIds?.length || 0} Linked Profiles</span>
                       <span className="cursor-pointer hover:text-indigo-400 transition-colors font-bold" onClick={() => handleEditUserNotes(user.discordId, user.notes)}>📝 Edit Alias / Notes</span>
                    </div>
                  </div>
                ))}
             </div>
         </div>

         <div className="space-y-4">
             <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider flex justify-between">
                <span>Standard Infantry Nodes</span>
                <span className="text-gray-600">{users.filter(u => u.role === "User").length} Soldiers</span>
             </h3>
             <div className="space-y-3 h-[600px] overflow-y-auto pr-2 scrollbar-none">
                {users.filter(u => u.role === "User").map(user => (
                  <div key={user.discordId} className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 flex flex-col gap-2 relative group hover:border-[#2d323e] transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                       <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-[#161920] text-gray-400 flex items-center justify-center font-bold border border-[#1e222b] group-hover:border-gray-500 transition-colors">
                              {(user.notes || user.username || "U").charAt(0).toUpperCase()}
                           </div>
                           <div className="flex flex-col">
                              <div className="text-gray-300 font-bold text-sm flex items-center gap-2">
                                  {user.notes || user.username || `Agent ${user.discordId.substring(0, 6)}`}
                              </div>
                              <span className="text-[10px] text-gray-600 font-mono tracking-widest">UID: {user.discordId}</span>
                           </div>
                        </div>
                       <div className="flex gap-2 items-center">
                           <select 
                             className="bg-transparent border border-none text-gray-500 hover:text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded outline-none transition-colors cursor-pointer mr-1 max-w-[100px]"
                             value={user.role || "User"}
                             onChange={(e) => {
                               const newRole = e.target.value;
                               if(newRole && newRole !== user.role) handleUpdateUserRole(user.discordId, newRole);
                             }}
                             title="Grant Elevated Role"
                           >
                             <option value="" disabled className="text-gray-500">Edit Role...</option>
                             <option value="User" className="bg-[#0a0c10] text-gray-300">USER (NODE)</option>
                             <option value="DATA ANALYST" className="bg-[#0a0c10] text-cyan-400">DATA ANALYST</option>
                             <option value="LEADER" className="bg-[#0a0c10] text-indigo-400">LEADER</option>
                             <option value="System Admin" className="bg-[#0a0c10] text-rose-500">SYSTEM ADMIN</option>
                           </select>

                           <button onClick={() => handleEditUserNotes(user.discordId, user.notes)} className="text-gray-500 hover:text-cyan-400 transition-colors" title="Set Alias / Note"><TextSelect size={14}/></button>
                           <button title={user.globalAiAccess ? "Revoke Gemini AI Access" : "Grant Gemini AI Access"} onClick={() => toggleUserAi(user.discordId, user.globalAiAccess)} className={`transition-colors ${user.globalAiAccess?'text-cyan-500':'text-rose-500'}`}><Bot size={14}/></button>
                           <button onClick={() => handleDeleteUserAccess(user.discordId)} className="text-gray-500 hover:text-rose-500 transition-colors" title="Revoke Network Access"><Trash2 size={14} /></button>
                       </div>
                    </div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest">{user.governorIds?.length || 0} Profiles Linked</div>
                  </div>
                ))}
             </div>
         </div>
      </div>
    </div>
  );

  const renderPasscodes = () => (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl">
      <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
        Guest Passcodes & Force Injection
        <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-emerald-500"></div>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl p-6">
             <h3 className="text-gray-300 font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2"><Key size={16}/> Generate Web Passcode</h3>
             <div className="space-y-4">
                 <input type="text" placeholder="POC Nickname" className="w-full bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" value={passForm.poc} onChange={e => setPassForm({...passForm, poc: e.target.value})} />
                 <input type="number" placeholder="Target Kingdom (e.g. 3418)" className="w-full bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" value={passForm.kingdomId} onChange={e => setPassForm({...passForm, kingdomId: e.target.value})} />
                 <div className="flex gap-4">
                     <select className="flex-1 bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-emerald-500 outline-none" value={passForm.role} onChange={e => setPassForm({...passForm, role: e.target.value})}>
                        <option value="Member">R3/Member</option>
                        <option value="Leader">R4/Leader</option>
                     </select>
                     <select className="flex-1 bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-emerald-500 outline-none" value={passForm.expireDays} onChange={e => setPassForm({...passForm, expireDays: e.target.value})}>
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                     </select>
                 </div>
                 <button onClick={handleGeneratePasscode} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded p-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">Execute Generation</button>
             </div>
          </div>

          <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl p-6">
             <h3 className="text-gray-300 font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2"><Users size={16}/> Direct User Injection</h3>
             <div className="space-y-4">
                 <input type="text" placeholder="Discord ID" className="w-full bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors" value={manualUserForm.discordId} onChange={e => setManualUserForm({...manualUserForm, discordId: e.target.value})} />
                 <input type="text" placeholder="Alias / POC" className="w-full bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors" value={manualUserForm.poc} onChange={e => setManualUserForm({...manualUserForm, poc: e.target.value})} />
                 <div className="flex gap-4">
                     <input type="number" placeholder="Kingdom" className="flex-1 bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-indigo-500 outline-none" value={manualUserForm.kingdomId} onChange={e => setManualUserForm({...manualUserForm, kingdomId: e.target.value})} />
                     <select className="flex-1 bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-white focus:border-indigo-500 outline-none" value={manualUserForm.role} onChange={e => setManualUserForm({...manualUserForm, role: e.target.value})}>
                        <option value="Member">Member</option>
                        <option value="Leader">Leader</option>
                     </select>
                 </div>
                 <button onClick={handleAddManualUser} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded p-3 text-xs font-bold uppercase tracking-widest transition-all">Bypass Pipeline</button>
             </div>
          </div>
      </div>

      <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl p-6">
         <h3 className="text-emerald-400 font-bold mb-4 text-sm uppercase tracking-wider">Active Circulating Passcodes</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passcodes.length === 0 && <span className="text-gray-500 italic text-sm">No passcodes active.</span>}
            {passcodes.map(p => (
               <div key={p.passcode} className="bg-[#161920] border border-[#1e222b] hover:border-emerald-500/50 rounded-lg p-4 relative group transition-colors">
                  <div className="text-emerald-400 font-mono font-bold tracking-widest text-lg mb-1">{p.passcode}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest">{p.playerName} • KD {p.kingdomId} • {p.role}</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-2"><Clock size={10} className="inline mr-1"/> Expires: {new Date(p.expiresAt).toLocaleDateString()}</div>
                  <button onClick={() => handleRevokePasscode(p.passcode)} className="absolute top-4 right-4 text-gray-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
               </div>
            ))}
         </div>
      </div>
    </div>
  );

  const renderTenants = () => (
    <div className="space-y-6 animate-fade-in pb-12">
      <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
        Registered Discord Tenants
        <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-blue-500"></div>
      </h2>

      <div className="flex gap-4 mb-6 items-center bg-[#0a0c10] border border-[#1e222b] p-4 rounded-lg max-w-3xl">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-widest w-48 shrink-0">Grant Bonus Router Box</div>
          <input type="text" placeholder="Discord Server ID" className="flex-1 bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:border-blue-500 outline-none" value={tenantForm.guildId} onChange={e => setTenantForm({...tenantForm, guildId: e.target.value})} />
          <input type="number" placeholder="KD ID" className="w-24 bg-[#161920] border border-[#1e222b] rounded p-2 text-sm text-white focus:border-blue-500 outline-none" value={tenantForm.kingdomId} onChange={e => setTenantForm({...tenantForm, kingdomId: e.target.value})} />
          <button onClick={handleAddBonusKingdom} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors px-6"><Plus size={18}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {tenants.map(tenant => (
           <div key={tenant.guildId} className="bg-[#0a0c10] border border-[#1e222b] hover:border-blue-500/30 rounded-xl p-6 transition-colors shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <Server className="text-blue-500" size={24}/>
                   <div>
                      <div className="text-white font-bold tracking-widest font-mono text-sm">{tenant.guildId}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Bound to: Kingdom {tenant.kingdomId}</div>
                   </div>
                 </div>
                 <div className="flex gap-2">
                    <button title={tenant.globalAiAccess ? "Revoke Gemini AI Access" : "Grant Gemini AI Access"} onClick={() => toggleTenantAi(tenant.guildId, tenant.globalAiAccess)} className={`p-2 rounded border ${tenant.globalAiAccess?'bg-cyan-500/10 text-cyan-500 border-cyan-500/30':'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}><Bot size={16}/></button>
                    <button title="Terminate Server Connection" onClick={() => handleTerminateTenant(tenant.guildId, tenant.kingdomId)} className="p-2 rounded bg-[#1e222b] hover:bg-rose-500 text-gray-500 hover:text-white transition-colors"><PowerOff size={16}/></button>
                 </div>
              </div>

              <div className="bg-[#161920] rounded p-3 text-xs mb-3 flex gap-4">
                 <div className="flex-1">
                   <span className="text-gray-500 uppercase block mb-1 tracking-wider">Commander Role ID</span>
                   <span className="text-gray-300 font-mono">{tenant.leadershipRoleId || "N/A"}</span>
                 </div>
                 <div className="flex-1">
                   <span className="text-gray-500 uppercase block mb-1 tracking-wider">Allowed Kingdoms</span>
                   <div className="flex flex-wrap gap-1 mt-1">
                     {tenant.allowedKingdoms?.length > 0 ? tenant.allowedKingdoms.map(kd => (
                       <span key={kd} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 group/kd">
                         {kd}
                         <button onClick={() => handleRemoveTenantKingdom(tenant.guildId, kd)} className="text-blue-400 hover:text-rose-500 transition-colors ml-1" title={`Remove Kingdom ${kd}`}><XCircle size={10}/></button>
                       </span>
                     )) : <span className="text-gray-600 text-[10px] italic">No bonus kingdoms mapped.</span>}
                   </div>
                 </div>
              </div>

              <div className="border-t border-[#1e222b] pt-3 flex justify-between items-center group cursor-pointer" onClick={() => handleEditTenantNotes(tenant.guildId, tenant.notes)}>
                 <span className="text-xs text-gray-500 italic truncate max-w-[80%]">{tenant.notes ? `"${tenant.notes}"` : "Click to add administrative tracking notes..."}</span>
                 <TextSelect size={14} className="text-gray-600 group-hover:text-cyan-400"/>
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  const renderCloud = () => (
    <div className="space-y-8 animate-fade-in pb-12 max-w-5xl">
       <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
        Cloud Telemetry & Environment
        <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-purple-500"></div>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl p-6">
            <h3 className="text-amber-500 font-bold mb-4 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-[#1e222b] pb-3"><Database size={16}/> AWS Environment Target</h3>
            <div className="space-y-4">
               <div>
                 <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Live Region Router</label>
                 <div className="w-full bg-[#161920] border border-[#1e222b] text-gray-300 px-4 py-3 rounded text-sm font-mono flex items-center gap-2"><Activity size={14} className="text-amber-500"/> {awsEnv.region}</div>
               </div>
               <div>
                 <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">DynamoDB Table Target</label>
                 <div className="w-full bg-[#161920] border border-[#1e222b] text-gray-300 px-4 py-3 rounded text-sm font-mono flex items-center gap-2"><Server size={14} className="text-amber-500"/> {awsEnv.tableName}</div>
               </div>
               <div className="text-[10px] text-gray-500 tracking-wider">Locked to system environment. Modify Vercel Env to switch buckets.</div>
            </div>
         </div>

         <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl p-6">
            <h3 className="text-orange-500 font-bold mb-4 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-[#1e222b] pb-3"><Lock size={16}/> Client DB Credentials</h3>
            <div className="space-y-3">
                 <input type="password" placeholder={localKeys.awsKey ? "AWS Key ID (Mapped)" : "Optional Native Env Override"} className="w-full bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-gray-300 focus:border-orange-500 outline-none" value={localKeys.awsKey} onChange={e => setLocalKeys({...localKeys, awsKey: e.target.value})} />
                 <input type="password" placeholder={localKeys.awsSecret ? "AWS Secret (Mapped)" : "Optional Native Env Override"} className="w-full bg-[#161920] border border-[#1e222b] rounded p-3 text-sm text-gray-300 focus:border-orange-500 outline-none" value={localKeys.awsSecret} onChange={e => setLocalKeys({...localKeys, awsSecret: e.target.value})} />
                 <button onClick={handleSaveLocalKeys} className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded p-3 text-xs font-bold uppercase tracking-widest transition-all">Flash Storage Write</button>
            </div>
         </div>
      </div>

      <div className="border border-[#1e222b] bg-[#0a0c10] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-purple-500">
         <div className="px-6 py-4 border-b border-[#1e222b] bg-[#111318]">
            <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider">Database Ingestion Logs</h3>
         </div>
         <div className="overflow-x-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
            <table className="w-full text-left text-sm text-gray-400">
               <thead className="text-[10px] uppercase bg-[#0a0c0f] border-b border-[#1e222b] text-gray-500 sticky top-0">
                  <tr>
                     <th className="px-6 py-3">Timestamp</th>
                     <th className="px-6 py-3">Tag</th>
                     <th className="px-6 py-3">Kingdom / Origin</th>
                     <th className="px-6 py-3">Nodes</th>
                     <th className="px-6 py-3">Uploader</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#1e222b]">
                  {uploadLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-[#161920]">
                       <td className="px-6 py-3 font-mono text-purple-400 text-xs">{new Date(log.scanDate).toLocaleString()}</td>
                       <td className="px-6 py-3"><span className="bg-[#1e222b] text-xs px-2 py-1 rounded tracking-widest font-mono">{log.importTag || "LEGACY"}</span></td>
                       <td className="px-6 py-3 text-white text-xs font-bold">KD {log.kingdomId} <span className="text-gray-500 font-normal ml-2 font-mono truncate hidden lg:inline">{log.sourceFile}</span></td>
                       <td className="px-6 py-3 text-xs">{log.rowCount} Nodes</td>
                       <td className="px-6 py-3 text-xs truncate max-w-[150px]">{log.uploaderName}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );

  const renderBroadcast = () => (
    <div className="space-y-6 animate-fade-in pb-12 max-w-3xl">
       <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
        Distributed Service Actions
        <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-rose-500"></div>
      </h2>

      <div className="border border-rose-500/30 bg-[#130000] rounded-xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(225,29,72,0.1)]">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
         <h3 className="text-rose-500 font-black text-xl mb-2 flex items-center gap-3 tracking-widest uppercase"><Radio size={24} className="animate-pulse"/> Global Broadcast Override</h3>
         <p className="text-sm text-rose-300/60 mb-8 leading-relaxed max-w-xl">Dispatch critical infrastructure alerts instantaneously. Bypasses client caches and transmits high-priority payloads directly to webhook channels inside the connected standard Discord Tenants.</p>
         
         <div className="space-y-6">
            <select className="w-full bg-[#1a0505] border border-rose-500/30 rounded-lg p-4 text-sm text-white focus:border-rose-500 font-bold outline-none" value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)} disabled={isBroadcasting}>
               <option value="ALL">🚨 ALL REGISTERED KINGDOMS GLOBAL BLAST</option>
               <optgroup label="Target Specific Database Partition">
                  {Array.from(new Set(tenants.map(t => t.kingdomId))).filter(Boolean).sort((a,b)=>a-b).map(kd => <option key={kd} value={kd}>Target Webhook: Kingdom {kd}</option>)}
               </optgroup>
               <optgroup label="Target Specific Discord Guild Node">
                  {tenants.map(t => <option key={t.guildId} value={t.guildId}>Server Node: {t.guildId}</option>)}
               </optgroup>
            </select>

            <textarea className="w-full bg-[#0a0000] border border-rose-500/30 rounded-lg p-4 text-sm text-white focus:border-rose-500 min-h-[150px] resize-none font-mono outline-none" placeholder="Enter override transmission payload here..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} disabled={isBroadcasting}></textarea>
            
            <button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastMessage.trim()} className={`w-full py-4 rounded-lg text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isBroadcasting || !broadcastMessage.trim() ? 'bg-[#1a0505] text-rose-500/30 border border-rose-500/10 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]'}`}>
               {isBroadcasting ? <><RefreshCw size={20} className="animate-spin" /> TRANSMITTING PAYLOAD...</> : <><Radio size={20} /> INITIATE OVERRIDE</>}
            </button>
         </div>
      </div>
    </div>
  );

  // ----------------------------------------------------
  // MAIN WRAPPER COMPONENT
  // ----------------------------------------------------

  if (session && !session.user?.isSuperAdmin) {
    return (
      <div className="flex bg-[#0f1115] min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <ShieldAlert size={64} className="text-rose-500 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-rose-500 tracking-widest mb-2">ACCESS DENIED</h1>
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Master Clearance Required</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex bg-[#0f1115] min-h-[80vh] items-center justify-center flex-col text-indigo-500">
        <RefreshCw size={48} className="animate-spin mb-4" />
        <span className="font-mono font-bold uppercase tracking-widest text-sm animate-pulse">Decrypting AWS Vault...</span>
      </div>
    );
  }

  const TabButton = ({ icon, label, active, onClick }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold tracking-wider rounded-lg transition-all ${active ? 'bg-[#1e222b] text-cyan-400 shadow-[inset_3px_0_0_rgba(6,182,212,1)]' : 'text-gray-500 hover:bg-[#161920] hover:text-gray-300'} text-left`}
    >
       {icon} {label}
    </button>
  );

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#0f1115] text-white flex rounded-xl border border-[#1e222b] overflow-hidden shadow-2xl mt-4">
       
       {/* Azure-Style Left Sidebar Menu */}
       <div className="w-72 bg-[#0a0c10] border-r border-[#1e222b] flex flex-col pt-8 pb-4 shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
          <div className="px-8 mb-8 flex items-center gap-3">
             <div className="w-10 h-10 bg-[#1e222b] rounded-lg flex items-center justify-center border border-[#2d3340]">
                <ShieldAlert className="text-cyan-400" size={20} />
             </div>
             <div>
               <h1 className="text-sm font-black text-white uppercase tracking-widest leading-none">Admin Area</h1>
               <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Root Access</span>
             </div>
          </div>

          <div className="flex-1 space-y-1 px-4 overflow-y-auto">
             <TabButton icon={<LayoutDashboard size={18}/>} label="Dashboard Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
             
             <div className="pt-6 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-600">Access Management</div>
             <TabButton icon={<Users size={18}/>} label="Identity Matrix" active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} />
             <TabButton icon={<Key size={18}/>} label="Web Passcodes" active={activeTab === 'passcodes'} onClick={() => setActiveTab('passcodes')} />
             
             <div className="pt-6 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-600">Scale Integrations</div>
             <TabButton icon={<Server size={18}/>} label="Tenant Guilds" active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} />
             
             <div className="pt-6 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-600">Core Infrastructure</div>
             <TabButton icon={<Database size={18}/>} label="Cloud Telemetry" active={activeTab === 'cloud'} onClick={() => setActiveTab('cloud')} />
             <TabButton icon={<Radio size={18}/>} label="System Broadcast" active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} />
          </div>
          
          <div className="px-4 mt-auto pt-6 border-t border-[#1e222b]">
             <div className="bg-[#161920] p-3 rounded-lg flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400 tracking-widest">v2.0.1_STABLE</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
             </div>
          </div>
       </div>

       {/* Azure-Style Main Canvas Header + View */}
       <div className="flex-1 flex flex-col bg-[#0f1115] relative overflow-hidden h-full">
          {/* Header Action Bar */}
          <div className="h-16 border-b border-[#1e222b] bg-[#0a0c10]/80 backdrop-blur-md flex items-center justify-between px-8 absolute top-0 w-full z-10">
             <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                Admin Area <ChevronRight size={14}/> <span className="text-cyan-400">{activeTab}</span>
             </div>
             <button onClick={() => { globalMatrixTimestamp=0; setIsLoading(true); fetchAdminMatrix(); }} className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest bg-[#1e222b] hover:bg-cyan-500/20 hover:text-cyan-400 text-gray-400 px-4 py-2 rounded transition-colors border border-transparent hover:border-cyan-500/30">
                <RefreshCw size={12} className={isLoading ? "animate-spin text-cyan-400" : ""} /> Sync Matrix
             </button>
          </div>

          {/* Internal Canvas Scroller */}
          <div className="flex-1 overflow-y-auto w-full pt-24 px-8 pb-12 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent h-full">
             {activeTab === 'overview' && renderOverview()}
             {activeTab === 'identity' && renderIdentity()}
             {activeTab === 'passcodes' && renderPasscodes()}
             {activeTab === 'tenants' && renderTenants()}
             {activeTab === 'cloud' && renderCloud()}
             {activeTab === 'broadcast' && renderBroadcast()}
          </div>
       </div>
    </div>
  );
}
