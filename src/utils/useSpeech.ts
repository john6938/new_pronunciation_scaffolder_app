import { useEffect, useRef, useState } from 'react';

// Filter to English voices only, handling both en-US and en_US formats (Android quirk).
function isEnglish(v: SpeechSynthesisVoice) {
  return /^en[-_]/i.test(v.lang);
}

// Heuristic: voices whose names suggest a higher-pitched / female voice.
const HIGHER_PITCH_NAMES = /female|woman|samantha|karen|victoria|moira|fiona|tessa|zira|aria|jenny|sonia|libby|nicky|ava|allison/i;

function cleanName(name: string): string {
  return name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s*[-–]\s*(English|Online|Natural)\b.*/i, '')
    .trim();
}

export type SpeechStatus = 'idle' | 'speaking' | 'paused';

export type SpeechSettings = {
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  pitch: number;
  setPitch: (p: number) => void;
  rate: number;
  setRate: (r: number) => void;
  status: SpeechStatus;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  cleanName: (name: string) => string;
  higherPitchNames: RegExp;
};

export function useSpeech(): SpeechSettings {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(0.9);
  const [status, setStatus] = useState<SpeechStatus>('idle');

  // Use refs so speak() always sees the latest values without needing useCallback deps.
  const pitchRef = useRef(pitch);
  const rateRef = useRef(rate);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  const voicesRef = useRef(voices);

  useEffect(() => { pitchRef.current = pitch; }, [pitch]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { selectedVoiceURIRef.current = selectedVoiceURI; }, [selectedVoiceURI]);
  useEffect(() => { voicesRef.current = voices; }, [voices]);

  // Load English voices — poll because voiceschanged is unreliable on mobile.
  useEffect(() => {
    let attempts = 0;

    function load() {
      const all = window.speechSynthesis?.getVoices() ?? [];
      const english = all.filter(isEnglish);
      if (english.length === 0) return;

      setVoices(english);
      setSelectedVoiceURI((prev) => {
        if (prev) return prev; // already set
        // Prefer a recognisably female US/UK voice as default; fall back to first.
        const preferred =
          english.find((v) => HIGHER_PITCH_NAMES.test(v.name) && /en[-_]US/i.test(v.lang)) ||
          english.find((v) => HIGHER_PITCH_NAMES.test(v.name)) ||
          english[0];
        return preferred.voiceURI;
      });
    }

    load();
    const interval = setInterval(() => {
      load();
      attempts++;
      if (attempts >= 20 || voicesRef.current.length > 0) clearInterval(interval);
    }, 250);

    // Also listen to voiceschanged for desktop browsers.
    window.speechSynthesis?.addEventListener('voiceschanged', load);

    return () => {
      clearInterval(interval);
      window.speechSynthesis?.removeEventListener('voiceschanged', load);
    };
  }, []);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch = pitchRef.current;
    utt.rate = rateRef.current;
    utt.lang = 'en-US';

    const voice = voicesRef.current.find((v) => v.voiceURI === selectedVoiceURIRef.current);
    if (voice) utt.voice = voice;

    utt.onstart = () => setStatus('speaking');
    utt.onend = () => setStatus('idle');
    utt.onerror = () => setStatus('idle');

    window.speechSynthesis.speak(utt);
  }

  function pause() {
    window.speechSynthesis?.pause();
    setStatus('paused');
  }

  function resume() {
    window.speechSynthesis?.resume();
    setStatus('speaking');
  }

  function stop() {
    window.speechSynthesis?.cancel();
    setStatus('idle');
  }

  return {
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    pitch, setPitch,
    rate, setRate,
    status,
    speak,
    pause,
    resume,
    stop,
    cleanName,
    higherPitchNames: HIGHER_PITCH_NAMES,
  };
}
