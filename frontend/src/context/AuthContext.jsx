import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, setToken } from '../api/client';
import * as authService from '../api/services/authService';

const AuthContext = createContext(null);

/** Normalise the backend user so the app can rely on `user.role`. */
function toAppUser(backendUser) {
  return backendUser ? { ...backendUser, role: backendUser.user_role } : null;
}

/** The backend returns { session_id } today and may return { token } (JWT) later. */
function extractToken(data) {
  return data?.token ?? data?.session_id ?? null;
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  // Only wait for /auth/me when there is a stored token to restore.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const clearSession = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  // Restore the session from a stored token on app start.
  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) return undefined;

    let cancelled = false;
    authService
      .me()
      .then((data) => {
        if (!cancelled) setUser(toAppUser(data.user));
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  /** Store the token, then load the full profile (login only returns ids and roles). */
  const startSession = useCallback(async (newToken, fallbackUser) => {
    setToken(newToken);
    setTokenState(newToken);

    let profile = fallbackUser;
    try {
      const data = await authService.me();
      profile = data.user ?? fallbackUser;
    } catch {
      // Keep the user returned by login/signup if /auth/me is unavailable.
    }

    const appUser = toAppUser(profile);
    setUser(appUser);
    return appUser;
  }, []);

  const login = useCallback(
    async (username, password) => {
      const data = await authService.login(username, password);
      const newToken = extractToken(data);
      if (!newToken) throw new Error('Login response did not include a session token.');
      return startSession(newToken, data.user);
    },
    [startSession],
  );

  const signup = useCallback(
    async (formData) => {
      const data = await authService.signup(formData);
      const newToken = extractToken(data);
      // If signup does not start a session itself, sign in with the new credentials.
      if (newToken) return startSession(newToken, data.user);
      return login(formData.username, formData.password);
    },
    [login, startSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Clear local state even if the server call fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook lives next to its provider by design; fast refresh just does a full reload for this file.
// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
