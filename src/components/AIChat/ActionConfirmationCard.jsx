import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  CreditCard,
  Calendar,
  AlertCircle,
  PieChart,
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Search,
  Sparkles
} from 'lucide-react';

/**
 * Maps action types to friendly icons, titles, and color tokens
 */
function getActionMeta(actionType) {
  switch (actionType) {
    case 'CREATE_BUDGET':
      return {
        icon: <PieChart size={16} color="var(--primary)" />,
        label: 'Create Budget',
        badgeColor: 'rgba(59, 130, 246, 0.15)',
        textColor: 'var(--primary)'
      };
    case 'UPDATE_BUDGET':
      return {
        icon: <PieChart size={16} color="var(--primary)" />,
        label: 'Update Budget',
        badgeColor: 'rgba(59, 130, 246, 0.15)',
        textColor: 'var(--primary)'
      };
    case 'CREATE_SAVINGS_GOAL':
      return {
        icon: <Target size={16} color="var(--income, #10B981)" />,
        label: 'New Savings Goal',
        badgeColor: 'rgba(16, 185, 129, 0.15)',
        textColor: 'var(--income, #10B981)'
      };
    case 'UPDATE_SAVINGS_GOAL':
      return {
        icon: <Target size={16} color="var(--income, #10B981)" />,
        label: 'Update Savings Goal',
        badgeColor: 'rgba(16, 185, 129, 0.15)',
        textColor: 'var(--income, #10B981)'
      };
    case 'CREATE_TRANSACTION':
      return {
        icon: <ArrowDownLeft size={16} color="var(--expense, #EF4444)" />,
        label: 'Create Transaction',
        badgeColor: 'rgba(239, 68, 68, 0.15)',
        textColor: 'var(--expense, #EF4444)'
      };
    case 'SEARCH_TRANSACTIONS':
      return {
        icon: <Search size={16} color="var(--primary)" />,
        label: 'Search Transactions',
        badgeColor: 'rgba(99, 102, 241, 0.15)',
        textColor: 'var(--primary)'
      };
    case 'GENERATE_FINANCIAL_REPORT':
      return {
        icon: <FileText size={16} color="var(--income, #10B981)" />,
        label: 'Generate Report',
        badgeColor: 'rgba(16, 185, 129, 0.15)',
        textColor: 'var(--income, #10B981)'
      };
    default:
      return {
        icon: <Sparkles size={16} color="var(--primary)" />,
        label: actionType || 'Financial Action',
        badgeColor: 'rgba(99, 102, 241, 0.15)',
        textColor: 'var(--primary)'
      };
  }
}

export default function ActionConfirmationCard({
  action,
  onConfirm,
  onCancel,
  disabled = false
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!action) return null;

  const resolvedActionId = action.actionId || action.id;
  const { actionType, summary, details, amount, category, account, date, status, expiresAt } = action;
  const meta = getActionMeta(actionType);

  const isExpired = expiresAt && Date.now() > expiresAt;
  const currentStatus = isExpired && status === 'pending' ? 'expired' : status;

  const handleConfirm = async () => {
    if (disabled || isSubmitting || currentStatus !== 'pending') return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onConfirm({
        ...action,
        actionId: resolvedActionId,
        id: resolvedActionId
      });
    } catch (err) {
      setActionError(err.message || 'Execution failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (disabled || isSubmitting || currentStatus !== 'pending') return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onCancel({
        ...action,
        actionId: resolvedActionId,
        id: resolvedActionId
      });
    } catch (err) {
      setActionError(err.message || 'Failed to cancel action.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="kampuskash-action-card"
      style={{
        marginTop: '0.85rem',
        borderRadius: '14px',
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border-light)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card-subtle)',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: meta.badgeColor
            }}
          >
            {meta.icon}
          </span>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Proposed Action: {meta.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Requires explicit confirmation before saving
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {currentStatus === 'pending' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Clock size={11} />
              Awaiting Approval
            </span>
          )}
          {currentStatus === 'approved' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--income, #10B981)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <CheckCircle2 size={11} />
              Approved & Saved
            </span>
          )}
          {currentStatus === 'cancelled' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: 'rgba(156, 163, 175, 0.15)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <XCircle size={11} />
              Cancelled
            </span>
          )}
          {currentStatus === 'expired' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--expense, #EF4444)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <AlertCircle size={11} />
              Expired
            </span>
          )}
          {currentStatus === 'failed' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--expense, #EF4444)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <AlertCircle size={11} />
              Failed
            </span>
          )}
        </div>
      </div>

      {/* Card Content & Details */}
      <div style={{ padding: '0.9rem 1rem' }}>
        {/* Summary text */}
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.65rem' }}>
          {summary || 'Review proposed financial changes'}
        </div>

        {/* Structured Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
            padding: '0.65rem',
            borderRadius: '10px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-light)',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          {(details?.title || action?.title) && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Goal / Title
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {details?.title || action?.title}
              </span>
            </div>
          )}

          {amount !== undefined && amount !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {actionType === 'CREATE_SAVINGS_GOAL' || actionType === 'UPDATE_SAVINGS_GOAL' ? 'Target Amount' : 'Amount'}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: details?.type === 'income' ? 'var(--income, #10B981)' : 'var(--text-main)' }}>
                RM{Number(amount).toFixed(2)}
              </span>
            </div>
          )}

          {category && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Category
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <Tag size={12} color="var(--primary)" />
                {category}
              </span>
            </div>
          )}

          {account && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <CreditCard size={12} color="var(--income)" />
                {account}
              </span>
            </div>
          )}

          {date && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {actionType === 'CREATE_SAVINGS_GOAL' || actionType === 'UPDATE_SAVINGS_GOAL' ? 'Target Date' : 'Date'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <Calendar size={12} color="var(--text-muted)" />
                {date}
              </span>
            </div>
          )}

          {details?.period && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Period
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {details.period}
              </span>
            </div>
          )}

          {details?.currentAmount !== undefined && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Initial Deposit
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                RM{Number(details.currentAmount).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {actionError && (
          <div
            style={{
              marginTop: '0.6rem',
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '0.78rem',
              color: 'var(--expense, #EF4444)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <AlertCircle size={14} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Buttons (Only active when status is pending and not expired) */}
        {currentStatus === 'pending' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '0.85rem'
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting || disabled}
              className="btn btn-secondary"
              style={{
                padding: '0.55rem 0.95rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                flex: '1 1 auto',
                cursor: isSubmitting || disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <XCircle size={15} />
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || disabled}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '8px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                flex: '1 1 auto',
                cursor: isSubmitting || disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Processing...' : 'Confirm & Save'}
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: '0.65rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              textAlign: 'right'
            }}
          >
            {currentStatus === 'approved' && 'Action executed and verified.'}
            {currentStatus === 'cancelled' && 'Proposal discarded by user.'}
            {currentStatus === 'expired' && 'Action proposal expired after 15 minutes.'}
          </div>
        )}
      </div>
    </div>
  );
}
