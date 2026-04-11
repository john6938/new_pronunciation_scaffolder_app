import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { VisualizationSettings } from '../App';
import { processText, ProcessedClause, ProcessedWord, IntonationMark } from '../utils/textProcessing';

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
  consonant: 'border-blue-500',
  vowel: 'border-green-500',
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

  // Lucide icons render identically on all platforms — no Unicode emoji variation.
  // Both arrows appear as white icons inside a blue rounded box.
  const IntonationArrow = ({ type }: { type: IntonationMark }) => {
    if (type === 'omit') return null;
    const iconSize = Math.round(fontSize * 0.6);
    const Icon = type === 'rising' ? TrendingUp : TrendingDown;
    return (
      <span
        className="bg-blue-600 text-white rounded select-none inline-flex items-center justify-center"
        style={{ width: iconSize + 6, height: iconSize + 6, verticalAlign: 'middle', marginLeft: '0.15em', flexShrink: 0 }}
        aria-label={type === 'rising' ? 'rising intonation' : 'falling intonation'}
      >
        <Icon size={iconSize} strokeWidth={2.5} />
      </span>
    );
  };

  /**
   * Render a single word. Syllables concatenate to the original string, so we
   * can compute absolute character offsets for complex sound highlighting.
   * This handles word stress + complex sounds simultaneously.
   */
  const renderWord = (word: ProcessedWord, wIdx: number, cIdx: number) => {
    const wrapClass = [
      'inline',
      word.isSentenceStressed ? 'font-bold text-red-600' : '',
      word.linkingAfter ? `border-b-4 ${LINKING_COLORS[word.linkingAfter]}` : '',
    ].filter(Boolean).join(' ');

    // Precompute start offset of each syllable within the original word string
    const syllableOffsets = word.syllables.reduce<number[]>((acc, syl, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + word.syllables[i - 1].text.length);
      return acc;
    }, []);

    return (
      <span key={`${cIdx}-${wIdx}`} className={wrapClass}>
        {word.syllables.map((syl, sIdx) => {
          const sylStart = syllableOffsets[sIdx];
          const sylClass = syl.isPrimaryStress && visualizations.wordStress
            ? 'font-bold bg-yellow-300 rounded-sm'
            : '';

          // Character-level rendering for complex sounds
          if (visualizations.complexSounds && word.complexSounds.length > 0) {
            return (
              <span key={sIdx} className={sylClass}>
                {syl.text.split('').map((ch, chIdx) => {
                  const absIdx = sylStart + chIdx;
                  const cs = word.complexSounds.find(
                    (s) => absIdx >= s.start && absIdx < s.end
                  );
                  return (
                    <span key={chIdx} className={cs ? COMPLEX_SOUND_COLORS[cs.soundType] : ''}>
                      {ch}
                    </span>
                  );
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
            {clause.words.map((word, wIdx) => (
              <span key={`${cIdx}-${wIdx}`}>
                {renderWord(word, wIdx, cIdx)}
                {wIdx < clause.words.length - 1 && ' '}
              </span>
            ))}
            {visualizations.intonation && <IntonationArrow type={clause.intonation} />}
            {' '}
          </span>
        ))}
      </div>
    </div>
  );
}
