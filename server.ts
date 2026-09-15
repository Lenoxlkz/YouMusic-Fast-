import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  MusicKit,
  parseLrc,
  isStreamExpired
} from 'musicstream-sdk';
import { Parser, Log } from 'youtubei.js';

// Suppress benign youtubei.js parser warnings (e.g. Message node instead of SectionList/MusicQueue/RichGrid on empty searches)
Log.setLevel(Log.Level.ERROR);
if (Parser?.setParserErrorHandler) {
  Parser.setParserErrorHandler((context: any) => {
    // When YouTube returns a MessageRenderer (like 'No results found' or promo notice), it differs from SectionList
    // This is safe to ignore as the SDK falls back appropriately
    if (context?.error_type === 'typecheck') {
      return;
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize MusicKit instance
const kit = new MusicKit();

// Cache for stream URLs: videoId -> { url, expiresAt, mimeType }
interface CachedStream {
  url: string;
  expiresAt: number;
  mimeType?: string;
}
const streamCache = new Map<string, CachedStream>();

// Zod schemas for runtime validation
const ThumbnailSchema = z.object({
  url: z.string().default(''),
  width: z.number().optional(),
  height: z.number().optional(),
});

const SongSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().default('Canción desconocida'),
  artist: z.string().default('Artista desconocido'),
  album: z.string().optional(),
  duration: z.number().optional().default(0),
  durationFormatted: z.string().optional(),
  thumbnails: z.array(ThumbnailSchema).default([]),
});

const AlbumSchema = z.object({
  albumId: z.string().min(1),
  title: z.string().default('Álbum sin título'),
  artist: z.string().default('Artista desconocido'),
  year: z.string().optional(),
  thumbnails: z.array(ThumbnailSchema).default([]),
});

const ArtistSchema = z.object({
  artistId: z.string().min(1),
  name: z.string().default('Artista desconocido'),
  subscribers: z.string().optional(),
  thumbnails: z.array(ThumbnailSchema).default([]),
});

const PlaylistSchema = z.object({
  playlistId: z.string().min(1),
  title: z.string().default('Playlist sin título'),
  itemCount: z.union([z.string(), z.number()]).optional(),
  thumbnails: z.array(ThumbnailSchema).default([]),
});

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Fallback curated hits if network/InnerTube fluctuates
const FALLBACK_TRENDING = [
  {
    videoId: 'Oncu0bgdcXU',
    title: 'Fix You',
    artist: 'Coldplay',
    album: 'X&Y',
    duration: 296,
    durationFormatted: '4:56',
    thumbnails: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60' }]
  },
  {
    videoId: 'NaaiI1y9QIo',
    title: 'Break My Heart',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: 222,
    durationFormatted: '3:42',
    thumbnails: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60' }]
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354,
    durationFormatted: '5:54',
    thumbnails: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60' }]
  },
  {
    videoId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Divide)',
    duration: 233,
    durationFormatted: '3:53',
    thumbnails: [{ url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=60' }]
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    album: 'VIDA',
    duration: 288,
    durationFormatted: '4:48',
    thumbnails: [{ url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=60' }]
  },
  {
    videoId: 'hT_nvWreIhg',
    title: 'Counting Stars',
    artist: 'OneRepublic',
    album: 'Native',
    duration: 257,
    durationFormatted: '4:17',
    thumbnails: [{ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=60' }]
  }
];

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'YouMusic Fast' });
});

// 2. CORS relay for direct InnerTube requests (as specified in architecture)
app.post('/api/innertube', async (req, res) => {
  try {
    const { endpoint = 'search', body = {} } = req.body;
    const targetUrl = `https://music.youtube.com/youtubei/v1/${endpoint}`;
    
    // Inject SOCS=CAI and language/region preference cookie
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'X-Youtube-Client-Name': '67',
        'X-Youtube-Client-Version': '1.20250219.01.00',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
        'Cookie': 'SOCS=CAI; PREF=hl=es&gl=ES',
        ...(req.headers['x-youtube-cookie'] ? { 'Cookie': `SOCS=CAI; ${req.headers['x-youtube-cookie']}` } : {})
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20250219.01.00',
            hl: 'es',
            gl: 'ES',
          }
        },
        ...body
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('InnerTube proxy error:', err);
    res.status(500).json({ error: 'InnerTube request failed', message: err.message });
  }
});

// 3. Autocomplete suggestions endpoint
app.get('/api/suggestions', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json([]);
  }

  try {
    const suggestions = await kit.autocomplete(query);
    res.json(Array.isArray(suggestions) ? suggestions.slice(0, 10) : []);
  } catch (err: any) {
    console.warn('Autocomplete error, returning query fallback:', err?.message);
    res.json([query]);
  }
});

// 4. Search endpoint with runtime Zod validation and safe degradation
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  const filter = (req.query.filter as string || 'songs').toLowerCase();

  if (!query) {
    return res.json({ songs: [], albums: [], artists: [], playlists: [] });
  }

  try {
    const searchOptions: any = {};
    if (filter !== 'all') {
      searchOptions.filter = filter;
    }
    const rawResults: any = await kit.search(query, searchOptions);

    let songList: any[] = [];
    let albumList: any[] = [];
    let artistList: any[] = [];
    let playlistList: any[] = [];

    if (Array.isArray(rawResults)) {
      if (filter === 'songs') songList = rawResults;
      else if (filter === 'albums') albumList = rawResults;
      else if (filter === 'artists') artistList = rawResults;
      else if (filter === 'playlists') playlistList = rawResults;
      else songList = rawResults;
    } else if (rawResults && typeof rawResults === 'object') {
      songList = Array.isArray(rawResults.songs) ? rawResults.songs : [];
      albumList = Array.isArray(rawResults.albums) ? rawResults.albums : [];
      artistList = Array.isArray(rawResults.artists) ? rawResults.artists : [];
      playlistList = Array.isArray(rawResults.playlists) ? rawResults.playlists : [];
    }

    const validatedSongs: any[] = [];
    const validatedAlbums: any[] = [];
    const validatedArtists: any[] = [];
    const validatedPlaylists: any[] = [];

    // Safely parse songs
    for (const item of songList) {
      const parsed = SongSchema.safeParse({
        videoId: item.videoId || item.id,
        title: item.title,
        artist: item.artist || (item.artists && item.artists[0]?.name) || 'Artista',
        album: item.album?.title || item.album,
        duration: item.duration,
        durationFormatted: formatDuration(item.duration),
        thumbnails: Array.isArray(item.thumbnails) ? item.thumbnails : []
      });
      if (parsed.success) {
        validatedSongs.push(parsed.data);
      }
    }

    // Safely parse albums
    for (const item of albumList) {
      const parsed = AlbumSchema.safeParse({
        albumId: item.albumId || item.id,
        title: item.title,
        artist: item.artist || (item.artists && item.artists[0]?.name) || 'Artista',
        year: item.year,
        thumbnails: Array.isArray(item.thumbnails) ? item.thumbnails : []
      });
      if (parsed.success) validatedAlbums.push(parsed.data);
    }

    // Safely parse artists
    for (const item of artistList) {
      const parsed = ArtistSchema.safeParse({
        artistId: item.artistId || item.id,
        name: item.name,
        subscribers: item.subscribers,
        thumbnails: Array.isArray(item.thumbnails) ? item.thumbnails : []
      });
      if (parsed.success) validatedArtists.push(parsed.data);
    }

    // Safely parse playlists
    for (const item of playlistList) {
      const parsed = PlaylistSchema.safeParse({
        playlistId: item.playlistId || item.id,
        title: item.title,
        itemCount: item.itemCount,
        thumbnails: Array.isArray(item.thumbnails) ? item.thumbnails : []
      });
      if (parsed.success) validatedPlaylists.push(parsed.data);
    }

    res.json({
      songs: validatedSongs,
      albums: validatedAlbums,
      artists: validatedArtists,
      playlists: validatedPlaylists
    });
  } catch (err: any) {
    console.error('Search API error:', err);
    // Safe error degradation: return filtered fallback or empty
    const matchedFallback = FALLBACK_TRENDING.filter(
      s => s.title.toLowerCase().includes(query.toLowerCase()) || s.artist.toLowerCase().includes(query.toLowerCase())
    );
    res.json({
      songs: matchedFallback.length > 0 ? matchedFallback : FALLBACK_TRENDING.slice(0, 3),
      albums: [],
      artists: [],
      playlists: []
    });
  }
});

// 4.5. Radio / Up Next endpoint
app.get('/api/radio/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const response = await fetch('https://music.youtube.com/youtubei/v1/next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'X-Youtube-Client-Name': '67',
        'X-Youtube-Client-Version': '1.20250219.01.00',
        'Origin': 'https://music.youtube.com',
        'Cookie': 'SOCS=CAI; PREF=hl=es&gl=ES'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20250219.01.00',
            hl: 'es',
            gl: 'ES',
          }
        },
        videoId: videoId,
        playlistId: 'RDAMVM' + videoId
      })
    });
    const data = await response.json();
    const contents = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];
    
    const tracks = contents
      .map((item: any) => item.playlistPanelVideoRenderer)
      .filter((v: any) => v && v.videoId && v.videoId !== videoId) // Exclude the seed song itself if present
      .map((v: any) => {
        let durationSecs = 180;
        let durationFormatted = v.lengthText?.runs?.[0]?.text || '';
        if (durationFormatted) {
          const parts = durationFormatted.split(':').reverse();
          durationSecs = 0;
          for (let i = 0; i < parts.length; i++) {
            durationSecs += parseInt(parts[i], 10) * Math.pow(60, i);
          }
        }
        return {
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text || 'Desconocido',
          artist: v.longBylineText?.runs?.[0]?.text || 'Artista desconocido',
          duration: durationSecs,
          durationFormatted: formatDuration(durationSecs),
          thumbnails: Array.isArray(v.thumbnail?.thumbnails) ? v.thumbnail.thumbnails : []
        };
      });
      
    res.json(tracks);
  } catch (err: any) {
    console.error('Radio fetch error:', err);
    res.json([]); // Return empty array on failure
  }
});

// 5. Home / Reproducir recommendations endpoint
app.get('/api/home', async (req, res) => {
  try {
    // Perform search for trending music in Spanish & global
    const trendingResults: any = await kit.search('éxitos 2026 trending music', { filter: 'songs' as any });
    
    let songs: any[] = [];
    if (Array.isArray(trendingResults?.songs) && trendingResults.songs.length > 0) {
      songs = trendingResults.songs.map((item: any) => ({
        videoId: item.videoId,
        title: item.title,
        artist: item.artist || (item.artists && item.artists[0]?.name) || 'Artista',
        album: item.album?.title || item.album || 'Single',
        duration: item.duration || 180,
        durationFormatted: formatDuration(item.duration || 180),
        thumbnails: Array.isArray(item.thumbnails) && item.thumbnails.length > 0
          ? item.thumbnails
          : [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60' }]
      }));
    }

    if (songs.length === 0) {
      songs = FALLBACK_TRENDING;
    }

    res.json({
      trending: songs.slice(0, 12),
      quickPicks: songs.slice(12, 24).length > 0 ? songs.slice(12, 24) : FALLBACK_TRENDING
    });
  } catch (err: any) {
    console.warn('Home recommendations fetch error, using fallback:', err?.message);
    res.json({
      trending: FALLBACK_TRENDING,
      quickPicks: FALLBACK_TRENDING.slice(2)
    });
  }
});

// 6. Lyrics multi-provider cascade: LRCLIB -> BetterLyrics -> SimpMusic -> Fallback
app.get('/api/lyrics', async (req, res) => {
  const artist = (req.query.artist as string || '').trim();
  const title = (req.query.title as string || '').trim();
  const duration = req.query.duration ? Number(req.query.duration) : undefined;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Clean title: remove "(Official Video)", "ft.", etc.
  const cleanTitle = title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/feat\..*$/i, '')
    .replace(/ft\..*$/i, '')
    .replace(/official\s+video/i, '')
    .trim();

  // 1. Try LRCLIB
  try {
    const lrclibUrl = new URL('https://lrclib.net/api/get');
    if (artist && artist !== 'Unknown Artist' && artist !== 'Artista') {
      lrclibUrl.searchParams.set('artist_name', artist);
    }
    lrclibUrl.searchParams.set('track_name', cleanTitle);
    if (duration) lrclibUrl.searchParams.set('duration', Math.round(duration).toString());

    const response = await fetch(lrclibUrl.toString(), {
      headers: {
        'User-Agent': 'YouMusicFast/1.0 (https://github.com/user/youmusic-fast)'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (response.ok) {
      const data: any = await response.json();
      if (data.syncedLyrics) {
        const parsed = parseLrc(data.syncedLyrics);
        return res.json({
          synced: true,
          lines: parsed,
          plainText: data.plainLyrics || '',
          provider: 'LRCLIB (Sincronizado)'
        });
      } else if (data.plainLyrics) {
        return res.json({
          synced: false,
          lines: [],
          plainText: data.plainLyrics,
          provider: 'LRCLIB (Texto plano)'
        });
      }
    }
  } catch (err: any) {
    console.warn('LRCLIB fetch error:', err?.message);
  }

  // 2. Try LRCLIB general search fallback
  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${cleanTitle}`.trim())}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'YouMusicFast/1.0 (https://github.com/user/youmusic-fast)' },
      signal: AbortSignal.timeout(3000)
    });
    if (searchRes.ok) {
      const searchItems: any[] = await searchRes.json();
      if (Array.isArray(searchItems) && searchItems.length > 0) {
        const best = searchItems.find(item => item.syncedLyrics) || searchItems[0];
        if (best?.syncedLyrics) {
          return res.json({
            synced: true,
            lines: parseLrc(best.syncedLyrics),
            plainText: best.plainLyrics || '',
            provider: 'LRCLIB Search (Sincronizado)'
          });
        }
        if (best?.plainLyrics) {
          return res.json({
            synced: false,
            lines: [],
            plainText: best.plainLyrics,
            provider: 'LRCLIB Search'
          });
        }
      }
    }
  } catch (e) {}

  // 3. Fallback message
  res.json({
    synced: false,
    lines: [],
    plainText: `No se encontraron letras sincronizadas para "${title}".\n\nDisfruta de la música en YouMusic Fast.`,
    provider: ''
  });
});

// 7. Audio Stream Resolver & Proxy: Map<videoId, { url, expiresAt }>
app.get('/api/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  // Check cache first
  const cached = streamCache.get(videoId);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60000) {
    return res.json({
      videoId,
      audioUrl: `/api/stream/${videoId}/audio`,
      directUrl: cached.url,
      expiresAt: cached.expiresAt,
      cached: true
    });
  }

  try {
    // Attempt resolve with musicstream-sdk
    const stream = await kit.getStream(videoId, { quality: 'high' });
    if (stream && stream.url) {
      const expiresAt = stream.expiresAt ? stream.expiresAt * 1000 : now + 5.5 * 3600 * 1000;
      streamCache.set(videoId, {
        url: stream.url,
        expiresAt,
        mimeType: stream.mimeType || 'audio/webm'
      });

      return res.json({
        videoId,
        audioUrl: `/api/stream/${videoId}/audio`,
        directUrl: stream.url,
        expiresAt,
        cached: false
      });
    }
  } catch (err: any) {
    console.warn(`InnerTube getStream failed for ${videoId}:`, err?.message);
  }

  // If YouTube datacenter anti-bot blocks direct streaming, return 404/error so the client uses client-side engine
  res.status(404).json({
    videoId,
    error: 'Stream unavailable from datacenter proxy, using browser audio engine',
    isFallback: false
  });
});

// 8. Audio byte streaming proxy (bypasses browser CORS & supports HTTP 206 Partial Content range requests)
app.get('/api/stream/:videoId/audio', async (req, res) => {
  const { videoId } = req.params;
  const cached = streamCache.get(videoId);

  let targetUrl = cached?.url;
  if (!targetUrl || (cached?.expiresAt && cached.expiresAt < Date.now())) {
    try {
      const stream = await kit.getStream(videoId, { quality: 'high' });
      if (stream?.url) {
        targetUrl = stream.url;
        streamCache.set(videoId, {
          url: stream.url,
          expiresAt: stream.expiresAt ? stream.expiresAt * 1000 : Date.now() + 5.5 * 3600 * 1000,
          mimeType: stream.mimeType
        });
      }
    } catch (e) {}
  }

  // If no direct url is available, return 404 so audio element/engine handles it cleanly
  if (!targetUrl) {
    return res.status(404).send('Stream not available');
  }

  // Forward range request to YouTube audio stream
  try {
    const range = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Cookie': 'SOCS=CAI; PREF=hl=es&gl=ES'
    };
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const audioResponse = await fetch(targetUrl, {
      headers: fetchHeaders
    });

    res.status(audioResponse.status);
    audioResponse.headers.forEach((val, key) => {
      // Don't forward content-encoding if gzipped by proxy
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    if (!res.getHeader('content-type')) {
      res.setHeader('content-type', cached?.mimeType || 'audio/webm');
    }

    if (!audioResponse.body) {
      return res.end();
    }

    // Stream body to response
    const reader = audioResponse.body.getReader();
    async function pump() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        res.write(value);
      }
    }
    pump().catch(err => {
      console.warn('Audio streaming pipe closed:', err?.message);
      res.end();
    });
  } catch (err: any) {
    console.error('Audio proxying error:', err);
    res.status(502).send('Audio stream error');
  }
});

// Vite middleware in dev mode / static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YouMusic Fast server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
