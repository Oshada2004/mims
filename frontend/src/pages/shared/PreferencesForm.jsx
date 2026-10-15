import { useEffect, useRef, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import Switch from '../../components/ui/Switch';
import { getErrorMessage } from '../../api/client';
import { getPreferences, updatePreferences } from '../../api/services/authService';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../context/AuthContext';
import '../Pages.css';

const THEME_OPTIONS = [
  { value: 'LIGHT', title: 'Light', meta: 'Always light' },
  { value: 'DARK', title: 'Dark', meta: 'Always dark' },
  { value: 'SYSTEM', title: 'System', meta: 'Follow this device' },
];

const SAVED_MESSAGE_MS = 2500;

export default function PreferencesForm() {
  const { user, setPreferences } = useAuth();
  // Fresh from the server, in case they were changed in another browser.
  const loaded = useApi((signal) => getPreferences({ signal }), []);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const savedTimer = useRef(null);

  const current = values ?? loaded.data ?? user?.preferences ?? null;

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // Saves on every change. The theme is applied straight away and reverted if saving fails.
  const save = async (changes) => {
    if (!current || saving) return;
    const previous = current;
    const next = { ...current, ...changes };

    setValues(next);
    setPreferences(next);
    setSaving(true);
    setSaved(false);
    setError('');
    clearTimeout(savedTimer.current);

    try {
      const stored = await updatePreferences(next);
      setValues(stored);
      setPreferences(stored);
      setSaved(true);
      savedTimer.current = setTimeout(() => setSaved(false), SAVED_MESSAGE_MS);
    } catch (err) {
      setValues(previous);
      setPreferences(previous);
      setError(getErrorMessage(err, 'Your preferences could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (!current) {
    if (loaded.error) return <Alert variant="error">{loaded.error}</Alert>;
    return <Spinner />;
  }

  return (
    <div className="stack">
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <div className="stack preferences-group">
        <p className="preferences-group__label" id="theme-label">
          Theme
        </p>
        <div className="choice-list" role="radiogroup" aria-labelledby="theme-label">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={option.value === current.theme}
              className={['choice', option.value === current.theme && 'choice--selected'].filter(Boolean).join(' ')}
              disabled={saving}
              onClick={() => option.value !== current.theme && save({ theme: option.value })}
            >
              <span className="choice__title">{option.title}</span>
              <span className="choice__meta">{option.meta}</span>
            </button>
          ))}
        </div>
      </div>

      <Switch
        id="email-txn-alerts"
        label="Email me about transfers"
        description="An email when money is sent from or received into your accounts."
        checked={current.emailTxnAlerts}
        disabled={saving}
        onChange={(checked) => save({ emailTxnAlerts: checked })}
      />

      <p className="preferences-status text-muted" role="status" aria-live="polite">
        {saving ? 'Saving…' : saved ? 'Saved.' : ''}
      </p>
    </div>
  );
}
