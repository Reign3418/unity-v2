import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\app\\admin\\page.js';
let content = readFileSync(filePath, 'utf8');

const targetSelect = `<select className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.role} onChange={e => setManualUserForm({...manualUserForm, role: e.target.value})}>
                      <option value="Member">Member</option>
                      <option value="Leader">Leader</option>
                   </select>`;

const newSelect = `<select className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.role} onChange={e => setManualUserForm({...manualUserForm, role: e.target.value})}>
                      <option value="Member">Member</option>
                      <option value="Leader">Leader</option>
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="Admin">Admin</option>
                   </select>`;

content = content.replace(targetSelect, newSelect);

const targetButton = `<button className="flex-1 sm:flex-none px-4 py-2 bg-[#1e222b] hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-rose-500/30">
                          Revoke Clearance
                        </button>`;

const newButton = `<select 
                            value={user.role || 'Member'}
                            onChange={(e) => handleUserRoleChange(user.discordId, e.target.value)}
                            className="bg-[#1e222b] border border-[#1e222b] rounded-lg p-2 text-xs font-bold text-cyan-400 outline-none focus:border-cyan-500/50 cursor-pointer"
                        >
                            <option value="Member">Member</option>
                            <option value="Leader">Leader</option>
                            <option value="Data Analyst">Data Analyst</option>
                            <option value="Admin">Admin</option>
                        </select>
                        <button className="flex-1 sm:flex-none px-4 py-2 bg-[#1e222b] hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-rose-500/30">
                          Revoke Clearance
                        </button>`;

content = content.replace(targetButton, newButton);


// Need to insert handleUserRoleChange function
const handleNotesFunc = `  const handleEditUserNotes = async (discordId, currentNotes) => {`;

const newHandleRoleFunc = `
  const handleUserRoleChange = async (discordId, newRole) => {
    if (!confirm(\`Warning: Modifying clearance level for \${discordId} to \${newRole.toUpperCase()}. Proced?\`)) return;
    try {
      const res = await fetch("/api/aws/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_USER_ROLE", payload: { discordId, role: newRole } })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else {
        // optimistically update state
        setUsers(users.map(u => u.discordId === discordId ? { ...u, role: newRole } : u));
      }
    } catch (e) {
      alert("System fault while swapping roles.");
    }
  };

  const handleEditUserNotes = async (discordId, currentNotes) => {`;

content = content.replace(handleNotesFunc, newHandleRoleFunc);

writeFileSync(filePath, content, 'utf8');
console.log('Admin Page Updated UI.');
