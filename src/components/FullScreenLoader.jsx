import React, { useState, useEffect, useRef } from 'react';
import KampusKashLogo from './KampusKashLogo';

/**
 * Official Full Screen Boot Loader for KampusKash
 * Renders the official ghost mascot logo on a sleek midnight background.
 */
export default function FullScreenLoader({ isResolved, onUnmounted }) {
  const [shouldRender, setShouldRender] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isResolved) {
      const minDuration = 450;
      const elapsed = Date.now() - mountTimeRef.current;
      const delay = Math.max(0, minDuration - elapsed);

      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, delay);

      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
        if (onUnmounted) onUnmounted();
      }, delay + 320);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [isResolved, onUnmounted]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading KampusKash"
      className="fullscreen-loader-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: '#0A0A0F',
        opacity: fadeOut ? 0 : 1,
        transform: fadeOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fadeOut ? 'none' : 'auto',
        userSelect: 'none'
      }}
    >
      {/* Subtle radial ambient glow behind logo */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '1.5rem',
          maxWidth: '90vw'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <KampusKashLogo size={56} />
        </div>

        {/* Loading Progress Bar */}
        <div
          style={{
            width: '200px',
            height: '4px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.12)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.25)'
          }}
        >
          <div
            className="loader-fill-bar"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '45%',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #8B5CF6, #A855F7, #EC4899)',
              animation: 'loaderSlide 1.2s ease-in-out infinite'
            }}
          />
        </div>

        <span
          style={{
            fontSize: '0.84rem',
            fontWeight: 500,
            color: '#94A3B8',
            letterSpacing: '0.02em',
            fontFamily: "'Plus Jakarta Sans', var(--font-sans, sans-serif)"
          }}
        >
          Preparing your financial dashboard...
        </span>
      </div>

      <style>{`
        @keyframes loaderSlide {
          0% { left: -45%; }
          50% { left: 40%; }
          100% { left: 105%; }
        }
      `}</style>
    </div>
  );
}
