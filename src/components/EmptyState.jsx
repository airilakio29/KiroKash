import React from 'react';

/**
 * KampusKash Polished Empty State Component
 * Renders an attractive, encouraging empty state matching
 * the dark purple gemstone theme with icons, descriptions, and action buttons.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`card empty-state-container ${className}`}
      style={{
        padding: '3.25rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, rgba(74, 54, 87, 0.45) 0%, rgba(42, 31, 53, 0.65) 100%)',
        border: '1px dashed var(--border-light, rgba(168, 85, 247, 0.25))',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        ...style
      }}
    >
      {/* Glowing Icon Bubble */}
      {Icon && (
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 24%, transparent) 0%, rgba(139, 92, 246, 0.12) 100%)',
            border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-light, #E8DEF5)',
            marginBottom: '1.25rem',
            boxShadow: '0 0 25px color-mix(in srgb, var(--primary) 25%, transparent)',
            animation: 'emptyPulse 3s ease-in-out infinite'
          }}
        >
          <Icon size={30} />
        </div>
      )}

      {/* Title */}
      <h4
        style={{
          fontFamily: "'Plus Jakarta Sans', var(--font-sans)",
          fontSize: '1.18rem',
          fontWeight: 700,
          color: 'var(--text-main, #FFFFFF)',
          marginBottom: '0.45rem',
          letterSpacing: '-0.01em'
        }}
      >
        {title}
      </h4>

      {/* Description */}
      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-muted, #C4B5D4)',
          maxWidth: '440px',
          lineHeight: 1.55,
          margin: '0 auto 1.5rem'
        }}
      >
        {description}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="btn btn-primary"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: '8px'
            }}
          >
            {actionText}
          </button>
        )}

        {secondaryActionText && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="btn btn-secondary"
            style={{
              padding: '0.6rem 1.15rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: '8px'
            }}
          >
            {secondaryActionText}
          </button>
        )}
      </div>

      <style>{`
        @keyframes emptyPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px color-mix(in srgb, var(--primary) 20%, transparent);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 32px color-mix(in srgb, var(--primary) 35%, transparent);
          }
        }
      `}</style>
    </div>
  );
}
