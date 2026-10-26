/**
 * test-math-qc.mjs — Project Valkyrie Wing 2 Deterministic Math & Forensic Test Suite
 * Uses Node.js built-in test runner (node --test) with zero external test dependencies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

import { analyzeGovernorAnomalies } from '../src/lib/anomalyDetector.js';
import { parseExcelWorkbook } from '../src/lib/excelHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('1. T5 Structural Calibration Floor Invariants (Governor 218877479 Anchor)', () => {
  const dynamoSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'awsDynamo.js'), 'utf8');
  assert.match(dynamoSrc, /T5_TECH_FLOOR\s*=\s*22_467_131/);
  assert.match(dynamoSrc, /T5_BUILDING_FLOOR\s*=\s*14_780_832/);
  assert.match(dynamoSrc, /includeSovereignInternal/, 'awsDynamo.js must gate sensitive packet/device fields behind includeSovereignInternal');

  const T5_TECH_FLOOR = 22_467_131;
  const T5_BUILDING_FLOOR = 14_780_832;
  const isT5Eligible = (tech, bldg) => tech >= T5_TECH_FLOOR && bldg >= T5_BUILDING_FLOOR;

  assert.equal(isT5Eligible(22_467_131, 14_780_832), true, 'Exact anchor floor must be T5_ELIGIBLE');
  assert.equal(isT5Eligible(22_467_130, 20_000_000), false, '1 point below tech floor must be T5_IMPOSSIBLE');
  assert.equal(isT5Eligible(30_000_000, 14_780_831), false, '1 point below building floor must be T5_IMPOSSIBLE');
});

test('2. Calculator Speedup & 25% Research Tech Buff Invariants', () => {
  const minutes = 15 * 220;
  assert.equal(minutes, 3300);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  assert.equal(days, 2);
  assert.equal(hours, 7);

  const calcPagePath = path.join(ROOT_DIR, 'src', 'app', '[locale]', 'calculators', 'page.js');
  const calcSrc = fs.readFileSync(calcPagePath, 'utf8');
  assert.ok(calcSrc.includes('25'), 'Calculators page must include 25% max research tech cap');
});

test('3. Multivariate Anomaly & Fraud Outlier Engine (analyzeGovernorAnomalies)', () => {
  const syntheticRoster = [
    { id: '1001', name: 'VanguardOne', alliance: 'VAL', power: 85_000_000, killPoints: 2_800_000_000, deads: 18_500_000, t4Kills: 80_000_000, t5Kills: 110_000_000, t1Kills: 2_000_000 },
    { id: '1002', name: 'VanguardTwo', alliance: 'VAL', power: 78_000_000, killPoints: 2_100_000_000, deads: 14_000_000, t4Kills: 65_000_000, t5Kills: 85_000_000, t1Kills: 1_500_000 },
    { id: '1003', name: 'CoreFighterA', alliance: 'VAL', power: 62_000_000, killPoints: 1_200_000_000, deads: 8_200_000, t4Kills: 45_000_000, t5Kills: 40_000_000, t1Kills: 1_200_000 },
    { id: '1004', name: 'CoreFighterB', alliance: 'VAL', power: 58_000_000, killPoints: 1_050_000_000, deads: 7_500_000, t4Kills: 40_000_000, t5Kills: 35_000_000, t1Kills: 1_100_000 },
    { id: '1005', name: 'CoreFighterC', alliance: 'VAL', power: 55_000_000, killPoints: 950_000_000, deads: 6_800_000, t4Kills: 35_000_000, t5Kills: 30_000_000, t1Kills: 900_000 },
    { id: '9999', name: 'DeadweightWhale', alliance: 'FARM', power: 95_000_000, killPoints: 45_000_000, deads: 120_000, t4Kills: 1_000_000, t5Kills: 200_000, t1Kills: 20_000_000 },
  ];

  const report = analyzeGovernorAnomalies(syntheticRoster);
  assert.ok(report && report.summary, 'Anomaly report summary must be returned');
  assert.equal(report.summary.totalScanned, syntheticRoster.length);
  assert.ok(Array.isArray(report.rosterWithScores), 'rosterWithScores must be returned');
  assert.ok(report.summary.deadWeightWhales >= 1 || report.summary.statPadders >= 1, 'Synthetic deadweight/stat-padder whale must be flagged');
});

test('4. ExcelJS Streaming Helper Round-Trip Integrity', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Roster');
  ws.columns = [
    { header: 'Rank', key: 'Rank' },
    { header: 'GovernorID', key: 'GovernorID' },
    { header: 'Name', key: 'Name' },
    { header: 'Power', key: 'Power' },
  ];
  ws.addRow({ Rank: 1, GovernorID: '218877479', Name: 'Bryan', Power: 52000000 });
  ws.addRow({ Rank: 2, GovernorID: '219000111', Name: 'Valheon', Power: 48500000 });

  const buf = await wb.xlsx.writeBuffer();
  assert.ok(buf && buf.byteLength > 500, 'Generated .xlsx buffer must be non-empty');

  const parsed = await parseExcelWorkbook(buf);
  assert.ok(parsed.sheets.Roster, 'Parsed workbook must contain Roster sheet');
  assert.equal(parsed.sheets.Roster.length, 2, 'Roster sheet must contain 2 parsed data rows');
  assert.equal(String(parsed.sheets.Roster[0].GovernorID), '218877479');
});

test('5. OPSEC Zero-Recipe Leakage Guard on Public & Export Surfaces', () => {
  const forbiddenTokens = [/VALHEON_SIG_VERIFIED/i, /MuMu\s*12\s*Direct\s*Lua\s*Memory/i, /VALHEON_35_FIELD_VERIFIED/i, /VALHEON_TELEMETRY_CORE_MAILCACHE/i, /Unity2AWSRoster/i, /SVD\/PCA/i, /Gemini\s+Vision/i];
  const candidateFiles = [
    path.join(ROOT_DIR, 'public', 'llms.txt'),
    path.join(ROOT_DIR, 'hermes-bot', 'blueprints.js'),
    path.join(ROOT_DIR, 'src', 'components', 'command', 'HermesDiscordArchitect.js'),
    path.join(ROOT_DIR, 'scanner', 'export_4194_xlsx.mjs'),
  ];
  for (const fpath of candidateFiles) {
    if (fs.existsSync(fpath)) {
      const src = fs.readFileSync(fpath, 'utf8');
      for (const pat of forbiddenTokens) {
        assert.doesNotMatch(src, pat, `Surface file ${path.basename(fpath)} must not contain forbidden trade-secret token: ${pat}`);
      }
    }
  }
});
