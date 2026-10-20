import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { calculateSavingsProgress } from '../services/savingsService';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { SavingsSkeleton } from '../components/Skeleton';
import { PiggyBank, PlusCircle, Trash2, Edit3, Calendar, CheckCircle2, ArrowDownCircle } from 'lucide-react';

export default function SavingsView({ onOpenAddSavings, onOpenDepositSavings, onEditSavings }) {
  const { savingsGoals, deleteSavingsGoal, isLoading } = useFinance();
  const { showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700 }}>
              Student Savings Goals
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Set aside money for laptops, reference textbooks, emergency funds, or semester projects.
            </p>
          </div>

          <button data-tour="savings-add-btn" onClick={onOpenAddSavings} className="btn btn-primary">
            <PlusCircle size={16} /> + Create New Goal
          </button>
        </div>
      </div>

      {savingsGoals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No Active Savings Goals"
          description="Setting a concrete savings goal is the easiest way to afford big purchases like laptops, certifications, or semester travel."
          actionText="+ Create Your First Goal"
          onAction={onOpenAddSavings}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '1.25rem'
        }}>
          {savingsGoals.map(goal => {
            const { current, target, percentage, remaining, isCompleted } = calculateSavingsProgress(goal);

            return (
              <div key={goal.id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {goal.title}
                  </h4>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {onEditSavings && (
                      <button
                        onClick={() => onEditSavings(goal)}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        title="Edit Goal"
                        aria-label={`Edit ${goal.title}`}
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(goal)}
                      className="btn btn-danger btn-icon"
                      style={{ width: '30px', height: '30px' }}
                      title="Delete Goal"
                      aria-label={`Delete ${goal.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.35rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.5rem'
                  }}>
                    <div>Target: <strong style={{ color: 'var(--text-main)' }}>RM {target.toFixed(2)}</strong></div>
                    <div style={{ textAlign: 'right' }}>Saved: <strong style={{ color: 'var(--primary)' }}>RM {current.toFixed(2)}</strong></div>
                    <div>Remaining: <strong style={{ color: isCompleted ? 'var(--income)' : 'var(--text-muted)' }}>RM {remaining.toFixed(2)}</strong></div>
                    <div style={{ textAlign: 'right' }}><strong style={{ color: 'var(--primary)' }}>{percentage}%</strong> saved</div>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '10px' }}>
                    <div
                      className="progress-bar-fill progress-safe"
                      style={{
                        width: `${percentage}%`,
                        background: isCompleted ? 'linear-gradient(90deg, #10B981, #34D399)' : undefined,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={13} />
                    <span>{goal.targetDate ? `Target: ${goal.targetDate}` : 'No deadline'}</span>
                  </div>

                  {isCompleted ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--income)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} /> Goal Achieved!
                    </span>
                  ) : (
                    <button
                      onClick={() => onOpenDepositSavings(goal.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      <ArrowDownCircle size={13} /> + Deposit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Styled Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete the savings goal "${deleteTarget?.title}"?`}
        confirmText="Delete Goal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
