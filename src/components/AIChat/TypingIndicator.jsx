import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        marginBottom: '1rem',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
        }}
      >
        <Sparkles size={16} />
      </div>

      <div
        style={{
          padding: '0.85rem 1.15rem',
          borderRadius: '16px',
          borderBottomLeftRadius: '4px',
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            marginRight: '0.35rem',
            fontWeight: 500
          }}
        >
          KampusKash AI is analyzing
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span className="ai-typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="ai-typing-dot" style={{ animationDelay: '180ms' }} />
          <span className="ai-typing-dot" style={{ animationDelay: '360ms' }} />
        </div>
      </div>
    </div>
  );
}
