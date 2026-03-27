import { config } from 'dotenv'; config({path: '../.env.local'});
import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dbClient = new DynamoDBClient({ region: 'us-east-2' });
const tableName = "Unity2AWSRoster";

async function run() {
    try {
        const params = { TableName: tableName, Key: { 'PK': { S: 'SYSTEM#CONFIG' }, 'SK': { S: 'TRACKED_KINGDOMS' } } };
        const result = await dbClient.send(new GetItemCommand(params));
        const allKds = result.Item.kingdoms.SS.sort((a,b) => parseInt(a) - parseInt(b));
        console.log(`Unity2AWSRoster has ${allKds.length} tracked kingdoms.`);
        
        let found = 0;
        for (const kd of allKds) {
            const dateParams = { TableName: tableName, KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': { S: `DATES#${kd}` } } };
            const dateResult = await dbClient.send(new QueryCommand(dateParams));
            if (!dateResult.Items || dateResult.Items.length === 0) continue;
            
            const dates = dateResult.Items.map(i => i.attributes?.M?.scanDate?.S).slice(0, 50);
            const chunkPromises = dates.map(date => {
                return dbClient.send(new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'PK = :pk AND SK = :sk',
                    ExpressionAttributeValues: {
                        ':pk': { S: `SCAN#${kd}#${date}` },
                        ':sk': { S: `GOV#218768480` }
                    }
                })).catch(() => null);
            });
            const res = await Promise.all(chunkPromises);
            const hits = res.filter(r => r && r.Items && r.Items.length > 0);
            if (hits.length > 0) {
                console.log(`Found ${hits.length} scans for governor in KD ${kd}`);
                found += hits.length;
            }
        }
        console.log("Total Scans found in Unity2AWSRoster:", found);
    } catch(e) { console.error(e); }
}
run();
