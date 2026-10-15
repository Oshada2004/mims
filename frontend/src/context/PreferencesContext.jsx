
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const PreferencesContext = createContext(null);

const DEFAULT_PREFERENCES = {
  theme: 'light',
  density: 'comfortable',
  reduceMotion: false,
  notifications: true,
};

function loadPreferences() {
  try {
    const saved = localStorage.getItem('mims_preferences');

    return saved
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    localStorage.setItem(
      'mims_preferences',
      JSON.stringify(preferences)
    );

    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.density = preferences.density;
    document.documentElement.dataset.reduceMotion =
      String(preferences.reduceMotion);
  }, [preferences]);

  const updatePreference = useCallback((key, value) => {
    setPreferences((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({ ...DEFAULT_PREFERENCES });
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      updatePreference,
      resetPreferences,
    }),
    [preferences, updatePreference, resetPreferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error(
      'usePreferences must be used inside PreferencesProvider'
    );
  }

  return context;
}
