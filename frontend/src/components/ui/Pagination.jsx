import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import './Pagination.css';

export default function Pagination({ total, limit, offset, onChange, disabled = false }) {
  if (!total) return null;

  const first = offset + 1;
  const last = Math.min(offset + limit, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary">
        Showing {first}–{last} of {total}
      </p>
      <div className="pagination__buttons">
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          disabled={disabled || offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || last >= total}
          onClick={() => onChange(offset + limit)}
        >
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}