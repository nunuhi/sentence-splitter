import React, { useRef, useState, useEffect } from 'react';
import { ProcessedSegment } from '../types';

interface SegmentCardProps {
  segment: ProcessedSegment;
  index: number;
}

const SegmentCard: React.FC<SegmentCardProps> = ({ segment, index }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-md">
              #{index + 1}
            </span>
            <span className="text-slate-400 text-xs font-mono">
              {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
            </span>
          </div>
          <p className="text-slate-800 text-lg leading-relaxed font-medium">
            "{segment.text}"
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100">
        <button
          onClick={togglePlay}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${isPlaying 
              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
        >
          {isPlaying ? (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
               <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
             </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
            </svg>
          )}
          {isPlaying ? 'Pause' : 'Listen'}
        </button>

        <a
          href={segment.url}
          download={`sentence-${index + 1}.wav`}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-2 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l3.32-3.32m0 0-3.32-3.32M12 6v10.5" />
          </svg>
          Save Audio
        </a>
      </div>
      
      <audio ref={audioRef} src={segment.url} className="hidden" />
    </div>
  );
};

export default SegmentCard;
