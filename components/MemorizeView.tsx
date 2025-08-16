
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { Verse } from '../types';
import MemorizeBlank from './MemorizeBlank';
import { CheckCircleIcon } from './IconComponents';

interface MemorizeViewProps {
  verse: Verse;
  memorizeWords: string[];
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates the maximum hint level needed to fully reveal a word/phrase.
 * This now counts the number of words in the phrase.
 * @param word The word or phrase to calculate the hint level for.
 * @returns The maximum hint level (number of words).
 */
function calculateMaxHintLevel(word: string): number {
    // A word is a sequence of one or more word characters.
    // This counts the number of "words" in the phrase.
    return (word.match(/\w+/g) || []).length;
}

const MemorizeView: React.FC<MemorizeViewProps> = ({ verse, memorizeWords }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hintStates, setHintStates] = useState<{ [key: number]: number }>({});
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [hHintActiveFor, setHHintActiveFor] = useState<number | null>(null);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { processedParts, blanks } = useMemo(() => {
    if (!verse.text) {
        return { processedParts: [], blanks: [] };
    }
    
    const sortedWords = (memorizeWords && memorizeWords.length > 0) 
        ? [...memorizeWords].sort((a, b) => b.length - a.length)
        : [];
    
    // The regex is case-insensitive ('i' flag), so our lookup set should be too.
    const lowerCaseMemorizeWords = sortedWords.map(w => w.toLowerCase());
    const memorizeWordsSet = new Set(lowerCaseMemorizeWords);
    
    // If there are no phrases to memorize, treat the whole verse as a single, non-blank part.
    if (sortedWords.length === 0) {
        return {
            processedParts: [{ text: verse.text, isBlank: false }],
            blanks: [],
        };
    }

    const parts = verse.text.split(new RegExp(`(${sortedWords.map(escapeRegExp).join('|')})`, 'gi'));
    
    const chunks = parts.filter(part => part);

    // Create blank data ONLY for the phrases that are meant to be memorized.
    const blankData = chunks
        .filter(chunk => memorizeWordsSet.has(chunk.toLowerCase()))
        .map(chunk => ({
            word: chunk,
            numWords: chunk.trim().split(/\s+/).length,
            maxHintLevel: calculateMaxHintLevel(chunk)
        }));
    
    // A part is a "blank" only if it's one of the designated memorization phrases.
    const finalParts = chunks.map(chunk => ({
        text: chunk,
        isBlank: memorizeWordsSet.has(chunk.toLowerCase()),
    }));

    return { processedParts: finalParts, blanks: blankData };
  }, [verse.text, memorizeWords]);

  const resetState = useCallback(() => {
    setActiveIndex(null);
    setHintStates({});
    setIsStudyMode(false);
    setHHintActiveFor(null);
    setIsHelpVisible(false);
    // Focus the container so it can receive keydown events
    setTimeout(() => containerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    resetState();
  }, [verse, resetState]);
  
  const handleRevealHint = useCallback(() => {
    setHHintActiveFor(null);

    if (blanks.length === 0) {
      return;
    }

    // Determine the starting point for our logic.
    let currentPhraseIndex = activeIndex;

    // If no phrase is active, find the first one that isn't complete.
    if (currentPhraseIndex === null) {
      const firstIncompleteIndex = blanks.findIndex((blank, index) => {
        const currentHint = hintStates[index] || 0;
        return currentHint < blank.maxHintLevel;
      });
      
      if (firstIncompleteIndex === -1) {
        // All phrases are already complete.
        return;
      }
      currentPhraseIndex = firstIncompleteIndex;
    }
    
    const currentHint = hintStates[currentPhraseIndex] || 0;
    const maxHint = blanks[currentPhraseIndex].maxHintLevel;

    if (currentHint < maxHint) {
      // The current phrase is not yet complete, so we reveal the next word.
      setActiveIndex(currentPhraseIndex);
      setHintStates(prev => ({
        ...prev,
        [currentPhraseIndex]: currentHint + 1,
      }));
    } else {
      // The current phrase is complete. We need to find the next incomplete phrase.
      let nextPhraseIndex = (currentPhraseIndex + 1) % blanks.length;
      
      // Loop through all phrases to find the next one that isn't complete.
      for (let i = 0; i < blanks.length; i++) {
        const nextHint = hintStates[nextPhraseIndex] || 0;
        const nextMaxHint = blanks[nextPhraseIndex].maxHintLevel;
        
        if (nextHint < nextMaxHint) {
          // We found the next incomplete phrase. Activate it and reveal its first word.
          setActiveIndex(nextPhraseIndex);
          setHintStates(prev => ({
            ...prev,
            [nextPhraseIndex]: nextHint + 1,
          }));
          return; // We're done.
        }
        
        // This one was complete, so check the next one.
        nextPhraseIndex = (nextPhraseIndex + 1) % blanks.length;
      }
      
      // If we get here, it means all phrases are complete. Nothing more to do.
    }
  }, [activeIndex, blanks, hintStates]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Let arrow keys for verse navigation bubble up without any action here.
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      return;
    }

    // Global controls that should work in any state
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsStudyMode(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsStudyMode(false);
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      resetState();
      return;
    }

    if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        if (activeIndex !== null) {
            setHHintActiveFor(prev => (prev === activeIndex ? null : activeIndex));
        }
        return;
    }

    // Block other input if in study mode
    if (isStudyMode) return;
    
    // Spacebar for navigation
    if (event.code === 'Space') {
      event.preventDefault();
      if (blanks.length === 0) return;
      
      setHHintActiveFor(null);
      if (activeIndex === null) {
        setActiveIndex(0);
      } else {
        const nextIndex = (activeIndex + 1) % blanks.length;
        setActiveIndex(nextIndex);
      }
      return;
    }

    // Enter key to increment hint level
    if (event.key === 'Enter') {
        event.preventDefault();
        handleRevealHint();
        return;
    }

    // Number keys for hints
    if (activeIndex !== null && event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      setHHintActiveFor(null);
      const num = parseInt(event.key, 10);
      
      setHintStates(prev => ({
        ...prev,
        [activeIndex]: num,
      }));
    }
  };

  const renderVerseWithBlanks = () => {
    if (processedParts.length === 0) {
      return null;
    }
    
    let blankCounter = -1;

    return processedParts.map((part, index) => {
      if (part.isBlank) {
        blankCounter++;
        const currentBlankIndex = blankCounter;

        if (isStudyMode) {
            return (
                <span key={`${verse.verse}-${index}`} className="bg-yellow-200 rounded-md px-1 mx-0.5 font-medium">
                    {part.text}
                </span>
            );
        }
        
        const isHHintActive = hHintActiveFor === currentBlankIndex;
        const effectiveHintLevel = isHHintActive ? 1 : (hintStates[currentBlankIndex] || 0);

        return (
          <MemorizeBlank 
            key={`${verse.verse}-${index}`} 
            word={part.text}
            isActive={activeIndex === currentBlankIndex}
            hintLevel={effectiveHintLevel}
          />
        );
      }
      return <span key={`${verse.verse}-${index}`}>{part.text}</span>;
    });
  };

  return (
    <div 
      ref={containerRef} 
      onKeyDown={handleKeyDown} 
      onClick={isStudyMode ? undefined : handleRevealHint}
      tabIndex={-1} 
      className={`focus:outline-none ${isStudyMode ? '' : 'cursor-pointer'}`}
    >
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-slate-800">Memorize Verse {verse.verse}</h2>
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent click from triggering handleRevealHint
                    setIsHelpVisible(p => !p);
                }}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-expanded={isHelpVisible}
                aria-controls="memorize-help-panel"
            >
                {isHelpVisible ? 'Close' : 'Help'}
            </button>
        </div>
      
      {isHelpVisible && (
        <div id="memorize-help-panel" className="p-4 mb-4 bg-slate-100 rounded-lg text-sm text-slate-600 space-y-1 animate-fade-in-down">
            <p>• <strong>Click / Enter:</strong> Reveal the next word. Automatically moves to the next phrase when one is complete.</p>
            <p>• <strong>Space:</strong> Manually cycle to the next phrase.</p>
            <p>• <strong>H:</strong> Toggle first-word hint for the active phrase.</p>
            <p>• <strong>↑ Arrow:</strong> Show all words (Study Mode).</p>
            <p>• <strong>↓ Arrow:</strong> Return to practice from Study Mode.</p>
            <p>• <strong>R:</strong> Reset the current verse.</p>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fade-in-down {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down {
                  animation: fade-in-down 0.3s ease-out forwards;
                }
            `}}/>
        </div>
      )}

      {isStudyMode && (
        <div className="text-center text-sm text-blue-600 font-semibold bg-blue-100 p-2 rounded-md mb-4 animate-fade-in-sm">
            Study Mode: All words revealed. Press <strong>↓</strong> to return to practice.
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fade-in-sm {
                  from { opacity: 0; transform: translateY(-5px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-sm {
                  animation: fade-in-sm 0.3s ease-out forwards;
                }
            `}}/>
        </div>
      )}

      <div className="relative font-serif text-xl sm:text-2xl leading-10 text-slate-700 min-h-[100px]">
        <span className="font-bold text-slate-800 align-top text-sm mr-2">{verse.verse}</span>
        {renderVerseWithBlanks()}
      </div>
    </div>
  );
};

export default MemorizeView;
