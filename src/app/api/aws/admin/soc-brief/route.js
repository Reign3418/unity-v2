import { NextResponse } from 'next/server';
import { getGlobalConfig } from '@/lib/awsDynamo';

export const maxDuration = 300;

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            mapName,
            regDate,
            currentPhase,   // { title, description, date } — the active phase from timeline
            camps,          // [{ name, kds }]
            campDkpRows,    // [{ campName, totalKP, totalPower, powerDelta, ... }] from leaderboard
        } = body;

        if (!camps || camps.length === 0) {
            return NextResponse.json({ error: 'No coalition data provided.' }, { status: 400 });
        }

        const customKey = req.headers.get('x-gemini-key');
        const apiKey    = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key missing.' }, { status: 500 });
        }

        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

        // ── Build coalition summary ───────────────────────────────────────────
        const coalitionLines = camps.map(c => {
            const kds = c.kds ? c.kds.split(',').map(k => k.trim()).filter(Boolean) : [];
            const dkp = campDkpRows?.find(r => r.campName === c.name);
            const lines = [`  Coalition: ${c.name} (${kds.length} kingdom${kds.length !== 1 ? 's' : ''})`];
            if (kds.length > 0) lines.push(`    Kingdoms: ${kds.join(', ')}`);
            if (dkp) {
                if (dkp.totalPower)  lines.push(`    Total Power: ${Number(dkp.totalPower).toLocaleString()}`);
                if (dkp.powerDelta)  lines.push(`    Power Delta (KvK growth): ${Number(dkp.powerDelta) > 0 ? '+' : ''}${Number(dkp.powerDelta).toLocaleString()}`);
                if (dkp.totalKP)     lines.push(`    Kill Points: ${Number(dkp.totalKP).toLocaleString()}`);
                if (dkp.t4Kills)     lines.push(`    T4 Kills: ${Number(dkp.t4Kills).toLocaleString()}`);
                if (dkp.t5Kills)     lines.push(`    T5 Kills: ${Number(dkp.t5Kills).toLocaleString()}`);
                if (dkp.deaths)      lines.push(`    Deaths: ${Number(dkp.deaths).toLocaleString()}`);
                if (dkp.campDkp)     lines.push(`    Camp DKP Score: ${Number(dkp.campDkp).toLocaleString()}`);
            }
            return lines.join('\n');
        }).join('\n\n');

        const phaseText = currentPhase
            ? `Current Active Phase: "${currentPhase.title}" — ${currentPhase.description} (${currentPhase.date})`
            : `KvK format started ${regDate || 'unknown registration date'}. Phase data not yet available.`;

        // ── Build prompt ──────────────────────────────────────────────────────
        const prompt = `You are J.A.R.V.I.S., the embedded AI tactical analyst for Unity — a Rise of Kingdoms KvK command platform.
Your operator is a Kingdom Leader running the "${mapName}" Season of Conquest.

SITUATION:
${phaseText}

COALITION MATCHUP DATA:
${coalitionLines}

Return ONLY a raw JSON object. No markdown. No code fences. No explanation. Just the JSON.

{
  "classifiedLevel": "EYES ONLY — KvK COMMAND",
  "situationAssessment": "2-3 sentences. Who is winning and why. Use coalition names.",
  "threatMatrix": [
    { "coalition": "NAME", "threatLevel": "CRITICAL|HIGH|MODERATE|LOW", "assessment": "1 sentence.", "exploitableWeakness": "1 sentence." }
  ],
  "yourPosition": "1-2 sentences on the strongest coalition's standing vs the field.",
  "winConditions": ["Directive 1.", "Directive 2.", "Directive 3."],
  "criticalIntel": "1 sentence. The most important thing leadership cannot ignore.",
  "commanderVerdict": "1 sentence. Bottom line up front."
}

Be direct. Be militarily precise. Every field must be a short, punchy string or array of strings.`;

        // ── Call Gemini ───────────────────────────────────────────────────────
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                })
            }
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            return NextResponse.json({ error: `Gemini refused payload: ${errText}` }, { status: 502 });
        }

        const geminiData = await geminiRes.json();
        const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Strip any markdown fences and extract the JSON object
        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const fi = cleaned.indexOf('{');
        const li = cleaned.lastIndexOf('}');
        if (fi !== -1 && li >= fi) cleaned = cleaned.substring(fi, li + 1);

        let brief;
        try {
            brief = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('[SoC Brief] JSON parse failed. Raw Gemini output:', rawText.substring(0, 500));
            return NextResponse.json({
                error: `AI returned malformed JSON: ${parseErr.message}. Try again.`
            }, { status: 502 });
        }

        return NextResponse.json({ success: true, brief });

    } catch (err) {
        console.error('[SoC Brief API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal fault during brief generation.' }, { status: 500 });
    }
}
