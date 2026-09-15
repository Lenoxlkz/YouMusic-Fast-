import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Infinity as InfinityIcon,
  ListMusic,
  ChevronRight,
  Music2,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, LyricsData, RepeatMode } from '../types';
import { authFetch } from '../lib/auth';

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  currentTime: number;
  duration: number;
  lyrics: LyricsData | null;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isAutoplay: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleAutoplay: () => void;
  onToggleQueue: () => void;
  onOpenFullLyrics: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatRemainingTime(currentTime: number, duration: number): string {
  if (!duration || isNaN(duration) || duration <= 0) return '-0:00';
  const remaining = Math.max(0, duration - currentTime);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `-${mins}:${secs.toString().padStart(2, '0')}`;
}

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  isLoadingAudio,
  currentTime,
  duration,
  lyrics,
  isShuffle,
  repeatMode,
  isAutoplay,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onToggleAutoplay,
  onToggleQueue,
  onOpenFullLyrics,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setIsLiked(false);
  }, [currentSong?.videoId]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    try {
      await authFetch(newStatus ? '/api/library/like' : '/api/library/dislike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: currentSong.videoId })
      });
    } catch (e) {}
  };

  if (!isOpen || !currentSong) return null;

  // Active lyric line calculation for the single-line snippet
  let activeLyricText = '';
  if (lyrics?.synced && lyrics.lines && lyrics.lines.length > 0) {
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.lines[i].time) {
        activeLyricText = lyrics.lines[i].text;
        break;
      }
    }
  }
  if (!activeLyricText) {
    activeLyricText = lyrics?.lines?.[0]?.text || 'Toca para ver letras';
  }

  const effectiveTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? (effectiveTime / duration) * 100 : 0;
  const coverUrl = currentSong.thumbnails?.[0]?.url || '';

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value));
  };

  const handleSliderCommit = () => {
    setIsSeeking(false);
    onSeek(seekValue);
  };

  return (
    <AnimatePresence>
      <motion.div
        id="fullscreen-player-container"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#07090e] text-white select-none h-screen h-[100dvh]"
      >
        {/* Dynamic Fullscreen Blurred Artwork Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover scale-150 blur-3xl opacity-40 filter brightness-90"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#181d28] to-[#07090e]" />
          )}
          {/* Subtle vignette gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/90" />
        </div>

        {/* Top Header / Dismiss Bar */}
        <header
          id="fullscreen-player-topbar"
          className="relative z-10 flex flex-col items-center px-5 pt-3 pb-1 flex-shrink-0"
        >
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/30 mb-2 sm:hidden" />

          <div className="w-full flex items-center justify-between">
            <button
              id="fullscreen-close-btn"
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
              title="Minimizar reproductor"
              aria-label="Minimizar reproductor"
            >
              <ChevronDown className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* Brand title */}
            <span className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
              YouMusic Fast
            </span>

            <div className="w-10" />
          </div>
        </header>

        {/* Center Artwork: fluidly bounded so it never clips controls on short screens */}
        <div
          id="fullscreen-player-art-section"
          className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-6 py-2"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-[280px] sm:max-w-[340px] max-h-[36vh] sm:max-h-[42vh] aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/15"
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#181b24]">
                <Music2 className="w-16 h-16 text-white/30" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Lower Controls & Metadata Section */}
        <div
          id="fullscreen-player-controls-section"
          className="relative z-10 w-full max-w-lg mx-auto px-6 sm:px-8 pb-6 sm:pb-8 flex flex-col justify-end gap-3.5 sm:gap-4 flex-shrink-0"
        >
          {/* Song Title & Artist & Like Button */}
          <div id="fullscreen-metadata" className="flex items-center justify-between text-left">
            <div className="flex-1 min-w-0 pr-4">
              <h2
                id="fullscreen-song-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate"
                title={currentSong.title}
              >
                {currentSong.title}
              </h2>
              <p
                id="fullscreen-song-artist"
                className="text-sm sm:text-base font-medium text-slate-300 truncate mt-0.5"
                title={currentSong.artist}
              >
                {currentSong.artist}
              </p>
            </div>
            <button
              onClick={handleLikeToggle}
              className={`p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 ${
                isLiked ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
              title={isLiked ? "Quitar de me gusta" : "Añadir a me gusta"}
            >
              <Star className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${isLiked ? 'fill-yellow-400' : ''}`} />
            </button>
          </div>

          {/* Interactive Single-Line Lyric Snippet (Image 2 style) */}
          <div id="fullscreen-lyric-snippet">
            <button
              type="button"
              onClick={onOpenFullLyrics}
              className="w-full text-left flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.99] backdrop-blur-md border border-white/[0.08] transition-all cursor-pointer group"
              title="Ver letras sincronizadas completas"
            >
              <span className="text-xs sm:text-sm font-medium text-white/90 group-hover:text-white truncate transition-colors drop-shadow-sm">
                "{activeLyricText}"
              </span>
              <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Progress Bar & Timestamps */}
          <div id="fullscreen-timeline" className="flex flex-col gap-1">
            <div className="relative flex items-center group cursor-pointer py-2">
              <input
                id="fullscreen-timeline-slider"
                type="range"
                min="0"
                max={duration || 100}
                step="0.25"
                value={effectiveTime}
                onMouseDown={() => setIsSeeking(true)}
                onTouchStart={() => setIsSeeking(true)}
                onChange={handleSliderChange}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                title="Línea de tiempo"
              />
              {/* Solid white fill for elapsed portion */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white pointer-events-none"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>

            {/* Timestamps: Elapsed on left, Remaining on right */}
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-300 font-mono">
              <span id="fullscreen-current-time">{formatTime(effectiveTime)}</span>
              <span id="fullscreen-remaining-time">
                {formatRemainingTime(effectiveTime, duration)}
              </span>
            </div>
          </div>

          {/* Main Playback Controls: Prev, Play/Pause, Next */}
          <div
            id="fullscreen-main-controls"
            className="flex items-center justify-center gap-8 sm:gap-12 py-1"
          >
            {/* Skip Previous */}
            <button
              id="fullscreen-prev-btn"
              type="button"
              onClick={onPrev}
              className="text-white hover:scale-110 active:scale-90 transition-transform p-2 cursor-pointer"
              title="Anterior"
              aria-label="Pista anterior"
            >
              <SkipBack className="w-8 h-8 sm:w-9 sm:h-9 fill-white stroke-none" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              id="fullscreen-playpause-btn"
              type="button"
              onClick={onPlayPause}
              disabled={isLoadingAudio}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_8px_24px_rgba(255,255,255,0.3)] cursor-pointer"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isLoadingAudio ? (
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-black stroke-none" />
              ) : (
                <Play className="w-7 h-7 fill-black stroke-none ml-1" />
              )}
            </button>

            {/* Skip Next */}
            <button
              id="fullscreen-next-btn"
              type="button"
              onClick={onNext}
              className="text-white hover:scale-110 active:scale-90 transition-transform p-2 cursor-pointer"
              title="Siguiente"
              aria-label="Siguiente pista"
            >
              <SkipForward className="w-8 h-8 sm:w-9 sm:h-9 fill-white stroke-none" />
            </button>
          </div>

          {/* Bottom Row Tools: Shuffle, Repeat, Infinity (Loop/Radio), Queue */}
          <div
            id="fullscreen-bottom-tools"
            className="flex items-center justify-between px-2 pt-1"
          >
            {/* Shuffle */}
            <button
              id="fullscreen-shuffle-btn"
              type="button"
              onClick={onToggleShuffle}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isShuffle ? 'text-white bg-white/20' : 'text-slate-400 hover:text-white'
              }`}
              title={isShuffle ? 'Aleatorio activado' : 'Activar aleatorio'}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Repeat / Loop in loop mode (Off -> Repeat All -> Repeat One) */}
            <button
              id="fullscreen-repeat-btn"
              type="button"
              onClick={onToggleRepeat}
              className={`p-2 rounded-full transition-all cursor-pointer relative ${
                repeatMode !== 'off'
                  ? 'text-white bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                repeatMode === 'one'
                  ? 'Repetir canción actual en bucle (activado)'
                  : repeatMode === 'all'
                  ? 'Repetir lista/cola completa en bucle (activado)'
                  : 'Repetición desactivada'
              }
              aria-label="Modo de repetición en bucle"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5 stroke-[2.4] text-rose-400" />
              ) : (
                <Repeat className={`w-5 h-5 ${repeatMode === 'all' ? 'text-white stroke-[2.2]' : ''}`} />
              )}
              {repeatMode !== 'off' && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400" />
              )}
            </button>

            {/* Center Infinity (Autoplay / Radio Loop) Button */}
            <button
              id="fullscreen-infinity-btn"
              type="button"
              onClick={onToggleAutoplay}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isAutoplay
                  ? 'bg-white/25 text-white shadow-[0_0_16px_rgba(255,255,255,0.25)] border border-white/30'
                  : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/15 border border-transparent'
              }`}
              title={isAutoplay ? 'Radio infinita (generar canciones similares) activada' : 'Activar radio infinita (generar similares)'}
              aria-label="Autoplay infinito"
            >
              <InfinityIcon className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Queue / Playlist */}
            <button
              id="fullscreen-queue-btn"
              type="button"
              onClick={onToggleQueue}
              className="p-2 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Cola de reproducción"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
