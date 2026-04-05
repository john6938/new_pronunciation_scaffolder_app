import { useState } from 'react';
import { VisualizationOptions } from './components/VisualizationOptions';
import { TextDisplay } from './components/TextDisplay';
import { Controls } from './components/Controls';
import { Legend } from './components/Legend';
import { Upload, Type } from 'lucide-react';

export type VisualizationSettings = {
  intonation: boolean;
  sentenceStress: boolean;
  wordStress: boolean;
  complexSounds: boolean;
  linking: boolean;
};

const SAMPLE_TEXT = `Good morning everyone. Today, I'm going to talk about the importance of effective communication in the workplace. Communication is the foundation of success in any organization. When we communicate clearly, we build trust and understanding. This helps teams work together more efficiently and achieve their goals. Remember, listening is just as important as speaking. Thank you for your attention.`;

export default function App() {
  const [mode, setMode] = useState<'input' | 'display'>('input');
  const [scriptText, setScriptText] = useState('');
  const [fontSize, setFontSize] = useState(28);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [visualizations, setVisualizations] = useState<VisualizationSettings>({
    intonation: true,
    sentenceStress: true,
    wordStress: true,
    complexSounds: false,
    linking: false,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setScriptText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleStart = () => {
    if (scriptText.trim()) setMode('display');
  };

  const handleBack = () => {
    setMode('input');
    setIsScrolling(false);
  };

  if (mode === 'display') {
    return (
      <div className="h-full flex flex-col bg-white">
        <Controls
          fontSize={fontSize}
          setFontSize={setFontSize}
          scrollSpeed={scrollSpeed}
          setScrollSpeed={setScrollSpeed}
          isScrolling={isScrolling}
          setIsScrolling={setIsScrolling}
          onBack={handleBack}
        />
        <TextDisplay
          text={scriptText}
          visualizations={visualizations}
          fontSize={fontSize}
          scrollSpeed={scrollSpeed}
          isScrolling={isScrolling}
        />
        <Legend visualizations={visualizations} />
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-start justify-center bg-gray-50 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-5 sm:p-8 my-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
            PS
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Pronunciation Scaffolder</h1>
            <p className="text-sm text-gray-500">Visualise how to read your script aloud</p>
          </div>
        </div>

        <div className="space-y-7">

          {/* Script input */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Your Script</h2>
            <div className="flex gap-2 flex-wrap mb-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-600 transition">
                <Upload size={16} />
                Upload .txt
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={() => (document.getElementById('script-input') as HTMLTextAreaElement)?.focus()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
              >
                <Type size={16} />
                Type below
              </button>
              <button
                onClick={() => setScriptText(SAMPLE_TEXT)}
                className="px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition"
              >
                Try sample
              </button>
            </div>

            <textarea
              id="script-input"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Type or paste your presentation script here..."
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-base"
            />

            <button
              onClick={handleStart}
              disabled={!scriptText.trim()}
              className="mt-3 w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-base"
            >
              Show Visualisation
            </button>
          </section>

          {/* Visualization options */}
          <VisualizationOptions
            visualizations={visualizations}
            setVisualizations={setVisualizations}
          />

          {/* Mobile tip */}
          <p className="text-xs text-gray-400 text-center sm:hidden">
            Tip: use landscape orientation on mobile for easier reading
          </p>
        </div>
      </div>
    </div>
  );
}
