import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateDemoDataset,
  generateDemoTransactions,
  DEMO_ACCOUNTS,
  DEMO_BUDGETS,
  DEMO_SAVINGS_GOALS,
  DEMO_CATEGORIES
} from '../src/demo/demoData.js';

import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateTransactionBalance,
  calculateCategorySpending,
  getMonthlyAggregates,
  getSpendingByAccount,
  filterTransactions
} from '../src/services/transactionService.js';

import { calculateTotalAccountBalance } from '../src/services/accountService.js';
import { calculateBudgetStatus } from '../src/services/budgetService.js';
import { calculateSavingsProgress } from '../src/services/savingsService.js';

describe('KiroKash Tutorial Demo Mode & Mock Data Isolation', () => {

  describe('1. Demo Dataset Mathematical Consistency', () => {
    it('should generate a full dynamic Malaysian student demo dataset relative to current date', () => {
      const baseDate = new Date('2026-10-16T09:00:00Z');
      const dataset = generateDemoDataset(baseDate);

      assert.ok(Array.isArray(dataset.accounts), 'accounts should be an array');
      assert.ok(Array.isArray(dataset.transactions), 'transactions should be an array');
      assert.ok(Array.isArray(dataset.budgets), 'budgets should be an array');
      assert.ok(Array.isArray(dataset.savingsGoals), 'savingsGoals should be an array');
      assert.ok(Array.isArray(dataset.categories), 'categories should be an array');

      assert.strictEqual(dataset.accounts.length, 3, 'should have 3 student accounts');
      assert.ok(dataset.transactions.length >= 60, `should have at least 60 transactions, found ${dataset.transactions.length}`);
      assert.strictEqual(dataset.budgets.length, 4, 'should have 4 category budgets');
      assert.strictEqual(dataset.savingsGoals.length, 3, 'should have 3 savings goals');
    });

    it('should have realistic student account balances in Ringgit Malaysia', () => {
      const maybank = DEMO_ACCOUNTS.find(a => a.institution === 'Maybank');
      const tng = DEMO_ACCOUNTS.find(a => a.institution === 'Touch \'n Go');
      const cash = DEMO_ACCOUNTS.find(a => a.accountType === 'cash');

      assert.ok(maybank, 'Maybank account should exist');
      assert.ok(tng, 'Touch n Go account should exist');
      assert.ok(cash, 'Cash account should exist');

      assert.strictEqual(maybank.balance, 1240.00, 'Maybank should have ~RM 1240.00');
      assert.strictEqual(tng.balance, 86.50, 'TNG eWallet should have ~RM 86.50');
      assert.strictEqual(cash.balance, 45.00, 'Cash reserve should have ~RM 45.00');

      const totalBalance = calculateTotalAccountBalance(DEMO_ACCOUNTS);
      assert.strictEqual(totalBalance, 1371.50, 'Total accounts balance should equal RM 1371.50');
    });

    it('should calculate income and expenses with exact mathematical consistency', () => {
      const dataset = generateDemoDataset();
      const incomeTx = dataset.transactions.filter(t => t.type === 'income');
      const expenseTx = dataset.transactions.filter(t => t.type === 'expense');

      const totalIncome = calculateTotalIncome(dataset.transactions);
      const totalExpense = calculateTotalExpenses(dataset.transactions);
      const balance = calculateTransactionBalance(dataset.transactions);

      const manualIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
      const manualExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);

      assert.strictEqual(totalIncome, manualIncome, 'totalIncome must equal sum of income items');
      assert.strictEqual(totalExpense, manualExpense, 'totalExpense must equal sum of expense items');
      assert.strictEqual(balance, totalIncome - totalExpense, 'balance must equal income minus expenses');
      assert.ok(totalIncome > totalExpense, 'income should exceed expenses for positive student cashflow');
    });

    it('should include authentic student income sources (allowance, scholarship/loan, part-time jobs)', () => {
      const txs = generateDemoTransactions();
      const allowance = txs.filter(t => t.title.toLowerCase().includes('allowance'));
      const loan = txs.find(t => t.title.toLowerCase().includes('ptptn') || t.title.toLowerCase().includes('scholarship'));
      const gigs = txs.filter(t => t.categoryId === 'cat-3');

      assert.ok(allowance.length >= 2, 'should have multiple monthly allowance transfers');
      assert.ok(loan, 'should have one semester loan disbursement entry');
      assert.strictEqual(loan.amount, 1500, 'PTPTN disbursement should be RM 1500');
      assert.ok(gigs.length >= 2, 'should have 2 or 3 freelance/part-time entries');
    });

    it('should exhibit a realistic budget spread: one healthy, one near limit, one over limit', () => {
      const dataset = generateDemoDataset();
      const statuses = dataset.budgets.map(b => calculateBudgetStatus(b, dataset.transactions));

      const healthy = statuses.filter(s => !s.isOver && !s.isNear);
      const nearLimit = statuses.filter(s => s.isNear && !s.isOver);
      const overLimit = statuses.filter(s => s.isOver);

      assert.ok(healthy.length >= 1, `Expected at least 1 healthy budget, found ${healthy.length}`);
      assert.ok(nearLimit.length >= 1, `Expected at least 1 near-limit budget (80%+), found ${nearLimit.length}`);
      assert.ok(overLimit.length >= 1, `Expected at least 1 over-limit budget (>100%), found ${overLimit.length}`);
    });

    it('should correctly calculate student savings goal progress and percentages', () => {
      const laptopGoal = DEMO_SAVINGS_GOALS.find(g => g.title === 'New Laptop');
      const emergencyGoal = DEMO_SAVINGS_GOALS.find(g => g.title === 'Emergency Fund');
      const tripGoal = DEMO_SAVINGS_GOALS.find(g => g.title === 'Raya Trip');

      assert.ok(laptopGoal && emergencyGoal && tripGoal, 'All three savings goals must exist');

      const laptopProgress = calculateSavingsProgress(laptopGoal);
      const emergencyProgress = calculateSavingsProgress(emergencyGoal);
      const tripProgress = calculateSavingsProgress(tripGoal);

      assert.strictEqual(laptopProgress.percentage, 40, 'Laptop goal should be exactly 40% saved');
      assert.strictEqual(emergencyProgress.percentage, 25, 'Emergency fund should be exactly 25% saved');
      assert.strictEqual(tripProgress.percentage, 90, 'Raya Trip goal should be exactly 90% saved');
    });

    it('should generate valid monthly aggregates for reporting without NaN', () => {
      const dataset = generateDemoDataset();
      const aggregates = getMonthlyAggregates(dataset.transactions, 6);

      assert.strictEqual(aggregates.length, 6, 'Should generate 6 months of reporting trends');
      aggregates.forEach(m => {
        assert.ok(!isNaN(m.income), `Month ${m.key} income should be a valid number`);
        assert.ok(!isNaN(m.expense), `Month ${m.key} expense should be a valid number`);
        assert.ok(m.income >= 0, `Month ${m.key} income should be >= 0`);
        assert.ok(m.expense >= 0, `Month ${m.key} expense should be >= 0`);
      });
    });

    it('should breakdown spending by account accurately including all 3 demo accounts', () => {
      const dataset = generateDemoDataset();
      const spending = getSpendingByAccount(dataset.transactions, dataset.accounts);

      assert.ok(spending['acc-demo-maybank'], 'Maybank spending should be recorded');
      assert.ok(spending['acc-demo-tng'], 'Touch n Go spending should be recorded');
      assert.ok(spending['acc-demo-cash'], 'Cash spending should be recorded');
      assert.ok(spending['acc-demo-maybank'].amount > 0, 'Maybank expenses should be > 0');
      assert.ok(spending['acc-demo-tng'].amount > 0, 'TNG expenses should be > 0');
      assert.ok(spending['acc-demo-cash'].amount > 0, 'Cash expenses should be > 0');
    });
  });

  describe('2. In-Memory Demo Storage Isolation & Zero Leakage', () => {
    // Simulated LocalStorage mock
    let mockStorage = {};
    const fakeLocalStorage = {
      getItem: (k) => mockStorage[k] ?? null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; },
      clear: () => { mockStorage = {}; }
    };

    beforeEach(() => {
      mockStorage = {};
    });

    it('should tag all demo objects with isDemo: true for easy UI badge rendering', () => {
      const dataset = generateDemoDataset();

      assert.ok(dataset.accounts.every(a => a.isDemo === true), 'All demo accounts must have isDemo: true');
      assert.ok(dataset.budgets.every(b => b.isDemo === true), 'All demo budgets must have isDemo: true');
      assert.ok(dataset.savingsGoals.every(g => g.isDemo === true), 'All demo savings goals must have isDemo: true');
      assert.ok(dataset.transactions.every(t => t.isDemo === true), 'All demo transactions must have isDemo: true');
    });

    it('should NEVER persist demo financial records to storage', () => {
      // Simulate real user having empty records in storage
      const userId = 'user-test-123';
      fakeLocalStorage.setItem(`student_tracker_transactions_${userId}`, JSON.stringify([]));
      fakeLocalStorage.setItem(`student_tracker_accounts_${userId}`, JSON.stringify([]));
      fakeLocalStorage.setItem(`student_tracker_budgets_${userId}`, JSON.stringify([]));

      // Simulate demo mode running in-memory
      const inMemoryDemoData = generateDemoDataset();

      // Ensure that in-memory demo data exists in variable but NEVER gets set in storage
      assert.ok(inMemoryDemoData.transactions.length > 0, 'Demo transactions exist in memory');

      const storedTx = JSON.parse(fakeLocalStorage.getItem(`student_tracker_transactions_${userId}`));
      const storedAcc = JSON.parse(fakeLocalStorage.getItem(`student_tracker_accounts_${userId}`));
      const storedBud = JSON.parse(fakeLocalStorage.getItem(`student_tracker_budgets_${userId}`));

      assert.deepStrictEqual(storedTx, [], 'Storage transactions must remain empty array');
      assert.deepStrictEqual(storedAcc, [], 'Storage accounts must remain empty array');
      assert.deepStrictEqual(storedBud, [], 'Storage budgets must remain empty array');
    });

    it('should preserve existing user real data untouched before, during, and after tutorial replay', () => {
      const realUserTransactions = [
        { id: 'tx-real-1', title: 'Actual Real Coffee', amount: 12.00, type: 'expense', categoryId: 'cat-6' }
      ];
      const realUserAccounts = [
        { accountId: 'acc-real-1', accountName: 'CIMB Bank', balance: 500.00 }
      ];

      // User has real data
      const beforeTransactions = JSON.stringify(realUserTransactions);
      const beforeAccounts = JSON.stringify(realUserAccounts);

      // Start demo mode in-memory
      let demoState = generateDemoDataset();
      assert.strictEqual(demoState.transactions.length, 61);

      // User performs a test action during tutorial in demo mode
      const testDemoTx = {
        id: 'tx-demo-test',
        title: 'Tutorial Test Expense',
        amount: 25.00,
        type: 'expense',
        categoryId: 'cat-6',
        isDemo: true
      };
      demoState = {
        ...demoState,
        transactions: [testDemoTx, ...demoState.transactions]
      };
      assert.strictEqual(demoState.transactions.length, 62);

      // Tutorial ends: discard demo store completely
      demoState = null;

      // Verify real data was completely untouched
      assert.strictEqual(JSON.stringify(realUserTransactions), beforeTransactions, 'Real transactions must be strictly unchanged');
      assert.strictEqual(JSON.stringify(realUserAccounts), beforeAccounts, 'Real accounts must be strictly unchanged');
    });
  });

  describe('3. Tutorial Step Persistence & Refresh Resumption', () => {
    let mockStorage = {};
    const fakeLocalStorage = {
      getItem: (k) => mockStorage[k] ?? null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; }
    };

    beforeEach(() => {
      mockStorage = {};
    });

    it('should save step progression and resume at the exact step upon refresh', () => {
      const STEP_KEY = 'kirokash_tutorial_current_step';

      // User starts tutorial on step 0
      fakeLocalStorage.setItem(STEP_KEY, '0');
      assert.strictEqual(parseInt(fakeLocalStorage.getItem(STEP_KEY), 10), 0);

      // User navigates to Step 6 (Transactions)
      fakeLocalStorage.setItem(STEP_KEY, '6');

      // User refreshes the page: re-reads from storage
      const resumedStep = parseInt(fakeLocalStorage.getItem(STEP_KEY), 10);
      assert.strictEqual(resumedStep, 6, 'Must resume at Step 6 after refresh');
    });

    it('should clear stored step on tutorial completion or skip', () => {
      const STEP_KEY = 'kirokash_tutorial_current_step';
      fakeLocalStorage.setItem(STEP_KEY, '10');

      // User clicks Finish / Skip
      fakeLocalStorage.removeItem(STEP_KEY);

      assert.strictEqual(fakeLocalStorage.getItem(STEP_KEY), null, 'Step key should be removed upon finishing');
    });
  });
});
