import fs from 'fs';
import path from 'path';

const locales = ['vi', 'ar', 'ru', 'zh', 'es', 'id', 'ko', 'tr', 'fr', 'de', 'pt'];
const dir = path.join(process.cwd(), 'src', 'messages');

const template = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

locales.forEach(loc => {
    fs.writeFileSync(
        path.join(dir, `${loc}.json`),
        JSON.stringify(template, null, 2),
        'utf8'
    );
});

console.log('Propagated en.json dictionary to all locales.');
