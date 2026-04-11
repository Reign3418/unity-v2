const fs = require('fs');
const file = 'src/components/analysis/kingdom/ResultsTab.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/dkpSystem === 'advanced'/g, "dkpSystem !== 'basic'");
content = content.replace(/dkpSystem === "advanced"/g, 'dkpSystem !== "basic"');
fs.writeFileSync(file, content);
console.log("Patched!");
