import glossary from '@/data/rok_canonical_glossary.json';

const COMMANDERS = glossary?.commanders || {};
const EQUIPMENT = glossary?.equipment || {};
const LYCEUM = glossary?.lyceum_terms || {};
const UI_TERMS = glossary?.ui_terms || {};

function normalizeLocale(locale = 'en') {
  return String(locale || 'en').toLowerCase().split('-')[0];
}

/**
 * Translates an official or colloquial Rise of Kingdoms Commander name (or slash-separated pair)
 * into Lilith's exact in-game localized string from `lc_hero.dat`.
 */
export function localizeCommanderName(rawName, locale = 'en') {
  if (!rawName) return '';
  const loc = normalizeLocale(locale);
  if (loc === 'en') return rawName;

  if (rawName.includes('/')) {
    return rawName
      .split('/')
      .map((part) => localizeCommanderName(part.trim(), loc))
      .join(' / ');
  }

  const key = rawName.trim().toLowerCase();
  const entry = COMMANDERS[key];
  if (entry && entry[loc]) {
    return entry[loc];
  }
  return rawName;
}

/**
 * Translates an Equipment piece name (including parenthetical annotations like "(Refined)")
 * into Lilith's exact in-game localized string from `lc_equipment.dat`.
 */
export function localizeEquipmentName(rawName, locale = 'en') {
  if (!rawName) return '';
  const loc = normalizeLocale(locale);
  if (loc === 'en') return rawName;

  if (rawName.includes(' / ')) {
    const fullKey = rawName.trim().toLowerCase();
    if (EQUIPMENT[fullKey] && EQUIPMENT[fullKey][loc]) {
      return EQUIPMENT[fullKey][loc];
    }
    return rawName
      .split(' / ')
      .map((part) => localizeEquipmentName(part.trim(), loc))
      .join(' / ');
  }

  const parenMatch = rawName.match(/^([^(]+?)(\s*\([^)]+\))$/);
  const baseName = parenMatch ? parenMatch[1].trim() : rawName.trim();
  const suffix = parenMatch ? parenMatch[2] : '';

  const entry = EQUIPMENT[baseName.toLowerCase()];
  if (entry && entry[loc]) {
    return `${entry[loc]}${suffix}`;
  }
  return rawName;
}

/**
 * Returns Lilith's official Lyceum of Wisdom / Peerless Scholar UI term (`lc_quiz.dat`)
 */
export function localizeLyceumTerm(termKey, locale = 'en') {
  const loc = normalizeLocale(locale);
  const entry = LYCEUM[termKey];
  if (!entry) return termKey;
  return entry[loc] || entry.en || termKey;
}

/**
 * Returns Lilith's official Hero/Rarity UI term (`lc_hero.dat`)
 */
export function localizeRokUiTerm(termKey, locale = 'en') {
  const loc = normalizeLocale(locale);
  const entry = UI_TERMS[termKey];
  if (!entry) return termKey;
  return entry[loc] || entry.en || termKey;
}

export function getCanonicalCivPedia(locale = 'en') {
  const loc = normalizeLocale(locale);
  return (glossary?.civpedia_entries || []).map((item) => ({
    id: item.id,
    title: item.title?.[loc] || item.title?.en || '',
    question: item.question?.[loc] || item.question?.en || '',
    questionEn: item.question?.en || '',
    summary: item.summary?.[loc] || item.summary?.en || '',
  }));
}
