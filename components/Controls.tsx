
import React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, BrainIcon, SparklesIcon, BookOpenIcon, SpeakerWaveIcon, StopIcon, MicrophoneIcon, PlayCircleIcon, ScissorsIcon, EyeIcon, EyeSlashIcon, ResetIcon } from './IconComponents';

interface ControlsProps {
  onPrev: () => void;
  onNext: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  memorizeMode: boolean;
  onToggleMemorize: () => void;
  onGetInsight: () => void;
  isAiLoading: boolean;
  onPlay: () => void;
  onStop: () => void;
  isSpeaking: boolean;
  onToggleRecord: () => void;
  isRecording: boolean;
  onPlayRecording: () => void;
  isPlayingRecording: boolean;
  hasRecording: boolean;
  onToggleChunkingMode: () => void;
  isChunkingMode: boolean;
  onToggleShowChunks: () => void;
  showChunks: boolean;
  onResetChunks: () => void;
  hasManualChunks: boolean;
}

const NavButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; 'aria-label': string; }> = ({ onClick, disabled, children, 'aria-label': ariaLabel }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center justify-center p-3 rounded-full bg-white shadow-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        aria-label={ariaLabel}
    >
        {children}
    </button>
);


const Controls: React.FC<ControlsProps> = ({ 
    onPrev, onNext, isPrevDisabled, isNextDisabled, 
    memorizeMode, onToggleMemorize, 
    onGetInsight, isAiLoading,
    onPlay, onStop, isSpeaking,
    onToggleRecord, isRecording,
    onPlayRecording, isPlayingRecording, hasRecording,
    onToggleChunkingMode, isChunkingMode,
    onToggleShowChunks, showChunks,
    onResetChunks, hasManualChunks,
}) => {
  const isBusy = isSpeaking || isRecording;

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 my-6">
      <NavButton onClick={onPrev} disabled={isPrevDisabled || isBusy} aria-label="Previous Verse">
        <ArrowLeftIcon className="h-6 w-6 text-slate-700" />
      </NavButton>

      {/* Central action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-2 bg-white rounded-full shadow-md">
        
        {/* Play/Stop TTS Button */}
        <button
          type="button"
          onClick={isSpeaking ? onStop : onPlay}
          disabled={isRecording}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm transform hover:scale-105 disabled:opacity-50"
          aria-label={isSpeaking ? "Stop reading verse" : "Read verse aloud"}
        >
          {isSpeaking ? <StopIcon className="h-6 w-6" /> : <SpeakerWaveIcon className="h-6 w-6" />}
        </button>
        
        {/* Record/Stop Recording Button */}
        <button
          type="button"
          onClick={onToggleRecord}
          disabled={isSpeaking}
          className={`flex items-center justify-center h-12 w-12 rounded-full text-white transition-colors shadow-sm transform hover:scale-105 disabled:opacity-50 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-700'}`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
        </button>

        {/* Play User Recording Button */}
        {hasRecording && (
          <button
            type="button"
            onClick={onPlayRecording}
            disabled={isBusy}
            className="flex items-center justify-center h-12 w-12 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm transform hover:scale-105 disabled:opacity-50"
            aria-label={isPlayingRecording ? "Stop playback" : "Play your recording"}
          >
            {isPlayingRecording ? <StopIcon className="h-6 w-6" /> : <PlayCircleIcon className="h-6 w-6" />}
          </button>
        )}

        {/* Memorize/Read Button */}
        <button
          type="button"
          onClick={onToggleMemorize}
          disabled={isBusy}
          className="flex items-center gap-2 text-slate-700 font-bold h-12 px-4 sm:px-5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label={memorizeMode ? 'Switch to Read Mode' : 'Switch to Memorize Mode'}
        >
          {memorizeMode ? <BookOpenIcon className="h-6 w-6" /> : <BrainIcon className="h-6 w-6" />}
          <span className="hidden sm:inline">{memorizeMode ? 'Read' : 'Memorize'}</span>
        </button>
        
        {/* Divide by Chunk Button */}
        <button
          type="button"
          onClick={onToggleChunkingMode}
          disabled={isBusy}
          className={`flex items-center gap-2 text-slate-700 font-bold h-12 px-4 sm:px-5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 ${isChunkingMode ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
          aria-label={isChunkingMode ? 'Exit Chunk Mode' : 'Enter Chunk Mode'}
          aria-pressed={isChunkingMode}
        >
          <ScissorsIcon className="h-6 w-6" />
          <span className="hidden sm:inline">Divide</span>
        </button>

        {/* Show/Hide Chunks Button */}
        <button
          type="button"
          onClick={onToggleShowChunks}
          disabled={isBusy || !hasManualChunks}
          className="flex items-center gap-2 text-slate-700 font-bold h-12 px-4 sm:px-5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label={showChunks ? 'Hide Chunks' : 'Show Chunks'}
          aria-pressed={showChunks}
        >
          {showChunks ? <EyeSlashIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
          <span className="hidden sm:inline">{showChunks ? 'Hide' : 'Show'}</span>
        </button>

        {/* Reset Chunks Button */}
        <button
          type="button"
          onClick={onResetChunks}
          disabled={isBusy || !hasManualChunks}
          className="flex items-center gap-2 text-slate-700 font-bold h-12 px-4 sm:px-5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label={'Reset Chunks'}
        >
          <ResetIcon className="h-6 w-6" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* AI Insight Button */}
        <button
          type="button"
          onClick={onGetInsight}
          disabled={isAiLoading || isBusy}
          className="flex items-center gap-2 text-slate-700 font-bold h-12 px-4 sm:px-5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
          aria-label="Get AI insight"
        >
          {isAiLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-800"></div>
          ) : (
            <SparklesIcon className="h-6 w-6 text-amber-500" />
          )}
          <span className="hidden sm:inline">{isAiLoading ? 'Thinking...' : 'Insight'}</span>
        </button>
      </div>

      <NavButton onClick={onNext} disabled={isNextDisabled || isBusy} aria-label="Next Verse">
        <ArrowRightIcon className="h-6 w-6 text-slate-700" />
      </NavButton>
    </div>
  );
};

export default Controls;
