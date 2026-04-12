import { useState } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, Gauge, Play, Pause, Volume2, Square, Info } from 'lucide-react';
import { SpeechSettings } from '../utils/useSpeech';

const TTS_NOTE = 'Voice and pitch choices vary with operating system. Pitch control works on iOS and desktop. On Android, try selecting a different voice.';

function VoiceInfoTip() {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onTouchStart={(e) => { e.preventDefault(); setVisible((v) => !v); }}
        onBlur={() => setVisible(false)}
        aria-label={TTS_NOTE}
        className="text-gray-400 hover:text-gray-600 transition p-1"
      >
        <Info size={15} />
      </button>
      {visible && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none text-center leading-snug">
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
          {TTS_NOTE}
        </span>
      )}
    </span>
  );
}

type Props = {
  fontSize: number;
  setFontSize: (size: number) => void;
  scrollSpeed: number;
  setScrollSpeed: (speed: number) => void;
  isScrolling: boolean;
  setIsScrolling: (v: boolean) => void;
  onBack: () => void;
  text: string;
  speech: SpeechSettings;
};

const RATES = [
  { label: 'Slow', value: 0.7 },
  { label: 'Normal', value: 1.0 },
  { label: 'Fast', value: 1.4 },
];

export function Controls({
  fontSize, setFontSize,
  scrollSpeed, setScrollSpeed,
  isScrolling, setIsScrolling,
  onBack,
  text,
  speech,
}: Props) {
  const { voices, selectedVoiceURI, setSelectedVoiceURI, pitch, setPitch, rate, setRate,
    isSpeaking, speak, stop, cleanName, higherPitchNames } = speech;

  const pitchIsHigh = pitch >= 1.1;
  const pitchIsLow  = pitch <= 0.9;

  return (
    <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center gap-3 flex-wrap shrink-0">

      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Back</span>
      </button>

      {/* Font size */}
      <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1.5">
        <button
          onClick={() => setFontSize(Math.max(fontSize - 4, 12))}
          className="p-1 hover:bg-gray-100 rounded transition"
          aria-label="Decrease font size"
        >
          <ZoomOut size={17} />
        </button>
        <span className="text-sm font-medium w-14 text-center">{fontSize}px</span>
        <button
          onClick={() => setFontSize(Math.min(fontSize + 4, 80))}
          className="p-1 hover:bg-gray-100 rounded transition"
          aria-label="Increase font size"
        >
          <ZoomIn size={17} />
        </button>
      </div>

      {/* Scroll speed */}
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
        <span className="text-xs text-gray-500 shrink-0">Autoscroll</span>
        <input
          type="range"
          min="0"
          max="10"
          value={scrollSpeed}
          onChange={(e) => {
            const v = Number(e.target.value);
            setScrollSpeed(v);
            if (v === 0) setIsScrolling(false);
          }}
          className="flex-1 accent-blue-500"
        />
        <span className="text-sm font-medium w-8 text-center text-gray-700">
          {scrollSpeed === 0 ? 'Off' : `${scrollSpeed}×`}
        </span>
      </div>

      {/* Play / Pause scroll — only shown when speed > 0 */}
      {scrollSpeed > 0 && (
        <button
          onClick={() => setIsScrolling(!isScrolling)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            isScrolling
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isScrolling ? <Pause size={16} /> : <Play size={16} />}
          {isScrolling ? 'Pause' : 'Play'}
        </button>
      )}

      {/* ── TTS divider ── */}
      <span className="hidden sm:block w-px h-6 bg-gray-300 shrink-0" aria-hidden />

      {/* Listen / Stop */}
      <button
        onClick={() => isSpeaking ? stop() : speak(text)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
          isSpeaking
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
        aria-label={isSpeaking ? 'Stop listening' : 'Listen'}
      >
        {isSpeaking ? <Square size={15} /> : <Volume2 size={15} />}
        {isSpeaking ? 'Stop' : 'Listen'}
      </button>

      {/* Rate */}
      <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
        {RATES.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setRate(value)}
            className={`px-2.5 py-1.5 text-xs font-medium transition border-r border-gray-200 last:border-r-0 ${
              rate === value
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pitch */}
      <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
        <span className="px-2.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">Pitch</span>
        <button
          onClick={() => setPitch(1.2)}
          className={`px-2.5 py-1.5 text-xs font-medium transition border-r border-gray-200 ${
            pitchIsHigh ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          title="Higher pitch voice"
        >
          Higher
        </button>
        <button
          onClick={() => setPitch(0.8)}
          className={`px-2.5 py-1.5 text-xs font-medium transition ${
            pitchIsLow ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          title="Lower pitch voice"
        >
          Lower
        </button>
      </div>

      {/* Voice dropdown — only rendered when >1 English voice is available */}
      {voices.length > 1 && (
        <select
          value={selectedVoiceURI}
          onChange={(e) => setSelectedVoiceURI(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 max-w-[180px] truncate"
          aria-label="Select voice"
        >
          {voices
            .slice()
            .sort((a, b) => {
              const aHigh = higherPitchNames.test(a.name) ? 0 : 1;
              const bHigh = higherPitchNames.test(b.name) ? 0 : 1;
              return aHigh - bHigh || a.name.localeCompare(b.name);
            })
            .map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {cleanName(v.name)}
              </option>
            ))}
        </select>
      )}

      <VoiceInfoTip />

    </div>
  );
}
