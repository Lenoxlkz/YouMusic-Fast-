import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiquidNavbar } from './components/LiquidNavbar';
import { MiniPlayer } from './components/MiniPlayer';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { LyricsModal } from './components/LyricsModal';
import { QueueModal } from './components/QueueModal';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { ExploreView } from './components/ExploreView';
import { LibraryView } from './components/LibraryView';
import { Song, LyricsData, NavigationTab, RepeatMode, UserPlaylist } from './types';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('play');

  // Player State
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('youmusic_volume');
    return saved ? Number(saved) : 0.85;
  });
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isAutoplay, setIsAutoplay] = useState<boolean>(true);

  // Playlists State persisted in localStorage
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem('youmusic_user_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fullscreen Player & Modals
  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  // Content Data
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem('youmusic_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingHome, setIsLoadingHome] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('tendencias');

  // Audio Engine References
  const ytPlayerRef = useRef<any>(null);
  const [isYtReady, setIsYtReady] = useState<boolean>(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTrackEndedRef = useRef<() => void>();
  const handleNextTrackRef = useRef<() => void>();

  // Initialize YouTube Iframe Player (Runs in browser to stream authentic audio 100% reliably)
  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      try {
        ytPlayerRef.current = new window.YT.Player('youtube-audio-engine-iframe', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              setIsYtReady(true);
              event.target.setVolume(volume * 100);
              if (pendingVideoIdRef.current) {
                event.target.loadVideoById(pendingVideoIdRef.current);
                pendingVideoIdRef.current = null;
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
              if (event.data === 1) {
                setIsPlaying(true);
                setIsLoadingAudio(false);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 3) {
                setIsLoadingAudio(true);
              } else if (event.data === 0) {
                if (handleTrackEndedRef.current) handleTrackEndedRef.current();
              }
            },
            onError: (err: any) => {
              console.warn('YouTube audio engine notice:', err);
              setIsLoadingAudio(false);
              // Gracefully handle unavailable videos by skipping to next track
              if (handleNextTrackRef.current) handleNextTrackRef.current();
            },
          },
        });
      } catch (e) {
        console.warn('Error initializing YT Player:', e);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
      document.body.appendChild(tag);
    } else {
      initPlayer();
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Poll current time & duration from YouTube Player engine
  useEffect(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    progressTimerRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const t = ytPlayerRef.current.getCurrentTime() || 0;
          const d = ytPlayerRef.current.getDuration() || currentSong?.duration || 0;
          setCurrentTime(t);
          if (d > 0) setDuration(d);
        } catch (e) {}
      }
    }, 250);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentSong]);

  // Sync volume with player engine
  useEffect(() => {
    localStorage.setItem('youmusic_volume', volume.toString());
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  // Load home music
  const loadHomeMusic = useCallback(async (genre: string) => {
    setIsLoadingHome(true);
    try {
      if (genre === 'tendencias') {
        const res = await fetch('/api/home');
        if (res.ok) {
          const data = await res.json();
          setTrendingSongs(Array.isArray(data.trending) ? data.trending : []);
        }
      } else {
        const res = await fetch(`/api/search?q=${encodeURIComponent(`${genre} music hits`)}&filter=songs`);
        if (res.ok) {
          const data = await res.json();
          setTrendingSongs(Array.isArray(data.songs) ? data.songs : []);
        }
      }
    } catch (err) {
      console.warn('Error loading home songs:', err);
    } finally {
      setIsLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    loadHomeMusic(selectedGenre);
  }, [selectedGenre, loadHomeMusic]);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!currentSong) {
      setLyrics(null);
      return;
    }

    let isMounted = true;
    setIsLoadingLyrics(true);

    const fetchSongLyrics = async () => {
      try {
        const url = `/api/lyrics?artist=${encodeURIComponent(currentSong.artist)}&title=${encodeURIComponent(currentSong.title)}&duration=${currentSong.duration || 180}`;
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data: LyricsData = await res.json();
          setLyrics(data);
        }
      } catch (e) {
        if (isMounted) {
          setLyrics({
            synced: false,
            lines: [],
            plainText: 'No se pudieron sincronizar las letras.',
            provider: 'Error',
          });
        }
      } finally {
        if (isMounted) setIsLoadingLyrics(false);
      }
    };

    fetchSongLyrics();
    return () => {
      isMounted = false;
    };
  }, [currentSong]);

  // Setup OS MediaSession controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || 'YouMusic Fast',
        artwork:
          currentSong.thumbnails?.map((t) => ({
            src: t.url,
            sizes: `${t.width || 120}x${t.height || 120}`,
            type: 'image/jpeg',
          })) || [],
      });

      navigator.mediaSession.setActionHandler('play', handlePlayPause);
      navigator.mediaSession.setActionHandler('pause', handlePlayPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handleSeek(details.seekTime);
        }
      });
    }
  }, [currentSong, isPlaying]);

  // Play a song
  const handlePlaySong = async (song: Song, newQueue?: Song[]) => {
    setCurrentSong(song);
    setIsLoadingAudio(true);
    setCurrentTime(0);

    // Update queue
    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((s) => s.videoId === song.videoId);
      setCurrentIndex(idx !== -1 ? idx : 0);
    } else if (queue.length === 0) {
      setQueue([song]);
      setCurrentIndex(0);
    }

    // If the queue was started with just one song, and Autoplay is ON, pre-generate the mix immediately!
    if (newQueue && newQueue.length === 1 && isAutoplay) {
      // Fetch related tracks in background and append to queue seamlessly
      fetch(`/api/radio/${song.videoId}`)
        .then(res => res.json())
        .then(tracks => {
          if (tracks && tracks.length > 0) {
            setQueue(prev => {
              const existingIds = new Set(prev.map(s => s.videoId));
              const newTracks = tracks.filter((t: Song) => !existingIds.has(t.videoId));
              return [...prev, ...newTracks];
            });
          }
        })
        .catch(err => console.warn('Pre-generate radio error:', err));
    }

    // Save to recents/library history (preserves all listened tracks)
    setRecentSongs((prev) => {
      const filtered = prev.filter((s) => s.videoId !== song.videoId);
      const updated = [song, ...filtered].slice(0, 300);
      try {
        localStorage.setItem('youmusic_recent', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Play in YouTube Audio Engine
    if (ytPlayerRef.current && isYtReady && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById(song.videoId);
        ytPlayerRef.current.playVideo();
      } catch (err) {
        console.warn('Playback launch notice:', err);
      }
    } else {
      pendingVideoIdRef.current = song.videoId;
    }
  };

  const handleAddToQueue = (song: Song) => {
    setQueue((prev) => {
      const exists = prev.some((s) => s.videoId === song.videoId);
      if (exists) return prev;
      return [...prev, song];
    });
  };

  // Move Track within Queue (reorder)
  const handleMoveQueueTrack = (fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Adjust currentIndex if necessary
      if (currentIndex === fromIndex) {
        setCurrentIndex(toIndex);
      } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
        setCurrentIndex(currentIndex + 1);
      }

      return updated;
    });
  };

  // Shuffle the entire queue randomly
  const handleShuffleQueue = () => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      const currentTrack = currentIndex >= 0 ? prev[currentIndex] : null;
      const remaining = prev.filter((_, idx) => idx !== currentIndex);

      // Fisher-Yates shuffle
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      const shuffled = currentTrack ? [currentTrack, ...remaining] : remaining;
      setCurrentIndex(currentTrack ? 0 : 0);
      return shuffled;
    });
  };

  // Toggle Shuffle mode (and shuffle current queue if activated)
  const handleToggleShuffle = () => {
    setIsShuffle((prev) => {
      const nextVal = !prev;
      if (nextVal) {
        handleShuffleQueue();
      }
      return nextVal;
    });
  };

  // Toggle Repeat Mode: off -> all -> one -> off
  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Playlist management
  const handleCreatePlaylist = (title: string, songs: Song[] = []) => {
    const newPlaylist: UserPlaylist = {
      id: `pl-${Date.now()}`,
      title,
      createdAt: Date.now(),
      songs,
      coverUrl: songs[0]?.thumbnails?.[0]?.url,
    };
    setPlaylists((prev) => {
      const updated = [newPlaylist, ...prev];
      try {
        localStorage.setItem('youmusic_user_playlists', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('youmusic_user_playlists', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleAddQueueToPlaylist = (playlistId: string) => {
    if (queue.length === 0) return;
    setPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        // Merge without duplicates
        const existingIds = new Set(pl.songs.map((s) => s.videoId));
        const newSongs = queue.filter((s) => !existingIds.has(s.videoId));
        return {
          ...pl,
          songs: [...pl.songs, ...newSongs],
          coverUrl: pl.coverUrl || queue[0]?.thumbnails?.[0]?.url,
        };
      });
      try {
        localStorage.setItem('youmusic_user_playlists', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handlePlayPlaylist = (playlist: UserPlaylist) => {
    if (playlist.songs.length === 0) return;
    setQueue(playlist.songs);
    setCurrentIndex(0);
    handlePlaySong(playlist.songs[0], playlist.songs);
  };

  // Play / Pause Toggle
  const handlePlayPause = () => {
    if (!ytPlayerRef.current || !currentSong) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Play/Pause error:', e);
    }
  };

  // Autoplay - Fetch related tracks and append to queue
  const handleAutoplayNext = async (currentVideoId: string) => {
    try {
      const res = await fetch(`/api/radio/${currentVideoId}`);
      if (!res.ok) throw new Error('Radio fetch failed');
      const tracks: Song[] = await res.json();
      if (tracks && tracks.length > 0) {
        setQueue(prev => {
          const existingIds = new Set(prev.map(s => s.videoId));
          let newTracks = tracks.filter(t => !existingIds.has(t.videoId));
          
          if (newTracks.length === 0) {
            // Fallback 1: Filter only against the last 20 songs
            const recentIds = new Set(prev.slice(-20).map(s => s.videoId));
            newTracks = tracks.filter(t => !recentIds.has(t.videoId));
          }

          if (newTracks.length === 0) {
            // Fallback 2: Just take 5 random tracks to keep the music playing!
            newTracks = tracks.sort(() => 0.5 - Math.random()).slice(0, 5);
          }
          
          if (newTracks.length === 0) {
            // Absolute fallback if API returned exactly 0 tracks
            setCurrentIndex(0);
            setTimeout(() => handlePlaySong(prev[0], prev), 0);
            return prev;
          }
          
          const updatedQueue = [...prev, ...newTracks];
          const nextIndex = prev.length;
          const nextSong = updatedQueue[nextIndex];
          
          setCurrentIndex(nextIndex);
          // Play next track immediately with the new queue
          setTimeout(() => handlePlaySong(nextSong, updatedQueue), 0);
          
          return updatedQueue;
        });
        return;
      }
    } catch (e) {
      console.error('Autoplay error:', e);
    }
    // Fallback if failed
    setIsPlaying(false);
  };

  // Next Track
  const handleNextTrack = () => {
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (isShuffle && queue.length > 1) {
      nextIndex = Math.floor(Math.random() * queue.length);
      if (nextIndex === currentIndex) {
        nextIndex = (currentIndex + 1) % queue.length;
      }
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0; // Loop back in queue
      } else if (isAutoplay && currentSong) {
        // We reached the end of the queue and autoplay is ON -> Generate related music
        handleAutoplayNext(currentSong.videoId);
        return; // handleAutoplayNext will manage state and play
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextSong = queue[nextIndex];
    if (nextSong) {
      setCurrentIndex(nextIndex);
      handlePlaySong(nextSong, queue);
    }
  };

  // Previous Track
  const handlePrevTrack = () => {
    if (currentTime > 4 && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(0, true);
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    const prevSong = queue[prevIndex];
    if (prevSong) {
      setCurrentIndex(prevIndex);
      handlePlaySong(prevSong, queue);
    }
  };

  // Seek
  const handleSeek = (time: number) => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  // Track Ended (Loop support: repeat 'one', repeat 'all', or autoplay)
  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      // Loop the current single track seamlessly
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      }
    } else {
      handleNextTrack();
    }
  };

  // Keep refs up-to-date for YouTube iframe callbacks
  handleTrackEndedRef.current = handleTrackEnded;
  handleNextTrackRef.current = handleNextTrack;

  // Clear recents history
  const handleClearHistory = () => {
    setRecentSongs([]);
    try {
      localStorage.removeItem('youmusic_recent');
    } catch {}
  };

  return (
    <div
      id="youmusic-fast-app"
      className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col relative overflow-x-hidden font-sans select-none"
    >
      {/* Hidden YouTube Engine Iframe for 100% Genuine, Pure Audio Streaming */}
      <div
        id="youtube-audio-engine-wrapper"
        className="fixed -bottom-40 -left-40 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
      >
        <div id="youtube-audio-engine-iframe" />
      </div>

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-[28rem] h-[28rem] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content Area */}
      <main id="main-content-viewport" className="flex-1 relative z-10">
        {activeTab === 'play' && (
          <HomeView
            trendingSongs={trendingSongs}
            recentSongs={recentSongs}
            isLoading={isLoadingHome}
            selectedGenre={selectedGenre}
            onSelectGenre={(genre) => setSelectedGenre(genre)}
            onPlaySong={handlePlaySong}
            onAddToQueue={handleAddToQueue}
            currentSongId={currentSong?.videoId}
            isPlaying={isPlaying}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            onPlaySong={handlePlaySong}
            onSelectGenre={(genre) => {
              setSelectedGenre(genre);
              setActiveTab('play');
            }}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            recentSongs={recentSongs}
            playlists={playlists}
            onPlaySong={handlePlaySong}
            onAddToQueue={handleAddToQueue}
            onClearHistory={handleClearHistory}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onPlayPlaylist={handlePlayPlaylist}
            currentSongId={currentSong?.videoId}
            isPlaying={isPlaying}
          />
        )}

        {activeTab === 'search' && (
          <SearchView
            onPlaySong={handlePlaySong}
            onAddToQueue={handleAddToQueue}
            currentSongId={currentSong?.videoId}
          />
        )}
      </main>

      {/* Mini Player Dock (Image 1 style: floats above the navigation bar) */}
      <MiniPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        isLoadingAudio={isLoadingAudio}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onOpenFullscreen={() => setShowFullscreenPlayer(true)}
      />

      {/* Floating Liquid Glass Navigation Bar (Image 1 style) */}
      <LiquidNavbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        isPlayingSong={isPlaying}
      />

      {/* Fullscreen Now Playing Visualizer Player (Image 2 style) */}
      <FullscreenPlayer
        isOpen={showFullscreenPlayer}
        onClose={() => setShowFullscreenPlayer(false)}
        currentSong={currentSong}
        isPlaying={isPlaying}
        isLoadingAudio={isLoadingAudio}
        currentTime={currentTime}
        duration={duration}
        lyrics={lyrics}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isAutoplay={isAutoplay}
        onPlayPause={handlePlayPause}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleAutoplay={() => setIsAutoplay((prev) => !prev)}
        onToggleQueue={() => setShowQueue(true)}
        onOpenFullLyrics={() => setShowLyrics(true)}
      />

      {/* Full Synced Lyrics Modal */}
      <LyricsModal
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
        song={currentSong}
        lyrics={lyrics}
        isLoading={isLoadingLyrics}
        currentTime={currentTime}
        onSeek={handleSeek}
      />

      {/* Playback Queue Modal */}
      <QueueModal
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        queue={queue}
        currentIndex={currentIndex}
        onSelectTrack={(index) => {
          const track = queue[index];
          if (track) {
            setCurrentIndex(index);
            handlePlaySong(track, queue);
          }
        }}
        onRemoveTrack={(index) => {
          setQueue((prev) => prev.filter((_, i) => i !== index));
          if (index === currentIndex && queue.length > 1) {
            handleNextTrack();
          }
        }}
        onClearQueue={() => {
          setQueue([]);
          setCurrentIndex(-1);
        }}
        onMoveTrack={handleMoveQueueTrack}
        onShuffleQueue={handleShuffleQueue}
        playlists={playlists}
        onCreatePlaylistFromQueue={(name) => handleCreatePlaylist(name, queue)}
        onAddQueueToPlaylist={handleAddQueueToPlaylist}
      />
    </div>
  );
};

export default App;
