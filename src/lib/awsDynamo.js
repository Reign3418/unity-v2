import { DynamoDBClient, ScanCommand, QueryCommand, PutItemCommand, UpdateItemCommand, GetItemCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';

// Initialize the DynamoDB Client
const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

/**
 * Fetches a Global Configuration key from DynamoDB
 */
export async function getGlobalConfig(configKey) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return null;

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_CONFIG' },
            ':sk': { S: `CONFIG#${configKey}` }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        if (result.Items && result.Items.length > 0) {
            return result.Items[0].attributes?.M?.value?.S || null;
        }
        return null;
    } catch (e) {
        console.error(`[AWS] Failed to fetch global config ${configKey}:`, e);
        return null;
    }
}

/**
 * Retrieves the complete array of all kingdoms that have ever been uploaded
 * to the AWS cloud ecosystem, automatically bypassing tenant restrictions for Super Admins.
 */
export async function getAllTrackedKingdoms() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];
    
    try {
        const params = {
            TableName: tableName,
            Key: {
                'PK': { S: 'SYSTEM#CONFIG' },
                'SK': { S: 'TRACKED_KINGDOMS' }
            }
        };
        const result = await dbClient.send(new GetItemCommand(params));
        if (result.Item && result.Item.kingdoms && result.Item.kingdoms.SS) {
            return result.Item.kingdoms.SS.filter(kd => String(kd).replace(/\D/g, '').length < 10).sort((a,b) => parseInt(a) - parseInt(b));
        }
        return [];
    } catch (e) {
        console.error("AWS GetAllTrackedKingdoms Error", e);
        return [];
    }
}

/**
 * Searches the Unity global AWS DynamoDB table for a specific Governor ID or Name
 */
export async function getGovernorStats(queryParam) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const isWildcard = String(queryParam).includes('*');
    const safeQuery = String(queryParam).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const exactRegex = new RegExp(`^${safeQuery}$`, 'i');
    
    // Optimization 1: If the query is completely numeric, it's a Governor ID. 
    // We can do a direct O(1) Key Query instead of a massive database scan.
    if (/^\d+$/.test(String(queryParam))) {
        try {
            console.log(`[AWS] Executing O(1) Direct Query for ID ${queryParam}...`);
            const queryParams = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `GOV_PROFILE#${queryParam}` } }
            };
            
            const result = await dbClient.send(new QueryCommand(queryParams));
            if (result.Items && result.Items.length > 0) {
                const item = result.Items[0];
                const attrs = item.attributes?.M || {};
                return {
                    id: String(queryParam),
                    name: attrs.name?.S || 'Unknown',
                    lastSeenKingdom: attrs.lastSeenKingdom?.S || attrs.lastSeenKingdom?.N || 'Unknown',
                    lastSeenDate: attrs.lastSeenDate?.S || 'Unknown'
                };
            }
        } catch (e) {
            console.error("AWS O(1) Search Error", e);
        }
        // If exact ID query fails or user doesn't exist under that exact schema, fallback to Regex parallel scan
    }

    // Optimization 2: Parallel Threaded Scanning for Text-based Name Queries
    console.log(`[AWS Multi-Thread] Parallel scanning DynamoDB for string: ${queryParam}...`);
    
    const baseParams = {
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
            ':prefix': { S: 'GOV_PROFILE#' }
        }
    };

    try {
        const SEGMENTS = 5; // Spawn 5 parallel AWS execution threads
        const scanPromises = [];
        
        for (let i = 0; i < SEGMENTS; i++) {
            scanPromises.push((async () => {
                const params = { ...baseParams, Segment: i, TotalSegments: SEGMENTS };
                let lastEvaluatedKey = null;
                
                do {
                    if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
                    
                    const result = await dbClient.send(new ScanCommand(params));
                    
                    if (result.Items) {
                        for (const item of result.Items) {
                            const attrs = item.attributes?.M || {};
                            const name = attrs.name?.S || 'Unknown';
                            const id = item.PK.S.replace('GOV_PROFILE#', '');
                            
                            if (exactRegex.test(name) || String(id) === String(queryParam)) {
                                return {
                                    id: id,
                                    name: name,
                                    lastSeenKingdom: attrs.lastSeenKingdom?.S || attrs.lastSeenKingdom?.N || 'Unknown',
                                    lastSeenDate: attrs.lastSeenDate?.S || 'Unknown'
                                };
                            }
                        }
                    }
                    lastEvaluatedKey = result.LastEvaluatedKey;
                } while (lastEvaluatedKey);
                
                return null;
            })());
        }
        
        // Return the first thread that successfully finds a match
        const results = await Promise.all(scanPromises);
        const match = results.find(res => res !== null);
        
        return match || null;

    } catch (e) {
        console.error("AWS Parallel Search Error", e);
        return null;
    }
}

/**
 * Searches the Unity global AWS DynamoDB table for all records matching a specific Kingdom
 */
export async function getKingdomRoster(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    try {
        console.log(`[AWS] Finding the Latest Scan Date for Kingdom ${kingdomId}...`);
        
        // 1. First, find out the most recent date this Kingdom was scanned.
        const dateParams = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `DATES#${kingdomId}` }
            }
        };

        const dateResult = await dbClient.send(new QueryCommand(dateParams));
        
        if (!dateResult.Items || dateResult.Items.length === 0) {
            console.log(`[AWS] No Scan Dates found for Kingdom ${kingdomId}.`);
            return []; // Kingdom hasn't been scanned yet
        }
        
        // Sort the dates (newest first)
        const dates = dateResult.Items.map(i => i.attributes?.M?.scanDate?.S).sort((a, b) => new Date(b) - new Date(a));
        const latestDate = String(dates[0]).replace(/[.#$\/\[\]\s\-:T]/g, "_").substring(0, 19);
        
        console.log(`[AWS] Querying DynamoDB for Kingdom ${kingdomId} Roster from ${latestDate}...`);

        // 2. Query the actual Roster Snapshot for that exact date
        const params = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `SCAN#${kingdomId}#${latestDate}` }
            }
        };

        let roster = [];
        let lastEvaluatedKey = null;

        do {
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }
            
            const result = await dbClient.send(new QueryCommand(params));
            
            if (result.Items) {
                for (const item of result.Items) {
                    const attrs = item.attributes?.M || {};
                    // Raw payload from Unity uses exact capitalized strings in the Roster / Scan dumps
                    roster.push({
                        id: attrs['Governor ID']?.S || attrs['id']?.S || item.SK.S.replace('GOV#', ''),
                        name: attrs['Governor Name']?.S || attrs['name']?.S || 'Unknown',
                        alliance: attrs['Alliance Tag']?.S || 'None',
                        
                        // Stats
                        power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                        killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                        dead: parseInt(attrs['Deads']?.N || attrs['dead']?.N) || 0,
                        t4Kills: parseInt(attrs['T4 Kills']?.N || attrs['t4Kills']?.N) || 0,
                        t5Kills: parseInt(attrs['T5 Kills']?.N || attrs['t5Kills']?.N) || 0,
                         gathered: parseInt(attrs['Resources Gathered']?.N || attrs['gathered']?.N) || 0,
                        assistance: parseInt(attrs['Assistance']?.N || attrs['assistance']?.N) || 0,
                        
                        // Sub-Power Metrics
                        troopPower: parseInt(attrs['Troop Power']?.N || attrs['troop power']?.N || attrs['troopPower']?.N) || 0,
                        techPower: parseInt(attrs['Tech Power']?.N || attrs['tech power']?.N || attrs['techPower']?.N) || 0,
                        commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N || attrs['commanderPower']?.N) || 0,
                        buildingPower: parseInt(attrs['Building Power']?.N || attrs['building power']?.N || attrs['buildingPower']?.N) || 0,
                        
                        // Deltas
                        powerDelta: parseInt(attrs['powerDelta']?.N) || 0,
                        kpDelta: parseInt(attrs['kpDelta']?.N) || 0,
                        deadsDelta: parseInt(attrs['deadsDelta']?.N) || 0,
                        gatheredDelta: parseInt(attrs['gatheredDelta']?.N) || 0
                    });
                }
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
            
        } while (lastEvaluatedKey);
        
        return roster;
    } catch (e) {
        console.error("AWS Kingdom Roster Error", e);
        return [];
    }
}

/**
 * O(1) Fetch Engine: Retrieves the chronological Macro-Analytics stringified metadata for all Scans in a Kingdom.
 * Extremely high-performance querying for Recharts processing.
 */
export async function getKingdomTrends(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    try {
        const dateParams = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kingdomId}` } }
        };

        const dateResult = await dbClient.send(new QueryCommand(dateParams));
        
        if (!dateResult.Items || dateResult.Items.length === 0) {
            return [];
        }
        
        const trends = dateResult.Items.map(i => {
            const attrs = i.attributes?.M || {};
            let summary = null;
            if (attrs.summary?.S) {
               try { summary = JSON.parse(attrs.summary.S); } catch (e) {}
            }
            return {
                scanDate: attrs.scanDate?.S,
                rowCount: parseInt(attrs.rowCount?.N || 0),
                summary: summary
            };
        }).sort((a, b) => {
            const dateA = new Date((a.scanDate || "").split('T')[0].split('_')[0]);
            const dateB = new Date((b.scanDate || "").split('T')[0].split('_')[0]);
            return dateA - dateB;
        }); // Chronological ascending for Recharts plotting
        
        return trends;
    } catch (e) {
        console.error("AWS Kingdom Trends Error", e);
        return [];
    }
}

/**
 * Advanced AI Engine: Fetches the last TWO AWS Scans for a Kingdom and performs a chronological mapping
 * differential to return a Roster payload with native `powerDelta` and missing attributes.
 */
export async function getKingdomDeltas(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    try {
        console.log(`[AWS Engine] Initiating Activity Differential Matrix for KD ${kingdomId}...`);
        
        const dateParams = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kingdomId}` } }
        };

        const dateResult = await dbClient.send(new QueryCommand(dateParams));
        
        if (!dateResult.Items || dateResult.Items.length < 2) {
            return await getKingdomRoster(kingdomId); // Fallback to Standard Roster
        }
        
        const dates = dateResult.Items.map(i => {
           const attrs = i.attributes?.M || {};
           let summaryObj = {};
           try { summaryObj = JSON.parse(attrs.summary?.S || "{}"); } catch(e){}
           return {
               sk: i.SK.S, // "SCAN#2026_03_24_..."
               scanDate: attrs.scanDate?.S,
               scanType: summaryObj.scanType || 'Full' // Legacy defaults to Full
           };
        }).sort((a, b) => new Date(b.scanDate) - new Date(a.scanDate));
        
        // Target a 24-hour baseline for accurate growth tracking, ignoring micro-scans
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
        const previousDateKey = dates[bestMatchIndex].sk.replace('SCAN#', '').replace('DATE#', '');
        
        const getSnapshot = async (dateStr) => {
            const params = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `SCAN#${kingdomId}#${dateStr}` } }
            };
            const snapshot = {};
            let lastEvaluatedKey = null;
            do {
                if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
                const result = await dbClient.send(new QueryCommand(params));
                if (result.Items) {
                    for (const item of result.Items) {
                        const attrs = item.attributes?.M || {};
                        const id = attrs['Governor ID']?.S || attrs['id']?.S || item.SK.S.replace('GOV#', '');
                        snapshot[id] = {
                            name: attrs['Governor Name']?.S || attrs['name']?.S || 'Unknown',
                            alliance: attrs['Alliance Tag']?.S || 'None',
                            power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                            killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                            commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N) || 0,
                        };
                    }
                }
                lastEvaluatedKey = result.LastEvaluatedKey;
            } while (lastEvaluatedKey);
            return snapshot;
        };

        const [latestSnap, prevSnap] = await Promise.all([
            getSnapshot(latestDateKey),
            getSnapshot(previousDateKey)
        ]);

        const roster = [];
        
        // 1. Map Latest and Diff against Previous
        for (const [id, latestData] of Object.entries(latestSnap)) {
            const prevData = prevSnap[id];
            
            // "NEW" arrival identified by `powerDelta = 'NEW'` string for UI processing
            let powerDelta = prevData ? (latestData.power - prevData.power) : 'NEW';
            let cmdBase = prevData ? prevData.commanderPower : 0;
            
            roster.push({
                id,
                name: latestData.name,
                alliance: latestData.alliance,
                power: latestData.power,
                killPoints: latestData.killPoints,
                commanderPower: latestData.commanderPower,
                cmdBase: cmdBase,
                powerDelta: powerDelta
            });
        }
        
        // 2. Identify Missing Governors (Migrated or Renamed)
        for (const [id, prevData] of Object.entries(prevSnap)) {
            if (!latestSnap[id]) {
                roster.push({
                    id,
                    name: prevData.name,
                    alliance: prevData.alliance,
                    power: 0, // 0 latest power triggers "Missing" flag in Tracker UI
                    killPoints: prevData.killPoints,
                    commanderPower: 0,
                    cmdBase: prevData.commanderPower,
                    powerDelta: 'MISSING'
                });
            }
        }

        return roster;
    } catch (e) {
        console.error("AWS Kingdom Deltas Error", e);
        return [];
    }
}

export async function getOverviewDeltas(kingdomId, startIso, endIso) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    try {
        const dateParams = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kingdomId}` } }
        };

        const dateResult = await dbClient.send(new QueryCommand(dateParams));
        if (!dateResult.Items || dateResult.Items.length < 2) {
             return [];
        }

        const dates = dateResult.Items.map(i => ({
           sk: i.SK.S, 
           scanDate: i.attributes?.M?.scanDate?.S || ''
        })).sort((a, b) => new Date(a.scanDate) - new Date(b.scanDate)); // ASCENDING
        
        let filteredDates = [...dates];
        if (startIso) {
             filteredDates = filteredDates.filter(d => new Date(d.scanDate) >= new Date(startIso + 'T00:00:00'));
        }
        if (endIso) {
             filteredDates = filteredDates.filter(d => new Date(d.scanDate) <= new Date(endIso + 'T23:59:59'));
        }
        if (filteredDates.length < 2) {
             filteredDates = [dates[0], dates[dates.length - 1]];
        }

        const startKey = filteredDates[0].sk.replace('SCAN#', '').replace('DATE#', '');
        const endKey = filteredDates[filteredDates.length - 1].sk.replace('SCAN#', '').replace('DATE#', '');

        const getSnapshot = async (dateStr) => {
            const params = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `SCAN#${kingdomId}#${dateStr}` } }
            };
            const snapshot = {};
            let lastEvaluatedKey = null;
            do {
                if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
                const result = await dbClient.send(new QueryCommand(params));
                if (result.Items) {
                    for (const item of result.Items) {
                        const attrs = item.attributes?.M || {};
                        const id = attrs['Governor ID']?.S || attrs['id']?.S || item.SK.S.replace('GOV#', '');
                        snapshot[id] = {
                            name: attrs['Governor Name']?.S || attrs['name']?.S || 'Unknown',
                            alliance: attrs['Alliance Tag']?.S || 'None',
                            power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                            killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                            dead: parseInt(attrs['Deads']?.N || attrs['dead']?.N) || 0,
                            troopPower: parseInt(attrs['Troop Power']?.N || attrs['troop power']?.N || attrs['troopPower']?.N) || 0,
                            commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N || attrs['commanderPower']?.N) || 0,
                            techPower: parseInt(attrs['Tech Power']?.N || attrs['tech power']?.N || attrs['techPower']?.N) || 0,
                            buildingPower: parseInt(attrs['Building Power']?.N || attrs['building power']?.N || attrs['buildingPower']?.N) || 0,
                            gathered: parseInt(attrs['Resources Gathered']?.N || attrs['gathered']?.N) || 0,
                            townHall: parseInt(attrs['Town Hall']?.N || attrs['CH Level']?.N || attrs['townHall']?.N) || 0
                        };
                    }
                }
                lastEvaluatedKey = result.LastEvaluatedKey;
            } while (lastEvaluatedKey);
            return snapshot;
        };

        const [startSnap, endSnap] = await Promise.all([
            getSnapshot(startKey),
            getSnapshot(endKey)
        ]);

        const roster = [];
        
        for (const [id, endData] of Object.entries(endSnap)) {
            const startData = startSnap[id] || {};
            
            roster.push({
                id,
                name: endData.name,
                alliance: endData.alliance,
                townHall: endData.townHall || startData.townHall || 25,
                status: startData.power ? 'Active' : 'New',
                powerStart: startData.power || 0,
                powerEnd: endData.power,
                powerDelta: startData.power ? (endData.power - startData.power) : 'NEW',
                
                troopStart: startData.troopPower || 0,
                troopEnd: endData.troopPower,
                troopDelta: startData.troopPower ? (endData.troopPower - startData.troopPower) : 0,

                cmdStart: startData.commanderPower || 0,
                cmdEnd: endData.commanderPower,
                cmdDelta: startData.commanderPower ? (endData.commanderPower - startData.commanderPower) : 0,

                techStart: startData.techPower || 0,
                techEnd: endData.techPower,
                techDelta: startData.techPower ? (endData.techPower - startData.techPower) : 0,

                buildStart: startData.buildingPower || 0,
                buildEnd: endData.buildingPower,
                buildDelta: startData.buildingPower ? (endData.buildingPower - startData.buildingPower) : 0,

                gatheredStart: startData.gathered || 0,
                gatheredEnd: endData.gathered,
                gatheredDelta: startData.gathered ? (endData.gathered - startData.gathered) : 0,
                
                kpStart: startData.killPoints || 0,
                kpEnd: endData.killPoints,
                kpDelta: startData.killPoints ? (endData.killPoints - startData.killPoints) : 0,
                
                deadStart: startData.dead || 0,
                deadEnd: endData.dead,
                deadDelta: startData.dead ? (endData.dead - startData.dead) : 0
            });
        }
        
        for (const [id, startData] of Object.entries(startSnap)) {
            if (!endSnap[id]) {
                roster.push({
                    id,
                    name: startData.name,
                    alliance: startData.alliance,
                    townHall: startData.townHall,
                    status: 'Missing',
                    powerStart: startData.power, powerEnd: 0, powerDelta: 'MISSING',
                    troopStart: startData.troopPower, troopEnd: 0, troopDelta: 0,
                    cmdStart: startData.commanderPower, cmdEnd: 0, cmdDelta: 0,
                    techStart: startData.techPower, techEnd: 0, techDelta: 0,
                    buildStart: startData.buildingPower, buildEnd: 0, buildDelta: 0,
                    gatheredStart: startData.gathered, gatheredEnd: 0, gatheredDelta: 0,
                    kpStart: startData.killPoints, kpEnd: 0, kpDelta: 0,
                    deadStart: startData.dead, deadEnd: 0, deadDelta: 0
                });
            }
        }

        roster.sort((a, b) => b.powerEnd - a.powerEnd);
        return roster;
    } catch (e) {
        console.error("AWS Overview Deltas Error", e);
        return [];
    }
}

/**
 * Advanced PCA Pre-Processor pipeline. Compiles longitudinal multi-dimensional datasets 
 * up to 30 continuous snapshots to determine Standard Deviations and Behavioral density.
 */
export async function getBehavioralMatrix(kingdomId, startIso, endIso) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    try {
        // 1. Get all scan date pointers for this kingdom
        const dateResult = await dbClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kingdomId}` } }
        }));
        
        if (!dateResult.Items || dateResult.Items.length < 2) return [];

        // DATES# SK = "DATE#DATEKEY" — strip "DATE#" to get the dateKey used in SCAN# PK
        // DATES# attributes.scanDate = "2026-03-21 20:29 UTC" — used for date range filtering
        const parseScanDate = (s) => new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));
        
        let dates = dateResult.Items
            .map(i => ({
                dateKey: i.SK?.S?.replace('DATE#', '').replace('SCAN#', '') || '',
                scanDate: i.attributes?.M?.scanDate?.S || ''
            }))
            .filter(d => d.dateKey && d.scanDate)
            .sort((a, b) => parseScanDate(a.scanDate) - parseScanDate(b.scanDate));

        // Apply date range filter using scanDate
        if (startIso) dates = dates.filter(d => parseScanDate(d.scanDate) >= new Date(startIso));
        if (endIso) dates = dates.filter(d => parseScanDate(d.scanDate) <= new Date(endIso + 'T23:59:59Z'));

        console.log(`[BehavioralMatrix] KD ${kingdomId}: ${dates.length} scans in range [${startIso} → ${endIso}]`);
        if (dates.length < 2) return [];

        console.log(`[BehavioralMatrix] Selected Start Key: ${dates[0].dateKey} | Selected End Key: ${dates[dates.length - 1].dateKey}`);

        // 2. Fetch a governor snapshot by querying the SCAN#KD#DATEKEY PK partition
        const fetchSnapshot = async ({ dateKey }) => {
            const snapshot = {};
            let lastKey = null;
            do {
                const params = {
                    TableName: tableName,
                    KeyConditionExpression: 'PK = :pk',
                    ExpressionAttributeValues: { ':pk': { S: `SCAN#${kingdomId}#${dateKey}` } }
                };
                if (lastKey) params.ExclusiveStartKey = lastKey;
                const res = await dbClient.send(new QueryCommand(params));
                for (const item of res.Items || []) {
                    const attrs = item.attributes?.M || {};
                    const id = attrs['Governor ID']?.S || item.SK?.S?.replace('GOV#', '') || '';
                    if (!id) continue;
                    snapshot[id] = {
                        id,
                        name: attrs['Governor Name']?.S || 'Unknown',
                        alliance: attrs['Alliance Tag']?.S || 'None',
                        power: parseInt(attrs['Power']?.N) || parseInt(attrs['power']?.N) || 0,
                        killPoints: parseInt(attrs['Kill Points']?.N) || parseInt(attrs['killPoints']?.N) || 0,
                        dead: parseInt(attrs['Deads']?.N) || parseInt(attrs['dead']?.N) || 0,
                        troopPower: parseInt(attrs['Troop Power']?.N) || parseInt(attrs['troopPower']?.N) || 0,
                        t1Kills: parseInt(attrs['T1 Kills']?.N) || parseInt(attrs['t1Kills']?.N) || 0,
                        t2Kills: parseInt(attrs['T2 Kills']?.N) || parseInt(attrs['t2Kills']?.N) || 0,
                        t3Kills: parseInt(attrs['T3 Kills']?.N) || parseInt(attrs['t3Kills']?.N) || 0,
                        t4Kills: parseInt(attrs['T4 Kills']?.N) || parseInt(attrs['t4Kills']?.N) || 0,
                        t5Kills: parseInt(attrs['T5 Kills']?.N) || parseInt(attrs['t5Kills']?.N) || 0,
                        gathered: parseInt(attrs['Resources Gathered']?.N) || parseInt(attrs['gathered']?.N) || 0,
                        techPower: parseInt(attrs['Tech Power']?.N) || parseInt(attrs['techPower']?.N) || 0,
                        bldPower: parseInt(attrs['Building Power']?.N) || parseInt(attrs['buildingPower']?.N) || 0,
                        cmdPower: parseInt(attrs['Commander Power']?.N) || parseInt(attrs['commanderPower']?.N) || 0,
                        assistance: parseInt(attrs['Assistance']?.N) || parseInt(attrs['assistance']?.N) || 0,
                        townHall: parseInt(attrs['Town Hall']?.N || attrs['CH Level']?.N || attrs['townHall']?.N) || 0
                    };
                }
                lastKey = res.LastEvaluatedKey;
            } while (lastKey);
            return snapshot;
        };

        // 3. Define the Longitudinal Waypoints (Max 5 scans to protect Vercel Memory)
        let selectedDates = [];
        if (dates.length <= 5) {
            selectedDates = [...dates];
        } else {
            // Pick exactly 5 evenly-spaced dates: Start, 3 Mids, End
            selectedDates.push(dates[0]);
            const step = (dates.length - 1) / 4;
            selectedDates.push(dates[Math.round(step * 1)]);
            selectedDates.push(dates[Math.round(step * 2)]);
            selectedDates.push(dates[Math.round(step * 3)]);
            selectedDates.push(dates[dates.length - 1]);
        }

        console.log(`[BehavioralMatrix] Longitude Interpolation: Extracted ${selectedDates.length} chronological waypoints`);

        // Execute parallel extraction of all selected snapshots
        const snapshots = await Promise.all(selectedDates.map(d => fetchSnapshot(d)));
        
        const startLine = snapshots[0];
        const endLine = snapshots[snapshots.length - 1];
        const waypointCount = snapshots.length;

        console.log(`[BehavioralMatrix] Base: ${Object.keys(startLine).length} govs | End: ${Object.keys(endLine).length} govs`);

        const roster = [];
        for (const [id, endData] of Object.entries(endLine)) {
            const startData = startLine[id];
            if (!startData || endData.power === 0) continue;

            // Longitudinal Metric Calculation
            let activeIntervals = 0;
            let sumOfJumps = 0;
            let totalKpVariance = 0;
            
            const jumps = [];
            let previousKp = startData.killPoints;

            // 1. Calculate discrete gaps exactly across the waypoints
            for (let i = 1; i < waypointCount; i++) {
                const currentKp = snapshots[i][id]?.killPoints;
                // If a player leaves/migrates mid-scan, preserve their previous known KP
                const resolvedKp = currentKp !== undefined ? currentKp : previousKp;
                
                const jump = resolvedKp - previousKp;
                jumps.push(jump);
                sumOfJumps += jump;
                
                if (jump > 0) activeIntervals++;
                previousKp = resolvedKp;
            }

            // 2. Standard Deviation Volatility Pathing
            const averageJump = jumps.length > 0 ? (sumOfJumps / jumps.length) : 0;
            if (averageJump > 0) {
                // How wildly did their actual activity fluctuate week-to-week vs their own personal average?
                jumps.forEach(j => {
                    totalKpVariance += Math.abs(j - averageJump);
                });
            }

            // Normalizing the variance metric (preventing 0 KP completely inactive players from returning 0 variance, we keep them at 0 variance but high total difference triggers normal)
            // Note: If a player is totally dead weight (0 jumps), variance is 0. If they perfectly average 5M every week, variance is 0.
            // If they do nothing for 4 intervals and jump 20M on the final day, averageJump is 4M. Variances: |-4|, |-4|, |-4|, |-4|, |16| = Total Variance 32M! 
            
            roster.push({
                id,
                name: endData.name,
                alliance: endData.alliance,
                powerDiff: endData.power - startData.power,
                troopPowerDiff: endData.troopPower - startData.troopPower,
                techPowerDiff: endData.techPower - startData.techPower,
                bldPowerDiff: endData.bldPower - startData.bldPower,
                cmdPowerDiff: endData.cmdPower - startData.cmdPower,
                deadsDiff: endData.dead - startData.dead,
                t1Diff: endData.t1Kills - startData.t1Kills,
                t2Diff: endData.t2Kills - startData.t2Kills,
                t3Diff: endData.t3Kills - startData.t3Kills,
                t4Diff: endData.t4Kills - startData.t4Kills,
                t5Diff: endData.t5Kills - startData.t5Kills,
                gatheredDiff: endData.gathered - startData.gathered,
                assistDiff: endData.assistance - startData.assistance,
                kpDiff: endData.killPoints - startData.killPoints,
                activeDays: activeIntervals, 
                kpVolatility: totalKpVariance, 
                kpRaw: endData.killPoints,
                deadsRaw: endData.dead,
                powerRaw: endData.power,
                powerEnd: endData.power,
                townHall: endData.townHall
            });
        }

        console.log(`[BehavioralMatrix] Compiled ${roster.length} 5-Dimensional governor trajectories`);
        return roster;

    } catch (e) {
        console.error("AWS Behavioral Matrix Error", e);
        return [];
    }
}

/**
 * Fetches the historical chronological JSON footprints for a specific Governor
 */

/**
 * Resolves comprehensive Asleep, Missing, and Migration cross-kingdom paths.
 */
export async function getMigrationMatrix(kingdomId, startIso, endIso) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    try {
        console.log(`[MigrationMatrix] Triggered KD ${kingdomId}: ${startIso || 'LATEST-24'} -> ${endIso || 'LATEST'}`);
        const dateResult = await dbClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kingdomId}` } }
        }));
        if (!dateResult.Items || dateResult.Items.length < 2) return [];

        const parseScanDate = (s) => new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));
        
        let dates = dateResult.Items
            .map(i => ({
                dateKey: i.SK?.S?.replace('DATE#', '').replace('SCAN#', '') || '',
                scanDate: i.attributes?.M?.scanDate?.S || ''
            }))
            .filter(d => d.dateKey && d.scanDate)
            .sort((a, b) => parseScanDate(a.scanDate) - parseScanDate(b.scanDate));

        let startTarget = null;
        let endTarget = null;

        if (startIso) {
           const sI = new Date(startIso).getTime();
           startTarget = dates.find(d => Math.abs(parseScanDate(d.scanDate).getTime() - sI) < 86400000) || dates[0];
        } else { 
           startTarget = dates[dates.length - 2] || dates[0]; 
        }

        if (endIso) {
           const eI = new Date(endIso).getTime();
           endTarget = dates.reverse().find(d => Math.abs(parseScanDate(d.scanDate).getTime() - eI) < 86400000) || dates[dates.length-1];
        } else { endTarget = dates[dates.length-1]; }

        dates.sort((a, b) => parseScanDate(a.scanDate) - parseScanDate(b.scanDate));

        const fetchSnapshot = async ({ dateKey }) => {
            const snapshot = {};
            let lastKey = null;
            do {
                const params = {
                    TableName: tableName,
                    KeyConditionExpression: 'PK = :pk',
                    ExpressionAttributeValues: { ':pk': { S: `SCAN#${kingdomId}#${dateKey}` } }
                };
                if (lastKey) params.ExclusiveStartKey = lastKey;
                const res = await dbClient.send(new QueryCommand(params));
                for (const item of res.Items || []) {
                    const attrs = item.attributes?.M || {};
                    const id = attrs['Governor ID']?.S || attrs['id']?.S || item.SK?.S?.replace('GOV#', '') || '';
                    if (!id) continue;
                    snapshot[id] = {
                        id,
                        name: attrs['Governor Name']?.S || attrs['name']?.S || 'Unknown',
                        alliance: attrs['Alliance Tag']?.S || 'None',
                        power: parseInt(attrs['Power']?.N) || parseInt(attrs['power']?.N) || 0,
                        killPoints: parseInt(attrs['Kill Points']?.N) || parseInt(attrs['killPoints']?.N) || parseInt(attrs['kp']?.N) || parseInt(attrs['kill points']?.N) || 0,
                        dead: parseInt(attrs['Deads']?.N) || parseInt(attrs['dead']?.N) || 0,
                        gathered: parseInt(attrs['Resources Gathered']?.N) || parseInt(attrs['gathered']?.N) || 0,
                        troopPower: parseInt(attrs['Troop Power']?.N) || parseInt(attrs['troopPower']?.N) || 0,
                        commanderPower: parseInt(attrs['Commander Power']?.N) || parseInt(attrs['commanderPower']?.N) || parseInt(attrs['commander power']?.N) || 0
                    };
                }
                lastKey = res.LastEvaluatedKey;
            } while (lastKey);
            return snapshot;
        };

        const [startLine, endLine] = await Promise.all([fetchSnapshot(startTarget), fetchSnapshot(endTarget)]);
        const roster = [];
        const missingNodes = [];
        const newNodes = [];

        for (const [id, startData] of Object.entries(startLine)) {
            const endData = endLine[id];
            
            if (!endData) {
                missingNodes.push({
                   ...startData, 
                   type: 'MISSING', 
                   reason: 'Missing', 
                   latestPower: startData.power,
                   powerDelta: -startData.power, 
                   troopDelta: -startData.troopPower,
                   kpDelta: 0,
                   gatheredDelta: 0,
                   troopBase: startData.troopPower,
                   cmdBase: startData.commanderPower
                });
                continue;
            }

            const pDiff = endData.power - startData.power;
            const kpDiff = endData.killPoints - startData.killPoints;
            const troopDiff = endData.troopPower - startData.troopPower;
            const gatherDiff = endData.gathered - startData.gathered;
            const deadsDiff = endData.dead - startData.dead;
            
            let reason = "Active";
            let note = "Normal Growth";
            
            if (pDiff === 0 && kpDiff === 0 && gatherDiff === 0) {
                reason = "Asleep";
                note = "Absolutely 0 growth detected";
            } else if (pDiff < 300000 && kpDiff < 100000 && deadsDiff < 10000) {
                reason = "Low Activity";
                note = "Minimal engagement metrics";
            } else {
                continue; // Do not include Active players in the Activity Engine Tracker (it only filters for Anomalous behavior!)
            }

            roster.push({
               id,
               name: endData.name,
               alliance: endData.alliance,
               type: reason,
               reason,
               note,
               latestPower: endData.power,
               powerDelta: pDiff,
               kpDelta: kpDiff,
               deadsDelta: deadsDiff,
               troopDelta: troopDiff,
               troopBase: startData.troopPower,
               troopLatest: endData.troopPower,
               gatheredDelta: gatherDiff,
               cmdBase: startData.commanderPower,
               cmdLatest: endData.commanderPower,
               powerBase: startData.power
            });
        }

        for (const [id, endData] of Object.entries(endLine)) {
            if (!startLine[id]) {
                newNodes.push({...endData, type: 'NEW', reason: 'New', note: 'Newly detected arrival', latestPower: endData.power, powerDelta: 'NEW', kpDelta: 0});
            }
        }

        const resolveGlobalProfiles = async (nodes, isMissing) => {
            const BATCH_SIZE = 100;
            const results = [];
            for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
               const chunk = nodes.slice(i, i + BATCH_SIZE);
               const keys = chunk.map(n => ({ PK: { S: `GOV_PROFILE#${n.id}` }, SK: { S: 'PROFILE' } }));
               if (keys.length === 0) continue;
               try {
                   const batchRes = await dbClient.send(new BatchGetItemCommand({
                       RequestItems: { [tableName]: { Keys: keys } }
                   }));
                   const profiles = batchRes.Responses[tableName] || [];
                   
                   for (const node of chunk) {
                       const pf = profiles.find(p => p.PK.S === `GOV_PROFILE#${node.id}`);
                       if (pf) {
                           const attrs = pf.attributes?.M || {};
                           const globalKd = attrs.lastSeenKingdom?.N || attrs.lastSeenKingdom?.S;
                           let globalName = attrs.name?.S;
                           if (!globalName) globalName = attrs.GovernorName?.S || attrs.governorName?.S;
                           
                           if (isMissing && globalKd && String(globalKd) !== String(kingdomId)) {
                               node.reason = "Migrated";
                               node.type = "MIGRATED_OUT";
                               node.note = `Migrated to KD ${globalKd}`;
                               if (globalName && globalName !== node.name) {
                                   node.note += ` | AKA: ${globalName}`;
                               }
                           }
                       }
                       results.push(node);
                   }
               } catch(e) { console.error("Global Profile Batch Error", e); }
            }
            return results;
        };

        const resolvedMissing = await resolveGlobalProfiles(missingNodes, true);
        const resolvedNew = await resolveGlobalProfiles(newNodes, false);

        return [...roster, ...resolvedMissing, ...resolvedNew];
    } catch(e) {
        console.error("Migration Matrix Error", e);
        return [];
    }
}

/**
 * Advanced AI Engine: Fetches the latest AWS Scan for a Kingdom and performs a chronological mapping
 * differential against a scan from `timeframeHours` ago.
 */
export async function getAdvancedKingdomDeltas(kingdomId, timeframeHours = 720) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    try {
        const dateParams = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kingdomId}` } }
        };

        const dateResult = await dbClient.send(new QueryCommand(dateParams));

        if (!dateResult.Items || dateResult.Items.length < 2) {
            return await getKingdomRoster(kingdomId);
        }

        const dates = dateResult.Items.map(i => {
           const attrs = i.attributes?.M || {};
           let summaryObj = {};
           try { summaryObj = JSON.parse(attrs.summary?.S || "{}"); } catch(e){}
           return {
               sk: i.SK.S,
               scanDate: attrs.scanDate?.S,
               scanType: summaryObj.scanType || 'Full'
           };
        }).sort((a, b) => new Date(b.scanDate) - new Date(a.scanDate));

        const latestParsed = new Date(dates[0].scanDate);
        const targetTime = latestParsed.getTime() - (timeframeHours * 60 * 60 * 1000);
        const latestType = dates[0].scanType;

        let bestMatchIndex = -1;
        let smallestDiff = Infinity;

        // Find the scan that is closest to `targetTime`
        for (let i = 1; i < dates.length; i++) {
            if (dates[i].scanType !== latestType) continue; 
            
            const timeDiff = Math.abs(new Date(dates[i].scanDate).getTime() - targetTime);
            if (timeDiff < smallestDiff) {
                smallestDiff = timeDiff;
                bestMatchIndex = i;
            }
        }

        if (bestMatchIndex === -1) {
            return await getKingdomRoster(kingdomId);
        }

        const latestDateKey = dates[0].sk.replace('SCAN#', '').replace('DATE#', '');
        const previousDateKey = dates[bestMatchIndex].sk.replace('SCAN#', '').replace('DATE#', '');

        const getSnapshot = async (dateStr) => {
            const params = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `SCAN#${kingdomId}#${dateStr}` } }
            };
            const snapshot = {};
            let lastEvaluatedKey = null;
            do {
                if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
                const result = await dbClient.send(new QueryCommand(params));
                if (result.Items) {
                    for (const item of result.Items) {
                        const attrs = item.attributes?.M || {};
                        const id = attrs['Governor ID']?.S || attrs['id']?.S || item.SK.S.replace('GOV#', '');
                        snapshot[id] = {
                            name: attrs['Governor Name']?.S || attrs['name']?.S || 'Unknown',
                            alliance: attrs['Alliance Tag']?.S || 'None',
                            power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                            killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                            troopPower: parseInt(attrs['Troop Power']?.N || attrs['troop power']?.N || attrs['troopPower']?.N) || 0,
                            techPower: parseInt(attrs['Tech Power']?.N || attrs['tech power']?.N || attrs['techPower']?.N) || 0,
                            commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N || attrs['commanderPower']?.N) || 0,
                            buildingPower: parseInt(attrs['Building Power']?.N || attrs['building power']?.N || attrs['buildingPower']?.N) || 0,
                        };
                    }
                }
                lastEvaluatedKey = result.LastEvaluatedKey;
            } while (lastEvaluatedKey);
            return snapshot;
        };

        const [latestSnap, prevSnap] = await Promise.all([
            getSnapshot(latestDateKey),
            getSnapshot(previousDateKey)
        ]);

        const roster = [];

        // 1. Existing and Migrated In Players
        for (const [id, latestData] of Object.entries(latestSnap)) {
            const prevData = prevSnap[id];

            let powerDelta = prevData ? (latestData.power - prevData.power) : 'NEW';
            let kpDelta = prevData ? (latestData.killPoints - prevData.killPoints) : 'NEW';

            roster.push({
                ...latestData,
                id,
                powerDelta,
                kpDelta
            });
        }

        // 2. Missing/Migrated Out Players
        for (const [id, prevData] of Object.entries(prevSnap)) {
            if (!latestSnap[id]) {
                roster.push({
                    ...prevData,
                    id,
                    powerDelta: 'MISSING',
                    kpDelta: 'MISSING',
                    missingBasePower: prevData.power
                });
            }
        }

        // ── Leadership Intelligence Engine ─────────────────────────────────────
        // Sort both snapshots by power to identify who the "leadership" is
        const LEADERSHIP_DEPTH = 20;
        const latestByPower = Object.entries(latestSnap).sort((a, b) => b[1].power - a[1].power);
        const prevByPower = Object.entries(prevSnap).sort((a, b) => b[1].power - a[1].power);

        const latestTop20Ids = new Set(latestByPower.slice(0, LEADERSHIP_DEPTH).map(([id]) => id));
        const prevTop20Ids = new Set(prevByPower.slice(0, LEADERSHIP_DEPTH).map(([id]) => id));

        // 1. Leadership Stability Score: how many of the OLD top 20 are still in the NEW top 20?
        let survivingLeaders = 0;
        for (const id of prevTop20Ids) {
            if (latestTop20Ids.has(id)) survivingLeaders++;
        }
        const leadershipStabilityScore = prevTop20Ids.size > 0
            ? Math.round((survivingLeaders / prevTop20Ids.size) * 100)
            : 0;

        // 2. Leadership Activity Rate: % of CURRENT top 20 who actually gained power
        let activeLeaders = 0;
        let sleepingLeaderPower = 0;
        for (const [id, latestData] of latestByPower.slice(0, LEADERSHIP_DEPTH)) {
            const prevData = prevSnap[id];
            const delta = prevData ? (latestData.power - prevData.power) : latestData.power;
            const kpDelta = prevData ? (latestData.killPoints - prevData.killPoints) : 0;
            if (delta > 0 || kpDelta > 0) {
                activeLeaders++;
            } else if (delta === 0 && kpDelta === 0 && prevData) {
                sleepingLeaderPower += latestData.power;
            }
        }
        const leadershipActivityRate = Math.round((activeLeaders / LEADERSHIP_DEPTH) * 100);

        // 3. Leadership Power Concentration: Top 10 power / Top 300 power
        const top10Power = latestByPower.slice(0, 10).reduce((sum, [, d]) => sum + d.power, 0);
        const top300Power = latestByPower.slice(0, 300).reduce((sum, [, d]) => sum + d.power, 0);
        const leadershipConcentration = top300Power > 0
            ? Math.round((top10Power / top300Power) * 100)
            : 0;

        // 4. Build leadership snapshot list for context
        const leaderSnapshot = latestByPower.slice(0, 10).map(([id, d]) => ({
            name: d.name,
            power: d.power,
            isNew: !prevTop20Ids.has(id),
            powerDelta: prevSnap[id] ? (d.power - prevSnap[id].power) : 'NEW'
        }));

        const leadershipIntel = {
            stabilityScore: leadershipStabilityScore,      // 0-100%, 100 = zero leadership churn
            activityRate: leadershipActivityRate,           // 0-100%, 100 = all top 20 are actively growing
            powerConcentration: leadershipConcentration,    // % of power held by top 10
            sleepingLeaderPower: sleepingLeaderPower,       // Raw power of inactive top-20 leaders
            survivingLeaderCount: survivingLeaders,          // # of original top-20 still present
            top10Snapshot: leaderSnapshot                   // Named list of current top 10 leaders
        };
        // ──────────────────────────────────────────────────────────────────────

        return { roster, leadershipIntel };
    } catch (e) {
        console.error("AWS Temporal Matchmaker Error", e);
        return { roster: [], leadershipIntel: null };
    }
}


export async function getGovernorHistory(kingdomId, governorId, days = 5) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    try {
        // 1. Get the last N scan dates
        const dateParams = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `DATES#${kingdomId}` }
            }
        };

        const dateResult = await dbClient.send(new QueryCommand(dateParams));
        if (!dateResult.Items || dateResult.Items.length === 0) return [];
        
        // Sort dates newest first and slice top N
        const dates = dateResult.Items.map(i => {
             const rawDateStr = i.SK?.S || '';
             return rawDateStr.replace('SCAN#', '').replace('DATE#', '');
        }).filter(d => d.length > 5).sort().reverse().slice(0, days);

        let history = [];

        // 2. Query each date in parallel to avoid massive latency bottlenecks
        const fetchPromises = dates.map(async (date) => {
            try {
                const histParams = {
                    TableName: tableName,
                    KeyConditionExpression: 'PK = :pk AND SK = :sk',
                    ExpressionAttributeValues: {
                        ':pk': { S: `SCAN#${kingdomId}#${date}` },
                        ':sk': { S: `GOV#${governorId}` }
                    }
                };

                const histResult = await dbClient.send(new QueryCommand(histParams));
                if (histResult.Items && histResult.Items.length > 0) {
                    const attrs = histResult.Items[0].attributes?.M || {};
                    return {
                        scanDate: date,
                        kingdom: kingdomId,
                        name: attrs['Governor Name']?.S || attrs['name']?.S || '',
                        alliance: attrs['Alliance Tag']?.S || attrs['alliance']?.S || '',
                        power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                        killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                        deads: parseInt(attrs['Deads']?.N || attrs['dead']?.N) || 0,
                        t4Kills: parseInt(attrs['T4 Kills']?.N || attrs['t4Kills']?.N) || 0,
                        t5Kills: parseInt(attrs['T5 Kills']?.N || attrs['t5Kills']?.N) || 0,
                        resources: parseInt(attrs['Resources Gathered']?.N || attrs['gathered']?.N) || 0,
                        assistance: parseInt(attrs['Assistance']?.N || attrs['assistance']?.N) || 0,
                        techPower: parseInt(attrs['Tech Power']?.N || attrs['tech power']?.N || attrs['techPower']?.N) || 0,
                        commanderPower: parseInt(attrs['Commander Power']?.N || attrs['commander power']?.N || attrs['commanderPower']?.N) || 0,
                        buildingPower: parseInt(attrs['Building Power']?.N || attrs['building power']?.N || attrs['buildingPower']?.N) || 0
                    };
                }
                return null;
            } catch (error) {
                console.error(`AWS Timeline fetch error for trace ${date}`, error);
                return null;
            }
        });

        // Resolve parallel execution arrays
        const resolvedDocs = await Promise.all(fetchPromises);
        history = resolvedDocs.filter(doc => doc !== null).sort((a,b) => new Date(b.scanDate.replace(/_/g, " ")) - new Date(a.scanDate.replace(/_/g, " ")));
        
        // Return oldest to newest for chronological coaching representation 
        return history.reverse();

    } catch (e) {
        console.error("AWS Governor History Error", e);
        return [];
    }
}

/**
 * Searches the Unity database for a registered Tenant (Discord Server)
 */
export async function getTenantConfig(guildId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_TENANTS' },
            ':sk': { S: `TENANT#${guildId}` }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        if (result.Items && result.Items.length > 0) {
            const attrs = result.Items[0].attributes?.M || {};
            
            let allowedKingdoms = [];
            if (attrs.allowedKingdoms && attrs.allowedKingdoms.L) {
                allowedKingdoms = attrs.allowedKingdoms.L.map(item => item.S);
            }

            return {
                kingdomId: attrs.kingdomId?.S,
                leadershipRoleId: attrs.leadershipRoleId?.S,
                allowedKingdoms: allowedKingdoms
            };
        }
        return null;
    } catch (e) {
        console.error("AWS Tenant Config Error", e);
        return null;
    }
}

/**
 * Searches the Unity database for a registered User (Discord ID to Governor ID binding)
 */
export async function getUserConfig(discordId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': { S: `USER#${discordId}` },
            ':sk': { S: 'CONFIG' }
        },
        ConsistentRead: true
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        if (result.Items && result.Items.length > 0) {
            const attrs = result.Items[0].attributes?.M || {};
            
            // Support legacy single ID format or the new Array format
            let govIds = [];
            if (attrs.governorIds && attrs.governorIds.L) {
                govIds = attrs.governorIds.L.map(item => item.S);
            } else if (attrs.governorId && attrs.governorId.S) {
                govIds = [attrs.governorId.S];
            }

            let allowedKingdoms = [];
            if (attrs.allowedKingdoms && attrs.allowedKingdoms.L) {
                allowedKingdoms = attrs.allowedKingdoms.L.map(item => item.S || item.N || item);
            }
            
            let profiles = {};
            if (attrs.profiles && attrs.profiles.M) {
                for (const [k, v] of Object.entries(attrs.profiles.M)) {
                    profiles[k] = v.S;
                }
            }

            let presence = {};
            if (attrs.presence && attrs.presence.M) {
                presence = {
                    status: attrs.presence.M.status?.S || "Active",
                    note: attrs.presence.M.note?.S || "",
                    requiresPing: attrs.presence.M.requiresPing?.BOOL || false,
                    updatedAt: attrs.presence.M.updatedAt?.S || ""
                };
            }
            
            return {
                governorIds: govIds,
                profiles: profiles,
                presence: presence,
                kingdomId: attrs.kingdomId?.S,
                isManualGuest: attrs.isManualGuest?.BOOL || false,
                role: attrs.role?.S,
                allowedKingdoms: allowedKingdoms,
                globalAiAccess: attrs.globalAiAccess?.BOOL ?? true
            };
        }
        return null; // Not registered
    } catch (e) {
        console.error("AWS User Config Error", e);
        return null;
    }
}

/**
 * Registers a new Alliance/Kingdom in the Unity database.
 */
export async function createTenantConfig(guildId, kingdomId, leadershipRoleId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'GLOBAL_TENANTS' },
            'SK': { S: `TENANT#${guildId}` },
            'attributes': {
                M: {
                    'kingdomId': { S: String(kingdomId) },
                    'leadershipRoleId': { S: String(leadershipRoleId) },
                    'allowedKingdoms': { L: [] },
                    'createdDate': { S: new Date().toISOString() }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Create Tenant Error", e);
        return false;
    }
}

/**
 * Links a Discord user to a specific in-game Governor profile.
 */
export async function linkGovernorAccount(discordId, governorId, profileType = 'Main') {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    // Fetch existing user config first to preserve arrays and maps
    const currentConfig = await getUserConfig(discordId);
    let govIds = currentConfig && currentConfig.governorIds ? currentConfig.governorIds : [];
    let profiles = currentConfig && currentConfig.profiles ? currentConfig.profiles : {};
    
    // Add new ID if it doesn't exist
    const newIdStr = String(governorId);
    if (!govIds.includes(newIdStr)) {
        govIds.push(newIdStr);
    }

    // Set map relationship (Key = ID, Value = ProfileType 'Farm' etc)
    profiles[newIdStr] = profileType;

    // Format for DynamoDB List and Map type
    const dynamoList = govIds.map(id => ({ S: id }));
    
    const profilesMap = {};
    for (const [k, v] of Object.entries(profiles)) {
        profilesMap[k] = { S: String(v) };
    }

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' },
            'attributes': {
                M: {
                    'governorIds': { L: dynamoList },
                    'profiles': { M: profilesMap },
                    'linkedDate': { S: new Date().toISOString() }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Link Governor Error", e);
        return false;
    }
}

/**
 * Unlinks a specific in-game Governor profile from a Discord user.
 */
export async function unlinkGovernorAccount(discordId, governorId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    // Fetch existing user config first to preserve arrays and maps
    const currentConfig = await getUserConfig(discordId);
    if (!currentConfig || (!currentConfig.governorIds && !currentConfig.governorId)) return true; // Already unlinked

    let govIds = currentConfig.governorIds || [];
    let profiles = currentConfig.profiles || {};
    
    // Remove ID
    const targetIdStr = String(governorId);
    govIds = govIds.filter(id => id !== targetIdStr);

    // Remove from map (New Schema: key is ID)
    if (profiles[targetIdStr]) {
        delete profiles[targetIdStr];
    }

    // Also remove from map (Old Schema: value is ID)
    for (const [k, v] of Object.entries(profiles)) {
        if (String(v) === targetIdStr) {
            delete profiles[k];
        }
    }

    // Format for DynamoDB List and Map type
    const dynamoList = govIds.map(id => ({ S: id }));
    
    const profilesMap = {};
    for (const [k, v] of Object.entries(profiles)) {
        profilesMap[k] = { S: String(v) };
    }

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' },
            'attributes': {
                M: {
                    'governorIds': { L: dynamoList },
                    'profiles': { M: profilesMap },
                    'linkedDate': { S: new Date().toISOString() }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Unlink Governor Error", e);
        return false;
    }
}

/**
 * ADMIN: Gets all registered Tenants

/**
 * ADMIN: Update a user's RBAC string
 */
export async function updateUserRole(discordId, newRole) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');
    
    // We import UpdateItemCommand at the top of the file, it's already there (Wait, let me double check top of file. Line 1 has UpdateItemCommand)
    
    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' }
        },
        UpdateExpression: 'SET attributes.#role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':role': { S: String(newRole) } }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Update User Role Error", e);
        return false;
    }
}

/**
 * ADMIN: Delete a user's access entirely
 */
export async function deleteUserAccess(discordId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');
    
    // Using DeleteItemCommand which must be imported at the top
    const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' }
        }
    };

    try {
        await dbClient.send(new DeleteItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Delete User Access Error", e);
        return false;
    }
}

/**
 * ADMIN: Gets all registered Tenants
 */
export async function getAllTenants() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_TENANTS' },
            ':skPrefix': { S: 'TENANT#' }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const tenants = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                let allowedKingdoms = [];
                if (attrs.allowedKingdoms && attrs.allowedKingdoms.L) {
                    allowedKingdoms = attrs.allowedKingdoms.L.map(k => k.S);
                }
                tenants.push({
                    guildId: item.SK.S.replace('TENANT#', ''),
                    kingdomId: attrs.kingdomId?.S || 'Unknown',
                    leadershipRoleId: attrs.leadershipRoleId?.S || 'None',
                    allowedKingdoms: allowedKingdoms,
                    globalAiAccess: attrs.globalAiAccess?.BOOL ?? true,
                    createdDate: attrs.createdDate?.S,
                    notes: attrs.notes?.S || "",
                    serverName: attrs.serverName?.S || null,
                    serverIcon: attrs.serverIcon?.S || null
                });
            }
        }
        return tenants;
    } catch (e) {
        console.error("AWS Get All Tenants Error", e);
        return [];
    }
}

/**
 * ADMIN: Safely Appends an Allowed Kingdom to a Tenant
 */
export async function addTenantAllowedKingdom(guildId, newKingdomId) {
    let tenant = await getTenantConfig(guildId);
    if (!tenant) {
        // Fallback: This is a brand new Database or Server. 
        // Instantly generate the Tenant Profile via the Admin UI.
        tenant = {
            kingdomId: String(newKingdomId),
            leadershipRoleId: "Admin-Generated",
            allowedKingdoms: []
        };
    }

    const allowed = new Set(tenant.allowedKingdoms || []);
    allowed.add(String(newKingdomId));
    
    // We reuse createTenantConfig structure but with the new array
    const tableName = process.env.AWS_TABLE_NAME;
    
    const dynamoList = Array.from(allowed).map(k => ({ S: k }));
    
    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'GLOBAL_TENANTS' },
            'SK': { S: `TENANT#${guildId}` },
            'attributes': {
                M: {
                    'kingdomId': { S: tenant.kingdomId },
                    'leadershipRoleId': { S: tenant.leadershipRoleId },
                    'allowedKingdoms': { L: dynamoList },
                    'createdDate': { S: new Date().toISOString() }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Update Tenant Kingdoms Error", e);
        return false;
    }
}

export async function removeTenantAllowedKingdom(guildId, targetKingdomId) {
    const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    let tenant = await getTenantConfig(guildId);
    if (!tenant) return false;

    const allowed = new Set(tenant.allowedKingdoms || []);
    allowed.delete(String(targetKingdomId));
    
    const tableName = process.env.AWS_TABLE_NAME;
    const dynamoList = Array.from(allowed).map(k => ({ S: k }));
    
    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'GLOBAL_TENANTS' },
            'SK': { S: `TENANT#${guildId}` },
            'attributes': {
                M: {
                    'kingdomId': { S: tenant.kingdomId },
                    'leadershipRoleId': { S: tenant.leadershipRoleId || "Admin-Generated" },
                    'allowedKingdoms': { L: dynamoList },
                    'createdDate': { S: tenant.createdDate || new Date().toISOString() },
                    'notes': { S: tenant.notes || "" },
                    'globalAiAccess': { BOOL: tenant.globalAiAccess || false }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Remove Tenant Kingdom Error", e);
        return false;
    }
}

/**
 * ADMIN: Deletes a Tenant completely
 */
export async function deleteTenantConfig(guildId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_TENANTS' },
            'SK': { S: `TENANT#${guildId}` }
        }
    };

    try {
        await dbClient.send(new DeleteItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Delete Tenant Error", e);
        return false;
    }
}

/**
 * ADMIN: Toggles the hybrid AI master key override lock for a Specific User
 */
export async function toggleUserAIAccess(discordId, newStatus) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' }
        },
        UpdateExpression: 'SET attributes.#ai = :val',
        ExpressionAttributeNames: {
            '#ai': 'globalAiAccess'
        },
        ExpressionAttributeValues: {
            ':val': { BOOL: newStatus }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Toggle User AI Error", e);
        return false;
    }
}

/**
 * ADMIN: Toggles the hybrid AI master key override lock for a Specific Tenant
 */
export async function toggleTenantAIAccess(guildId, newStatus) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_TENANTS' },
            'SK': { S: `TENANT#${guildId}` }
        },
        UpdateExpression: 'SET attributes.#ai = :val',
        ExpressionAttributeNames: {
            '#ai': 'globalAiAccess'
        },
        ExpressionAttributeValues: {
            ':val': { BOOL: newStatus }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Toggle Tenant AI Error", e);
        return false;
    }
}

// =========================================================================
// COMMUN.TY HUB & RECRUITING 
// =========================================================================

/**
 * Puts a new Community Hub post into DynamoDB.
 */
export async function createCommunityPost(postData) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const timestamp = new Date().toISOString();
    const postId = Date.now().toString();

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'GLOBAL#COMMUNITY' },
            'SK': { S: `POST#${postId}` },
            'attributes': {
                M: {
                    'type': { S: String(postData.type || 'Message') },
                    'name': { S: String(postData.name || 'Anonymous') },
                    'message': { S: String(postData.message || '') },
                    'timestamp': { S: timestamp }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return { id: postId, ...postData, timestamp };
    } catch (e) {
        console.error("AWS Create Community Post Error", e);
        throw e;
    }
}

/**
 * Gets recent Community Hub posts (limit to last 100 for example, using scan or query).
 */
export async function getCommunityPosts(limit = 100) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL#COMMUNITY' },
            ':skPrefix': { S: 'POST#' }
        },
        ScanIndexForward: false, // get newest first
        Limit: limit
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const posts = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                posts.push({
                    id: item.SK.S.replace('POST#', ''),
                    type: attrs.type?.S,
                    name: attrs.name?.S,
                    message: attrs.message?.S,
                    timestamp: attrs.timestamp?.S
                });
            }
        }
        return posts;
    } catch (e) {
        console.error("AWS Get Community Posts Error", e);
        return [];
    }
}

/**
 * Saves an applicant/recruit to DynamoDB for a specific kingdom.
 */
export async function saveRecruit(kingdomId, recruitData) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const recruitId = recruitData.Name ? recruitData.Name.replace(/[\.\#\$\/\[\]]/g, '_') : Date.now().toString();

    // Map the complex nested object to DynamoDB format
    const formatValue = (val) => {
        if (typeof val === 'number') return { N: String(val) };
        if (typeof val === 'string') return { S: val };
        if (val === null || val === undefined) return { NULL: true };
        return { S: JSON.stringify(val) }; // fallback
    };

    const detailsMap = {};
    if (recruitData.Details) {
        for (const [k, v] of Object.entries(recruitData.Details)) {
            detailsMap[k] = formatValue(v);
        }
    }

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `RECRUIT#${kingdomId}` },
            'SK': { S: `USER#${recruitId}` },
            'attributes': {
                M: {
                    'Name': formatValue(recruitData.Name),
                    'Power': formatValue(recruitData.Power),
                    'KillPoints': formatValue(recruitData.KillPoints),
                    'Deads': formatValue(recruitData.Deads),
                    'Summary': formatValue(recruitData.Summary),
                    'Score': formatValue(recruitData.Score),
                    'LastScanned': formatValue(recruitData.LastScanned),
                    'Details': { M: detailsMap }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return recruitId;
    } catch (e) {
        console.error("AWS Save Recruit Error", e);
        throw e;
    }
}

/**
 * Fetches all recruits for a given kingdom.
 */
export async function getRecruits(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: `RECRUIT#${kingdomId}` },
            ':skPrefix': { S: 'USER#' }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const recruitsMap = {};
        
        if (result.Items) {
            for (const item of result.Items) {
                const idKey = item.SK.S.replace('USER#', '');
                const attrs = item.attributes?.M || {};
                
                const parseDynamoVal = (obj) => {
                    if (!obj) return null;
                    if (obj.S !== undefined) return obj.S;
                    if (obj.N !== undefined) return Number(obj.N);
                    if (obj.NULL) return null;
                    return null;
                };

                const details = {};
                if (attrs.Details && attrs.Details.M) {
                    for (const [k, v] of Object.entries(attrs.Details.M)) {
                        details[k] = parseDynamoVal(v);
                    }
                }

                recruitsMap[idKey] = {
                    Name: parseDynamoVal(attrs.Name),
                    Power: parseDynamoVal(attrs.Power) || 0,
                    KillPoints: parseDynamoVal(attrs.KillPoints) || 0,
                    Deads: parseDynamoVal(attrs.Deads) || 0,
                    Summary: parseDynamoVal(attrs.Summary),
                    Score: parseDynamoVal(attrs.Score),
                    LastScanned: parseDynamoVal(attrs.LastScanned),
                    Details: details
                };
            }
        }
        return recruitsMap;
    } catch (e) {
        console.error("AWS Get Recruits Error", e);
        return {};
    }
}

/**
 * ADMIN: Safely fetches all linked User/Discord accounts.
 * Executes a filtered Scan on the SK = CONFIG footprint.
 */
export async function getAllUsers() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const baseParams = {
        TableName: tableName,
        FilterExpression: 'SK = :sk AND begins_with(PK, :pkPrefix)',
        ExpressionAttributeValues: {
            ':sk': { S: 'CONFIG' },
            ':pkPrefix': { S: 'USER#' }
        }
    };

    try {
        console.log(`[AWS Multi-Thread] Initiating Parallel Scan for Admin Node 'getAllUsers'...`);
        
        const SEGMENTS = 5;
        const scanPromises = [];
        
        for (let i = 0; i < SEGMENTS; i++) {
            scanPromises.push((async () => {
                const params = { ...baseParams, Segment: i, TotalSegments: SEGMENTS };
                let localUsers = [];
                let lastEvaluatedKey = null;
                
                do {
                    if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
                    
                    const result = await dbClient.send(new ScanCommand(params));
                    
                    if (result.Items) {
                        for (const item of result.Items) {
                            const attrs = item.attributes?.M || {};
                            const discordId = item.PK.S.replace('USER#', '');
                            
                            let govIds = [];
                            if (attrs.governorIds && attrs.governorIds.L) {
                                govIds = attrs.governorIds.L.map(attr => attr.S);
                            } else if (attrs.governorId && attrs.governorId.S) {
                                govIds = [attrs.governorId.S];
                            }

                            localUsers.push({
                                discordId: discordId,
                                governorIds: govIds,
                                kingdomId: attrs.kingdomId?.S || 'None',
                                isManualGuest: attrs.isManualGuest?.BOOL || false,
                                role: attrs.role?.S || 'User',
                                linkedDate: attrs.linkedDate?.S || 'Unknown',
                                globalAiAccess: attrs.globalAiAccess?.BOOL ?? true,
                                username: attrs.username?.S || null,
                                avatar: attrs.avatar?.S || null,
                                allowedKingdoms: attrs.allowedKingdoms?.L ? attrs.allowedKingdoms.L.map(k => k.S) : [],
                                notes: attrs.notes?.S || ""
                            });
                        }
                    }
                    lastEvaluatedKey = result.LastEvaluatedKey;
                } while (lastEvaluatedKey);
                
                return localUsers;
            })());
        }

        const results = await Promise.all(scanPromises);
        // Flatten the array of arrays into a single user list
        return results.flat();

    } catch (e) {
        console.error("AWS Parallel Scan Get All Users Error", e);
        return [];
    }
}

/**
 * ADMIN: Danger Zone - Purges all Scan records for a specific Kingdom.
 */
export async function purgeKingdomDatabase(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');
    const { BatchWriteItemCommand } = await import('@aws-sdk/client-dynamodb');

    try {
        console.log(`[AWS DANGER] Initiating full purge sweep for Kingdom ${kingdomId}...`);
        
        const params = {
            TableName: tableName,
            FilterExpression: 'begins_with(PK, :prefix) OR PK = :datesPk',
            ExpressionAttributeValues: {
                ':prefix': { S: `SCAN#${kingdomId}#` },
                ':datesPk': { S: `DATES#${kingdomId}` }
            }
        };

        let keysToDelete = [];
        let lastEvaluatedKey = null;

        // 1. Scan and collect every single Partition Key related to the Kingdom
        do {
            if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
            
            // We only need PK/SK keys
            const scanParams = { ...params, ProjectionExpression: 'PK, SK' };
            const result = await dbClient.send(new ScanCommand(scanParams));
            
            if (result.Items) {
                result.Items.forEach(item => {
                    keysToDelete.push({
                        DeleteRequest: {
                            Key: {
                                'PK': item.PK,
                                'SK': item.SK
                            }
                        }
                    });
                });
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        if (keysToDelete.length === 0) return 0;

        console.log(`[AWS DANGER] Found ${keysToDelete.length} records. Commencing BatchWrite Deletions...`);

        // 2. Chunk deletions by 25 and multi-thread
        const chunkSize = 25;
        const blocks_25 = [];
        for (let i = 0; i < keysToDelete.length; i += chunkSize) {
            blocks_25.push(keysToDelete.slice(i, i + chunkSize));
        }

        const promises = blocks_25.map(async (chunk) => {
            const batchParams = { RequestItems: { [tableName]: chunk } };
            await dbClient.send(new BatchWriteItemCommand(batchParams));
        });

        await Promise.all(promises);
        
        console.log(`[AWS DANGER] Purge Sweep Complete. ${keysToDelete.length} items permanently deleted.`);
        return keysToDelete.length;

    } catch (e) {
        console.error("[AWS DANGER] Purge Failed:", e);
        throw e;
    }
}

/**
 * Executes a high-velocity BatchWrite block upload into the Unity AWS Table.
 * Automatically handles the 25-item DynamoDB batch limit by chunking the JSON array.
 */
export async function uploadKingdomRoster(kingdomId, rosterArray, uploaderData = null, scanDateOverride = null) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');
    
    // We import BatchWriteItemCommand here because it wasn't statically imported at the top
    const { BatchWriteItemCommand, PutItemCommand } = await import('@aws-sdk/client-dynamodb');

    // Determine the Scan Date 
    let scanDate;
    if (scanDateOverride) {
        // Rokboard F2 often has standard date strings or Excel serial numbers
        if (!isNaN(Number(scanDateOverride))) {
            const excelEpoch = new Date(1899, 11, 30);
            scanDate = new Date(excelEpoch.getTime() + (Number(scanDateOverride) * 86400 * 1000)).toISOString();
        } else {
            const parsed = new Date(scanDateOverride);
            scanDate = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
        }
    } else {
        scanDate = new Date().toISOString();
    }
    
    const dateKey = scanDate.replace(/[.#$\/\[\]\s\-:T]/g, "_").substring(0, 19);
    
    // First, sort the entire roster array descending by Power so we can slice Top N metrics immediately
    const sortedRoster = [...rosterArray].sort((a, b) => {
        const aPower = parseInt(String(a.power || a.Power || 0).replace(/,/g, '')) || 0;
        const bPower = parseInt(String(b.power || b.Power || 0).replace(/,/g, '')) || 0;
        return bPower - aPower;
    });

    // Generate macro-analytics summary to embed into the Date Pointer for O(1) Chart loading
    const summaryData = {
        scanType: 'Full',
        totalPower: 0,
        totalKP: 0,
        totalDeads: 0,
        activeGovernors: 0,
        alliances: {},
        topSlices: {
            '100': { power: 0, kp: 0, deads: 0, elements: 0 },
            '300': { power: 0, kp: 0, deads: 0, elements: 0 },
            '400': { power: 0, kp: 0, deads: 0, elements: 0 },
            '650': { power: 0, kp: 0, deads: 0, elements: 0 },
            '1000': { power: 0, kp: 0, deads: 0, elements: 0 }
        }
    };

    sortedRoster.forEach((p, index) => {
        const powerStr = String(p.power || p.Power || p.POWER || 0).replace(/,/g, '');
        const kpStr = String(p.killpoints || p.killPoints || p.KillPoints || p['Kill Points'] || p['Total KP'] || 0).replace(/,/g, '');
        const deadsStr = String(p.deads || p.Deads || p.Dead || p.DEAD || p.DEADS || p.Defeat || p.DEFEAT || p.dead || p.defeats || p['Dead(s)'] || 0).replace(/,/g, '');
        
        const power = parseInt(powerStr) || 0;
        const kp = parseInt(kpStr) || 0;
        const deads = parseInt(deadsStr) || 0;
        const tag = p.alliance || p.Alliance || p.ALLIANCE || p['Alliance Tag'] || p['Alliance Name'] || p['alliance Tag'] || 'None';
        
        summaryData.totalPower += power;
        summaryData.totalKP += kp;
        summaryData.totalDeads += deads;
        if (power > 0) Object.assign(summaryData, { activeGovernors: summaryData.activeGovernors + 1 });
        
        if (!summaryData.alliances[tag]) summaryData.alliances[tag] = 0;
        summaryData.alliances[tag] += power;

        // Populate Top N Slices based on sequential index mapping (since array is strictly sorted descending by power)
        [100, 300, 400, 650, 1000].forEach(limit => {
            if (index < limit) {
                summaryData.topSlices[String(limit)].power += power;
                summaryData.topSlices[String(limit)].kp += kp;
                summaryData.topSlices[String(limit)].deads += deads;
                if (power > 0) summaryData.topSlices[String(limit)].elements += 1;
            }
        });
    });

    // Detect missing variables entirely from limited payload shapes
    if (summaryData.totalKP === 0 && summaryData.totalDeads === 0) {
        summaryData.scanType = 'Limited';
    }

    // 1. Write the Master DATES pointer so queries know the 'Latest' scan date and hold trend metadata
    const dateParams = {
        TableName: tableName,
        Item: {
            'PK': { S: `DATES#${kingdomId}` },
            'SK': { S: `SCAN#${dateKey}` },
            'attributes': {
                M: {
                    'scanDate': { S: scanDate },
                    'rowCount': { N: String(rosterArray.length) },
                    'summary': { S: JSON.stringify(summaryData) },
                    'uploaderId': { S: String(uploaderData?.discordId || "Unknown") },
                    'uploaderName': { S: String(uploaderData?.username || "System") },
                    'sourceFile': { S: String(uploaderData?.sourceFile || "Legacy_Upload") },
                    'importTag': { S: String(uploaderData?.importTag || "UNDOCUMENTED") }
                }
            }
        }
    };
    
    try {
        await dbClient.send(new PutItemCommand(dateParams));
        
        // Dynamically register this Kingdom into the Global Tracker so the Audit Log can find it without hardcoding
        const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');
        await dbClient.send(new UpdateItemCommand({
            TableName: tableName,
            Key: { 'PK': { S: 'SYSTEM#CONFIG' }, 'SK': { S: 'TRACKED_KINGDOMS' } },
            UpdateExpression: "ADD kingdoms :kd",
            ExpressionAttributeValues: { ":kd": { SS: [String(kingdomId)] } }
        }));
    } catch (e) {
        console.error("[AWS Batch Upload] Failed to write Master DATES pointer:", e);
        throw e;
    }

    // 2. Format the JS Objects into DynamoDB PutRequest objects
    const putRequests = rosterArray.map(player => {
        // Stringify numbers and format explicitly to exactly match legacy Unity 1.0 JSON scheme
        const formatS = (val) => ({ S: String(val || '') });
        const formatN = (val) => ({ N: String(val || 0).replace(/,/g, '') });

        const id = player.id || player.Id || player.ID || player['Governor ID'] || player['Character ID'] || player.CharacterID;
        const name = player.name || player.Name || player.NAME || player['Governor Name'] || player.Username || player.username;
        const alliance = player.alliance || player.Alliance || player.ALLIANCE || player['Alliance Tag'] || player['Alliance Name'] || player['alliance Tag'] || "";
        const power = player.power || player.Power || player.POWER;
        const killpoints = player.killpoints || player.killPoints || player.KillPoints || player['Kill Points'] || player['Total KP'];
        const deads = player.deads || player.Deads || player.Dead || player.DEAD || player.DEADS || player.Defeat || player.DEFEAT || player.dead || player.defeats || player['Dead(s)'];
        const acclaim = player.acclaim || player.Acclaim || player.ACCLAIM;
        const t1kills = player.t1Kills || player.T1Kills || player['T1 Kills'] || player['Tier 1 Kills'];
        const t2kills = player.t2Kills || player.T2Kills || player['T2 Kills'] || player['Tier 2 Kills'];
        const t3kills = player.t3Kills || player.T3Kills || player['T3 Kills'] || player['Tier 3 Kills'];
        const t4kills = player.t4Kills || player.T4Kills || player['T4 Kills'] || player['Tier 4 Kills'];
        const t5kills = player.t5Kills || player.T5Kills || player['T5 Kills'] || player['Tier 5 Kills'];
        const gathered = player.gathered || player.Gathered || player.ResourcesGathered || player['Resources Gathered'] || player['RSS Gathered'];
        const assistance = player.assistance || player.Assistance || player.ASSISTANCE || player['Resources Given'] || player['resources Given'] || player['RSS Assistance'];
        const helps = player.helps || player.Helps || player.HELPS || player['Alliance Helps'] || player['Helps Given'] || player['helps Given'];
        const troopPower = player.troopPower || player.TroopPower || player['Troop Power'];
        const techPower = player.techPower || player.TechPower || player['Tech Power'];
        const comPower = player.commanderPower || player.CommanderPower || player['Commander Power'];
        const buildPower = player.buildingPower || player.BuildingPower || player['Building Power'];
        const townHall = player.townHall || player.TownHall || player['Town Hall'] || player['CH Level'] || player.CityHall || player['City Hall'];
        const lostKingdomCount = player.lostKingdomCount || player.LostKingdomCount || player['Lost Kingdom Count'] || player['LK Count'];

        // Drop corrupted lines if the ID failed entirely
        if (!id) return null;

        return [
            {
                PutRequest: {
                    Item: {
                        'PK': { S: `SCAN#${kingdomId}#${dateKey}` },
                        'SK': { S: `GOV#${id}` },
                        'attributes': {
                            M: {
                                'Governor ID': formatS(id),
                                'Governor Name': formatS(name),
                                'Alliance Tag': formatS(alliance),
                                'Power': formatN(power),
                                'Kill Points': formatN(killpoints),
                                'Deads': formatN(deads),
                                'Acclaim': formatN(acclaim),
                                'T1 Kills': formatN(t1kills),
                                'T2 Kills': formatN(t2kills),
                                'T3 Kills': formatN(t3kills),
                                'T4 Kills': formatN(t4kills),
                                'T5 Kills': formatN(t5kills),
                                'Resources Gathered': formatN(gathered),
                                'Assistance': formatN(assistance),
                                'Helps': formatN(helps),
                                'Troop Power': formatN(troopPower),
                                'Tech Power': formatN(techPower),
                                'Commander Power': formatN(comPower),
                                'Building Power': formatN(buildPower),
                                'Town Hall': formatN(townHall),
                                'Lost Kingdom Count': formatN(lostKingdomCount),
                                // Map any deltas if provided by the client side processor
                                'powerDelta': formatN(player.powerDelta),
                                'kpDelta': formatN(player.kpDelta),
                                'deadsDelta': formatN(player.deadsDelta),
                                'gatheredDelta': formatN(player.gatheredDelta),
                            }
                        }
                    }
                }
            },
            {
                PutRequest: {
                    Item: {
                        'PK': { S: `GOV_PROFILE#${id}` },
                        'SK': { S: 'PROFILE' },
                        'attributes': {
                            M: {
                                'name': formatS(name),
                                'lastSeenKingdom': { N: String(kingdomId) },
                                'lastSeenDate': { S: scanDate }
                            }
                        }
                    }
                }
            }
        ];
    }).filter(Boolean).flat();

    // 3. Chunk into 25-item blocks (AWS Hard Limit)
    const chunkSize = 25;
    const blocks_25 = [];
    for (let i = 0; i < putRequests.length; i += chunkSize) {
        blocks_25.push(putRequests.slice(i, i + chunkSize));
    }

    console.log(`[AWS Batch Upload] Dispatching ${blocks_25.length} upload blocks (25 items/block) for ${rosterArray.length} items...`);

    // 4. Fire chunks with controlled concurrency to prevent AWS exponential backoff throttling
    // Unity 1.0 was technically "paced" by browser concurrent HTTP limits (usually 6).
    // Unity 2.0 serverless previously fired 400+ concurrent requests, triggering massive AWS throttling lag.
    // We will throttle to 10 concurrent HTTP requests (10 * 25 = 250 items written per tick)
    const CONCURRENCY_LIMIT = 10;
    
    for (let i = 0; i < blocks_25.length; i += CONCURRENCY_LIMIT) {
        const batchSlice = blocks_25.slice(i, i + CONCURRENCY_LIMIT);
        
        const promises = batchSlice.map(async (chunk) => {
            const batchParams = {
                RequestItems: {
                    [tableName]: chunk
                }
            };
            try {
                // Send batch to AWS
                const response = await dbClient.send(new BatchWriteItemCommand(batchParams));
                
                // If AWS softly throttles us, it returns UnprocessedItems instead of throwing an error.
                // For a highly robust system, we would recursively retry UnprocessedItems here.
                if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
                     console.warn(`[AWS Batch Upload] Warning: ${Object.keys(response.UnprocessedItems[tableName]).length} items were un-processed due to soft throttling.`);
                }
            } catch (e) {
                console.error("[AWS Batch Upload] Block failure:", e);
            }
        });

        // Wait for this specific batch of 10 requests to fully complete before firing the next 10
        await Promise.all(promises);
    }

    console.log(`[AWS Batch Upload] Complete! Ignited ${rosterArray.length} rows into DynamoDB using V2 Optimized Engine.`);
    return dateKey;
}

/**
 * Deletes a recruit.
 */
export async function deleteRecruit(kingdomId, recruitId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `RECRUIT#${kingdomId}` },
            'SK': { S: `USER#${recruitId}` }
        }
    };

    try {
        const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
        await dbClient.send(new DeleteItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Delete Recruit Error", e);
        return false;
    }
}

// =========================================================================
// GUEST PASSCODE AUTHENTICATION 
// =========================================================================

/**
 * Creates a temporary Guest Passcode for non-Discord users.
 */
export async function createGuestPass(passcode, kingdomId, role, expiresInDays, playerName) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    // Automatically purge the record using DynamoDB TTL if enabled, or manual check on read
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'GLOBAL_GUEST_PASSES' },
            'SK': { S: `PASSCODE#${passcode}` },
            'attributes': {
                M: {
                    'kingdomId': { S: String(kingdomId) },
                    'role': { S: String(role) }, // 'Leader' or 'Member'
                    'playerName': { S: String(playerName) },
                    'expiresAt': { S: expiresAt }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return { passcode, kingdomId, role, expiresAt, playerName };
    } catch (e) {
        console.error("AWS Create Guest Pass Error:", e);
        throw e;
    }
}

/**
 * Retrieves a Guest Passcode and ensures it hasn't expired.
 */
export async function getGuestPass(passcode) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_GUEST_PASSES' },
            ':sk': { S: `PASSCODE#${passcode}` }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        
        if (result.Items && result.Items.length > 0) {
            const attrs = result.Items[0].attributes?.M || {};
            const expiresAtStr = attrs.expiresAt?.S;

            if (new Date(expiresAtStr) < new Date()) {
                console.log(`[AWS] Guest pass ${passcode} has expired.`);
                return null; // Expired pass
            }

            return {
                passcode: passcode,
                kingdomId: attrs.kingdomId?.S,
                role: attrs.role?.S,
                playerName: attrs.playerName?.S,
                expiresAt: expiresAtStr
            };
        }
        return null;
    } catch (e) {
        console.error("AWS Get Guest Pass Error:", e);
        return null;
    }
}

/**
 * ADMIN: Retrieves all active Guest Passcodes.
 */
export async function getAllGuestPasses() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_GUEST_PASSES' },
            ':skPrefix': { S: 'PASSCODE#' }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const passcodes = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                passcodes.push({
                    passcode: item.SK.S.replace('PASSCODE#', ''),
                    kingdomId: attrs.kingdomId?.S,
                    role: attrs.role?.S,
                    playerName: attrs.playerName?.S,
                    expiresAt: attrs.expiresAt?.S
                });
            }
        }
        return passcodes;
    } catch (e) {
        console.error("AWS Get All Passcodes Error", e);
        return [];
    }
}

/**
 * ADMIN: Deletes a specific guest pass.
 */
export async function deleteGuestPass(passcode) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_GUEST_PASSES' },
            'SK': { S: `PASSCODE#${passcode}` }
        }
    };

    try {
        const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
        await dbClient.send(new DeleteItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Delete Passcode Error", e);
        return false;
    }
}

// =========================================================================
// PENDING USER APPROVAL (MANUAL GUEST ACCESS)
// =========================================================================

/**
 * Marks a Discord user as pending manual approval by system administrators.
 */
export async function createPendingUser(discordId, username, avatarHash) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'GLOBAL_PENDING_USERS' },
            'SK': { S: `USER#${discordId}` },
            'attributes': {
                M: {
                    'username': { S: String(username) },
                    'avatarHash': { S: avatarHash ? String(avatarHash) : '' },
                    'createdAt': { S: new Date().toISOString() }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Create Pending User Error:", e);
        throw e;
    }
}

/**
 * Updates a pending user's context (Target Kingdom & PoC Nickname)
 */
export async function updatePendingUser(discordId, targetKingdom, pocNick) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_PENDING_USERS' },
            'SK': { S: `USER#${discordId}` }
        },
        UpdateExpression: 'SET attributes.#tk = :tk, attributes.#poc = :poc',
        ExpressionAttributeNames: {
            '#tk': 'targetKingdom',
            '#poc': 'pocNick'
        },
        ExpressionAttributeValues: {
            ':tk': { S: String(targetKingdom) },
            ':poc': { S: String(pocNick) }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Update Pending User Context Error:", e);
        throw e;
    }
}

/**
 * Updates tracking notes for a specific Discord Identity
 */
export async function updateUserNotes(discordId, notes) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' }
        },
        UpdateExpression: 'SET #attr.#notes = :notes',
        ExpressionAttributeNames: {
            '#attr': 'attributes',
            '#notes': 'notes'
        },
        ExpressionAttributeValues: {
            ':notes': { S: String(notes || "") }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Update User Notes Error:", e);
        throw e;
    }
}

/**
 * Updates tracking notes for a specific Server Tenant
 */
export async function updateTenantNotes(guildId, notes) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_TENANTS' },
            'SK': { S: `TENANT#${guildId}` }
        },
        UpdateExpression: 'SET #attr.#notes = :notes',
        ExpressionAttributeNames: {
            '#attr': 'attributes',
            '#notes': 'notes'
        },
        ExpressionAttributeValues: {
            ':notes': { S: String(notes || "") }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Update Tenant Notes Error:", e);
        throw e;
    }
}

/**
 * Retrieves all pending manual approval requests.
 */
export async function getPendingUsers() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: 'GLOBAL_PENDING_USERS' },
            ':skPrefix': { S: 'USER#' }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        return result.Items || [];
    } catch (e) {
        console.error("AWS Get Pending Users Error:", e);
        return [];
    }
}

/**
 * Approves a user, moving them from PENDINGUSER# to a hardcoded USER# record.
 */
export async function approvePendingUser(discordId, kingdomId, role) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    // 1. Create the permanent USER record with manual guest flag
    const createParams = {
        TableName: tableName,
        Item: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' },
            'attributes': {
                M: {
                    'isManualGuest': { BOOL: true },
                    'kingdomId': { S: String(kingdomId) },
                    'role': { S: String(role) }
                }
            }
        }
    };

    // 2. Delete the pending record
    const deleteParams = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_PENDING_USERS' },
            'SK': { S: `USER#${discordId}` }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(createParams));
        await dbClient.send(new DeleteItemCommand(deleteParams));
        return true;
    } catch (e) {
        console.error("AWS Approve Pending User Error:", e);
        throw e;
    }
}

/**
 * Rejects a user, deleting them from the pending queue.
 */
export async function rejectPendingUser(discordId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: 'GLOBAL_PENDING_USERS' },
            'SK': { S: `USER#${discordId}` }
        }
    };

    try {
        await dbClient.send(new DeleteItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Reject Pending User Error:", e);
        throw e;
    }
}

// =========================================================================
// PUBLIC SHARE TUNNELS (ZERO-AUTH PROXY)
// =========================================================================

/**
 * Creates a public share record allowing read-only access to a specific JSON slice.
 */
export async function createPublicShare(shareData, creatorId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const crypto = await import('crypto');
    const uuid = crypto.randomBytes(6).toString('hex'); // 12-char string
    const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 day TTL

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'PUBLIC#SHARE' },
            'SK': { S: `SHARE#${uuid}` },
            'attributes': {
                M: {
                    'payload': { S: JSON.stringify(shareData) },
                    'creator': { S: String(creatorId) },
                    'createdAt': { S: new Date().toISOString() },
                    'expireTTL': { N: String(expiresAt) }
                }
            }
        }
    };

    try {
        const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
        await dbClient.send(new PutItemCommand(params));
        return uuid;
    } catch (e) {
        console.error("AWS Create Public Share Error:", e);
        throw e;
    }
}

/**
 * Retrieves a public share record.
 */
export async function getPublicShare(uuid) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': { S: 'PUBLIC#SHARE' },
            ':sk': { S: `SHARE#${uuid}` }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        if (result.Items && result.Items.length > 0) {
            const attrs = result.Items[0].attributes?.M || {};
            if (attrs.payload && attrs.payload.S) {
                return JSON.parse(attrs.payload.S);
            }
        }
        return null;
    } catch (e) {
        console.error("AWS Get Public Share Error:", e);
        return null; // Return null if not found or expired
    }
}

// =========================================================================
// SPEEDUP TRACKER
// =========================================================================

/**
 * Saves a snapshot of a user's calculated speedups
 */
export async function saveUserSpeedups(discordId, totalMinutes, rawParsedMinutes, profile = 'Main') {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const timestamp = new Date().toISOString();
    const totalDays = parseFloat((totalMinutes / 1440).toFixed(2));

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `SPEEDUPS#${discordId}#${profile}` },
            'SK': { S: `LOG#${Date.now()}` },
            'attributes': {
                M: {
                    'totalMinutes': { N: String(totalMinutes) },
                    'totalDays': { N: String(totalDays) },
                    'rawParsedMinutes': { S: JSON.stringify(rawParsedMinutes || {}) },
                    'timestamp': { S: timestamp }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return { totalMinutes, totalDays, timestamp };
    } catch (e) {
        console.error("AWS Save Speedups Error", e);
        throw e;
    }
}

/**
 * Gets the historical chronological footprints for a specific user's speedups
 */
export async function getUserSpeedupHistory(discordId, profile = 'Main', limit = 10) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: `SPEEDUPS#${discordId}#${profile}` },
            ':skPrefix': { S: 'LOG#' }
        },
        ScanIndexForward: false, // newest first
        Limit: limit
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const history = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                
                let rawParsed = {};
                if (attrs.rawParsedMinutes && attrs.rawParsedMinutes.S) {
                    try { rawParsed = JSON.parse(attrs.rawParsedMinutes.S); } catch (err){}
                }

                history.push({
                    totalMinutes: parseInt(attrs.totalMinutes?.N || 0),
                    totalDays: parseFloat(attrs.totalDays?.N || 0),
                    rawParsedMinutes: rawParsed,
                    timestamp: attrs.timestamp?.S
                });
            }
        }
        return history.reverse(); // Return oldest to newest for chronological reporting
    } catch (e) {
        console.error("AWS Get Speedup History Error", e);
        return [];
    }
}

/**
 * Scans for all Speedup logs across the entire database, returning only the most recent entry per user.
 * It also dynamically resolves their linked Governor ID and in-game Alias.
 */
export async function exportAllSpeedups() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
            ':prefix': { S: 'SPEEDUPS#' }
        }
    };

    let allLogs = [];
    let lastEvaluatedKey = null;

    do {
        if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
        const result = await dbClient.send(new ScanCommand(params));
        if (result.Items) allLogs.push(...result.Items);
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const latestPerUser = {}; 
    for (const item of allLogs) {
        const pkParts = item.PK.S.split('#');
        const discordId = pkParts[1];
        const profile = pkParts[2] || 'Main';
        const timestamp = item.attributes?.M?.timestamp?.S || '';
        
        const mapKey = `${discordId}#${profile}`;

        if (!latestPerUser[mapKey] || new Date(timestamp) > new Date(latestPerUser[mapKey].timestamp)) {
            let rawParsed = {};
            if (item.attributes?.M?.rawParsedMinutes?.S) {
                try { rawParsed = JSON.parse(item.attributes.M.rawParsedMinutes.S); } catch (e) {}
            }
            latestPerUser[mapKey] = {
                discordId,
                profile,
                timestamp,
                rawParsed,
                totalDays: parseFloat(item.attributes?.M?.totalDays?.N || 0)
            };
        }
    }

    const results = [];
    for (const [mapKey, data] of Object.entries(latestPerUser)) {
        let governorId = 'Unknown';
        let alias = 'Unknown';

        try {
            const userConf = await getUserConfig(data.discordId);
            if (userConf && userConf.governorIds && userConf.governorIds.length > 0) {
                if (data.profile === 'Main' && userConf.governorIds.length >= 1) governorId = userConf.governorIds[0];
                else if (data.profile === 'Alt' && userConf.governorIds.length >= 2) governorId = userConf.governorIds[1];
                else if (data.profile === 'Farm' && userConf.governorIds.length >= 3) governorId = userConf.governorIds[2];
                else governorId = userConf.governorIds[0]; // fallback
            }
        } catch (e) {}

        if (governorId !== 'Unknown') {
            const govProfParams = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': { S: `GOV_PROFILE#${governorId}` },
                    ':sk': { S: 'PROFILE' }
                }
            };
            try {
                const profRes = await dbClient.send(new QueryCommand(govProfParams));
                if (profRes.Items && profRes.Items.length > 0) {
                    alias = profRes.Items[0].attributes?.M?.name?.S || alias;
                }
            } catch(e) {}
        }

        results.push({
            ...data,
            governorId,
            alias
        });
    }

    return results;
}

// =========================================================================
// RSS TRACKER
// =========================================================================

/**
 * Saves a snapshot of a user's calculated Resources (Food, Wood, Stone, Gold)
 */
export async function saveUserRss(discordId, totalRSS, rawParsedRss, profile = 'Main') {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const timestamp = new Date().toISOString();

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `RSS#${discordId}#${profile}` },
            'SK': { S: `LOG#${Date.now()}` },
            'attributes': {
                M: {
                    'totalRSS': { N: String(totalRSS) },
                    'rawParsedRss': { S: JSON.stringify(rawParsedRss || {}) },
                    'timestamp': { S: timestamp }
                }
            }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        return { totalRSS, timestamp };
    } catch (e) {
        console.error("AWS Save RSS Error", e);
        throw e;
    }
}

/**
 * Gets the historical chronological footprints for a specific user's RSS
 */
export async function getUserRssHistory(discordId, profile = 'Main', limit = 10) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: `RSS#${discordId}#${profile}` },
            ':skPrefix': { S: 'LOG#' }
        },
        ScanIndexForward: false, // newest first
        Limit: limit
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const history = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                
                let rawParsed = {};
                if (attrs.rawParsedRss && attrs.rawParsedRss.S) {
                    try { rawParsed = JSON.parse(attrs.rawParsedRss.S); } catch (err){}
                }

                history.push({
                    totalRSS: parseInt(attrs.totalRSS?.N || 0),
                    rawParsedRss: rawParsed,
                    timestamp: attrs.timestamp?.S
                });
            }
        }
        return history.reverse(); // Return oldest to newest for chronological reporting
    } catch (e) {
        console.error("AWS Get RSS History Error", e);
        return [];
    }
}

/**
 * Scans for all RSS logs across the entire database, returning only the most recent entry per user.
 * Dynamically resolves the specific Governor ID's mapped kingdom for cross-kingdom players.
 * If requireIsolation is passed, it isolates the output strictly to only the targeted user's own nodes.
 */
export async function exportAllRss(filterKingdomId = null, requireIsolation = false, callerDiscordId = null) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const params = {
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
            ':prefix': { S: 'RSS#' }
        }
    };

    let allLogs = [];
    let lastEvaluatedKey = null;

    do {
        if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
        const result = await dbClient.send(new ScanCommand(params));
        if (result.Items) allLogs.push(...result.Items);
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const latestPerUser = {}; 
    for (const item of allLogs) {
        const pkParts = item.PK.S.split('#');
        const discordId = pkParts[1];
        const profile = pkParts[2] || 'Main';
        const timestamp = item.attributes?.M?.timestamp?.S || '';
        
        const mapKey = `${discordId}#${profile}`;

        if (!latestPerUser[mapKey] || new Date(timestamp) > new Date(latestPerUser[mapKey].timestamp)) {
            let rawParsed = {};
            if (item.attributes?.M?.rawParsedRss?.S) {
                try { rawParsed = JSON.parse(item.attributes.M.rawParsedRss.S); } catch (e) {}
            }
            latestPerUser[mapKey] = {
                discordId,
                profile,
                timestamp,
                rawParsed,
                totalRSS: parseInt(item.attributes?.M?.totalRSS?.N || 0)
            };
        }
    }

    const results = [];
    for (const [mapKey, data] of Object.entries(latestPerUser)) {
        let governorId = 'Unknown';
        let alias = 'Unknown';

        try {
            const userConf = await getUserConfig(data.discordId);
            
            // Standard Member Privacy Grid
            if (requireIsolation && callerDiscordId && callerDiscordId !== data.discordId) {
                continue; // Isolated mode active: Hide anyone else's stats
            }

            if (userConf) {
                // Map the dynamic Governor ID linked to this specific telemetry profile
                if (userConf.governorIds && userConf.governorIds.length > 0) {
                    if (data.profile === 'Main' && userConf.governorIds.length >= 1) governorId = String(userConf.governorIds[0]);
                    else if (data.profile === 'Alt' && userConf.governorIds.length >= 2) governorId = String(userConf.governorIds[1]);
                    else if (data.profile === 'Farm' && userConf.governorIds.length >= 3) governorId = String(userConf.governorIds[2]);
                    else governorId = String(userConf.governorIds[0]); 
                }

                if (filterKingdomId) {
                    if (governorId !== 'Unknown') {
                        // Dynamically resolve where the governor actually lives in the game database
                        const stats = await getGovernorStats(governorId);
                        if (!stats || String(stats.lastSeenKingdom) !== String(filterKingdomId)) {
                            continue; // This governor does not exist in the targeted Kingdom interface
                        }
                    } else {
                        // Unlinked Discord Tenant fallback
                        if (userConf.kingdomId !== String(filterKingdomId)) {
                            continue; // Root Discord tenant doesn't match the query
                        }
                    }
                }
            } else {
                 if (filterKingdomId) continue; // Unregistered users are invisible during strict Kingdom queries
            }
        } catch (e) {
            console.error("[Dynamo] Failed resolving cross-tenant Governor stats:", e);
            if (filterKingdomId) continue;
        }

        if (governorId !== 'Unknown') {
            const govProfParams = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': { S: `GOV_PROFILE#${governorId}` },
                    ':sk': { S: 'PROFILE' }
                }
            };
            try {
                const profRes = await dbClient.send(new QueryCommand(govProfParams));
                if (profRes.Items && profRes.Items.length > 0) {
                    alias = profRes.Items[0].attributes?.M?.name?.S || alias;
                }
            } catch(e) {}
        }

        results.push({
            ...data,
            governorId,
            alias
        });
    }

    return results;
}
// =========================================================================
// KINGDOM EVENTS & DIRECTIVES
// =========================================================================

/**
 * Creates or updates an event for a specific kingdom.
 */
export async function createKingdomEvent(kingdomId, eventData) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const timestamp = new Date().toISOString();
    const eventId = eventData.id || Date.now().toString();

    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `EVENTS#${kingdomId}` },
            'SK': { S: `EVENT#${eventId}` },
            'attributes': {
                M: {
                    'type': { S: String(eventData.type || 'System') },
                    'name': { S: String(eventData.name || 'Untitled Event') },
                    'desc': { S: String(eventData.desc || '') },
                    'eventTime': { S: String(eventData.eventTime) }, // ISO string of when event starts
                    'notified15': { BOOL: false }, // Has 15-min warning fired?
                    'notified0': { BOOL: false }, // Has live warning fired?
                    'created': { S: timestamp }
                }
            }
        }
    };

    try {
        const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
        await dbClient.send(new PutItemCommand(params));
        return { id: eventId, ...eventData, created: timestamp };
    } catch (e) {
        console.error("AWS Create Kingdom Event Error", e);
        throw e;
    }
}

/**
 * Marks an event as notified (15m or 0m)
 */
export async function markEventNotified(kingdomId, eventId, type) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;

    const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');
    const field = type === 15 ? 'notified15' : 'notified0';
    
    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `EVENTS#${kingdomId}` },
            'SK': { S: `EVENT#${eventId}` }
        },
        UpdateExpression: `SET #attr.#field = :val`,
        ExpressionAttributeNames: {
            '#attr': 'attributes',
            '#field': field
        },
        ExpressionAttributeValues: {
            ':val': { BOOL: true }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Mark Event Notified Error", e);
        return false;
    }
}

/**
 * Deletes an event for a specific kingdom.
 */
export async function deleteKingdomEvent(kingdomId, eventId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;
    
    const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');

    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `EVENTS#${kingdomId}` },
            'SK': { S: `EVENT#${eventId}` }
        }
    };

    try {
        await dbClient.send(new DeleteItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Delete Kingdom Event Error", e);
        return false;
    }
}

/**
 * Gets all future events for a kingdom.
 */
export async function getKingdomEvents(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    const { QueryCommand } = await import('@aws-sdk/client-dynamodb');

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: `EVENTS#${kingdomId}` },
            ':skPrefix': { S: 'EVENT#' }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const events = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                events.push({
                    id: item.SK.S.replace('EVENT#', ''),
                    type: attrs.type?.S,
                    name: attrs.name?.S,
                    desc: attrs.desc?.S,
                    eventTime: attrs.eventTime?.S,
                    notified15: attrs.notified15?.BOOL || false,
                    notified0: attrs.notified0?.BOOL || false,
                    created: attrs.created?.S
                });
            }
        }
        return events.sort((a,b) => new Date(a.eventTime) - new Date(b.eventTime));
    } catch (e) {
        console.error("AWS Get Kingdom Events Error", e);
        return [];
    }
}
// =========================================================================
// PRESENCE SYSTEM
// =========================================================================

/**
 * Updates a User's Global Presence and Architecture Profiles
 */
export async function updateUserPresence(discordId, presenceData, profilesMap) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;

    // Build the DynamoDB objects
    const presenceAttr = {
        M: {
            status: { S: presenceData.status || "Active" },
            note: { S: presenceData.note || "" },
            requiresPing: { BOOL: !!presenceData.requiresPing },
            updatedAt: { S: new Date().toISOString() }
        }
    };

    const dynamoProfilesMap = {};
    for (const [k, v] of Object.entries(profilesMap)) {
        dynamoProfilesMap[k] = { S: String(v) };
    }

    const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');
    const params = {
        TableName: tableName,
        Key: {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' }
        },
        UpdateExpression: 'SET attributes.#p = :p, attributes.#prof = :prof',
        ExpressionAttributeNames: {
            '#p': 'presence',
            '#prof': 'profiles'
        },
        ExpressionAttributeValues: {
            ':p': presenceAttr,
            ':prof': { M: dynamoProfilesMap }
        }
    };

    try {
        await dbClient.send(new UpdateItemCommand(params));
        return true;
    } catch (e) {
        console.error("AWS Update User Presence Error", e);
        return false;
    }
}
/**
 * Pushes a Presence Webhook Alert to the Discord Queue
 */
export async function queuePresencePing(discordId, kingdomId, status, note) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;
    const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    
    // Create random UUID for multi-pings
    const pingId = Math.random().toString(36).substring(2, 10);
    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: 'PENDING_PINGS' },
            'SK': { S: `PING#${pingId}` },
            'attributes': {
                M: {
                    'discordId': { S: String(discordId) },
                    'kingdomId': { S: String(kingdomId) },
                    'status': { S: String(status) },
                    'note': { S: String(note || '') },
                    'timestamp': { S: new Date().toISOString() }
                }
            }
        }
    };
    try {
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch(e) {
        return false;
    }
}

/**
 * Consumes and deletes all pending Pings from the Queue for Discord Bot
 */
export async function consumePresencePings() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];
    const { QueryCommand, DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    
    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: 'PENDING_PINGS' } }
    };
    try {
        const result = await dbClient.send(new QueryCommand(params));
        if (!result.Items || result.Items.length === 0) return [];
        
        const pings = [];
        for (const item of result.Items) {
            const attrs = item.attributes?.M || {};
            const sk = item.SK.S;
            pings.push({
                pingId: sk,
                discordId: attrs.discordId?.S,
                kingdomId: attrs.kingdomId?.S,
                status: attrs.status?.S,
                note: attrs.note?.S
            });
            // Delete it from the queue immediately
            try {
                await dbClient.send(new DeleteItemCommand({
                    TableName: tableName,
                    Key: { 'PK': { S: 'PENDING_PINGS' }, 'SK': { S: sk } }
                }));
            } catch(delErr){}
        }
        return pings;
    } catch(e) { return []; }
}

// =========================================================================
// CUSTOM MAIL TEMPLATES
// =========================================================================

export async function saveMailTemplate(kingdomId, creatorId, templateName, templateText) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');

    const templateId = Math.random().toString(36).substring(2, 10);
    const params = {
        TableName: tableName,
        Item: {
            'PK': { S: `MAIL_TEMPLATES#${kingdomId}` },
            'SK': { S: `TEMPLATE#${templateId}` },
            'attributes': {
                M: {
                    'creatorId': { S: String(creatorId) },
                    'name': { S: String(templateName) },
                    'body': { S: String(templateText) },
                    'timestamp': { S: new Date().toISOString() }
                }
            }
        }
    };

    try {
        const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
        await dbClient.send(new PutItemCommand(params));
        return { id: templateId, name: templateName, body: templateText };
    } catch (e) {
        console.error("AWS Save Mail Template Error:", e);
        throw e;
    }
}

export async function getMailTemplates(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    const { QueryCommand } = await import('@aws-sdk/client-dynamodb');
    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': { S: `MAIL_TEMPLATES#${kingdomId}` },
            ':skPrefix': { S: 'TEMPLATE#' }
        }
    };

    try {
        const result = await dbClient.send(new QueryCommand(params));
        const templates = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                templates.push({
                    id: item.SK.S.replace('TEMPLATE#', ''),
                    name: attrs.name?.S,
                    body: attrs.body?.S,
                    creatorId: attrs.creatorId?.S,
                    timestamp: attrs.timestamp?.S
                });
            }
        }
        return templates.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
        console.error("AWS Get Mail Templates Error", e);
        return [];
    }
}

/**
 * Retrieves the user's custom saved Camps from DynamoDB
 */
export async function getUserCamps(discordId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    try {
        const { GetItemCommand } = await import('@aws-sdk/client-dynamodb');
        const result = await dbClient.send(new GetItemCommand({
            TableName: tableName,
            Key: { 'PK': { S: `USER#${discordId}` }, 'SK': { S: 'SAVED_CAMPS' } }
        }));

        if (result.Item && result.Item.attributes && result.Item.attributes.M && result.Item.attributes.M.camps) {
            return JSON.parse(result.Item.attributes.M.camps.S || '[]');
        }
        return [];
    } catch(e) {
        console.error('AWS getUserCamps Error', e);
        return [];
    }
}

/**
 * Saves exactly the user's custom saved Camps to DynamoDB
 */
export async function saveUserCamps(discordId, campsArray) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;

    try {
        const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
        const params = {
            TableName: tableName,
            Item: {
                'PK': { S: `USER#${discordId}` },
                'SK': { S: 'SAVED_CAMPS' },
                'attributes': {
                    M: {
                        'camps': { S: JSON.stringify(campsArray) },
                        'updatedAt': { S: new Date().toISOString() }
                    }
                }
            }
        };

        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch(e) {
        console.error('AWS saveUserCamps Error', e);
        return false;
    }
}

/**
 * Sweeps the entire DB for users whose allowedKingdoms matches the target.
 */
export async function getAllUsersInKingdom(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    const params = {
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
        ExpressionAttributeValues: {
            ':pkPrefix': { S: 'USER#' },
            ':sk': { S: 'CONFIG' }
        }
    };

    try {
        let allItems = [];
        let lastEvaluatedKey = null;

        do {
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }
            
            const result = await dbClient.send(new ScanCommand(params));
            if (result.Items) {
                allItems = allItems.concat(result.Items);
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        if (allItems.length === 0) return [];

        // Fetch the active Kingdom Roster from the AWS Scraper
        const kdRoster = await getKingdomRoster(kingdomId);
        const activeKdIds = kdRoster.map(g => String(g.id));

        return allItems.map(item => {
            const attrs = item.attributes?.M || {};
            const pkParts = item.PK.S.split('#');
            const discordId = pkParts.length > 1 ? pkParts[1] : null;

            let govIds = [];
            if (attrs.governorIds && attrs.governorIds.L) {
                govIds = attrs.governorIds.L.map(i => i.S);
            } else if (attrs.governorId && attrs.governorId.S) {
                govIds = [attrs.governorId.S];
            }

            return {
                discordId: discordId,
                governorIds: govIds,
                timezone: attrs.timezone?.S || null,
                playtimeStart: attrs.playtimeStart?.S || null,
                playtimeEnd: attrs.playtimeEnd?.S || null,
                lastActiveTimestamp: attrs.lastActiveTimestamp?.S || null
            };
        }).filter(user => {
            // Only return Discord Users who own at least one active Governor Profile in this Kingdom
            if (user.governorIds.length === 0) return false;
            return user.governorIds.some(id => activeKdIds.includes(String(id)));
        });
    } catch (e) {
        console.error("AWS GetAllUsersInKingdom Error", e);
        return [];
    }
}

/**
 * Updates a user's self-reported typical playtime and native timezone.
 */
export async function updateUserPlaytime(discordId, timezone, playStart, playEnd) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;

    try {
        const { GetItemCommand, PutItemCommand } = await import('@aws-sdk/client-dynamodb');
        
        const getParams = {
            TableName: tableName,
            Key: {
                'PK': { S: `USER#${discordId}` },
                'SK': { S: 'CONFIG' }
            }
        };

        const result = await dbClient.send(new GetItemCommand(getParams));
        const existingItem = result.Item || {
            'PK': { S: `USER#${discordId}` },
            'SK': { S: 'CONFIG' }
        };

        const attrs = existingItem.attributes?.M || {};
        attrs['timezone'] = { S: String(timezone) };
        attrs['playtimeStart'] = { S: String(playStart) };
        attrs['playtimeEnd'] = { S: String(playEnd) };

        existingItem.attributes = { M: attrs };

        const putParams = {
            TableName: tableName,
            Item: existingItem
        };

        await dbClient.send(new PutItemCommand(putParams));
        return true;
    } catch (err) {
        console.error(`[AWS] Failed to update playtime for ${discordId}:`, err);
        return false;
    }
}

/**
 * Searches the Admin MATRIX for any users missing a Discord auth populated Username.
 * Securely handshakes with Discord's REST API using the System Bot Token to silently 
 * patch their avatars and usernames directly into DynamoDB.
 */
export async function syncDiscordProfiles() {
    const tableName = process.env.AWS_TABLE_NAME;
    const botToken = (process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN)?.replace(/['"]/g, '').trim();
    
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');
    if (!botToken) throw new Error('DISCORD_TOKEN is missing! Please inject this into Vercel/local .env to perform background scans.');

    try {
        console.log(`[AWS Multi-Thread] Scanning MATRIX for undocumented identities...`);
        
        // 1. Fetch all config nodes using parallel scanning logic or standard scanning
        // We'll reuse the existing getAllUsers() pipeline to get the cached identities
        const users = await getAllUsers();
        
        // 2. Identify undocumented nodes
        const missingIdentityNodes = users.filter(u => !u.username && u.discordId);
        if(missingIdentityNodes.length === 0) return { synced: 0, message: "All user identities are already verified." };

        console.log(`[Discord Link] Discovered ${missingIdentityNodes.length} Undocumented Nodes. Initiating Secure Handshake...`);
        let syncedCount = 0;

        // 3. Throttle requests to respect Discord's rate limits
        for (const user of missingIdentityNodes) {
            try {
                const res = await fetch(`https://discord.com/api/v10/users/${user.discordId}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bot ${botToken}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    
                    // Construct update
                    const patchParams = {
                        TableName: tableName,
                        Key: {
                            'PK': { S: `USER#${user.discordId}` },
                            'SK': { S: 'CONFIG' }
                        },
                        UpdateExpression: 'SET #attr.#uname = :u, #attr.#ava = :a',
                        ExpressionAttributeNames: {
                            '#attr': 'attributes',
                            '#uname': 'username',
                            '#ava': 'avatar'
                        },
                        ExpressionAttributeValues: {
                            ':u': { S: data.global_name || data.username || "Unknown Entity" },
                            ':a': { S: data.avatar || "null" }
                        }
                    };

                    try {
                        await dbClient.send(new UpdateItemCommand(patchParams));
                        syncedCount++;
                    } catch (dbErr) {
                        console.error(`[AWS] Failed to patch ${user.discordId} in DB:`, dbErr.message);
                    }
                    
                    // Delay slightly to prevent 429 Too Many Requests
                    await new Promise(r => setTimeout(r, 200)); 
                } else {
                    console.log(`[Discord Link] Failed to fetch ${user.discordId}: Status ${res.status}`);
                    if (res.status === 429) {
                        console.log(`[Discord Link] Rate Limit Exceeded. Cooling down...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            } catch (err) {
                console.error(`[Discord Link] Profiling failed for ${user.discordId}:`, err);
            }
        }

        return { synced: syncedCount, message: `Successfully synchronized ${syncedCount} identities.` };
    } catch (e) {
        console.error("AWS Identity Sync Error:", e);
        throw e;
    }
}

/**
 * Searches the Admin MATRIX for any Tenant Guilds missing standard Discord profile data.
 * Securely fetches their active Server Names and Icons if the central Bot is authorized in those nodes.
 */
export async function syncTenantGuildProfiles() {
    const tableName = process.env.AWS_TABLE_NAME;
    const botToken = (process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN)?.replace(/['"]/g, '').trim();
    
    if (!tableName) throw new Error('AWS_TABLE_NAME is not mapped in your .env file');
    if (!botToken) throw new Error('DISCORD_TOKEN is missing! Please inject this into Vercel/local .env to perform background scans.');

    try {
        console.log(`[AWS Multi-Thread] Scanning TENANTS for undocumented guild identities...`);
        const tenants = await getAllTenants();
        
        // Find tenants that do not have a serverName or serveIcon attached yet
        const missingTenants = tenants.filter(t => !t.serverName && t.guildId);
        if(missingTenants.length === 0) return { synced: 0, message: "All tenant guilds are already verified." };

        console.log(`[Discord Link] Discovered ${missingTenants.length} Undocumented Tenants. Initiating Secure Handshake...`);
        let syncedCount = 0;

        for (const tenant of missingTenants) {
            try {
                const res = await fetch(`https://discord.com/api/v10/guilds/${tenant.guildId}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bot ${botToken}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const patchParams = {
                        TableName: tableName,
                        Key: {
                            'PK': { S: 'GLOBAL_TENANTS' },
                            'SK': { S: `TENANT#${tenant.guildId}` }
                        },
                        UpdateExpression: 'SET #attr.#sname = :n, #attr.#sicon = :i',
                        ExpressionAttributeNames: {
                            '#attr': 'attributes',
                            '#sname': 'serverName',
                            '#sicon': 'serverIcon'
                        },
                        ExpressionAttributeValues: {
                            ':n': { S: data.name || "Unknown Server" },
                            ':i': { S: data.icon || "null" }
                        }
                    };

                    try {
                        await dbClient.send(new UpdateItemCommand(patchParams));
                        syncedCount++;
                    } catch (dbErr) {
                        console.error(`[AWS] Failed to patch ${tenant.guildId} in DB:`, dbErr.message);
                    }
                    
                    await new Promise(r => setTimeout(r, 200)); 
                } else {
                    console.log(`[Discord Link] Failed to fetch ${tenant.guildId}: Status ${res.status}`);
                    if (res.status === 429) {
                        console.log(`[Discord Link] Rate Limit Exceeded. Cooling down...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            } catch (err) {
                console.error(`[Discord Link] Profiling failed for ${tenant.guildId}:`, err);
            }
        }
        
        return { synced: syncedCount, message: `Successfully synchronized ${syncedCount} tenant guilds.` };
    } catch (error) {
        console.error('[AWS Multi-Thread] Tenant Sync Engine Failure:', error);
        throw error;
    }
}

/**
 * Injects auxillary Kingdom access onto an Identity Nodes physical registry.
 */
export async function addUserAllowedKingdom(discordId, customKingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is missing');

    const getParams = {
        TableName: tableName,
        Key: { 'PK': { S: `USER#${discordId}` }, 'SK': { S: 'CONFIG' } }
    };

    try {
        const result = await dbClient.send(new GetItemCommand(getParams));
        if (!result.Item) return false;

        const attrs = result.Item.attributes?.M || {};
        const allowedList = attrs.allowedKingdoms?.L || [];
        
        let kingdoms = allowedList.map(obj => obj.S);
        const kid = String(customKingdomId);
        
        if (!kingdoms.includes(kid)) {
            kingdoms.push(kid);
        }

        const updateParams = {
            TableName: tableName,
            Key: { 'PK': { S: `USER#${discordId}` }, 'SK': { S: 'CONFIG' } },
            UpdateExpression: 'SET attributes.allowedKingdoms = :allowed',
            ExpressionAttributeValues: {
                ':allowed': { L: kingdoms.map(k => ({ S: k })) }
            }
        };

        await dbClient.send(new UpdateItemCommand(updateParams));
        return true;
    } catch (e) {
        console.error('AWS Add User Kingdom Error:', e);
        return false;
    }
}

/**
 * Strips manual auxillary Kingdom access from an Identity Network profile.
 */
export async function removeUserAllowedKingdom(discordId, targetKingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is missing');

    const getParams = {
        TableName: tableName,
        Key: { 'PK': { S: `USER#${discordId}` }, 'SK': { S: 'CONFIG' } }
    };

    try {
        const result = await dbClient.send(new GetItemCommand(getParams));
        if (!result.Item) return false;

        const attrs = result.Item.attributes?.M || {};
        const allowedList = attrs.allowedKingdoms?.L || [];
        
        let kingdoms = allowedList.map(obj => obj.S);
        kingdoms = kingdoms.filter(k => k !== String(targetKingdomId));

        const updateParams = {
            TableName: tableName,
            Key: { 'PK': { S: `USER#${discordId}` }, 'SK': { S: 'CONFIG' } },
            UpdateExpression: 'SET attributes.allowedKingdoms = :allowed',
            ExpressionAttributeValues: {
                ':allowed': { L: kingdoms.map(k => ({ S: k })) }
            }
        };

        await dbClient.send(new UpdateItemCommand(updateParams));
        return true;
    } catch (e) {
        console.error('AWS Remove User Kingdom Error:', e);
        return false;
    }
}

/**
 * ==============================================================
 * FEATURE GATES & SUPPORTER ACCESS SYSTEM
 * ==============================================================
 */

/**
 * Fetches the Global Feature Gate Configuration Matrix.
 * Returns an array of configurations mapping Next.js routes to access rules.
 */
export async function getFeatureGates() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not set');

    try {
        const params = {
            TableName: tableName,
            Key: {
                'PK': { S: 'GLOBAL_CONFIG' },
                'SK': { S: 'CONFIG#FEATURE_GATES' }
            }
        };
        const res = await dbClient.send(new GetItemCommand(params));
        if (res.Item && res.Item.gates && res.Item.gates.S) {
            return JSON.parse(res.Item.gates.S);
        }
        return []; // Default empty matrix if no gates are set
    } catch (e) {
        console.error('AWS Get Feature Gates Error:', e);
        return [];
    }
}

/**
 * Upserts a specific Feature Gate into the Global Configuration Matrix.
 */
export async function updateFeatureGate(routeUrl, requiresSupporter, minimumRole) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not set');

    try {
        // Fetch current gates to map over it
        const currentGates = await getFeatureGates();
        
        // Find if this path already exists in the matrix
        const existingIdx = currentGates.findIndex(g => g.path === routeUrl);
        
        if (existingIdx >= 0) {
            currentGates[existingIdx] = { path: routeUrl, requiresSupporter, minimumRole };
        } else {
            currentGates.push({ path: routeUrl, requiresSupporter, minimumRole });
        }

        const updateParams = {
            TableName: tableName,
            Item: {
                'PK': { S: 'GLOBAL_CONFIG' },
                'SK': { S: 'CONFIG#FEATURE_GATES' },
                'gates': { S: JSON.stringify(currentGates) }
            }
        };

        await dbClient.send(new PutItemCommand(updateParams));
        return true;
    } catch (e) {
        console.error('AWS Update Feature Gate Error:', e);
        return false;
    }
}

/**
 * Flags a specific Kingdom Node as an Active Unity Supporter.
 */
export async function setKingdomSupporterStatus(kingdomId, isSupporter) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not set');

    try {
        const _id = String(kingdomId).replace(/[^\d]/g, '');

        const updateParams = {
            TableName: tableName,
            Key: {
                'PK': { S: `KINGDOM#${_id}` },
                'SK': { S: 'CONFIG' }
            },
            UpdateExpression: 'SET supporterStatus = :val',
            ExpressionAttributeValues: {
                ':val': { BOOL: isSupporter === true || isSupporter === 'true' }
            }
        };

        await dbClient.send(new UpdateItemCommand(updateParams));
        return true;
    } catch (e) {
        console.error('AWS Set Kingdom Supporter Status Error:', e);
        return false;
    }
}

/**
 * Fetches all Kingdom IDs that are currently flagged as Active Supporters.
 * Uses a Table Scan focusing strictly on KINGDOM configuration headers.
 */
export async function getSupporterKingdoms() {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) throw new Error('AWS_TABLE_NAME is not set');

    try {
        const params = {
            TableName: tableName,
            FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND supporterStatus = :ss',
            ExpressionAttributeValues: {
                ':prefix': { S: 'KINGDOM#' },
                ':sk': { S: 'CONFIG' },
                ':ss': { BOOL: true }
            }
        };
        const res = await dbClient.send(new ScanCommand(params));
        
        return res.Items ? res.Items.map(item => {
            return item.PK.S.replace('KINGDOM#', '');
        }) : [];
    } catch (e) {
        console.error('AWS Get Supporter Kingdoms Error:', e);
        return [];
    }
}

/**
 * Fast lookup specifically for NextAuth session validation 
 * to determine if a specific Kingdom ID is a Supporter.
 */
export async function getKingdomSupporterStatus(kingdomId) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName || !kingdomId) return false;

    try {
        const _id = String(kingdomId).replace(/[^\d]/g, '');
        const params = {
            TableName: tableName,
            Key: {
                'PK': { S: `KINGDOM#${_id}` },
                'SK': { S: 'CONFIG' }
            }
        };
        const res = await dbClient.send(new GetItemCommand(params));
        
        if (res.Item && res.Item.supporterStatus && res.Item.supporterStatus.BOOL) {
            return true;
        }
        return false;
    } catch (e) {
        console.error('AWS Get Kingdom Supporter Status Error:', e);
        return false;
    }
}


/**
 * Creates a global System Notification record in DynamoDB.
 * @param {string} title - Short alert title
 * @param {string} message - Detail message
 * @param {string} type - 'success' | 'warning' | 'info' | 'error'
 */
export async function createSystemNotification(title, message, type = 'info') {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return false;

    try {
        // Use an ISO timestamp as SK so queries pull chronologically
        const timestamp = new Date().toISOString(); 
        const params = {
            TableName: tableName,
            Item: {
                'PK': { S: 'SYSTEM_NOTIFICATIONS' },
                'SK': { S: `DATE#${timestamp}` },
                'title': { S: title },
                'message': { S: message },
                'type': { S: type },
                'timestamp': { S: timestamp }
            }
        };
        
        await dbClient.send(new PutItemCommand(params));
        return true;
    } catch (e) {
        console.error('AWS Create System Notification Error:', e);
        return false;
    }
}

/**
 * Retrieves the most recent System Notifications.
 */
export async function getSystemNotifications(limit = 10) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return [];

    try {
        // Scan backwards (descending) on Sort Key to get newest first
        const params = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': { S: 'SYSTEM_NOTIFICATIONS' },
                ':skPrefix': { S: 'DATE#' }
            },
            ScanIndexForward: false, // Descending (newest times first)
            Limit: limit
        };

        const res = await dbClient.send(new QueryCommand(params));
        
        if (res.Items) {
            return res.Items.map(item => ({
                id: item.SK.S,
                title: item.title?.S || 'Alert',
                message: item.message?.S || '',
                type: item.type?.S || 'info',
                timestamp: item.timestamp?.S || ''
            }));
        }
        return [];
    } catch (e) {
        console.error('AWS Get System Notifications Error:', e);
        return [];
    }
}
