import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = 3600) => {
    const id = `toast-${++idCounter.current}`;
    const newToast = { id, type, message };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, duration) => addToast('success', message, duration), [addToast]);
  const showError = useCallback((message, duration) => addToast('error', message, duration), [addToast]);
  const showInfo = useCallback((message, duration) => addToast('info', message, duration), [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, removeToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        className="toast-container"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
          right: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          maxWidth: 'min(420px, calc(100vw - 2.5rem))',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          const icon = isSuccess ? (
            <CheckCircle2 size={18} color="#10B981" />
          ) : isError ? (
            <AlertCircle size={18} color="#EF4444" />
          ) : (
            <Info size={18} color="#8B5CF6" />
          );

          const borderBg = isSuccess
            ? '1px solid rgba(16, 185, 129, 0.4)'
            : isError
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(139, 92, 246, 0.4)';

          const glowColor = isSuccess
            ? 'rgba(16, 185, 129, 0.25)'
            : isError
            ? 'rgba(239, 68, 68, 0.25)'
            : 'rgba(139, 92, 246, 0.25)';

          return (
            <div
              key={toast.id}
              role="alert"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(26, 18, 38, 0.94)',
                border: borderBg,
                boxShadow: `0 12px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${glowColor}`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 500,
                lineHeight: 1.4,
                animation: 'toastPopIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease'
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastPopIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 600px) {
          .toast-container {
            right: 1rem !important;
            left: 1rem !important;
            max-width: calc(100vw - 2rem) !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback so any component can invoke without throwing
    return {
      showSuccess: (msg) => console.log('[Success Toast]', msg),
      showError: (msg) => console.error('[Error Toast]', msg),
      showInfo: (msg) => console.info('[Info Toast]', msg),
      removeToast: () => {}
    };
  }
  return ctx;
}
