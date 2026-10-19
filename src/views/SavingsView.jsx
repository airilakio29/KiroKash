import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateSavingsProgress } from '../services/savingsService';
import { PiggyBank, PlusCircle, Trash2, Edit3, Calendar, CheckCircle2 } from 'lucide-react';

export default function SavingsView({ onOpenAddSavings, onOpenDepositSavings, onEditSavings }) {
  const { savingsGoals, deleteSavingsGoal } = useFinance();

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
        <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <PiggyBank size={40} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No Active Savings Goals
          </h4>
          <p style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Start saving for your semester objectives today!
          </p>
          <button onClick={onOpenAddSavings} className="btn btn-primary">
            + Create Your First Goal
          </button>
        </div>
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
                      onClick={() => {
                        if (window.confirm(`Delete savings goal "${goal.title}"?`)) {
                          deleteSavingsGoal(goal.id);
                        }
                      }}
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
                    <div className="progress-bar-fill progress-safe" style={{ width: `${percentage}%` }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} /> Target Date: {goal.targetDate || 'No date set'}
                  </span>
                  <span style={{ fontWeight: 700, color: isCompleted ? 'var(--income)' : 'var(--primary)' }}>
                    {isCompleted ? 'Goal Reached!' : `${percentage}% Achieved`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  {isCompleted ? (
                    <div style={{
                      width: '100%',
                      textAlign: 'center',
                      padding: '0.55rem',
                      background: 'var(--income-bg)',
                      color: 'var(--income)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}>
                      <CheckCircle2 size={16} /> Goal Completed! 🎉
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenDepositSavings(goal.id)}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.55rem' }}
                    >
                      + Deposit Funds (RM)
                    </button>
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
