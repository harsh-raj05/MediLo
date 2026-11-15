import { X } from 'lucide-react';
import { useEffect } from 'react';

export const Modal = ({ title, onClose, children, maxWidth = '760px' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal-card" style={{ maxWidth }}>
        <div className="modal-header no-print">
          <h2>{title}</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close modal"
            style={{ width: 32, height: 32, padding: 0, borderRadius: 'var(--radius-sm)' }}
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
