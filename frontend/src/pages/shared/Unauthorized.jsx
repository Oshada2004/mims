import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { ROLE_HOME } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';
import '../Pages.css';

export default function Unauthorized() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const home = user ? ROLE_HOME[user.role] : '/login';

  return (
    <main className="status-page">
      <div className="status-page__card">
        <p className="status-page__code">403</p>
        <h1 className="status-page__title">Access denied</h1>
        <p className="status-page__message">You don&apos;t have permission to view this page.</p>
        <div className="status-page__actions">
          {home ? (
            <Button onClick={() => navigate(home, { replace: true })}>
              {user ? 'Back to my dashboard' : 'Go to sign in'}
            </Button>
          ) : (
            // Signed in with a role this app has no dashboard for.
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}