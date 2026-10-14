import axios from 'axios';
import { endpoints } from './endpoints';

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
    //
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    //
  }
}

const ERROR_CODE_PATTERN = /^[A-Z][A-Za-z]+$/;

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  // If there is no reponse
  if (error?.isAxiosError && !error.response) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  const data = error?.response?.data;
  if (typeof data?.error === 'string' && ERROR_CODE_PATTERN.test(data.error) && data?.message) {
    return data.message;
  }
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