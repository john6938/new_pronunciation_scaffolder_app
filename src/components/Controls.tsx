import { ArrowLeft, ZoomIn, ZoomOut, Gauge, Play, Pause } from 'lucide-react';

type Props = {
  fontSize: number;
  setFontSize: (size: number) => void;
  scrollSpeed: number;
  setScrollSpeed: (speed: number) => void;
  isScrolling: boolean;
  setIsScrolling: (v: boolean) => void;
  onBack: () => void;
};

export function Controls({
  fontSize, setFontSize,
  scrollSpeed, setScrollSpeed,
  isScrolling, setIsScrolling,
  onBack,
}: Props) {
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
        <Gauge size={16} className="text-gray-500 shrink-0" />
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
        <span className="text-sm font-medium w-14 text-center text-gray-700">
          {scrollSpeed === 0 ? 'Manual' : `${scrollSpeed}×`}
        </span>
      </div>

      {/* Play / Pause — only shown when speed > 0 */}
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
    </div>
  );
}
