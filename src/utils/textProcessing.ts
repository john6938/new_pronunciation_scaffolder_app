import { VisualizationSettings } from '../App';

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

export type ProcessedClause = {
  words: ProcessedWord[];
  intonation: 'rising' | 'falling' | 'level';
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

// Words with voiced 'th' /ð/
const VOICED_TH_WORDS = new Set([
  'the', 'this', 'that', 'these', 'those', 'they', 'them', 'their',
  'there', 'then', 'though', 'thus', 'than', 'with', 'either',
  'neither', 'whether', 'together', 'other', 'another', 'brother',
  'mother', 'father', 'weather', 'feather', 'leather', 'bother',
  'further', 'gather', 'rather', 'soothe', 'breathe', 'loathe', 'bathe',
]);

// ─── Syllabification ──────────────────────────────────────────────────────────

/**
 * Split a word into syllables preserving all punctuation.
 * The syllable texts concatenate to exactly reproduce the original word.
 */
export function splitIntoSyllables(word: string): ProcessedSyllable[] {
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

  // Treat trailing silent 'e' as not a separate nucleus (e.g. "make", "time")
  if (
    nuclei.length > 1 &&
    lc[lc.length - 1] === 'e' &&
    lc.length >= 2 &&
    !isVowel(lc[lc.length - 2])
  ) {
    nuclei.pop();
  }

  // Monosyllabic — return as single syllable
  if (nuclei.length <= 1) {
    const stressed = getStressIndex(lc, 1) === 0;
    return [{ text: leadPunct + core + trailPunct, isPrimaryStress: stressed }];
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

/** Return the 0-based index of the primary stressed syllable */
function getStressIndex(word: string, syllableCount: number): number {
  const clean = word.replace(/[^a-z]/g, '');

  if (STRESS_DICT[clean] !== undefined) {
    return Math.min(STRESS_DICT[clean], syllableCount - 1);
  }

  if (syllableCount <= 1) return 0;

  // Suffix rules (order matters — check most specific first)
  if (/tion$|sion$/.test(clean)) return Math.max(0, syllableCount - 2);
  if (/ic$|ical$/.test(clean)) return Math.max(0, syllableCount - 2);
  if (/ity$|ify$|ology$|ography$/.test(clean)) return Math.max(0, syllableCount - 3);
  if (/ive$|ous$|ful$|less$|ness$|ment$/.test(clean)) return 0;

  return 0; // default: first syllable
}

// ─── Intonation ───────────────────────────────────────────────────────────────

export function getIntonation(clause: string): 'rising' | 'falling' | 'level' {
  const t = clause.trim();
  if (t.endsWith('?')) return 'rising';
  if (t.endsWith('.') || t.endsWith('!')) return 'falling';
  return 'level';
}

// ─── Sentence stress ──────────────────────────────────────────────────────────

export function isSentenceStressed(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 1) return false;
  return !UNSTRESSED_WORDS.has(clean);
}

// ─── Complex sounds ───────────────────────────────────────────────────────────

export function findComplexSounds(word: string): ComplexSound[] {
  const sounds: ComplexSound[] = [];
  const lower = word.toLowerCase();
  const alpha = lower.replace(/[^a-z]/g, '');

  // th sounds
  let idx = 0;
  while ((idx = lower.indexOf('th', idx)) !== -1) {
    sounds.push({
      type: 'th',
      soundType: VOICED_TH_WORDS.has(alpha) ? 'voiced' : 'unvoiced',
      start: idx,
      end: idx + 2,
    });
    idx += 2;
  }

  // -ed endings (not -eed, -ied as separate vowel sound)
  if (lower.endsWith('ed') && !lower.endsWith('eed') && alpha.length > 3) {
    const stem = alpha.slice(0, -2);
    let soundType: ComplexSound['soundType'];
    if (/[td]$/.test(stem)) {
      soundType = 'special'; // /ɪd/ — extra syllable
    } else if (/[pkfsx]$/.test(stem) || stem.endsWith('sh') || stem.endsWith('ch')) {
      soundType = 'unvoiced'; // /t/
    } else {
      soundType = 'voiced'; // /d/
    }
    sounds.push({ type: 'ed', soundType, start: word.length - 2, end: word.length });
  }

  // -s endings (plurals and 3rd-person singular)
  const skipS = new Set([
    'this', 'was', 'has', 'is', 'his', 'its', 'plus', 'thus',
    'us', 'bus', 'yes', 'news', 'less', 'class', 'dress', 'miss',
  ]);
  if (lower.endsWith('s') && !lower.endsWith('ss') && alpha.length > 2 && !skipS.has(alpha)) {
    const stem = alpha.slice(0, -1);
    let soundType: ComplexSound['soundType'];
    if (/[sxz]$/.test(stem) || stem.endsWith('sh') || stem.endsWith('ch') || stem.endsWith('ge') || stem.endsWith('ce')) {
      soundType = 'special'; // /ɪz/
    } else if (/[ptkf]$/.test(stem) || stem.endsWith('th')) {
      soundType = 'unvoiced'; // /s/
    } else {
      soundType = 'voiced'; // /z/
    }
    sounds.push({ type: 's', soundType, start: word.length - 1, end: word.length });
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

// ─── Clause splitting ─────────────────────────────────────────────────────────

export function splitIntoClauses(text: string): string[] {
  const parts: string[] = [];
  // Match runs of non-terminal punctuation then optional terminal punctuation
  const re = /[^.!?;,]+[.!?;,]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const clause = match[0].trim();
    if (clause) parts.push(clause);
  }
  return parts.length > 0 ? parts : [text.trim()];
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function processText(text: string, visualizations: VisualizationSettings): ProcessedClause[] {
  const clauses = splitIntoClauses(text);

  return clauses.map((clauseText) => {
    const words = clauseText.split(/\s+/).filter((w) => w.length > 0);

    const processedWords: ProcessedWord[] = words.map((word, index) => {
      const nextWord = index < words.length - 1 ? words[index + 1] : undefined;

      return {
        original: word,
        syllables: visualizations.wordStress
          ? splitIntoSyllables(word)
          : [{ text: word, isPrimaryStress: false }],
        isSentenceStressed: visualizations.sentenceStress ? isSentenceStressed(word) : false,
        complexSounds: visualizations.complexSounds ? findComplexSounds(word) : [],
        linkingAfter:
          index < words.length - 1 && visualizations.linking
            ? getLinkingType(word, nextWord)
            : undefined,
      };
    });

    return {
      words: processedWords,
      intonation: visualizations.intonation ? getIntonation(clauseText) : 'level',
    };
  });
}
