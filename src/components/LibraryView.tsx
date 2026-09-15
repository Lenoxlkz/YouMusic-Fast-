import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Heart,
  Star,
  Loader2,
  RefreshCw,
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Song, UserPlaylist } from '../types';
import { authFetch, checkAuthStatus, onAuthChange, AccountInfo } from '../lib/auth';

interface LibraryViewProps {
  recentSongs: Song[];
  playlists: UserPlaylist[];
  onPlaySong: (song: Song, queue?: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  onClearHistory: () => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onPlayPlaylist: (playlist: UserPlaylist) => void;
  onOpenSettings?: () => void;
  currentSongId?: string;
  isPlaying?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  recentSongs,
  playlists: localPlaylists,
  onPlaySong,
  onAddToQueue,
  onClearHistory,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  onOpenSettings,
  currentSongId,
  isPlaying,
}) => {
  const [activeTab, setActiveTab] = useState<'liked' | 'playlists' | 'history'>('liked');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Authentication and remote library state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAccount, setUserAccount] = useState<AccountInfo | null>(null);
  const [likedMusic, setLikedMusic] = useState<Song[]>([]);
  const [remotePlaylists, setRemotePlaylists] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingRemotePlaylistId, setLoadingRemotePlaylistId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  /**
   * Automatic loading mechanism that validates session and retrieves
   * user's private YouTube playlists & liked music
   */
  const loadLibraryData = useCallback(async (manual: boolean = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoadingLibrary(true);

    try {
      // 1. Check & validate auth state (restores from dual cookie/localStorage)
      const auth = await checkAuthStatus();
      setIsLoggedIn(auth.loggedIn);
      if (auth.account) {
        setUserAccount(auth.account);
      }

      // 2. Fetch library data with auth credentials attached
      const res = await authFetch('/api/library');
      if (res.ok) {
        const data = await res.json();
        setLikedMusic(data.likedMusic || []);
        setRemotePlaylists(data.playlists || []);
        if (data.loggedIn !== undefined) {
          setIsLoggedIn(data.loggedIn);
        }

        if (manual) {
          setSyncFeedback(`Sincronizado: ${data.playlists?.length || 0} playlists y ${data.likedMusic?.length || 0} me gustas`);
          setTimeout(() => setSyncFeedback(null), 3000);
        }
      }
    } catch (e) {
      console.warn('Could not auto-load library:', e);
    } finally {
      setIsLoadingLibrary(false);
      setIsRefreshing(false);
    }
  }, []);

  // Automatic load on mount & subscribe to auth changes
  useEffect(() => {
    loadLibraryData(false);

    // Re-run automatic load whenever authentication validates or session updates
    const unsubscribe = onAuthChange((status) => {
      setIsLoggedIn(status.loggedIn);
      loadLibraryData(false);
    });

    return unsubscribe;
  }, [loadLibraryData]);

  // Play remote playlist by fetching songs on demand
  const handlePlayRemotePlaylist = async (playlistItem: any) => {
    const pid = playlistItem.id || playlistItem.playlistId;
    if (!pid) return;

    setLoadingRemotePlaylistId(pid);
    try {
      const res = await authFetch(`/api/playlist/${pid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.songs && data.songs.length > 0) {
          onPlaySong(data.songs[0], data.songs);
        } else {
          setSyncFeedback('Esta lista no contiene canciones disponibles.');
          setTimeout(() => setSyncFeedback(null), 3000);
        }
      }
    } catch (e) {
      console.warn('Error loading remote playlist items', e);
    } finally {
      setLoadingRemotePlaylistId(null);
    }
  };

  const historySongs = useMemo(() => {
    return recentSongs.slice(0, 50);
  }, [recentSongs]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historySongs;
    const q = searchQuery.toLowerCase();
    return historySongs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [historySongs, searchQuery]);

  const filteredLiked = useMemo(() => {
    if (!searchQuery.trim()) return likedMusic;
    const q = searchQuery.toLowerCase();
    return likedMusic.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [likedMusic, searchQuery]);

  const allPlaylists = useMemo(() => {
    return [...localPlaylists, ...remotePlaylists];
  }, [localPlaylists, remotePlaylists]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return allPlaylists;
    const q = searchQuery.toLowerCase();
    return allPlaylists.filter((p) => (p.title || p.name || '').toLowerCase().includes(q));
  }, [allPlaylists, searchQuery]);

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
                ? `${recentSongs.length} canciones`
                : activeTab === 'liked'
                ? `${likedMusic.length} canciones`
                : `${allPlaylists.length} listas`}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Tus canciones favoritas, historial y listas de reproducción sincronizadas
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {/* Synchronize Button */}
          <button
            type="button"
            onClick={() => loadLibraryData(true)}
            disabled={isRefreshing || isLoadingLibrary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Sincronizar y actualizar biblioteca"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {activeTab === 'history' && recentSongs.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onPlaySong(recentSongs[0], recentSongs)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all active:scale-95 cursor-pointer"
                title="Reproducir todo el historial"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Reproducir</span>
              </button>
              <button
                type="button"
                onClick={onClearHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition-colors cursor-pointer"
                title="Vaciar historial"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            </>
          )}

          {activeTab === 'liked' && likedMusic.length > 0 && (
            <button
              type="button"
              onClick={() => onPlaySong(likedMusic[0], likedMusic)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all active:scale-95 cursor-pointer"
              title="Reproducir todos los me gusta"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Reproducir todo</span>
            </button>
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

      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Account connection status banner */}
      <div className="mb-6 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isLoggedIn ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="text-white font-medium">Cuenta vinculada: </span>
                <span className="text-emerald-400 font-semibold">{userAccount?.name || 'YouTube Music'}</span>
                <span className="text-slate-400 ml-1.5 hidden md:inline">
                  • Sincronización automática de biblioteca activa
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="text-xs">
                <span className="text-slate-300 font-medium">Sesión no iniciada: </span>
                <span className="text-slate-400">
                  Conéctate a YouTube para sincronizar tus canciones con "Me gusta" y tus playlists privadas.
                </span>
              </div>
            </>
          )}
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              isLoggedIn
                ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
            }`}
          >
            {isLoggedIn ? 'Ver cuenta' : 'Conectar YouTube'}
          </button>
        )}
      </div>

      {/* Tabs: Me gustas, Playlists, Historial */}
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3 overflow-x-auto overflow-y-hidden">
        <button
          type="button"
          onClick={() => {
            setActiveTab('liked');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'liked'
              ? 'bg-yellow-400 text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Star className={`w-4 h-4 ${activeTab === 'liked' ? 'fill-black' : ''}`} />
          <span>Me gustas</span>
          {isLoadingLibrary ? (
            <Loader2 className="w-3 h-3 animate-spin ml-1" />
          ) : (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 font-mono">
              {likedMusic.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('playlists');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'playlists'
              ? 'bg-white text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Playlists</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 font-mono">
            {allPlaylists.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-white text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Historial</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 font-mono">
            {recentSongs.length}
          </span>
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'history'
              ? 'Filtrar canciones del historial...'
              : activeTab === 'liked'
              ? 'Filtrar canciones con me gusta...'
              : 'Filtrar listas de reproducción...'
          }
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
        />
      </div>

      {/* CREATE PLAYLIST FORM MODAL/INLINE */}
      {showCreateForm && (
        <div className="mb-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
          <h3 className="text-sm font-bold text-white mb-2">Crear nueva lista local</h3>
          <form onSubmit={handleCreateSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="Nombre de la lista..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-rose-500/50"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* TAB 1: ME GUSTAS */}
      {activeTab === 'liked' && (
        <>
          {isLoadingLibrary ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
              <p className="text-sm">Cargando tus canciones con "Me gusta"...</p>
            </div>
          ) : filteredLiked.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center mx-auto mb-4">
                <Star className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No hay canciones marcadas</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                {isLoggedIn
                  ? 'Dale me gusta a canciones mientras escuchas o verifica tu cuenta en YouTube Music para sincronizarlas.'
                  : 'Inicia sesión en YouTube para sincronizar automáticamente tu lista completa de canciones favoritas.'}
              </p>
              {!isLoggedIn && onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Conectar cuenta de YouTube
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLiked.map((song, idx) => {
                const isCurrent = currentSongId === song.videoId;
                const cover = song.thumbnails?.[0]?.url || '';

                return (
                  <div
                    key={`${song.videoId}-${idx}`}
                    onClick={() => onPlaySong(song, likedMusic)}
                    className={`group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-[#12151c]/60 hover:bg-white/[0.06] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                        {cover ? (
                          <img
                            src={cover}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Music className="w-5 h-5" />
                          </div>
                        )}
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-rose-400' : 'text-white'}`}>
                          {song.title}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {song.artist} {song.album ? `• ${song.album}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                        {song.durationFormatted || '3:00'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQueue(song);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
        </>
      )}

      {/* TAB 2: PLAYLISTS */}
      {activeTab === 'playlists' && (
        <>
          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <ListMusic className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No hay listas de reproducción</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                {isLoggedIn
                  ? 'Tus listas privadas de YouTube aparecerán aquí automáticamente tras sincronizarse, o puedes crear listas locales.'
                  : 'Inicia sesión con tu cuenta de YouTube para cargar tus listas privadas automáticamente.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Crear lista local
                </button>
                {!isLoggedIn && onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Conectar YouTube
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPlaylists.map((pl: any) => {
                const isRemote = pl.isRemote || !pl.songs;
                const id = pl.id || pl.playlistId;
                const title = pl.title || pl.name || 'Playlist';
                const count = pl.songs?.length ?? pl.itemCount?.text ?? pl.itemCount ?? 0;
                const cover = pl.coverUrl || pl.thumbnails?.[0]?.url || '';
                const isLoadingThis = loadingRemotePlaylistId === id;

                return (
                  <div
                    key={id}
                    className="group relative liquid-glass-card rounded-2xl p-4 flex flex-col justify-between border border-white/10 hover:border-white/20 transition-all bg-[#12151c]/80"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500/30 to-purple-600/30 border border-white/10 flex items-center justify-center flex-shrink-0 text-white overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ListMusic className="w-6 h-6 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white truncate">{title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{count} {count === 1 ? 'canción' : 'canciones'}</span>
                          {isRemote && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 font-medium">
                              YouTube
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Playlist Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        disabled={isLoadingThis || (count === 0 && !isRemote)}
                        onClick={() => {
                          if (isRemote) {
                            handlePlayRemotePlaylist(pl);
                          } else {
                            onPlayPlaylist(pl);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer"
                        title="Reproducir lista"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white" />
                        )}
                        <span>{isLoadingThis ? 'Cargando...' : 'Reproducir'}</span>
                      </button>

                      {!isRemote && (
                        <button
                          type="button"
                          onClick={() => onDeletePlaylist(id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Eliminar lista local"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 3: HISTORIAL */}
      {activeTab === 'history' && (
        <>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Sin historial reciente</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Las canciones que reproduzcas se guardarán automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((song, idx) => {
                const isCurrent = currentSongId === song.videoId;
                const cover = song.thumbnails?.[0]?.url || '';

                return (
                  <div
                    key={`${song.videoId}-${idx}`}
                    onClick={() => onPlaySong(song, historySongs)}
                    className={`group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-[#12151c]/60 hover:bg-white/[0.06] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                        {cover ? (
                          <img
                            src={cover}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Music className="w-5 h-5" />
                          </div>
                        )}
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-rose-400' : 'text-white'}`}>
                          {song.title}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {song.artist} {song.album ? `• ${song.album}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                        {song.durationFormatted || '3:00'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQueue(song);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
        </>
      )}
    </div>
  );
};
