import { DynamoDBClient, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Mount environment credentials from Unity V2
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// DynamoDB Connection
const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const TableName = process.env.AWS_TABLE_NAME;
const SANDBOX_DIR = path.resolve("E:/Unity BU/data-sandbox");

if (!fs.existsSync(SANDBOX_DIR)) {
    console.error(`ERROR: Data Sandbox directory does not exist: ${SANDBOX_DIR}`);
    process.exit(1);
}

// Ensure the user names files properly so the script knows the Kingdom ID and Scan Date
// Expected Format: "3155_2026-03-25.xlsx" or "3155_2026-03-25.csv"

async function checkIfScanExists(kingdomId, scanDateIso) {
    const params = {
        TableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': { S: `DATES#${kingdomId}` },
            ':sk': { S: `SCAN#${scanDateIso}` }
        }
    };
    try {
        const result = await dbClient.send(new QueryCommand(params));
        return result.Items && result.Items.length > 0;
    } catch(e) {
        console.error("AWS Pre-Check Error", e);
        return false;
    }
}

async function uploadFileBatch(filePath, kingdomId, scanDateIso) {
    console.log(`\n========================================`);
    console.log(`[PIPELINE] Formatting File: ${path.basename(filePath)}`);
    console.log(`[PIPELINE] Kingdom: ${kingdomId} | Target Date: ${scanDateIso}`);
    
    // Quick Pre-Check
    const exists = await checkIfScanExists(kingdomId, scanDateIso);
    if (exists) {
        console.warn(`[SKIPPED] A scan for Kingdom ${kingdomId} on ${scanDateIso} already exists in the AWS Ecosystem. Proceeding to next file...`);
        return true; // Technically a success skip
    }

    try {
        // 1. Read Payload
        const workbook = xlsx.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

        if (data.length === 0) {
             console.error("[ERROR] Corrupted or empty spreadsheet.");
             return;
        }

        console.log(`[SUCCESS] Extracted ${data.length} governor nodes successfully. Generating payload array...`);

        // 2. Transpose Headers logic (fallback for Legacy headers vs V2 headers)
        const getColumn = (row, ...keys) => {
            for (let key of keys) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
                    return row[key];
                }
            }
            return 0; // Default to 0 for numerical arrays
        };

        const payloadCommands = [];

        // 3. Register System Config + Dates Header
        payloadCommands.push(
            new UpdateItemCommand({
                TableName,
                Key: { 'PK': { S: 'SYSTEM#CONFIG' }, 'SK': { S: 'TRACKED_KINGDOMS' } },
                UpdateExpression: "ADD kingdoms :kd",
                ExpressionAttributeValues: { ":kd": { SS: [String(kingdomId)] } }
            })
        );

        payloadCommands.push(
            new PutItemCommand({
                TableName,
                Item: {
                    'PK': { S: `DATES#${kingdomId}` },
                    'SK': { S: `SCAN#${scanDateIso}` },
                    'attributes': { M: { 
                        'scanDate': { S: scanDateIso },
                        'rowCount': { N: String(data.length) },
                        'uploaderId': { S: "NODE_BULK_CLI" },
                        'uploaderName': { S: "Developer Bulk Engine" },
                        'sourceFile': { S: String(path.basename(filePath)) },
                        'importTag': { S: "BULK_V1" },
                        'isBulkImport': { BOOL: true }
                    } }
                }
            })
        );

        // 4. Fire Async Items explicitly
        for (const row of data) {
            let govId = String(getColumn(row, 'Governor ID', 'govId', 'id', 'ID'));
            let name = String(getColumn(row, 'Governor Name', 'name', 'Name', 'Governor')).replace(/"/g, "'");
            let kp = parseInt(String(getColumn(row, 'Kill Points', 'killPoints', 'KP', 'kill_points')).replace(/,/g, '')) || 0;
            let pwr = parseInt(String(getColumn(row, 'Power', 'power', 'pow')).replace(/,/g, '')) || 0;
            let deads = parseInt(String(getColumn(row, 'Deads', 'dead', 'Dead')).replace(/,/g, '')) || 0;
            
            // Complex dimensional parameters for PCA
            let t4 = parseInt(String(getColumn(row, 'T4 Kills', 't4Kills')).replace(/,/g, '')) || 0;
            let t5 = parseInt(String(getColumn(row, 'T5 Kills', 't5Kills')).replace(/,/g, '')) || 0;
            let troop = parseInt(String(getColumn(row, 'Troop Power', 'troopPower')).replace(/,/g, '')) || 0;
            let tech = parseInt(String(getColumn(row, 'Tech Power', 'techPower')).replace(/,/g, '')) || 0;
            let cmd = parseInt(String(getColumn(row, 'Commander Power', 'commanderPower')).replace(/,/g, '')) || 0;
            let resources = parseInt(String(getColumn(row, 'Resources Gathered', 'gathered')).replace(/,/g, '')) || 0;
            let assistance = parseInt(String(getColumn(row, 'Assistance', 'assistance')).replace(/,/g, '')) || 0;
            
            let alliance = String(getColumn(row, 'Alliance', 'alliance', 'Alliance Tag', 'tag')).trim();
            if (!alliance || alliance === '0' || alliance.toLowerCase() === 'none') alliance = "None";

            if (!govId || govId === '0') continue;

            const putCommand = new PutItemCommand({
                 TableName,
                 Item: {
                     'PK': { S: `SCAN#${kingdomId}#${scanDateIso}` },
                     'SK': { S: `GOV#${govId}` },
                     'attributes': { M: {
                          'id': { S: String(govId) },
                          'name': { S: String(name) },
                          'power': { N: String(pwr) },
                          'killPoints': { N: String(kp) },
                          'dead': { N: String(deads) },
                          't4Kills': { N: String(t4) },
                          't5Kills': { N: String(t5) },
                          'troopPower': { N: String(troop) },
                          'techPower': { N: String(tech) },
                          'commanderPower': { N: String(cmd) },
                          'gathered': { N: String(resources) },
                          'assistance': { N: String(assistance) },
                          'alliance': { S: String(alliance) },
                          'importTag': { S: "BULK_V1" },
                          'isBulkImport': { BOOL: true }
                     }}
                 }
            });
            payloadCommands.push(putCommand);
        }

        // Extremely fast multi-threaded execution
        console.log(`[EXECUTING] Siphoning ${payloadCommands.length} DynamoDB payload objects asynchronously...`);
        const batchSize = 100;
        for (let i = 0; i < payloadCommands.length; i += batchSize) {
             const slice = payloadCommands.slice(i, i + batchSize);
             await Promise.all(slice.map(cmd => dbClient.send(cmd)));
             process.stdout.write(`\r[PROGRESS] Deployed array chunk ${i + slice.length} / ${payloadCommands.length}...`);
        }
        
        console.log(`\n[COMPLETE] Vector pipeline executed. Document successfully injected.`);
        return true;
    } catch(e) {
        console.error(`\n[ERROR] Fatal script execution failure mapping file ${filePath}:`, e.message);
        return false;
    }
}

async function runBulkEngine() {
    console.log(`[STARTING] Booting AWS Sandbox Offline Matrix Generator...`);
    const files = fs.readdirSync(SANDBOX_DIR).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
    
    if (files.length === 0) {
         console.warn(`[IDLE] The Data Sandbox is totally empty. Please move specific Kingdom files into: ${SANDBOX_DIR}`);
         process.exit(0);
    }

    const failedFiles = [];
    let successCount = 0;

    for (const file of files) {
        const filePath = path.join(SANDBOX_DIR, file);
        
        // Javascript \b boundary fails on underscores. Use strict character tracking:
        const kingdomMatch = file.match(/(?:^|_)([1-4]\d{3})(?:_|$)/);
        const kingdomId = kingdomMatch ? kingdomMatch[1] : null;

        if (!kingdomId) {
             console.error(`\n[REJECTED] Unknown Kingdom ID in file '${file}'. DB Defaulting is FORBIDDEN. Skipping.`);
             failedFiles.push({ File: file, Reason: 'Missing 4-Digit KD ID' });
             continue;
        }

        let scanDateIso = null;

        // Try YYYY-MM-DD or YYYY_MM_DD
        const ymdMatch = file.match(/(?:^|_|[^0-9])(20\d{2})[-_]?(\d{1,2})[-_]?(\d{1,2})(?:_|$|[^0-9])/);
        // Try MM-DD-YYYY or MM_DD_YYYY
        const mdyMatch = file.match(/(?:^|_|[^0-9])(\d{1,2})[-_]?(\d{1,2})[-_]?(20\d{2})(?:_|$|[^0-9])/);
        // Try Discord Bot UNIX Epoch Timestamp (177xxxxxxx)
        const epochMatch = file.match(/_(17[56789]\d{7})(?:_|\.)/);

        if (ymdMatch) {
             const year = ymdMatch[1];
             const month = ymdMatch[2].padStart(2, '0');
             const day = ymdMatch[3].padStart(2, '0');
             scanDateIso = `${year}-${month}-${day}`;
        } else if (mdyMatch) {
             const month = mdyMatch[1].padStart(2, '0');
             const day = mdyMatch[2].padStart(2, '0');
             const year = mdyMatch[3];
             scanDateIso = `${year}-${month}-${day}`;
        } else if (epochMatch) {
             const epochSeconds = parseInt(epochMatch[1]);
             // Instantiate a native Javascript Date object and convert immediately to ISO
             const dateObj = new Date(epochSeconds * 1000);
             scanDateIso = dateObj.toISOString().split('T')[0];
        }

        if (!scanDateIso || scanDateIso === '2020-00-00') {
             console.error(`\n[REJECTED] Could not decipher any valid Date from string '${file}'. Skipping to protect DB.`);
             failedFiles.push({ File: file, Reason: 'Missing Valid Format: Y-M-D or M-D-Y' });
             continue;
        }

        const success = await uploadFileBatch(filePath, kingdomId, scanDateIso);
        if (success) successCount++;
    }
    
    console.log(`\n========================================`);
    console.log(`[FINISHED] Sandbox matrix scan fully completed.`);
    console.log(`[SUCCESS] Valid Ingestions: ${successCount}`);
    
    if (failedFiles.length > 0) {
        console.log(`\n[WARNING] The following ${failedFiles.length} files were completely rejected from the AWS Matrix:`);
        console.table(failedFiles);
    }
}

runBulkEngine();
