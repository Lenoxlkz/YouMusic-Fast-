/**
 * Client-Side Authentication Manager for YouTube OAuth
 * Handles dual-layer persistence:
 * 1. Secure HTTP-Only cookie with SameSite=None; Secure; Partitioned
 * 2. LocalStorage encrypted/encoded fallback to prevent session loss in iframes (AI Studio & third-party cookie restrictions)
 */

export interface YouTubeCredentials {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
  client?: {
    client_id: string;
    client_secret: string;
  };
}

export interface AccountInfo {
  name: string;
  photo?: string;
}

export interface AuthStatus {
  loggedIn: boolean;
  account?: AccountInfo;
}

const STORAGE_KEY = 'youmusic_yt_auth_creds';
const EVENT_NAME = 'youmusic-auth-change';

/**
 * Retrieve saved credentials from localStorage
 */
export function getYtCredentials(): YouTubeCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const creds = JSON.parse(raw);
    if (creds && creds.access_token) {
      return creds;
    }
  } catch (e) {
    console.warn('Error reading stored YouTube credentials', e);
  }
  return null;
}

/**
 * Save credentials locally and notify the application
 */
export function saveYtCredentials(creds: YouTubeCredentials) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { loggedIn: true, credentials: creds } })
    );
  } catch (e) {
    console.warn('Error saving YouTube credentials', e);
  }
}

/**
 * Wipe credentials from both localStorage and server cookie
 */
export async function clearYtCredentials(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { loggedIn: false } })
    );
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    console.warn('Error logging out', e);
  }
}

/**
 * Specialized fetch wrapper that ensures credentials (cookies and headers) are always sent
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const creds = getYtCredentials();
  const headers = new Headers(options.headers || {});

  if (creds && creds.access_token) {
    headers.set('Authorization', `Bearer ${creds.access_token}`);
    headers.set('x-yt-creds', JSON.stringify(creds));
  }

  const enhancedOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  const response = await fetch(url, enhancedOptions);

  // Check if server refreshed the token in this request
  const refreshedHeader = response.headers.get('x-refreshed-creds');
  if (refreshedHeader) {
    try {
      const newCreds = JSON.parse(refreshedHeader);
      if (newCreds?.access_token) {
        saveYtCredentials(newCreds);
      }
    } catch {}
  }

  return response;
}

/**
 * Check authentication status against backend using both cookie and stored header
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await authFetch('/api/auth/status');
    if (!res.ok) {
      return { loggedIn: false };
    }
    const data = await res.json();
    if (data.loggedIn) {
      if (data.credentials) {
        saveYtCredentials(data.credentials);
      }
      return {
        loggedIn: true,
        account: data.account,
      };
    } else {
      // If server explicitly confirmed not logged in and we had dead credentials, clear them
      if (getYtCredentials()) {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent(EVENT_NAME, { detail: { loggedIn: false } })
        );
      }
      return { loggedIn: false };
    }
  } catch (err) {
    console.warn('Failed to check auth status', err);
    // If offline/error, rely on local presence
    const local = getYtCredentials();
    return { loggedIn: !!local?.access_token };
  }
}

/**
 * Hook or subscription helper for auth changes
 */
export function onAuthChange(callback: (status: { loggedIn: boolean }) => void) {
  const handler = (e: Event) => {
    const custom = e as CustomEvent;
    callback({ loggedIn: custom.detail?.loggedIn ?? false });
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
