import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\lib\\awsDynamo.js';
const lines = readFileSync(filePath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("techPower: parseInt(attrs['Tech Power']?.N || attrs['tech power']?.N || attrs['techPower']?.N) || 0,")) {
        if (!lines[i - 1].includes("troopPower")) {
            lines.splice(i, 0, "                        troopPower: parseInt(attrs['Troop Power']?.N || attrs['troop power']?.N || attrs['troopPower']?.N) || 0,");
        }
        break;
    }
}

writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done — injected troopPower into getGovernorHistory.');
