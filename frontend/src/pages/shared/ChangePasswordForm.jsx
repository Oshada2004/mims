import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import PasswordInput from '../../components/ui/PasswordInput';
import { changePassword } from '../../api/services/authService';
import { useSubmit } from '../../api/useApi';
import '../Pages.css';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validate({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Enter your current password.';

  if (!newPassword) errors.newPassword = 'Enter a new password.';
  else if (newPassword.length < MIN_LENGTH) errors.newPassword = `Use at least ${MIN_LENGTH} characters.`;
  else if (newPassword.length > MAX_LENGTH) errors.newPassword = `Use at most ${MAX_LENGTH} characters.`;
  else if (newPassword === currentPassword) errors.newPassword = 'Choose a password different from the current one.';

  if (!confirmPassword) errors.confirmPassword = 'Enter the new password again.';
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'The passwords do not match.';
  return errors;
}

function successMessage(endedSessions) {
  if (!endedSessions) return 'Your password has been changed.';
  const devices = endedSessions === 1 ? '1 other device' : `${endedSessions} other devices`;
  return `Your password has been changed. You were signed out on ${devices}.`;
}

export default function ChangePasswordForm() {
  const [values, setValues] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState('');
  const { submit, submitting, error, reset } = useSubmit(changePassword);

  // Field errors appear after the first submit attempt, then update as the user types.
  const errors = submitted ? validate(values) : {};

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setSuccess('');
    if (error) reset();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setSuccess('');
    if (Object.keys(validate(values)).length > 0) return;

    const result = await submit({ currentPassword: values.currentPassword, newPassword: values.newPassword });
    if (result?.success) {
      setValues(EMPTY);
      setSubmitted(false);
      setSuccess(successMessage(result.data?.endedSessions));
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert variant="error" onClose={reset}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <div className="form-grid">
        <FormField label="Current password" required error={errors.currentPassword} className="form-grid__full">
          <PasswordInput
            name="currentPassword"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={update('currentPassword')}
          />
        </FormField>

        <FormField
          label="New password"
          required
          error={errors.newPassword}
          hint={`At least ${MIN_LENGTH} characters, different from your current password.`}
        >
          <PasswordInput
            name="newPassword"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={update('newPassword')}
          />
        </FormField>

        <FormField label="Confirm new password" required error={errors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={update('confirmPassword')}
          />
        </FormField>
      </div>

      <div className="form-actions form-actions--start">
        <Button type="submit" icon={KeyRound} loading={submitting}>
          Change password
        </Button>
      </div>
    </form>
  );
}
