import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
process.env.AWS_TABLE_NAME = 'unity-global-scans';
process.env.AWS_REGION = 'us-east-1';

import { getMigrationMatrix, getBehavioralMatrix } from './src/lib/awsDynamo.js';

async function test() {
    console.log("Fetching Migration Matrix...");
    const migration = await getMigrationMatrix('4025', '2026-03-27T00:00:00.000Z', '2026-03-29T23:59:59.000Z');
    
    console.log("Fetching Behavioral Matrix...");
    const behavioral = await getBehavioralMatrix('4025', '2026-03-27T00:00:00.000Z', '2026-03-29T23:59:59.000Z');
    
    // Find DREAM
    const dreamM = migration.find(m => m.name === 'DREAM' || m.id === '218860009');
    const dreamB = behavioral.find(b => b.name === 'DREAM' || b.id === '218860009');

    console.log("Dream (Migration Matrix - Tracker):", dreamM ? { pow: dreamM.powerDelta, kp: dreamM.kpDelta } : "Not found");
    console.log("Dream (Behavioral Matrix - Growth):", dreamB ? { pow: dreamB.powerDiff, kp: dreamB.kpDiff } : "Not found");

    // Check Cosmint
    const cosmintM = migration.find(m => m.name === 'Cosmint' || m.id === '218880859');
    const cosmintB = behavioral.find(b => b.name === 'Cosmint');

    console.log("Cosmint (Migration):", cosmintM ? { pow: cosmintM.powerDelta, kp: cosmintM.kpDelta } : "Not Found");
    console.log("Cosmint (Behavioral):", cosmintB ? { pow: cosmintB.powerDiff, kp: cosmintB.kpDiff } : "Not Found");
    
    // Check if anyone in Migration Matrix has KP delta > 0
    const mWithKp = migration.filter(m => m.kpDelta > 0 && m.type !== 'MISSING' && m.type !== 'NEW');
    console.log(`Out of ${migration.length} anomalous tracking records, ${mWithKp.length} of them have KP > 0!`);
    
    if (mWithKp.length > 0) {
        console.log("Example:", { name: mWithKp[0].name, kpDelta: mWithKp[0].kpDelta, powerDelta: mWithKp[0].powerDelta });
    }
}
test();
