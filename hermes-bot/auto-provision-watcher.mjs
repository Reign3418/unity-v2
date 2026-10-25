import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { provisionDiscordServer } from './provisioner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUILD_ID = process.env.ALLOWED_GUILD_ID || '1563618222895407166';

function resolveBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN;
  if (process.env.DISCORD_BOT_TOKEN) return process.env.DISCORD_BOT_TOKEN;
  const envFile = path.resolve(__dirname, './.env.railway');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^(?:DISCORD_TOKEN|DISCORD_BOT_TOKEN)=(.+)$/m);
    if (m && m[1].trim()) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const BOT_TOKEN = resolveBotToken();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`[HERMES Watcher] Waiting for HERMES to be authorized in Guild ${GUILD_ID}...`);

  for (let i = 0; i < 200; i++) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });

      if (res.ok) {
        const guild = await res.json();
        console.log(`✅ [HERMES Watcher] Bot detected inside "${guild.name}" (${GUILD_ID})! Starting 1-Click Provisioning...`);
        const result = await provisionDiscordServer({
          blueprintType: 'VALHEON_HQ',
          guildId: GUILD_ID,
          botToken: BOT_TOKEN,
          dryRun: false,
        });
        console.log(`🎉 [HERMES Watcher] Provisioning Complete! Created/Verified ${result.log.length} items.`);
        for (const line of result.log) {
          console.log(`  ${line}`);
        }
        process.exit(0);
      }
    } catch (err) {
      // Keep polling
    }
    await sleep(3000);
  }

  console.error('[HERMES Watcher] Timed out waiting for bot invite authorization.');
  process.exit(1);
}

main();
