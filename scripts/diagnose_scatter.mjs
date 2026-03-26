import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const TABLE = process.env.AWS_TABLE_NAME;
const KD = process.argv[2] || '3155';

console.log(`\n=== DIAGNOSING SCATTER PLOT FOR KD ${KD} ===\n`);

// 1. Get all DATES# records
console.log(`[1] Querying DATES#${KD}...`);
const dateResult = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: `DATES#${KD}` } }
}));

if (!dateResult.Items || dateResult.Items.length === 0) {
    console.log(`   ❌ NO DATES records found for KD ${KD}!`);
    process.exit(1);
}

console.log(`   ✅ Found ${dateResult.Items.length} date entries:\n`);
const dates = [];
for (const item of dateResult.Items) {
    const sk = item.SK?.S;
    const scanDate = item.attributes?.M?.scanDate?.S;
    console.log(`   SK: "${sk}"`);
    console.log(`   attributes.scanDate: "${scanDate}"\n`);
    dates.push({ sk, scanDate });
}

// 2. Try to fetch the first snapshot using its SK directly
if (dates.length > 0) {
    const firstSK = dates[0].sk;
    console.log(`\n[2] Testing getSnapshot with SK="${firstSK}"...`);
    
    // The old code strips 'SCAN#' from SK to get the dateStr, then builds SCAN#KD#dateStr
    const strippedOld = firstSK.replace('SCAN#', '');
    const queryKeyOld = `SCAN#${KD}#${strippedOld}`;
    console.log(`   Old query PK would be: "${queryKeyOld}"`);
    
    // Try querying with this key
    const snapResult = await client.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: queryKeyOld } },
        Limit: 3
    }));
    
    if (snapResult.Items && snapResult.Items.length > 0) {
        console.log(`   ✅ OLD KEY WORKS — Found ${snapResult.Count} items`);
        const sample = snapResult.Items[0];
        console.log(`   Sample item SK: "${sample.SK?.S}"`);
        console.log(`   Sample attrs keys: ${Object.keys(sample.attributes?.M || {}).join(', ')}`);
    } else {
        console.log(`   ❌ OLD KEY FAILED — 0 items returned`);
        
        // Try alternative: use the SK literal as the PK
        const queryKeyAlt = firstSK;
        console.log(`\n   Trying alt PK: "${queryKeyAlt}"...`);
        const altResult = await client.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: queryKeyAlt } },
            Limit: 3
        }));
        if (altResult.Items && altResult.Items.length > 0) {
            console.log(`   ✅ ALT KEY WORKS — Found ${altResult.Count} items`);
            const sample = altResult.Items[0];
            console.log(`   Sample SK: "${sample.SK?.S}"`);
        } else {
            console.log(`   ❌ ALT KEY ALSO FAILED`);

            // Try SCAN#KD as PK with date as SK
            const queryKeyAlt2 = `SCAN#${KD}`;
            console.log(`\n   Trying PK="${queryKeyAlt2}" with begins_with SK...`);
            const alt2Result = await client.send(new QueryCommand({
                TableName: TABLE,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: queryKeyAlt2 } },
                Limit: 5
            }));
            if (alt2Result.Items && alt2Result.Items.length > 0) {
                console.log(`   ✅ FLAT SCAN#KD KEY WORKS — sample:`);
                for (const item of alt2Result.Items.slice(0, 2)) {
                    console.log(`      PK="${item.PK?.S}" SK="${item.SK?.S}"`);
                }
            } else {
                console.log(`   ❌ ALL KEY FORMATS FAILED — data may not exist in expected schema`);
            }
        }
    }
}

console.log(`\n=== DIAGNOSIS COMPLETE ===\n`);
