import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { calculateSavingsProgress } from '../services/savingsService';
import { formatRM } from '../utils/formatCurrency';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { SavingsSkeleton } from '../components/Skeleton';
import { PiggyBank, PlusCircle, Trash2, Edit3, Calendar, CheckCircle2, ArrowDownCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function SavingsView({ onOpenAddSavings, onOpenDepositSavings, onEditSavings }) {
  const { savingsGoals, deleteSavingsGoal, isLoading } = useFinance();
  const { showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSavingsGoal(deleteTarget.id);
    showSuccess(`Deleted savings goal "${deleteTarget.title}"`);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <SavingsSkeleton />;
  }

  return (
    <div className="view-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          Savings
        </h2>

        <button
          data-tour="savings-add-btn"
          onClick={onOpenAddSavings}
          className="btn btn-primary"
          style={{ minHeight: '44px' }}
        >
          <PlusCircle size={16} /> New Goal
        </button>
      </div>

      {savingsGoals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No savings goals yet"
          description="Create a goal to save for what matters."
          actionText="New Goal"
          onAction={onOpenAddSavings}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '0.9rem'
        }}>
          {savingsGoals.map(goal => {
            const { current, target, percentage, remaining, isCompleted } = calculateSavingsProgress(goal);
            const isExpanded = Boolean(expandedIds[goal.id]);

            return (
              <div
                key={goal.id}
                className="card"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleExpand(goal.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(goal.id);
                  }
                }}
                style={{ position: 'relative', cursor: 'pointer', padding: '1rem 1.1rem' }}
              >
                {/* Row 1: Title + % + Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <h4 style={{
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    color: 'var(--text-main)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {goal.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isCompleted ? 'var(--income)' : 'var(--primary)' }}>
                      {Math.round(percentage)}%
                    </span>
                    {isExpanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-bg" style={{ height: '8px', marginBottom: '0.65rem' }}>
                  <div
                    className="progress-bar-fill progress-safe"
                    style={{
                      width: `${Math.min(100, percentage)}%`,
                      background: isCompleted ? 'linear-gradient(90deg, #10B981, #34D399)' : undefined,
                      transition: 'width 0.35s ease'
                    }}
                  />
                </div>

                {/* Status Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  {isCompleted ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--income)', fontSize: '0.86rem', fontWeight: 700 }}>
                      <CheckCircle2 size={15} /> Goal reached
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-main)', fontSize: '0.86rem', fontWeight: 700 }}>
                      {formatRM(remaining)} left
                    </span>
                  )}

                  {!isCompleted && onOpenDepositSavings && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDepositSavings(goal.id);
                      }}
                      style={{ minHeight: '36px', padding: '0 0.75rem', fontSize: '0.78rem' }}
                    >
                      <ArrowDownCircle size={14} /> Add
                    </button>
                  )}
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: '0.8rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '0.45rem',
                      fontSize: '0.78rem'
                    }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Saved</div>
                        <strong style={{ color: 'var(--primary)' }}>{formatRM(current)}</strong>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Target</div>
                        <strong style={{ color: 'var(--text-main)' }}>{formatRM(target)}</strong>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Left</div>
                        <strong style={{ color: isCompleted ? 'var(--income)' : 'var(--text-main)' }}>{formatRM(remaining)}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {goal.targetDate && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          <Calendar size={13} /> Due {goal.targetDate}
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        {onEditSavings && (
                          <button
                            type="button"
                            onClick={() => onEditSavings(goal)}
                            className="btn btn-secondary btn-sm"
                            style={{ minHeight: '44px', padding: '0 0.85rem' }}
                            aria-label={`Edit ${goal.title}`}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(goal)}
                          className="btn btn-danger btn-sm"
                          style={{ minHeight: '44px', padding: '0 0.85rem' }}
                          aria-label={`Delete ${goal.title}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Styled Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete "${deleteTarget?.title || 'this goal'}"?`}
        confirmText="Delete Goal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
