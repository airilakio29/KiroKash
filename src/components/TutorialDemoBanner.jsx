import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Sparkles, AlertCircle, X } from 'lucide-react';

export default function TutorialDemoBanner({ onExitTour }) {
  const { isDemoMode, demoNotice, exitTour } = useFinance();
  const [collapsed, setCollapsed] = useState(false);

  if (!isDemoMode) return null;

  const handleExit = onExitTour || exitTour;

  return (
    <div
      className="tutorial-demo-banner-flow"
      style={{ position: 'relative', zIndex: 1, marginBottom: '0.75rem' }}
    >
      {collapsed ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand demo mode notice"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.32rem 0.7rem',
              minHeight: '32px',
              borderRadius: '999px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={12} color="var(--primary)" />
            <span>Demo</span>
          </button>
        </div>
      ) : (
        <aside
          role="status"
          aria-label="Demo mode notice"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.32rem 0.45rem 0.32rem 0.75rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '999px',
            color: 'var(--text-main)',
            fontSize: '0.78rem',
            maxWidth: '100%'
          }}
        >
          <Sparkles size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Demo mode</span>
          {handleExit && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <button
                type="button"
                onClick={handleExit}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0.35rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                aria-label="Sign up for a real account"
              >
                Sign up
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse demo pill"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={13} />
          </button>
        </aside>
      )}

      {demoNotice && (
        <div
          role="alert"
          style={{
            marginTop: '0.45rem',
            padding: '0.5rem 0.85rem',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-sm, 8px)',
            color: 'var(--text-main)',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <AlertCircle size={15} color="var(--warning)" style={{ flexShrink: 0 }} />
          <span>{demoNotice}</span>
        </div>
      )}
    </div>
  );
}
