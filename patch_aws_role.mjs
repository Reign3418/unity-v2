import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\lib\\awsDynamo.js';
const lines = readFileSync(filePath, 'utf8').split('\n');

const newFunc = `
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
            'PK': { S: \`USER#\${discordId}\` },
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
`;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("export async function getAllTenants")) {
        lines.splice(i - 1, 0, newFunc);
        break;
    }
}

writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Injected updateUserRole successful');
