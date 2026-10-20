import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { ACCOUNT_TYPE_ICONS } from '../services/accountService';
import PieChart from '../components/PieChart';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PlusCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Landmark,
  Sparkles,
  ReceiptText
} from 'lucide-react';

export default function DashboardView({
  onOpenAddTransaction,
  onOpenAddBudget,
  onOpenAddSavings,
  onOpenAddAccount,
  onOpenAIChat
}) {
  const [isInitialEntrance] = useState(() => {
    try {
      const entered = sessionStorage.getItem('kampuskash_dashboard_entered');
      if (!entered) {
        sessionStorage.setItem('kampuskash_dashboard_entered', 'true');
        return true;
      }
    } catch {}
    return false;
  });
  const {
    totalBalance,
    totalIncome,
    totalExpense,
    totalSavedInGoals,
    totalAccountBalance,
    categorySpendingBreakdown,
    transactions,
    categories,
    budgets,
    savingsGoals,
    accounts,
    isDemoMode
  } = useFinance();
  const { user } = useAuth();

  const recentTransactions = transactions.slice(0, 5);

  // Budget Health calculation
  const totalBudgetedLimit = budgets.reduce((sum, b) => sum + Number(b.monthlyLimit), 0);
  const totalBudgetedSpent = budgets.reduce((sum, b) => {
    const catSpent = transactions
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return sum + catSpent;
  }, 0);

  const overallBudgetHealthPct = totalBudgetedLimit > 0
    ? Math.min(100, (totalBudgetedSpent / totalBudgetedLimit) * 100).toFixed(1)
    : 0;

  // Use account balance if accounts exist, otherwise fall back to transaction-derived balance
  const displayBalance = accounts.length > 0 ? totalAccountBalance : totalBalance;

  return (
    <div className="view-fade-in">
      {/* Student Financial Motto (if set) */}
      {user?.bio && (
        <div data-tour="motto-banner" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1rem',
          background: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <Sparkles size={16} color="var(--primary)" />
          <span>Motto: <strong style={{ color: 'var(--text-main)' }}>"{user.bio}"</strong></span>
        </div>
      )}

      {/* KampusKash AI Assistant Quick Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        padding: '0.9rem 1.25rem',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent) 0%, var(--bg-card-subtle) 100%)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg, 12px)',
        marginBottom: '1.25rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: '1 1 200px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            flexShrink: 0
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>KampusKash AI Assistant</span>
              <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--income, #10B981)', fontWeight: 700 }}>
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Ask me to analyse your spending, check your budget limits, or plan savings in RM.
            </div>
          </div>
        </div>
        <button
          onClick={onOpenAIChat}
          className="btn btn-primary"
          style={{
            padding: '0.45rem 0.95rem',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            borderRadius: '8px'
          }}
        >
          <Sparkles size={14} /> Ask AI Assistant
        </button>
      </div>

      {/* Helpful Empty State Call to Action when starting fresh with 0 real transactions */}
      {transactions.length === 0 && !isDemoMode && (
        <div style={{
          padding: '1.75rem 1.5rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(30, 20, 45, 0.7) 100%)',
          border: '1px solid rgba(192, 132, 252, 0.35)',
          borderRadius: 'var(--radius-lg, 12px)',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
        }}>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Welcome to your real account! 🎓
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 1.25rem' }}>
            Your tutorial is complete and your finances start fresh. Add your first everyday expense, allowance, or linked campus e-wallet to get started!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onOpenAddTransaction} className="btn btn-primary">
              <PlusCircle size={16} /> + Add Your First Transaction
            </button>
            <button onClick={onOpenAddAccount} className="btn btn-secondary">
              <Landmark size={16} /> + Link Account / eWallet
            </button>
          </div>
        </div>
      )}

      {/* 4 Hero Metric Summary Cards */}
      <div className="grid-metrics" data-tour="dashboard-metrics">
        <div className={`card metric-card ${isInitialEntrance ? 'dashboard-stagger-1' : ''}`}>
          <div className="metric-icon-box balance">
            <Wallet size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Balance</div>
            <div className="metric-value" style={{ color: displayBalance < 0 ? 'var(--expense)' : 'var(--text-main)' }}>
              RM {displayBalance.toFixed(2)}
            </div>
            <div className="metric-sub">
              <span>{accounts.length > 0 ? `Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}` : 'Current Available Cash'}</span>
            </div>
          </div>
        </div>

        <div className={`card metric-card ${isInitialEntrance ? 'dashboard-stagger-2' : ''}`}>
          <div className="metric-icon-box income">
            <TrendingUp size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Income</div>
            <div className="metric-value" style={{ color: 'var(--income)' }}>
              RM {totalIncome.toFixed(2)}
            </div>
            <div className="metric-sub" style={{ color: 'var(--income)' }}>
              <ArrowUpRight size={14} /> Allowance & Loans
            </div>
          </div>
        </div>

        <div className={`card metric-card ${isInitialEntrance ? 'dashboard-stagger-3' : ''}`}>
          <div className="metric-icon-box expense">
            <TrendingDown size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Expenses</div>
            <div className="metric-value" style={{ color: 'var(--expense)' }}>
              RM {totalExpense.toFixed(2)}
            </div>
            <div className="metric-sub" style={{ color: 'var(--expense)' }}>
              <ArrowDownRight size={14} /> Tuition, Food & Rent
            </div>
          </div>
        </div>

        <div className={`card metric-card ${isInitialEntrance ? 'dashboard-stagger-4' : ''}`}>
          <div className="metric-icon-box savings">
            <PiggyBank size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Saved in Goals</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>
              RM {totalSavedInGoals.toFixed(2)}
            </div>
            <div className="metric-sub">
              <span>{savingsGoals.length} Active Student Goals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Breakdown (if accounts exist) */}
      {accounts.length > 0 && (
        <div className="card" style={{ marginBottom: '1.75rem' }} data-tour="accounts">
          <div className="accounts-section-header">
            <div className="accounts-section-title">
              <Landmark size={20} color="var(--primary)" />
              <span>My Accounts</span>
            </div>
            <button
              onClick={onOpenAddAccount}
              className="btn btn-secondary btn-sm accounts-add-btn"
              aria-label="Add Account"
            >
              + Add Account
            </button>
          </div>
          <div className="accounts-cards-grid">
            {accounts.map(acc => {
              const icon = ACCOUNT_TYPE_ICONS[acc.accountType] || '📋';
              return (
                <div key={acc.accountId} className="account-card-item">
                  <span style={{ fontSize: '1.35rem', flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {acc.accountName}
                      </span>
                      {acc.isDemo && (
                        <span style={{
                          fontSize: '0.62rem',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#FBBF24',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          Sample
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '1.12rem',
                      fontWeight: 800,
                      color: acc.balance >= 0 ? 'var(--text-main)' : 'var(--expense)'
                    }}>
                      RM {Number(acc.balance).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Dashboard Section: Category Pie Chart + Recent Activity */}
      <div className="grid-dashboard-main">
        {/* Direct Category Spending Pie Chart */}
        <div className={`card ${isInitialEntrance ? 'dashboard-stagger-chart' : ''}`} data-tour="category-chart">
          <div className="card-title">
            <span>Category Spending Breakdown</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Real-time</span>
          </div>
          <PieChart data={categorySpendingBreakdown} />
        </div>

        {/* Recent Activity Table */}
        <div className={`card ${isInitialEntrance ? 'dashboard-stagger-chart' : ''}`} data-tour="recent-transactions">
          <div className="card-title">
            <span>Recent Transactions</span>
            <button
              onClick={onOpenAddTransaction}
              className="btn btn-secondary btn-sm"
              aria-label="Add transaction"
            >
              <PlusCircle size={15} /> <span>+ Add</span>
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'color-mix(in srgb, var(--primary) 18%, transparent)',
                color: 'var(--primary-light, #E8DEF5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.2rem'
              }}>
                <ReceiptText size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                No Transactions Logged Yet
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.5 }}>
                Start tracking your daily campus living expenses or part-time earnings.
              </div>
              <button
                onClick={onOpenAddTransaction}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '0.4rem' }}
              >
                <PlusCircle size={14} /> + Add First Transaction
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentTransactions.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 1rem',
                    minHeight: '48px',
                    boxSizing: 'border-box',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background var(--transition-fast)',
                    gap: '0.75rem'
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {t.title}
                        </span>
                        {t.isDemo && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            background: 'rgba(167, 139, 250, 0.2)',
                            color: '#C084FC',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            Sample
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                        {t.date} · {cat ? cat.name : 'Uncategorized'}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: isIncome ? 'var(--income)' : 'var(--expense)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      textAlign: 'right'
                    }}>
                      {isIncome ? '+' : '-'} RM {Number(t.amount).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Budget Health Summary + Active Savings Progress */}
      <div className="grid-dashboard-bottom">
        {/* Budget Health Meter */}
        <div className={`card ${isInitialEntrance ? 'dashboard-stagger-bottom' : ''}`}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} color="var(--primary)" /> Semester Budget Health
            </span>
            <button onClick={onOpenAddBudget} className="btn btn-secondary btn-sm">
              + Set Budget
            </button>
          </div>

          {budgets.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No category monthly limits configured yet. Click "+ Set Budget" to set category caps!
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Total Spent: <strong>RM {totalBudgetedSpent.toFixed(2)}</strong> of RM {totalBudgetedLimit.toFixed(2)}
                </span>
                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: overallBudgetHealthPct > 90 ? 'var(--expense)' : overallBudgetHealthPct > 70 ? 'var(--warning)' : 'var(--primary)'
                }}>
                  {overallBudgetHealthPct}% Spent
                </span>
              </div>

              <div className="progress-bar-bg">
                <div
                  className={`progress-bar-fill ${overallBudgetHealthPct > 90 ? 'progress-danger' : overallBudgetHealthPct > 70 ? 'progress-warning' : 'progress-safe'}`}
                  style={{ width: `${overallBudgetHealthPct}%` }}
                />
              </div>

              {overallBudgetHealthPct > 90 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.85rem',
                  padding: '0.5rem 0.85rem',
                  background: 'var(--expense-bg)',
                  color: 'var(--expense)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}>
                  <AlertTriangle size={15} /> Budget Warning: You have reached 90%+ of your planned category limits.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Savings Goals Card */}
        <div className={`card ${isInitialEntrance ? 'dashboard-stagger-bottom' : ''}`}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PiggyBank size={18} color="var(--primary)" /> Top Savings Goals
            </span>
            <button onClick={onOpenAddSavings} className="btn btn-secondary btn-sm">
              + New Goal
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No savings goals yet. Create a goal for your new laptop or emergency fund!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {savingsGoals.slice(0, 2).map(goal => {
                const current = Number(goal.currentAmount || 0);
                const target = Number(goal.targetAmount || 1);
                const pct = Math.min(100, (current / target) * 100).toFixed(1);
                return (
                  <div key={goal.id} style={{ background: 'var(--bg-card-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{goal.title}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                        RM {current.toFixed(2)} / RM {target.toFixed(2)} ({pct}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '8px' }}>
                      <div className="progress-bar-fill progress-safe" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
