import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import { getErrorMessage } from '../../api/client';
import { ROLE_HOME } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';
import { useBank } from '../../context/BankContext';
import './auth.css';

export default function Login() {
  const { login } = useAuth();
  const bank = useBank();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      navigate(ROLE_HOME[user?.role] ?? '/unauthorized', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid credentials. Please check your username and password.'));
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      description={`Use your ${bank?.bank_name ?? 'bank'} credentials to continue.`}
      footer={
        <>
          New customer? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <FormField label="Username" required>
          <Input
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
          />
        </FormField>

        <FormField label="Password" required>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
        </FormField>

        <Button type="submit" size="lg" icon={LogIn} loading={submitting} fullWidth>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

function PasswordInput({ visible, onToggle, ...props }) {
  return (
    <div className="password-input">
      <Input type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={onToggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}