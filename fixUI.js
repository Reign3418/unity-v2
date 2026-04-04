const fs = require('fs');

let f = fs.readFileSync('src/app/[locale]/admin/page.js', 'utf8');

const target2 = `<button onClick={() => {
                               const newRole = prompt(\`Modify access level for \${user.discordId}:\\n(User, LEADER, DATA ANALYST, etc)\`, user.role || "User");
                               if(newRole && newRole !== user.role) handleUpdateUserRole(user.discordId, newRole);
                           }} className="p-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all" title="Edit Role Permissions"><ShieldAlert size={14} /></button>`;

const rep2 = `<select 
                             className="bg-transparent border border-indigo-500/30 text-indigo-400 text-xs rounded p-1.5 outline-none focus:border-indigo-500 transition-colors cursor-pointer mr-2 max-w-[120px]"
                             value={user.role || "User"}
                             onChange={(e) => {
                               const newRole = e.target.value;
                               if(newRole && newRole !== user.role) handleUpdateUserRole(user.discordId, newRole);
                             }}
                           >
                             <option value="User" className="bg-[#0a0c10] text-gray-300">User</option>
                             <option value="DATA ANALYST" className="bg-[#0a0c10] text-cyan-400">Data Analyst</option>
                             <option value="LEADER" className="bg-[#0a0c10] text-indigo-400">Leader</option>
                             <option value="System Admin" className="bg-[#0a0c10] text-rose-500">System Admin</option>
                           </select>`;

const target3 = `<button onClick={() => {
                               const newRole = prompt(\`Grant elevated role for \${user.discordId}:\\n(LEADER, DATA ANALYST, etc)\`, user.role || "User");
                               if(newRole && newRole !== user.role) handleUpdateUserRole(user.discordId, newRole);
                           }} className="text-gray-500 hover:text-indigo-400 transition-colors" title="Edit Role Permissions"><ShieldAlert size={14}/></button>`;

const rep3 = `<select 
                             className="bg-transparent border border-none text-gray-500 hover:text-indigo-400 text-xs rounded p-1 outline-none transition-colors cursor-pointer mr-1"
                             value={user.role || "User"}
                             onChange={(e) => {
                               const newRole = e.target.value;
                               if(newRole && newRole !== user.role) handleUpdateUserRole(user.discordId, newRole);
                             }}
                             title="Grant Elevated Role"
                           >
                             <option value="User" className="bg-[#0a0c10] text-gray-300">User</option>
                             <option value="DATA ANALYST" className="bg-[#0a0c10] text-cyan-400">Data Analyst</option>
                             <option value="LEADER" className="bg-[#0a0c10] text-indigo-400">Leader</option>
                             <option value="System Admin" className="bg-[#0a0c10] text-rose-500">System Admin</option>
                           </select>`;

f = f.replace(target2, rep2);
f = f.replace(target3, rep3);
fs.writeFileSync('src/app/[locale]/admin/page.js', f);
