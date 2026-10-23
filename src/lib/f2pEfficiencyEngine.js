/**
 * ============================================================================
 * VALHEON UNITY // 35-FIELD F2P DIAGNOSTIC & "$2 / SPEEDUP" EFFICIENCY ENGINE
 * Module: @/lib/f2pEfficiencyEngine
 * ============================================================================
 * Analyzes all 35 live Governor telemetry fields extracted by Valheon Optical Telemetry to:
 *   1. Diagnose exact account mistakes ("Hollow Troop Bloat", "Tech Deficit",
 *      "VIP Bottleneck", "Hospital Bleed", "Civilization Mismatch").
 *   2. Deliver the highest-ROI "$1 to $5" Micro-Spender Playbook.
 *   3. Calculate exact Speedup & Buff-Stacking efficiency savings.
 * ============================================================================
 */

export const ALL_35_FIELD_GROUPS = [
  {
    group: '01 // Identity & Progression (8 Fields)',
    fields: [
      { key: 'id', label: 'Governor ID', format: 'raw' },
      { key: 'name', label: 'Governor Name', format: 'raw' },
      { key: 'alliance', label: 'Alliance Tag', format: 'raw' },
      { key: 'allianceName', label: 'Alliance Full Name', format: 'raw' },
      { key: 'kingdomId', label: 'Kingdom Server', format: 'raw' },
      { key: 'cityHall', label: 'City Hall Level', format: 'level' },
      { key: 'vipLevel', label: 'VIP Level', format: 'level' },
      { key: 'civilization', label: 'Civilization', format: 'raw' },
    ],
  },
  {
    group: '02 // Hidden Power Architecture (7 Fields)',
    fields: [
      { key: 'power', label: 'Current Power', format: 'number' },
      { key: 'highestPower', label: 'Highest Power', format: 'number' },
      { key: 'matchmakingPower', label: 'Matchmaking Power (No Cmdr)', format: 'number', highlight: 'cyan' },
      { key: 'troopPower', label: 'Troop Power (RAM)', format: 'number', highlight: 'cyan' },
      { key: 'techPower', label: 'Tech Power (RAM)', format: 'number', highlight: 'emerald' },
      { key: 'buildingPower', label: 'Building Power (RAM)', format: 'number', highlight: 'amber' },
      { key: 'commanderPower', label: 'Commander Power (RAM)', format: 'number', highlight: 'purple' },
    ],
  },
  {
    group: '03 // Combat & Kill Tier Telemetry (18 Fields)',
    fields: [
      { key: 'killPoints', label: 'Total Kill Points', format: 'number' },
      { key: 'totalUnitsKilled', label: 'Total Units Killed', format: 'number' },
      { key: 'rangedPoints', label: 'Ranged Points', format: 'number' },
      { key: 'dead', label: 'Dead Troops', format: 'number', highlight: 'rose' },
      { key: 'healedTroops', label: 'Healed Troops (RAM)', format: 'number', highlight: 'cyan' },
      { key: 'victories', label: 'Victories', format: 'number' },
      { key: 'defeats', label: 'Defeats', format: 'number' },
      { key: 'scoutTimes', label: 'Scout Times', format: 'number' },
      { key: 't1Kills', label: 'T1 Units Killed', format: 'number' },
      { key: 't2Kills', label: 'T2 Units Killed', format: 'number' },
      { key: 't3Kills', label: 'T3 Units Killed', format: 'number' },
      { key: 't4Kills', label: 'T4 Units Killed', format: 'number', highlight: 'amber' },
      { key: 't5Kills', label: 'T5 Units Killed', format: 'number', highlight: 'rose' },
      { key: 't1Kp', label: 'T1 Kill Points', format: 'number' },
      { key: 't2Kp', label: 'T2 Kill Points', format: 'number' },
      { key: 't3Kp', label: 'T3 Kill Points', format: 'number' },
      { key: 't4Kp', label: 'T4 Kill Points', format: 'number' },
      { key: 't5Kp', label: 'T5 Kill Points', format: 'number' },
    ],
  },
  {
    group: '04 // Economy, Support & Career (13 Fields)',
    fields: [
      { key: 'gathered', label: 'Resources Gathered', format: 'number', highlight: 'emerald' },
      { key: 'assistance', label: 'Resource Assistance', format: 'number' },
      { key: 'helps', label: 'Alliance Help Times', format: 'number', highlight: 'cyan' },
      { key: 'kvkCount', label: 'KvK Campaigns', format: 'number' },
      { key: 'kvkHighestKp', label: 'KvK Highest KP', format: 'number' },
      { key: 'kvkMostKills', label: 'KvK Most Kills', format: 'number' },
      { key: 'kvkMostHealed', label: 'KvK Most Healed', format: 'number' },
      { key: 'kvkMostDead', label: 'KvK Most Dead', format: 'number' },
      { key: 'aooWins', label: 'Ark of Osiris Wins', format: 'number' },
      { key: 'aooLosses', label: 'Ark of Osiris Losses', format: 'number' },
      { key: 'aooLeaves', label: 'Ark of Osiris Leaves', format: 'number' },
      { key: 'aooKillStocks', label: 'Ark Kill Stocks', format: 'number' },
      { key: 'aooHighestScore', label: 'Ark Highest Score', format: 'number' },
    ],
  },
  {
    group: '05 // Valheon Deep Vector & Rally Telemetry (10 Fields)',
    fields: [
      { key: 'castlePos', label: 'City Coordinates [X, Y]', format: 'raw', highlight: 'cyan' },
      { key: 'ralliesLed', label: 'Fort/War Rallies Led', format: 'number', highlight: 'emerald' },
      { key: 'ralliesJoined', label: 'Fort/War Rallies Joined', format: 'number', highlight: 'emerald' },
      { key: 'primaryCommander', label: 'Primary Commander & Skills', format: 'raw', highlight: 'purple' },
      { key: 'secondaryCommander', label: 'Secondary Commander & Skills', format: 'raw' },
      { key: 'equippedGear', label: 'Equipped Gear (HEq)', format: 'raw', highlight: 'amber' },
      { key: 'udid', label: 'Hardware Device Udid', format: 'raw' },
      { key: 'appUid', label: 'Lilith Account AppUid', format: 'raw' },
      { key: 'clientPlatform', label: 'Client OS Platform', format: 'raw' },
      { key: 'internalServerId', label: 'Internal Server COSId', format: 'raw' },
    ],
  },
];

export function evaluateF2pGovernorReport(gov) {
  if (!gov) return null;

  const power = Math.max(1, Number(gov.power) || 0);
  const highestPower = Math.max(power, Number(gov.highestPower) || power);
  const troopPower = Number(gov.troopPower) || 0;
  const techPower = Number(gov.techPower) || 0;
  const buildingPower = Number(gov.buildingPower) || 0;
  const commanderPower = Number(gov.commanderPower) || 0;
  const matchmakingPower = Number(gov.matchmakingPower) || (troopPower + techPower + buildingPower > 0 ? troopPower + techPower + buildingPower : Math.max(0, power - commanderPower));

  const killPoints = Number(gov.killPoints) || 0;
  const dead = Number(gov.dead ?? gov.deads) || 0;
  const healedTroops = Number(gov.healedTroops) || 0;
  const victories = Number(gov.victories) || 0;
  const defeats = Number(gov.defeats) || 0;
  const scoutTimes = Number(gov.scoutTimes) || 0;

  const t1Kills = Number(gov.t1Kills) || 0;
  const t2Kills = Number(gov.t2Kills) || 0;
  const t3Kills = Number(gov.t3Kills) || 0;
  const t4Kills = Number(gov.t4Kills) || 0;
  const t5Kills = Number(gov.t5Kills) || 0;

  const gathered = Number(gov.gathered ?? gov.resources) || 0;
  const assistance = Number(gov.assistance) || 0;
  const helps = Number(gov.helps) || 0;

  const cityHall = Number(gov.cityHall ?? gov.townHall) || 25;
  const vipLevel = Number(gov.vipLevel) || 0;
  const civilization = gov.civilization || 'China';

  // 1. Power Architecture Ratios
  const troopPct = +((troopPower / power) * 100).toFixed(1);
  const techPct = +((techPower / power) * 100).toFixed(1);
  const buildPct = +((buildingPower / power) * 100).toFixed(1);
  const cmdrPct = +((commanderPower / power) * 100).toFixed(1);

  // 2. Kill Quality & Combat Efficiency
  const highTierKills = t4Kills + t5Kills;
  const totalKills = Math.max(1, Number(gov.totalUnitsKilled) || (t1Kills + t2Kills + t3Kills + t4Kills + t5Kills));
  const highTierKillPct = +((highTierKills / totalKills) * 100).toFixed(1);
  const kpToPowerRatio = +((killPoints / power) * 100).toFixed(1);
  const gatherToPowerRatio = +(gathered / power).toFixed(2);
  const powerDropFromPeak = Math.max(0, highestPower - power);

  // Estimate hours of speedups saved from Alliance Helps (each help saves min(1%, 3min) ~ avg 4.5 mins received per help given in active alliances)
  const estHoursSavedByHelps = Math.round((helps * 4.5) / 60);

  // 3. Automated "What You Are Doing Wrong" Diagnostics
  const diagnostics = [];
  let efficiencyScore = 82;

  // Check 1: Hollow Troop Bloat vs Academy Tech Deficit
  if (troopPct >= 68 && techPct < 18) {
    efficiencyScore -= 24;
    diagnostics.push({
      severity: 'critical',
      title: 'Critical "Hollow Troop Bloat" & Tech Deficit Detected',
      metric: `${troopPct}% Troop Power vs only ${techPct}% Tech Power`,
      problem: `Your Troop Power (${(troopPower / 1e6).toFixed(2)}M) makes up ${troopPct}% of your account while Academy Tech is only ${(techPower / 1e6).toFixed(2)}M (${techPct}%). Training large T3/T4 armies with low Academy combat tech means your marches trade negatively in every open-field clash—causing massive hospital bills (${healedTroops.toLocaleString()} healed, ${dead.toLocaleString()} dead).`,
      fix: 'STOP using Universal Speedups on troop training immediately. Route 100% of Universal Speedups into Academy Military Tech (Combat Tactics, Defensive Formation, Herbal Medicine, Combined Arms, Encampment, Medical Corps) until Tech Power exceeds 30% of your total power.',
    });
  } else if (techPct >= 28) {
    efficiencyScore += 8;
    diagnostics.push({
      severity: 'optimal',
      title: 'Strong Academy Technology Foundation',
      metric: `${techPct}% Tech Share (${(techPower / 1e6).toFixed(2)}M Tech Power)`,
      problem: 'Your account has a solid permanent technology base relative to your troop count, meaning your troops hit harder and take less hospital damage per trade.',
      fix: 'Keep pushing Academy Mathematics 10 and Military Big-3 upgrades exclusively during Kingdom Scientist Title + 15% Research Rune windows.',
    });
  } else {
    efficiencyScore -= 8;
    diagnostics.push({
      severity: 'warning',
      title: 'Moderate Troop-Heavy Power Balance',
      metric: `${troopPct}% Troops / ${techPct}% Tech / ${cmdrPct}% Commanders`,
      problem: `At ${(power / 1e6).toFixed(2)}M Power, ${troopPct}% of your power sits in vulnerable troops that can be zeroed or hospitalized, while permanent Tech Power is ${techPct}%.`,
      fix: 'Only train troops using dedicated Training Speedups. Save every single Universal Speedup for long-duration Academy Combat research.',
    });
  }

  // Check 2: VIP Level Bottleneck
  if (vipLevel < 6) {
    efficiencyScore -= 18;
    diagnostics.push({
      severity: 'critical',
      title: `VIP Level Bottleneck (Currently VIP ${vipLevel} — Target VIP 6 → VIP 10)`,
      metric: `VIP ${vipLevel} Detected`,
      problem: `Being below VIP 6 costs you the permanent 2nd Building Queue and +10% resource/training speed buffs. Being below VIP 10 costs you 1 free Legendary Commander Sculpture every single day (365 Gold Heads/year).`,
      fix: 'Spend 0 Gems on the VIP shop or wheel spins until you reach VIP 6 (for permanent 2nd builder) and then hoard Gems for the "More Than Gems" (MTG) event (7,000 Gems/day = 5 Gold Heads) to push straight to VIP 10.',
    });
  } else if (vipLevel < 10) {
    efficiencyScore -= 8;
    diagnostics.push({
      severity: 'warning',
      title: `Push VIP ${vipLevel} → VIP 10 for 1 Free Gold Head/Day`,
      metric: `VIP ${vipLevel} (Missing 365 Gold Heads/yr)`,
      problem: `At VIP ${vipLevel}, you are missing out on VIP 10's daily Legendary Commander Sculpture (worth ~2,000 Gems every single day).`,
      fix: 'Save every Gem for the monthly "More Than Gems" event (spend 7,000 or 25,000 Gems on VIP points across 2 days to earn up to 26 free Gold Sculptures while unlocking VIP 10).',
    });
  }

  // Check 3: City Hall & Civilization Alignment
  if (cityHall < 25) {
    efficiencyScore -= 10;
    diagnostics.push({
      severity: 'warning',
      title: `City Hall ${cityHall} Cap — Rush CH25 for +25% March Capacity`,
      metric: `City Hall Lv.${cityHall} | Civ: ${civilization}`,
      problem: `Every level below City Hall 25 caps your maximum troop dispatch size, Academy level, andAlliance Help reduction capacity.`,
      fix: `Do not upgrade all buildings evenly! Follow the minimum prerequisite chain (Wall → Tavern → Quarry → Hospital → Trading Post) to rush City Hall 25.${civilization !== 'China' ? ' Use your free Civilization Change item for China (+5% Building Speed) until CH25 is started.' : ' Keep China (+5% Building Speed) active until CH25 is started.'}`,
    });
  } else if (civilization === 'China' && power > 18_000_000) {
    diagnostics.push({
      severity: 'warning',
      title: 'City Hall 25 Complete — Ready to Swap Off China Civilization',
      metric: `CH25 Unlocked | Current Civ: China`,
      problem: `Once City Hall 25 and key buildings are done, China's +5% Building Speed loses most of its daily value.`,
      fix: 'Switch to Germany (+5% Troop Training Speed, +10% Action Point Recovery, +5% Cavalry Attack) for maximum Pre-KvK speedup + AP efficiency, or France (+20% Hospital Healing Speed, +3% Troop Health) before heavy KvK war.',
    });
  }

  // Check 4: Economic Gathering & Alliance Help Velocity
  if (gatherToPowerRatio < 2.5) {
    efficiencyScore -= 12;
    diagnostics.push({
      severity: 'critical',
      title: 'Severe Resource Gathering Deficit (Starving Future Tech Upgrades)',
      metric: `${(gathered / 1e6).toFixed(1)}M Gathered (${gatherToPowerRatio}x Power)`,
      problem: `You have only gathered ${(gathered / 1e6).toFixed(1)}M resources against ${(power / 1e6).toFixed(2)}M Power (${gatherToPowerRatio} RSS per Power). Late-game T4/T5 tech and healing require hundreds of millions of resources; without constant gathering, your speedups will sit idle waiting on food/wood/stone/gold.`,
      fix: 'Level 5 Peacekeeping/Gathering commanders (Joan of Arc, Constance, Sarka, Gaius Marius, Matilda) to EXACTLY Level 37 (maxing "Superior Tools" +25% gathering speed + "More the Better" +6% bonus RSS) and send all marches to gather every time you log off.',
    });
  } else {
    efficiencyScore += 5;
    diagnostics.push({
      severity: 'optimal',
      title: 'High-Velocity Resource Harvester Discipline',
      metric: `${(gathered / 1e6).toFixed(1)}M Gathered | ${helps.toLocaleString()} Alliance Helps`,
      problem: `You have gathered ${gatherToPowerRatio}x your total power in resources and contributed ${helps.toLocaleString()} Alliance Helps (~${estHoursSavedByHelps} hrs of alliance speedup value).`,
      fix: 'Keep a 50% Gathering Speed boost active 24/7 (bought with Silver Alliance Credits, never Gems!) and always gather Alliance Resource Pit nodes when full.',
    });
  }

  // Check 5: Kill Quality & Hospital Bleed
  if (killPoints > 0 && t1Kills + t2Kills > highTierKills * 2.5) {
    diagnostics.push({
      severity: 'warning',
      title: 'Low-Tier Kill Concentration (T1/T2 Heavy)',
      metric: `T4+T5 Share: ${highTierKillPct}% of Total Kills`,
      problem: `${(100 - highTierKillPct).toFixed(1)}% of your kills are Tier 1–3 units (${(t1Kills + t2Kills).toLocaleString()} T1/T2 vs ${highTierKills.toLocaleString()} T4/T5). In KvK DKP scoring, only T4 (10 KP) and T5 (20 KP) kills count toward kingdom rewards.`,
      fix: 'Focus your open-field marches into Murderballs (ball-fighting with 1 primary expertised AoE pair rather than 3 weak marches) to maximize T4/T5 kill trades while cutting your hospital bill by 60%.',
    });
  }

  // Check 6: Commander Bloat Audit (Peacekeepers/Gatherers vs. Open-Field Fighting Marches)
  if (cmdrPct >= 16) {
    efficiencyScore -= 12;
    diagnostics.push({
      severity: 'critical',
      title: `High Commander Bloat Detected (${cmdrPct}% of Total Power)`,
      metric: `${(commanderPower / 1e6).toFixed(2)}M Cmdr Power (${cmdrPct}%) | Matchmaking Power: ${(matchmakingPower / 1e6).toFixed(2)}M`,
      problem: `${cmdrPct}% of your account power (${(commanderPower / 1e6).toFixed(2)}M) sits in Commander Power while your actual fighting weight (Troops + Tech + Buildings) is ${(matchmakingPower / 1e6).toFixed(2)}M. Leveling every Peacekeeper and Gatherer past Level 37—or starring up unused Gold Key tavern commanders—bloats your visible power without adding a single point of open-field combat strength.`,
      fix: 'STOP leveling Peacekeepers and Gathering commanders past exact Level 37 (once "Superior Tools" and "More the Better" are maxed). Never put stars or XP tomes into bench commanders; funnel 100% of XP, stars, and sculptures into 1–2 primary open-field fighting pairs.',
    });
  } else if (cmdrPct >= 12.5) {
    diagnostics.push({
      severity: 'warning',
      title: `Moderate Commander Bloat (${cmdrPct}% Commander Share)`,
      metric: `${(commanderPower / 1e6).toFixed(2)}M Cmdr Power | ${(matchmakingPower / 1e6).toFixed(2)}M Matchmaking Power`,
      problem: `Your Commander Power accounts for ${cmdrPct}% of your total power (True Matchmaking Power without commanders: ${(matchmakingPower / 1e6).toFixed(2)}M). Spreading XP tomes and stars across too many secondary peacekeepers or gatherers dilutes your march strength.`,
      fix: 'Keep all 5 Gathering commanders parked at Level 37 and invest XP/sculptures strictly into the 1–2 combat pairs you actively bring to the open field.',
    });
  } else if (cmdrPct > 0) {
    efficiencyScore += 4;
    diagnostics.push({
      severity: 'optimal',
      title: `Lean Commander Bloat Profile (${cmdrPct}% Commander Share)`,
      metric: `${(commanderPower / 1e6).toFixed(2)}M Cmdr Power | ${(matchmakingPower / 1e6).toFixed(2)}M Matchmaking Power`,
      problem: `Only ${cmdrPct}% of your total power is tied up in commanders, meaning ${(100 - cmdrPct).toFixed(1)}% of your account is real fighting weight (Troops, Academy Tech, and Buildings).`,
      fix: 'Maintain this discipline: keep gatherers parked at Lv. 37 and only level/star the exact primary commanders leading your fighting marches.',
    });
  }

  // Check 7: Valheon Deep Battle Telemetry Commander Skill-Lock Verification (5-1-1-1 Law)
  if (gov.primaryCommander && typeof gov.primaryCommander === 'object' && gov.primaryCommander.skills) {
    const skillParts = String(gov.primaryCommander.skills)
      .split('-')
      .map((n) => parseInt(n, 10) || 0);
    if (skillParts.length >= 2 && skillParts[0] > 0 && skillParts[0] < 5 && skillParts.slice(1).some((s) => s > 1)) {
      efficiencyScore -= 14;
      diagnostics.push({
        severity: 'critical',
        title: `Broken Commander Skill-Lock Detected (${gov.primaryCommander.skills})`,
        metric: `Commander #${gov.primaryCommander.id} (Lv ${gov.primaryCommander.level}) Skills: ${gov.primaryCommander.skills}`,
        problem: `Valheon Deep Battle Report telemetry shows your Primary Commander (#${gov.primaryCommander.id}) has skill configuration [${gov.primaryCommander.skills}]—meaning you starred the commander up before maxing the 1st Active Skill to 5! In Rise of Kingdoms, the 1st Active Skill (Rage nuke/buff) carries ~60% of a commander's total combat value.`,
        fix: 'ALWAYS use the in-game "Skill Lock" button (top-right of the Commander Skill screen) or keep every new commander at 1-Star (Level 10) until their 1st Skill reaches 5 (5-1-1-1) before unlocking skills 2, 3, and 4!',
      });
    } else if (skillParts[0] === 5) {
      efficiencyScore += 4;
      diagnostics.push({
        severity: 'optimal',
        title: `Proper 5-x-x-x Commander Skill-Lock Verified (${gov.primaryCommander.skills})`,
        metric: `Commander #${gov.primaryCommander.id} (Lv ${gov.primaryCommander.level}) Skills: ${gov.primaryCommander.skills}`,
        problem: `Valheon Deep Battle Report telemetry confirms your Primary Commander (#${gov.primaryCommander.id}) has its 1st Active Skill maxed at Level 5 ([${gov.primaryCommander.skills}]).`,
        fix: 'Continue using Skill Lock on every Epic and Legendary commander to guarantee 5-5-1-1 or 5-5-5-1 breakpoints before investing universal sculptures.',
      });
    }
  }

  efficiencyScore = Math.max(18, Math.min(99, Math.round(efficiencyScore)));
  const efficiencyGrade =
    efficiencyScore >= 85 ? 'S' : efficiencyScore >= 72 ? 'A' : efficiencyScore >= 58 ? 'B' : efficiencyScore >= 44 ? 'C' : 'D';

  // 4. The "$2 to $5" Micro-Spender Highest-ROI Playbook
  const twoDollarPlaybook = [
    {
      rank: 1,
      price: '$0.99 – $4.99',
      bundle: 'Writer of History (Popup Bundle on Legendary Summon)',
      roiBadge: '4,000% ROI // #1 IN GAME',
      valueBreakdown: '10 Gold Commander Sculptures + 1,050 Gems ($0.50 per Gold Head vs $15+ standard)',
      whyForYou: `At ${(commanderPower / 1e6).toFixed(2)}M Commander Power, 10 universal/legendary Gold Heads for $4.99 saves ~10 days of VIP 10 progression. NEVER spend $5 anywhere else if a Writer of History popup is available.`,
    },
    {
      rank: 2,
      price: '$1.99 / $4.99',
      bundle: '30-Day Gem Supply (or $1.99 7-Day Newcomer Supply)',
      roiBadge: '4,340 GEMS PER $1',
      valueBreakdown: '2,200 Instant Gems + 650 Gems/day × 30 days = 21,700 Total Gems',
      whyForYou:
        vipLevel < 10
          ? `Your #1 bottleneck is VIP ${vipLevel} → VIP 10. 21,700 Gems spent ONLY during the "More Than Gems" event gives you 21,700 VIP Points + 15–26 Bonus Gold Heads.`
          : `Gives you 21,700 Gems/month to spin the Commander Wheel 10x (8,000 Gems for guaranteed commander unlock) + hit the 7,000 Gem tier every More Than Gems event.`,
    },
    {
      rank: 3,
      price: '$4.99',
      bundle: 'Lucerne Scrolls (Season Battle Pass — Level 50)',
      roiBadge: '2,800% ROI',
      valueBreakdown: '15 Gold Sculptures + Epic/Legendary Equipment Blueprint + 60+ Hours of Speedups',
      whyForYou: 'Only purchase AFTER you reach Level 50+ on the free track so all 15 Gold Sculptures and equipment chests unlock instantaneously.',
    },
    {
      rank: 4,
      price: '$0.99',
      bundle: 'Daily Special Offer — Tier 1 Chest Only ($0.99)',
      roiBadge: 'BEST $1 MICRO-BUY',
      valueBreakdown: '200 VIP Points + 1–4 Commander Sculptures + 50 AP Bottle + Speedups',
      whyForYou: 'If you only have $1–$2, the $0.99 Tier-1 Daily Chest gives better sculptures-per-dollar than the $1.99 or $2.99 tiers.',
    },
  ];

  // 5. Speedup & Buff-Stacking Efficiency Calculator
  // Calculate how much time they save on a 30-day (720h) upgrade by stacking buffs properly
  const baseResearchBonus = Math.min(95, Math.round(25 + (techPower / 1500000) * 8)); // Academy lvl + Alliance tech estimate
  const unbuffedMult = 1 + baseResearchBonus / 100;
  const fullStackBonus = baseResearchBonus + 15 /* Rune */ + 10 /* Scientist Title */ + 5 /* VIP/Kingdom Buff */ + 3 /* Civ/Holy Site */;
  const stackedMult = 1 + fullStackBonus / 100;

  const rawDays = 30; // Example 30-day tech
  const unbuffedDays = +(rawDays / unbuffedMult).toFixed(2);
  const stackedBeforeHelpsDays = +(rawDays / stackedMult).toFixed(2);
  // 30 Alliance helps reduce current timer by 1% each (~26% compound reduction: 0.99^30 = 0.7397)
  const finalDaysAfter30Helps = +(stackedBeforeHelpsDays * Math.pow(0.99, 30)).toFixed(2);
  const daysSavedVsImpatient = +(unbuffedDays - finalDaysAfter30Helps).toFixed(2);
  const hoursSavedPer30DayTech = Math.round(daysSavedVsImpatient * 24);

  const speedupPlaybook = {
    currentEstBonusPct: baseResearchBonus,
    fullStackBonusPct: fullStackBonus,
    exampleRawDays: rawDays,
    unbuffedDays,
    finalDaysAfter30Helps,
    daysSavedVsImpatient,
    hoursSavedPer30DayTech,
    steps: [
      {
        step: '01 // THE SNAPSHOT RULE (BEFORE YOU CLICK START)',
        detail:
          'Rise of Kingdoms permanently locks in your Research/Building/Training speed at the EXACT second you tap "Start"—NOT when you use speedups! Starting an upgrade without a Rune + Title wastes ~22% of your speedups forever.',
      },
      {
        step: '02 // STACK ALL 4 FREE BUFFS BEFORE STARTING',
        detail:
          '1) Walk a march onto a +15% Wisdom/Builder/Training Rune at Lost Temple. 2) Request "Scientist" (+10% Research) or "Architect" (+10% Building) Title in Kingdom Chat. 3) Wait for Kingdom Buff (+10%). 4) Ensure you are inside Alliance Territory.',
      },
      {
        step: '03 // WAIT FOR ALL 30 ALLIANCE HELPS BEFORE POPPING 1 SPEEDUP',
        detail: `Each of your 30 Alliance Helps cuts 1% off the remaining timer (0.99^30 = 26.03% FREE reduction!). If you use speedups BEFORE 30/30 helps finish, you shrink the base timer and throw away up to ${Math.round(stackedBeforeHelpsDays * 0.26 * 24)} hours of free help time.`,
      },
      {
        step: '04 // UNIVERSAL SPEEDUP ALLOCATION LAW (100% TECH / 0% TROOPS)',
        detail:
          'Never spend Universal Speedups on Building (after CH25), Healing (heal in small 2,000-troop batches of 1h 15m so 30 Alliance Helps heal your entire hospital for 0 speedups!), or Troop Training outside a guaranteed top-10 Zenith/Event reward overlap.',
      },
    ],
  };

  return {
    efficiencyScore,
    efficiencyGrade,
    overallScore: efficiencyScore,
    grade: efficiencyGrade,
    ratios: {
      troopPct,
      techPct,
      buildPct,
      cmdrPct,
      highTierKillPct,
      kpToPowerRatio,
      gatherToPowerRatio,
      powerDropFromPeak,
      estHoursSavedByHelps,
    },
    metrics: {
      hasExactPowerSplit: troopPower + techPower + buildingPower + commanderPower > 0,
      troopsPower: troopPower,
      techPower,
      buildingPower,
      commanderPower,
      matchmakingPower,
      troopRatio: troopPct / 100,
      techRatio: techPct / 100,
      bldgRatio: buildPct / 100,
      cmdrRatio: cmdrPct / 100,
      cityHallLevel: cityHall,
      vipLevel,
      civilization,
    },
    diagnostics,
    twoDollarPlaybook,
    speedupPlaybook,
  };
}
