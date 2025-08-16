
import React from 'react';
import type { WordTranslation } from '../types';

interface VocabularyListProps {
  vocabulary: WordTranslation[];
  isVisible: boolean;
  onToggle: () => void;
}

const VocabularyList: React.FC<VocabularyListProps> = ({ vocabulary, isVisible, onToggle }) => {
  if (!vocabulary || vocabulary.length === 0) {
    return null;
  }
  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-bold text-slate-700 tracking-wide uppercase">Key Vocabulary</h3>
        <button
          type="button"
          onClick={onToggle}
          className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={isVisible}
          aria-controls="vocabulary-content"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>

      {isVisible && (
         <div id="vocabulary-content" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 animate-fade-in-sm">
          {vocabulary.map((item, index) => (
            <div key={index} className="text-slate-600 font-sans text-sm">
              <strong className="font-semibold text-slate-800">{item.english}</strong>
              <span className="ml-2 text-slate-500">({item.krv} / {item.nksv})</span>
            </div>
          ))}
          <style>{`
            @keyframes fade-in-sm {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-sm {
              animation: fade-in-sm 0.3s ease-out forwards;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default VocabularyList;
