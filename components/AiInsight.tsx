
import React from 'react';
import { SparklesIcon } from './IconComponents';

interface AiInsightProps {
  insight: string;
  isLoading: boolean;
}

const AiInsight: React.FC<AiInsightProps> = ({ insight, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mt-6 p-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-blue-700 font-medium">Generating insight...</p>
        </div>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <div className="mt-6 p-6 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg animate-fade-in">
      <div className="flex">
        <div className="flex-shrink-0">
          <SparklesIcon className="h-6 w-6 text-amber-500" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-bold text-amber-800">Verse Insight</h3>
          <p className="mt-2 text-amber-700 font-serif">{insight}</p>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AiInsight;
