import React, { useState, useEffect, useRef } from 'react';
import KampusKashLogo from './KampusKashLogo';

/**
 * Immersive, Token-Driven Full Screen Loader for KampusKash
 *
 * Requirements:
 * - Visible for a minimum of 4 seconds (1.5s under prefers-reduced-motion)
 * - Synchronizes with parallel data loading; does not cut short while data is loading
 * - Hard cap at 8 seconds with a graceful continue
 * - Staged GPU animations (logo reveal, glow build, smooth progress, final moment at 4.0s)
 * - Animates ONLY transform and opacity
 * - Theme-token driven surface and glow
 * - Accessible "Loading" status label
 */
export default function FullScreenLoader({ isDataReady = false, onComplete }) {
  const mountTimeRef = useRef(Date.now());
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFinalMoment, setIsFinalMoment] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing your financial space...');

  // Check user preference for reduced motion
  const isReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  const MIN_DURATION = isReducedMotion ? 1500 : 4000;
  const MAX_DURATION = 8000;
  const FADE_DURATION = isReducedMotion ? 150 : 380;

  useEffect(() => {
    // Dynamic staged micro-copy
    if (isReducedMotion) {
      setStatusMessage('Loading your workspace...');
      return;
    }

    const t1 = setTimeout(() => {
      setStatusMessage('Connecting to student accounts & allowance...');
    }, 1400);

    const t2 = setTimeout(() => {
      setStatusMessage('Setting up budgets, goals & campus insights...');
    }, 2800);

    const t3 = setTimeout(() => {
      setStatusMessage('Everything is ready. Welcome back!');
      setIsFinalMoment(true);
    }, 3650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isReducedMotion]);

  useEffect(() => {
    let checkInterval = null;
    let fallbackCapTimer = null;

    const attemptCompletion = () => {
      const elapsed = Date.now() - mountTimeRef.current;
      const ready = isDataReady || elapsed >= MAX_DURATION;

      if (elapsed >= MIN_DURATION && ready) {
        setIsFinalMoment(true);
        // Trigger fade out
        setIsFadingOut(true);

        setTimeout(() => {
          setIsCompleted(true);
          if (typeof onComplete === 'function') {
            onComplete();
          }
        }, FADE_DURATION);

        return true;
      }
      return false;
    };

    // Poll to check ready condition once minimum duration arrives
    checkInterval = setInterval(() => {
      if (attemptCompletion()) {
        clearInterval(checkInterval);
        clearTimeout(fallbackCapTimer);
      }
    }, 100);

    // Hard ceiling at 8 seconds with graceful continue
    fallbackCapTimer = setTimeout(() => {
      attemptCompletion();
    }, MAX_DURATION + 100);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (fallbackCapTimer) clearTimeout(fallbackCapTimer);
    };
  }, [isDataReady, MIN_DURATION, MAX_DURATION, FADE_DURATION, onComplete]);

  if (isCompleted) return null;

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
        background: 'var(--bg-app-gradient, var(--bg-app))',
        backgroundColor: 'var(--bg-app)',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: `opacity ${FADE_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${FADE_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        pointerEvents: isFadingOut ? 'none' : 'auto',
        userSelect: 'none'
      }}
    >
      {/* Screen-reader only accessible label */}
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        Loading
      </span>

      {/* Ambient Staged Glow Build */}
      <div
        className={`loader-ambient-glow ${isReducedMotion ? 'reduced' : ''}`}
        style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 35%, transparent) 0%, transparent 72%)',
          pointerEvents: 'none',
          willChange: 'transform, opacity'
        }}
      />

      <div
        className="loader-center-content"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.75rem',
          padding: '2rem',
          maxWidth: '90vw',
          textAlign: 'center'
        }}
      >
        {/* Logo Container with Staged Reveal */}
        <div
          className={`loader-logo-wrapper ${isReducedMotion ? 'reduced' : ''} ${isFinalMoment ? 'final-moment' : ''}`}
          style={{ willChange: 'transform, opacity' }}
        >
          <KampusKashLogo size={68} />
        </div>

        {/* Progress Track & Fill (Driven by theme tokens) */}
        <div
          style={{
            width: '240px',
            maxWidth: '75vw',
            height: '5px',
            borderRadius: '9999px',
            background: 'color-mix(in srgb, var(--text-main) 14%, transparent)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 2px 10px rgba(var(--shadow-rgb), 0.15)'
          }}
        >
          <div
            className={`loader-progress-fill ${isReducedMotion ? 'reduced' : ''} ${isFinalMoment ? 'final-moment' : ''}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '100%',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 55%, var(--accent-fg) 100%)',
              transformOrigin: 'left center',
              willChange: 'transform, opacity'
            }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div style={{ minHeight: '24px' }}>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.01em',
              fontFamily: 'var(--font-sans)',
              transition: 'opacity 0.25s ease'
            }}
          >
            {statusMessage}
          </span>
        </div>
      </div>

      <style>{`
        /* --- Staged Intro & Glow Keyframes (Transforms & Opacities ONLY) --- */

        /* 1. Logo Reveal (0s - 0.8s) */
        @keyframes loaderLogoReveal {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* 2. Ambient Glow Build (0.8s - 2.4s) */
        @keyframes loaderGlowBuild {
          0% {
            opacity: 0;
            transform: scale(0.75);
          }
          40% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          100% {
            opacity: 0.9;
            transform: scale(1.15);
          }
        }

        /* 3. Progress Bar Fill (0s - 3.8s) */
        @keyframes loaderProgressScale {
          0% {
            transform: scaleX(0);
          }
          20% {
            transform: scaleX(0.25);
          }
          50% {
            transform: scaleX(0.62);
          }
          80% {
            transform: scaleX(0.88);
          }
          100% {
            transform: scaleX(1);
          }
        }

        /* 4. Final Moment Pulse (3.8s - 4.0s) */
        @keyframes loaderFinalPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        .loader-logo-wrapper {
          animation: loaderLogoReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .loader-logo-wrapper.final-moment {
          animation: loaderFinalPulse 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .loader-ambient-glow {
          animation: loaderGlowBuild 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .loader-progress-fill {
          animation: loaderProgressScale 3.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* --- Reduced Motion Modes --- */
        .loader-logo-wrapper.reduced,
        .loader-ambient-glow.reduced,
        .loader-progress-fill.reduced {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      `}</style>
    </div>
  );
}
