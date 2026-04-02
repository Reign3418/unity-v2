import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\lib\\awsDynamo.js';
const lines = readFileSync(filePath, 'utf8').split('\n');

const cleanedLines = [];
let skipMode = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Remove the bad fragment block right before updateUserRole
    if (line === '/**' && lines[i+1] === ' * ADMIN: Gets all registered Tenants' && lines[i+2] === '\r' && lines[i+3] === '/**') {
        i += 2; // skip the next two lines so we land on /**
        continue;
    }
    if (line === '/**' && lines[i+1] === ' * ADMIN: Gets all registered Tenants' && lines[i+2] === '' && lines[i+3] === '/**') {
        i += 2; // skip the next two lines so we land on /**
        continue;
    }
    
    // Remove the bad isolated fragment just before the real getAllTenants
    if (line.includes(' */') && lines[i+1] === '/**' && lines[i+2] === ' * ADMIN: Gets all registered Tenants') {
        // Skip JUST this line
        continue;
    }

    cleanedLines.push(line);
}

writeFileSync(filePath, cleanedLines.join('\n'), 'utf8');
console.log('Final brutal slash of bad comments completed.');
