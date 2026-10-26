import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateMonthlyCashFlow,
  calculateMonthToMonthComparison,
  detectSpendingTrends,
  calculateBudgetRecommendation,
  calculateSavingsPlan
} from '../functions/src/ai/financialAnalysisService.js';

import {
  buildFinancialSummary,
  formatContextForPrompt
} from '../functions/src/ai/financialContextService.js';

import {
  handleFinancialInsightsRequest,
  handleBudgetRecommendationRequest,
  handleSavingsPlanRequest
} from '../functions/src/ai/chatFunction.js';

import { generateMonthlyIntelligencePDF } from '../src/utils/pdfExport.js';
import { PRESET_THEMES } from '../src/utils/themeEngine.js';

describe('KampusKash Phase 2 — AI Financial Intelligence Test Suite', () => {

  // Test Scenario 1: Empty transactions in month
  describe('1. Empty Transactions Edge Case', () => {
    it('should return clean zeros and zero daily average without crashing', () => {
      const res = calculateMonthlyCashFlow([], [], '2026-10');
      assert.equal(res.totalIncome, 0);
      assert.equal(res.totalExpense, 0);
      assert.equal(res.netCashFlow, 0);
      assert.equal(res.savingsRate, 0);
      assert.equal(res.dailyAverageSpending, 0);
      assert.equal(res.highestExpenseCategory, null);
      assert.equal(res.categoryExpenses.length, 0);
      assert.equal(res.weeklyDistribution.length, 4);
    });
  });

  // Test Scenario 2: Incomplete month (elapsed days calculation)
  describe('2. Incomplete Month & Daily Average Spend', () => {
    it('should calculate daily average based on elapsed days rather than full month length', () => {
      const categories = [{ id: 'cat-food', name: 'Food & Dining' }];
      const transactions = [
        { id: '1', date: '2026-10-02', amount: 30.00, type: 'expense', categoryId: 'cat-food' },
        { id: '2', date: '2026-10-05', amount: 50.00, type: 'expense', categoryId: 'cat-food' },
        { id: '3', date: '2026-10-10', amount: 20.00, type: 'expense', categoryId: 'cat-food' }
      ];

      const res = calculateMonthlyCashFlow(transactions, categories, '2026-10');
      assert.equal(res.totalExpense, 100.00);
      // For current month (2026-10), daysElapsed is 18 (as of 2026-10-18)
      assert.ok(res.daysElapsed >= 1);
      const expectedDailyAvg = Number((100.00 / res.daysElapsed).toFixed(2));
      assert.equal(res.dailyAverageSpending, expectedDailyAvg);
      assert.ok(res.projectedMonthlyExpense > 100);
    });
  });

  // Test Scenario 3: Like-for-Like Month Comparison
  describe('3. Like-for-Like Month Comparison', () => {
    it('should compare current month Day 1–X against previous month Day 1–X', () => {
      const categories = [{ id: 'cat-food', name: 'Food & Dining' }];
      const transactions = [
        // Previous month (2026-09)
        { id: 'p1', date: '2026-09-05', amount: 100.00, type: 'expense', categoryId: 'cat-food' },
        { id: 'p2', date: '2026-09-12', amount: 100.00, type: 'expense', categoryId: 'cat-food' },
        { id: 'p3', date: '2026-09-25', amount: 150.00, type: 'expense', categoryId: 'cat-food' }, // Day 25: after day 18

        // Current month (2026-10) up to day 18
        { id: 'c1', date: '2026-10-04', amount: 120.00, type: 'expense', categoryId: 'cat-food' },
        { id: 'c2', date: '2026-10-10', amount: 140.00, type: 'expense', categoryId: 'cat-food' }
      ];

      const comp = calculateMonthToMonthComparison(transactions, categories, '2026-10', new Date('2026-10-18'));
      assert.equal(comp.prevMonth, '2026-09');
      assert.equal(comp.currentMonth, '2026-10');
      // Like-for-like current is 120 + 140 = 260
      assert.equal(comp.likeForLikeCurrent, 260.00);
      // Like-for-like previous (days 1-18) is 100 + 100 = 200 (p3 at day 25 is excluded from like-for-like!)
      assert.equal(comp.likeForLikePrevious, 200.00);
      assert.equal(comp.spendingDiff, 60.00);
      assert.equal(comp.spendingChangePct, 30.0);
      assert.equal(comp.status, 'higher');
      // Full previous month should still include p3 (350)
      assert.equal(comp.fullPreviousMonthExpense, 350.00);
    });

    it('should return first_month status when no previous month data exists', () => {
      const transactions = [
        { id: '1', date: '2026-10-01', amount: 50.00, type: 'expense', categoryId: 'cat-food' }
      ];
      const comp = calculateMonthToMonthComparison(transactions, [], '2026-10');
      assert.equal(comp.status, 'first_month');
      assert.equal(comp.likeForLikePrevious, 0);
    });
  });

  // Test Scenario 4: Only income (zero expenses)
  describe('4. Income Only Edge Case', () => {
    it('should reflect 100% savings rate and zero expense without NaN', () => {
      const transactions = [
        { id: '1', date: '2026-10-01', amount: 1200.00, type: 'income', categoryId: 'cat-allowance' }
      ];
      const res = calculateMonthlyCashFlow(transactions, [], '2026-10');
      assert.equal(res.totalIncome, 1200.00);
      assert.equal(res.totalExpense, 0);
      assert.equal(res.netCashFlow, 1200.00);
      assert.equal(res.savingsRate, 100);
      assert.equal(res.highestExpenseCategory, null);
    });
  });

  // Test Scenario 5: Only expenses (zero income)
  describe('5. Expense Only Edge Case', () => {
    it('should calculate negative net cash flow and 0% savings rate', () => {
      const categories = [{ id: 'cat-food', name: 'Food' }];
      const transactions = [
        { id: '1', date: '2026-10-03', amount: 250.00, type: 'expense', categoryId: 'cat-food' }
      ];
      const res = calculateMonthlyCashFlow(transactions, categories, '2026-10');
      assert.equal(res.totalIncome, 0);
      assert.equal(res.totalExpense, 250.00);
      assert.equal(res.netCashFlow, -250.00);
      assert.equal(res.savingsRate, 0);
      assert.equal(res.highestExpenseCategory.name, 'Food');
      assert.equal(res.highestExpenseCategory.percentage, 100);
    });
  });

  // Test Scenario 6: Multiple accounts balance aggregation
  describe('6. Multi-Account Balance Aggregation', () => {
    it('should sum up balances from multiple bank and e-wallet accounts', () => {
      const summary = buildFinancialSummary({
        accounts: [
          { accountId: 'acc-1', accountName: 'Maybank', balance: 350.50 },
          { accountId: 'acc-2', accountName: 'Touch n Go eWallet', balance: 45.20 },
          { accountId: 'acc-3', accountName: 'Cash', balance: 120.00 }
        ]
      });
      assert.equal(summary.accounts.totalBalance, 515.70);
      assert.equal(summary.accounts.accountsCount, 3);
    });
  });

  // Test Scenario 7: Savings Goals & Surplus Tracking
  describe('7. Savings Goals Tracking', () => {
    it('should calculate target progress and remaining targets correctly', () => {
      const summary = buildFinancialSummary({
        savingsGoals: [
          { id: 'g-1', title: 'Laptop', targetAmount: 2400.00, currentAmount: 1200.00 },
          { id: 'g-2', title: 'Emergency Fund', targetAmount: 500.00, currentAmount: 500.00 }
        ]
      });
      assert.equal(summary.savingsGoals[0].progressPercentage, 50);
      assert.equal(summary.savingsGoals[0].remainingAmount, 1200.00);
      assert.equal(summary.savingsGoals[1].progressPercentage, 100);
      assert.equal(summary.savingsGoals[1].remainingAmount, 0);
    });
  });

  // Test Scenario 8: Missing date string fallback
  describe('8. Transaction Date Fallback', () => {
    it('should assign current date fallback rather than discarding transactions without date', () => {
      const categories = [{ id: 'cat-food', name: 'Food' }];
      const transactions = [
        { id: 'undated', amount: 45.00, type: 'expense', categoryId: 'cat-food' } // date is missing
      ];
      const res = calculateMonthlyCashFlow(transactions, categories, '2026-10');
      assert.equal(res.totalExpense, 45.00);
      assert.equal(res.categoryExpenses[0].total, 45.00);
    });
  });

  // Test Scenario 9: Category Budget Overage Detection
  describe('9. Category Budget Risk Detection', () => {
    it('should detect when budget is approaching limit (>=80%) or exceeded (>100%)', () => {
      const categories = [
        { id: 'c1', name: 'Food & Dining' },
        { id: 'c2', name: 'Entertainment' }
      ];
      const budgets = [
        { id: 'b1', categoryId: 'c1', categoryName: 'Food & Dining', limit: 200.00 },
        { id: 'b2', categoryId: 'c2', categoryName: 'Entertainment', limit: 100.00 }
      ];
      const transactions = [
        { id: 't1', date: '2026-10-05', amount: 170.00, type: 'expense', categoryId: 'c1' }, // 85% -> warning
        { id: 't2', date: '2026-10-06', amount: 110.00, type: 'expense', categoryId: 'c2' }  // 110% -> exceeded
      ];

      const trends = detectSpendingTrends(transactions, categories, budgets, '2026-10');
      assert.equal(trends.budgetRisks.length, 2);

      const foodRisk = trends.budgetRisks.find(b => b.categoryName === 'Food & Dining');
      assert.equal(foodRisk.status, 'warning');
      assert.equal(foodRisk.percentage, 85);

      const entRisk = trends.budgetRisks.find(b => b.categoryName === 'Entertainment');
      assert.equal(entRisk.status, 'exceeded');
      assert.equal(entRisk.percentage, 110);
    });
  });

  // Test Scenario 10: Rising and Falling Category Trends
  describe('10. Spending Trend Detection (Rising / Falling)', () => {
    it('should detect categories with >15% change compared to previous month', () => {
      const categories = [
        { id: 'c1', name: 'Food' },
        { id: 'c2', name: 'Transport' }
      ];
      const transactions = [
        // Previous month (2026-09)
        { id: 'p1', date: '2026-09-02', amount: 100.00, type: 'expense', categoryId: 'c1' },
        { id: 'p2', date: '2026-09-03', amount: 200.00, type: 'expense', categoryId: 'c2' },

        // Current month (2026-10)
        { id: 'c1', date: '2026-10-02', amount: 150.00, type: 'expense', categoryId: 'c1' }, // +50% -> rising
        { id: 'c2', date: '2026-10-03', amount: 100.00, type: 'expense', categoryId: 'c2' }  // -50% -> falling
      ];

      const trends = detectSpendingTrends(transactions, categories, [], '2026-10');
      assert.ok(trends.risingCategories.some(r => r.name === 'Food' && r.percentageChange === 50));
      assert.ok(trends.fallingCategories.some(f => f.name === 'Transport' && f.percentageChange === -50));
    });
  });

  // Test Scenario 11: Unusual Spending Anomaly Detection
  describe('11. Spending Anomaly Detection', () => {
    it('should flag transactions that are > 2.5x the category average and above RM30', () => {
      const categories = [{ id: 'c1', name: 'Food & Dining' }];
      const transactions = [
        { id: '1', date: '2026-10-01', title: 'Campus Lunch', amount: 12.00, type: 'expense', categoryId: 'c1' },
        { id: '2', date: '2026-10-02', title: 'Campus Dinner', amount: 14.00, type: 'expense', categoryId: 'c1' },
        { id: '3', date: '2026-10-03', title: 'Breakfast', amount: 10.00, type: 'expense', categoryId: 'c1' },
        { id: '4', date: '2026-10-04', title: 'Fancy Seafood Feast', amount: 110.00, type: 'expense', categoryId: 'c1' } // Huge spike!
      ];

      const trends = detectSpendingTrends(transactions, categories, [], '2026-10');
      assert.ok(trends.anomalies.length >= 1);
      assert.equal(trends.anomalies[0].title, 'Fancy Seafood Feast');
      assert.equal(trends.anomalies[0].amount, 110.00);
    });
  });

  // Test Scenario 12: Budget Allocation Arithmetic
  describe('12. Personalized Budget Allocation Arithmetic', () => {
    it('should split RM900 into Needs (55%), Wants (25%), and Savings (20%) summing exactly to RM900', () => {
      const rec = calculateBudgetRecommendation({
        monthlyIncome: 900
      });

      assert.equal(rec.monthlyIncome, 900);
      assert.equal(rec.needsPercentage, 55);
      assert.equal(rec.wantsPercentage, 25);
      assert.equal(rec.savingsPercentage, 20);

      assert.equal(rec.needsBudget, 495.00);
      assert.equal(rec.wantsBudget, 225.00);
      assert.equal(rec.savingsBudget, 180.00);

      const totalAllocated = rec.needsBudget + rec.wantsBudget + rec.savingsBudget;
      assert.equal(totalAllocated, 900.00);
    });
  });

  // Test Scenario 13: Savings Feasibility Tiers
  describe('13. Savings Feasibility Evaluation', () => {
    it('should classify as High feasibility when required monthly savings <= 70% of surplus', () => {
      const plan = calculateSavingsPlan({
        targetAmount: 300,
        targetMonths: 3, // Requires RM100/mo
        monthlySurplus: 200 // 100 / 200 = 50% <= 70%
      });

      assert.equal(plan.feasibilityTier, 'High');
      assert.equal(plan.requiredMonthlySavings, 100.00);
      assert.equal(plan.requiredWeeklySavings, 23.08);
      assert.equal(plan.isRealistic, true);
    });

    it('should classify as Moderate feasibility when required monthly savings is 71-100% of surplus', () => {
      const plan = calculateSavingsPlan({
        targetAmount: 270,
        targetMonths: 3, // Requires RM90/mo
        monthlySurplus: 100 // 90 / 100 = 90%
      });

      assert.equal(plan.feasibilityTier, 'Moderate');
      assert.equal(plan.requiredMonthlySavings, 90.00);
      assert.equal(plan.isRealistic, true);
    });

    it('should classify as Stretch feasibility when target requires more than monthly surplus and suggest alternative', () => {
      const plan = calculateSavingsPlan({
        targetAmount: 1000,
        targetMonths: 4, // Requires RM250/mo
        monthlySurplus: 100 // 250 > 100
      });

      assert.equal(plan.feasibilityTier, 'Stretch');
      assert.equal(plan.requiredMonthlySavings, 250.00);
      assert.equal(plan.isRealistic, false);
      assert.ok(plan.suggestedAlternative);
      assert.ok(plan.suggestedAlternative.targetMonths >= 10);
    });
  });

  // Test Scenario 14: PDF Export Data Generation & Theme Integration
  describe('14. PDF Generation & Theme Compatibility', () => {
    it('should successfully construct PDF document with financial statement without error', () => {
      const mockReportData = {
        month: '2026-10',
        cashFlow: {
          totalIncome: 950.00,
          totalExpense: 420.00,
          netCashFlow: 530.00,
          savingsRate: 55.8,
          dailyAverageSpending: 23.33,
          categoryExpenses: [
            { categoryId: 'c1', categoryName: 'Food', total: 280.00, percentage: 66.7, count: 12 },
            { categoryId: 'c2', categoryName: 'Transport', total: 140.00, percentage: 33.3, count: 4 }
          ],
          highestExpenseCategory: { name: 'Food', total: 280.00, percentage: 66.7 }
        },
        monthComparison: {
          prevMonth: '2026-09',
          currentMonth: '2026-10',
          spendingDiff: -30.00,
          spendingChangePct: -6.7,
          status: 'lower',
          likeForLikeCurrent: 420.00,
          likeForLikePrevious: 450.00
        },
        budgets: [
          { categoryId: 'c1', categoryName: 'Food', limit: 300.00 }
        ],
        trends: {
          risingCategories: [],
          fallingCategories: [{ name: 'Transport', percentageChange: -18.5 }],
          budgetRisks: [],
          savingsOpportunities: [
            { categoryName: 'Food', potentialMonthlySavings: 45.00, tip: 'Cook campus meals on weekends' }
          ]
        }
      };

      const doc = generateMonthlyIntelligencePDF({
        reportData: mockReportData,
        user: { username: 'Aisyah', email: 'aisyah@student.edu.my', university: 'UM' }
      });

      assert.ok(doc, 'PDF Document must be generated');
      assert.ok(doc.internal.getNumberOfPages() >= 1, 'PDF must have at least 1 page');
    });

    it('should verify that all 10 KampusKash themes provide CSS variables for Phase 2 components', () => {
      assert.equal(PRESET_THEMES.length, 10);
      PRESET_THEMES.forEach(t => {
        assert.ok(t.tokens['--primary']);
        assert.ok(t.tokens['--bg-card']);
        assert.ok(t.tokens['--bg-card-subtle']);
        assert.ok(t.tokens['--income']);
        assert.ok(t.tokens['--expense']);
      });
    });
  });

  // End-to-End API Handlers
  describe('15. End-to-End API Intelligence Routes', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      sub: 'student-phase2-uid',
      email: 'student@phase2.edu.my',
      aud: 'kampuskash-82b7c',
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64');
    const validToken = `Bearer ${header}.${payload}.sig`;

    it('should handle /api/ai/insights request and return structured cash flow, comparison, and trends', async () => {
      const req = {
        headers: { authorization: validToken },
        body: {
          month: '2026-10',
          userData: {
            transactions: [
              { id: '1', date: '2026-10-02', amount: 50.00, type: 'expense', categoryId: 'c1' },
              { id: '2', date: '2026-10-03', amount: 500.00, type: 'income', categoryId: 'c2' }
            ],
            categories: [
              { id: 'c1', name: 'Food & Dining' },
              { id: 'c2', name: 'Allowance' }
            ]
          }
        }
      };

      let code = null;
      let data = null;
      const res = {
        status: (c) => { code = c; return res; },
        json: (d) => { data = d; return res; }
      };

      await handleFinancialInsightsRequest(req, res);
      assert.equal(code, 200);
      assert.equal(data.success, true);
      assert.equal(data.cashFlow.totalExpense, 50.00);
      assert.equal(data.cashFlow.totalIncome, 500.00);
      assert.equal(data.cashFlow.netCashFlow, 450.00);
    });

    it('should handle /api/ai/budget-recommendation request', async () => {
      const req = {
        headers: { authorization: validToken },
        body: {
          monthlyIncome: 1000
        }
      };

      let code = null;
      let data = null;
      const res = {
        status: (c) => { code = c; return res; },
        json: (d) => { data = d; return res; }
      };

      await handleBudgetRecommendationRequest(req, res);
      assert.equal(code, 200);
      assert.equal(data.recommendation.monthlyIncome, 1000);
      assert.equal(data.recommendation.needsBudget, 550);
    });

    it('should handle /api/ai/savings-plan request', async () => {
      const req = {
        headers: { authorization: validToken },
        body: {
          targetAmount: 800,
          targetMonths: 4,
          monthlySurplus: 300
        }
      };

      let code = null;
      let data = null;
      const res = {
        status: (c) => { code = c; return res; },
        json: (d) => { data = d; return res; }
      };

      await handleSavingsPlanRequest(req, res);
      assert.equal(code, 200);
      assert.equal(data.plan.feasibilityTier, 'High');
      assert.equal(data.plan.requiredMonthlySavings, 200);
    });
  });
});
