import React, { useState } from 'react';
import { MessageSquare, BarChart3, FileSpreadsheet } from 'lucide-react';
import ChatWindow from '../components/AIChat/ChatWindow';
import FinancialInsightsDashboard from '../components/AIChat/FinancialInsightsDashboard';
import MonthlyReportView from '../components/AIChat/MonthlyReportView';

export default function AIChatView() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'insights' | 'report'

  return (
    <div
      style={{
        height: 'calc(100vh - 110px)',
        minHeight: '600px',
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--bg-card-subtle)',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'chat' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'chat' ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <MessageSquare size={15} />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'insights' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'insights' ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <BarChart3 size={15} />
            <span>Financial Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'report' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'report' ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Monthly Report & PDF</span>
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', opacity: 0.85 }} className="hidden-on-mobile">
          KampusKash Intelligence Suite • 100% Client-side & Secure Node AI
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'chat' && <ChatWindow isModal={false} />}
        {activeTab === 'insights' && <FinancialInsightsDashboard />}
        {activeTab === 'report' && <MonthlyReportView />}
      </div>
    </div>
  );
}
