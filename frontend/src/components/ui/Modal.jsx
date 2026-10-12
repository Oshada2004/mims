import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

/** Dialog rendered in a portal. Closes on Escape, backdrop click and the close button. */
export default function Modal({ open, onClose, title, footer, size = 'md', children }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  // Latest onClose without re-running the open/close effect (callers often pass inline functions,
  // and re-running it would move focus away from the input being typed in).
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return createPortal(
    <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <header className="modal__header">
          {title && (
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
          )}
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
