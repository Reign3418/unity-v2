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

if (failed) {
  console.log(red(bold('\n🚫  COMMIT BLOCKED — Fix the missing keys above, then re-commit.\n')));
  console.log('   Tip: Copy the English value from src/messages/en.json and translate it,');
  console.log('   or run: npm run check:i18n  to re-validate after your edits.\n');
  process.exit(1);
} else {
  console.log(green(bold(`\n✅  All ${langs.length + 1} languages are in parity. Commit allowed.\n`)));
  process.exit(0);
}
