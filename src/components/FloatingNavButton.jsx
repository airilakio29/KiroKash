import React from 'react';
import { Menu } from 'lucide-react';

export default function FloatingNavButton({ isOpen, onOpen }) {
  // If drawer is already open, hide the floating trigger button
  if (isOpen) return null;

  return (
    <button
      onClick={onOpen}
      className="kampuskash-floating-nav-btn"
      aria-label="Open Navigation Menu"
      title="Open Navigation Menu"
    >
      <Menu size={22} color="#FFFFFF" />

      <style>{`
        .kampuskash-floating-nav-btn {
          display: none;
          position: fixed;
          bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
          left: calc(1.25rem + env(safe-area-inset-left, 0px));
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(30, 20, 48, 0.95) 0%, rgba(20, 14, 34, 0.98) 100%);
          border: 1px solid rgba(139, 92, 246, 0.45);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), 0 0 18px rgba(139, 92, 246, 0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #FFFFFF;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 980;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, opacity 0.2s ease;
          animation: navFabFloatIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes navFabFloatIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .kampuskash-floating-nav-btn:hover {
          transform: scale(1.06) translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6), 0 0 24px rgba(139, 92, 246, 0.5);
          border-color: rgba(168, 85, 247, 0.65);
        }

        .kampuskash-floating-nav-btn:active {
          transform: scale(0.92);
        }

        @media (max-width: 900px) {
          .kampuskash-floating-nav-btn {
            display: flex;
          }
        }
      `}</style>
    </button>
  );
}
