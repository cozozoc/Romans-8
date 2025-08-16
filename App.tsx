
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { get, set } from 'idb-keyval';
import { ROMANS_8 } from './constants';
import { ROMANS_8_VOCABULARY } from './data/vocabularyData';
import { ROMANS_8_MEMORIZE_WORDS } from './data/memorizeData';
import type { Verse, WordTranslation } from './types';
import { getVerseExplanation } from './services/geminiService';
import VerseDisplay from './components/VerseDisplay';
import MemorizeView from './components/MemorizeView';
import VocabularyList from './components/VocabularyList';
import Controls from './components/Controls';
import AiInsight from './components/AiInsight';
import { SparklesIcon } from './components/IconComponents';

export default function App(): React.ReactNode {
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(0);
  const [memorizeMode, setMemorizeMode] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showVocabulary, setShowVocabulary] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [isPlayingRecording, setIsPlayingRecording] = useState<boolean>(false);
  const [isChunkingMode, setIsChunkingMode] = useState<boolean>(false);
  const [showChunks, setShowChunks] = useState<boolean>(false);
  const [manualChunks, setManualChunks] = useState<Record<number, string>>({});
  const [hasLoadedChunks, setHasLoadedChunks] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingsRef = useRef(recordings);
  recordingsRef.current = recordings;

  const currentVerse: Verse = useMemo(() => ROMANS_8[currentVerseIndex], [currentVerseIndex]);
  const currentMemorizeWords: string[] = useMemo(() => ROMANS_8_MEMORIZE_WORDS[currentVerseIndex] || [], [currentVerseIndex]);
  const currentVocabulary: WordTranslation[] = useMemo(() => ROMANS_8_VOCABULARY[currentVerseIndex] || [], [currentVerseIndex]);

  // Load persisted data from IndexedDB on initial app load.
  useEffect(() => {
    const loadData = async () => {
      // Load chunks
      try {
        const storedChunks = await get<Record<number, string>>('romans8_manual_chunks');
        if (storedChunks) {
          setManualChunks(storedChunks);
        }
      } catch (error) {
        console.error("Failed to load chunks from IndexedDB:", error);
      } finally {
        setHasLoadedChunks(true);
      }

      // Load recordings
      try {
        const storedBlobs = await get<Record<number, Blob>>('romans8_recordings');
        if (storedBlobs) {
          const objectUrls: Record<number, string> = {};
          for (const key in storedBlobs) {
            const verseIndex = parseInt(key, 10);
            const blob = storedBlobs[verseIndex];
            if (blob instanceof Blob) {
              objectUrls[verseIndex] = URL.createObjectURL(blob);
            }
          }
          setRecordings(objectUrls);
        }
      } catch (error) {
        console.error("Failed to load recordings from IndexedDB:", error);
      }
    };
    loadData();
  }, []);


  // Save manual chunks to IndexedDB whenever they are updated.
  // This automatically saves the user's changes for the next session.
  useEffect(() => {
    if (!hasLoadedChunks) {
      return; // Don't save until initial data is loaded to prevent overwriting
    }
    const saveChunks = async () => {
      try {
        await set('romans8_manual_chunks', manualChunks);
      } catch (error)      {
        console.error("Failed to save chunks to IndexedDB:", error);
      }
    };
    saveChunks();
  }, [manualChunks, hasLoadedChunks]);


  const stopAllAudio = useCallback(() => {
    // Stop TTS
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  
    // Stop user recording playback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlayingRecording(false);
    // Do not exit chunking mode when stopping audio
    // setIsChunkingMode(false);
  }, []);


  const handleNextVerse = useCallback(() => {
    stopAllAudio();
    setCurrentVerseIndex((prev) => (prev < ROMANS_8.length - 1 ? prev + 1 : prev));
    setAiInsight('');
  }, [stopAllAudio]);

  const handlePrevVerse = useCallback(() => {
    stopAllAudio();
    setCurrentVerseIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setAiInsight('');
  }, [stopAllAudio]);

  const handleToggleMemorize = useCallback(() => {
    stopAllAudio();
    setMemorizeMode(prev => !prev);
    setAiInsight('');
  }, [stopAllAudio]);

  const fetchAiInsight = useCallback(async () => {
    if (!currentVerse) return;
    stopAllAudio();
    setIsAiLoading(true);
    setAiInsight('');
    try {
      const explanation = await getVerseExplanation(currentVerse.text);
      setAiInsight(explanation);
    } catch (error) {
      console.error('Error fetching AI insight:', error);
      setAiInsight('Sorry, I was unable to get insights for this verse. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  }, [currentVerse, stopAllAudio]);

  const handlePlayVerse = useCallback(() => {
    if (!currentVerse?.text || typeof window.speechSynthesis === 'undefined') {
        return;
    }
    stopAllAudio();
    const utterance = new SpeechSynthesisUtterance(currentVerse.text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [currentVerse, stopAllAudio]);
  
  const handleToggleRecord = async () => {
    stopAllAudio();

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      // onstop event will handle the rest
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          if (audioChunksRef.current.length === 0) {
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            return;
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const verseIndex = currentVerseIndex;

          // Revoke old URL if it exists to prevent memory leaks
          if (recordings[verseIndex]) {
            URL.revokeObjectURL(recordings[verseIndex]);
          }
          
          // Create new URL for immediate playback and update state
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordings(prev => ({ ...prev, [verseIndex]: audioUrl }));

          // Asynchronously save the blob to IndexedDB
          const saveRecording = async () => {
            try {
              const allRecordings = (await get<Record<number, Blob>>('romans8_recordings')) || {};
              allRecordings[verseIndex] = audioBlob;
              await set('romans8_recordings', allRecordings);
            } catch (error) {
              console.error("Failed to save recording to IndexedDB:", error);
            }
          };
          saveRecording();
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error starting recording:", err);
        alert("Could not start recording. Please ensure microphone permissions are granted.");
      }
    }
  };

  const handlePlayRecording = () => {
    if (isPlayingRecording) {
      audioPlayerRef.current?.pause();
      audioPlayerRef.current!.currentTime = 0;
      setIsPlayingRecording(false);
    } else {
      const audioUrl = recordings[currentVerseIndex];
      if (audioUrl) {
        stopAllAudio();
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.play().catch(e => console.error("Playback failed:", e));
        audioPlayerRef.current.onplay = () => setIsPlayingRecording(true);
        audioPlayerRef.current.onended = () => setIsPlayingRecording(false);
        audioPlayerRef.current.onerror = () => {
          console.error("Error playing recording.");
          setIsPlayingRecording(false);
        };
      }
    }
  };

  const handleToggleChunkingMode = useCallback(() => {
    if (isChunkingMode) {
      // When exiting chunking mode, automatically show the chunks.
      setShowChunks(true);
    } else {
      // When entering chunking mode, stop any audio.
      stopAllAudio();
    }
    setIsChunkingMode(prev => !prev);
  }, [isChunkingMode, stopAllAudio]);

  const handleToggleShowChunks = useCallback(() => {
    setShowChunks(prev => !prev);
  }, []);
  
  const handleUpdateChunks = useCallback((newChunkedText: string) => {
    setManualChunks(prev => ({
      ...prev,
      [currentVerseIndex]: newChunkedText
    }));
  }, [currentVerseIndex]);

  const handleResetChunks = useCallback(() => {
    setManualChunks(prev => {
      const newChunks = { ...prev };
      delete newChunks[currentVerseIndex];
      return newChunks;
    });
  }, [currentVerseIndex]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showIntro) return;

      const target = event.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextVerse();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevVerse();
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        handleToggleMemorize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showIntro, handleNextVerse, handlePrevVerse, handleToggleMemorize]);


  useEffect(() => {
    // On unmount, revoke all object URLs to prevent memory leaks.
    // The ref is used to access the latest `recordings` state in the cleanup function.
    return () => {
      stopAllAudio();
      Object.values(recordingsRef.current).forEach(URL.revokeObjectURL);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  if (showIntro) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 text-center">
            <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-bold font-serif text-slate-800 mb-4">Welcome to the Romans 8 Memorization Helper</h1>
                <p className="text-slate-600 font-sans text-lg mb-6">This app is designed to help you hide God's word in your heart. You can read through the chapter, or switch to "Memorize Mode" to test your recall. For a deeper understanding, use the <SparklesIcon className="inline-block h-5 w-5 text-amber-500" /> button to get an AI-powered explanation of any verse.</p>
                <p className="text-slate-600 font-sans text-lg mb-6"><strong>New Features:</strong> Record yourself reciting verses and manually divide them into smaller chunks for focused memorization!</p>
                <button 
                    onClick={() => setShowIntro(false)}
                    autoFocus
                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300">
                    Begin
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-center text-slate-800 mb-2">Romans 8</h1>
          <p className="text-center text-slate-500">Memorize Romans Effectively</p>
        </header>

        <main className="relative bg-white rounded-2xl shadow-lg p-6 sm:p-8 transition-all duration-300">
          {isRecording && (
            <div className="absolute top-4 right-6 flex items-center gap-2 text-red-600 font-semibold text-sm animate-pulse">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
              <span>Recording</span>
            </div>
          )}
          <div className="min-h-[250px] flex flex-col justify-center">
            {memorizeMode ? (
              <MemorizeView 
                verse={currentVerse}
                memorizeWords={currentMemorizeWords}
              />
            ) : (
              <VerseDisplay 
                verseNumber={currentVerse.verse} 
                text={currentVerse.text}
                chunkedText={manualChunks[currentVerseIndex]}
                showChunks={showChunks}
                isChunkingMode={isChunkingMode}
                onUpdateChunks={handleUpdateChunks}
              />
            )}
          </div>
          <VocabularyList 
            vocabulary={currentVocabulary} 
            isVisible={showVocabulary} 
            onToggle={() => setShowVocabulary(p => !p)} 
          />
        </main>
        
        <p className="text-center text-slate-500 text-xs my-2">
          Tip: Press <kbd className="px-1.5 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">M</kbd> to toggle Memorize Mode.
        </p>

        <Controls 
          onPrev={handlePrevVerse}
          onNext={handleNextVerse}
          isPrevDisabled={currentVerseIndex === 0}
          isNextDisabled={currentVerseIndex === ROMANS_8.length - 1}
          memorizeMode={memorizeMode}
          onToggleMemorize={handleToggleMemorize}
          onGetInsight={fetchAiInsight}
          isAiLoading={isAiLoading}
          onPlay={handlePlayVerse}
          onStop={stopAllAudio}
          isSpeaking={isSpeaking}
          onToggleRecord={handleToggleRecord}
          isRecording={isRecording}
          onPlayRecording={handlePlayRecording}
          isPlayingRecording={isPlayingRecording}
          hasRecording={!!recordings[currentVerseIndex]}
          onToggleChunkingMode={handleToggleChunkingMode}
          isChunkingMode={isChunkingMode}
          onToggleShowChunks={handleToggleShowChunks}
          showChunks={showChunks}
          onResetChunks={handleResetChunks}
          hasManualChunks={!!manualChunks[currentVerseIndex]}
        />
        
        <AiInsight insight={aiInsight} isLoading={isAiLoading} />

      </div>
       <footer className="text-center mt-8 text-slate-500 text-sm">
          <p className="mb-2">Use <kbd className="px-1.5 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">←</kbd> and <kbd className="px-1.5 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">→</kbd> to navigate verses.</p>
          <p>Made with ❤️ for the glory of God.</p>
        </footer>
    </div>
  );
}
