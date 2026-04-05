import { VisualizationSettings } from '../App';
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

type Props = {
  visualizations: VisualizationSettings;
  setVisualizations: (v: VisualizationSettings) => void;
};

type Option = {
  key: keyof VisualizationSettings;
  label: string;
  description: string;
  example: React.ReactNode;
  isDefault?: boolean;
};

const OPTIONS: Option[] = [
  {
    key: 'intonation',
    label: 'Intonation',
    description: 'Arrows showing pitch direction at clause boundaries',
    isDefault: true,
    example: (
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1"><ArrowUp size={13} className="text-blue-600" /> Rising</span>
        <span className="flex items-center gap-1"><ArrowDown size={13} className="text-blue-600" /> Falling</span>
        <span className="flex items-center gap-1"><ArrowRight size={13} className="text-blue-600" /> Level</span>
      </div>
    ),
  },
  {
    key: 'sentenceStress',
    label: 'Sentence Stress',
    description: 'Content words shown in bold red',
    isDefault: true,
    example: (
      <div className="mt-2 text-xs">
        Today I will <span className="font-bold text-red-600">talk</span> about <span className="font-bold text-red-600">effective</span> <span className="font-bold text-red-600">communication</span>.
      </div>
    ),
  },
  {
    key: 'wordStress',
    label: 'Word Stress',
    description: 'Primary stressed syllable in bold with yellow background',
    isDefault: true,
    example: (
      <div className="mt-2 text-xs">
        pre·<span className="font-bold bg-yellow-300 px-0.5 rounded-sm">sen</span>·ta·tion &nbsp;
        com·<span className="font-bold bg-yellow-300 px-0.5 rounded-sm">mu</span>·ni·ca·tion
      </div>
    ),
  },
  {
    key: 'complexSounds',
    label: 'Complex Sounds',
    description: 'Colour-coded backgrounds for th, -ed, and -s endings',
    example: (
      <div className="mt-2 text-xs space-y-1">
        <div className="flex gap-2 flex-wrap">
          <span className="bg-blue-200 px-1 rounded">voiced</span>
          <span className="bg-orange-200 px-1 rounded">unvoiced</span>
          <span className="bg-purple-200 px-1 rounded">special</span>
        </div>
        <div className="text-gray-500">th · -ed · -s</div>
      </div>
    ),
  },
  {
    key: 'linking',
    label: 'Linking',
    description: 'Underlines where words link phonetically',
    example: (
      <div className="mt-2 text-xs flex gap-4">
        <span className="border-b-4 border-blue-500">consonant→vowel</span>
        <span className="border-b-4 border-green-500">vowel→vowel</span>
      </div>
    ),
  },
];

export function VisualizationOptions({ visualizations, setVisualizations }: Props) {
  const toggle = (key: keyof VisualizationSettings) =>
    setVisualizations({ ...visualizations, [key]: !visualizations[key] });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-700">Visualisation Options</h2>
        <span className="text-xs text-gray-400">Defaults: first three on</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
              visualizations[opt.key]
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={visualizations[opt.key]}
              onChange={() => toggle(opt.key)}
              className="mt-0.5 w-4 h-4 accent-blue-500 shrink-0"
            />
            <div>
              <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                {opt.label}
                {opt.isDefault && (
                  <span className="text-xs text-blue-500 font-normal">default</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
              {opt.example}
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
