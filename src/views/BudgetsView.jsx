import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { calculateBudgetStatus } from '../services/budgetService';
import { formatRM } from '../utils/formatCurrency';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { BudgetsSkeleton } from '../components/Skeleton';
import { Target, PlusCircle, Trash2, Edit3, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function BudgetsView({ onOpenAddBudget, onEditBudget }) {
  const { budgets, categories, transactions, deleteBudget, isLoading } = useFinance();
  const { showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          Budgets
        </h2>

        <button
          data-tour="budgets-add-btn"
          onClick={onOpenAddBudget}
          className="btn btn-primary"
          style={{ minHeight: '44px' }}
        >
          <PlusCircle size={16} /> Set Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No budgets yet"
          description="Set a monthly cap to stay on track."
          actionText="Set Budget"
          onAction={onOpenAddBudget}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '0.9rem'
        }}>
          {budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const status = calculateBudgetStatus(budget, transactions);
            const { spent, limit, remaining, overAmount, percentage, isOver, isNear } = status;
            const displayPct = Math.round(percentage);
            const isExpanded = Boolean(expandedIds[budget.id]);
            const statusColor = isOver ? 'var(--expense)' : isNear ? 'var(--warning)' : 'var(--income)';

            return (
              <div
                key={budget.id}
                className="card"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleExpand(budget.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(budget.id);
                  }
                }}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '1rem 1.1rem',
                  borderColor: isOver ? 'color-mix(in srgb, var(--expense) 45%, var(--border-light))' : undefined
                }}
              >
                {/* Row 1: Category Name + Real % + Expand Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: category ? category.color : 'var(--primary)',
                      flexShrink: 0
                    }} />
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {category ? category.name : 'Category'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: statusColor }}>
                      {displayPct}%
                    </span>
                    {isExpanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Progress Bar (visually capped at 100%) */}
                <div className="progress-bar-bg" style={{ height: '8px', marginBottom: '0.65rem' }}>
                  <div
                    className={`progress-bar-fill ${isOver ? 'progress-danger' : isNear ? 'progress-warning' : 'progress-safe'}`}
                    style={{ width: `${Math.min(100, percentage)}%`, transition: 'width 0.35s ease' }}
                  />
                </div>

                {/* Primary Status Line: "RM X left" or "Over by RM X" */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  {isOver ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--expense)', fontSize: '0.86rem', fontWeight: 700 }}>
                      <AlertCircle size={15} /> Over by {formatRM(overAmount)}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: statusColor, fontSize: '0.86rem', fontWeight: 700 }}>
                      {isNear ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                      {formatRM(remaining)} left
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {isExpanded ? 'Hide' : 'Details'}
                  </span>
                </div>

                {/* Expandable Details (Hidden behind tap) */}
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
                        <div style={{ color: 'var(--text-muted)' }}>Spent</div>
                        <strong style={{ color: 'var(--text-main)' }}>{formatRM(spent)}</strong>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Cap</div>
                        <strong style={{ color: 'var(--text-main)' }}>{formatRM(limit)}</strong>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>{isOver ? 'Over' : 'Left'}</div>
                        <strong style={{ color: statusColor }}>{formatRM(isOver ? overAmount : remaining)}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {onEditBudget && (
                        <button
                          type="button"
                          onClick={() => onEditBudget(budget)}
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '44px', padding: '0 0.85rem' }}
                          aria-label={`Edit ${category?.name || 'Category'} Budget`}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(budget)}
                        className="btn btn-danger btn-sm"
                        style={{ minHeight: '44px', padding: '0 0.85rem' }}
                        aria-label={`Remove ${category?.name || 'Category'} Budget`}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
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
