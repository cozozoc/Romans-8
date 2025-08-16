
import React from 'react';

interface ProgressBarProps {
  totalVerses: number;
  completedCount: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ totalVerses, completedCount }) => {
  const percentage = totalVerses > 0 ? (completedCount / totalVerses) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-600">Progress</span>
        <span className="text-sm font-medium text-slate-600">{completedCount} / {totalVerses} Verses</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
