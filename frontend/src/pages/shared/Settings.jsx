import { useState } from 'react';
import { Bell, Check, KeyRound, Monitor, RotateCcw, ShieldCheck, SunMoon } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import { getErrorMessage } from '../../api/client';
import * as authService from '../../api/services/authService';
import { usePreferences } from '../../context/PreferencesContext';
import '../Pages.css';
import './Settings.css';

export default function Settings() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordError('Your new password must be between 8 and 128 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('Choose a new password that differs from your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(result.message || 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Could not change your password. Please try again.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const updatePreference = (key, value) => {
    updatePreferences({ [key]: value });
    setPreferencesSaved(true);
  };

  return (
    <div className="page settings-page">
      <PageHeader title="Settings" description="Manage your security and personalise the experience across MIMS." />

      <div className="settings-intro">
        <div className="settings-intro__icon"><ShieldCheck size={23} /></div>
        <div>
          <h2>Your account, your preferences</h2>
          <p>Appearance and layout preferences apply across dashboards, reports, tables and forms on this device.</p>
        </div>
      </div>

      <Card title="Change password" description="Use your current password to set a new password for this account.">
        <form className="settings-form" onSubmit={handlePasswordSubmit} noValidate>
          {passwordError && <Alert variant="error" title="Password not changed">{passwordError}</Alert>}
          {passwordSuccess && <Alert variant="success" title="Password updated">{passwordSuccess}</Alert>}
          <div className="settings-password-grid">
            <FormField label="Current password" required>
              <Input type="password" name="currentPassword" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </FormField>
            <div />
            <FormField label="New password" required hint="Use at least 8 characters. Maximum 128 characters.">
              <Input type="password" name="newPassword" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            </FormField>
            <FormField label="Confirm new password" required>
              <Input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </FormField>
          </div>
          <div className="settings-security-note"><KeyRound size={16} /><span>For your security, other active sessions will be signed out after the password changes.</span></div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setPasswordSuccess(''); }}>Clear</Button>
            <Button type="submit" icon={KeyRound} loading={savingPassword}>Update password</Button>
          </div>
        </form>
      </Card>

      <Card title="Appearance" description="Choose how MIMS looks throughout the application.">
        <div className="settings-option-row">
          <div className="settings-option-row__icon"><SunMoon size={19} /></div>
          <div className="settings-option-row__copy"><h3>Theme</h3><p>Switch between light and dark appearance on every page.</p></div>
          <div className="settings-option-row__control">
            <Select aria-label="Theme" value={preferences.theme} onChange={(event) => updatePreference('theme', event.target.value)} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </div>
        </div>
        <div className="settings-option-row">
          <div className="settings-option-row__icon"><Monitor size={19} /></div>
          <div className="settings-option-row__copy"><h3>Interface density</h3><p>Compact mode reduces spacing in tables, cards and forms across the app.</p></div>
          <div className="settings-option-row__control">
            <Select aria-label="Interface density" value={preferences.density} onChange={(event) => updatePreference('density', event.target.value)} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
          </div>
        </div>
        <label className="settings-toggle-row">
          <span className="settings-toggle-row__icon"><Monitor size={19} /></span>
          <span className="settings-option-row__copy"><strong>Reduce motion</strong><small>Reduce non-essential animations and transitions.</small></span>
          <input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreference('reducedMotion', event.target.checked)} />
        </label>
      </Card>

      <Card title="Notifications" description="Choose whether MIMS should show in-app notification prompts when notification features are available.">
        <label className="settings-toggle-row">
          <span className="settings-toggle-row__icon"><Bell size={19} /></span>
          <span className="settings-option-row__copy"><strong>In-app notifications</strong><small>This preference is saved for this account on this device. It does not enable email or SMS delivery.</small></span>
          <input type="checkbox" checked={preferences.notifications} onChange={(event) => updatePreference('notifications', event.target.checked)} />
        </label>
      </Card>

      <div className="settings-footer">
        <p>{preferencesSaved ? <><Check size={15} /> Preferences saved automatically on this device.</> : 'Preferences are saved automatically on this device.'}</p>
        <Button variant="secondary" icon={RotateCcw} onClick={() => { resetPreferences(); setPreferencesSaved(false); }}>Reset preferences</Button>
      </div>
    </div>
  );
}
