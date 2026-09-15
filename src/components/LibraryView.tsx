import React, { useState, useMemo } from 'react';
import {
  Play,
  Trash2,
  Clock,
  Music,
  Search,
  PlayCircle,
  Plus,
  FolderPlus,
  ListMusic,
  Sparkles,
} from 'lucide-react';
import { Song, UserPlaylist } from '../types';

interface LibraryViewProps {
  recentSongs: Song[];
  playlists: UserPlaylist[];
  onPlaySong: (song: Song, queue?: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  onClearHistory: () => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onPlayPlaylist: (playlist: UserPlaylist) => void;
  currentSongId?: string;
  isPlaying?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  recentSongs,
  playlists,
  onPlaySong,
  onAddToQueue,
  onClearHistory,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  currentSongId,
  isPlaying,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'playlists'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return recentSongs;
    const q = searchQuery.toLowerCase();
    return recentSongs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [recentSongs, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase();
    return playlists.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    onCreatePlaylist(newPlaylistTitle.trim());
    setNewPlaylistTitle('');
    setShowCreateForm(false);
  };

  return (
    <div id="library-view-page" className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-44">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Tu Biblioteca</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10">
              {activeTab === 'history'
                ? `${recentSongs.length} escuchadas`
                : `${playlists.length} listas`}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Tus reproducciones completas, colecciones y listas de reproducción personalizadas
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'history' && recentSongs.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onPlaySong(recentSongs[0], recentSongs)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all active:scale-95 cursor-pointer"
                title="Reproducir todo"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Reproducir todo</span>
              </button>
              <button
                type="button"
                onClick={onClearHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition-colors cursor-pointer"
                title="Borrar historial de biblioteca"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            </>
          )}

          {activeTab === 'playlists' && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nueva Lista</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Escuchadas (Historial completo) vs Listas de Reproducción */}
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Canciones Escuchadas</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 font-mono">
            {recentSongs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('playlists');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'playlists'
              ? 'bg-white text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Listas de Reproducción</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 font-mono">
            {playlists.length}
          </span>
        </button>
      </div>

      {/* Create Playlist Modal / Inline Box */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="mb-6 p-4 rounded-2xl bg-[#12151c] border border-rose-500/30 flex flex-col sm:flex-row gap-3 items-center"
        >
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre de la nueva lista:
            </label>
            <input
              type="text"
              autoFocus
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="Ej. Favoritas del Momento, Chillout, Roadtrip..."
              className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto sm:mt-5">
            <button
              type="submit"
              disabled={!newPlaylistTitle.trim()}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
            >
              Crear lista
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Search Input Filter */}
      {((activeTab === 'history' && recentSongs.length > 3) ||
        (activeTab === 'playlists' && playlists.length > 2)) && (
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'history'
                ? 'Filtrar canciones escuchadas...'
                : 'Buscar entre tus listas...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>
      )}

      {/* TAB 1: HISTORY (Canciones Escuchadas) */}
      {activeTab === 'history' && (
        <>
          {recentSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tu biblioteca está vacía</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1">
                Todas las canciones que reproduzcas se guardarán automáticamente aquí para que tengas acceso permanente a ellas.
              </p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No se encontraron resultados para "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSongs.map((song, index) => {
                const isThisCurrent = currentSongId === song.videoId;
                const cover = song.thumbnails?.[0]?.url || '';

                return (
                  <div
                    key={`${song.videoId}-${index}`}
                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all select-none ${
                      isThisCurrent
                        ? 'bg-white/15 border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                        : 'bg-[#12151c]/70 hover:bg-[#181c26] border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Left: Play trigger + Artwork + Info */}
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => onPlaySong(song, [song])}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                        {cover ? (
                          <img
                            src={cover}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Music className="w-5 h-5" />
                          </div>
                        )}
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isThisCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Play
                            className={`w-5 h-5 fill-white text-white ${
                              isThisCurrent && isPlaying ? 'animate-pulse' : ''
                            }`}
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isThisCurrent ? 'text-white' : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {song.title}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{song.artist}</p>
                      </div>
                    </div>

                    {/* Right: Duration + '+' Add to Queue Button */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {song.durationFormatted && (
                        <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                          {song.durationFormatted}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQueue(song);
                        }}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Añadir a la cola"
                        aria-label="Añadir a la cola"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: PLAYLISTS (Listas de Reproducción creadas por el usuario) */}
      {activeTab === 'playlists' && (
        <>
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 mb-4">
                <ListMusic className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white">No tienes listas creadas aún</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1">
                Puedes crear una lista aquí o guardar tu cola actual como lista de reproducción en cualquier momento.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="mt-5 px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear mi primera lista</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="group relative liquid-glass-card rounded-2xl p-4 flex flex-col justify-between border border-white/10 hover:border-white/20 transition-all bg-[#12151c]/80"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500/30 to-purple-600/30 border border-white/10 flex items-center justify-center flex-shrink-0 text-white">
                      {pl.coverUrl ? (
                        <img
                          src={pl.coverUrl}
                          alt={pl.title}
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ListMusic className="w-6 h-6 text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-white truncate">{pl.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {pl.songs.length} {pl.songs.length === 1 ? 'canción' : 'canciones'}
                      </p>
                    </div>
                  </div>

                  {/* Playlist Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      disabled={pl.songs.length === 0}
                      onClick={() => onPlayPlaylist(pl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer"
                      title="Reproducir lista"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Reproducir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeletePlaylist(pl.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Eliminar lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
