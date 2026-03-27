import { config } from 'dotenv'; config({path: '../.env.local'});
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dbClient = new DynamoDBClient({ region: 'us-east-2' });
const tableName = "Unity2AWSRoster";

async function run() {
    try {
        const d = await dbClient.send(new QueryCommand({
            TableName: tableName, 
            KeyConditionExpression: 'PK = :pk', 
            ExpressionAttributeValues: { ':pk': { S: 'DATES#4025' } }
        }));
        const dates = d.Items.map(i => i.SK.S.replace('SCAN#', '').replace('DATE#', ''));
        const latestDate = dates[dates.length - 1];
        console.log('Latest Date in 4025:', latestDate);
        
        const r = await dbClient.send(new QueryCommand({
            TableName: tableName, 
            KeyConditionExpression: 'PK = :pk', 
            ExpressionAttributeValues: {':pk': {S: 'SCAN#4025#' + latestDate}}
        }));
        
        let target = null;
        for (const i of r.Items) {
            const attrs = i.attributes?.M || {};
            const id = attrs['Governor ID']?.S || attrs['id']?.S || attrs['id']?.N || i.SK.S.replace('GOV#', '');
            const name = attrs['Governor Name']?.S || attrs['name']?.S || '';
            if (id === '218768480' || id === 218768480 || name.includes('SHiRO')) {
                target = i;
                break;
            }
        }
        
        if (target) {
            console.log("FOUND!");
            console.dir(target);
        } else {
            console.log("NOT FOUND in latest scan of 4025");
        }
    } catch(e) { console.error(e); }
}
run();
