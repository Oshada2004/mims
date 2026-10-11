import axios from 'axios';
import { endpoints } from './endpoints';

/** localStorage key for the auth token (opaque: session id today, JWT later). */
export const TOKEN_STORAGE_KEY = 'mims_auth_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage unavailable (private mode etc.) — the session simply won't persist.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore — nothing to clear.
  }
}

/** Extract a user-facing message from an axios error, preferring the backend's own message. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  return data?.error ?? data?.message ?? fallback;
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Requests whose 401 means "wrong credentials", not "session expired" — never redirect for these.
const AUTH_ENTRY_PATHS = [endpoints.auth.login, endpoints.auth.signup];
const PUBLIC_PAGES = ['/login', '/signup'];

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url ?? '';
    const isAuthEntry = AUTH_ENTRY_PATHS.some((path) => requestUrl.endsWith(path));

    if (status === 401 && !isAuthEntry) {
      clearToken();
      if (!PUBLIC_PAGES.includes(window.location.pathname)) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default client;
