import { getAllTrackedKingdoms, getGovernorHistory } from '../src/lib/awsDynamo.js';

async function run() {
    try {
        const allKds = await getAllTrackedKingdoms();
        console.log(`Firing ${allKds.length} queries...`);

        const fetchPromises = allKds.map(kd => getGovernorHistory(kd, "219048573", 50));
        const resolved = await Promise.all(fetchPromises);
        
        const flattened = resolved.flat().sort((a,b) => {
             const dateA = new Date(a.scanDate.replace(/_/g, " "));
             const dateB = new Date(b.scanDate.replace(/_/g, " "));
             return dateA - dateB; // Oldest first
        });

        console.log("Flattened length:", flattened.length);
        console.log("Timeline:\n", flattened.map(f => `${f.kingdom} | ${f.scanDate} | ${f.power}`));

    } catch (e) {
        console.error(e);
    }
}
run();
