import React from 'react';
import logoImg from '../assets/kiro-logo.png';

/**
 * KampusKash Official Brand Logo Component
 * Preserves the official ghost mascot + KASH identity.
 */
export default function KampusKashLogo({
  size = 36,
  height,
  width,
  className = '',
  style = {},
  alt = 'KampusKash'
}) {
  const resolvedHeight = height || size;
  const publicLogo = `${import.meta.env.BASE_URL || '/'}kiro-logo.png`.replace(/\/{2,}/g, '/');

  return (
    <div
      className={`official-brand-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        lineHeight: 0,
        ...style
      }}
    >
      <img
        src={logoImg || publicLogo}
        alt={alt}
        onError={(e) => {
          if (e.target.src !== publicLogo) {
            e.target.src = publicLogo;
          }
        }}
        style={{
          height: width ? 'auto' : `${resolvedHeight}px`,
          width: width ? `${width}px` : 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
        className="official-logo-img"
      />

      <style>{`
        /* When rendered on light surfaces, add a crisp dark drop shadow so the white ghost is clearly visible */
        [data-theme="light"] .landing-nav .official-logo-img,
        [data-theme="light"] .auth-card .official-logo-img,
        [data-theme="light"] .landing-footer .official-logo-img {
          filter: drop-shadow(0 1px 2px rgba(var(--shadow-rgb), 0.45)) drop-shadow(0 0 1px rgba(var(--shadow-rgb), 0.65));
        }

        /* In the sidebar and loader, render a soft primary ambient glow */
        .sidebar .official-logo-img,
        .fullscreen-loader-overlay .official-logo-img,
        [data-theme="dark"] .official-logo-img {
          filter: drop-shadow(0 4px 16px color-mix(in srgb, var(--primary) 45%, transparent));
        }
      `}</style>
    </div>
  );
}
