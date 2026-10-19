import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2, ChevronRight } from 'lucide-react';
import { isPWAInstalled, isIOSDevice } from '../registerServiceWorker';

let globalDeferredPrompt = null;

// Capture beforeinstallprompt globally as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    try {
      localStorage.setItem('kampuskash_pwa_installed', 'true');
    } catch {}
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

export function triggerInstallPrompt() {
  window.dispatchEvent(new CustomEvent('open-pwa-install'));
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt);
  const [installed, setInstalled] = useState(() => isPWAInstalled());
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isInstalledNow = isPWAInstalled();
    setInstalled(isInstalledNow);
    const ios = isIOSDevice();
    setIsIOS(ios);

    if (isInstalledNow) return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('kampuskash_pwa_dismissed') === 'true';

    // Show floating promotion after 3 seconds if not installed & not dismissed
    const timer = setTimeout(() => {
      if (!isPWAInstalled() && !isDismissed) {
        setShowBanner(true);
      }
    }, 2800);

    const handlePromptAvailable = () => {
      setDeferredPrompt(globalDeferredPrompt);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setShowIOSModal(false);
      setShowAndroidModal(false);
    };

    const handleOpenInstall = () => {
      if (ios) {
        setShowIOSModal(true);
      } else if (globalDeferredPrompt) {
        handleTriggerNativeInstall();
      } else {
        setShowAndroidModal(true);
      }
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('open-pwa-install', handleOpenInstall);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('open-pwa-install', handleOpenInstall);
    };
  }, []);

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('kampuskash_pwa_dismissed', 'true');
    } catch {}
  };

  const handleTriggerNativeInstall = async () => {
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
        setShowBanner(false);
        setShowAndroidModal(false);
      }
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
    } else {
      setShowAndroidModal(true);
    }
  };

  const handleBannerAction = () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      handleTriggerNativeInstall();
    }
  };

  // If already installed, do not render banner
  if (installed) return null;

  return (
    <>
      {/* Floating Bottom Install Banner for Mobile & Web */}
      {showBanner && (
        <div
          role="region"
          aria-label="Install KampusKash Application"
          style={{
            position: 'fixed',
            bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99990,
            width: 'calc(100% - 2rem)',
            maxWidth: '520px',
            animation: 'slideUpBanner 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.85rem 1rem',
              borderRadius: '16px',
              background: 'rgba(20, 16, 28, 0.94)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(139, 92, 246, 0.25)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#FFFFFF'
            }}
          >
            {/* App Icon */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#0A0A0F',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}
            >
              <img
                src="/icons/icon-192x192.png"
                alt="KampusKash"
                style={{ width: '34px', height: '34px', objectFit: 'contain' }}
              />
            </div>

            {/* Banner Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#F3EDF9' }}>
                  Install KampusKash
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(139, 92, 246, 0.22)',
                    color: '#C4B5FD',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}
                >
                  App
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#A79BB7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Fast home screen access & standalone mobile experience.
              </p>
            </div>

            {/* Install Button */}
            <button
              onClick={handleBannerAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                touchAction: 'manipulation'
              }}
            >
              <Download size={14} />
              <span>Install</span>
            </button>

            {/* Dismiss Button */}
            <button
              onClick={handleDismissBanner}
              aria-label="Dismiss install promotion"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8E82A1',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                flexShrink: 0
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Step-by-Step Guide Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeInModal 0.2s ease-out'
          }}
          onClick={() => setShowIOSModal(false)}
        >
          <div
            style={{
              background: '#130E1F',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '24px',
              padding: '1.75rem 1.5rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(139, 92, 246, 0.2)',
              color: '#FFFFFF'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#0A0A0F',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img src="/icons/icon-192x192.png" alt="Logo" style={{ width: '32px', height: '32px' }} />
                </div>
                <div>
                  <h3 id="ios-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#F3EDF9' }}>
                    Install on iPhone
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#A79BB7' }}>
                    Follow these 3 quick steps in Safari
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                aria-label="Close guide"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#C4B5D4',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Instruction Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>
              {/* Step 1 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.75rem 0.95rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.25)',
                    color: '#C4B5FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.45, color: '#E2E8F0' }}>
                  Tap the <strong style={{ color: '#FFFFFF' }}>Share button</strong> <Share2 size={15} style={{ verticalAlign: 'middle', margin: '0 2px', color: '#38BDF8' }} /> in the bottom Safari toolbar.
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.75rem 0.95rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.25)',
                    color: '#C4B5FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.45, color: '#E2E8F0' }}>
                  Scroll down the share menu and select <strong style={{ color: '#FFFFFF' }}>"Add to Home Screen"</strong> <PlusSquare size={15} style={{ verticalAlign: 'middle', margin: '0 2px', color: '#C4B5FD' }} />.
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.75rem 0.95rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.25)',
                    color: '#C4B5FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.45, color: '#E2E8F0' }}>
                  Tap <strong style={{ color: '#FFFFFF' }}>"Add"</strong> in the top-right corner to complete installation.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                color: '#FFFFFF',
                fontSize: '0.92rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
              }}
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* Android / Desktop Manual Fallback Guide Modal */}
      {showAndroidModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowAndroidModal(false)}
        >
          <div
            style={{
              background: '#130E1F',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '24px',
              padding: '1.75rem 1.5rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
              color: '#FFFFFF'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#F3EDF9' }}>
                Install KampusKash
              </h3>
              <button
                onClick={() => setShowAndroidModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#C4B5D4',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#C4B5D4', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              To install KampusKash, open your browser menu (⋮ in Chrome or Edge) and tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
            </p>
            <button
              onClick={() => setShowAndroidModal(false)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                color: '#FFFFFF',
                fontSize: '0.92rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpBanner {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
