import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Sparkles, XCircle, AlertCircle } from 'lucide-react';

export default function TutorialDemoBanner({ onExitTour }) {
  const { isDemoMode, demoNotice, exitTour } = useFinance();

  if (!isDemoMode) return null;

  const handleExit = onExitTour || exitTour;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 998, marginBottom: '1rem' }}>
      {/* Persistent Tutorial Demo Banner */}
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
          background: 'linear-gradient(135deg, rgba(67, 30, 95, 0.95) 0%, rgba(98, 45, 140, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(192, 132, 252, 0.45)',
          borderRadius: 'var(--radius-md, 10px)',
          boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.4)',
          color: '#F3E8FF'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(250, 204, 21, 0.2)',
            color: '#FACC15',
            flexShrink: 0
          }}>
            <Sparkles size={15} />
          </span>
          <div style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>
            <strong style={{ color: '#FACC15', marginRight: '0.35rem' }}>Tutorial Mode:</strong>
            <span>You are viewing sample student data. Your real data is untouched.</span>
          </div>
        </div>

        {handleExit && (
          <button
            onClick={handleExit}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.12)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              cursor: 'pointer'
            }}
            aria-label="Exit tutorial"
          >
            <XCircle size={14} /> Exit Tutorial
          </button>
        )}
      </aside>

      {/* Floating Action Notice (e.g. when blocked export/sync is clicked) */}
      {demoNotice && (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.6rem 1rem',
            background: 'rgba(245, 158, 11, 0.18)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderRadius: 'var(--radius-sm, 6px)',
            color: '#FDE68A',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <AlertCircle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span>{demoNotice}</span>
        </div>
      )}
    </div>
  );
}
