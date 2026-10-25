import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Sparkles, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function TutorialDemoBanner({ onExitTour }) {
  const { isDemoMode, demoNotice, exitTour } = useFinance();

  if (!isDemoMode) return null;

  const handleExit = onExitTour || exitTour;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 998, marginBottom: '1rem' }}>
      {/* Clean Fintech Tutorial / Demo Banner */}
      <aside
        role="status"
        aria-label="Tutorial demo mode notice"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderLeft: '4px solid var(--primary)',
          borderRadius: 'var(--radius-md, 10px)',
          boxShadow: 'var(--shadow-card)',
          color: 'var(--text-main)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            flexShrink: 0
          }}>
            <Sparkles size={16} />
          </span>
          <div style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--text-main)', marginRight: '0.35rem' }}>Live Demo Mode:</strong>
            <span style={{ color: 'var(--text-muted)' }}>
              Exploring with Malaysian student sample data (RM). Test any button or add transactions freely.
            </span>
          </div>
        </div>

        {handleExit && (
          <button
            onClick={handleExit}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '0.4rem 0.85rem'
            }}
            aria-label="Exit tutorial"
          >
            <span>Exit Demo / Sign Up</span>
            <ArrowRight size={14} />
          </button>
        )}
      </aside>

      {/* Floating Action Notice */}
      {demoNotice && (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.65rem 1rem',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-sm, 6px)',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <AlertCircle size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
          <span>{demoNotice}</span>
        </div>
      )}
    </div>
  );
}
