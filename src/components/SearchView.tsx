import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music, Disc, User, ListMusic, Play, Plus, Loader2 } from 'lucide-react';
import { Song, Album, Artist, Playlist, SearchFilter, SearchResults } from '../types';

interface SearchViewProps {
  onPlaySong: (song: Song, queue?: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  currentSongId?: string;
}

const FILTER_ITEMS: { id: SearchFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'songs', label: 'Canciones', icon: Music },
  { id: 'albums', label: 'Álbumes', icon: Disc },
  { id: 'artists', label: 'Artistas', icon: User },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'all', label: 'Todo', icon: Search }
];

const SUGGESTED_SEARCHES = [
  'Coldplay',
  'Dua Lipa',
  'Bad Bunny',
  'Taylor Swift',
  'The Weeknd',
  'Queen',
  'Ed Sheeran',
  'Billie Eilish'
];

export const SearchView: React.FC<SearchViewProps> = ({
  onPlaySong,
  onAddToQueue,
  currentSongId,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('songs');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    songs: [],
    albums: [],
    artists: [],
    playlists: []
  });
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input when search view opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch autocomplete suggestions as user types
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Suggestions error:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute search
  const handleExecuteSearch = async (searchQuery: string, filter: SearchFilter = activeFilter) => {
    const term = searchQuery.trim();
    if (!term) return;

    setShowSuggestions(false);
    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&filter=${filter}`);
      if (res.ok) {
        const data: SearchResults = await res.json();
        setResults({
          songs: Array.isArray(data.songs) ? data.songs : [],
          albums: Array.isArray(data.albums) ? data.albums : [],
          artists: Array.isArray(data.artists) ? data.artists : [],
          playlists: Array.isArray(data.playlists) ? data.playlists : []
        });
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteSearch(query);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleExecuteSearch(suggestion);
  };

  const handleFilterChange = (newFilter: SearchFilter) => {
    setActiveFilter(newFilter);
    if (query.trim()) {
      handleExecuteSearch(query, newFilter);
    }
  };

  return (
    <div id="search-view-root" className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-40">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          Buscar en YT Music
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Encuentra canciones, álbumes, artistas y listas de reproducción mediante InnerTube
        </p>
      </div>

      {/* Floating Liquid Glass Search Bar */}
      <div className="relative mb-6">
        <div className="liquid-glass-nav rounded-2xl sm:rounded-full p-2 flex items-center gap-3 border border-white/15 shadow-xl bg-[#0d121f]/90">
          <div className="pl-3 text-slate-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <input
            id="search-main-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="¿Qué quieres escuchar hoy? (Canción, artista, álbum...)"
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-400 outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors mr-1"
              title="Borrar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            id="search-submit-btn"
            type="button"
            onClick={() => handleExecuteSearch(query)}
            disabled={!query.trim() || isSearching}
            className="px-5 py-2.5 rounded-xl sm:rounded-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-rose-500/30"
          >
            Buscar
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            id="search-autocomplete-dropdown"
            className="absolute top-full left-0 right-0 mt-2 liquid-glass-nav rounded-2xl border border-white/15 shadow-2xl bg-[#0d121f]/95 overflow-hidden z-30 divide-y divide-white/5"
          >
            {suggestions.map((suggestion, idx) => (
              <button
                key={`${suggestion}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-5 py-3 text-xs sm:text-sm text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {FILTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isSelected = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleFilterChange(item.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-semibold'
                  : 'liquid-glass-card text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Search Chips (when no search done yet) */}
      {!hasSearched && (
        <div className="space-y-6">
          <div className="liquid-glass-card rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Disc className="w-4 h-4 text-rose-400" /> Búsquedas populares recomendadas
            </h3>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    handleExecuteSearch(term);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {isSearching && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
          <p className="text-sm">Consultando InnerTube de YT Music...</p>
        </div>
      )}

      {!isSearching && hasSearched && (
        <div className="space-y-8">
          {/* Songs Results */}
          {(activeFilter === 'songs' || activeFilter === 'all') && results.songs.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Music className="w-4 h-4 text-rose-400" /> Canciones ({results.songs.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.songs.map((song, index) => {
                  const isCurrent = song.videoId === currentSongId;
                  return (
                    <div
                      key={`search-song-${song.videoId}-${index}`}
                      className={`group liquid-glass-card rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 hover:scale-[1.01] ${
                        isCurrent ? 'liquid-glass-card-active border-rose-500/40 ring-1 ring-rose-500/40' : 'hover:border-white/15'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => onPlaySong(song, [song])}
                      >
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                          {song.thumbnails?.[0]?.url ? (
                            <img
                              src={song.thumbnails[0].url}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-rose-400 transition-colors">
                            {song.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {song.durationFormatted || ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToQueue(song)}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                          title="Añadir a la cola"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Albums Results */}
          {(activeFilter === 'albums' || activeFilter === 'all') && results.albums.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Disc className="w-4 h-4 text-indigo-400" /> Álbumes ({results.albums.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {results.albums.map((album, idx) => (
                  <div
                    key={`search-album-${album.albumId}-${idx}`}
                    className="liquid-glass-card rounded-2xl p-3 hover:scale-[1.02] transition-all cursor-pointer group"
                    onClick={() => {
                      setQuery(`${album.artist} ${album.title}`);
                      handleExecuteSearch(`${album.artist} ${album.title}`, 'songs');
                    }}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/10 mb-2">
                      {album.thumbnails?.[0]?.url ? (
                        <img
                          src={album.thumbnails[0].url}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{album.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{album.artist}</p>
                    {album.year && <p className="text-[10px] text-slate-500">{album.year}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Artists Results */}
          {(activeFilter === 'artists' || activeFilter === 'all') && results.artists.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" /> Artistas ({results.artists.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {results.artists.map((artist, idx) => (
                  <div
                    key={`search-artist-${artist.artistId}-${idx}`}
                    className="liquid-glass-card rounded-2xl p-3 flex flex-col items-center text-center hover:scale-[1.02] transition-all cursor-pointer group"
                    onClick={() => {
                      setQuery(artist.name);
                      handleExecuteSearch(artist.name, 'songs');
                    }}
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 mb-2 shadow-lg">
                      {artist.thumbnails?.[0]?.url ? (
                        <img
                          src={artist.thumbnails[0].url}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate w-full">{artist.name}</h4>
                    {artist.subscribers && (
                      <p className="text-[10px] text-slate-400">{artist.subscribers}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Playlists Results */}
          {(activeFilter === 'playlists' || activeFilter === 'all') && results.playlists.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-purple-400" /> Playlists ({results.playlists.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {results.playlists.map((playlist, idx) => (
                  <div
                    key={`search-pl-${playlist.playlistId}-${idx}`}
                    className="liquid-glass-card rounded-2xl p-3 hover:scale-[1.02] transition-all cursor-pointer group"
                    onClick={() => {
                      setQuery(playlist.title);
                      handleExecuteSearch(playlist.title, 'songs');
                    }}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/10 mb-2">
                      {playlist.thumbnails?.[0]?.url ? (
                        <img
                          src={playlist.thumbnails[0].url}
                          alt={playlist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{playlist.title}</h4>
                    {playlist.itemCount && (
                      <p className="text-[10px] text-slate-400">{playlist.itemCount} pistas</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No results message */}
          {results.songs.length === 0 &&
            results.albums.length === 0 &&
            results.artists.length === 0 &&
            results.playlists.length === 0 && (
              <div className="liquid-glass-card rounded-3xl p-12 text-center text-slate-400 space-y-2">
                <Music className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm font-medium text-slate-200">
                  No se encontraron resultados para "{query}"
                </p>
                <p className="text-xs text-slate-500">
                  Prueba cambiando el filtro o escribiendo el nombre del artista de otra forma
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
