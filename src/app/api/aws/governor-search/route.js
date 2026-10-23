import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readLiveTelemetryCache } from '@/app/api/ingest/kingdom-scan/route';
import { getKingdomRoster } from '@/lib/awsDynamo';
import { evaluateF2pGovernorReport } from '@/lib/f2pEfficiencyEngine';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

export const dynamic = 'force-dynamic';

const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

function parseDynamoProfileItem(item, fallbackId) {
  if (!item?.attributes?.M) return null;
  const m = item.attributes.M;
  const num = (k) => parseInt(m[k]?.N || '0', 10) || 0;
  const str = (k, def = '') => m[k]?.S || def;

  const id = str('Governor ID', fallbackId);
  const power = num('Power');
  if (!id || power === 0) return null;

  return {
    id,
    govId: Number(id) || id,
    name: str('Governor Name', str('name', `Governor_${id}`)),
    alliance: str('Alliance Tag', 'None'),
    allianceName: str('Alliance Name', ''),
    kingdomId: String(num('lastSeenKingdom') || '3418'),
    lastScanDate: str('lastSeenDate', ''),
    cityHall: num('Town Hall') || 25,
    vipLevel: num('VIP Level'),
    civilization: str('Civilization', 'China'),
    civId: num('Civ ID') || 6,
    power,
    highestPower: num('Highest Power') || power,
    troopPower: num('Troop Power'),
    techPower: num('Tech Power'),
    buildingPower: num('Building Power'),
    commanderPower: num('Commander Power'),
    killPoints: num('Kill Points'),
    totalUnitsKilled: num('Total Units Killed'),
    rangedPoints: num('Ranged Points'),
    dead: num('Deads'),
    healedTroops: num('Healed Troops'),
    victories: num('Victories'),
    defeats: num('Defeats'),
    scoutTimes: num('Scout Times'),
    t1Kills: num('T1 Kills'),
    t2Kills: num('T2 Kills'),
    t3Kills: num('T3 Kills'),
    t4Kills: num('T4 Kills'),
    t5Kills: num('T5 Kills'),
    t1Kp: num('T1 KP'),
    t2Kp: num('T2 KP'),
    t3Kp: num('T3 KP'),
    t4Kp: num('T4 KP'),
    t5Kp: num('T5 KP'),
    gathered: num('Resources Gathered'),
    assistance: num('Assistance'),
    helps: num('Helps'),
    kvkHighestKp: num('KvK Highest KP'),
    kvkMostKills: num('KvK Most Kills'),
    kvkMostHealed: num('KvK Most Healed'),
    kvkMostDead: num('KvK Most Dead'),
    kvkCount: num('KvK Count') || num('Lost Kingdom Count'),
    aooWins: num('AoO Wins'),
    aooLosses: num('AoO Losses'),
    aooLeaves: num('AoO Leaves'),
    aooKillStocks: num('AoO Kill Stocks'),
    aooHighestScore: num('AoO Highest Score'),
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const kd = (searchParams.get('kd') || '').trim();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    const cache = readLiveTelemetryCache();
    let pool = Object.values(cache.governorsById || {});

    if (kd && kd !== 'ALL' && kd !== 'GLOBAL') {
      const kdSpecific = Object.values(cache.kingdoms?.[kd]?.governors || {});
      if (kdSpecific.length > 0) {
        pool = kdSpecific;
      } else {
        try {
          const awsRoster = await getKingdomRoster(kd);
          if (awsRoster?.length > 0) {
            pool = [...pool, ...awsRoster];
          }
        } catch {}
      }
    }

    // Direct O(1) DynamoDB global lookup if user typed an exact Governor ID not in local cache
    if (/^\d{6,12}$/.test(q) && !cache.governorsById?.[q] && process.env.AWS_TABLE_NAME) {
      try {
        const res = await dbClient.send(
          new GetItemCommand({
            TableName: process.env.AWS_TABLE_NAME,
            Key: {
              PK: { S: `GOV_PROFILE#${q}` },
              SK: { S: 'PROFILE' },
            },
          })
        );
        const parsed = parseDynamoProfileItem(res.Item, q);
        if (parsed) {
          pool.unshift(parsed);
        }
      } catch {}
    }

    let matches = pool;
    if (q) {
      matches = pool.filter((g) => {
        const idStr = String(g.id || g.govId || '').toLowerCase();
        const nameStr = String(g.name || '').toLowerCase();
        const alStr = String(g.alliance || '').toLowerCase();
        const alNameStr = String(g.allianceName || '').toLowerCase();
        const kdStr = String(g.kingdomId || g.serverId || '').toLowerCase();
        const civStr = String(g.civilization || '').toLowerCase();
        return (
          idStr.includes(q) ||
          nameStr.includes(q) ||
          alStr.includes(q) ||
          alNameStr.includes(q) ||
          kdStr === q ||
          civStr.includes(q)
        );
      });
    }

    // Deduplicate by id and sort by power desc
    const seen = new Set();
    const unique = [];
    for (const g of matches) {
      const gid = String(g.id || g.govId);
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      unique.push(g);
    }
    unique.sort((a, b) => (Number(b.power) || 0) - (Number(a.power) || 0));

    const session = await auth();
    const isSuperAdmin = Boolean(session?.user?.isSuperAdmin || session?.user?.role === 'Admin');

    const results = unique.slice(0, limit).map((gov, idx) => {
      const safeGov = { ...gov };
      if (!isSuperAdmin) {
        delete safeGov.workerSerial;
        delete safeGov.instanceId;
        delete safeGov.source;
        delete safeGov.udid;
        delete safeGov.lilithUid;
        delete safeGov.appUid;
      }
      return {
        ...safeGov,
        rank: gov.rank || idx + 1,
        f2pReport: evaluateF2pGovernorReport(safeGov),
      };
    });

    return NextResponse.json({
      success: true,
      query: q,
      totalMatched: unique.length,
      updatedAt: cache.updatedAt,
      kingdomsAvailable: Object.keys(cache.kingdoms || {}),
      results,
    });
  } catch (error) {
    console.error('[API/Governor-Search] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
