import 'dotenv/config';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
const client = new DynamoDBClient({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function test() {
    const res = await client.send(new GetItemCommand({
        TableName: process.env.AWS_TABLE_NAME,
        Key: {
            'PK': { S: 'GOV_PROFILE#218768480' },
            'SK': { S: 'PROFILE' }
        }
    }));
    console.log(JSON.stringify(res.Item, null, 2));
}
test();
