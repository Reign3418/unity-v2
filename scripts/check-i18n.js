#!/usr/bin/env node
/**
 * check-i18n.js
 * Unity i18n Key Parity Guard
 * ─────────────────────────────────────────────────────────────────
 * Compares every messages/*.json file against en.json (the source
 * of truth). Exits 1 if ANY language is missing a key — which will
 * block the Git pre-commit hook and stop the commit.
 *
 * Run manually:  node scripts/check-i18n.js
 * Or via npm:    npm run check:i18n
 * ─────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'src', 'messages');

// ── Helpers ──────────────────────────────────────────────────────

/** Flatten a nested JSON object into dot-notation keys */
function flatKeys(obj, prefix = '') {
  return Object.keys(obj).flatMap(k => {
    const full = prefix ? `${prefix}.${k}` : k;
    return typeof obj[k] === 'object' && obj[k] !== null
      ? flatKeys(obj[k], full)
      : [full];
  });
}

function load(lang) {
  const file = path.join(MESSAGES_DIR, `${lang}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function red(s)    { return `\x1b[31m${s}\x1b[0m`; }
function green(s)  { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function bold(s)   { return `\x1b[1m${s}\x1b[0m`; }

// ── Main ─────────────────────────────────────────────────────────

const files  = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
const en     = load('en');
const enKeys = new Set(flatKeys(en));

const langs  = files
  .map(f => f.replace('.json', ''))
  .filter(l => l !== 'en');

let failed = false;

console.log(bold('\n⚡  Unity i18n Key Parity Check'));
console.log('─'.repeat(52));

for (const lang of langs) {
  const data    = load(lang);
  const keys    = new Set(flatKeys(data));
  const missing = [...enKeys].filter(k => !keys.has(k));
  const extra   = [...keys].filter(k => !enKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`${green('✓')}  ${lang.padEnd(5)} — all ${enKeys.size} keys present`);
    continue;
  }

  failed = true;
  console.log(`\n${red('✗')}  ${bold(lang)} — ${red(missing.length + ' missing')}${extra.length ? yellow(', ' + extra.length + ' extra') : ''}`);

  if (missing.length) {
    console.log(`   ${yellow('MISSING')} (add these to src/messages/${lang}.json):`);
    missing.forEach(k => console.log(`     ${red('–')} "${k}"`));
  }

  if (extra.length) {
    console.log(`   ${yellow('EXTRA')} (in ${lang} but not in en.json — safe to ignore or clean up):`);
    extra.forEach(k => console.log(`     + "${k}"`));
  }
}

console.log('─'.repeat(52));

// ── Used-key scan: keys referenced in code must exist in en.json ──
// Parity above only compares locales to each other; it cannot see a key that
// the code uses but that NO locale defines. This scan closes that gap.
//
// Finds translator bindings such as
//   const t = useTranslations("Namespace");
//   const t = await getTranslations({ locale, namespace: "Namespace" });
// and then literal calls t("key"), t.rich("key"), t.raw("key"), t.markup("key").
// Dynamic keys (variables / template literals) are skipped.

const SRC_DIR = path.join(__dirname, '..', 'src');
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
      // Use the nearest binding declared before the call (falls back to the first one)
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

console.log('─'.repeat(52));

if (failed) {
  console.log(red(bold('\n🚫  COMMIT BLOCKED — Fix the missing keys above, then re-commit.\n')));
  console.log('   Tip: Copy the English value from src/messages/en.json and translate it,');
  console.log('   or run: npm run check:i18n  to re-validate after your edits.\n');
  process.exit(1);
} else {
  console.log(green(bold(`\n✅  All ${langs.length + 1} languages are in parity. Commit allowed.\n`)));
  process.exit(0);
}
