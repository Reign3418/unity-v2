import { config } from 'dotenv'; config({path: '../.env.local'});
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const dbClient = new DynamoDBClient({ region: 'us-east-2' });
const tableName = "Unity2AWSRoster";

async function run() {
    try {
        const scanRes = await dbClient.send(new ScanCommand({
            TableName: tableName,
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: { ':id': { N: '218768480' } }
        }));
        console.log(`Scan found ${scanRes.Items?.length} items by id=218768480`);
        if (scanRes.Items?.length) console.dir(scanRes.Items[0], {depth: null});
        
        const scanRes2 = await dbClient.send(new ScanCommand({
            TableName: tableName,
            FilterExpression: 'id = :id OR contains(SK, :id_str)',
            ExpressionAttributeValues: { ':id': { N: '218768480' }, ':id_str': { S: '218768480' } }
        }));
        console.log(`Scan2 found ${scanRes2.Items?.length} items for string SK`);
        if (scanRes2.Items?.length) console.log("PK", scanRes2.Items[0].PK.S, "SK", scanRes2.Items[0].SK.S);

    } catch(e) { console.error(e); }
}
run();
