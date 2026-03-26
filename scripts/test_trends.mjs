import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { getKingdomTrends } = await import('../src/lib/awsDynamo.js');

async function test() {
    const res = await getKingdomTrends(3155);
    console.log(`Trends length: ${res.length}`);
    if (res.length > 0) {
        console.log("Sample:", JSON.stringify(res.slice(0, 3), null, 2));
    }
}
test();
