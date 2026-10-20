import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { calculateBudgetStatus } from '../services/budgetService';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { BudgetsSkeleton } from '../components/Skeleton';
import { Target, PlusCircle, Trash2, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BudgetsView({ onOpenAddBudget, onEditBudget }) {
  const { budgets, categories, transactions, deleteBudget, isLoading } = useFinance();
  const { showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteBudget(deleteTarget.id);
    const cat = categories.find(c => c.id === deleteTarget.categoryId);
    showSuccess(`Removed budget limit for ${cat?.name || 'Category'}`);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <BudgetsSkeleton />;
  }

  return (
    <div className="view-fade-in">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700 }}>
              Monthly Category Budgets
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Set spending caps per category to prevent overspending on food, transport, hostel, or entertainment.
            </p>
          </div>

          <button data-tour="budgets-add-btn" onClick={onOpenAddBudget} className="btn btn-primary">
            <PlusCircle size={16} /> + Set New Budget
          </button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No Budget Limits Created Yet"
          description="Keeping a monthly budget helps you stay comfortably within your student allowance and avoid end-of-month pinches."
          actionText="+ Set Your First Category Budget"
          onAction={onOpenAddBudget}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '1.25rem'
        }}>
          {budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const status = calculateBudgetStatus(budget, transactions);
            const { spent, limit, remaining, percentage, isOver, isNear } = status;

            return (
              <div key={budget.id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: category ? category.color : 'var(--primary)'
                    }} />
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {category ? category.name : 'Category'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {onEditBudget && (
                      <button
                        onClick={() => onEditBudget(budget)}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        title="Edit Budget"
                        aria-label={`Edit ${category?.name || 'Category'} Budget`}
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(budget)}
                      className="btn btn-danger btn-icon"
                      style={{ width: '30px', height: '30px' }}
                      title="Remove Budget"
                      aria-label={`Remove ${category?.name || 'Category'} Budget`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.5rem'
                  }}>
                    <div>Spent: <strong style={{ color: 'var(--text-main)' }}>RM {spent.toFixed(2)}</strong></div>
                    <div style={{ textAlign: 'right' }}>Cap: <strong style={{ color: 'var(--text-main)' }}>RM {limit.toFixed(2)}</strong></div>
                    <div>Remaining: <strong style={{ color: isOver ? 'var(--expense)' : isNear ? 'var(--warning)' : 'var(--income)' }}>RM {remaining.toFixed(2)}</strong></div>
                    <div style={{ textAlign: 'right' }}><strong style={{ color: isOver ? 'var(--expense)' : isNear ? 'var(--warning)' : 'var(--primary)' }}>{percentage}%</strong> spent</div>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div
                      className={`progress-bar-fill ${isOver ? 'progress-danger' : isNear ? 'progress-warning' : 'progress-safe'}`}
                      style={{ width: `${Math.min(100, percentage)}%`, transition: 'width 0.4s ease' }}
                    />
                  </div>
                </div>

                {isOver ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--expense)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <AlertCircle size={14} /> Exceeded by RM {Math.abs(remaining).toFixed(2)}
                  </div>
                ) : isNear ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <AlertCircle size={14} /> Approaching limit (80%+)
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--income)', fontSize: '0.8rem' }}>
                    <CheckCircle2 size={14} /> On Track
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
        title="Remove Budget"
        message={`Are you sure you want to remove the budget cap for "${categories.find(c => c.id === deleteTarget?.categoryId)?.name || 'Category'}"?`}
        confirmText="Remove Budget"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
