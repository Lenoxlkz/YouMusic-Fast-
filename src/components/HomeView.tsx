import React from 'react';
import { Play, Flame, Clock, Sparkles, Plus, Radio, Disc3 } from 'lucide-react';
import { Song } from '../types';

interface HomeViewProps {
  trendingSongs: Song[];
  recentSongs: Song[];
  isLoading: boolean;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  onPlaySong: (song: Song, newQueue?: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
}

const GENRE_TAGS = [
  { id: 'tendencias', label: '🔥 Tendencias' },
  { id: 'pop', label: '✨ Pop' },
  { id: 'rock', label: '🎸 Rock' },
  { id: 'lo-fi', label: '☕ Lo-Fi Relax' },
  { id: 'reggaeton', label: '🌴 Latino / Urbano' },
  { id: 'electronica', label: '⚡ Electrónica' },
  { id: 'indie', label: '🌿 Indie & Acústico' }
];

export const HomeView: React.FC<HomeViewProps> = ({
  trendingSongs,
  recentSongs,
  isLoading,
  selectedGenre,
  onSelectGenre,
  onPlaySong,
  onAddToQueue,
  currentSongId,
  isPlaying,
}) => {
  return (
    <div id="home-view-root" className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-40">
      {/* Top Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Disc3 className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              YouMusic <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400">Fast</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Streaming personal de YT Music directamente vía protocolo InnerTube
          </p>
        </div>

        {/* Status indicator badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            InnerTube Conectado
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs">
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            Audio HTML5
          </div>
        </div>
      </header>

      {/* Genre Pills Carousel */}
      <section className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {GENRE_TAGS.map((tag) => {
            const isSelected = selectedGenre === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onSelectGenre(tag.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
                    : 'liquid-glass-card text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Plays Section: Horizontal scroll line for up to 20 tracks */}
      {recentSongs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Reproducciones Recientes</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {recentSongs.slice(0, 20).length} recientes
            </span>
          </div>

          <div
            id="recent-songs-horizontal-scroll"
            className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory"
          >
            {recentSongs.slice(0, 20).map((song) => {
              const isCurrent = song.videoId === currentSongId;
              return (
                <div
                  key={`recent-${song.videoId}`}
                  className={`group relative flex-shrink-0 w-36 sm:w-44 snap-start liquid-glass-card rounded-2xl p-2.5 transition-all duration-200 cursor-pointer select-none ${
                    isCurrent ? 'liquid-glass-card-active ring-1 ring-rose-500' : 'hover:scale-[1.02]'
                  }`}
                  onClick={() => onPlaySong(song, [song])}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-white/10 mb-2 shadow-md">
                    {song.thumbnails?.[0]?.url ? (
                      <img
                        src={song.thumbnails[0].url}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-slate-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                      title="Reproducir"
                    >
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQueue(song);
                      }}
                      className="absolute left-2 top-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
                      title="Añadir a la cola"
                      aria-label="Añadir canción a la cola"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {song.durationFormatted && (
                      <span className="absolute left-2 bottom-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/90 font-mono">
                        {song.durationFormatted}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-rose-400 transition-colors">
                    {song.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {song.artist}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Trending & Featured Tracks Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {selectedGenre === 'tendencias' ? 'Éxitos Destacados' : `Canciones de ${selectedGenre.toUpperCase()}`}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {trendingSongs.length} pistas disponibles
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="liquid-glass-card rounded-2xl p-3 flex items-center gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/15 rounded w-3/4"></div>
                  <div className="h-2.5 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : trendingSongs.length === 0 ? (
          <div className="liquid-glass-card rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm font-medium text-slate-200">No se encontraron canciones en esta sección</p>
            <p className="text-xs text-slate-500">Prueba con otro género o realiza una búsqueda con el botón inferior</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trendingSongs.map((song, index) => {
              const isCurrent = song.videoId === currentSongId;
              return (
                <div
                  key={`${song.videoId}-${index}`}
                  className={`group relative liquid-glass-card rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 hover:scale-[1.01] ${
                    isCurrent ? 'liquid-glass-card-active border-rose-500/40 ring-1 ring-rose-500/40' : 'hover:border-white/15'
                  }`}
                >
                  {/* Left: Thumbnail and Play Trigger */}
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => onPlaySong(song, [song])}
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
                      {song.thumbnails?.[0]?.url ? (
                        <img
                          src={song.thumbnails[0].url}
                          alt={song.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
                        isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className={`text-sm font-semibold truncate transition-colors ${
                        isCurrent ? 'text-rose-400' : 'text-white group-hover:text-rose-300'
                      }`}>
                        {song.title}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {song.artist}
                      </p>
                      {song.album && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {song.album}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Duration and Add-to-Queue button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 font-mono">
                      {song.durationFormatted || '3:30'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQueue(song);
                      }}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Añadir a la cola"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
