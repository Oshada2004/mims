import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { Eye, EyeOff } from "lucide-react";
import { useBankMetadata } from '../context/BankContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const { metadata, loading: metadataLoading, error: metadataError } = useBankMetadata();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error || 
        'Invalid credentials. Please verify your username and password.'
      );
      setUsername('');
      setPassword('');
      setShowPassword(true);
    }
  };

  return (
    <div className="login-container">
   
      <header className="vishwa-header">
        <div className="brand-section">
          <div className="brand-logo">
            {metadataLoading ? 'Loading...' : metadata?.bank_name || 'Bank'}
          </div>
          <span className="security-badge">SECURE ONLINE BANKING</span>
        </div>
        <div className="hotline-info">
          {metadata?.contact_email || metadataError || 'Contact unavailable'}
        </div>
      </header>

      <main className="login-main">
        
        <div className="login-card">
          <div className="login-card-header">User Login</div>

          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label>Username / User ID</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Username"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "password" : "text"}
                  className="form-input"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn">
              LOG IN
            </button>

            <div className="forgot-link-wrapper">
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password / Reset via OTP?
              </Link>
            </div>
          </form>
        </div>
      </main>

      <footer className="vishwa-footer">
        {metadata?.motto || 'Microbanking & Interest Management System (MIMS)'} &copy; 2026. All Rights Reserved.
      </footer>
    </div>
  );
}