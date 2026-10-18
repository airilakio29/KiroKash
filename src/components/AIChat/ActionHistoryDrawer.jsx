import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Tag,
  CreditCard,
  PieChart,
  Target,
  ArrowDownLeft,
  FileText
} from 'lucide-react';
import { fetchAIActionHistory } from '../../services/aiService';
import { auth } from '../../firebase';

function getActionIcon(actionType) {
  switch (actionType) {
    case 'CREATE_BUDGET':
    case 'UPDATE_BUDGET':
      return <PieChart size={14} color="var(--primary)" />;
    case 'CREATE_SAVINGS_GOAL':
    case 'UPDATE_SAVINGS_GOAL':
      return <Target size={14} color="var(--income, #10B981)" />;
    case 'CREATE_TRANSACTION':
      return <ArrowDownLeft size={14} color="var(--expense, #EF4444)" />;
    case 'GENERATE_FINANCIAL_REPORT':
      return <FileText size={14} color="var(--income, #10B981)" />;
    default:
      return <Activity size={14} color="var(--primary)" />;
  }
}

export default function ActionHistoryDrawer({
  isOpen,
  onClose,
  userId
}) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadHistory = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const getIdTokenFn = auth?.currentUser
        ? () => auth.currentUser.getIdToken(false)
        : null;
      const res = await fetchAIActionHistory(userId, getIdTokenFn);
      if (res && Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch (err) {
      console.warn('Failed to load action history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '320px',
        maxWidth: '90%',
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border-light)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
        animation: 'slideInRight 0.2s ease-out'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.15rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Activity size={17} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            AI Action History
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onClick={loadHistory}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex'
            }}
            title="Refresh history"
          >
            <RotateCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex'
            }}
            title="Close drawer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          padding: '0.65rem 0.85rem',
          borderBottom: '1px solid var(--border-light)',
          overflowX: 'auto'
        }}
      >
        {['all', 'approved', 'pending', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: filter === tab ? 700 : 500,
              background: filter === tab ? 'var(--primary)' : 'var(--bg-card-subtle)',
              color: filter === tab ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Action List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}
      >
        {filteredHistory.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.82rem'
            }}
          >
            <Activity size={28} style={{ opacity: 0.35, margin: '0 auto 0.5rem' }} />
            <p>No actions found.</p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const timeStr = item.executedAt || item.createdAt
              ? new Date(item.executedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            const dateStr = item.executedAt || item.createdAt
              ? new Date(item.executedAt || item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : '';

            return (
              <div
                key={item.actionId || item.id}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {getActionIcon(item.actionType)}
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.actionType?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {item.status === 'approved' && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--income, #10B981)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <CheckCircle2 size={10} /> Approved
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <Clock size={10} /> Pending
                    </span>
                  )}
                  {item.status === 'cancelled' && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '10px',
                        background: 'rgba(156, 163, 175, 0.15)',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <XCircle size={10} /> Cancelled
                    </span>
                  )}
                  {item.status === 'expired' && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--expense, #EF4444)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <AlertCircle size={10} /> Expired
                    </span>
                  )}
                </div>

                {/* Summary */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  {item.summary || item.details?.title || 'Financial modification proposal'}
                </div>

                {/* Details pill row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {item.amount && (
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      RM{Number(item.amount).toFixed(2)}
                    </span>
                  )}
                  {item.category && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Tag size={10} /> {item.category}
                    </span>
                  )}
                  {item.details?.recordId && (
                    <span style={{ fontFamily: 'monospace', opacity: 0.75 }}>
                      ID: {item.details.recordId}
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', textAlign: 'right' }}>
                  {dateStr} {timeStr}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
