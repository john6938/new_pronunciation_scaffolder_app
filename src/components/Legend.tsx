import { useState } from 'react';
import { HelpCircle, X, TrendingUp, TrendingDown } from 'lucide-react';
import { VisualizationSettings } from '../App';

type Props = { visualizations: VisualizationSettings };

export function Legend({ visualizations }: Props) {
  const [open, setOpen] = useState(false);
  const anyActive = Object.values(visualizations).some(Boolean);

  if (!anyActive) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition z-20"
        aria-label="Show legend"
      >
        <HelpCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 z-20 max-h-[80vh] overflow-y-auto text-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Legend</h3>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3">
        {visualizations.intonation && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Intonation</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded inline-flex items-center justify-center select-none" style={{ width: 18, height: 18 }}><TrendingUp size={13} strokeWidth={2.5} /></span>
                <span>Rising — yes/no questions, non-final clauses &amp; list items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded inline-flex items-center justify-center select-none" style={{ width: 18, height: 18 }}><TrendingDown size={13} strokeWidth={2.5} /></span>
                <span>Falling — statements, wh-questions, final clauses</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-base leading-none">—</span>
                <span>No mark — tag questions (ambiguous intent)</span>
              </div>
            </div>
          </div>
        )}

        {visualizations.sentenceStress && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Sentence Stress</h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-red-600">word</span>
              <span>Content / stressed word</span>
            </div>
          </div>
        )}

        {visualizations.wordStress && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Word Stress</h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold bg-yellow-300 px-1 rounded-sm">syl</span>
              <span>Primary stressed syllable</span>
            </div>
          </div>
        )}

        {visualizations.soundsTh && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Sounds — th</h4>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="bg-blue-200 px-1 rounded">voiced /ð/ — <i>the, this, that</i></span>
              <span className="bg-orange-200 px-1 rounded">unvoiced /θ/ — <i>think, three</i></span>
            </div>
          </div>
        )}

        {visualizations.soundsEd && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Sounds — -ed</h4>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="bg-blue-200 px-1 rounded">/d/ — <i>played</i></span>
              <span className="bg-orange-200 px-1 rounded">/t/ — <i>walked</i></span>
              <span className="bg-purple-200 px-1 rounded">/ɪd/ — <i>wanted</i></span>
            </div>
          </div>
        )}

        {visualizations.soundsS && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Sounds — -s</h4>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="bg-blue-200 px-1 rounded">/z/ — <i>plays</i></span>
              <span className="bg-orange-200 px-1 rounded">/s/ — <i>walks</i></span>
              <span className="bg-purple-200 px-1 rounded">/ɪz/ — <i>watches</i></span>
            </div>
          </div>
        )}

        {visualizations.pausing && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Pausing</h4>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-2"><span className="text-gray-400">/</span><span className="font-sans">Minor pause — within clause</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-500">//</span><span className="font-sans">Major pause — clause boundary</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-700">///</span><span className="font-sans">Utterance boundary — sentence end</span></div>
            </div>
          </div>
        )}

        {visualizations.linking && (
          <div>
            <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500 mb-1">Linking</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="border-b-4 border-blue-500 px-1">word</span>
                <span>Consonant → vowel linking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="border-b-4 border-green-500 px-1">word</span>
                <span>Vowel → vowel linking</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
