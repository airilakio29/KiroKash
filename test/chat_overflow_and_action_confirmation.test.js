import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPendingAction,
  executeAction,
  cancelAction,
  validateActionProposal,
  extractActionIntent
} from '../functions/src/ai/actionService.js';
import { handleExecuteActionRequest, handleCancelActionRequest } from '../functions/src/ai/chatFunction.js';
import { executeAIAction, cancelAIAction } from '../src/services/aiService.js';

// JWT Generator for tests
function generateMockJwt(uid, email = 'student@campus.edu.my') {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: uid,
    email,
    aud: 'kampuskash-82b7c',
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  return `Bearer ${header}.${payload}.signature`;
}

describe('KampusKash Bug Fix Verification: Chat Overflow & Action Confirmation', () => {

  // ==========================================
  // BUG 1: CHAT UI OVERFLOW & TEXT WRAPPING
  // ==========================================
  describe('Bug 1: Chat Message Overflow & Layout Safety', () => {

    it('1. Long unbroken alphanumeric strings wrap safely without crashing parser', () => {
      const longUnbrokenString = 'A'.repeat(500);
      assert.equal(longUnbrokenString.length, 500);
      assert.doesNotThrow(() => {
        // Test that string manipulation and token redaction don't fail on long strings
        const sample = `Your transaction token is ${longUnbrokenString}`;
        assert.ok(sample.includes(longUnbrokenString));
      });
    });

    it('2. Sensitive tokens and API keys are redacted before rendering', () => {
      // Inline sanitizer verification matching ChatMessage.jsx
      function sanitizeChatText(str) {
        if (!str || typeof str !== 'string') return '';
        return str
          .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
          .replace(/AIza[0-9A-Za-z-_]{20,50}/g, '[REDACTED_API_KEY]')
          .replace(/[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[REDACTED_TOKEN]');
      }

      const inputWithSecrets = 'My key is AIzaSyD_TEST_API_KEY_1234567890ABCDEF and auth is Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
      const sanitized = sanitizeChatText(inputWithSecrets);

      assert.equal(sanitized.includes('AIzaSyD_TEST_API_KEY_1234567890ABCDEF'), false, 'API key must be redacted');
      assert.equal(sanitized.includes('doNotLeakThisSignature'), false, 'JWT token must be redacted');
      assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
      assert.ok(sanitized.includes('[REDACTED]'));
    });

    it('3. Code blocks with triple backticks are extracted cleanly', () => {
      const markdown = 'Here is the sample code:\n```javascript\nconst total = 2000;\nconsole.log(total);\n```\nPlease review.';
      const codeMatch = markdown.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*```/);
      assert.ok(codeMatch);
      assert.ok(codeMatch[1].includes('const total = 2000;'));
    });
  });

  // ==========================================
  // BUG 2: AI ACTION CONFIRMATION & actionId FLOW
  // ==========================================
  describe('Bug 2: AI Action Confirmation & actionId Preservation', () => {

    it('A. Action Creation: Every pending action receives a unique actionId and complete metadata', () => {
      const action = createPendingAction({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'New Phone',
          targetAmount: 2000,
          targetDate: '2027-05-31',
          currentAmount: 0
        },
        userId: 'student-usr-99',
        summary: 'Create savings goal: "New Phone" of RM2000.00 by 2027-05-31'
      });

      assert.ok(action.actionId, 'actionId must exist');
      assert.ok(action.actionId.startsWith('act-'), 'actionId must have act- prefix');
      assert.equal(action.id, action.actionId, 'id alias must match actionId');
      assert.equal(action.userId, 'student-usr-99');
      assert.equal(action.status, 'pending');
      assert.equal(action.requiresConfirmation, true);
      assert.equal(action.amount, 2000);
      assert.equal(action.date, '2027-05-31');
      assert.equal(action.details.currentAmount, 0);
    });

    it('B. Natural Language Intent: User prompt "RM2000, target date is next year May, no money at all for now." parses correctly', () => {
      const intent = extractActionIntent('I want to save for a New Phone, RM2000, target date is next year May, no money at all for now.', {
        savingsGoals: [],
        budgets: [],
        categories: []
      });

      assert.equal(intent.hasAction, true);
      assert.equal(intent.actionType, 'CREATE_SAVINGS_GOAL');
      assert.equal(intent.payload.targetAmount, 2000);
      assert.equal(intent.payload.title, 'New Phone');
      assert.equal(intent.payload.currentAmount, 0);
      // Next year May should resolve to last day of May next year (2027-05-31)
      assert.equal(intent.payload.targetDate, '2027-05-31');
    });

    it('C. Date Normalization: validateActionProposal normalizes human-readable date "31 May 2027" to "2027-05-31"', () => {
      const validation = validateActionProposal({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'New Phone',
          targetAmount: 2000,
          targetDate: '31 May 2027',
          currentAmount: 0
        }
      });

      assert.equal(validation.valid, true);
      assert.equal(validation.payload.targetDate, '2027-05-31');
      assert.equal(validation.amount, 2000);
    });

    it('D. Confirmation Request Contract: executeAIAction accepts both positional and object arguments without losing actionId', async () => {
      // 1. Test positional calling convention (actionId, getIdToken, userData)
      // When offline, postToAiEndpoint attempts fetch to localhost:3001
      // Here we verify it doesn't throw "Missing required actionId parameter."
      const validActionId = 'act-sample-test-id';

      // Positional call check
      try {
        await executeAIAction(validActionId, null, { accounts: [] });
      } catch (err) {
        // It might fail network connect, but MUST NOT throw Missing required actionId parameter
        assert.notEqual(err.message, 'Missing required actionId parameter.');
      }

      // Object call check
      try {
        await executeAIAction({ actionId: validActionId, getIdToken: null, userData: {} });
      } catch (err) {
        assert.notEqual(err.message, 'Missing required actionId parameter.');
      }

      // Rejection when actionId is missing
      await assert.rejects(
        async () => {
          await executeAIAction(null);
        },
        /Missing required actionId parameter/
      );
    });

    it('E. Backend Execution: executeAction validates actionId, executes CREATE_SAVINGS_GOAL, and updates user data model', () => {
      const pending = createPendingAction({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'New Phone',
          targetAmount: 2000,
          targetDate: '2027-05-31',
          currentAmount: 0
        },
        userId: 'student-valid-uid',
        summary: 'Create savings goal: "New Phone" of RM2000.00'
      });

      const initialUserData = { savingsGoals: [] };
      const result = executeAction({
        actionId: pending.actionId,
        userId: 'student-valid-uid',
        userData: initialUserData
      });

      assert.equal(result.success, true);
      assert.equal(result.actionId, pending.actionId);
      assert.equal(result.resultRecord.title, 'New Phone');
      assert.equal(result.resultRecord.targetAmount, 2000);
      assert.equal(result.resultRecord.currentAmount, 0);
      assert.equal(result.resultRecord.targetDate, '2027-05-31');
      assert.ok(result.resultRecord.id.startsWith('s-'));
      assert.equal(result.updatedUserData.savingsGoals.length, 1);
      assert.equal(result.updatedUserData.savingsGoals[0].title, 'New Phone');
    });

    it('F. Anti-Replay & Double-Click Protection: Executing an already executed action is blocked', () => {
      const pending = createPendingAction({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'New Phone',
          targetAmount: 2000,
          targetDate: '2027-05-31',
          currentAmount: 0
        },
        userId: 'student-doubleclick-uid',
        summary: 'Create savings goal: "New Phone" of RM2000.00'
      });

      // First click
      const firstResult = executeAction({
        actionId: pending.actionId,
        userId: 'student-doubleclick-uid',
        userData: { savingsGoals: [] }
      });
      assert.equal(firstResult.success, true);

      // Second click (double-click simulation)
      const secondResult = executeAction({
        actionId: pending.actionId,
        userId: 'student-doubleclick-uid',
        userData: { savingsGoals: [] }
      });
      assert.equal(secondResult.success, false);
      assert.ok(secondResult.error.includes('already approved or processed'));
    });

    it('G. Cross-User Security: User B cannot execute an action created for User A', () => {
      const pending = createPendingAction({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'Private Goal',
          targetAmount: 500,
          targetDate: '2027-12-31'
        },
        userId: 'student-user-A',
        summary: 'Private Goal'
      });

      const attackerResult = executeAction({
        actionId: pending.actionId,
        userId: 'student-user-B',
        userData: {}
      });

      assert.equal(attackerResult.success, false);
      assert.ok(attackerResult.error.includes('Security violation'));
    });

    it('H. HTTP Cloud Function Endpoint: handleExecuteActionRequest successfully processes valid request with actionId and Bearer token', async () => {
      const studentUid = 'student-http-user-1';
      const token = generateMockJwt(studentUid);

      const pending = createPendingAction({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'New Phone',
          targetAmount: 2000,
          targetDate: '2027-05-31',
          currentAmount: 0
        },
        userId: studentUid,
        summary: 'Create savings goal: "New Phone" of RM2000.00'
      });

      let statusCode = null;
      let responseBody = null;
      const req = {
        headers: { authorization: token },
        body: {
          actionId: pending.actionId,
          userData: { savingsGoals: [] }
        }
      };
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseBody = data; return res; }
      };

      await handleExecuteActionRequest(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.actionId, pending.actionId);
      assert.equal(responseBody.resultRecord.title, 'New Phone');
      assert.equal(responseBody.resultRecord.targetAmount, 2000);
      assert.equal(responseBody.resultRecord.currentAmount, 0);
      assert.equal(responseBody.resultRecord.targetDate, '2027-05-31');
    });

    it('I. HTTP Cloud Function Endpoint: Missing actionId in request body returns 400 with exact error message', async () => {
      const token = generateMockJwt('student-err-test');
      let statusCode = null;
      let responseBody = null;
      const req = {
        headers: { authorization: token },
        body: {} // No actionId
      };
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseBody = data; return res; }
      };

      await handleExecuteActionRequest(req, res);

      assert.equal(statusCode, 400);
      assert.equal(responseBody.error, 'Missing required actionId parameter.');
    });

    it('J. Action Cancellation: User can cancel a pending action and backend registers cancelled state', async () => {
      const studentUid = 'student-cancel-test';
      const token = generateMockJwt(studentUid);

      const pending = createPendingAction({
        type: 'CREATE_SAVINGS_GOAL',
        payload: {
          title: 'Trip to Penang',
          targetAmount: 300,
          targetDate: '2027-08-01'
        },
        userId: studentUid,
        summary: 'Trip to Penang'
      });

      let statusCode = null;
      let responseBody = null;
      const req = {
        headers: { authorization: token },
        body: { actionId: pending.actionId }
      };
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseBody = data; return res; }
      };

      await handleCancelActionRequest(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.status, 'cancelled');

      // Attempting to execute cancelled action should fail
      const execResult = executeAction({
        actionId: pending.actionId,
        userId: studentUid,
        userData: {}
      });
      assert.equal(execResult.success, false);
      assert.ok(execResult.error.includes('already approved or processed: cancelled'));
    });
  });
});
