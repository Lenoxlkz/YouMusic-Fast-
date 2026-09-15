import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Music2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Song } from '../types';

interface MiniPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onOpenFullscreen: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentSong,
  isPlaying,
  isLoadingAudio,
  onPlayPause,
  onNext,
  onOpenFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [currentSong?.title]);

  if (!currentSong) return null;

  const coverUrl = currentSong.thumbnails?.[0]?.url || '';

  return (
    <motion.div
      id="mini-player-dock"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-[74px] sm:bottom-[80px] left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40 pointer-events-auto"
    >
      <div
        id="mini-player-capsule"
        onClick={onOpenFullscreen}
        className="w-full h-14 sm:h-[58px] rounded-full bg-[#141822]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.16)] flex items-center justify-between px-2 sm:px-2.5 py-1.5 cursor-pointer transition-all hover:bg-[#1c2230]/90 active:scale-[0.99] group select-none"
        title="Toca para expandir el reproductor"
        role="button"
        aria-label="Abrir reproductor a pantalla completa"
      >
        {/* Left: Square Album Artwork */}
        <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Music2 className="w-5 h-5" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-3 bg-white animate-pulse" />
                <span className="w-0.5 h-2 bg-white animate-pulse delay-75" />
                <span className="w-0.5 h-3.5 bg-white animate-pulse delay-150" />
              </div>
            </div>
          )}
        </div>

        {/* Center: Track Title & Artist */}
        <div className="flex-1 min-w-0 px-2.5 sm:px-3 flex flex-col justify-center overflow-hidden">
          <div
            ref={containerRef}
            className="w-full overflow-hidden whitespace-nowrap relative mask-marquee"
            title={currentSong.title}
          >
            {isOverflowing ? (
              <div className="animate-marquee inline-block">
                <span ref={textRef} className="text-xs sm:text-sm font-semibold text-white tracking-tight pr-8">
                  {currentSong.title}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white tracking-tight pr-8">
                  {currentSong.title}
                </span>
              </div>
            ) : (
              <span
                ref={textRef}
                id="mini-player-title"
                className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate block group-hover:text-white"
              >
                {currentSong.title}
              </span>
            )}
          </div>
          <p
            id="mini-player-artist"
            className="text-[10px] sm:text-xs text-slate-400 truncate font-medium mt-0.5"
            title={currentSong.artist}
          >
            {currentSong.artist}
          </p>
        </div>

        {/* Right Controls: Play/Pause and Next Track */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 pr-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Play / Pause */}
          <button
            id="mini-player-playpause-btn"
            type="button"
            onClick={onPlayPause}
            disabled={isLoadingAudio}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-transform"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isLoadingAudio ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-white stroke-none" />
            ) : (
              <Play className="w-5 h-5 fill-white stroke-none ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            id="mini-player-next-btn"
            type="button"
            onClick={onNext}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-transform"
            title="Siguiente pista"
            aria-label="Siguiente pista"
          >
            <SkipForward className="w-5 h-5 fill-white stroke-none" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
