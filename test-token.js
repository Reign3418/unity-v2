const fs = require('fs');

async function testFetch() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
    if (!match) return console.log('token not found locally');
    const token = match[1].trim();
    console.log('Using token starting with:', token.slice(0, 10));
    
    const res = await fetch('https://discord.com/api/v10/users/717146553567150141', {
      headers: { 'Authorization': `Bot ${token}` }
    });
    
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch(e) {
    console.error(e);
  }
}

testFetch();
