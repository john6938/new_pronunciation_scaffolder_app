/**
 * generateStressDict.mjs
 *
 * One-time build script that generates src/utils/stressDict.ts from the
 * CMU Pronouncing Dictionary (cmu-pronouncing-dictionary npm package).
 *
 * Output format per entry:
 *   [syllableCount, primaryStressIdx, secondaryStressIdx]
 *   - syllableCount:     number of vowel nuclei (= syllables)
 *   - primaryStressIdx:  0-based index of the primary-stressed syllable (CMU "1")
 *   - secondaryStressIdx: 0-based index of secondary-stressed syllable (CMU "2"),
 *                         or -1 if none
 *
 * Only multi-syllabic words (2+ syllables) are included; monosyllabic words
 * never need a stress marker in the app.
 *
 * Word selection — all valid entries (~45,000):
 *   1. Must appear in word-list (SCOWL ~274K real English words — filters proper
 *      nouns, abbreviations, acronyms that sneak into CMU dict as lowercase)
 *   2. Lowercase a-z only, no alternate-pronunciation keys (word(2) etc.)
 *   3. Multi-syllabic (≥ 2 vowel nuclei in phoneme string)
 *   4. Length 3–20 characters
 *
 * All entries are included (~45K, ~200 KB gzipped) so that important longer
 * words like "communication", "information", "presentation" are covered.
 * Words not found here fall back to suffix rules in textProcessing.ts.
 *
 * Run with:   node scripts/generateStressDict.mjs
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const cmuDict    = require('cmu-pronouncing-dictionary').dictionary;
const wordListPkg = require('word-list');

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Word whitelist ───────────────────────────────────────────────────────────

// word-list exports the path to a newline-separated text file
const wordListPath = typeof wordListPkg === 'string'
  ? wordListPkg
  : wordListPkg.default ?? wordListPkg;

const wordSet = new Set(
  readFileSync(wordListPath, 'utf-8').split('\n').map(w => w.trim().toLowerCase()).filter(Boolean)
);
console.log(`Word whitelist size: ${wordSet.size.toLocaleString()}`);

// ─── CMU parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a CMU phoneme string and extract syllable/stress info.
 *
 * CMU stress markers (on vowel phonemes):
 *   0 = unstressed   1 = primary stress   2 = secondary stress
 *
 * Returns [syllableCount, primaryIdx, secondaryIdx] or null if unsuitable.
 * secondaryIdx is -1 when no secondary stress is marked.
 */
function extractStressInfo(phonemeStr) {
  const phonemes = phonemeStr.split(' ');
  // Vowel nuclei carry a stress digit at the end
  const nuclei = phonemes.filter(p => /[012]$/.test(p));

  if (nuclei.length < 2) return null; // monosyllabic — skip

  const primaryIdx   = nuclei.findIndex(p => p.endsWith('1'));
  const secondaryIdx = nuclei.findIndex(p => p.endsWith('2'));

  if (primaryIdx === -1) return null; // no primary stress marked — skip

  return [nuclei.length, primaryIdx, secondaryIdx]; // -1 if no secondary
}

// ─── Build ────────────────────────────────────────────────────────────────────

const candidates = [];

for (const [word, phonemes] of Object.entries(cmuDict)) {
  // Skip alternate pronunciations (word(2), word(3) …)
  if (/\(\d+\)$/.test(word)) continue;
  // Only a-z — removes punctuation variants like "word's"
  if (!/^[a-z]+$/.test(word)) continue;
  // Must be a real dictionary word (not an abbreviation or proper noun)
  if (!wordSet.has(word)) continue;
  // Reasonable length
  if (word.length < 3 || word.length > 20) continue;

  const info = extractStressInfo(phonemes);
  if (!info) continue;

  candidates.push([word, info]);
}

console.log(`Total entries: ${candidates.length.toLocaleString()}`);

// Syllable distribution report
const syllDist = {};
for (const [, [sc]] of candidates) syllDist[sc] = (syllDist[sc] ?? 0) + 1;
console.log('Syllable distribution:', syllDist);

// Spot-check important words
const dictObj = Object.fromEntries(candidates);
const spotCheck = [
  'important', 'communication', 'information', 'organization',
  'effective', 'together', 'understand', 'remember', 'attention',
  'presentation', 'different', 'another', 'example', 'because', 'before',
  'analysis', 'however', 'conclusion', 'development', 'management',
];
console.log('\nSpot-check (word → [syllables, primary, secondary]):');
for (const w of spotCheck) {
  console.log(`  ${w.padEnd(16)} ${dictObj[w] ? JSON.stringify(dictObj[w]) : 'MISSING (will use rules)'}`);
}

// ─── Output ───────────────────────────────────────────────────────────────────

// Output as JSON — Vite imports JSON natively with no TypeScript type-checking
// overhead, keeping build times fast regardless of dictionary size.
const jsonOutput = JSON.stringify(dictObj);
const jsonPath = join(__dirname, '../src/utils/stressDict.json');
writeFileSync(jsonPath, jsonOutput, 'utf-8');

const kb = Math.round(jsonOutput.length / 1024);
console.log(`\nWritten to src/utils/stressDict.json  (${kb} KB uncompressed)`);
