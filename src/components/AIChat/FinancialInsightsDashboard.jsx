import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Lightbulb,
  PieChart,
  ShieldCheck,
  RefreshCw,
  Sliders,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { auth } from '../../firebase';
import {
  fetchFinancialInsights,
  fetchBudgetRecommendation,
  fetchSavingsPlan
} from '../../services/aiService';

export default function FinancialInsightsDashboard() {
  const { user } = useAuth();
  const financeData = useFinance();

  // Current year-month default (e.g., "2026-10")
  const currentYearMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [insightsData, setInsightsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive Budget Recommendation State
  const [customAllowance, setCustomAllowance] = useState(850);
  const [budgetRec, setBudgetRec] = useState(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  // Interactive Savings Planner State
  const [savingsTarget, setSavingsTarget] = useState(1000);
  const [savingsMonths, setSavingsMonths] = useState(4);
  const [savingsPlanResult, setSavingsPlanResult] = useState(null);
  const [isSavingsLoading, setIsSavingsLoading] = useState(false);

  // Available months extracted from transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set([currentYearMonth]);
    (financeData?.transactions || []).forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [financeData?.transactions, currentYearMonth]);

  // Load Insights for Selected Month
  const loadInsights = async (monthToLoad = selectedMonth) => {
    setIsLoading(true);
    setError(null);
    try {
      const getIdTokenFn = auth?.currentUser ? () => auth.currentUser.getIdToken(false) : null;
      const data = await fetchFinancialInsights({
        month: monthToLoad,
        userData: {
          user,
          accounts: financeData?.accounts || [],
          transactions: financeData?.transactions || [],
          budgets: financeData?.budgets || [],
          savingsGoals: financeData?.savingsGoals || [],
          categories: financeData?.categories || []
        },
        getIdToken: getIdTokenFn
      });
      setInsightsData(data);
    } catch (err) {
      console.error('[Financial Insights Load Error]', err);
      setError(err.message || 'Unable to compute financial intelligence insights.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights(selectedMonth);
  }, [selectedMonth, financeData?.transactions, financeData?.budgets]);

  // Handle Budget Recommendation Calculation
  const handleCalculateBudget = async () => {
    setIsRecLoading(true);
    try {
      const getIdTokenFn = auth?.currentUser ? () => auth.currentUser.getIdToken(false) : null;
      const res = await fetchBudgetRecommendation({
        monthlyIncome: customAllowance,
        userData: {
          user,
          accounts: financeData?.accounts || [],
          transactions: financeData?.transactions || [],
          budgets: financeData?.budgets || [],
          savingsGoals: financeData?.savingsGoals || [],
          categories: financeData?.categories || []
        },
        getIdToken: getIdTokenFn
      });
      if (res.recommendation) {
        setBudgetRec(res.recommendation);
      }
    } catch (err) {
      console.error('[Budget Rec Error]', err);
    } finally {
      setIsRecLoading(false);
    }
  };

  // Handle Savings Feasibility Calculation
  const handleCalculateSavingsPlan = async () => {
    setIsSavingsLoading(true);
    try {
      const getIdTokenFn = auth?.currentUser ? () => auth.currentUser.getIdToken(false) : null;
      const currentSurplus = insightsData?.cashFlow?.netCashFlow ?? 150;
      const res = await fetchSavingsPlan({
        targetAmount: savingsTarget,
        targetMonths: savingsMonths,
        monthlySurplus: currentSurplus,
        currentSavings: 0,
        userData: { user },
        getIdToken: getIdTokenFn
      });
      if (res.plan) {
        setSavingsPlanResult(res.plan);
      }
    } catch (err) {
      console.error('[Savings Plan Error]', err);
    } finally {
      setIsSavingsLoading(false);
    }
  };

  const cashFlow = insightsData?.cashFlow || {};
  const comparison = insightsData?.monthComparison || {};
  const trends = insightsData?.trends || {};

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.25rem',
        overflowY: 'auto',
        height: '100%',
        color: 'var(--text-main)'
      }}
    >
      {/* Month Selector & Controls Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              padding: '0.45rem',
              borderRadius: '10px',
              background: 'var(--primary)',
              color: '#FFFFFF',
              display: 'flex'
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Financial Intelligence Analysis</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Deterministic arithmetic grounded in verified Firestore records
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-card-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {m} {m === currentYearMonth ? '(Current)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadInsights(selectedMonth)}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: '8px'
            }}
            title="Refresh Analysis"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--expense, #EF4444)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Core Financial Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Metric 1: Daily Average Spending */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.15rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Daily Average Spend
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)' }}>
            RM {(cashFlow.dailyAverageSpending || 0).toFixed(2)}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}> / day</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-light)' }}>
            Based on {cashFlow.daysElapsed || 1} days elapsed in {selectedMonth}
          </div>
        </div>

        {/* Metric 2: Net Monthly Cash Flow */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.15rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Net Monthly Cash Flow
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: (cashFlow.netCashFlow || 0) >= 0 ? 'var(--income, #10B981)' : 'var(--expense, #EF4444)'
            }}
          >
            {(cashFlow.netCashFlow || 0) >= 0 ? '+' : ''}RM {(cashFlow.netCashFlow || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-light)' }}>
            Income: RM {(cashFlow.totalIncome || 0).toFixed(2)} • Exp: RM {(cashFlow.totalExpense || 0).toFixed(2)} (Savings: {(cashFlow.savingsRate || 0).toFixed(1)}%)
          </div>
        </div>

        {/* Metric 3: Highest Spending Category */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.15rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Highest Category
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {cashFlow.highestExpenseCategory?.name || 'None'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-light)' }}>
            RM {(cashFlow.highestExpenseCategory?.total || 0).toFixed(2)} ({((cashFlow.highestExpenseCategory?.percentage) || 0).toFixed(1)}% of expenses)
          </div>
        </div>

        {/* Metric 4: Like-for-Like Month Comparison */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.15rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Month-over-Month Comparison
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {comparison.status === 'higher' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--expense, #EF4444)', fontWeight: 800, fontSize: '1.15rem' }}>
                <ArrowUpRight size={20} />
                +{Math.abs(comparison.spendingChangePct || 0).toFixed(1)}%
              </span>
            ) : comparison.status === 'lower' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--income, #10B981)', fontWeight: 800, fontSize: '1.15rem' }}>
                <ArrowDownRight size={20} />
                -{Math.abs(comparison.spendingChangePct || 0).toFixed(1)}%
              </span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                {comparison.status === 'first_month' ? 'First tracked month' : 'Stable (0%)'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-light)' }}>
            {comparison.status !== 'first_month'
              ? `vs same Day 1–${comparison.daysCompared} period in ${comparison.prevMonth}`
              : 'Add transactions from prior months to view trends'}
          </div>
        </div>
      </div>

      {/* 4-Week Expense Distribution */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
            Weekly Spending Distribution ({selectedMonth})
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Total Month Expense: RM {(cashFlow.totalExpense || 0).toFixed(2)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
          {(cashFlow.weeklyDistribution || []).map(w => {
            const pctOfTotal = cashFlow.totalExpense > 0
              ? Math.min(100, Math.round((w.totalExpense / cashFlow.totalExpense) * 100))
              : 0;

            return (
              <div
                key={w.weekNumber}
                style={{
                  background: 'var(--bg-card-subtle)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ fontWeight: 700 }}>{w.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{w.dateRange}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  RM {w.totalExpense.toFixed(2)}
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    background: 'var(--border-light)',
                    overflow: 'hidden',
                    marginTop: '0.2rem'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pctOfTotal}%`,
                      background: 'var(--primary)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {pctOfTotal}% of monthly spend
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown & Spending Trends Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Category Breakdown List */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PieChart size={16} /> Category Expense Breakdown
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {(cashFlow.categoryExpenses || []).length} categories
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {(cashFlow.categoryExpenses || []).length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No expense transactions recorded for this month.
              </div>
            ) : (
              (cashFlow.categoryExpenses || []).map(cat => (
                <div key={cat.categoryId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600 }}>{cat.categoryName}</span>
                    <span style={{ fontWeight: 700 }}>
                      RM {cat.total.toFixed(2)}{' '}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: '7px',
                      borderRadius: '4px',
                      background: 'var(--border-light)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, cat.percentage)}%`,
                        background: 'var(--primary)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detected Trends & Risk Alerts */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={16} /> AI Detected Spending Trends & Alerts
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--income, #10B981)', fontWeight: 600 }}>Active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Rising Categories */}
            {(trends.risingCategories || []).map(rc => (
              <div
                key={rc.name}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <TrendingUp size={16} color="var(--expense, #EF4444)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--expense, #EF4444)' }}>Rising Expense: </span>
                  {rc.name} increased by {rc.percentageChange.toFixed(0)}% (RM {rc.currentSpent.toFixed(2)} vs RM {rc.previousSpent.toFixed(2)} prior month).
                </div>
              </div>
            ))}

            {/* Falling Categories */}
            {(trends.fallingCategories || []).map(fc => (
              <div
                key={fc.name}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <TrendingDown size={16} color="var(--income, #10B981)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--income, #10B981)' }}>Disciplined Spending: </span>
                  {fc.name} decreased by {Math.abs(fc.percentageChange).toFixed(0)}% compared to prior month.
                </div>
              </div>
            ))}

            {/* Budget Risks */}
            {(trends.budgetRisks || []).map(br => (
              <div
                key={br.categoryName}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: br.status === 'exceeded' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${br.status === 'exceeded' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <AlertTriangle size={16} color={br.status === 'exceeded' ? 'var(--expense, #EF4444)' : '#F59E0B'} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 700 }}>
                    Budget Warning ({br.categoryName}):{' '}
                  </span>
                  Utilized {br.percentage.toFixed(0)}% of limit (Spent RM {br.spent.toFixed(2)} of RM {br.limit.toFixed(2)}).
                </div>
              </div>
            ))}

            {/* Unusual Spikes / Anomalies */}
            {(trends.anomalies || []).map((an, i) => (
              <div
                key={i}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 700 }}>Unusual Spike: </span>
                  RM {an.amount.toFixed(2)} on &ldquo;{an.title}&rdquo; ({an.reason}).
                </div>
              </div>
            ))}

            {/* Actionable Savings Opportunities */}
            {(trends.savingsOpportunities || []).map((so, i) => (
              <div
                key={i}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(98, 72, 115, 0.1)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <Lightbulb size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    Save ~RM {so.potentialMonthlySavings.toFixed(2)}/mo in {so.categoryName}:{' '}
                  </span>
                  {so.tip}
                </div>
              </div>
            ))}

            {(!trends.risingCategories?.length && !trends.fallingCategories?.length && !trends.budgetRisks?.length && !trends.anomalies?.length) && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                No unusual spending spikes or budget risks detected. Keep tracking daily to surface deeper patterns!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive AI Budget Recommendation & Savings Planner Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Interactive Budget Recommendation Calculator */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={16} /> Student Budget Planner (50/30/20 Rule)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Interactive</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
            Enter your monthly allowance/income to simulate practical campus allocations:
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>RM</span>
            <input
              type="number"
              value={customAllowance}
              onChange={(e) => setCustomAllowance(Number(e.target.value))}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
              min={100}
              step={50}
            />
            <button
              onClick={handleCalculateBudget}
              disabled={isRecLoading}
              className="btn btn-primary"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                borderRadius: '8px'
              }}
            >
              {isRecLoading ? 'Calculating...' : 'Simulate'}
            </button>
          </div>

          {budgetRec && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                marginTop: '0.5rem',
                padding: '0.85rem',
                borderRadius: '10px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700 }}>Total Allowance:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>RM {budgetRec.monthlyIncome.toFixed(2)}</span>
              </div>

              {/* Needs / Essentials */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>🍗 Essentials & Campus Needs ({budgetRec.needsPercentage}%):</span>
                <span style={{ fontWeight: 700 }}>RM {budgetRec.needsBudget.toFixed(2)}</span>
              </div>

              {/* Wants */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>🎮 Campus Life & Wants ({budgetRec.wantsPercentage}%):</span>
                <span style={{ fontWeight: 700 }}>RM {budgetRec.wantsBudget.toFixed(2)}</span>
              </div>

              {/* Savings */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>💰 Emergency / Goal Savings ({budgetRec.savingsPercentage}%):</span>
                <span style={{ fontWeight: 700, color: 'var(--income, #10B981)' }}>RM {budgetRec.savingsBudget.toFixed(2)}</span>
              </div>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginTop: '0.3rem'
                }}
              >
                <Info size={13} style={{ flexShrink: 0 }} />
                Read-only advisory. You can set active category budgets under the Budgets tab anytime.
              </div>
            </div>
          )}
        </div>

        {/* Interactive Savings Feasibility Planner */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PiggyBank size={16} /> Savings Feasibility Calculator
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Interactive</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
            Evaluate if a financial goal is realistically achievable on your current budget:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target Amount (RM)</label>
              <input
                type="number"
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
                min={50}
                step={50}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Timeframe (Months)</label>
              <input
                type="number"
                value={savingsMonths}
                onChange={(e) => setSavingsMonths(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
                min={1}
                max={60}
              />
            </div>
          </div>

          <button
            onClick={handleCalculateSavingsPlan}
            disabled={isSavingsLoading}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              borderRadius: '8px'
            }}
          >
            {isSavingsLoading ? 'Evaluating Feasibility...' : 'Evaluate Feasibility'}
          </button>

          {savingsPlanResult && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
                marginTop: '0.3rem',
                padding: '0.85rem',
                borderRadius: '10px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Feasibility:</span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    background:
                      savingsPlanResult.feasibilityTier === 'High'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : savingsPlanResult.feasibilityTier === 'Moderate'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color:
                      savingsPlanResult.feasibilityTier === 'High'
                        ? 'var(--income, #10B981)'
                        : savingsPlanResult.feasibilityTier === 'Moderate'
                        ? '#F59E0B'
                        : 'var(--expense, #EF4444)'
                  }}
                >
                  {savingsPlanResult.feasibilityTier} Feasibility
                </span>
              </div>

              <div style={{ fontSize: '0.78rem' }}>
                Required: <strong>RM {savingsPlanResult.requiredMonthlySavings.toFixed(2)}/mo</strong> (~RM {savingsPlanResult.requiredWeeklySavings.toFixed(2)}/week)
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: 1.4 }}>
                {savingsPlanResult.recommendation}
              </div>

              {savingsPlanResult.suggestedAlternative && (
                <div
                  style={{
                    fontSize: '0.73rem',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(98, 72, 115, 0.08)'
                  }}
                >
                  💡 Alternative: Extend to {savingsPlanResult.suggestedAlternative.targetMonths} months (RM {savingsPlanResult.suggestedAlternative.requiredMonthlySavings.toFixed(2)}/mo) to match your current surplus.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
