import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function FloatingChatButton({ isOpen, onToggle }) {
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
        style={{
          position: 'fixed',
          bottom: '1.75rem',
          right: '1.75rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
          color: '#FFFFFF',
          border: '1px solid var(--border-light, rgba(255, 255, 255, 0.2))',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4), 0 0 20px var(--border-light, rgba(139, 92, 246, 0.35))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 990,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'rotate(90deg) scale(0.95)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <Sparkles size={24} />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'var(--income, #10B981)',
                border: '2px solid var(--bg-app)',
                boxShadow: '0 0 8px var(--income, #10B981)'
              }}
            />
          </>
        )}
      </button>

      {/* Floating Panel / Drawer Modal */}
      {isOpen && (
        <div
          className="kampuskash-ai-popup-overlay"
          onClick={() => onToggle(false)}
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.75rem',
            width: '420px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '620px',
            maxHeight: 'calc(100vh - 7rem)',
            zIndex: 991,
            animation: 'slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5))'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ChatWindow
            onClose={() => onToggle(false)}
            isModal={true}
          />
        </div>
      )}
    </>
  );
}
