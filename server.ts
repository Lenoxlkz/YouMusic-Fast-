import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  MusicKit,
  parseLrc,
  isStreamExpired
} from 'musicstream-sdk';
import { Innertube, UniversalCache, Parser, Log } from 'youtubei.js';
import cookieParser from 'cookie-parser';

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
app.use(cookieParser());

const CLIENT_ID = '861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com';
const CLIENT_SECRET = 'SboVhoG9s0rNafixCSGGKXAT';

/**
 * Helper to set a secure cross-site, partitioned HTTP-only cookie
 */
function setAuthCookie(res: express.Response, creds: any) {
  res.cookie('yt_creds', JSON.stringify(creds), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

/**
 * Extract OAuth credentials from request supporting:
 * 1. Custom 'x-yt-creds' header (localStorage fallback in iframes)
 * 2. 'yt_creds' HTTP-only cookie
 * 3. 'Authorization: Bearer <token>' header
 */
async function getCredentialsFromReq(req: express.Request): Promise<any | null> {
  // 1. Check custom header (from client localStorage)
  if (req.headers['x-yt-creds']) {
    try {
      const raw = req.headers['x-yt-creds'] as string;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.access_token) {
        return parsed;
      }
    } catch {}
  }

  // 2. Check cookies
  if (req.cookies?.yt_creds) {
    try {
      const raw = typeof req.cookies.yt_creds === 'string'
        ? JSON.parse(req.cookies.yt_creds)
        : req.cookies.yt_creds;
      if (raw && raw.access_token) {
        return raw;
      }
    } catch {}
  }

  // 3. Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return { access_token: token };
    }
  }

  return null;
}

/**
 * Refresh Google OAuth access token if expired
 */
async function refreshCredentials(creds: any): Promise<any> {
  if (!creds || !creds.refresh_token) return creds;
  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token'
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await response.json();
    if (data.access_token) {
      creds.access_token = data.access_token;
      creds.expires_in = data.expires_in || 3600;
      creds.expiry_date = Date.now() + (creds.expires_in * 1000);
      return creds;
    }
  } catch (err) {
    console.warn('Failed to refresh Google OAuth token', err);
  }
  return creds;
}

async function getInnertube(req: express.Request, res?: express.Response) {
  const yt = await Innertube.create({ client_type: 'WEB_REMIX' as any });
  let creds = await getCredentialsFromReq(req);
  if (creds && creds.access_token) {
    // If token has expired or will expire in the next 60s, refresh it
    if (creds.expiry_date && Date.now() > creds.expiry_date - 60000 && creds.refresh_token) {
      creds = await refreshCredentials(creds);
      if (res && creds) {
        setAuthCookie(res, creds);
        res.setHeader('x-refreshed-creds', JSON.stringify(creds));
      }
    }

    try {
      await yt.session.signIn({
        access_token: creds.access_token,
        refresh_token: creds.refresh_token,
        expiry_date: new Date(creds.expiry_date || Date.now() + 3600000).toISOString(),
        client: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET }
      });
    } catch (e) {
      console.warn('Failed to sign in with credentials in getInnertube', e);
    }
  }
  return yt;
}

// Global anonymous kit fallback for non-auth requests
const globalKit = new MusicKit();

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

// Authentication endpoints
app.get('/api/auth/status', async (req, res) => {
  try {
    let creds = await getCredentialsFromReq(req);
    if (!creds || !creds.access_token) {
      return res.json({ loggedIn: false });
    }

    if (creds.expiry_date && Date.now() > creds.expiry_date - 60000 && creds.refresh_token) {
      creds = await refreshCredentials(creds);
      setAuthCookie(res, creds);
    }

    const yt = await Innertube.create({ client_type: 'WEB_REMIX' as any });
    try {
      await yt.session.signIn({
        access_token: creds.access_token,
        refresh_token: creds.refresh_token,
        expiry_date: new Date(creds.expiry_date || Date.now() + 3600000).toISOString(),
        client: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET }
      });
    } catch (e) {
      console.warn('Innertube sign-in check failed during status', e);
    }

    let accountName = 'Usuario de YouTube';
    let accountPhoto = '';
    try {
      const accountInfo = await yt.account.getInfo();
      if (accountInfo) {
        accountName = (accountInfo as any).name?.text || (accountInfo as any).name || accountName;
        accountPhoto = (accountInfo as any).photo?.[0]?.url || '';
      }
    } catch {}

    res.json({
      loggedIn: true,
      account: {
        name: accountName,
        photo: accountPhoto
      },
      credentials: creds
    });
  } catch (err: any) {
    res.json({ loggedIn: false, error: err.message });
  }
});

app.post('/api/auth/device-code', async (req, res) => {
  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/youtube'
    });
    const response = await fetch('https://oauth2.googleapis.com/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    res.json(await response.json());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/poll', async (req, res) => {
  try {
    const { device_code } = req.body;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    });
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    const data = await response.json();
    if (data.error) {
      return res.status(400).json(data);
    }
    
    // Calculate expiry timestamp
    data.expiry_date = Date.now() + ((data.expires_in || 3600) * 1000);
    const creds = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
      expiry_date: data.expiry_date,
      client: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET }
    };
    
    // 1. Set HTTP-Only partitioned cookie
    setAuthCookie(res, creds);

    // 2. Return credentials in response body for client-side localStorage fallback
    res.json({
      success: true,
      credentials: creds,
      message: 'Autenticación exitosa'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('yt_creds', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true
  });
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
});

// 2. CORS relay for direct InnerTube requests (as specified in architecture)
app.post('/api/innertube', async (req, res) => {
  try {
    const { endpoint = 'search', body = {} } = req.body;
    const targetUrl = `https://music.youtube.com/youtubei/v1/${endpoint}`;
    
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'X-Youtube-Client-Name': '67',
      'X-Youtube-Client-Version': '1.20250219.01.00',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
      'Cookie': 'SOCS=CAI; PREF=hl=es&gl=ES',
      ...(req.headers['x-youtube-cookie'] ? { 'Cookie': `SOCS=CAI; ${req.headers['x-youtube-cookie']}` } : {})
    };

    const creds = await getCredentialsFromReq(req);
    if (creds && creds.access_token) {
      headers['Authorization'] = `Bearer ${creds.access_token}`;
    }

    // Inject SOCS=CAI and language/region preference cookie
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
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
    const yt = await getInnertube(req);
    const kit = new MusicKit({}, yt);
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
    const yt = await getInnertube(req);
    const kit = new MusicKit({}, yt);
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
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'X-Youtube-Client-Name': '67',
      'X-Youtube-Client-Version': '1.20250219.01.00',
      'Origin': 'https://music.youtube.com',
      'Cookie': 'SOCS=CAI; PREF=hl=es&gl=ES'
    };

    const creds = await getCredentialsFromReq(req);
    if (creds && creds.access_token) {
      headers['Authorization'] = `Bearer ${creds.access_token}`;
    }

    const response = await fetch('https://music.youtube.com/youtubei/v1/next', {
      method: 'POST',
      headers,
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

// 5.5 Library & User Actions
app.post('/api/library/like', async (req, res) => {
  try {
    const { videoId } = req.body;
    const yt = await getInnertube(req);
    if (!yt.session.logged_in) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    // Toggle like (we'll just use like for now, ideally toggle based on current status)
    await yt.interact.like(videoId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/library/dislike', async (req, res) => {
  try {
    const { videoId } = req.body;
    const yt = await getInnertube(req);
    if (!yt.session.logged_in) return res.status(401).json({ error: 'Not logged in' });
    await yt.interact.removeRating(videoId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/library', async (req, res) => {
  try {
    const yt = await getInnertube(req, res);
    
    let likedMusic: any[] = [];
    let playlists: any[] = [];
    
    if (yt.session.logged_in) {
      // 1. Fetch Liked Music playlist (ID: 'LM')
      try {
        const lmPlaylist = await yt.music.getPlaylist('LM');
        if (lmPlaylist && (lmPlaylist.items || (lmPlaylist as any).videos)) {
          const items = lmPlaylist.items || (lmPlaylist as any).videos || [];
          likedMusic = items.map((item: any) => ({
            videoId: item.id || item.videoId,
            title: item.title?.text || item.title || 'Canción',
            artist: item.authors?.[0]?.name || item.author?.name || 'Artista',
            album: item.album?.name || 'Me gusta',
            durationFormatted: item.duration?.text || '0:00',
            thumbnails: item.thumbnails || (item.thumbnail ? [item.thumbnail] : [])
          })).filter((s: any) => s.videoId);
        }
      } catch (e) {
        console.warn("Could not fetch LM playlist", e);
      }
      
      // 2. Fetch User's Private & Created Playlists using YouTube Innertube getPlaylists()
      try {
        const feed = await yt.getPlaylists();
        if (feed && feed.playlists) {
          for (const pl of feed.playlists) {
            const pid = (pl as any).id || (pl as any).playlist_id;
            if (pid) {
              playlists.push({
                id: pid,
                playlistId: pid,
                title: (pl as any).title?.text || (pl as any).title?.toString() || (pl as any).title || 'Playlist de YouTube',
                itemCount: (pl as any).video_count?.text || (pl as any).video_count || (pl as any).item_count || 0,
                coverUrl: (pl as any).thumbnails?.[0]?.url || (pl as any).thumbnail?.url || '',
                thumbnails: (pl as any).thumbnails || ((pl as any).thumbnail ? [(pl as any).thumbnail] : []),
                isRemote: true
              });
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch via yt.getPlaylists()", e);
      }

      // 3. Fallback or supplementary: check yt.music.getLibrary() if getPlaylists() returned none
      if (playlists.length === 0) {
        try {
          const lib = await yt.music.getLibrary();
          if (lib && (lib as any).contents) {
            for (const section of (lib as any).contents) {
              const items = (section as any).items || (section as any).contents || [];
              for (const item of items) {
                const pid = item.id || item.playlist_id || item.browse_id;
                if (pid && !playlists.some(p => p.id === pid)) {
                  playlists.push({
                    id: pid,
                    playlistId: pid,
                    title: item.title?.text || item.title || 'Playlist',
                    itemCount: item.item_count?.text || item.item_count || item.video_count || 0,
                    coverUrl: item.thumbnails?.[0]?.url || '',
                    thumbnails: item.thumbnails || [],
                    isRemote: true
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn("Could not fetch via yt.music.getLibrary()", e);
        }
      }
    }
    
    res.json({
      loggedIn: yt.session.logged_in,
      likedMusic,
      playlists
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5.6 Get Playlist Items (for playing remote or saved playlists)
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const yt = await getInnertube(req, res);
    
    let playlist: any;
    const cleanId = id.startsWith('VL') ? id : `VL${id}`;
    try {
      playlist = await yt.music.getPlaylist(cleanId);
    } catch {
      try {
        playlist = await yt.music.getPlaylist(id);
      } catch {
        playlist = await yt.getPlaylist(id);
      }
    }
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist no encontrada' });
    }

    const rawItems = playlist.items || (playlist as any).videos || [];
    const songs = rawItems.map((item: any) => ({
      videoId: item.id || item.videoId || item.video_id,
      title: item.title?.text || item.title || 'Canción',
      artist: item.authors?.[0]?.name || item.author?.name || 'Artista',
      album: item.album?.name || playlist.title || 'Playlist',
      durationFormatted: item.duration?.text || '0:00',
      thumbnails: item.thumbnails || (item.thumbnail ? [item.thumbnail] : [])
    })).filter((s: any) => s.videoId);

    res.json({
      id,
      title: playlist.header?.title?.text || playlist.title || 'Playlist',
      songs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/home', async (req, res) => {
  try {
    // We can also fetch the actual home feed if logged in, but let's stick to trending search for now for consistency,
    // or use getHome() if kit supports it. Let's stick to the current search to avoid frontend breakage.
    const yt = await getInnertube(req);
    const kit = new MusicKit({}, yt);
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
    const stream = await globalKit.getStream(videoId, { quality: 'high' });
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
      const stream = await globalKit.getStream(videoId, { quality: 'high' });
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
