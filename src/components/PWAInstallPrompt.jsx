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
          className="pwa-install-banner-container"
        >
          <div className="pwa-install-banner-card">
            {/* App Icon */}
            <div className="pwa-install-banner-icon">
              <img
                src="/icons/icon-192x192.png"
                alt="KampusKash"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Banner Content */}
            <div className="pwa-install-banner-text">
              <div className="pwa-install-banner-title-row">
                <span className="pwa-install-banner-title">
                  Install KampusKash
                </span>
                <span className="pwa-install-app-badge">
                  App
                </span>
              </div>
              <p className="pwa-install-banner-sub">
                Fast home screen access &amp; standalone mobile experience.
              </p>
            </div>

            {/* Install Button */}
            <button
              onClick={handleBannerAction}
              className="pwa-install-banner-cta"
            >
              <Download size={14} />
              <span>Install</span>
            </button>

            {/* Dismiss Button */}
            <button
              onClick={handleDismissBanner}
              aria-label="Dismiss install promotion"
              className="pwa-install-banner-dismiss"
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
        .pwa-install-banner-container {
          position: fixed;
          bottom: calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 12px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 99990;
          width: calc(100% - 2rem);
          max-width: 520px;
          animation: slideUpBanner 0.32s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }
        .pwa-install-banner-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.9rem;
          border-radius: 16px;
          background: rgba(20, 16, 28, 0.95);
          border: 1px solid rgba(139, 92, 246, 0.35);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55), 0 0 24px rgba(139, 92, 246, 0.25);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: #FFFFFF;
          width: 100%;
          box-sizing: border-box;
        }
        .pwa-install-banner-icon {
          width: 42px;
          height: 42px;
          padding: 4px;
          border-radius: 12px;
          background: #0A0A0F;
          border: 1px solid rgba(139, 92, 246, 0.4);
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .pwa-install-banner-text {
          flex: 1;
          min-width: 0;
        }
        .pwa-install-banner-title-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
        }
        .pwa-install-banner-title {
          font-weight: 700;
          font-size: 0.92rem;
          letter-spacing: -0.01em;
          color: #F3EDF9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pwa-install-app-badge {
          font-size: 0.66rem;
          background: rgba(139, 92, 246, 0.22);
          color: #C4B5FD;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .pwa-install-banner-sub {
          margin: 2px 0 0;
          font-size: 0.76rem;
          color: #A79BB7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pwa-install-banner-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.32rem;
          padding: 0.5rem 0.85rem;
          min-height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
          color: #FFFFFF;
          font-size: 0.8rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          white-space: nowrap;
          flex-shrink: 0;
          touch-action: manipulation;
        }
        .pwa-install-banner-dismiss {
          background: transparent;
          border: none;
          color: #8E82A1;
          padding: 0.35rem;
          min-width: 34px;
          min-height: 34px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }
        @media (max-width: 900px) {
          /* Sit cleanly above the bottom navigation bar + raised Scan QR + AI FAB */
          .pwa-install-banner-container {
            bottom: calc(var(--mobile-nav-height, 66px) + 4.35rem + env(safe-area-inset-bottom, 0px));
            width: calc(100% - 1.25rem);
          }
        }
        @media (max-width: 400px) {
          .pwa-install-banner-container {
            width: calc(100% - 1rem);
          }
          .pwa-install-banner-card {
            gap: 0.5rem;
            padding: 0.65rem 0.7rem;
          }
          .pwa-install-banner-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }
          .pwa-install-banner-title {
            font-size: 0.84rem;
          }
          .pwa-install-app-badge {
            display: none;
          }
          .pwa-install-banner-sub {
            font-size: 0.7rem;
          }
          .pwa-install-banner-cta {
            padding: 0.45rem 0.68rem;
            font-size: 0.76rem;
          }
        }
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
