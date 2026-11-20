import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ACCOUNT_TYPE_ICONS } from '../services/accountService';
import { formatRM } from '../utils/formatCurrency';
import {
  PlusCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Sparkles,
  ReceiptText,
  ChevronRight
} from 'lucide-react';

export default function DashboardView({
  onOpenAddTransaction,
  onOpenAddBudget,
  onOpenAddAccount,
  onOpenAIChat,
  onNavigateTab
}) {
  const {
    totalBalance,
    totalExpense,
    totalAccountBalance,
    transactions,
    categories,
    budgets,
    accounts,
    isDemoMode
  } = useFinance();

  const recentTransactions = transactions.slice(0, 5);
  const displayBalance = accounts.length > 0 ? totalAccountBalance : totalBalance;

  // Spent this month (falls back to totalExpense if demo dates are from another month)
  const spentThisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthExpenses = transactions
      .filter((t) => t.type === 'expense' && String(t.date || '').startsWith(ym))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return thisMonthExpenses > 0 ? thisMonthExpenses : totalExpense;
  }, [transactions, totalExpense]);

  // Budget Health calculation (real % + visually capped bar at 100%)
  const totalBudgetedLimit = budgets.reduce((sum, b) => sum + Number(b.monthlyLimit || 0), 0);
  const totalBudgetedSpent = budgets.reduce((sum, b) => {
    const catSpent = transactions
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return sum + catSpent;
  }, 0);

  const realBudgetHealthPct = totalBudgetedLimit > 0
    ? Math.round((totalBudgetedSpent / totalBudgetedLimit) * 100)
    : 0;
  const isBudgetOver = totalBudgetedLimit > 0 && totalBudgetedSpent > totalBudgetedLimit;
  const isBudgetNear = !isBudgetOver && realBudgetHealthPct >= 80;

  return (
    <div className="view-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Fresh Real Account Welcome CTA */}
      {transactions.length === 0 && !isDemoMode && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '1.35rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Welcome to KampusKash
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Add your first expense or link an account to start tracking.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={onOpenAddTransaction} className="btn btn-primary" style={{ minHeight: '44px' }}>
              <PlusCircle size={16} /> Add Transaction
            </button>
            <button onClick={onOpenAddAccount} className="btn btn-secondary" style={{ minHeight: '44px' }}>
              <Landmark size={16} /> Add Account
            </button>
          </div>
        </div>
      )}

      {/* Priority Top Card: Total Balance + Spent This Month + Budget Health Bar */}
      <div className="card" data-tour="dashboard-metrics" style={{ padding: '1.15rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.9rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              Total Balance
            </div>
            <div
              style={{
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 'clamp(1.65rem, 6vw, 2.15rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: displayBalance < 0 ? 'var(--expense)' : 'var(--text-main)',
                lineHeight: 1.15
              }}
            >
              {formatRM(displayBalance)}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAIChat}
            className="btn btn-secondary btn-sm"
            style={{
              minHeight: '40px',
              padding: '0 0.8rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexShrink: 0
            }}
            aria-label="Ask AI Assistant"
          >
            <Sparkles size={14} color="var(--primary)" />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Spent This Month Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'var(--bg-card-subtle)',
            marginBottom: '0.9rem'
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Spent this month
          </span>
          <strong style={{ fontSize: '0.96rem', color: 'var(--expense)', fontWeight: 800 }}>
            {formatRM(spentThisMonth)}
          </strong>
        </div>

        {/* Single Budget Health Bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Budget health</span>
            {budgets.length > 0 ? (
              <span
                style={{
                  fontWeight: 700,
                  color: isBudgetOver ? 'var(--expense)' : isBudgetNear ? 'var(--warning)' : 'var(--income)'
                }}
              >
                {realBudgetHealthPct}% used
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenAddBudget}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Set budget
              </button>
            )}
          </div>

          <div className="progress-bar-bg" style={{ height: '8px' }}>
            <div
              className={`progress-bar-fill ${isBudgetOver ? 'progress-danger' : isBudgetNear ? 'progress-warning' : 'progress-safe'}`}
              style={{ width: `${Math.min(100, realBudgetHealthPct)}%`, transition: 'width 0.35s ease' }}
            />
          </div>

          {isBudgetOver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem', color: 'var(--expense)', fontSize: '0.78rem', fontWeight: 600 }}>
              <AlertTriangle size={13} /> Over budget by {formatRM(totalBudgetedSpent - totalBudgetedLimit)}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions (Max 5) + See All Link */}
      <div className="card" data-tour="recent-transactions" style={{ padding: '1rem 1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Recent transactions
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('transactions')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.35rem 0.25rem',
                  minHeight: '44px',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>See all</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem' }}>
            <ReceiptText size={24} color="var(--text-muted)" />
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>No transactions yet</div>
            <button onClick={onOpenAddTransaction} className="btn btn-primary btn-sm" style={{ minHeight: '44px' }}>
              <PlusCircle size={15} /> Add Transaction
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {recentTransactions.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              const isIncome = t.type === 'income';
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    padding: '0.65rem 0.75rem',
                    minHeight: '52px',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: 'var(--radius-md, 10px)'
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: isIncome ? 'var(--income-bg)' : 'var(--expense-bg)',
                      color: isIncome ? 'var(--income)' : 'var(--expense)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {t.date} · {cat ? cat.name : 'Other'}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: isIncome ? 'var(--income)' : 'var(--expense)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {isIncome ? '+' : '-'}{formatRM(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Accounts Strip (no Sample badges) */}
      {accounts.length > 0 && (
        <div className="card" data-tour="accounts" style={{ padding: '1rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Accounts
            </h3>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.25rem',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>Spending breakdown</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
          <div className="accounts-cards-grid">
            {accounts.map((acc) => {
              const icon = ACCOUNT_TYPE_ICONS[acc.accountType] || '📋';
              return (
                <div key={acc.accountId} className="account-card-item">
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acc.accountName}
                    </div>
                    <div
                      style={{
                        fontFamily: 'Plus Jakarta Sans',
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: acc.balance >= 0 ? 'var(--text-main)' : 'var(--expense)'
                      }}
                    >
                      {formatRM(acc.balance)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
