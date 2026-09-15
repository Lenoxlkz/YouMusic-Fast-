import React, { useEffect, useRef } from 'react';
import { X, Music2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LyricsData, Song } from '../types';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  lyrics: LyricsData | null;
  isLoading: boolean;
  currentTime: number;
  onSeek: (time: number) => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  song,
  lyrics,
  isLoading,
  currentTime,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active lyric line into center view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && lyrics?.synced) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, lyrics?.synced]);

  // Find active line index
  let activeIndex = -1;
  if (lyrics?.synced && lyrics.lines.length > 0) {
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.lines[i].time) {
        activeIndex = i;
        break;
      }
    }
  }

  const isActuallySynced = Boolean(lyrics?.synced && lyrics.lines && lyrics.lines.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="lyrics-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            id="lyrics-modal-container"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-2xl h-[88dvh] sm:h-[680px] sm:max-h-[85vh] flex flex-col bg-[#121622]/95 backdrop-blur-2xl border-t sm:border border-white/[0.12] rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-[0_-16px_48px_rgba(0,0,0,0.7)]"
          >
            {/* Mobile Top Drag Pill */}
            <div className="w-12 h-1 rounded-full bg-white/25 mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

            {/* Clean Header */}
            <div
              id="lyrics-modal-header"
              className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/[0.08] flex-shrink-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
                  {song?.thumbnails?.[0]?.url ? (
                    <img
                      src={song.thumbnails[0].url}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Music2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3
                    id="lyrics-song-title"
                    className="text-sm sm:text-base font-semibold text-white truncate"
                    title={song?.title}
                  >
                    {song?.title || 'Canción'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p
                      id="lyrics-song-artist"
                      className="text-xs text-slate-400 truncate font-medium"
                      title={song?.artist}
                    >
                      {song?.artist || 'Artista'}
                    </p>
                    {isActuallySynced && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 tracking-wide">
                        Sincronizadas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                id="lyrics-close-button"
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                title="Cerrar letras"
                aria-label="Cerrar letras"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lyrics Body */}
            <div
              id="lyrics-scroll-body"
              ref={containerRef}
              className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-3 select-none scroll-smooth"
            >
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-20">
                  <Sparkles className="w-8 h-8 animate-spin text-rose-400" />
                  <p className="text-sm font-medium text-slate-300">Buscando y sincronizando letras...</p>
                </div>
              ) : isActuallySynced ? (
                <div className="space-y-4 py-6">
                  {lyrics!.lines.map((line, idx) => {
                    const isActive = idx === activeIndex;
                    const isPast = idx < activeIndex;
                    return (
                      <button
                        key={`${line.time}-${idx}`}
                        ref={isActive ? activeLineRef : null}
                        type="button"
                        onClick={() => onSeek(line.time)}
                        className={`w-full text-left transition-all duration-200 rounded-2xl px-4 py-3 group block cursor-pointer ${
                          isActive
                            ? 'text-white text-xl sm:text-2xl font-bold scale-[1.01] bg-white/[0.12] shadow-md border border-white/10'
                            : isPast
                            ? 'text-slate-400 text-base sm:text-lg font-medium opacity-65 hover:opacity-100 hover:text-white'
                            : 'text-slate-500 text-base sm:text-lg font-normal hover:text-slate-300'
                        }`}
                        title={`Saltar a ${Math.floor(line.time / 60)}:${Math.floor(line.time % 60).toString().padStart(2, '0')}`}
                      >
                        <span className="inline-block transition-transform duration-150 group-hover:translate-x-1">
                          {line.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : lyrics?.plainText && !lyrics.plainText.includes('No se encontraron letras') ? (
                <div className="py-6 px-2 whitespace-pre-line text-slate-200 text-base sm:text-lg leading-relaxed font-medium">
                  {lyrics.plainText}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-16">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                    <Music2 className="w-7 h-7 stroke-[1.8]" />
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-white">
                    Sin letras disponibles
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                    No se encontró transcripción sincronizada para esta versión o remix en las bases de datos.
                  </p>
                  <p className="text-xs text-slate-500 mt-3">
                    Disfruta de la reproducción continua en YouMusic Fast.
                  </p>
                </div>
              )}
            </div>

            {/* Clean Footer Notice */}
            <div
              id="lyrics-modal-footer"
              className="px-5 sm:px-6 py-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0"
            >
              <span>Toca cualquier verso para saltar en la canción</span>
              <span>YouMusic Fast</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
