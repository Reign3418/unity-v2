import { NextResponse } from 'next/server';
import { getGlobalConfig } from '@/lib/awsDynamo';

export const maxDuration = 60;

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
Your operator is a Kingdom Leader running the "${mapName}" Season of Conquest. They need a hard-edged, actionable intelligence briefing RIGHT NOW.

SITUATION:
${phaseText}

COALITION MATCHUP DATA:
${coalitionLines}

YOUR MISSION:
Deliver a CLASSIFIED TACTICAL BRIEF for leadership. Be direct, be specific, be militarily precise. No fluff.

Structure your response as a raw JSON object (NO markdown, NO code fences):
{
  "classifiedLevel": "EYES ONLY — KvK COMMAND",
  "situationAssessment": "2-3 sentence hard read on the current battlefield state. Who is winning and why. Use the actual coalition names.",
  "threatMatrix": [
    {
      "coalition": "NAME",
      "threatLevel": "CRITICAL | HIGH | MODERATE | LOW",
      "assessment": "1-2 sentences on their strength, kill count, KP standing, and whether they are a primary threat.",
      "exploitableWeakness": "One specific tactical weakness or gap visible in their data."
    }
  ],
  "yourPosition": "Brutal honest assessment of the home coalition's standing (use the coalition with the most kingdoms or highest power as 'home' if ambiguous). Are you ahead, behind, or trading blows?",
  "winConditions": [
    "Specific, actionable directive #1 — what leadership must do NOW to gain or hold the advantage.",
    "Specific, actionable directive #2 — mid-term objective.",
    "Specific, actionable directive #3 — focus area or threat to neutralize."
  ],
  "criticalIntel": "The single most important observation from the data that leadership cannot ignore. Make this punch hard.",
  "commanderVerdict": "One final sentence. The bottom line up front. What is the outcome of this KvK if nothing changes?"
}

TONE: You are a battle-hardened AI analyst, not a friendly chatbot. Give them the truth.`;

        // ── Call Gemini ───────────────────────────────────────────────────────
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, responseMimeType: 'application/json', maxOutputTokens: 2048 }
                })
            }
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            return NextResponse.json({ error: `Gemini refused payload: ${errText}` }, { status: 502 });
        }

        const geminiData = await geminiRes.json();
        const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const fi = cleaned.indexOf('{');
        const li = cleaned.lastIndexOf('}');
        if (fi !== -1 && li >= fi) cleaned = cleaned.substring(fi, li + 1);

        const brief = JSON.parse(cleaned);
        return NextResponse.json({ success: true, brief });

    } catch (err) {
        console.error('[SoC Brief API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal fault during brief generation.' }, { status: 500 });
    }
}
