/**
 * ============================================================================
 * VALHEON SOVEREIGN KVK STORY ATLAS, ALLIANCE LOG OPCODES & ACTIVITY ENGINE
 * ============================================================================
 * Complete Season of Conquest KvK Story Map & Camp Coordinate Atlas (S4 - S21),
 * In-Game Alliance Log Opcode Decoder (101 - 308), Officer Post Enum (1 - 12),
 * Sub-Tile Coordinate Converter, and Alliance Activity Score Formula.
 * ============================================================================
 */

export const KVK_STORY_MAP_ATLAS = {
  S4: {
    code: 'S4',
    stories: ['Heroic Anthem'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S4.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 998 },
    map: { x: 80, y: 8, w: 1440, h: 990 },
    camps: {
      fire: { name: 'Fire', x: 336, y: 46, pin: [296, 231], color: '#d13820' },
      earth: { name: 'Earth', x: 758, y: 46, pin: [1187, 116], color: '#d1a42b' },
      wind: { name: 'Wind', x: 801, y: 440, pin: [1228, 804], color: '#b5b0d1' },
      water: { name: 'Water', x: 336, y: 440, pin: [310, 845], color: '#38b4d1' },
    },
  },
  S9_2: {
    code: 'S9_2',
    stories: ['King Of The Nile'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S9_2.webp',
    boxScale: 1.2,
    stage: { w: 1600, h: 998 },
    map: { x: 80, y: 8, w: 1440, h: 990 },
    camps: {
      i: { name: 'Camp I', x: 230, y: 130, pin: [269, 96], color: '#d1351c' },
      ii: { name: 'Camp II', x: 604, y: 96, pin: [897, 62], color: '#2facd1' },
      iii: { name: 'Camp III', x: 983, y: 71, pin: [1194, 55], color: '#d1351c' },
      iv: { name: 'Camp IV', x: 1047, y: 435, pin: [1295, 825], color: '#2facd1' },
      v: { name: 'Camp V', x: 673, y: 460, pin: [1052, 838], color: '#d1351c' },
      vi: { name: 'Camp VI', x: 195, y: 494, pin: [296, 879], color: '#2facd1' },
    },
  },
  S10: {
    code: 'S10',
    stories: ['Siege Of Orleans'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S10.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 998 },
    map: { x: 80, y: 8, w: 1440, h: 990 },
    camps: {
      brittany: { name: 'Brittany', x: 230, y: 26, pin: [627, 92], color: '#b5d1ad' },
      picardy: { name: 'Picardy', x: 720, y: 35, pin: [1117, 107], color: '#c162d1' },
      bourbon: { name: 'Bourbon', x: 1137, y: 134, pin: [1138, 305], color: '#60d13c' },
      auvergne: { name: 'Auvergne', x: 1037, y: 560, pin: [1002, 701], color: '#d1a719' },
      'la marche': { name: 'La Marche', x: 461, y: 570, pin: [454, 830], color: '#2facd1' },
      poitou: { name: 'Poitou', x: 29, y: 420, pin: [404, 503], color: '#d1351c' },
    },
  },
  S11: {
    code: 'S11',
    stories: ['6-Camp Classic SoC'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S11.webp',
    boxScale: 1.0,
    stage: { w: 1600, h: 990 },
    map: { x: 80, y: 8, w: 1440, h: 982 },
    camps: {
      fire: { name: 'Fire', x: 354, y: 128, pin: [316, 136], color: '#d1351c' },
      earth: { name: 'Earth', x: 668, y: 138, pin: [865, 101], color: '#d19630' },
      wind: { name: 'Wind', x: 982, y: 150, pin: [1214, 111], color: '#b5d1ad' },
      water: { name: 'Water', x: 968, y: 456, pin: [1283, 779], color: '#2facd1' },
      greenwood: { name: 'Greenwood', x: 654, y: 444, pin: [777, 774], color: '#60d13c' },
      daybreak: { name: 'Daybreak', x: 315, y: 434, pin: [296, 754], color: '#d1a719' },
    },
  },
  S11_2: {
    code: 'S11_2',
    stories: ['Warriors Unbound'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S11_2.webp',
    boxScale: 1.0,
    stage: { w: 1600, h: 990 },
    map: { x: 80, y: 8, w: 1440, h: 982 },
    camps: {
      fire: { name: 'Fire', x: 336, y: 121, pin: [370, 96], color: '#d1351c' },
      earth: { name: 'Earth', x: 650, y: 121, pin: [743, 96], color: '#d19b29' },
      wind: { name: 'Wind', x: 964, y: 141, pin: [1214, 106], color: '#b5d1ad' },
      water: { name: 'Water', x: 956, y: 447, pin: [1273, 769], color: '#31a5d1' },
      greenwood: { name: 'Greenwood', x: 635, y: 427, pin: [723, 754], color: '#66d136' },
      daybreak: { name: 'Daybreak', x: 286, y: 427, pin: [252, 617], color: '#d1a91c' },
    },
  },
  S12: {
    code: 'S12',
    stories: ['Storm Of Stratagems'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S12.webp',
    boxScale: 1.0,
    stage: { w: 1600, h: 990 },
    map: { x: 80, y: 8, w: 1440, h: 982 },
    camps: {
      fire: { name: 'Fire', x: 307, y: 141, pin: [375, 106], color: '#d12e17' },
      earth: { name: 'Earth', x: 621, y: 122, pin: [856, 101], color: '#d19026' },
      wind: { name: 'Wind', x: 935, y: 122, pin: [1273, 199], color: '#afaad1' },
      water: { name: 'Water', x: 984, y: 446, pin: [1307, 764], color: '#29a7d1' },
      greenwood: { name: 'Greenwood', x: 596, y: 475, pin: [566, 784], color: '#3ad115' },
      daybreak: { name: 'Daybreak', x: 282, y: 447, pin: [355, 774], color: '#d1a714' },
    },
  },
  S14: {
    code: 'S14',
    stories: ['Tides Of War'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S14.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 988 },
    map: { x: 80, y: 8, w: 1440, h: 980 },
    camps: {
      fire: { name: 'Fire', x: 394, y: 37, pin: [358, 129], color: '#d1351c' },
      earth: { name: 'Earth', x: 815, y: 37, pin: [1242, 210], color: '#d19630' },
      wind: { name: 'Wind', x: 830, y: 431, pin: [1257, 629], color: '#b3aed1' },
      water: { name: 'Water', x: 336, y: 431, pin: [302, 816], color: '#2facd1' },
    },
  },
  S15: {
    code: 'S15',
    stories: ['Alliance Invictus'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S15.webp',
    boxScale: 1.1,
    stage: { w: 1600, h: 999 },
    map: { x: 80, y: 8, w: 1440, h: 991 },
    camps: {
      fire: { name: 'Fire', x: 474, y: 0, pin: [432, 76], color: '#d1351c' },
      earth: { name: 'Earth', x: 818, y: 0, pin: [1204, 76], color: '#d19630' },
      wind: { name: 'Wind', x: 928, y: 334, pin: [1292, 428], color: '#b3aed1' },
      water: { name: 'Water', x: 870, y: 669, pin: [1238, 766], color: '#2facd1' },
      greenwood: { name: 'Greenwood', x: 370, y: 669, pin: [331, 760], color: '#5bd13c' },
      daybreak: { name: 'Daybreak', x: 312, y: 334, pin: [378, 299], color: '#d1a71b' },
    },
  },
  S16: {
    code: 'S16',
    stories: ['Keener Blades'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S16.webp',
    boxScale: 1.1,
    stage: { w: 1600, h: 1000 },
    map: { x: 80, y: 8, w: 1440, h: 992 },
    camps: {
      fire: { name: 'Fire', x: 370, y: 33, pin: [333, 80], color: '#d1351c' },
      earth: { name: 'Earth', x: 813, y: 0, pin: [1180, 80], color: '#d19929' },
      wind: { name: 'Wind', x: 928, y: 334, pin: [1298, 405], color: '#9e94d1' },
      water: { name: 'Water', x: 871, y: 669, pin: [1243, 829], color: '#2fa5d1' },
      greenwood: { name: 'Greenwood', x: 527, y: 476, pin: [513, 829], color: '#68d136' },
      daybreak: { name: 'Daybreak', x: 183, y: 368, pin: [287, 333], color: '#d1a91c' },
    },
  },
  S18: {
    code: 'S18',
    stories: ['4-Camp Conquest'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S18.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 999 },
    map: { x: 80, y: 8, w: 1440, h: 991 },
    camps: {
      fire: { name: 'Fire', x: 365, y: 37, pin: [331, 184], color: '#d1351c' },
      earth: { name: 'Earth', x: 815, y: 47, pin: [1245, 198], color: '#d19630' },
      wind: { name: 'Wind', x: 844, y: 441, pin: [1245, 855], color: '#b3aed1' },
      water: { name: 'Water', x: 336, y: 431, pin: [310, 834], color: '#2facd1' },
    },
  },
  S19: {
    code: 'S19',
    stories: ['King Of All Britain', 'King Of All Britain Pioneer'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S19.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 1003 },
    map: { x: 80, y: 8, w: 1440, h: 995 },
    camps: {
      northumbria: { name: 'Northumbria', x: 429, y: 0, pin: [859, 76], color: '#ca7dd1' },
      'east anglia': { name: 'East Anglia', x: 959, y: 315, pin: [1089, 279], color: '#15b1f2' },
      wessex: { name: 'Wessex', x: 555, y: 452, pin: [520, 807], color: '#d2a000' },
      mercia: { name: 'Mercia', x: 151, y: 394, pin: [324, 360], color: '#d13b24' },
    },
  },
  S20: {
    code: 'S20',
    stories: ['Song of Troy'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S20.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 967 },
    map: { x: 80, y: 8, w: 1440, h: 959 },
    camps: {
      aeolia: { name: 'Aeolia', x: 374, y: 158, pin: [346, 138], color: '#0096de' },
      dardania: { name: 'Dardania', x: 778, y: 47, pin: [1203, 214], color: '#d11111' },
      lycia: { name: 'Lycia', x: 916, y: 441, pin: [1288, 855], color: '#edcc00' },
      mycenae: { name: 'Mycenae', x: 365, y: 552, pin: [331, 770], color: '#d38300' },
    },
  },
  S21: {
    code: 'S21',
    stories: ['Mighty Assembly'],
    image: 'https://dsj4y3t4ost7v.cloudfront.net/Maps/kvk-minimaps/S21.webp',
    boxScale: 1.3,
    stage: { w: 1600, h: 990 },
    map: { x: 80, y: 8, w: 1440, h: 982 },
    camps: {
      benguela: { name: 'Benguela', x: 72, y: 279, pin: [469, 430], color: '#d12406' },
      ceylon: { name: 'Ceylon', x: 605, y: 4, pin: [1002, 155], color: '#d19019' },
      clarencia: { name: 'Clarencia', x: 1137, y: 279, pin: [1117, 312], color: '#aea9d1' },
      zarate: { name: 'Zarate', x: 605, y: 603, pin: [570, 774], color: '#036dd1' },
    },
  },
};

export const ALLIANCE_LOG_OPCODES = {
  101: '{p1} raised {p2} to Rank {p3}.',
  102: '{p1} transferred alliance leadership to {p2}.',
  103: 'Alliance gift level raised to {p1}.',
  104: '{p1} used an alliance skill.',
  105: '{p1} built an Alliance Flag {locP2}.',
  106: '{p1} dismantled an Alliance Flag {locP2}.',
  107: '{p1} built a Center Fortress {locP2}.',
  108: '{p1} dismantled a Center Fortress {locP2}.',
  109: '{p1} built an Alliance Fortress {locP2}.',
  110: '{p1} dismantled an Alliance Fortress {locP2}.',
  111: '{p1} appointed {p2} to {post}.',
  112: '{p1} formed a union with {p2}.',
  113: '{p1} dissolved the union with {p2}.',
  114: '{p1} dissolved their union with our coalition {p2}.',
  115: '{p1} repaired an Alliance Flag {locP2}.',
  116: '{p1} repaired an Alliance Fortress {locP2}.',
  117: '{p1} repaired a Center Fortress {locP2}.',
  118: '{p1} upgraded an Alliance Flag {locP2} into an Alliance Outpost.',
  119: '{p1} downgraded an Alliance Outpost {locP2} into an Alliance Flag.',
  120: '{p1} activated a shield for an Alliance Flag {locP2}.',
  121: '{p1} disabled a shield for an Alliance Flag {locP2}.',
  122: 'You formed a union with the {p1} Pact.',
  123: 'Your union with the {p1} Pact was dissolved.',
  124: '{p1} built a Horse Fort {locP2}.',
  125: '{p1} dismantled a Horse Fort {locP2}.',
  126: '{p1} repaired a Horse Fort {locP2}.',
  127: "{p1} edited {p2}'s member note.",
  201: "{p1} joined the alliance at {p2}'s request.",
  202: '{p1} removed {p2} from the alliance.',
  203: "{p1} accepted {p2}'s request to join the alliance.",
  204: '{p1} left the alliance.',
  205: "{p1} changed {p2}'s rank from {p3} to {p4}.",
  206: '{p1} joined the alliance.',
  207: '{p1} entered the battlefield.',
  208: '{p1} left the battlefield.',
  301: '{p2} attacked our Alliance Flag {locP1}.',
  302: '{p2} attacked our Center Fortress {locP1}.',
  303: '{p2} attacked our Alliance Fortress {locP1}.',
  304: 'We started attacking a stronghold {locP2}.',
  305: 'We occupied a stronghold {locP2} (final blow: {p3}).',
  306: '{p3} attacked our stronghold {locP2}.',
  307: 'Our stronghold {locP2} has been lost (final blow: {p3}).',
  308: '{p2} attacked our Horse Fort {locP1}.',
};

export const ALLIANCE_OFFICER_POSTS = {
  1: 'Counselor',
  2: 'Warlord',
  3: 'Envoy',
  4: 'Saint',
  5: 'Ironclad General',
  6: 'Watchful General',
  7: 'Ranger General',
  8: 'Heroic General',
  9: 'Expedition General',
  10: 'Flame General',
  11: 'Thunderous General',
  12: 'Vanguard General',
};

/**
 * Converts Lilith sub-tile coordinate triples ("mapId,subX,subY") into Kingdom Map (X, Y)
 */
export function convertSubTileToMapCoords(rawLocStr) {
  const parts = String(rawLocStr || '').split(',');
  if (parts.length < 3) return String(rawLocStr || '').trim();
  const rx = Number(parts[1]);
  const ry = Number(parts[2]);
  if (Number.isNaN(rx) || Number.isNaN(ry)) return String(rawLocStr || '').trim();
  return `(X:${Math.floor(rx / 6 + 0.5)} Y:${Math.floor(ry / 6 + 0.5)})`;
}

/**
 * Computes the canonical Alliance Activity Score:
 *   Score = (fortDestroyed * 10) + (helpTimes * 1) + (techDonation / 1000) + (buildPoints / 1000) + (rssDonation / 100000)
 */
export function calculateAllianceActivityScore({
  techPoints = 0,
  helpCount = 0,
  buildPoints = 0,
  fortDestroy = 0,
  rssDonate = 0,
  armory = 0,
} = {}) {
  const rawScore =
    Number(fortDestroy || 0) * 10 +
    Number(helpCount || 0) * 1 +
    Number(techPoints || 0) / 1000 +
    Number(buildPoints || 0) / 1000 +
    Number(rssDonate || 0) / 100000 +
    Number(armory || 0) / 1000;
  return {
    rawScore,
    roundedScore: Math.round(rawScore),
  };
}
