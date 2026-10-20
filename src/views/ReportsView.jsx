import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import PieChart from '../components/PieChart';
import { getMonthlyAggregates, getSpendingByAccount } from '../services/transactionService';
import { ReportsSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Calendar
} from 'lucide-react';

function BarChartSimple({ data, maxValue }) {
  if (!data || data.length === 0) return null;
  const safeMax = maxValue || Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '180px', paddingTop: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: '0.35rem' }}>
      {data.map((month) => {
        const incH = (month.income / safeMax) * 150;
        const expH = (month.expense / safeMax) * 150;
        return (
          <div key={month.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '155px' }}>
              <div
                style={{
                  width: '14px',
                  height: `${Math.max(2, incH)}px`,
                  background: 'var(--income)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s ease'
                }}
                title={`Income: RM ${month.income.toFixed(2)}`}
              />
              <div
                style={{
                  width: '14px',
                  height: `${Math.max(2, expH)}px`,
                  background: 'var(--expense)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s ease'
                }}
                title={`Expense: RM ${month.expense.toFixed(2)}`}
              />
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {month.label.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsView() {
  const {
    isLoading,
    transactions,
    accounts,
    totalIncome,
    totalExpense,
    totalSavedInGoals,
    categorySpendingBreakdown,
    savingsGoals
  } = useFinance();

  const [monthsBack, setMonthsBack] = useState(6);

  const monthlyData = useMemo(() => getMonthlyAggregates(transactions, monthsBack), [transactions, monthsBack]);
  const accountSpending = useMemo(() => getSpendingByAccount(transactions, accounts), [transactions, accounts]);
  const netCashFlow = totalIncome - totalExpense;
  const maxBarValue = useMemo(() => {
    if (monthlyData.length === 0) return 1;
    return Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1);
  }, [monthlyData]);

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  const hasData = transactions.length > 0;

  if (!hasData) {
    return (
      <div className="view-fade-in">
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700 }}>
            Reports & Analytics
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Visualize your financial patterns and insights.
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No Financial Activity Yet"
          description="Add your first transaction to start seeing your spending insights, category breakdowns, and monthly trends."
        />
      </div>
    );
  }

  return (
    <div className="view-fade-in">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Reports & Analytics
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Your complete financial overview with insights and breakdowns.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid-metrics" style={{ marginBottom: '1.75rem' }}>
        <div className="card metric-card">
          <div className="metric-icon-box income">
            <TrendingUp size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Income</div>
            <div className="metric-value" style={{ color: 'var(--income)' }}>
              RM {totalIncome.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon-box expense">
            <TrendingDown size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Expenses</div>
            <div className="metric-value" style={{ color: 'var(--expense)' }}>
              RM {totalExpense.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon-box balance">
            <Wallet size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Net Cash Flow</div>
            <div className="metric-value" style={{ color: netCashFlow >= 0 ? 'var(--income)' : 'var(--expense)' }}>
              {netCashFlow >= 0 ? '+' : ''}RM {netCashFlow.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon-box savings">
            <PiggyBank size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Savings Progress</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>
              RM {totalSavedInGoals.toFixed(2)}
            </div>
            <div className="metric-sub">
              {savingsGoals.length} goal{savingsGoals.length !== 1 ? 's' : ''} active
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-dashboard-main" style={{ marginBottom: '1.75rem' }}>
        {/* Spending by Category */}
        <div className="card">
          <div className="card-title">
            <span>Spending by Category</span>
          </div>
          <PieChart data={categorySpendingBreakdown} />
        </div>

        {/* Monthly Income vs Expenses */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--primary)" /> Monthly Trend
            </span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              value={monthsBack}
              onChange={e => setMonthsBack(Number(e.target.value))}
              aria-label="Months to show"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>

          <BarChartSimple data={monthlyData} maxValue={maxBarValue} />

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--income)' }} />
              Income
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--expense)' }} />
              Expense
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-dashboard-bottom">
        {/* Spending by Account */}
        <div className="card">
          <div className="card-title">
            <span>Spending by Account</span>
          </div>
          {Object.keys(accountSpending).length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No expense transactions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {Object.entries(accountSpending).map(([key, data]) => {
                const total = Object.values(accountSpending).reduce((s, d) => s + d.amount, 0);
                const pct = total > 0 ? ((data.amount / total) * 100).toFixed(1) : 0;
                return (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{data.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>RM {data.amount.toFixed(2)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Summary Table */}
        <div className="card">
          <div className="card-title">
            <span>Monthly Summary</span>
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Income</th>
                  <th style={{ textAlign: 'right' }}>Expense</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => {
                  const net = m.income - m.expense;
                  return (
                    <tr key={m.key}>
                      <td style={{ fontSize: '0.85rem' }}>{m.label}</td>
                      <td style={{ textAlign: 'right', color: 'var(--income)', fontWeight: 600 }}>
                        RM {m.income.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--expense)', fontWeight: 600 }}>
                        RM {m.expense.toFixed(2)}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: net >= 0 ? 'var(--income)' : 'var(--expense)'
                      }}>
                        {net >= 0 ? '+' : ''}RM {net.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
