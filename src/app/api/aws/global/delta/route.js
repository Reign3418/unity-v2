import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomDeltas, getKingdomTrends } from "@/lib/awsDynamo";

export const maxDuration = 300;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const kdsParam = searchParams.get('kds');
        const startScan = searchParams.get('start');
        const endScan = searchParams.get('end');
        const capParam = searchParams.get('cap'); // 'All', '300', '400', etc.
        
        if (!kdsParam || !startScan || !endScan) {
            return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
        }

        const kingdoms = kdsParam.split(',').map(k => k.trim());
        const cap = capParam === 'All' ? 0 : parseInt(capParam || '0');
        const targetStart = new Date(startScan);
        const targetEnd = new Date(endScan);

        const fetchPromises = kingdoms.map(async (kd) => {
            try {
                // Find closest actual scanDates for this kingdom
                const history = await getKingdomTrends(kd);
                if (!history || history.length === 0) return { kingdom: kd, startPower: 0, endPower: 0, powerDelta: 0, kpGained: 0, deadsGained: 0 };
                
                let startIso = null;
                let endIso = null;
                let closestStartDiff = Infinity;
                let closestEndDiff = Infinity;

                history.forEach(t => {
                    if (!t.scanDate) return;
                    const dateStr = t.scanDate.split('T')[0];
                    const tDate = new Date(dateStr);
                    
                    const startDiff = Math.abs(tDate - targetStart);
                    if (startDiff < closestStartDiff) {
                        closestStartDiff = startDiff;
                        startIso = t.scanDate;
                    }
                    const endDiff = Math.abs(tDate - targetEnd);
                    if (endDiff < closestEndDiff) {
                        closestEndDiff = endDiff;
                        endIso = t.scanDate;
                    }
                });

                if (!startIso || !endIso) return { kingdom: kd, startPower: 0, endPower: 0, powerDelta: 0, kpGained: 0, deadsGained: 0 };

                // getKingdomDeltas already fetches exact rosters and computes individual deltas!
                // Missing players (migrated out) get deadsDelta = 0, so they don't drag down the sum.
                // NEW players (migrated in) get deadsDelta = 0 (baseline).
                const roster = await getKingdomDeltas(kd, startIso, endIso);
                
                if (!roster || roster.length === 0) {
                    return { kingdom: kd, startPower: 0, endPower: 0, powerDelta: 0, kpGained: 0, deadsGained: 0 };
                }

                // If cap is applied, we only sum the deltas of the Top N players by ending power
                let validRoster = roster.filter(g => g.powerDelta !== 'MISSING');
                validRoster.sort((a, b) => b.power - a.power);
                
                if (cap > 0 && validRoster.length > cap) {
                    validRoster = validRoster.slice(0, cap);
                }

                let sPower = 0, ePower = 0, pDelta = 0, kDelta = 0, dDelta = 0;
                
                // We also need to sum the startPower and endPower for the exact cohort
                for (const gov of validRoster) {
                    ePower += gov.power;
                    // If they are NEW, they didn't exist at startScan, so startPower is 0
                    const pStart = gov.powerDelta === 'NEW' ? 0 : (gov.power - gov.powerDelta);
                    sPower += pStart;
                    
                    pDelta += (gov.powerDelta === 'NEW' ? gov.power : gov.powerDelta);
                    kDelta += gov.kpDelta;
                    dDelta += gov.deadsDelta;
                }

                return {
                    kingdom: kd,
                    startPower: sPower,
                    endPower: ePower,
                    powerDelta: pDelta,
                    kpGained: kDelta,
                    deadsGained: dDelta
                };
            } catch (e) {
                console.error(`[API/AWS/Global/Delta] Failed to calculate exact deltas for ${kd}:`, e);
                return { kingdom: kd, startPower: 0, endPower: 0, powerDelta: 0, kpGained: 0, deadsGained: 0 };
            }
        });

        const results = await Promise.all(fetchPromises);
        return NextResponse.json({ exactDeltas: results }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Global/Delta] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error mapping exact deltas." }, { status: 500 });
    }
}
