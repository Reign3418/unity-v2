import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\lib\\awsDynamo.js';
const lines = readFileSync(filePath, 'utf8').split('\n');

let newLines = [];

for (let i = 0; i < lines.length; i++) {
    // Skip the mangled top comment block
    if (lines[i] === '/**' && lines[i+1] === ' * ADMIN: Gets all registered Tenants' && lines[i+2] === '' && lines[i+3] === '/**') {
        // Skip i and i+1
        i++;
        continue;
    }
    
    // Skip the disconnected ` */` that precedes getAllTenants
    if (lines[i] === ' */' && lines[i+1].includes('export async function getAllTenants() {')) {
        continue;
    }
    
    // Inject the correct comment block right above the function
    if (lines[i].includes('export async function getAllTenants() {')) {
        newLines.push('/**');
        newLines.push(' * ADMIN: Gets all registered Tenants');
        newLines.push(' */');
    }
    
    newLines.push(lines[i]);
}

writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Fixed comment lines via array mapping');
