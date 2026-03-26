import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { getBehavioralMatrix } = await import('../src/lib/awsDynamo.js');

async function test() {
    console.log("Testing getBehavioralMatrix with KD=3155, Start=2025-11-26, End=2026-03-25");
    const res = await getBehavioralMatrix(3155, '2025-11-26', '2026-03-25');
    console.log(`Returned roster length: ${res.length}`);
    if (res.length > 0) {
        console.log("Sample profile:", res[0]);
    }
}
test();
