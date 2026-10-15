// Applies the user's theme preference ('LIGHT' | 'DARK' | 'SYSTEM') by setting data-theme on <html>;
// the colours live in index.css. The server's preference is the source of truth. The last applied
// theme is also kept in this browser only so a reload does not flash the wrong theme before /auth/me.

export const THEMES = ['LIGHT', 'DARK', 'SYSTEM'];
const STORAGE_KEY = 'mims_theme';

function normalise(theme) {
  const value = String(theme ?? '').toUpperCase();
  return THEMES.includes(value) ? value : 'SYSTEM';
}

export function applyTheme(theme) {
  const value = normalise(theme);
  document.documentElement.dataset.theme = value.toLowerCase();
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page.
  }
  return value;
}

// Before the first render: the theme used last time in this browser (SYSTEM if none).
export function applyStoredTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    //
  }
  return applyTheme(stored);
}
