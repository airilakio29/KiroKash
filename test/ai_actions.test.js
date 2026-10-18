import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_TYPES,
  extractActionIntent,
  validateActionProposal,
  registerPendingAction,
  executeAction,
  cancelAction,
  getActionHistory,
  resolveCategory,
  resolveAccount,
  parseDate
} from '../functions/src/ai/actionService.js';

import {
  handleExecuteActionRequest,
  handleCancelActionRequest,
  handleActionHistoryRequest,
  handleAIChatRequest
} from '../functions/src/ai/chatFunction.js';

import { PRESET_THEMES } from '../src/utils/themeEngine.js';

describe('KampusKash Phase 3 — AI Actions & Financial Automation Suite', () => {

  const mockCategories = [
    { id: 'cat-food', name: 'Food & Dining', type: 'expense' },
    { id: 'cat-books', name: 'Books & Supplies', type: 'expense' },
    { id: 'cat-transport', name: 'Transport & Commute', type: 'expense' },
    { id: 'cat-allowance', name: 'Allowance', type: 'income' }
  ];

  const mockAccounts = [
    { accountId: 'acc-maybank', accountName: 'Maybank Student', institution: 'Maybank', balance: 500.00, accountType: 'savings' },
    { accountId: 'acc-tng', accountName: 'Touch n Go eWallet', institution: 'TnG', balance: 75.00, accountType: 'ewallet' }
  ];

  const mockBudgets = [
    { id: 'b-books', categoryId: 'cat-books', monthlyLimit: 120.00 }
  ];

  const mockSavingsGoals = [
    { id: 'goal-laptop', title: 'Laptop Fund', targetAmount: 2400.00, currentAmount: 600.00, targetDate: '2026-12-31' }
  ];

  const mockUserData = {
    user: { id: 'student-user-123', username: 'Ahmad Faiz' },
    profile: { username: 'Ahmad Faiz' },
    categories: mockCategories,
    accounts: mockAccounts,
    budgets: mockBudgets,
    savingsGoals: mockSavingsGoals
  };

  const createMockAuthToken = (userId = 'student-user-123') => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      sub: userId,
      email: `${userId}@student.edu.my`,
      aud: 'kampuskash-82b7c',
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64');
    return `Bearer ${header}.${payload}.sig`;
  };

  // 1. Create a budget through AI
  describe('1. Create Budget Proposal', () => {
    it('should extract CREATE_BUDGET intent from natural language "Create a monthly food budget of RM250"', () => {
      const intent = extractActionIntent('Create a monthly food budget of RM250', mockUserData);
      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, ACTION_TYPES.CREATE_BUDGET);
      assert.equal(intent.payload.monthlyLimit, 250);
      assert.equal(intent.payload.categoryName, 'Food & Dining');

      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, true);
      assert.equal(validation.amount, 250);
      assert.equal(validation.category, 'Food & Dining');
    });

    it('should register budget proposal as pending and not yet execute it', () => {
      const intent = extractActionIntent('Help me create a RM300 transport budget', mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-user-123', validation);

      assert.equal(pending.status, 'pending');
      assert.equal(pending.userId, 'student-user-123');
      assert.ok(pending.actionId.startsWith('act-'));
      assert.ok(pending.expiresAt > Date.now());
    });
  });

  // 2. Cancel a budget proposal
  describe('2. Cancel Action Proposal', () => {
    it('should allow user to cancel a pending budget proposal before approval', () => {
      const intent = extractActionIntent('Create a food budget of RM200', mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-user-123', validation);

      const cancelResult = cancelAction(pending.actionId, 'student-user-123');
      assert.equal(cancelResult.success, true);
      assert.equal(cancelResult.action.status, 'cancelled');

      // Attempting to execute cancelled action should fail
      const execResult = executeAction(pending.actionId, 'student-user-123', mockUserData);
      assert.equal(execResult.success, false);
      assert.ok(execResult.error.includes('cancelled'));
    });
  });

  // 3. Update an existing budget
  describe('3. Update Existing Budget', () => {
    it('should detect UPDATE_BUDGET intent for an existing category and validate positive amount', () => {
      const intent = extractActionIntent('Update my books budget to RM180', mockUserData);
      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, ACTION_TYPES.UPDATE_BUDGET);
      assert.equal(intent.payload.monthlyLimit, 180);
      assert.equal(intent.payload.categoryName, 'Books & Supplies');

      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, true);
      assert.equal(validation.amount, 180);
    });

    it('should prevent duplicate budgets when attempting to create a second budget for an existing category', () => {
      const intent = extractActionIntent('Create a books budget of RM150', mockUserData);
      // 'cat-books' is already in mockBudgets!
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('already exists'));
    });
  });

  // 4. Create a savings goal
  describe('4. Create Savings Goal', () => {
    it('should parse goal title, target amount, and target date', () => {
      const intent = extractActionIntent('Create a savings goal of RM1200 for Emergency Fund by 2026-11-30', mockUserData);
      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, ACTION_TYPES.CREATE_SAVINGS_GOAL);
      assert.equal(intent.payload.targetAmount, 1200);
      assert.equal(intent.payload.title, 'Emergency Fund');
      assert.equal(intent.payload.targetDate, '2026-11-30');

      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, true);
      assert.equal(validation.amount, 1200);
    });
  });

  // 5. Update a savings goal
  describe('5. Update Savings Goal', () => {
    it('should resolve existing savings goal by title and update target amount', () => {
      const intent = extractActionIntent('Update my Laptop Fund savings goal to RM3000', mockUserData);
      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, ACTION_TYPES.UPDATE_SAVINGS_GOAL);
      assert.equal(intent.payload.targetAmount, 3000);
      assert.equal(intent.payload.goalId, 'goal-laptop');

      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, true);
    });

    it('should reject updating non-existent savings goal', () => {
      const validation = validateActionProposal(ACTION_TYPES.UPDATE_SAVINGS_GOAL, {
        goalId: 'goal-nonexistent',
        targetAmount: 500
      }, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('not found'));
    });
  });

  // 6. Create an expense transaction
  describe('6. Create Expense Transaction', () => {
    it('should extract expense amount, category, account, and date from "I spent RM15 on lunch today"', () => {
      const intent = extractActionIntent('I spent RM15 on lunch today', mockUserData);
      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, ACTION_TYPES.CREATE_TRANSACTION);
      assert.equal(intent.payload.type, 'expense');
      assert.equal(intent.payload.amount, 15);
      assert.equal(intent.payload.categoryName, 'Food & Dining');
      assert.ok(intent.payload.date);

      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, true);
      assert.equal(validation.amount, 15);
    });
  });

  // 7. Create an income transaction
  describe('7. Create Income Transaction', () => {
    it('should extract income amount, category, and date from "I received RM800 pocket money yesterday"', () => {
      const intent = extractActionIntent('I received RM800 pocket money yesterday', mockUserData);
      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, ACTION_TYPES.CREATE_TRANSACTION);
      assert.equal(intent.payload.type, 'income');
      assert.equal(intent.payload.amount, 800);
      assert.equal(intent.payload.categoryName, 'Allowance');
      assert.ok(intent.payload.date);

      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      assert.equal(validation.valid, true);
      assert.equal(validation.amount, 800);
    });
  });

  // 8. Missing transaction information
  describe('8. Missing Transaction Information', () => {
    it('should prompt user when essential transaction amount is missing', () => {
      const intent = extractActionIntent('I spent on lunch with friends', mockUserData);
      assert.equal(intent.hasAction, false);
      assert.equal(intent.missingInfo, true);
      assert.equal(intent.missingField, 'amount');
      assert.ok(intent.promptReply.includes('how much'));
    });

    it('should prompt user when essential budget amount is missing', () => {
      const intent = extractActionIntent('Create a food budget', mockUserData);
      assert.equal(intent.hasAction, false);
      assert.equal(intent.missingInfo, true);
      assert.equal(intent.missingField, 'monthlyLimit');
      assert.ok(intent.promptReply.includes('What monthly budget limit'));
    });
  });

  // 9. Invalid amounts
  describe('9. Invalid Amounts Validation', () => {
    it('should reject negative transaction amounts', () => {
      const validation = validateActionProposal(ACTION_TYPES.CREATE_TRANSACTION, {
        amount: -50,
        title: 'Refund',
        type: 'expense',
        categoryId: 'cat-food'
      }, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('greater than RM 0'));
    });

    it('should reject zero transaction amount', () => {
      const validation = validateActionProposal(ACTION_TYPES.CREATE_TRANSACTION, {
        amount: 0,
        title: 'Free Coffee',
        type: 'expense',
        categoryId: 'cat-food'
      }, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('greater than RM 0'));
    });

    it('should reject non-numeric budget limit', () => {
      const validation = validateActionProposal(ACTION_TYPES.CREATE_BUDGET, {
        monthlyLimit: 'invalid',
        categoryId: 'cat-food'
      }, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('greater than RM 0'));
    });
  });

  // 10. Invalid dates
  describe('10. Invalid Dates Validation', () => {
    it('should reject invalid or malformed transaction date strings', () => {
      const validation = validateActionProposal(ACTION_TYPES.CREATE_TRANSACTION, {
        amount: 25,
        title: 'Stationery',
        type: 'expense',
        categoryId: 'cat-books',
        date: 'not-a-date'
      }, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('Invalid date'));
    });

    it('should reject invalid savings goal target date', () => {
      const validation = validateActionProposal(ACTION_TYPES.CREATE_SAVINGS_GOAL, {
        title: 'New Goal',
        targetAmount: 500,
        targetDate: '2020-00-99'
      }, mockUserData);
      assert.equal(validation.valid, false);
      assert.ok(validation.error.includes('Invalid target date'));
    });
  });

  // 11. Duplicate approval attempts (anti-replay check)
  describe('11. Anti-Replay & Duplicate Approval Protection', () => {
    it('should disallow approving or executing the same action proposal more than once', () => {
      const intent = extractActionIntent('I spent RM20 on books', mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-user-123', validation);

      // First execution succeeds
      const firstExec = executeAction(pending.actionId, 'student-user-123', mockUserData);
      assert.equal(firstExec.success, true);
      assert.equal(firstExec.action.status, 'approved');

      // Duplicate execution attempt MUST be rejected
      const secondExec = executeAction(pending.actionId, 'student-user-123', mockUserData);
      assert.equal(secondExec.success, false);
      assert.ok(secondExec.error.includes('already approved'));
    });
  });

  // 12. Expired action proposals
  describe('12. Expiration of Pending Proposals', () => {
    it('should reject execution of an action that has exceeded the 15-minute expiration window', () => {
      const intent = extractActionIntent('I spent RM10 on drinks', mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-user-123', validation);

      // Artificially expire the action proposal
      pending.expiresAt = Date.now() - 1000;

      const result = executeAction(pending.actionId, 'student-user-123', mockUserData);
      assert.equal(result.success, false);
      assert.ok(result.error.includes('expired'));
      assert.equal(result.status, 'expired');
    });
  });

  // 13. User tries to modify another user's records
  describe('13. Cross-User Data Isolation & Ownership Validation', () => {
    it('should prevent user B from executing or approving an action created by user A', () => {
      const intent = extractActionIntent('Create a food budget of RM300', mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-user-A', validation);

      // User B attempts to execute User A's pending action
      const attackerExec = executeAction(pending.actionId, 'student-user-B', mockUserData);
      assert.equal(attackerExec.success, false);
      assert.ok(attackerExec.error.includes('Unauthorized') || attackerExec.error.includes('ownership'));

      // User B attempts to cancel User A's pending action
      const attackerCancel = cancelAction(pending.actionId, 'student-user-B');
      assert.equal(attackerCancel.success, false);
      assert.ok(attackerCancel.error.includes('Unauthorized') || attackerCancel.error.includes('ownership'));
    });
  });

  // 14. API failure during execution
  describe('14. Robust Error Handling on Execution Failures', () => {
    it('should return 400 with helpful error message when executing an unknown actionId', async () => {
      const req = {
        headers: { authorization: createMockAuthToken('student-user-123') },
        body: { actionId: 'act-unknown-99999' }
      };
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonPayload = data; return res; }
      };

      await handleExecuteActionRequest(req, res);
      assert.equal(statusCode, 400);
      assert.equal(jsonPayload.success, false);
      assert.ok(jsonPayload.error.includes('not found'));
    });
  });

  // 15. Frontend refresh while action is pending (Action History persistence)
  describe('15. Action History Persistence & Audit Trail', () => {
    it('should record proposed, approved, and cancelled actions in action history', () => {
      const intent = extractActionIntent('I spent RM18 on dinner', mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-audit-user', validation);

      executeAction(pending.actionId, 'student-audit-user', mockUserData);

      const history = getActionHistory('student-audit-user');
      assert.ok(history.length >= 1);
      const entry = history.find(h => h.actionId === pending.actionId);
      assert.ok(entry);
      assert.equal(entry.status, 'approved');
      assert.equal(entry.actionType, ACTION_TYPES.CREATE_TRANSACTION);
      assert.equal(entry.amount, 18);
    });

    it('should support action history retrieval via API endpoint', async () => {
      const req = {
        headers: { authorization: createMockAuthToken('student-audit-user') },
        query: {}
      };
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonPayload = data; return res; }
      };

      await handleActionHistoryRequest(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonPayload.success, true);
      assert.ok(Array.isArray(jsonPayload.history));
    });
  });

  // 16. Existing dashboard updates correctly after successful actions
  describe('16. Single Source of Truth & Account Balance Deductions', () => {
    it('should update account balance correctly when creating transaction without double counting', () => {
      const startBalance = mockAccounts[0].balance; // 500.00
      const txAmount = 45.00;

      const intent = extractActionIntent(`I spent RM${txAmount} on Maybank Student for books`, mockUserData);
      const validation = validateActionProposal(intent.actionType, intent.payload, mockUserData);
      const pending = registerPendingAction('student-user-123', validation);

      const execResult = executeAction(pending.actionId, 'student-user-123', mockUserData);
      assert.equal(execResult.success, true);
      assert.ok(execResult.updatedData);

      // Verify transaction added
      const addedTx = execResult.updatedData.transactions.find(t => t.id === execResult.action.details.recordId);
      assert.ok(addedTx);
      assert.equal(addedTx.amount, txAmount);

      // Verify single source of truth balance adjustment
      const updatedAcc = execResult.updatedData.accounts.find(a => a.accountId === addedTx.accountId);
      assert.equal(updatedAcc.balance, startBalance - txAmount); // 455.00
    });
  });

  // 17. All existing themes and mobile layouts
  describe('17. Theme Consistency & Design System Verification', () => {
    it('should ensure all 10 KampusKash themes provide tokens required for Action Confirmation cards', () => {
      const requiredTokens = [
        '--bg-card',
        '--bg-card-subtle',
        '--primary',
        '--primary-hover',
        '--text-main',
        '--text-muted',
        '--border-light',
        '--income',
        '--expense'
      ];

      assert.equal(PRESET_THEMES.length, 10);
      PRESET_THEMES.forEach(theme => {
        requiredTokens.forEach(token => {
          assert.ok(
            theme.tokens[token] !== undefined,
            `Theme ${theme.name} must define token ${token} for AI Action cards`
          );
        });
      });
    });
  });
});
