import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { auth } from '../../firebase';
import { fetchFinancialInsights } from '../../services/aiService';
import { generateMonthlyIntelligencePDF } from '../../utils/pdfExport';

export default function MonthlyReportView() {
  const { user } = useAuth();
  const financeData = useFinance();

  const currentYearMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Extract all historical months from transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set([currentYearMonth]);
    (financeData?.transactions || []).forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [financeData?.transactions, currentYearMonth]);

  const loadReport = async (monthToLoad = selectedMonth) => {
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
      setReportData(data);
    } catch (err) {
      console.error('[Monthly Report Load Error]', err);
      setError(err.message || 'Failed to load monthly financial report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(selectedMonth);
  }, [selectedMonth, financeData?.transactions, financeData?.budgets]);

  const handleExportPDF = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      generateMonthlyIntelligencePDF({
        reportData,
        user
      });
    } catch (err) {
      console.error('[PDF Export Error]', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const cashFlow = reportData?.cashFlow || {};
  const comparison = reportData?.monthComparison || {};
  const trends = reportData?.trends || {};
  const budgets = Array.isArray(reportData?.budgets) ? reportData.budgets : [];

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
      {/* Header Controls Bar */}
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
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Monthly Financial Intelligence Report</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Historical review & downloadable statement for campus records
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Month Dropdown */}
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

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isLoading || isExporting || !reportData}
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
            <Download size={14} />
            <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Statement Meta Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
              Statement Period
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
              {selectedMonth}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Account Holder
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {user?.username || 'Authenticated Student'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-light)' }}>
              {user?.email || 'student@campus.edu.my'} • {user?.university || 'Campus Student'}
            </div>
          </div>
        </div>

        {/* 4 Summary Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.25rem'
          }}
        >
          <div style={{ padding: '0.65rem', background: 'var(--bg-card-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL INCOME</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--income, #10B981)' }}>
              RM {(cashFlow.totalIncome || 0).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '0.65rem', background: 'var(--bg-card-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL EXPENSES</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--expense, #EF4444)' }}>
              RM {(cashFlow.totalExpense || 0).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '0.65rem', background: 'var(--bg-card-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NET CASH FLOW</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: (cashFlow.netCashFlow || 0) >= 0 ? 'var(--income, #10B981)' : 'var(--expense, #EF4444)' }}>
              {(cashFlow.netCashFlow || 0) >= 0 ? '+' : ''}RM {(cashFlow.netCashFlow || 0).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '0.65rem', background: 'var(--bg-card-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SAVINGS RATE</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {(cashFlow.savingsRate || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Category Expense Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
          Category Spending Statement
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.6rem 0.5rem', width: '35%' }}>Category</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Amount (RM)</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Share (%)</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {(cashFlow.categoryExpenses || []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No expenses recorded in this period.
                  </td>
                </tr>
              ) : (
                (cashFlow.categoryExpenses || []).map((cat, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{cat.categoryName}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>
                      RM {cat.total.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                      {cat.percentage.toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {cat.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Performance Statement (if budgets exist) */}
      {budgets.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light)'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            Budget Adherence Summary
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Budget / Category</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Limit</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Actual Spent</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Remaining</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b, i) => {
                  const catSpent = (cashFlow.categoryExpenses || []).find(c => c.categoryId === b.categoryId)?.total || 0;
                  const limit = Number(b.limit || b.amount || 0);
                  const remaining = limit - catSpent;
                  const pct = limit > 0 ? (catSpent / limit) * 100 : 0;
                  const isOver = pct > 100;

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{b.categoryName || b.category}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>RM {limit.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, color: isOver ? 'var(--expense, #EF4444)' : 'inherit' }}>
                        RM {catSpent.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: remaining < 0 ? 'var(--expense, #EF4444)' : 'inherit' }}>
                        RM {remaining.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isOver ? 'rgba(239, 68, 68, 0.15)' : pct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isOver ? 'var(--expense, #EF4444)' : pct >= 80 ? '#F59E0B' : 'var(--income, #10B981)'
                          }}
                        >
                          {pct.toFixed(0)}% {isOver ? 'Exceeded' : pct >= 80 ? 'Warning' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Intelligence Findings */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
          AI Executive Summary & Spending Insights
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
          <div>
            • <strong>Monthly Net Balance:</strong> {(cashFlow.netCashFlow || 0) >= 0 ? 'You operated with a surplus' : 'You operated with a deficit'} of RM {Math.abs(cashFlow.netCashFlow || 0).toFixed(2)}, achieving a {cashFlow.savingsRate || 0}% savings rate.
          </div>
          {comparison.status && comparison.status !== 'first_month' && (
            <div>
              • <strong>Historical Comparison:</strong> Spending for the elapsed period was {comparison.status === 'higher' ? 'higher' : 'lower'} by {Math.abs(comparison.spendingChangePct || 0).toFixed(1)}% compared to the same calendar window in {comparison.prevMonth}.
            </div>
          )}
          {cashFlow.highestExpenseCategory?.total > 0 && (
            <div>
              • <strong>Primary Expense Driver:</strong> {cashFlow.highestExpenseCategory.name} commanded {cashFlow.highestExpenseCategory.percentage.toFixed(1)}% of your monthly outflows (RM {cashFlow.highestExpenseCategory.total.toFixed(2)}).
            </div>
          )}
          {(trends.savingsOpportunities || []).map((so, idx) => (
            <div key={idx}>
              • <strong>Opportunity:</strong> In {so.categoryName}, {so.tip.toLowerCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
