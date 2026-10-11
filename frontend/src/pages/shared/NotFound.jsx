import { Link } from 'react-router-dom';
import '../Pages.css';

export default function NotFound() {
  return (
    <main className="status-page">
      <div className="status-page__card">
        <p className="status-page__code">404</p>
        <h1 className="status-page__title">Page not found</h1>
        <p className="status-page__message">The page you are looking for doesn&apos;t exist or has moved.</p>
        <div className="status-page__actions">
          <Link to="/">Go to home</Link>
        </div>
      </div>
    </main>
  );
}