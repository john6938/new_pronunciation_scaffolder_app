import nlp from 'compromise';
import { VisualizationSettings } from '../App';
import { PauseMarker, segmentWithPauses } from './pauseAnnotation';
export type { PauseMarker };
import CMU_STRESS_DICT_RAW from './stressDict.json';
const CMU_STRESS_DICT = CMU_STRESS_DICT_RAW as unknown as Record<string, [number, number, number]>;

export type ProcessedSyllable = {
  text: string;        // substring of original word (punctuation on first/last)
  isPrimaryStress: boolean;
};

export type ComplexSound = {
  type: 'th' | 'ed' | 's';
  soundType: 'voiced' | 'unvoiced' | 'special';
  start: number; // char index into original word string
  end: number;
};

export type ProcessedWord = {
  original: string;
  syllables: ProcessedSyllable[]; // concatenate to get original
  isSentenceStressed: boolean;
  complexSounds: ComplexSound[];
  linkingAfter?: 'consonant' | 'vowel';
};

// 'omit' = boundary is real but intonation is ambiguous (e.g. tag questions)
export type IntonationMark = 'rising' | 'falling' | 'omit';

export type ProcessedClause = {
  words: ProcessedWord[];
  intonation: IntonationMark;
  pauseAfter?: PauseMarker;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VOWELS = 'aeiouy';
const isVowel = (c: string) => VOWELS.includes(c.toLowerCase());
const isAlpha = (c: string) => /[a-zA-Z]/.test(c);

// Unstressed function words
const UNSTRESSED_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'by',
  'for', 'with', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
  'may', 'might', 'can', 'must', 'shall', 'it', 'its', 'as', 'that', 'this',
  'these', 'those', 'he', 'she', 'him', 'her', 'his', 'them', 'their', 'our',
  'we', 'you', 'your', 'my', 'me', 'us', 'not', 'so', 'just', 'then', 'than',
]);

// Primary stress syllable index (0-based) for common words
const STRESS_DICT: Record<string, number> = {
  'about': 1, 'above': 1, 'achieve': 1, 'across': 1, 'after': 0,
  'again': 1, 'against': 1, 'allow': 1, 'almost': 0, 'alone': 1,
  'along': 1, 'already': 1, 'also': 0, 'although': 1, 'always': 0,
  'among': 1, 'another': 1, 'apply': 1, 'around': 1, 'away': 1,
  'because': 1, 'become': 1, 'before': 1, 'begin': 1, 'behind': 1,
  'below': 1, 'between': 1, 'beyond': 1, 'body': 0, 'business': 0,
  'carry': 0, 'certain': 0, 'children': 0, 'color': 0, 'colour': 0,
  'common': 0, 'communication': 3, 'community': 1, 'company': 0,
  'consider': 1, 'continue': 1, 'create': 1, 'current': 0,
  'decide': 1, 'develop': 1, 'different': 0, 'difficult': 0,
  'discover': 1, 'discuss': 1, 'during': 0, 'early': 0,
  'effect': 1, 'effective': 1, 'efficient': 1, 'effort': 0,
  'either': 0, 'enable': 1, 'ensure': 1, 'enter': 0, 'entire': 1,
  'equal': 0, 'establish': 1, 'even': 0, 'every': 0,
  'example': 1, 'expect': 1, 'experience': 1, 'explain': 1,
  'factor': 0, 'family': 0, 'finally': 0, 'follow': 0, 'forward': 0,
  'foundation': 1, 'general': 0, 'given': 0, 'global': 0,
  'going': 0, 'government': 0, 'happen': 0, 'happy': 0,
  'however': 1, 'human': 0, 'idea': 1, 'important': 1,
  'improve': 1, 'include': 1, 'increase': 1, 'individual': 2,
  'information': 2, 'instead': 1, 'involve': 1, 'issue': 0,
  'itself': 1, 'language': 0, 'later': 0, 'leader': 0,
  'level': 0, 'likely': 0, 'listen': 0, 'little': 0, 'local': 0,
  'major': 0, 'manage': 0, 'manner': 0, 'many': 0, 'matter': 0,
  'maybe': 0, 'meaning': 0, 'member': 0, 'mention': 0, 'model': 0,
  'modern': 0, 'moment': 0, 'morning': 0, 'national': 0,
  'natural': 0, 'never': 0, 'number': 0, 'often': 0, 'only': 0,
  'open': 0, 'order': 0, 'other': 0, 'over': 0, 'paper': 0,
  'people': 0, 'perhaps': 1, 'person': 0, 'possible': 0,
  'power': 0, 'present': 0, 'presentation': 2, 'problem': 0,
  'process': 0, 'produce': 1, 'program': 0, 'project': 0,
  'provide': 1, 'public': 0, 'purpose': 0, 'question': 0,
  'reason': 0, 'receive': 1, 'recent': 0, 'refer': 1,
  'relate': 1, 'remember': 1, 'report': 1, 'require': 1,
  'research': 1, 'result': 1, 'return': 1, 'review': 1,
  'second': 0, 'section': 0, 'service': 0, 'several': 0,
  'similar': 0, 'situation': 2, 'social': 0, 'specific': 1,
  'standard': 0, 'student': 0, 'study': 0, 'subject': 0,
  'success': 1, 'suggest': 1, 'support': 1, 'system': 0,
  'table': 0, 'target': 0, 'teacher': 0, 'thinking': 0,
  'today': 1, 'together': 1, 'total': 0, 'toward': 1, 'towards': 1,
  'under': 0, 'understand': 2, 'until': 1, 'upon': 1, 'using': 0,
  'value': 0, 'various': 0, 'very': 0, 'vision': 0, 'water': 0,
  'whether': 0, 'within': 1, 'without': 1, 'working': 0,
  'organization': 3, 'university': 3, 'ability': 1, 'activity': 1,
  'actually': 0, 'addition': 1, 'address': 1, 'agenda': 1,
  'analysis': 1, 'approach': 1, 'area': 0, 'audience': 0,
  'available': 1, 'benefit': 0, 'challenge': 0, 'clearly': 0,
  'colleague': 0, 'complete': 1, 'concept': 0, 'conclusion': 1,
  'conference': 0, 'content': 0, 'context': 0, 'data': 0,
  'define': 1, 'demonstrate': 0, 'describe': 1, 'design': 1,
  'detail': 0, 'evaluate': 1, 'evidence': 0, 'focus': 0,
  'format': 0, 'framework': 0, 'future': 0, 'highlight': 0,
  'impact': 0, 'implement': 0, 'insight': 0, 'introduce': 2,
  'knowledge': 0, 'method': 0, 'objective': 1, 'opportunity': 2,
  'outcome': 0, 'overview': 0, 'partner': 0, 'performance': 1,
  'planning': 0, 'practice': 0, 'priority': 1, 'procedure': 1,
  'professional': 1, 'progress': 0, 'proposal': 1, 'quality': 0,
  'relevant': 0, 'resource': 1, 'response': 1, 'responsibility': 2,
  'role': 0, 'schedule': 0, 'solution': 1, 'stakeholder': 0,
  'strategy': 0, 'structure': 0, 'summary': 0, 'survey': 0,
  'technology': 1, 'timeline': 0, 'topic': 0, 'update': 0,
  'useful': 0, 'usually': 0, 'welcome': 0, 'workplace': 0,
};

// Valid English syllable onsets (for Maximum Onset Principle)
const VALID_ONSETS_2 = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr',
  'pl', 'pr', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw',
  'th', 'sh', 'ch', 'wh', 'ph', 'gh',
]);
const VALID_ONSETS_3 = new Set(['scr', 'spl', 'spr', 'str', 'thr', 'shr']);

// ─── th voicing classification ────────────────────────────────────────────────
//
// Three-layer system (higher layers always take precedence):
//   Layer 1 — Authoritative lexicon: direct voiced-word lookup
//   Layer 2 — Morphological rules: inflected forms + -the suffix pattern
//   Layer 3 — Conservative default: unvoiced (correct for most content words)

// Layer 1: authoritative voiced /ð/ lexicon
const VOICED_TH_WORDS = new Set([
  // Core demonstratives and determiners
  'the', 'this', 'that', 'these', 'those',
  // Personal pronouns and possessives
  'they', 'them', 'their', 'theirs', 'themselves',
  // Contractions (apostrophes stripped by alpha normalisation)
  'theyre', 'theyve', 'theyll', 'theyd', 'thats', 'theres',
  // Archaic / literary pronouns
  'thee', 'thou', 'thy', 'thine', 'thyself',
  // Adverbs, conjunctions, connectives
  'there', 'then', 'thence',
  'though', 'although', 'than', 'thus',
  // Discourse connectives with there- prefix (all voiced)
  'thereby', 'therefore', 'thereafter', 'therein', 'thereof',
  'thereon', 'thereto', 'therewith', 'therefrom', 'thereupon',
  // Preposition
  'with',
  // Distributives / correlatives
  'either', 'neither', 'whether',
  // High-frequency relational words
  'together', 'other', 'another',
  // Kinship terms (all -ther, voiced)
  'brother', 'mother', 'father',
  // -ther words: voiced /ð/ in the suffix
  'weather', 'feather', 'leather',
  'bother', 'further', 'farther', 'furthest', 'farthest',
  'gather', 'rather', 'lather', 'dither', 'wither',
  'hither', 'smother', 'blather', 'slather', 'tether', 'nether',
  // Verb–noun alternation pairs: verb forms (voiced) listed here
  // counterparts: breath/breathe  bath/bathe  cloth/clothe  loath/loathe
  'soothe', 'breathe', 'loathe', 'bathe', 'clothe',
  'teethe', 'wreathe', 'sheathe', 'seethe', 'scathe', 'swathe',
  // Other voiced-th content words
  'smooth', 'lithe', 'writhe', 'scythe', 'lathe',
]);

// Layer 2 exception: word ends in -the but th is unvoiced (rare)
const UNVOICED_THE_EXCEPTIONS = new Set(['tithe']);

/**
 * Classify the /th/ voicing in a word.
 * @param alpha  Lowercased, alphabetic-only form of the word.
 *
 * Layer 1 — Direct lexicon lookup (most reliable).
 * Layer 2a — Morphological rule: words ending in -the are voiced verb/adj forms.
 * Layer 2b — Inflection stripping: checks stem (and stem+e) against the lexicon.
 * Layer 3  — Conservative default: unvoiced.
 */
function classifyThVoicing(alpha: string): 'voiced' | 'unvoiced' {
  // Layer 1
  if (VOICED_TH_WORDS.has(alpha)) return 'voiced';

  // Layer 2a: -the ending → voiced (verb alternation / adjective pattern)
  if (alpha.length > 3 && alpha.endsWith('the') && !UNVOICED_THE_EXCEPTIONS.has(alpha)) {
    return 'voiced';
  }

  // Layer 2b: inflected forms — strip suffix, check stem (and silent-e restoration)
  if (alpha.endsWith('ing') && alpha.length > 5) {
    const stem = alpha.slice(0, -3);
    if (VOICED_TH_WORDS.has(stem) || VOICED_TH_WORDS.has(stem + 'e')) return 'voiced';
  }
  if (alpha.endsWith('ed') && alpha.length > 4) {
    const stem = alpha.slice(0, -2);
    if (VOICED_TH_WORDS.has(stem) || VOICED_TH_WORDS.has(stem + 'e')) return 'voiced';
  }
  // -d (single) without prior -e: e.g. "soothed" already caught by -ed; keeps "they'd"→"they"
  if (alpha.endsWith('d') && !alpha.endsWith('ed') && alpha.length > 3) {
    const stem = alpha.slice(0, -1);
    if (VOICED_TH_WORDS.has(stem)) return 'voiced';
  }
  // -s / -es: check stem only (no +e — prevents "baths"→"bathe" false positive)
  if (alpha.endsWith('s') && alpha.length > 3) {
    const stem = alpha.slice(0, -1);
    if (VOICED_TH_WORDS.has(stem)) return 'voiced';
  }
  // Derivational suffixes: -ly, -ness, -er, -est
  for (const sfx of ['ness', 'est', 'ly', 'er'] as const) {
    if (alpha.endsWith(sfx) && alpha.length > sfx.length + 2) {
      const stem = alpha.slice(0, -sfx.length);
      if (VOICED_TH_WORDS.has(stem)) return 'voiced';
    }
  }

  // Layer 3: conservative default
  return 'unvoiced';
}

// ─── Syllabification ──────────────────────────────────────────────────────────

/**
 * Split a word into syllables preserving all punctuation.
 * The syllable texts concatenate to exactly reproduce the original word.
 */
export function splitIntoSyllables(word: string): ProcessedSyllable[] {
  // Hyphenated compounds (e.g. "vice-president", "decision-making"):
  // split at each letter–hyphen–letter boundary and process each component
  // independently, so stress is correctly identified per component.
  if (/[a-zA-Z]-[a-zA-Z]/.test(word)) {
    const result: ProcessedSyllable[] = [];
    let start = 0;
    for (let idx = 1; idx < word.length - 1; idx++) {
      if (word[idx] === '-' && /[a-zA-Z]/.test(word[idx - 1]) && /[a-zA-Z]/.test(word[idx + 1])) {
        result.push(...splitIntoSyllables(word.slice(start, idx + 1))); // include hyphen
        start = idx + 1;
      }
    }
    result.push(...splitIntoSyllables(word.slice(start)));
    return result;
  }

  // Separate leading/trailing punctuation from the alphabetic core
  const m = word.match(/^([^a-zA-Z']*)([a-zA-Z']+)([^a-zA-Z']*)$/);
  if (!m) return [{ text: word, isPrimaryStress: false }];

  const [, leadPunct, core, trailPunct] = m;
  const lc = core.toLowerCase();

  // Find vowel nucleus start positions (skip consecutive vowels as one nucleus)
  const nuclei: number[] = [];
  let i = 0;
  while (i < lc.length) {
    if (isVowel(lc[i])) {
      nuclei.push(i);
      while (i < lc.length && isVowel(lc[i])) i++;
    } else {
      i++;
    }
  }

  // Treat trailing silent 'e' as not a separate nucleus (e.g. "make", "time").
  // Exception: consonant + "le" endings form a syllabic 'l', not a silent 'e'
  // (e.g. "middle", "table", "simple", "people" — the 'le' IS a syllable).
  // Detect by checking that the char before 'l' is also a consonant.
  const isSyllabicLE =
    lc.endsWith('le') &&
    lc.length >= 3 &&
    !isVowel(lc[lc.length - 3]);

  if (
    !isSyllabicLE &&
    nuclei.length > 1 &&
    lc[lc.length - 1] === 'e' &&
    lc.length >= 2 &&
    !isVowel(lc[lc.length - 2])
  ) {
    nuclei.pop();
  }

  // Monosyllabic — no stress marker needed (only 2+ syllable words are annotated)
  if (nuclei.length <= 1) {
    return [{ text: leadPunct + core + trailPunct, isPrimaryStress: false }];
  }

  // Compute split points between nuclei using Maximum Onset Principle
  const splitPoints: number[] = [];
  for (let n = 0; n < nuclei.length - 1; n++) {
    let nucEnd = nuclei[n];
    while (nucEnd < lc.length && isVowel(lc[nucEnd])) nucEnd++;

    const nextNucStart = nuclei[n + 1];
    const cluster = lc.slice(nucEnd, nextNucStart);

    let offset: number;
    if (cluster.length === 0) {
      offset = 0;
    } else if (cluster.length === 1) {
      offset = 0; // single consonant starts next syllable
    } else if (cluster.length === 2) {
      offset = VALID_ONSETS_2.has(cluster) ? 0 : 1;
    } else if (cluster.length === 3) {
      if (VALID_ONSETS_3.has(cluster)) offset = 0;
      else if (VALID_ONSETS_2.has(cluster.slice(1))) offset = 1;
      else offset = 2;
    } else {
      offset = cluster.length - 1;
    }

    splitPoints.push(nucEnd + offset);
  }

  // Build syllable strings from core
  const texts: string[] = [];
  let start = 0;
  for (const sp of splitPoints) {
    if (sp > start) texts.push(core.slice(start, sp));
    start = sp;
  }
  if (start < core.length) texts.push(core.slice(start));

  if (texts.length === 0) return [{ text: word, isPrimaryStress: false }];

  // Attach punctuation
  texts[0] = leadPunct + texts[0];
  texts[texts.length - 1] += trailPunct;

  // Apply stress
  const stressIdx = getStressIndex(lc, texts.length);
  return texts.map((text, idx) => ({
    text,
    isPrimaryStress: idx === stressIdx && texts.length > 1,
  }));
}

/**
 * Return the 0-based index of the primary stressed syllable.
 *
 * Lookup order:
 *   1. CMU Pronouncing Dictionary (45K entries, primary + secondary stress)
 *   2. Legacy bespoke STRESS_DICT (hand-curated ~150 entries)
 *   3. Suffix rules (fallback for words not in either dictionary)
 *
 * Only called for words with ≥ 2 syllables.
 */
function getStressIndex(word: string, syllableCount: number): number {
  const clean = word.replace(/[^a-z]/g, '');

  // 1. CMU dictionary — [syllableCount, primaryIdx, secondaryIdx]
  const cmuEntry = CMU_STRESS_DICT[clean];
  if (cmuEntry !== undefined) {
    // primaryIdx is relative to vowel nuclei, not necessarily syllable boundaries,
    // so clamp to the detected syllable count for safety
    return Math.min(cmuEntry[1], syllableCount - 1);
  }

  // 2. Legacy hand-curated dictionary
  if (STRESS_DICT[clean] !== undefined) {
    return Math.min(STRESS_DICT[clean], syllableCount - 1);
  }

  // 3. Suffix rules (order matters — most specific first)
  if (/tion$|sion$/.test(clean)) return Math.max(0, syllableCount - 2);
  if (/ic$|ical$/.test(clean))   return Math.max(0, syllableCount - 2);
  if (/ity$|ify$|ology$|ography$/.test(clean)) return Math.max(0, syllableCount - 3);
  if (/ive$|ous$|ful$|less$|ness$|ment$/.test(clean)) return 0;

  return 0; // default: first syllable
}

// ─── Intonation Annotation ────────────────────────────────────────────────────
//
// Design principle: falling (↘) is the English default.
// Rising (↗) is assigned only when there is a clear linguistic trigger.
// 'omit' marks boundaries where intonation cannot reliably be determined
// from text alone (e.g. tag questions, whose intonation depends on whether
// the speaker seeks confirmation or a genuine answer).

// Preposed subordinating conjunctions: clauses beginning with these words
// appear before the main clause and project continuation → rising
const PREPOSED_SUB_CONJ = new Set([
  'if', 'when', 'although', 'though', 'while', 'whilst', 'since',
  'because', 'as', 'after', 'before', 'until', 'unless', 'whereas',
  'wherever', 'whenever', 'provided', 'supposing', 'once', 'given',
]);

// Coordinating conjunctions (referenced for documentation; non-final clause
// before these projects continuation → rising, covered by non-final rule)
const _COORD_CONJ = new Set(['and', 'but', 'or', 'nor', 'yet', 'so']); // eslint-disable-line

// Wh-words that begin wh-questions → falling (English default for wh-questions)
const WH_WORDS = new Set([
  'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whose', 'whom',
]);

// Auxiliary verbs that front-shift to open yes/no questions → rising
const YES_NO_AUX = new Set([
  'is', 'are', 'was', 'were', 'am',
  'do', 'does', 'did',
  'have', 'has', 'had',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
]);

type SentenceType = 'declarative' | 'wh-question' | 'yes-no-question' | 'imperative';

/** Return the first alphabetic token of a string, lowercased */
function getFirstWord(text: string): string {
  const m = text.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/);
  return m ? m[0].toLowerCase() : '';
}

/**
 * Classify the overall sentence type.
 * Imperatives are treated as declarative: neutral imperatives use falling intonation.
 */
function classifySentence(sentence: string): SentenceType {
  const t = sentence.trim();
  if (!t.endsWith('?')) return 'declarative';

  const first = getFirstWord(t);
  if (WH_WORDS.has(first)) return 'wh-question';
  if (YES_NO_AUX.has(first)) return 'yes-no-question';

  // Contracted negatives at the front also signal yes/no questions
  // e.g. "Isn't this wonderful?" / "Can't we do better?"
  if (/^(?:isn'?t|aren'?t|wasn'?t|weren'?t|don'?t|doesn'?t|didn'?t|haven'?t|hasn'?t|hadn'?t|won'?t|wouldn'?t|can'?t|couldn'?t|shouldn'?t|mustn'?t)\b/i.test(t)) {
    return 'yes-no-question';
  }

  return 'declarative';
}

/**
 * Detect whether a sentence ends with a tag question.
 *
 * Tag questions are ambiguous in written text: the intonation depends on
 * whether the speaker wants confirmation (falling) or a genuine answer
 * (rising). Since this cannot be reliably inferred, tag units are 'omit'.
 *
 * Pattern: ..., [aux or neg-contracted-aux] [pronoun]?
 * e.g. "It's nice, isn't it?" / "You came, didn't you?" / "They'll help, won't they?"
 */
function detectTagQuestion(sentence: string): boolean {
  return /,\s*(?:isn'?t|aren'?t|wasn'?t|weren'?t|don'?t|doesn'?t|didn'?t|haven'?t|hasn'?t|hadn'?t|won'?t|wouldn'?t|shan'?t|shouldn'?t|can'?t|couldn'?t|mustn'?t|is|are|was|were|do|does|did|have|has|had|will|would|shall|should|can|could|may|might|must)\s+(?:I|you|he|she|it|we|they|one)\s*\?$/i.test(sentence);
}

/**
 * Split text into individual sentences.
 * Splits on sentence-ending punctuation followed by whitespace + uppercase letter.
 * Masks common abbreviation periods first to avoid false splits (e.g. "Dr. Smith").
 */
function splitIntoSentences(text: string): string[] {
  const PLACEHOLDER = '\x01';
  // Mask periods in known abbreviations
  const safe = text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|approx|est)\./gi,
    (m) => m.slice(0, -1) + PLACEHOLDER);

  // Split at sentence boundary: [.!?] followed by whitespace + uppercase/quote
  const parts = safe.split(/(?<=[.!?])\s+(?=[A-Z"'])/);

  return parts
    .map((p) => p.replace(new RegExp(PLACEHOLDER, 'g'), '.').trim())
    .filter(Boolean);
}

/**
 * Split a sentence into intonation units at clause/phrase boundaries.
 *
 * Strategy:
 * 1. Split at every comma and semicolon (depth-aware: ignores commas inside
 *    parentheses or brackets).
 * 2. Merge leading fragments that contain fewer than 2 alphabetic words
 *    forward into the next segment, preventing over-fragmentation of short
 *    discourse markers like "However," or "Well,".
 */
function splitIntoUnits(sentence: string): string[] {
  // Step 1: depth-aware raw split at , and ;
  const rawParts: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of sentence) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    current += ch;
    if (depth === 0 && (ch === ',' || ch === ';')) {
      rawParts.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) rawParts.push(current.trim());
  if (rawParts.length === 0) return [sentence.trim()];

  // Step 2: merge short leading fragments (< 2 alpha words) into the next segment
  const units: string[] = [];
  let buffer = '';

  for (let i = 0; i < rawParts.length; i++) {
    buffer = buffer ? buffer + ' ' + rawParts[i] : rawParts[i];
    const wordCount = (buffer.match(/[a-zA-Z]+/g) ?? []).length;
    const isLast = i === rawParts.length - 1;

    if (wordCount >= 2 || isLast) {
      units.push(buffer.trim());
      buffer = '';
    }
    // else: fragment too short — keep accumulating
  }

  if (buffer.trim()) units.push(buffer.trim());
  return units.length > 0 ? units : [sentence.trim()];
}

/**
 * Assign an intonation mark to each unit within a sentence.
 *
 * Rules (falling is the default):
 *
 *   Tag question unit                 → 'omit'    (ambiguous speaker intent)
 *   Final unit + yes/no question      → 'rising'   (whole-sentence rising)
 *   Final unit (all other types)      → 'falling'  (statements, wh-questions,
 *                                                   imperatives)
 *   Non-final unit                    → 'rising'   (projects continuation)
 *
 * The non-final rule covers in one step:
 *   • initial subordinate clauses (If…, When…, Although…)
 *   • non-final items in lists
 *   • non-final coordinated clauses (…and / …but / …or)
 *   • non-final options in alternative questions
 */
function assignMarks(
  units: string[],
  sentType: SentenceType,
  isTagQ: boolean,
): IntonationMark[] {
  const marks: IntonationMark[] = [];

  // Index of the effective final unit (last non-tag unit)
  const finalIdx = isTagQ ? units.length - 2 : units.length - 1;
  const tagIdx   = isTagQ ? units.length - 1 : -1;

  for (let i = 0; i < units.length; i++) {
    if (i === tagIdx) {
      // Tag question: intonation is ambiguous — do not annotate
      marks.push('omit');
    } else if (i === finalIdx) {
      // Final unit: yes/no questions rise; everything else falls
      marks.push(sentType === 'yes-no-question' ? 'rising' : 'falling');
    } else {
      // Non-final unit: projects continuation → rising
      marks.push('rising');
    }
  }

  return marks;
}

/**
 * Main annotation entry point.
 * Returns a flat list of { text, intonation } units spanning the whole input.
 *
 * Pipeline: text → sentences → units per sentence → intonation marks
 */
export function annotateIntonation(
  text: string,
): Array<{ text: string; intonation: IntonationMark }> {
  const sentences = splitIntoSentences(text);
  const result: Array<{ text: string; intonation: IntonationMark }> = [];

  for (const sentence of sentences) {
    const sentType = classifySentence(sentence);
    const isTagQ   = detectTagQuestion(sentence);
    const units    = splitIntoUnits(sentence);
    const marks    = assignMarks(units, sentType, isTagQ);

    for (let i = 0; i < units.length; i++) {
      result.push({ text: units[i], intonation: marks[i] });
    }
  }

  return result;
}

// ─── Sentence stress ──────────────────────────────────────────────────────────

export function isSentenceStressed(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 1) return false;
  return !UNSTRESSED_WORDS.has(clean);
}

// ─── Complex sounds ───────────────────────────────────────────────────────────

// Lexical -ed adjectives that are NOT past-tense verbs.
// Each entry maps the bare lowercase form to its fixed -ed pronunciation.
// 'special' = /ɪd/ (extra syllable), 'voiced' = /d/, 'unvoiced' = /t/
const LEXICAL_ED_ADJECTIVES = new Map<string, ComplexSound['soundType']>([
  // Pure adjectives (no corresponding modern verb) — always /ɪd/
  ['wicked',  'special'],
  ['naked',   'special'],
  ['sacred',  'special'],
  ['ragged',  'special'],
  ['jagged',  'special'],
  ['rugged',  'special'],
  ['crabbed', 'special'],
  ['crooked', 'special'],
  // User-specified fixed pronunciations for dual-use forms
  ['learned', 'voiced'],   // adj /lɜːnd/ → /d/
  ['winged',  'voiced'],   // adj /wɪŋd/  → /d/
  ['legged',  'voiced'],   // adj /lɛɡd/  → /d/
  ['cursed',  'unvoiced'], // adj /kɜːst/ → /t/
  ['cussed',  'unvoiced'], // adj /kʌst/  → /t/
]);

// Words where compromise reliably distinguishes adjective (#Adjective, → /ɪd/)
// from past-tense verb (#PastTense, → standard phonological rule).
const COMPROMISE_TRUSTED_ED = new Set(['aged', 'blessed', 'dogged', 'beloved']);

// Non-verb words whose -ed ending should NOT be annotated.
// These would otherwise be false positives of the morphological rule.
const ED_BLOCKLIST = new Set(['hundred', 'kindred', 'hatred']);

/** Apply the standard phonological rule for -ed past-tense verbs. */
function classifyEdVerb(stem: string): ComplexSound['soundType'] {
  if (/[td]$/.test(stem)) return 'special';                                         // /ɪd/
  if (/[pkfsx]$/.test(stem) || stem.endsWith('sh') || stem.endsWith('ch')) return 'unvoiced'; // /t/
  return 'voiced';                                                                   // /d/
}

export function findComplexSounds(
  word: string,
  enableTh: boolean,
  enableS: boolean,
  enableEd: boolean,
  pastTenseWords?: Set<string>,
): ComplexSound[] {
  const sounds: ComplexSound[] = [];
  const lower = word.toLowerCase();
  const alpha = lower.replace(/[^a-z]/g, '');

  // th sounds
  if (enableTh) {
    const voicing = classifyThVoicing(alpha);
    let idx = 0;
    while ((idx = lower.indexOf('th', idx)) !== -1) {
      sounds.push({ type: 'th', soundType: voicing, start: idx, end: idx + 2 });
      idx += 2;
    }
  }

  // -ed endings
  // Use alpha (punctuation-stripped) for candidate detection so that words with trailing
  // punctuation (e.g. "walked," "added,") are correctly identified.
  // Use lower.lastIndexOf('ed') for the highlight position so it points into the original word.
  // Priority order:
  //   1. Hard-coded lexical adjectives (LEXICAL_ED_ADJECTIVES) — fixed soundType
  //   2. Compromise-trusted adjectives — /ɪd/ when NOT seen as past-tense in this text
  //   3. Standard past-tense verbs confirmed by compromise (or fallback if no POS data)
  const edPos = lower.lastIndexOf('ed');
  const isEdCandidate = enableEd && alpha.endsWith('ed') && !alpha.endsWith('eed') && alpha.length > 3 && edPos !== -1;
  if (isEdCandidate) {
    const lexicalType = LEXICAL_ED_ADJECTIVES.get(alpha);

    if (lexicalType !== undefined) {
      // Fixed lexical adjective pronunciation
      sounds.push({ type: 'ed', soundType: lexicalType, start: edPos, end: edPos + 2 });
    } else if (COMPROMISE_TRUSTED_ED.has(alpha) && !pastTenseWords?.has(alpha)) {
      // Appears only as adjective in this text (compromise did not tag it #PastTense) → /ɪd/
      sounds.push({ type: 'ed', soundType: 'special', start: edPos, end: edPos + 2 });
    } else if (!ED_BLOCKLIST.has(alpha)) {
      // Default: morphological rule — annotate any -ed not explicitly blocked.
      // Main false positives (wicked, naked, etc.) are already handled by LEXICAL_ED_ADJECTIVES.
      const stem = alpha.slice(0, -2);
      sounds.push({ type: 'ed', soundType: classifyEdVerb(stem), start: edPos, end: edPos + 2 });
    }
  }

  // -s endings (plurals and 3rd-person singular)
  // Use alpha for candidate detection to handle trailing punctuation (e.g. "plays,").
  const sPos = lower.lastIndexOf('s');
  const skipS = new Set([
    'this', 'was', 'has', 'is', 'his', 'its', 'plus', 'thus',
    'us', 'bus', 'yes', 'news', 'less', 'class', 'dress', 'miss',
  ]);
  if (enableS && alpha.endsWith('s') && !alpha.endsWith('ss') && alpha.length > 2 && !skipS.has(alpha) && sPos !== -1) {
    const stem = alpha.slice(0, -1);
    let soundType: ComplexSound['soundType'];
    if (/[sxz]$/.test(stem) || stem.endsWith('sh') || stem.endsWith('ch') || stem.endsWith('ge') || stem.endsWith('ce')) {
      soundType = 'special'; // /ɪz/
    } else if (/[ptkf]$/.test(stem) || stem.endsWith('th')) {
      soundType = 'unvoiced'; // /s/
    } else {
      soundType = 'voiced'; // /z/
    }
    sounds.push({ type: 's', soundType, start: sPos, end: sPos + 1 });
  }

  return sounds;
}

// ─── Linking ──────────────────────────────────────────────────────────────────

/**
 * Linking only occurs at meaningful phonetic boundaries:
 * - Consonant → Vowel: most common (e.g. "pick it up")
 * - Vowel → Vowel: intrusive linking (e.g. "go out")
 */
export function getLinkingType(word: string, nextWord?: string): 'consonant' | 'vowel' | undefined {
  if (!nextWord) return undefined;

  const curAlpha = word.replace(/[^a-zA-Z]/g, '');
  const nextAlpha = nextWord.replace(/[^a-zA-Z]/g, '');
  if (!curAlpha || !nextAlpha) return undefined;

  const lastChar = curAlpha[curAlpha.length - 1].toLowerCase();
  const firstNextChar = nextAlpha[0].toLowerCase();

  if (!isVowel(lastChar) && isAlpha(lastChar) && isVowel(firstNextChar)) {
    return 'consonant'; // consonant-to-vowel linking
  }
  if (isVowel(lastChar) && isVowel(firstNextChar)) {
    return 'vowel'; // vowel-to-vowel linking
  }
  return undefined;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

// Derive a simple intonation mark from a pause segment's context.
// Used when pausing is the active segmentation driver.
function intonationFromPause(segText: string, pauseAfter: PauseMarker | undefined): IntonationMark {
  if (pauseAfter === '///' || pauseAfter === undefined) {
    const trimmed = segText.trim();
    if (trimmed.endsWith('?')) {
      const first = trimmed.match(/[a-zA-Z]+/)?.[0]?.toLowerCase() ?? '';
      const WH = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'which', 'whose', 'whom']);
      return WH.has(first) ? 'falling' : 'rising';
    }
    return 'falling';
  }
  return 'rising'; // non-final unit → continuation
}

export function processText(text: string, visualizations: VisualizationSettings): ProcessedClause[] {
  // Run compromise once on the full text to get past-tense tags.
  // Used only for COMPROMISE_TRUSTED_ED words (aged, blessed, dogged, beloved) where
  // the adjective and verb forms have different -ed pronunciations.
  // General -ed detection now uses the morphological rule (Option B), not a compromise gate.
  let pastTenseWords: Set<string> | undefined;
  if (visualizations.soundsEd) {
    const tagged = (nlp(text).match('#PastTense').out('array') as string[]);
    pastTenseWords = new Set(tagged.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')));
  }

  // When pausing is enabled, use the pause-based segmentation.
  // Otherwise use the intonation-based segmentation.
  type Unit = { text: string; intonation: IntonationMark; pauseAfter?: PauseMarker };

  let units: Unit[];

  if (visualizations.pausing) {
    units = segmentWithPauses(text).map(({ text: segText, pauseAfter }) => ({
      text: segText,
      intonation: intonationFromPause(segText, pauseAfter),
      pauseAfter,
    }));
  } else {
    units = annotateIntonation(text).map((u) => ({ text: u.text, intonation: u.intonation }));
  }

  return units.map(({ text: unitText, intonation, pauseAfter }) => {
    const words = unitText.split(/\s+/).filter((w) => w.length > 0);

    const processedWords: ProcessedWord[] = words.map((word, index) => {
      const nextWord = index < words.length - 1 ? words[index + 1] : undefined;

      return {
        original: word,
        syllables: visualizations.wordStress
          ? splitIntoSyllables(word)
          : [{ text: word, isPrimaryStress: false }],
        isSentenceStressed: visualizations.sentenceStress ? isSentenceStressed(word) : false,
        complexSounds: findComplexSounds(word, visualizations.soundsTh, visualizations.soundsS, visualizations.soundsEd, pastTenseWords),
        linkingAfter:
          index < words.length - 1 && visualizations.linking
            ? getLinkingType(word, nextWord)
            : undefined,
      };
    });

    return { words: processedWords, intonation, pauseAfter };
  });
}
