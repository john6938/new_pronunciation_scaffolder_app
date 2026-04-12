import { useEffect, useRef, useState } from 'react';
import { VisualizationSettings } from '../App';
import { processText, ProcessedClause, ProcessedWord, IntonationMark, PauseMarker } from '../utils/textProcessing';

type Props = {
  text: string;
  visualizations: VisualizationSettings;
  fontSize: number;
  scrollSpeed: number;
  isScrolling: boolean;
};

const COMPLEX_SOUND_COLORS: Record<string, string> = {
  voiced: 'bg-blue-200',
  unvoiced: 'bg-orange-200',
  special: 'bg-purple-200',
};

const LINKING_COLORS: Record<string, string> = {
  connect: 'border-blue-500',
  insertion: 'border-green-500',
  deletion: 'border-black',
};

export function TextDisplay({ text, visualizations, fontSize, scrollSpeed, isScrolling }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clauses, setClauses] = useState<ProcessedClause[]>([]);

  useEffect(() => {
    setClauses(processText(text, visualizations));
  }, [text, visualizations]);

  // Auto-scroll
  useEffect(() => {
    if (!isScrolling || scrollSpeed === 0 || !containerRef.current) return;
    const pxPerInterval = scrollSpeed * 0.8;
    const id = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop += pxPerInterval;
      }
    }, 50);
    return () => clearInterval(id);
  }, [isScrolling, scrollSpeed]);

  const PauseDisplay = ({ marker }: { marker: PauseMarker }) => {
    const color =
      marker === '///' ? 'text-gray-700' :
      marker === '//'  ? 'text-gray-500' : 'text-gray-400';
    return (
      <span
        className={`${color} font-mono select-none`}
        style={{ fontSize: `${Math.round(fontSize * 0.6)}px`, verticalAlign: 'middle', margin: '0 0.2em' }}
        aria-label={
          marker === '///' ? 'utterance boundary' :
          marker === '//'  ? 'major pause' : 'minor pause'
        }
      >
        {marker}
      </span>
    );
  };

  // Custom SVG diagonal straight arrows — clean diagonal line with arrowhead.
  const IntonationArrow = ({ type }: { type: IntonationMark }) => {
    if (type === 'omit') return null;
    const iconSize = Math.round(fontSize * 0.6);
    const isRising = type === 'rising';
    return (
      <span
        className="bg-blue-600 text-white rounded select-none inline-flex items-center justify-center"
        style={{ width: iconSize + 6, height: iconSize + 6, verticalAlign: 'middle', marginLeft: '0.15em', flexShrink: 0 }}
        aria-label={isRising ? 'rising intonation' : 'falling intonation'}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isRising ? (
            <>
              <line x1="3" y1="13" x2="13" y2="3" />
              <polyline points="7,3 13,3 13,9" />
            </>
          ) : (
            <>
              <line x1="3" y1="3" x2="13" y2="13" />
              <polyline points="7,13 13,13 13,7" />
            </>
          )}
        </svg>
      </span>
    );
  };

  /**
   * Render a single word. Syllables concatenate to the original string, so we
   * can compute absolute character offsets for complex sound highlighting.
   * This handles word stress + complex sounds simultaneously.
   */
  /**
   * linkingBefore: the linkingAfter value of the preceding word, used to underline
   * only the first alpha character of this word (the visual bridge from the previous word).
   */
  const renderWord = (word: ProcessedWord, wIdx: number, cIdx: number, linkingBefore?: string) => {
    const wrapClass = [
      'inline',
      word.isSentenceStressed ? 'font-bold text-red-600' : '',
    ].filter(Boolean).join(' ');

    // Precompute start offset of each syllable within the original word string
    const syllableOffsets = word.syllables.reduce<number[]>((acc, syl, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + word.syllables[i - 1].text.length);
      return acc;
    }, []);

    // Find absolute index of the last alpha char in the full word (for linkingAfter)
    const fullText = word.syllables.map((s) => s.text).join('');
    let lastAlphaAbs = -1;
    for (let i = fullText.length - 1; i >= 0; i--) {
      if (/[a-zA-Z]/.test(fullText[i])) { lastAlphaAbs = i; break; }
    }
    let firstAlphaAbs = -1;
    for (let i = 0; i < fullText.length; i++) {
      if (/[a-zA-Z]/.test(fullText[i])) { firstAlphaAbs = i; break; }
    }

    return (
      <span key={`${cIdx}-${wIdx}`} className={wrapClass}>
        {word.syllables.map((syl, sIdx) => {
          const sylStart = syllableOffsets[sIdx];
          const sylClass = syl.isPrimaryStress && visualizations.wordStress
            ? 'font-bold bg-yellow-300 rounded-sm'
            : '';

          // Character-level rendering (complex sounds or linking borders needed)
          const needsCharLevel =
            ((visualizations.soundsTh || visualizations.soundsS || visualizations.soundsEd) && word.complexSounds.length > 0) ||
            word.linkingAfter != null ||
            linkingBefore != null;

          if (needsCharLevel) {
            return (
              <span key={sIdx} className={sylClass}>
                {syl.text.split('').map((ch, chIdx) => {
                  const absIdx = sylStart + chIdx;
                  const cs = word.complexSounds.find(
                    (s) => absIdx >= s.start && absIdx < s.end
                  );

                  // Linking border: last alpha char of word (linkingAfter) or first alpha char (linkingBefore)
                  let linkType: string | undefined;
                  if (word.linkingAfter && absIdx === lastAlphaAbs) linkType = word.linkingAfter;
                  else if (linkingBefore && absIdx === firstAlphaAbs) linkType = linkingBefore;

                  const classes = [
                    cs ? COMPLEX_SOUND_COLORS[cs.soundType] : '',
                    linkType ? `border-b-4 ${LINKING_COLORS[linkType]}` : '',
                  ].filter(Boolean).join(' ');

                  return <span key={chIdx} className={classes || undefined}>{ch}</span>;
                })}
              </span>
            );
          }

          return <span key={sIdx} className={sylClass}>{syl.text}</span>;
        })}
      </span>
    );
  };


  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-12"
      style={{ fontSize: `${fontSize}px`, lineHeight: 2 }}
    >
      <div className="max-w-4xl mx-auto">
        {clauses.map((clause, cIdx) => (
          <span key={cIdx} className="inline">
            {clause.words.map((word, wIdx) => {
              const prevLinkType = wIdx > 0 ? clause.words[wIdx - 1].linkingAfter : undefined;
              return (
                <span key={`${cIdx}-${wIdx}`}>
                  {renderWord(word, wIdx, cIdx, prevLinkType)}
                  {wIdx < clause.words.length - 1 && (
                    word.linkingAfter
                      ? <span className={`border-b-4 ${LINKING_COLORS[word.linkingAfter]}`}>{' '}</span>
                      : ' '
                  )}
                </span>
              );
            })}
            {visualizations.pausing && clause.pauseAfter && <PauseDisplay marker={clause.pauseAfter} />}
            {visualizations.intonation && <IntonationArrow type={clause.intonation} />}
            {' '}
          </span>
        ))}
      </div>
    </div>
  );
}
