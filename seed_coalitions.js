require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
    region: 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const docClient = DynamoDBDocumentClient.from(client);

async function run() {
    const pk = 'KD#3701';
    const sk = 'CONFIG#DKP';
    
    // fetch current config
    const getRes = await docClient.send(new GetCommand({
        TableName: 'Unity2AWSRoster',
        Key: { PK: pk, SK: sk }
    }));
    
    let configData = getRes.Item ? getRes.Item.configData || {} : {};
    
    configData.socMap = 'Heroic Anthem';
    configData.socRegDate = '2026-06-22T00:00:00.000Z'; // Jun 22 2026 UTC
    configData.socCamps = [
        { id: 1, name: 'Fire',  kds: '#2907, #3357, #3378, #3419, #3559, #3614' },
        { id: 2, name: 'Earth', kds: '#1044, #2213, #2347, #3132, #3398, #3649' },
        { id: 3, name: 'Water', kds: '#1490, #1902, #2165, #2284, #3599, #3816' },
        { id: 4, name: 'Wind',  kds: '#1399, #1549, #1975, #2864, #3429, #3701' }
    ];
    
    await docClient.send(new PutCommand({
        TableName: 'Unity2AWSRoster',
        Item: {
            PK: pk,
            SK: sk,
            configData: configData,
            updatedAt: new Date().toISOString()
        }
    }));
    
    console.log('Successfully seeded Coalition Config for KD 3701!');
}

run().catch(console.error);
