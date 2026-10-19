import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateBudgetStatus } from '../services/budgetService';
import { Target, PlusCircle, Trash2, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BudgetsView({ onOpenAddBudget, onEditBudget }) {
  const { budgets, categories, transactions, deleteBudget } = useFinance();

  return (
    <div>
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
        <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Target size={40} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No Budget Limits Created Yet
          </h4>
          <p style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Keeping a budget helps ensure you stay within your monthly allowance.
          </p>
          <button onClick={onOpenAddBudget} className="btn btn-primary">
            + Set Your First Category Budget
          </button>
        </div>
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
                      onClick={() => {
                        if (window.confirm(`Remove budget for "${category?.name || 'Category'}"?`)) {
                          deleteBudget(budget.id);
                        }
                      }}
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
                    <div>Budget: <strong style={{ color: 'var(--text-main)' }}>RM {limit.toFixed(2)}</strong></div>
                    <div style={{ textAlign: 'right' }}>Spent: <strong style={{ color: isOver ? 'var(--expense)' : 'var(--text-main)' }}>RM {spent.toFixed(2)}</strong></div>
                    <div>Remaining: <strong style={{ color: isOver ? 'var(--expense)' : 'var(--income)' }}>RM {remaining.toFixed(2)}</strong></div>
                    <div style={{ textAlign: 'right' }}><strong>{percentage}%</strong> used</div>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '10px' }}>
                    <div 
                      className={`progress-bar-fill ${isOver ? 'progress-danger' : isNear ? 'progress-warning' : 'progress-safe'}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-light)' }}>
                  {isOver ? (
                    <span className="badge badge-expense" style={{ fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}>
                      <AlertCircle size={12} /> Over budget by RM {(spent - limit).toFixed(2)}
                    </span>
                  ) : isNear ? (
                    <span className="badge" style={{ background: 'var(--warning-bg)', color: '#B45309', fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}>
                      <AlertCircle size={12} /> Approaching limit (80%+ used)
                    </span>
                  ) : (
                    <span className="badge badge-income" style={{ fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}>
                      <CheckCircle2 size={12} /> On track (RM {remaining.toFixed(2)} remaining)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
