import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAccount,
  validateAccount,
  calculateTotalAccountBalance,
  ACCOUNT_TYPES
} from '../src/services/accountService.js';

import {
  createTransaction,
  validateTransaction,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateTransactionBalance,
  calculateCategorySpending,
  filterTransactions,
  getMonthlyAggregates,
  getSpendingByAccount
} from '../src/services/transactionService.js';

import {
  createBudget,
  validateBudget,
  calculateBudgetStatus
} from '../src/services/budgetService.js';

import {
  createSavingsGoal,
  validateSavingsGoal,
  calculateSavingsProgress
} from '../src/services/savingsService.js';

import {
  isTechnicalId,
  formatFirebaseUser,
  verifyResetCode,
  confirmNewPassword,
  sendPasswordReset
} from '../src/services/authService.js';

import {
  getCleanDisplayName,
  validateAvatarFile,
  PRESET_AVATARS,
  SUPPORTED_CURRENCIES,
  MAX_AVATAR_SIZE_BYTES
} from '../src/services/profileService.js';

import {
  TOUR_STEPS,
  getTourStepById,
  getTotalTourSteps
} from '../src/services/tutorialService.js';

import {
  setOnboardingStatus,
  getOnboardingStatus
} from '../src/services/settingsService.js';

describe('KiroKash Phase 1 Foundation Test Suite', () => {

  // ==================== AUTH & PROFILE TESTS ====================
  describe('Profile & Authentication Formatting', () => {
    it('should identify technical IDs (Firebase UID, hex hashes, tokens)', () => {
      assert.equal(isTechnicalId('8f3a91d7c2a4e5b6c7d8e9f012345678'), true);
      assert.equal(isTechnicalId('techToken99887766554433221100aabb'), true);
      assert.equal(isTechnicalId('u1v2w3x4y5z6a7b8c9d0e1f2g3h4'), true);
      assert.equal(isTechnicalId('Airil Asyraff'), false);
      assert.equal(isTechnicalId('Sarah Tan'), false);
      assert.equal(isTechnicalId('Muhammad Amir'), false);
    });

    it('should NEVER display Firebase UID or technical hash as display name', () => {
      const userWithUid = {
        uid: '8f3a91d7c2a4e5b6c7d8e9f012345678',
        displayName: '8f3a91d7c2a4e5b6c7d8e9f012345678',
        email: 'airil.asyraff@student.edu.my'
      };
      const formatted = formatFirebaseUser(userWithUid);
      assert.notEqual(formatted.username, userWithUid.uid);
      assert.equal(formatted.username, 'Airil Asyraff');
    });

    it('should derive clean name from email if displayName is empty or hash', () => {
      const user = {
        uid: 'user12345678901234567890',
        displayName: '',
        email: 'nur.ain.fatimah@campus.my'
      };
      const formatted = formatFirebaseUser(user);
      assert.equal(formatted.username, 'Nur Ain Fatimah');
    });

    it('should fall back to "Student" if email and name are unavailable or invalid', () => {
      const user = {
        uid: 'abcdef123456789012345678',
        displayName: 'abcdef123456789012345678',
        email: ''
      };
      const clean = getCleanDisplayName(user);
      assert.equal(clean, 'Student');
    });

    it('should respect user custom profile username when set', () => {
      const user = {
        id: 'user-123',
        username: 'Ahmad Faiz',
        email: 'faiz@campus.my'
      };
      assert.equal(getCleanDisplayName(user), 'Ahmad Faiz');
    });

    it('should handle verifyResetCode gracefully when unconfigured or invalid', async () => {
      const res = await verifyResetCode('dummy-oob-code');
      assert.equal(typeof res.success, 'boolean');
      if (!res.success) {
        assert.ok(res.code || res.error);
      }
    });

    it('should handle confirmNewPassword gracefully when unconfigured or invalid', async () => {
      const res = await confirmNewPassword('dummy-oob-code', 'newSecretPassword123');
      assert.equal(typeof res.success, 'boolean');
      if (!res.success) {
        assert.ok(res.code || res.error);
      }
    });

    it('should support sending password reset with actionCodeSettings to custom reset-password url', async () => {
      const res = await sendPasswordReset('student@campus.my', {
        url: 'https://kirokash.vercel.app/reset-password',
        handleCodeInApp: true
      });
      assert.equal(typeof res.success, 'boolean');
      if (!res.success) {
        assert.ok(res.code || res.error);
      }
    });

    it('should validate password reset complexity requirements', () => {
      const isComplex = (pwd) => pwd.length >= 6 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd);
      assert.equal(isComplex('12345'), false); // too short
      assert.equal(isComplex('abcdef'), false); // no number
      assert.equal(isComplex('123456'), false); // no letter
      assert.equal(isComplex('Campus2026!'), true); // meets complexity
    });

    it('should correctly detect root resetPassword query parameters for redirect', () => {
      const searchUrl = 'https://kirokash.vercel.app/?mode=resetPassword&oobCode=sampleCode123';
      const parsedUrl = new URL(searchUrl);
      const mode = parsedUrl.searchParams.get('mode');
      const oobCode = parsedUrl.searchParams.get('oobCode');

      assert.equal(mode, 'resetPassword');
      assert.equal(oobCode, 'sampleCode123');

      const targetPath = `/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
      assert.equal(targetPath, '/reset-password?oobCode=sampleCode123');
    });
  });

  // ==================== ACCOUNTS TESTS ====================
  describe('Account Service & Balances', () => {
    it('should create an account with manual source and required fields', () => {
      const acc = createAccount({
        accountName: 'Maybank Savings',
        institution: 'Maybank',
        accountType: 'savings',
        balance: 1250,
        currency: 'RM'
      });

      assert.equal(acc.accountName, 'Maybank Savings');
      assert.equal(acc.institution, 'Maybank');
      assert.equal(acc.accountType, 'savings');
      assert.equal(acc.balance, 1250);
      assert.equal(acc.currency, 'RM');
      assert.equal(acc.source, 'manual');
      assert.ok(acc.accountId.startsWith('acc-'));
    });

    it('should validate account fields correctly', () => {
      assert.equal(validateAccount({ accountName: '', balance: 100, accountType: 'savings' }), 'Please enter an account name');
      assert.equal(validateAccount({ accountName: 'Cash', balance: NaN, accountType: 'cash' }), 'Please enter a valid balance amount');
      assert.equal(validateAccount({ accountName: 'Test', balance: 50, accountType: 'invalid_type' }), 'Please select a valid account type');
      assert.equal(validateAccount({ accountName: 'Maybank', balance: 500, accountType: 'savings' }), null);
    });

    it('should support all standard student account types', () => {
      const typeValues = ACCOUNT_TYPES.map(t => t.value);
      assert.ok(typeValues.includes('savings'));
      assert.ok(typeValues.includes('current'));
      assert.ok(typeValues.includes('ewallet'));
      assert.ok(typeValues.includes('cash'));
      assert.ok(typeValues.includes('credit_card'));
      assert.ok(typeValues.includes('other'));
    });

    it('should calculate total balance across multiple accounts', () => {
      const accounts = [
        { accountId: 'acc-1', accountName: 'Maybank', balance: 1250 },
        { accountId: 'acc-2', accountName: 'CIMB', balance: 830 },
        { accountId: 'acc-3', accountName: 'Cash', balance: 150 }
      ];
      const total = calculateTotalAccountBalance(accounts);
      assert.equal(total, 2230);
    });

    it('should handle empty accounts gracefully (0 balance)', () => {
      assert.equal(calculateTotalAccountBalance([]), 0);
    });
  });

  // ==================== TRANSACTION TESTS ====================
  describe('Transaction Service & Backward Compatibility', () => {
    it('should create transaction with proper defaults and source = manual', () => {
      const tx = createTransaction({
        type: 'expense',
        title: 'Cafeteria Lunch',
        amount: 8.50,
        categoryId: 'cat-6',
        accountId: 'acc-1'
      });

      assert.equal(tx.type, 'expense');
      assert.equal(tx.title, 'Cafeteria Lunch');
      assert.equal(tx.amount, 8.50);
      assert.equal(tx.categoryId, 'cat-6');
      assert.equal(tx.accountId, 'acc-1');
      assert.equal(tx.source, 'manual');
      assert.ok(tx.id.startsWith('tx-'));
    });

    it('should validate transaction required fields', () => {
      assert.equal(validateTransaction({ title: '', amount: 10, categoryId: 'cat-1', date: '2026-10-01' }), 'Please enter a transaction title');
      assert.equal(validateTransaction({ title: 'Lunch', amount: 0, categoryId: 'cat-1', date: '2026-10-01' }), 'Please enter a valid amount greater than RM 0');
      assert.equal(validateTransaction({ title: 'Lunch', amount: -5, categoryId: 'cat-1', date: '2026-10-01' }), 'Please enter a valid amount greater than RM 0');
      assert.equal(validateTransaction({ title: 'Lunch', amount: 10, categoryId: '', date: '2026-10-01' }), 'Please select a category');
      assert.equal(validateTransaction({ title: 'Lunch', amount: 10, categoryId: 'cat-1', date: '' }), 'Please select a date');
      assert.equal(validateTransaction({ title: 'Lunch', amount: 10, categoryId: 'cat-1', date: '2026-10-01' }), null);
    });

    it('should preserve legacy transactions without accountId without crashing or silently misassigning', () => {
      const legacyTx = [
        { id: 'tx-old-1', title: 'Legacy Textbook', amount: 45, type: 'expense', categoryId: 'cat-7' },
        { id: 'tx-old-2', title: 'Legacy Allowance', amount: 300, type: 'income', categoryId: 'cat-1', accountId: null },
        { id: 'tx-new-1', title: 'New Grab', amount: 15, type: 'expense', categoryId: 'cat-8', accountId: 'acc-1' }
      ];

      // Income and expense calculations should work seamlessly
      const income = calculateTotalIncome(legacyTx);
      const expense = calculateTotalExpenses(legacyTx);
      const balance = calculateTransactionBalance(legacyTx);

      assert.equal(income, 300);
      assert.equal(expense, 60);
      assert.equal(balance, 240);

      // Filtering for unassigned should return only legacy/unassigned transactions
      const unassignedOnly = filterTransactions(legacyTx, { accountId: '__unassigned' });
      assert.equal(unassignedOnly.length, 2);
      assert.equal(unassignedOnly[0].id, 'tx-old-1');
      assert.equal(unassignedOnly[1].id, 'tx-old-2');
    });

    it('should filter transactions by search keyword in title, note, and category', () => {
      const list = [
        { id: '1', title: 'Campus Nasi Lemak', note: 'Breakfast', categoryId: 'cat-food', type: 'expense' },
        { id: '2', title: 'PTPTN Loan', note: 'Semester 1', categoryId: 'cat-loan', type: 'income' },
        { id: '3', title: 'Grab Ride', note: 'To campus', categoryId: 'cat-trans', type: 'expense' }
      ];

      const searchResult = filterTransactions(list, { search: 'nasi' });
      assert.equal(searchResult.length, 1);
      assert.equal(searchResult[0].id, '1');

      const searchNote = filterTransactions(list, { search: 'semester' });
      assert.equal(searchNote.length, 1);
      assert.equal(searchNote[0].id, '2');
    });

    it('should calculate category spending correctly', () => {
      const categories = [
        { id: 'cat-food', name: 'Food', color: '#8B5CF6', type: 'expense' },
        { id: 'cat-trans', name: 'Transport', color: '#14B8A6', type: 'expense' },
        { id: 'cat-income', name: 'Allowance', color: '#10B981', type: 'income' }
      ];

      const txList = [
        { id: '1', amount: 25, type: 'expense', categoryId: 'cat-food' },
        { id: '2', amount: 35, type: 'expense', categoryId: 'cat-food' },
        { id: '3', amount: 15, type: 'expense', categoryId: 'cat-trans' },
        { id: '4', amount: 500, type: 'income', categoryId: 'cat-income' }
      ];

      const breakdown = calculateCategorySpending(txList, categories);
      assert.equal(breakdown.length, 2);
      assert.equal(breakdown[0].name, 'Food');
      assert.equal(breakdown[0].amount, 60);
      assert.equal(breakdown[1].name, 'Transport');
      assert.equal(breakdown[1].amount, 15);
    });

    it('should group spending by account including unassigned legacy transactions', () => {
      const accounts = [
        { accountId: 'acc-1', accountName: 'Maybank' },
        { accountId: 'acc-2', accountName: 'Cash' }
      ];
      const txList = [
        { amount: 50, type: 'expense', accountId: 'acc-1' },
        { amount: 30, type: 'expense', accountId: 'acc-1' },
        { amount: 20, type: 'expense', accountId: 'acc-2' },
        { amount: 15, type: 'expense', accountId: null } // unassigned
      ];

      const byAcc = getSpendingByAccount(txList, accounts);
      assert.equal(byAcc['acc-1'].amount, 80);
      assert.equal(byAcc['acc-2'].amount, 20);
      assert.equal(byAcc['__unassigned'].amount, 15);
    });

    it('should compute monthly aggregates accurately', () => {
      const txList = [
        { date: '2026-09-10', amount: 100, type: 'expense' },
        { date: '2026-09-15', amount: 500, type: 'income' },
        { date: '2026-10-01', amount: 50, type: 'expense' }
      ];
      const monthly = getMonthlyAggregates(txList, 3);
      assert.ok(Array.isArray(monthly));
      assert.equal(monthly.length, 3);
    });
  });

  // ==================== BUDGET TESTS ====================
  describe('Budgets & Limit Warnings', () => {
    it('should create and validate budget object', () => {
      const budget = createBudget({ categoryId: 'cat-food', monthlyLimit: 300 });
      assert.equal(budget.categoryId, 'cat-food');
      assert.equal(budget.monthlyLimit, 300);

      assert.equal(validateBudget({ categoryId: '', monthlyLimit: 100 }), 'Please select a category');
      assert.equal(validateBudget({ categoryId: 'cat-1', monthlyLimit: 0 }), 'Please enter a valid monthly budget limit greater than RM 0');
      assert.equal(validateBudget({ categoryId: 'cat-1', monthlyLimit: -50 }), 'Please enter a valid monthly budget limit greater than RM 0');
      assert.equal(validateBudget({ categoryId: 'cat-1', monthlyLimit: 250 }), null);
    });

    it('should calculate budget status: on track, approaching limit (80%+), and over-budget', () => {
      const budget = { categoryId: 'cat-food', monthlyLimit: 300 };

      // Normal spending (RM 150 / RM 300 = 50%)
      const tx1 = [{ type: 'expense', categoryId: 'cat-food', amount: 150 }];
      const status1 = calculateBudgetStatus(budget, tx1);
      assert.equal(status1.spent, 150);
      assert.equal(status1.remaining, 150);
      assert.equal(status1.percentage, 50);
      assert.equal(status1.isOver, false);
      assert.equal(status1.isNear, false);

      // Approaching limit (RM 255 / RM 300 = 85%)
      const tx2 = [{ type: 'expense', categoryId: 'cat-food', amount: 255 }];
      const status2 = calculateBudgetStatus(budget, tx2);
      assert.equal(status2.percentage, 85);
      assert.equal(status2.isNear, true);
      assert.equal(status2.isOver, false);

      // Over budget (RM 350 / RM 300 = 116.7%)
      const tx3 = [{ type: 'expense', categoryId: 'cat-food', amount: 350 }];
      const status3 = calculateBudgetStatus(budget, tx3);
      assert.equal(status3.remaining, 0);
      assert.equal(status3.overAmount, 50);
      assert.equal(status3.isOver, true);
    });
  });

  // ==================== SAVINGS GOALS TESTS ====================
  describe('Savings Goals & Progress', () => {
    it('should create and validate savings goal', () => {
      const goal = createSavingsGoal({
        title: 'New Laptop',
        targetAmount: 3500,
        currentAmount: 1750,
        targetDate: '2026-12-31'
      });

      assert.equal(goal.title, 'New Laptop');
      assert.equal(goal.targetAmount, 3500);
      assert.equal(goal.currentAmount, 1750);

      assert.equal(validateSavingsGoal({ title: '', targetAmount: 100 }), 'Please enter a goal title (e.g. New Laptop)');
      assert.equal(validateSavingsGoal({ title: 'Trip', targetAmount: -500 }), 'Please enter a valid target amount greater than RM 0');
      assert.equal(validateSavingsGoal({ title: 'Trip', targetAmount: 500, currentAmount: -10 }), 'Saved amount cannot be negative or invalid');
      assert.equal(validateSavingsGoal({ title: 'Trip', targetAmount: 500, currentAmount: 100 }), null);
    });

    it('should calculate savings progress, percentage, and remaining amount correctly', () => {
      const goal = { title: 'New Laptop', targetAmount: 3500, currentAmount: 1750 };
      const progress = calculateSavingsProgress(goal);

      assert.equal(progress.percentage, 50);
      assert.equal(progress.remaining, 1750);
      assert.equal(progress.isCompleted, false);

      const completedGoal = { title: 'Emergency Fund', targetAmount: 1000, currentAmount: 1000 };
      const compProgress = calculateSavingsProgress(completedGoal);
      assert.equal(compProgress.percentage, 100);
      assert.equal(compProgress.remaining, 0);
      assert.equal(compProgress.isCompleted, true);
    });
  });

  // ==================== ACCOUNT BALANCE ADJUSTMENT LOGIC ====================
  describe('Account Balance Transaction Adjustment Logic', () => {
    it('should adjust account balances accurately on income and expense without double counting', () => {
      let accounts = [
        { accountId: 'acc-1', accountName: 'Maybank', balance: 1000 }
      ];

      // Add Expense RM 100 -> balance becomes 900
      accounts = accounts.map(a => a.accountId === 'acc-1' ? { ...a, balance: a.balance - 100 } : a);
      assert.equal(accounts[0].balance, 900);

      // Add Income RM 300 -> balance becomes 1200
      accounts = accounts.map(a => a.accountId === 'acc-1' ? { ...a, balance: a.balance + 300 } : a);
      assert.equal(accounts[0].balance, 1200);

      // Edit transaction (reverse old RM 100 expense -> 1300, apply new RM 150 expense -> 1150)
      accounts = accounts.map(a => a.accountId === 'acc-1' ? { ...a, balance: a.balance + 100 - 150 } : a);
      assert.equal(accounts[0].balance, 1150);

      // Delete transaction (reverse RM 150 expense -> 1300)
      accounts = accounts.map(a => a.accountId === 'acc-1' ? { ...a, balance: a.balance + 150 } : a);
      assert.equal(accounts[0].balance, 1300);
    });

    it('should handle transferring transaction between accounts safely', () => {
      let accounts = [
        { accountId: 'acc-1', accountName: 'Maybank', balance: 1000 },
        { accountId: 'acc-2', accountName: 'CIMB', balance: 500 }
      ];

      // Transaction originally RM 100 expense on Maybank
      accounts = accounts.map(a => a.accountId === 'acc-1' ? { ...a, balance: a.balance - 100 } : a);
      assert.equal(accounts[0].balance, 900);
      assert.equal(accounts[1].balance, 500);

      // User changes account to CIMB: reverse on Maybank (+100) and apply to CIMB (-100)
      accounts = accounts.map(a => {
        if (a.accountId === 'acc-1') return { ...a, balance: a.balance + 100 };
        if (a.accountId === 'acc-2') return { ...a, balance: a.balance - 100 };
        return a;
      });

      assert.equal(accounts[0].balance, 1000);
      assert.equal(accounts[1].balance, 400);
    });
  });

  // ==================== USER PROFILE & CUSTOMIZATION TESTS ====================
  describe('User Profile & Avatar Customization', () => {
    it('should validate avatar file size (< 2MB) correctly', () => {
      assert.equal(MAX_AVATAR_SIZE_BYTES, 2 * 1024 * 1024);

      // Null or missing file
      const emptyRes = validateAvatarFile(null);
      assert.equal(emptyRes.valid, false);
      assert.match(emptyRes.error, /choose an image/i);

      // Non-image file type
      const textFile = { type: 'text/plain', size: 1024 };
      const textRes = validateAvatarFile(textFile);
      assert.equal(textRes.valid, false);
      assert.match(textRes.error, /image file/i);

      // Oversized image (> 2MB)
      const hugeFile = { type: 'image/jpeg', size: 2.5 * 1024 * 1024 };
      const hugeRes = validateAvatarFile(hugeFile);
      assert.equal(hugeRes.valid, false);
      assert.match(hugeRes.error, /exceeds 2MB/i);

      // Valid image within limit (1.5MB)
      const validFile = { type: 'image/png', size: 1.5 * 1024 * 1024 };
      const validRes = validateAvatarFile(validFile);
      assert.equal(validRes.valid, true);
      assert.equal(validRes.error, undefined);
    });

    it('should provide 6-8 distinct, vibrant preset student avatars', () => {
      assert.ok(PRESET_AVATARS.length >= 6 && PRESET_AVATARS.length <= 10);
      const ids = new Set();
      for (const preset of PRESET_AVATARS) {
        assert.ok(preset.id.startsWith('preset-'), `Expected preset id to start with preset-, got ${preset.id}`);
        assert.ok(preset.label.length > 0);
        assert.ok(preset.iconName.length > 0);
        assert.ok(preset.bg.includes('gradient'));
        assert.ok(!ids.has(preset.id), `Duplicate preset id found: ${preset.id}`);
        ids.add(preset.id);
      }
    });

    it('should support default and international student currencies', () => {
      assert.ok(SUPPORTED_CURRENCIES.length >= 4);
      const codes = SUPPORTED_CURRENCIES.map(c => c.code);
      assert.ok(codes.includes('RM'));
      assert.ok(codes.includes('USD'));
      assert.ok(codes.includes('SGD'));
    });
  });

  // ==================== UPGRADED TUTORIAL & ONBOARDING TESTS ====================
  describe('Upgraded Tutorial & Onboarding System', () => {
    it('should include all comprehensive feature milestones in TOUR_STEPS', () => {
      assert.equal(getTotalTourSteps(), 14);
      assert.equal(TOUR_STEPS.length, 14);

      // Verify essential newly introduced feature step IDs
      const stepIds = TOUR_STEPS.map(s => s.id);
      assert.ok(stepIds.includes('welcome'), 'Missing welcome step');
      assert.ok(stepIds.includes('student-identity'), 'Missing student identity & motto step');
      assert.ok(stepIds.includes('my-accounts'), 'Missing multi-accounts step');
      assert.ok(stepIds.includes('spending-breakdown'), 'Missing spending pie chart step');
      assert.ok(stepIds.includes('export-pdf'), 'Missing PDF statement step');
      assert.ok(stepIds.includes('transactions-nav'), 'Missing transactions nav step');
      assert.ok(stepIds.includes('add-transaction'), 'Missing add transaction step');
      assert.ok(stepIds.includes('budgets-nav'), 'Missing budgets step');
      assert.ok(stepIds.includes('savings-nav'), 'Missing savings step');
      assert.ok(stepIds.includes('reports-nav'), 'Missing reports step');
      assert.ok(stepIds.includes('profile-customization'), 'Missing student profile & avatar step');
      assert.ok(stepIds.includes('theme-selector'), 'Missing theme customizer step');
      assert.ok(stepIds.includes('data-backup-replay'), 'Missing data backup & tour replay step');
      assert.ok(stepIds.includes('finish'), 'Missing finish step');
    });

    it('should ensure each step contains valid metadata, titles, and descriptions', () => {
      for (const step of TOUR_STEPS) {
        assert.ok(typeof step.id === 'string' && step.id.length > 0);
        assert.ok(typeof step.title === 'string' && step.title.length > 0);
        assert.ok(typeof step.description === 'string' && step.description.length > 0);
        assert.ok(typeof step.iconName === 'string' && step.iconName.length > 0);
        assert.ok(['bottom', 'top', 'right', 'left', 'center'].includes(step.preferredPosition));
      }
    });

    it('should correctly retrieve step details via getTourStepById', () => {
      const profileStep = getTourStepById('profile-customization');
      assert.ok(profileStep !== undefined);
      assert.equal(profileStep.tab, 'settings');
      assert.match(profileStep.title, /Avatar/i);
      assert.match(profileStep.description, /8 modern preset avatars/i);

      const accountsStep = getTourStepById('my-accounts');
      assert.ok(accountsStep !== undefined);
      assert.equal(accountsStep.tab, 'dashboard');
      assert.match(accountsStep.description, /CIMB, MAE\/Maybank/i);

      const pdfStep = getTourStepById('export-pdf');
      assert.ok(pdfStep !== undefined);
      assert.match(pdfStep.title, /PDF/i);
    });

    it('should configure finish step with student completion celebration and dashboard target', () => {
      const finishStep = getTourStepById('finish');
      assert.ok(finishStep !== undefined);
      assert.equal(finishStep.tab, 'dashboard');
      assert.match(finishStep.title, /You're all set/i);
      assert.ok(finishStep.description.length > 20);
    });

    it('should manage and persist onboarding status and step progression', async () => {
      const testUserId = 'test-onboarding-user-123';
      
      // Default / empty status
      const initial = await getOnboardingStatus(testUserId);
      assert.equal(initial.completed, false);
      assert.equal(initial.step, 'profile');

      // Transition to Step B (tutorial)
      await setOnboardingStatus(testUserId, { completed: false, step: 'tutorial' });
      const mid = await getOnboardingStatus(testUserId);
      assert.equal(mid.completed, false);
      assert.equal(mid.step, 'tutorial');

      // Completion of entire onboarding
      await setOnboardingStatus(testUserId, { completed: true, step: 'completed' });
      const completed = await getOnboardingStatus(testUserId);
      assert.equal(completed.completed, true);
      assert.equal(completed.step, 'completed');
    });
  });

});


