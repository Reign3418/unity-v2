// Quick API fetch test
async function run() {
    const url = 'http://localhost:3000/api/aws/behavior?kd=3155&start=2026-01-02&end=2026-03-21';
    console.log('Fetching:', url);
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log('Response status:', res.status);
        if (data.roster) {
            console.log('Roster length:', data.roster.length);
            if (data.roster.length > 0) {
                console.log('Sample profile:', JSON.stringify(data.roster[0], null, 2));
            }
        } else {
            console.log('Data:', data);
        }
    } catch(e) {
        console.error(e);
    }
}
run();
