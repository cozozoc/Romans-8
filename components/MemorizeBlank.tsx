
import React, { useMemo } from 'react';

interface MemorizeBlankProps {
  word: string;
  hintLevel: number;
  isActive: boolean;
}

const MemorizeBlank: React.FC<MemorizeBlankProps> = ({ word, hintLevel, isActive }) => {

  const displayedWord = useMemo(() => {
    // Level 0 or less: Hide all letters, preserving punctuation and spacing.
    if (hintLevel <= 0) {
        return word.replace(/[a-zA-Z0-9]/g, '_');
    }

    // Tokenize the phrase into words and separators (like spaces or punctuation).
    const tokens = word.match(/(\w+)|[^\w]/g) || [];
    let revealedWordCount = 0;
    
    const resultTokens = tokens.map(token => {
        // Check if the token is a word (contains at least one word character).
        if (/\w/.test(token)) {
            if (revealedWordCount < hintLevel) {
                revealedWordCount++;
                return token; // Reveal this word.
            } else {
                // Hide this word by replacing all letters/numbers with underscores.
                return token.replace(/[a-zA-Z0-9]/g, '_');
            }
        } else {
            // It's a separator, so always show it.
            return token;
        }
    });

    return resultTokens.join('');
  }, [word, hintLevel]);

  const activeClass = isActive ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-100' : 'bg-slate-200';

  return (
    <span
      className={`inline text-slate-800 font-mono rounded-md px-2 py-0.5 mx-0.5 align-baseline transition-all duration-150 ${activeClass} break-words`}
      style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } as React.CSSProperties}
      aria-label={`Phrase: ${word}. Current view: ${displayedWord}`}
    >
      {displayedWord}
    </span>
  );
};

export default MemorizeBlank;
