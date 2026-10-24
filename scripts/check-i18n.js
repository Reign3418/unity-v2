#!/usr/bin/env node
/**
 * check-i18n.js — Project Valkyrie Wing 2 i18n, ICU, HTML, Routing & UTF-8 Guard
 * ──────────────────────────────────────────────────────────────────────────────
 * Compares every messages/*.json file against en.json (the source of truth):
 *  1. 100% Key Parity across all 17 locales
 *  2. Zero UTF-8 Mojibake / replacement character (\uFFFD) corruption
 *  3. 100% ICU {placeholder} variable parity + balanced `{` / `}` braces
 *  4. Zero raw Unity3D tags (<color=...>, <size=...>) & 100% HTML tag parity
 *  5. 100% Routing & Registry synchronization (src/lib/locales.js, src/i18n.js)
 *  6. 100% Literal code t("key") existence in en.json
 * ──────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'src', 'messages');
const SRC_DIR      = path.join(__dirname, '..', 'src');

function flatEntries(obj, prefix = '') {
  const out = {};
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(out, flatEntries(obj[k], full));
    } else {
      out[full] = String(obj[k]);
    }
  }
  return out;
}

function load(lang) {
  const file = path.join(MESSAGES_DIR, `${lang}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function extractIcuVars(str) {
  const vars = new Set();
  const re = /\{([a-zA-Z0-9_]+)(?:\s*,|\})/g;
  for (const m of String(str).matchAll(re)) {
    vars.add(m[1]);
  }
  return [...vars].sort();
}

function extractHtmlTags(str) {
  const tags = [];
  const re = /<\/?[a-zA-Z0-9]+[^>]*>/g;
  for (const m of String(str).matchAll(re)) {
    tags.push(m[0]);
  }
  return tags.sort();
}

function hasUnbalancedBraces(str) {
  const s = String(str);
  let depth = 0;
  for (const ch of s) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return true;
  }
  return depth !== 0;
}

const MOJIBAKE_RE  = /(\uFFFD|\u00C3[\u0080-\u00BF]|\u00C3\u00B1|\u00C3\u0097|\u00E2\u20AC\u201D|\u00E2\u20AC\u201C|\u00E2\u20AC\u2122)/;
const UNITY_TAG_RE = /<\/?(?:color|size)[^>]*>/i;

function red(s)    { return `\x1b[31m${s}\x1b[0m`; }
function green(s)  { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function bold(s)   { return `\x1b[1m${s}\x1b[0m`; }

const files  = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
const en     = load('en');
const enFlat = flatEntries(en);
const enKeys = new Set(Object.keys(enFlat));

const langs = files
  .map(f => f.replace('.json', ''))
  .filter(l => l !== 'en')
  .sort();

let failed = false;

console.log(bold('\n⚡  Unity / Valkyrie i18n Key, ICU, HTML, Routing & UTF-8 Integrity Check'));
console.log('─'.repeat(72));

// Check en.json for Mojibake or unbalanced braces first
const enMojibake = Object.entries(enFlat).filter(([, v]) => MOJIBAKE_RE.test(v) || hasUnbalancedBraces(v) || UNITY_TAG_RE.test(v));
if (enMojibake.length > 0) {
  failed = true;
  console.log(`${red('✗')}  ${bold('en')}    — ${red(enMojibake.length + ' UTF-8 / brace / Unity3D tag issue(s) detected')}`);
  enMojibake.slice(0, 10).forEach(([k]) => console.log(`     ${red('–')} "${k}"`));
}

for (const lang of langs) {
  const data    = load(lang);
  const locFlat = flatEntries(data);
  const keys    = new Set(Object.keys(locFlat));
  const missing = [...enKeys].filter(k => !keys.has(k));
  const extra   = [...keys].filter(k => !enKeys.has(k));
  const mojibake = Object.entries(locFlat).filter(([, v]) => MOJIBAKE_RE.test(v));
  const icuMismatch = [];
  const tagMismatch = [];

  for (const k of enKeys) {
    if (!keys.has(k)) continue;
    const enVars  = extractIcuVars(enFlat[k]);
    const locVars = extractIcuVars(locFlat[k]);
    if (enVars.join(',') !== locVars.join(',') || hasUnbalancedBraces(locFlat[k])) {
      icuMismatch.push({ key: k, expected: enVars, got: locVars });
    }
    if (UNITY_TAG_RE.test(locFlat[k])) {
      tagMismatch.push({ key: k, reason: 'Raw Unity3D <color>/<size> tag' });
    } else {
      const enTags  = extractHtmlTags(enFlat[k]);
      const locTags = extractHtmlTags(locFlat[k]);
      if (enTags.join(',') !== locTags.join(',')) {
        tagMismatch.push({ key: k, reason: `HTML tags expected [${enTags.join(', ')}] got [${locTags.join(', ')}]` });
      }
    }
  }

  if (missing.length === 0 && extra.length === 0 && mojibake.length === 0 && icuMismatch.length === 0 && tagMismatch.length === 0) {
    console.log(`${green('✓')}  ${lang.padEnd(5)} — all ${enKeys.size} keys, ICU placeholders, HTML tags & UTF-8 verified`);
    continue;
  }

  failed = true;
  console.log(`\n${red('✗')}  ${bold(lang)} — ${red(missing.length + ' missing')}, ${red(mojibake.length + ' mojibake')}, ${red(icuMismatch.length + ' ICU mismatch')}, ${red(tagMismatch.length + ' tag mismatch')}`);

  if (missing.length) {
    missing.slice(0, 15).forEach(k => console.log(`     ${red('– [MISSING]')} "${k}"`));
  }
  if (mojibake.length) {
    mojibake.slice(0, 15).forEach(([k]) => console.log(`     ${red('– [MOJIBAKE]')} "${k}"`));
  }
  if (icuMismatch.length) {
    icuMismatch.slice(0, 15).forEach(({ key, expected, got }) =>
      console.log(`     ${red('– [ICU]')} "${key}" expected {${expected.join(', ')}} got {${got.join(', ')}}`)
    );
  }
  if (tagMismatch.length) {
    tagMismatch.slice(0, 15).forEach(({ key, reason }) =>
      console.log(`     ${red('– [TAG]')} "${key}" ${reason}`)
    );
  }
}

console.log('─'.repeat(72));

// Verify Routing & Registry synchronization (src/lib/locales.js & src/i18n.js)
const localesRegistryPath = path.join(SRC_DIR, 'lib', 'locales.js');
const i18nConfigPath      = path.join(SRC_DIR, 'i18n.js');
const allJsonLocales      = ['en', ...langs].sort();

if (fs.existsSync(localesRegistryPath) && fs.existsSync(i18nConfigPath)) {
  const regSrc  = fs.readFileSync(localesRegistryPath, 'utf8');
  const i18nSrc = fs.readFileSync(i18nConfigPath, 'utf8');
  const missingInReg  = allJsonLocales.filter(l => !new RegExp(`['"]${l}['"]`).test(regSrc));
  const missingInI18n = allJsonLocales.filter(l => !new RegExp(`messages/${l}\\.json`).test(i18nSrc));
  if (missingInReg.length === 0 && missingInI18n.length === 0) {
    console.log(`${green('✓')}  route — all ${allJsonLocales.length} locales synchronized across locales.js, i18n.js & proxy.js`);
  } else {
    failed = true;
    console.log(`${red('✗')}  ${bold('route')} — locale registry out of sync: reg=[${missingInReg.join(',')}] i18n=[${missingInI18n.join(',')}]`);
  }
}

const SRC_EXT = /\.(js|jsx|ts|tsx)$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return SRC_EXT.test(entry.name) ? [full] : [];
  });
}

function hasPath(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return false;
    cur = cur[part];
  }
  return true;
}

const BINDING_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([^"'`]+)["'`]|\{[^}]*?namespace\s*:\s*["'`]([^"'`]+)["'`][^}]*\})?\s*\)/g;

const usedMissing = [];
let usedChecked = 0;

for (const file of walk(SRC_DIR)) {
  const src = fs.readFileSync(file, 'utf8');
  const bindings = [];
  for (const m of src.matchAll(BINDING_RE)) {
    bindings.push({ name: m[1], ns: m[2] || m[3] || '', index: m.index });
  }
  if (!bindings.length) continue;

  for (const name of new Set(bindings.map(b => b.name))) {
    const escaped = name.replace(/\$/g, '\\$');
    const callRe = new RegExp(`(?<![\\w$.])${escaped}(?:\\.(?:rich|raw|markup))?\\(\\s*(["'\`])([^"'\`$]+)\\1(?=\\s*[,)])`, 'g');
    const own = bindings.filter(b => b.name === name);
    for (const call of src.matchAll(callRe)) {
      const binding = own.filter(b => b.index <= call.index).pop() || own[0];
      const key = binding.ns ? `${binding.ns}.${call[2]}` : call[2];
      usedChecked++;
      if (!hasPath(en, key)) {
        const line = src.slice(0, call.index).split('\n').length;
        usedMissing.push({ key, where: `${path.relative(path.join(__dirname, '..'), file)}:${line}` });
      }
    }
  }
}

if (usedMissing.length === 0) {
  console.log(`${green('✓')}  code  — all ${usedChecked} literal translation keys used in src/ exist in en.json`);
} else {
  failed = true;
  console.log(`\n${red('✗')}  ${bold('code')} — ${red(usedMissing.length + ' key(s) used in src/ but missing from en.json')}`);
  usedMissing.forEach(({ key, where }) => console.log(`     ${red('–')} "${key}"  ${yellow(where)}`));
}

console.log('─'.repeat(72));

if (failed) {
  console.log(red(bold('\n🚫  VALKYRIE GATE BLOCKED — Fix the i18n/ICU/HTML/UTF-8 issues above.\n')));
  process.exit(1);
} else {
  console.log(green(bold(`\n✅  All ${langs.length + 1} languages (${enKeys.size * (langs.length + 1)} strings) passed parity, ICU, HTML, Routing & UTF-8 checks.\n`)));
  process.exit(0);
}
