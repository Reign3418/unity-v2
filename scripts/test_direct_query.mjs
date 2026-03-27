import { getAllTrackedKingdoms, getGovernorHistory } from '../src/lib/awsDynamo.js';

async function run() {
    try {
        const allKds = await getAllTrackedKingdoms();
        console.log(`Firing against ${allKds.length} KDs for 218768480...`);

        const resolved = [];
        for (let i = 0; i < allKds.length; i += 15) {
            const chunk = allKds.slice(i, i + 15);
            const chunkPromises = chunk.map(kd => getGovernorHistory(kd, "218768480", 50));
            const chunkResults = await Promise.all(chunkPromises);
            resolved.push(...chunkResults);
        }
        
        const flattened = resolved.flat().sort((a,b) => {
             const dateA = new Date(a.scanDate.replace(/_/g, " "));
             const dateB = new Date(b.scanDate.replace(/_/g, " "));
             return dateA - dateB; 
        });

        console.log("Flattened length:", flattened.length);
        if (flattened.length > 0) {
           console.log("Timeline [0]:\n", flattened[0]);
        }

    } catch (e) {
        console.error(e);
    }
}
run();
