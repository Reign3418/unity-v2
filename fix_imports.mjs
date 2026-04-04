import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else {
            if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const dirToScan = path.join(process.cwd(), 'src');
const files = walkDir(dirToScan);

let changes = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Replace relative imports to components and lib with absolute path aliasing
    // Matches something like: from "../../../components/Something" or from '../../lib/helper'
    content = content.replace(/from\s+["'](\.\.\/)+(components|lib)\/(.*?)["']/g, 'from "@/$2/$3"');
    
    // Also handle dynamic imports and requires
    content = content.replace(/import\(\s*["'](\.\.\/)+(components|lib)\/(.*?)["']\s*\)/g, 'import("@/$2/$3")');
    content = content.replace(/require\(\s*["'](\.\.\/)+(components|lib)\/(.*?)["']\s*\)/g, 'require("@/$2/$3")');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changes++;
    }
});

console.log(`Relative path conversion complete. Modified ${changes} files.`);
