import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  FileText,
  ListMusic,
  Music2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Song } from '../types';

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  hasFallbackAudio?: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentSong,
  isPlaying,
  isLoadingAudio,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  isRepeat,
  hasFallbackAudio = false,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLyrics,
  onToggleQueue,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  if (!currentSong) {
    return null;
  }

  const progressPercent = duration > 0
    ? ((isSeeking ? seekValue : currentTime) / duration) * 100
    : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value));
  };

  const handleSliderCommit = () => {
    setIsSeeking(false);
    onSeek(seekValue);
  };

  return (
    <motion.div
      id="player-bar-dock"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 pointer-events-auto"
    >
      <div
        id="player-bar-inner"
        className="liquid-glass-nav rounded-2xl sm:rounded-3xl p-3 sm:px-5 sm:py-3.5 border border-white/15 shadow-2xl flex flex-col gap-2 bg-[#0d121f]/90"
      >
        {/* Top row: Track Info, Playback Controls, Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Song Info (Left) */}
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:max-w-[32%]">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
              {currentSong.thumbnails?.[0]?.url ? (
                <img
                  src={currentSong.thumbnails[0].url}
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
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-3 bg-rose-400 animate-pulse"></span>
                    <span className="w-0.5 h-2 bg-rose-400 animate-pulse delay-75"></span>
                    <span className="w-0.5 h-3.5 bg-rose-400 animate-pulse delay-150"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h4
                id="player-track-title"
                className="text-xs sm:text-sm font-semibold text-white truncate hover:underline cursor-pointer"
                title={currentSong.title}
              >
                {currentSong.title}
              </h4>
              <p
                id="player-track-artist"
                className="text-[11px] sm:text-xs text-slate-400 truncate flex items-center gap-1.5"
                title={currentSong.artist}
              >
                <span>{currentSong.artist}</span>
                {hasFallbackAudio && (
                  <span
                    className="inline-flex items-center text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded"
                    title="Audio generado por modo compatibilidad"
                  >
                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Demo
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Primary Controls (Center) */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Shuffle */}
            <button
              id="player-shuffle-btn"
              type="button"
              onClick={onToggleShuffle}
              className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                isShuffle ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isShuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              id="player-prev-btn"
              type="button"
              onClick={onPrev}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Canción anterior"
              aria-label="Canción anterior"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              id="player-play-pause-btn"
              type="button"
              onClick={onPlayPause}
              disabled={isLoadingAudio}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-transform"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isLoadingAudio ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-slate-900" />
              ) : (
                <Play className="w-5 h-5 fill-slate-900 ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              id="player-next-btn"
              type="button"
              onClick={onNext}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Siguiente canción"
              aria-label="Siguiente canción"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Repeat */}
            <button
              id="player-repeat-btn"
              type="button"
              onClick={onToggleRepeat}
              className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                isRepeat ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isRepeat ? 'Desactivar repetición' : 'Repetir canción'}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Right Tools (Lyrics, Queue, Volume) */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-end">
            {/* Lyrics Button */}
            <button
              id="player-lyrics-btn"
              type="button"
              onClick={onToggleLyrics}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
              title="Ver letras sincronizadas"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Letras</span>
            </button>

            {/* Queue Button */}
            <button
              id="player-queue-btn"
              type="button"
              onClick={onToggleQueue}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
              title="Cola de reproducción"
            >
              <ListMusic className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Cola</span>
            </button>

            {/* Volume Control */}
            <div className="hidden lg:flex items-center gap-2 pl-2">
              <button
                id="player-mute-btn"
                type="button"
                onClick={onToggleMute}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-18 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500"
                title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>
          </div>
        </div>

        {/* Bottom Timeline Bar */}
        <div className="flex items-center gap-2.5 px-1 pt-0.5">
          <span className="text-[10px] text-slate-400 font-mono w-8 text-right select-none">
            {formatTime(isSeeking ? seekValue : currentTime)}
          </span>

          <div className="relative flex-1 flex items-center group cursor-pointer py-1">
            <input
              id="player-timeline-slider"
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={isSeeking ? seekValue : currentTime}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={handleSliderChange}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer accent-rose-500 transition-all group-hover:h-2"
              title="Línea de tiempo"
            />
            {/* Visual progress bar fill */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 pointer-events-none group-hover:h-2 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          <span className="text-[10px] text-slate-400 font-mono w-8 select-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
