import fs from 'fs';
import path from 'path';

const locales = ['en', 'vi', 'ar', 'ru', 'zh', 'es', 'id', 'ko', 'tr', 'fr', 'de', 'pt'];
const dir = path.join(process.cwd(), 'src', 'messages');

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Minimal starter payload to verify next-intl parses it
const template = {
    "Index": {
        "title": "Welcome to Unity"
    }
};

locales.forEach(loc => {
    fs.writeFileSync(
        path.join(dir, `${loc}.json`),
        JSON.stringify(template, null, 2),
        'utf8'
    );
});

console.log('Created localizations: ', locales.join(', '));
