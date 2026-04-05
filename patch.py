import sys

with open('src/lib/awsDynamo.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace getKingdomDeltas parameters and date match
code = code.replace(
    'export async function getKingdomDeltas(kingdomId) {',
    'export async function getKingdomDeltas(kingdomId, customStart = null, customEnd = null) {'
)

# Replace the Date finding logic completely
old_logic = '''        // Target a 24-hour baseline for accurate growth tracking, ignoring micro-scans
        const latestParsed = new Date(dates[0].scanDate);
        const targetTime = latestParsed.getTime() - (24 * 60 * 60 * 1000);
        const latestType = dates[0].scanType;

        let bestMatchIndex = -1;
        let smallestDiff = Infinity;

        for (let i = 1; i < dates.length; i++) {
            if (dates[i].scanType !== latestType) continue; // CRITICAL: Structurally similar pairing

            const timeDiff = Math.abs(new Date(dates[i].scanDate).getTime() - targetTime);
            if (timeDiff < smallestDiff) {
                smallestDiff = timeDiff;
                bestMatchIndex = i;
            }
        }

        if (bestMatchIndex === -1) {
            console.log(`[AWS Engine] No comparable chronolog found for ${latestType} schema payload.`);
            return await getKingdomRoster(kingdomId);
        }

        // Extract the exact dateKey string stripped from the DATES# SK ("SCAN#<dateKey>")
        const latestDateKey = dates[0].sk.replace('SCAN#', '').replace('DATE#', '');
        const previousDateKey = dates[bestMatchIndex].sk.replace('SCAN#', '').replace('DATE#', '');'''

new_logic = '''        let latestDateKey;
        let previousDateKey;

        if (customStart && customEnd) {
            // Precise custom mapping match
            const endMatch = dates.find(d => d.scanDate.startsWith(customEnd));
            const startMatch = dates.find(d => d.scanDate.startsWith(customStart));
            
            if (!endMatch || !startMatch) return []; // Math fail fallback
            latestDateKey = endMatch.sk.replace('SCAN#', '').replace('DATE#', '');
            previousDateKey = startMatch.sk.replace('SCAN#', '').replace('DATE#', '');
        } else {
            // Target a 24-hour baseline for accurate growth tracking (legacy route fallback)
            const latestParsed = new Date(dates[0].scanDate);
            const targetTime = latestParsed.getTime() - (24 * 60 * 60 * 1000);
            const latestType = dates[0].scanType;

            let bestMatchIndex = -1;
            let smallestDiff = Infinity;

            for (let i = 1; i < dates.length; i++) {
                if (dates[i].scanType !== latestType) continue; 
                const timeDiff = Math.abs(new Date(dates[i].scanDate).getTime() - targetTime);
                if (timeDiff < smallestDiff) {
                    smallestDiff = timeDiff;
                    bestMatchIndex = i;
                }
            }

            if (bestMatchIndex === -1) return await getKingdomRoster(kingdomId);

            latestDateKey = dates[0].sk.replace('SCAN#', '').replace('DATE#', '');
            previousDateKey = dates[bestMatchIndex].sk.replace('SCAN#', '').replace('DATE#', '');
        }'''
code = code.replace(old_logic, new_logic)

# Replace getSnapshot logic interior mapping
old_snapshot = '''                            power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                            killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                            commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N) || 0,
                            deads: parseInt(attrs['Dead']?.N || attrs['deads']?.N) || parseInt(attrs['dead']?.N) || 0,
                        };'''
new_snapshot = '''                            power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                            killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                            deads: parseInt(attrs['Dead']?.N || attrs['deads']?.N) || parseInt(attrs['dead']?.N) || 0,
                            t4Kills: parseInt(attrs['T4 Kills']?.N || attrs['T4 Kills']?.N) || 0,
                            t5Kills: parseInt(attrs['T5 Kills']?.N || attrs['T5 Kills']?.N) || 0,
                            commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N) || 0,
                        };'''
code = code.replace(old_snapshot, new_snapshot)

# Replace roster delta calculations
old_delta = '''            let powerDelta = prevData ? (latestData.power - prevData.power) : 'NEW';
            let kpDelta = prevData ? (latestData.killPoints - prevData.killPoints) : 0;
            let deadsDelta = prevData ? (latestData.deads - prevData.deads) : 0;
            let cmdBase = prevData ? prevData.commanderPower : 0;
            
            roster.push({
                id,
                name: latestData.name,
                alliance: latestData.alliance,
                power: latestData.power,
                killPoints: latestData.killPoints,
                deads: latestData.deads,
                commanderPower: latestData.commanderPower,
                cmdBase: cmdBase,
                powerDelta: powerDelta,
                kpDelta: kpDelta,
                deadsDelta: deadsDelta
            });'''
new_delta = '''            let powerDelta = prevData ? (latestData.power - prevData.power) : 'NEW';
            let kpDelta = prevData ? (latestData.killPoints - prevData.killPoints) : 0;
            let deadsDelta = prevData ? (latestData.deads - prevData.deads) : 0;
            let t4Delta = prevData ? (latestData.t4Kills - prevData.t4Kills) : 0;
            let t5Delta = prevData ? (latestData.t5Kills - prevData.t5Kills) : 0;
            let cmdBase = prevData ? prevData.commanderPower : 0;
            
            roster.push({
                id,
                name: latestData.name,
                alliance: latestData.alliance,
                power: latestData.power,
                killPoints: latestData.killPoints,
                deads: latestData.deads,
                t4Kills: latestData.t4Kills,
                t5Kills: latestData.t5Kills,
                commanderPower: latestData.commanderPower,
                cmdBase: cmdBase,
                powerDelta: powerDelta,
                kpDelta: kpDelta,
                deadsDelta: deadsDelta,
                t4Delta: Math.max(0, t4Delta),
                t5Delta: Math.max(0, t5Delta)
            });'''
code = code.replace(old_delta, new_delta)

with open('src/lib/awsDynamo.js', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Patching Dynamo Completed!")
