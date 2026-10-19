import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 'calc(max(0.5rem, env(safe-area-inset-top, 0px)) + 4px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99998,
        width: 'calc(100% - 2rem)',
        maxWidth: '560px',
        animation: 'slideDownBanner 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderRadius: '14px',
          background: isOffline
            ? 'rgba(30, 24, 38, 0.95)'
            : 'rgba(16, 44, 30, 0.95)',
          border: `1px solid ${isOffline ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#FFFFFF',
          fontSize: '0.85rem',
          lineHeight: 1.4
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: isOffline ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isOffline ? (
            <WifiOff size={18} color="#F87171" />
          ) : (
            <Wifi size={18} color="#34D399" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {isOffline ? (
            <div>
              <strong style={{ display: 'block', color: '#FCA5A5', fontWeight: 600 }}>
                You are currently offline
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#E2E8F0', opacity: 0.88 }}>
                Live balances, financial sync, and AI features require internet connectivity.
              </span>
            </div>
          ) : (
            <div>
              <strong style={{ display: 'block', color: '#6EE7B7', fontWeight: 600 }}>
                Back Online
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#E2E8F0', opacity: 0.88 }}>
                Connection restored. Your financial data is synchronized.
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDownBanner {
          from {
            opacity: 0;
            transform: translate(-50%, -16px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
