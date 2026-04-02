import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\app\\api\\aws\\admin\\route.js';
const lines = readFileSync(filePath, 'utf8').split('\n');

// Update imports
for (let i = 0; i < 20; i++) {
    if (lines[i].includes('updateTenantNotes')) {
        lines[i] = lines[i].replace('updateTenantNotes }', 'updateTenantNotes, updateUserRole }');
        break;
    }
}

// Add the action handler mapping
const newAction = `
    if (action === "UPDATE_USER_ROLE") {
      const { discordId, role } = payload;
      const success = await updateUserRole(discordId, role);
      if (success) {
        return NextResponse.json({ success: true, message: \`Access clearance updated for \${discordId}.\` }, { status: 200 });
      }
      return NextResponse.json({ error: "Failed to update User clearance." }, { status: 500 });
    }
`;

for (let i = 100; i < lines.length; i++) {
    if (lines[i].includes('if (action === "ADD_TENANT_KINGDOM")')) {
        lines.splice(i, 0, newAction);
        break;
    }
}

writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Injected UPDATE_USER_ROLE route.js');
