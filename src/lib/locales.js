/**
 * Canonical Multi-Language Registry & Rise of Kingdoms (`lc_*.dat`) Locale Bridge
 * ───────────────────────────────────────────────────────────────────────────────
 * Single source of truth for:
 *  1. Next.js / next-intl routing & middleware (`src/i18n.js`, `src/proxy.js`)
 *  2. Language Switchers (`Navbar.js`, `src/app/[locale]/page.js`, `ValheonOmniBar.js`)
 *  3. Bidirectional mapping between ISO-639-1 codes (`zh`, `ko`, `id`, `ja`)
 *     and Lilith Games internal `.bin` table codes (`cn`, `kr`, `in`, `jp`).
 */

export const SUPPORTED_LOCALES = [
  'en',
  'vi',
  'ar',
  'ru',
  'zh',
  'es',
  'id',
  'ko',
  'tr',
  'fr',
  'de',
  'pt',
  'ja',
  'it',
  'pl',
  'th',
  'ms',
];

export const DEFAULT_LOCALE = 'en';

/**
 * Maps Unity ISO-639-1 locale code -> Lilith `lc_*.dat` `.bin` suffix
 */
export const UNITY_TO_LILITH_LOCALE = {
  en: 'en',
  vi: 'vi',
  ar: 'ar',
  ru: 'ru',
  zh: 'cn',
  es: 'es',
  id: 'in',
  ko: 'kr',
  tr: 'tr',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  ja: 'jp',
  it: 'it',
  pl: 'pl',
  th: 'th',
  ms: 'ms',
};

/**
 * Maps Lilith `lc_*.dat` `.bin` suffix -> Unity ISO-639-1 locale code
 */
export const LILITH_TO_UNITY_LOCALE = {
  en: 'en',
  vi: 'vi',
  ar: 'ar',
  ru: 'ru',
  cn: 'zh',
  zh: 'zh',
  es: 'es',
  in: 'id',
  id: 'id',
  kr: 'ko',
  ko: 'ko',
  tr: 'tr',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  jp: 'ja',
  ja: 'ja',
  it: 'it',
  pl: 'pl',
  th: 'th',
  ms: 'ms',
};

export const LOCALE_METADATA = [
  { code: 'en', lilithCode: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'zh', lilithCode: 'cn', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', lilithCode: 'jp', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', lilithCode: 'kr', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'vi', lilithCode: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  { code: 'th', lilithCode: 'th', label: 'Thai', nativeLabel: 'ภาษาไทย', flag: '🇹🇭', dir: 'ltr' },
  { code: 'id', lilithCode: 'in', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ms', lilithCode: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr' },
  { code: 'es', lilithCode: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', lilithCode: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', lilithCode: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'it', lilithCode: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'pt', lilithCode: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'pl', lilithCode: 'pl', label: 'Polish', nativeLabel: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  { code: 'ru', lilithCode: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'tr', lilithCode: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'ar', lilithCode: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

export function toLilithLocale(unityLocale = 'en') {
  const norm = String(unityLocale || 'en').toLowerCase().split('-')[0];
  return UNITY_TO_LILITH_LOCALE[norm] || 'en';
}

export function toUnityLocale(lilithLocale = 'en') {
  const norm = String(lilithLocale || 'en').toLowerCase().split('-')[0];
  return LILITH_TO_UNITY_LOCALE[norm] || 'en';
}

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(String(locale || '').toLowerCase());
}
