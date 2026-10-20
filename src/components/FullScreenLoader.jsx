import React, { useState, useEffect, useRef } from 'react';
import logoImg from '../assets/kiro-logo.png';

/**
 * KampusKash Full-Screen Loading Screen
 * Renders cleanly while Firebase auth session & essential setup resolves.
 * Requirements:
 * 1. Shows KampusKash logo clearly.
 * 2. Subtle fade-in and scale-up entrance.
 * 3. Smooth animated loading indicator.
 * 4. Preserves dark purple visual identity & branding.
 * 5. Prevents flashes or abrupt disappearing via sensible minimum display duration (~500ms).
 * 6. Smoothly fades away into the dashboard.
 */
export default function FullScreenLoader({ isResolved = false, onUnmounted }) {
  const [shouldRender, setShouldRender] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isResolved) {
      const minDuration = 500; // Sensible minimum display to prevent flashing
      const elapsed = Date.now() - mountTimeRef.current;
      const delay = Math.max(0, minDuration - elapsed);

      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, delay);

      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
        if (onUnmounted) onUnmounted();
      }, delay + 420); // 420ms smooth fade transition

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [isResolved, onUnmounted]);

  if (!shouldRender) return null;

  const publicLogo = `${import.meta.env.BASE_URL || '/'}kiro-logo.png`.replace(/\/{2,}/g, '/');

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
        background: 'var(--bg-app, #624873)',
        opacity: fadeOut ? 0 : 1,
        transform: fadeOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fadeOut ? 'none' : 'auto',
        userSelect: 'none'
      }}
    >
      {/* Ambient glowing radial auras */}
      <div
        style={{
          position: 'absolute',
          width: 'min(480px, 80vw)',
          height: 'min(480px, 80vw)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.28) 0%, transparent 70%)',
          animation: 'loaderAmbientPulse 3.2s ease-in-out infinite',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 'min(640px, 95vw)',
          height: 'min(640px, 95vw)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(121, 40, 202, 0.18) 0%, transparent 75%)',
          animation: 'loaderAmbientPulse 4.2s ease-in-out infinite 0.8s',
          pointerEvents: 'none'
        }}
      />

      {/* Center content container */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '1.5rem',
          maxWidth: '90vw',
          animation: 'loaderContentEnter 480ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Animated App Logo with Subtle Scale-Up and Breathing Aura */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'loaderBreathing 2.6s ease-in-out infinite 480ms'
          }}
        >
          <img
            src={logoImg || publicLogo}
            alt="KampusKash"
            onError={(e) => {
              if (e.target.src !== publicLogo) {
                e.target.src = publicLogo;
              }
            }}
            style={{
              width: 'clamp(210px, 50vw, 300px)',
              height: 'auto',
              maxHeight: '110px',
              objectFit: 'contain',
              background: 'transparent',
              filter: 'drop-shadow(0 12px 32px rgba(139, 92, 246, 0.45))',
              position: 'relative',
              zIndex: 2
            }}
          />
        </div>

        {/* Smooth Animated Loading Indicator Bar */}
        <div
          style={{
            width: 'clamp(180px, 48vw, 240px)',
            height: '4px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.12)',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '0.75rem',
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.2)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '45%',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, transparent, var(--primary-light, #E8DEF5), #FFFFFF, var(--primary-light, #E8DEF5), transparent)',
              animation: 'loaderProgressSweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />
        </div>

        {/* Subtitle / Status */}
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', var(--font-sans, sans-serif)",
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--text-muted, #C4B5D4)',
            letterSpacing: '0.04em',
            animation: 'loaderTextPulse 2s ease-in-out infinite'
          }}
        >
          Preparing your financial dashboard...
        </div>
      </div>

      <style>{`
        @keyframes loaderContentEnter {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes loaderBreathing {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }
        @keyframes loaderAmbientPulse {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }
        @keyframes loaderProgressSweep {
          0% {
            left: -45%;
          }
          100% {
            left: 100%;
          }
        }
        @keyframes loaderTextPulse {
          0%, 100% {
            opacity: 0.55;
          }
          50% {
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
}
