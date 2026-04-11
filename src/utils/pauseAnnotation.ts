/**
 * pauseAnnotation.ts
 *
 * Prosodic pause annotation for read-aloud performance.
 *
 * Implementation rationale
 * ────────────────────────
 * True dependency parsers (spaCy, Stanford CoreNLP, Stanza) require Python
 * runtimes or WASM bundles exceeding 50–200 MB — impractical for a
 * client-side React application. Instead, this module approximates the
 * obligatory head–dependent relations relevant to prosodic pause placement
 * using closed-class word lists (determiners, prepositions, auxiliaries).
 * These function words are finite, stable, and are precisely the items that
 * open the dependency arcs most likely to be violated by injudicious pausing:
 *
 *   DET  → NOUN    (determiner to nominal head)
 *   PREP → NP      (preposition to its NP complement)
 *   AUX  → VERB    (auxiliary to main verb)
 *
 * Arc tension (estimated count of unresolved arcs spanning a gap) is the
 * proxy for syntactic processing load used in minor-pause licensing.
 *
 * Pipeline:
 *   Layer 1 — sentence-final punctuation ( . ? ! )  →  ///
 *   Layer 2 — strong internal punctuation ( ; : )    →  //
 *             commas                                 →  // tentative
 *   Layer 3 — dependency-informed minor pauses       →  /
 *   Post    — downgrade or suppress tentative comma
 *             breaks based on arc tension and preceding
 *             segment content-word count
 */

export type PauseMarker = '/' | '//' | '///';

export interface PauseSegment {
  /** Verbatim text of this segment (original words, whitespace-normalised). */
  text: string;
  /** Pause that follows this segment, or undefined for the final segment. */
  pauseAfter: PauseMarker | undefined;
}

// ─── Tunable configuration ────────────────────────────────────────────────────
// All thresholds are isolated here to allow empirical tuning against
// aligned text–speech data.

export const PAUSE_CONFIG = {
  /** Minimum word-token span between pauses before a / is considered. */
  minSpanForMinor: 6,
  /** Span above which / is inserted if arc load also warrants it. */
  targetSpanForMinor: 10,
  /** Hard ceiling — insert / at earliest licit position once span reaches this. */
  maxSpanWithoutPause: 15,
  /**
   * Sliding-window mean arc tension threshold.
   * A / is inserted when span ≥ target AND mean tension ≥ this value.
   */
  arcLoadThreshold: 1.5,
  /** Token window for the sliding mean arc-tension calculation. */
  arcWindow: 5,
  /**
   * Comma-downgrade threshold. If arc tension at the comma position
   * is ≤ this value the tentative // is downgraded to /.
   */
  commaDowngradeThreshold: 0.8,
};

// ─── Closed-class word lists ──────────────────────────────────────────────────
// Each set corresponds to one obligatory dependency arc type.

const DETERMINERS = new Set([
  'a', 'an', 'the',
  'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'some', 'any', 'every', 'each', 'no',
  'another', 'other', 'both', 'either', 'neither',
  'all', 'few', 'several', 'many', 'much',
  'more', 'most', 'less', 'least', 'enough',
]);

const PREPOSITIONS = new Set([
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down',
  'into', 'onto', 'upon', 'of', 'off', 'out',
  'over', 'under', 'along', 'around', 'behind',
  'beneath', 'beside', 'beyond', 'despite',
  'except', 'near', 'opposite', 'past',
  'since', 'throughout', 'toward', 'towards',
  'underneath', 'unlike', 'until', 'within',
  'without', 'across', 'among', 'amongst',
  'via', 'per', 'plus',
]);

const AUXILIARIES = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did',
  'have', 'has', 'had',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
  "isn't", "aren't", "wasn't", "weren't",
  "don't", "doesn't", "didn't",
  "haven't", "hasn't", "hadn't",
  "won't", "wouldn't", "shan't", "shouldn't",
  "can't", "couldn't", "mightn't", "mustn't",
]);

// ─── Tokenisation ─────────────────────────────────────────────────────────────

interface Token {
  text: string;
  lower: string;
  isPunct: boolean;
  isWord: boolean;
}

function tokenise(text: string): Token[] {
  const tokens: Token[] = [];
  // Words (including apostrophes), single punctuation chars, whitespace (skipped)
  const re = /[a-zA-Z']+|[^\w\s]|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0];
    if (/^\s+$/.test(t)) continue;
    tokens.push({
      text: t,
      lower: t.toLowerCase(),
      isPunct: /^[^\w\s]$/.test(t),
      isWord: /[a-zA-Z]/.test(t),
    });
  }
  return tokens;
}

/**
 * Reconstruct text from a token array.
 * Punctuation is attached to the preceding word without a space,
 * matching the surface form of the original text.
 */
function reconstruct(tokens: Token[]): string {
  const parts: string[] = [];
  for (const t of tokens) {
    if (t.isPunct && parts.length > 0) {
      parts[parts.length - 1] += t.text;
    } else {
      parts.push(t.text);
    }
  }
  return parts.join(' ');
}

// ─── Arc tension ──────────────────────────────────────────────────────────────

/**
 * Estimate dependency arc tension at the inter-token gap immediately AFTER
 * tokens[i].
 *
 * Returns the estimated count of unresolved head–dependent arcs that span
 * this position. A value > 0 means a pause here is syntactically illicit.
 *
 * Immediate arcs (opened by the current token):
 *   DET  → +2  (requires NOUN to the right)
 *   PREP → +2  (requires NP complement to the right)
 *   AUX  → +1  (requires main verb to the right)
 *
 * Lookback arcs (unresolved openers within the preceding 7 tokens):
 *   Each unresolved DET or PREP → +1
 *   Resolved = a content word (non-function, non-punct) appeared between
 *              the opener and tokens[i].
 */
function arcTensionAfter(tokens: Token[], i: number): number {
  let tension = 0;
  const tok = tokens[i];

  if (DETERMINERS.has(tok.lower)) tension += 2;
  if (PREPOSITIONS.has(tok.lower)) tension += 2;
  if (AUXILIARIES.has(tok.lower)) tension += 1;

  for (let k = i - 1; k >= Math.max(0, i - 7); k--) {
    const prev = tokens[k];
    if (prev.isPunct) break;
    if (!DETERMINERS.has(prev.lower) && !PREPOSITIONS.has(prev.lower)) continue;

    // Arc is resolved if a content word appeared between position k and i
    let resolved = false;
    for (let j = k + 1; j <= i; j++) {
      const t = tokens[j];
      if (
        t.isWord &&
        !DETERMINERS.has(t.lower) &&
        !PREPOSITIONS.has(t.lower) &&
        !AUXILIARIES.has(t.lower)
      ) {
        resolved = true;
        break;
      }
    }
    if (!resolved) tension += 1;
  }

  return tension;
}

function slidingMean(tensions: number[], i: number, window: number): number {
  const start = Math.max(0, i - window + 1);
  const slice = tensions.slice(start, i + 1);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// ─── Sentence splitting ───────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  const MASK = '\x01';
  const safe = text.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|approx|est)\./gi,
    (m) => m.slice(0, -1) + MASK,
  );
  return safe
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map((p) => p.replace(new RegExp(MASK, 'g'), '.').trim())
    .filter(Boolean);
}

// ─── Core sentence processor ──────────────────────────────────────────────────

type TentativeMark = PauseMarker | 'comma-tentative';

interface RawSegment {
  tokens: Token[];
  pauseAfter: TentativeMark | undefined;
}

/**
 * Process a single sentence into raw segments with tentative pause markers.
 * Applies Layers 1, 2, and 3.
 */
function processSentence(sentence: string, cfg: typeof PAUSE_CONFIG): RawSegment[] {
  const tokens = tokenise(sentence);
  if (tokens.length === 0) return [];

  // Pre-compute arc tensions over the full token sequence (absolute indices).
  // Minor-pause detection uses these values to preserve inter-segment context.
  const tensions = tokens.map((_, i) => arcTensionAfter(tokens, i));

  // ── Layers 1 & 2: locate punctuation split points ──
  const splits = new Map<number, TentativeMark>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].text;
    if (['.', '?', '!'].includes(t))  splits.set(i, '///');
    else if ([';', ':'].includes(t))   splits.set(i, '//');
    else if (t === ',')                splits.set(i, 'comma-tentative');
  }

  // Build segment index ranges [start, end] inclusive (including terminal punct)
  const ranges: Array<{ start: number; end: number; mark: TentativeMark | undefined }> = [];
  let segStart = 0;
  for (const idx of [...splits.keys()].sort((a, b) => a - b)) {
    ranges.push({ start: segStart, end: idx, mark: splits.get(idx) });
    segStart = idx + 1;
  }
  if (segStart < tokens.length) {
    ranges.push({ start: segStart, end: tokens.length - 1, mark: undefined });
  }

  // ── Layer 3: inject minor pauses within long ranges ──
  const result: RawSegment[] = [];

  for (const range of ranges) {
    const subGroups = splitAtMinorPauses(tokens, tensions, range.start, range.end, cfg);
    for (let j = 0; j < subGroups.length; j++) {
      result.push({
        tokens: subGroups[j],
        pauseAfter: j < subGroups.length - 1 ? '/' : range.mark,
      });
    }
  }

  return result;
}

/**
 * Attempt to insert minor pause breaks within tokens[start..end].
 * Uses absolute indices so pre-computed tensions (full-sentence context)
 * remain valid for sub-ranges.
 * Returns an array of token sub-arrays (at least one element).
 */
function splitAtMinorPauses(
  allTokens: Token[],
  tensions: number[],
  start: number,
  end: number,
  cfg: typeof PAUSE_CONFIG,
): Token[][] {
  const rangeLen = end - start + 1;
  if (rangeLen < cfg.minSpanForMinor) return [allTokens.slice(start, end + 1)];

  const groups: Token[][] = [];
  let segStart = start;

  for (let i = start + cfg.minSpanForMinor - 1; i < end; i++) {
    const span = i - segStart + 1;
    const force = span >= cfg.maxSpanWithoutPause;
    const mean = slidingMean(tensions, i, cfg.arcWindow);
    const meetsLoad = force || (span >= cfg.targetSpanForMinor && mean >= cfg.arcLoadThreshold);
    const licit = tensions[i] === 0 && !allTokens[i].isPunct;

    if (meetsLoad && licit) {
      groups.push(allTokens.slice(segStart, i + 1));
      segStart = i + 1;
      i = segStart + cfg.minSpanForMinor - 2; // reset search window
    }
  }

  if (segStart <= end) groups.push(allTokens.slice(segStart, end + 1));
  return groups.length > 0 ? groups : [allTokens.slice(start, end + 1)];
}

// ─── Post-processing: resolve comma pauses ────────────────────────────────────

/**
 * Resolve 'comma-tentative' markers:
 *
 *   content words in segment < 2  → merge with following segment (suppress pause)
 *   arc tension at comma ≤ threshold → downgrade to /
 *   otherwise                        → promote to //
 *
 * Arc tension is re-computed locally for each segment because the global
 * context is no longer available at this stage. Within-segment context is
 * sufficient for comma boundaries (which are themselves clause/phrase edges).
 */
function resolveCommaPauses(segments: RawSegment[], cfg: typeof PAUSE_CONFIG): RawSegment[] {
  const result: RawSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.pauseAfter !== 'comma-tentative') {
      result.push({ tokens: seg.tokens, pauseAfter: seg.pauseAfter as PauseMarker | undefined });
      continue;
    }

    const localTensions = seg.tokens.map((_, j) => arcTensionAfter(seg.tokens, j));
    const commaTension  = localTensions[seg.tokens.length - 1] ?? 0;
    const contentWords  = seg.tokens.filter((t) => t.isWord && !t.isPunct).length;

    if (contentWords < 2 && i + 1 < segments.length) {
      // Suppress: merge into the following segment
      segments[i + 1] = {
        tokens: [...seg.tokens, ...segments[i + 1].tokens],
        pauseAfter: segments[i + 1].pauseAfter,
      };
    } else if (commaTension <= cfg.commaDowngradeThreshold) {
      result.push({ tokens: seg.tokens, pauseAfter: '/' });
    } else {
      result.push({ tokens: seg.tokens, pauseAfter: '//' });
    }
  }

  return result;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Annotate text with prosodic pause markers.
 *
 * Returns an array of PauseSegments whose `text` fields, concatenated with
 * a single space, reproduce the original text content verbatim (modulo
 * whitespace normalisation).
 */
export function segmentWithPauses(
  text: string,
  cfg = PAUSE_CONFIG,
): PauseSegment[] {
  const allRaw: RawSegment[] = [];

  for (const sentence of splitSentences(text)) {
    allRaw.push(...processSentence(sentence, cfg));
  }

  const resolved = resolveCommaPauses(allRaw, cfg);

  return resolved.map(({ tokens, pauseAfter }) => ({
    text: reconstruct(tokens),
    pauseAfter: pauseAfter as PauseMarker | undefined,
  }));
}
