import React, { Fragment, useState } from 'react';
import type { Verse } from '../types';

const VerseDisplay: React.FC<{
  verse: Verse;
  languages: ('eng' | 'kor')[];
  chunkedText?: string;
  showChunks: boolean;
  isChunkingMode: boolean;
  onUpdateChunks: (newText: string) => void;
}> = ({ verse, languages, chunkedText, showChunks, isChunkingMode, onUpdateChunks }) => {
  
  const [hoveredDividerIndex, setHoveredDividerIndex] = useState<number | null>(null);
  
  const renderEnglishContent = () => {
    // In chunking mode, render an interactive UI for adding/removing dividers.
    if (isChunkingMode) {
      const currentText = chunkedText || verse.text;
      
      // Tokenize the string into words, spaces, and existing dividers for individual rendering.
      const tokens: { type: 'word' | 'space' | 'divider'; content: string }[] = [];
      const regex = /(\s+\/\s+)|(\s+)|(\S+)/g;
      let match;
      while ((match = regex.exec(currentText)) !== null) {
        if (match[1]) {
          tokens.push({ type: 'divider', content: match[1] });
        } else if (match[2]) {
          tokens.push({ type: 'space', content: match[2] });
        } else if (match[3]) {
          tokens.push({ type: 'word', content: match[3] });
        }
      }

      let spaceCounter = 0; // Unique ID for each valid divider insertion point.

      return tokens.map((token, index) => {
        if (token.type === 'divider') {
          // Render an existing, clickable divider that can be removed.
          const handleClick = () => {
            const newTokens = [...tokens];
            newTokens[index] = { type: 'space', content: ' ' };
            onUpdateChunks(newTokens.map(t => t.content).join(''));
            setHoveredDividerIndex(null); // Reset hover state
          };
          return (
            <span
              key={index}
              onClick={handleClick}
              className="text-red-500 font-bold px-1 rounded-md hover:bg-red-100 cursor-pointer select-none"
              title="Remove divider"
            >
              /
            </span>
          );
        } else if (token.type === 'space') {
          const prevToken = tokens[index - 1];
          const nextToken = tokens[index + 1];
          const isValidInsertionPoint = prevToken?.type === 'word' && nextToken?.type === 'word';

          if (!isValidInsertionPoint) {
            return <Fragment key={index}>{token.content}</Fragment>;
          }
          
          const currentSpaceIndex = spaceCounter++;
          const handleClick = () => {
            const newTokens = [...tokens];
            newTokens[index] = { type: 'divider', content: ' / ' };
            onUpdateChunks(newTokens.map(t => t.content).join(''));
            setHoveredDividerIndex(null); // Reset hover state to prevent ghost divider
          };

          // Render a hoverable area where a new divider can be inserted.
          return (
            <span
              key={index}
              className="relative"
              onMouseEnter={() => setHoveredDividerIndex(currentSpaceIndex)}
              onMouseLeave={() => setHoveredDividerIndex(null)}
              onClick={handleClick}
              style={{ cursor: 'pointer' }}
            >
              {token.content}
              {hoveredDividerIndex === currentSpaceIndex && (
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 font-bold select-none pointer-events-none"
                  aria-hidden="true"
                >
                  /
                </span>
              )}
            </span>
          );
        } else { // Word
          return <Fragment key={index}>{token.content}</Fragment>;
        }
      });
    }

    // When not in chunking mode, check if we should display the chunks with styling.
    if (showChunks && chunkedText) {
      const parts = chunkedText.split(' / ');
      return parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span className="text-blue-500 font-bold mx-1.5 select-none" aria-hidden="true">/</span>
          )}
        </Fragment>
      ));
    }

    // Default case: show the original, unchunked text.
    return verse.text;
  };

  const showEng = languages.includes('eng');
  const showKor = languages.includes('kor');

  return (
    <div className="relative">
      <div className="flex items-start">
        <span className="font-bold text-slate-800 align-top text-sm mr-2 select-none pt-1.5">{verse.verse}</span>
        <div className="flex-1">
          {showEng && (
            <p 
              className="font-serif text-xl sm:text-2xl leading-relaxed text-slate-700"
              aria-label={isChunkingMode ? "Verse text, hover between words to add a divider or click an existing divider to remove it" : "Verse text"}
            >
              {renderEnglishContent()}
            </p>
          )}
          {showKor && (
            <p className={`font-sans text-lg sm:text-xl leading-relaxed text-slate-600 ${showEng ? 'mt-3' : ''}`} lang="ko">
              {verse.krv}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerseDisplay;