import fs from 'fs';
import path from 'path';

const appDir = path.join(process.cwd(), 'src', 'app');
const localeDir = path.join(appDir, '[locale]');

// Create [locale] directory if it doesn't exist
if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true });
}

// Items to explicitly NOT move
const exclusions = ['api', '[locale]', 'globals.css'];

const items = fs.readdirSync(appDir);

items.forEach(item => {
    if (!exclusions.includes(item)) {
        const oldPath = path.join(appDir, item);
        const newPath = path.join(localeDir, item);
        
        // Safety check to prevent moving into itself
        if (oldPath !== localeDir) {
            fs.renameSync(oldPath, newPath);
            console.log(`Moved: ${item} -> [locale]/${item}`);
        }
    }
});

console.log('Phase 2 Route Encapsulation (File Ops) Complete');
