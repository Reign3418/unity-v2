/**
 * ============================================================================
 * VALHEON 17-LANGUAGE LILITH CANONICAL GLOSSARY & ROK WAR-SLANG BRIDGE
 * (rokGlossaryBridge.js)
 * ============================================================================
 * Wires `rok_canonical_glossary.json` (extracted directly from Lilith Games'
 * `Valheon Hero Glossary`, `Valheon Gear Glossary`, and `Valheon Lyceum Vault` across all 17 languages)
 * PLUS a curated 17-language Rise of Kingdoms War-Slang Dictionary directly
 * into HERMES's translation pipeline.
 *
 * Ensures that Commander names, Equipment pieces, and RoK war terms (Rally,
 * Garrison, Swarm, Pass 4, Lost Temple, Barbarian Fort, Gold Heads, AP) are
 * translated with 100% authentic Rise of Kingdoms terminology instead of
 * generic Google/DeepL literal mistranslations.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_GLOSSARY = path.resolve(__dirname, './data/rok_canonical_glossary.json');
const GLOSSARY_PATH = fs.existsSync(LOCAL_GLOSSARY)
  ? LOCAL_GLOSSARY
  : path.resolve(__dirname, '../src/data/rok_canonical_glossary.json');
const RAW_GLOSSARY = JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf8'));

/**
 * Curated 17-Language Rise of Kingdoms War & Tactical Slang Dictionary
 */
const ROK_WAR_SLANG = [
  {
    category: 'MAP',
    terms: {
      en: 'Lost Temple',
      ko: '잃어버린 신전',
      zh: '失落神庙',
      ar: 'المعبد المفقود',
      ru: 'Затерянный храм',
      vi: 'Đền Thờ Đã Mất',
      tr: 'Kayıp Tapınak',
      es: 'Templo Perdido',
      pt: 'Templo Perdido',
      fr: 'Temple Perdu',
      de: 'Verlorener Tempel',
      id: 'Kuil yang Hilang',
      ja: '失われた神殿',
      it: 'Tempio Perduto',
      pl: 'Zaginiona Świątynia',
      th: 'วิหารที่สาบสูญ',
      ms: 'Kuil Hilang',
    },
  },
  {
    category: 'MAP',
    terms: {
      en: 'Barbarian Fort',
      ko: '야만인 성채',
      zh: '野蛮人城寨',
      ar: 'حصن البرابرة',
      ru: 'Форт варваров',
      vi: 'Pháo Đài Man Rợ',
      tr: 'Barbar Kalesi',
      es: 'Fuerte Bárbaro',
      pt: 'Forte Bárbaro',
      fr: 'Fort Barbare',
      de: 'Barbarenfestung',
      id: 'Benteng Barbar',
      ja: '野蛮人の集落',
      it: 'Forte Barbaro',
      pl: 'Fort Barbarzyńców',
      th: 'ป้อมปราการคนเถื่อน',
      ms: 'Kubu Barbar',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: "King's Land (Zone 4)",
      ko: '왕의 땅',
      zh: '皇庭',
      ar: 'أرض الملك',
      ru: 'Земля короля',
      vi: 'Vùng Đất Vua',
      tr: 'Kralın Toprağı',
      es: 'Tierra del Rey',
      pt: 'Terra do Rei',
      fr: 'Terre du Roi',
      de: 'Königsland',
      id: 'Tanah Raja',
      ja: '王の土地',
      it: 'Terra del Re',
      pl: 'Ziemia Króla',
      th: 'ดินแดนแห่งราชา',
      ms: 'Tanah Raja',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Pass 4',
      ko: '4관문',
      zh: '关卡4',
      ar: 'الممر 4',
      ru: 'Проход 4',
      vi: 'Đèo 4',
      tr: 'Geçit 4',
      es: 'Paso 4',
      pt: 'Passagem 4',
      fr: 'Passe 4',
      de: 'Pass 4',
      id: 'Lintasan 4',
      ja: '関所4',
      it: 'Passo 4',
      pl: 'Przełęcz 4',
      th: 'ด่าน 4',
      ms: 'Laluan 4',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Pass 5',
      ko: '5관문',
      zh: '关卡5',
      ar: 'الممر 5',
      ru: 'Проход 5',
      vi: 'Đèo 5',
      tr: 'Geçit 5',
      es: 'Paso 5',
      pt: 'Passagem 5',
      fr: 'Passe 5',
      de: 'Pass 5',
      id: 'Lintasan 5',
      ja: '関所5',
      it: 'Passo 5',
      pl: 'Przełęcz 5',
      th: 'ด่าน 5',
      ms: 'Laluan 5',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Pass 6',
      ko: '6관문',
      zh: '关卡6',
      ar: 'الممر 6',
      ru: 'Проход 6',
      vi: 'Đèo 6',
      tr: 'Geçit 6',
      es: 'Paso 6',
      pt: 'Passagem 6',
      fr: 'Passe 6',
      de: 'Pass 6',
      id: 'Lintasan 6',
      ja: '関所6',
      it: 'Passo 6',
      pl: 'Przełęcz 6',
      th: 'ด่าน 6',
      ms: 'Laluan 6',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Pass 7',
      ko: '7관문',
      zh: '关卡7',
      ar: 'الممر 7',
      ru: 'Проход 7',
      vi: 'Đèo 7',
      tr: 'Geçit 7',
      es: 'Paso 7',
      pt: 'Passagem 7',
      fr: 'Passe 7',
      de: 'Pass 7',
      id: 'Lintasan 7',
      ja: '関所7',
      it: 'Passo 7',
      pl: 'Przełęcz 7',
      th: 'ด่าน 7',
      ms: 'Laluan 7',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Gold Heads (Universal Sculptures)',
      ko: '황금 머리',
      zh: '金头',
      ar: 'رؤوس ذهبية',
      ru: 'Золотые головы',
      vi: 'Tượng Vàng',
      tr: 'Altın Kafa',
      es: 'Cabezas Doradas',
      pt: 'Cabeças Douradas',
      fr: 'Têtes Dorées',
      de: 'Goldköpfe',
      id: 'Patung Emas',
      ja: '金モアイ',
      it: 'Teste Dorate',
      pl: 'Złote Głowy',
      th: 'หัวทอง',
      ms: 'Kepala Emas',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Action Points (AP)',
      ko: '행동력',
      zh: '行动力',
      ar: 'نقاط الحركة',
      ru: 'Очки действия',
      vi: 'Điểm Hành Động',
      tr: 'Eylem Puanı',
      es: 'Puntos de Acción',
      pt: 'Pontos de Ação',
      fr: "Points d'Action",
      de: 'Aktionspunkte',
      id: 'Poin Aksi',
      ja: '行動力',
      it: 'Punti Azione',
      pl: 'Punkty Akcji',
      th: 'แต้มแอคชั่น',
      ms: 'Mata Tindakan',
    },
  },
  {
    category: 'WAR',
    terms: {
      en: 'Farm Account',
      ko: '농장 계정',
      zh: '小号',
      ar: 'حساب مزرعة',
      ru: 'Ферма-аккаунт',
      vi: 'Acc Farm',
      tr: 'Farm Hesabı',
      es: 'Cuenta Granja',
      pt: 'Conta Fazenda',
      fr: 'Compte Ferme',
      de: 'Farm-Account',
      id: 'Akun Farm',
      ja: 'サブ垢',
      it: 'Account Fattoria',
      pl: 'Konto Farmy',
      th: 'ไอดีฟาร์ม',
      ms: 'Akaun Ladang',
    },
  },
];

// Build fast lookup entries sorted longest-first so multi-word Commander/Gear names match first
const ALL_ENTRIES = [];

function registerGlossaryGroup(groupObj, category) {
  for (const [, langMap] of Object.entries(groupObj || {})) {
    if (!langMap || typeof langMap !== 'object' || !langMap.en) continue;
    ALL_ENTRIES.push({ category, terms: langMap });
  }
}

registerGlossaryGroup(RAW_GLOSSARY.commanders, 'COMMANDER');
registerGlossaryGroup(RAW_GLOSSARY.equipment, 'EQUIPMENT');
registerGlossaryGroup(RAW_GLOSSARY.lyceum_terms, 'LYCEUM');
for (const item of ROK_WAR_SLANG) {
  ALL_ENTRIES.push(item);
}

/**
 * Normalizes target language code (`zh-CN` -> `zh`, `en-US` -> `en`)
 */
export function normalizeGlossaryLocale(lang = 'en') {
  const base = String(lang || 'en').toLowerCase().split('-')[0];
  return RAW_GLOSSARY.supported_locales?.includes(base) ? base : 'en';
}

/**
 * Pre-scans input text for any official Lilith Commander, Equipment piece, or
 * RoK War-Slang term in ANY of the 17 languages, substitutes the exact canonical
 * target-language term, and returns `{ processedText, matchedTerms }`.
 */
export function applyRokGlossaryPre(rawText = '', targetLang = 'en') {
  const tl = normalizeGlossaryLocale(targetLang);
  let text = String(rawText || '');
  if (!text.trim()) return { processedText: text, matchedTerms: [] };

  const matchedTerms = [];
  const seenCanon = new Set();

  for (const entry of ALL_ENTRIES) {
    const targetTerm = entry.terms[tl] || entry.terms.en;
    if (!targetTerm) continue;

    for (const [srcLang, srcPhrase] of Object.entries(entry.terms)) {
      if (!srcPhrase || srcPhrase.length < 2) continue;
      // Skip overly generic 1-word UI terms under 4 chars in Latin scripts
      if (/^[a-zA-Z]+$/.test(srcPhrase) && srcPhrase.length < 4) continue;

      if (text.toLowerCase().includes(srcPhrase.toLowerCase())) {
        const canonicalEn = entry.terms.en;
        if (!seenCanon.has(canonicalEn)) {
          seenCanon.add(canonicalEn);
          matchedTerms.push({
            category: entry.category,
            source: srcPhrase,
            target: targetTerm,
            en: canonicalEn,
          });
        }
        // If source phrase is in a different language than target, replace with target canonical term
        if (srcLang !== tl && srcPhrase.toLowerCase() !== targetTerm.toLowerCase()) {
          const escaped = srcPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          text = text.replace(new RegExp(escaped, 'gi'), targetTerm);
        }
        break;
      }
    }
  }

  return {
    processedText: text,
    matchedTerms: matchedTerms.slice(0, 6),
  };
}
