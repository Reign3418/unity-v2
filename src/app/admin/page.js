"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, ShieldAlert, Key, Database, Users, Trash2, Save, Skull, UserMinus } from "lucide-react";

export default function AdminConsole() {
  const { data: session } = useSession();
  
  // React State for simulated API settings
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [tableName, setTableName] = useState("UnityV2_Roster");
  
  // Simulated Clearance Logs
  const pendingUsers = [
    { id: "982734912", discordName: "RookieSniper", kingdom: "3156", requestedAt: "2 hours ago" },
    { id: "458712993", discordName: "FarmerJoe", kingdom: "3155", requestedAt: "5 hours ago" },
  ];

  const approvedUsers = [
    { id: "218768480", discordName: "Reign", role: "R5 Commander", activeCards: 2 },
    { id: "135042283", discordName: "Ghost", role: "R4 Vanguard", activeCards: 1 },
  ];

  // If somehow a non-leader routes here, block the UI entirely (Double verification since Sidebar hides it)
  if (session && !session.user?.isLeader) {
    return (
      <div className="flex bg-[#0f1115] min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <ShieldAlert size={64} className="text-rose-500 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-rose-500 tracking-widest mb-2">ACCESS DENIED</h1>
          <p className="text-gray-400">R4/R5 Clearance Required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-rose-500 border-r-rose-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(244,63,94,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjQ0LCA2MyLCA5NCwgMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-4 relative z-10">
          <Lock className="text-rose-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest">GHOST SHIP CONTROL PANEL</h1>
            <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Authorized Protocol: Execution Parameters Unlocked</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: API Configurations */}
        <div className="lg:col-span-1 space-y-8">
          
          <div className="bg-[#13161c] border border-[#1e222b] rounded-2xl overflow-hidden shadow-lg border-t-2 border-t-amber-500">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
              <Key className="text-amber-500" size={20} />
              <h2 className="text-white font-bold">AWS Gateway Link</h2>
            </div>
            <div className="p-6 space-y-5">
              
              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">AWS Region</label>
                <input 
                  type="text" 
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                  className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm focus:border-amber-500 transition-colors cursor-text outline-none" 
                />
              </div>

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">DynamoDB Master Table</label>
                <input 
                  type="text" 
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm focus:border-amber-500 transition-colors cursor-text outline-none" 
                />
              </div>

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Cognito Identity Pool ID</label>
                <input 
                  type="password" 
                  placeholder="us-east-1:xxxx-xxxx-xxxx"
                  className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm focus:border-amber-500 transition-colors cursor-text outline-none placeholder:text-gray-700" 
                />
              </div>

              <button className="w-full mt-4 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 border border-amber-500/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                <Save size={18} /> Sync Gateway Parameters
              </button>
            </div>
          </div>

          <div className="bg-[#13161c] border border-[#1e222b] rounded-2xl overflow-hidden shadow-lg border-t-2 border-t-rose-600">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
              <Skull className="text-rose-600" size={20} />
              <h2 className="text-white font-bold">Danger Zone</h2>
            </div>
            <div className="p-6 space-y-4">
               <button className="w-full bg-[#0a0c0f] hover:bg-rose-500/10 text-rose-500 border border-[#1e222b] hover:border-rose-500/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-wider">
                <Trash2 size={16} /> Prune Scans (Older 60d)
              </button>
              <button className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all py-4 text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(225,29,72,0.4)]">
                <Skull size={18} /> Purge Kingdom Database
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: User Clearance Logs */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl border-t-2 border-t-emerald-500">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
              <div className="flex items-center gap-3">
                <Users className="text-emerald-500" size={20} />
                <h2 className="text-white font-bold">User Clearance Logs</h2>
              </div>
              <span className="text-xs bg-[#1e222b] text-gray-400 px-3 py-1 rounded-full">{approvedUsers.length + pendingUsers.length} Active Identity Links</span>
            </div>

            <div className="p-6 space-y-8">
              
              {/* Pending Queue */}
              <div>
                <h3 className="text-amber-500 font-bold text-xs uppercase tracking-wider mb-4 border-b border-[#1e222b] pb-2">Pending Authorization Queue</h3>
                <div className="space-y-3">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="bg-[#13161c] border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-amber-500/50 transition-colors">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full bg-[#1e222b] flex flex-col items-center justify-center">
                          <UserMinus size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="text-white font-bold">{user.discordName} <span className="text-gray-500 text-xs font-normal">({user.requestedAt})</span></div>
                          <div className="text-[10px] text-gray-500 font-mono">Discord: #{user.id} | Requesting KD: {user.kingdom}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg font-bold text-sm transition-all border border-emerald-500/20">Authorize</button>
                        <button className="flex-1 sm:flex-none px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg font-bold text-sm transition-all border border-rose-500/20">Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authorized Users */}
              <div>
                <h3 className="text-emerald-500 font-bold text-xs uppercase tracking-wider mb-4 border-b border-[#1e222b] pb-2">Verified Architecture Commanders</h3>
                <div className="space-y-3">
                  {approvedUsers.map(user => (
                    <div key={user.id} className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 group">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${user.id}/${session?.user?.avatar || ""}.png`} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full border border-[#1e222b]"
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png" }}
                        />
                        <div>
                          <div className="text-white font-bold">{user.discordName}</div>
                          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{user.role} | {user.activeCards} Linked Governors</div>
                        </div>
                      </div>
                      <button className="w-full sm:w-auto px-4 py-2 bg-[#1e222b] hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-rose-500/30 opacity-50 group-hover:opacity-100">
                        Revoke Matrix Access
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
