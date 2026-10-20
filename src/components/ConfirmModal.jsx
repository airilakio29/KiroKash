import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * KampusKash Styled Confirmation Modal
 * Replaces abrupt native browser window.confirm with a smooth,
 * accessible modal matching the dark purple gemstone aesthetic.
 */
export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '90%',
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'var(--bg-card, #2A1F35)',
          border: '1px solid var(--border-light, rgba(255, 255, 255, 0.15))',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              color: isDestructive ? '#EF4444' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isDestructive ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id="confirm-modal-title"
              style={{
                fontFamily: "'Plus Jakarta Sans', var(--font-sans)",
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-main, #FFFFFF)',
                margin: '0 0 0.35rem'
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-muted, #C4B5D4)',
                lineHeight: 1.5,
                margin: 0
              }}
            >
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.86rem',
              fontWeight: 600,
              borderRadius: '8px'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={isDestructive ? 'btn btn-danger' : 'btn btn-primary'}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.86rem',
              fontWeight: 700,
              borderRadius: '8px'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
