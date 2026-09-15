export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface Song {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number; // duration in seconds
  durationFormatted?: string;
  thumbnails: Thumbnail[];
}

export interface Album {
  albumId: string;
  title: string;
  artist: string;
  year?: string;
  thumbnails: Thumbnail[];
}

export interface Artist {
  artistId: string;
  name: string;
  subscribers?: string;
  thumbnails: Thumbnail[];
}

export interface Playlist {
  playlistId: string;
  title: string;
  itemCount?: string | number;
  thumbnails: Thumbnail[];
}

export interface SearchResults {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  plainText?: string;
  provider?: string;
}

export interface StreamData {
  videoId: string;
  audioUrl: string;
  expiresAt?: number;
  isFallback?: boolean;
}

export interface UserPlaylist {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  songs: Song[];
  coverUrl?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type SearchFilter = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

export type NavigationTab = 'play' | 'explore' | 'library' | 'search';
