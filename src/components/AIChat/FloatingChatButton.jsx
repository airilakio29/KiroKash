import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function FloatingChatButton({ isOpen, onToggle }) {
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [isOpen, hasBeenOpened]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onToggle(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => onToggle(!isOpen)}
        className="kampuskash-ai-fab"
        aria-label="KampusKash AI Financial Assistant"
        title="KampusKash AI Personal Assistant"
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <>
            <Sparkles size={22} />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--income, #10B981)',
                border: '2px solid var(--bg-app)',
                boxShadow: '0 0 8px var(--income, #10B981)'
              }}
            />
          </>
        )}
      </button>

      {/* Click-outside backdrop */}
      {isOpen && (
        <div
          className="kampuskash-ai-backdrop"
          onClick={() => onToggle(false)}
          aria-label="Close AI Assistant overlay"
        />
      )}

      {/* Floating Panel / Drawer Modal with Persistent State */}
      {hasBeenOpened && (
        <div
          className={`kampuskash-ai-popup-overlay ${isOpen ? 'ai-panel-open' : 'ai-panel-closed'}`}
          onClick={(e) => e.stopPropagation()}
          aria-hidden={!isOpen}
        >
          <ChatWindow
            onClose={() => onToggle(false)}
            isModal={true}
          />
        </div>
      )}

      <style>{`
        .kampuskash-ai-fab {
          position: fixed;
          bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
          right: calc(1.25rem + env(safe-area-inset-right, 0px));
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
          color: #FFFFFF;
          border: 1px solid var(--border-light, rgba(255, 255, 255, 0.2));
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4), 0 0 20px var(--border-light, rgba(139, 92, 246, 0.35));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 990;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: transform var(--anim-duration-btn, 150ms) var(--anim-ease-out, cubic-bezier(0.16, 1, 0.3, 1)), box-shadow var(--anim-duration-btn, 150ms) ease;
        }

        .kampuskash-ai-fab:hover {
          transform: scale(1.06) translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(139, 92, 246, 0.5);
        }

        .kampuskash-ai-fab:active {
          transform: scale(0.92);
        }

        .kampuskash-ai-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 5, 15, 0.58);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 990;
          transition: opacity var(--anim-duration-ai, 380ms) ease, visibility var(--anim-duration-ai, 380ms);
        }

        .kampuskash-ai-backdrop.backdrop-open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .kampuskash-ai-backdrop.backdrop-closed {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .kampuskash-ai-popup-overlay {
          position: fixed;
          bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));
          right: calc(1.25rem + env(safe-area-inset-right, 0px));
          width: 420px;
          max-width: calc(100vw - 2.5rem);
          height: 620px;
          max-height: calc(100vh - 7rem);
          z-index: 991;
          filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.55));
          transition: opacity var(--anim-duration-ai, 380ms) var(--anim-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
                      transform var(--anim-duration-ai, 380ms) var(--anim-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
                      visibility var(--anim-duration-ai, 380ms);
          will-change: transform, opacity;
        }

        .kampuskash-ai-popup-overlay.ai-panel-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .kampuskash-ai-popup-overlay.ai-panel-closed {
          opacity: 0;
          visibility: hidden;
          transform: translateY(18px) scale(0.96);
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .kampuskash-ai-popup-overlay {
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            height: 100dvh !important;
            max-height: 100vh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            z-index: 1000 !important;
            box-sizing: border-box;
          }

          .kampuskash-ai-popup-overlay.ai-panel-open {
            transform: translateY(0);
          }

          .kampuskash-ai-popup-overlay.ai-panel-closed {
            transform: translateY(100%);
          }
        }
      `}</style>
    </>
  );
}
