import React, { useState } from 'react';
import { MessageSquare, BarChart3, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import ChatWindow from '../components/AIChat/ChatWindow';
import FinancialInsightsDashboard from '../components/AIChat/FinancialInsightsDashboard';
import MonthlyReportView from '../components/AIChat/MonthlyReportView';

export default function AIChatView({ onBack }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'insights' | 'report'

  return (
    <div
      className="ai-chat-page-shell"
      style={{
        height: 'calc(100dvh - 180px - env(safe-area-inset-bottom, 0px))',
        minHeight: '440px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg, 16px)',
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        background: 'var(--bg-card)'
      }}
    >
      {/* Top Segmented Navigation Bar */}
      <div
        className="ai-chat-top-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '0.5rem',
          padding: '0.6rem 0.9rem',
          background: 'var(--bg-card-subtle)',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="ai-mobile-back-btn"
              aria-label="Back to Dashboard"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'chat' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'chat' ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s ease, color 0.2s ease'
            }}
          >
            <MessageSquare size={15} />
            <span>AI Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'insights' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'insights' ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s ease, color 0.2s ease'
            }}
          >
            <BarChart3 size={15} />
            <span>Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'report' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'report' ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s ease, color 0.2s ease'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Report & PDF</span>
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', opacity: 0.85, whiteSpace: 'nowrap' }} className="hidden-on-mobile">
          KampusKash Intelligence Suite • Groq LPU AI
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'chat' && <ChatWindow isModal={false} />}
        {activeTab === 'insights' && (
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <FinancialInsightsDashboard />
          </div>
        )}
        {activeTab === 'report' && (
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <MonthlyReportView />
          </div>
        )}
      </div>

      <style>{`
        .ai-mobile-back-btn {
          display: none;
        }
        @media (max-width: 900px) {
          .ai-chat-page-shell {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 0 !important;
            max-height: 100dvh !important;
            z-index: 1050 !important;
            border-radius: 0 !important;
            border: none !important;
            padding-top: env(safe-area-inset-top, 0px) !important;
            box-shadow: none !important;
          }
          .ai-mobile-back-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
