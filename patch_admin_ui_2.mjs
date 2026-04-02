import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\app\\admin\\page.js';
let content = readFileSync(filePath, 'utf8');

// The first patch for the Force Add Dropdown
const regexSelect = /<select.*?value={manualUserForm\.role}.*?>\s*<option value="Member">Member<\/option>\s*<option value="Leader">Leader<\/option>\s*<\/select>/;
const newSelect = `<select className="bg-[#161920] border border-[#1e222b] rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" value={manualUserForm.role} onChange={e => setManualUserForm({...manualUserForm, role: e.target.value})}>
                      <option value="Member">Member</option>
                      <option value="Leader">Leader</option>
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="Admin">Admin</option>
                   </select>`;
content = content.replace(regexSelect, newSelect);


// The second patch for the Commanders list
// Search for Revoke Clearance inside the map for users filter
const regexButton = /<button className="flex-1 sm:flex-none px-4 py-2 bg=\[#1e222b\] hover:bg-rose-500\/20 text-gray-400 hover:text-rose-500 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-rose-500\/30">\s*Revoke Clearance\s*<\/button>/;

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

content = content.replace(regexButton, newButton);

writeFileSync(filePath, content, 'utf8');
console.log('UI Overwrite Patch completed via Regex');
