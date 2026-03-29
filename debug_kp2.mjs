import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const dbClient = new DynamoDBClient({
    region: envConfig.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
        secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY
    }
});

async function test() {
   console.log("Fetching exact keys from DynamoDB for KD 4025...");
   
   // Get a date pointer
   const dRes = await dbClient.send(new QueryCommand({
       TableName: envConfig.AWS_TABLE_NAME,
       KeyConditionExpression: 'PK = :pk',
       ExpressionAttributeValues: { ':pk': { S: 'DATES#4025' } },
       Limit: 1
   }));

   if (dRes.Items && dRes.Items.length > 0) {
       const sk = dRes.Items[0].SK.S;
       const dateKey = sk.replace('DATE#', '').replace('SCAN#', '');
       console.log("Found DateKey:", dateKey);
       
       const sRes = await dbClient.send(new QueryCommand({
           TableName: envConfig.AWS_TABLE_NAME,
           KeyConditionExpression: 'PK = :pk',
           ExpressionAttributeValues: { ':pk': { S: `SCAN#4025#${dateKey}` } },
           Limit: 2
       }));
       
       if (sRes.Items) {
           for (const item of sRes.Items) {
               console.log("Raw Attribute Keys:", Object.keys(item.attributes.M));
               console.log("Raw Kill Points Value:", item.attributes.M['Kill Points'] || item.attributes.M['killPoints'] || item.attributes.M['kp']);
           }
       }
   }
}

test();
