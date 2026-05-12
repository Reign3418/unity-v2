const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env.local");
    process.exit(1);
}

const locales = ['ar', 'de', 'es', 'fr', 'id', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'];
const msgDir = path.resolve(__dirname, '../src/messages');

const enFile = fs.readFileSync(path.join(msgDir, 'en.json'), 'utf8');
const enJson = JSON.parse(enFile);
const polygraphObj = enJson.Polygraph;

async function translateBlock(targetLang) {
    console.log(`Translating Polygraph to ${targetLang}...`);
    const prompt = `Translate the following JSON string values from English to the locale code '${targetLang}' (e.g. 'es' is Spanish, 'zh' is Chinese, 'ko' is Korean, etc.). 
    Maintain the EXACT same JSON keys. Do not translate the keys. Only translate the values.
    
    Context: This is for a video game dashboard (Rise of Kingdoms). 
    "Power" = raw power points.
    "Deads" = dead troops.
    "Cmdr" = commanders.
    "KP" = Kill Points.
    "Whale" = high spending player.
    "KD" = Kingdom.
    "Anchor Scan" = starting date of the data.
    
    Here is the JSON object to translate:
    ${JSON.stringify(polygraphObj, null, 2)}
    
    Return ONLY a valid JSON object matching this structure, with translated string values. Do not wrap in markdown tags if you can avoid it, or if you do, I will strip them.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
    });

    if (!res.ok) {
        console.error(`Failed to fetch translation for ${targetLang}:`, await res.text());
        return null;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
        return JSON.parse(rawText);
    } catch (e) {
        console.error(`Failed to parse translation for ${targetLang}:`, rawText);
        return null;
    }
}

async function run() {
    for (const loc of locales) {
        const trObj = await translateBlock(loc);
        if (!trObj) {
            console.error(`Skipping ${loc} due to error.`);
            continue;
        }

        const locFile = path.join(msgDir, `${loc}.json`);
        let locJson = {};
        if (fs.existsSync(locFile)) {
            let data = fs.readFileSync(locFile, 'utf8');
            data = data.replace(/^\uFEFF/, '');
            locJson = JSON.parse(data);
        }

        locJson.Polygraph = trObj;

        fs.writeFileSync(locFile, JSON.stringify(locJson, null, 2), 'utf8');
        console.log(`Saved ${loc}.json`);
    }
    console.log("All translations complete!");
}

run();
