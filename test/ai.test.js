import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {}

import {
  sanitizeUserInput,
  buildFinancialSummary,
  formatContextForPrompt
} from '../functions/src/ai/financialContextService.js';

import {
  callGeminiAPI,
  generateLocalFallbackResponse,
  executeAIChat
} from '../functions/src/ai/geminiProvider.js';

import {
  checkRateLimit,
  verifyFirebaseTokenClaims,
  handleAIChatRequest
} from '../functions/src/ai/chatFunction.js';

import { SYSTEM_PROMPT } from '../functions/src/ai/systemPrompt.js';
import { PRESET_THEMES } from '../src/utils/themeEngine.js';

describe('KampusKash AI Financial Assistant Suite', () => {

  // Test 1: New user opens the chatbot (empty data)
  describe('1. New User & Empty Financial Context', () => {
    it('should build financial summary safely for brand new user with 0 transactions and accounts', () => {
      const summary = buildFinancialSummary({
        profile: { username: 'Fresh Student', university: 'UTP' },
        accounts: [],
        transactions: [],
        budgets: [],
        savingsGoals: []
      });

      assert.equal(summary.student.username, 'Fresh Student');
      assert.equal(summary.accounts.totalBalance, 0);
      assert.equal(summary.spending.hasTransactions, false);
      assert.equal(summary.spending.totalTransactionsCount, 0);
      assert.equal(summary.spending.currentMonth.expenses, 0);
      assert.equal(summary.budgets.length, 0);
      assert.equal(summary.savingsGoals.length, 0);
    });

    it('should format context for prompt indicating 0 recorded transactions', () => {
      const summary = buildFinancialSummary({});
      const contextText = formatContextForPrompt(summary);
      assert.ok(contextText.includes('0 recorded transactions'));
      assert.ok(contextText.includes('No linked financial accounts recorded yet'));
    });
  });

  // Test 2 & 5: Empty transactions query handling
  describe('2. Empty State User Query Handling', () => {
    it('should explain that no transactions exist rather than inventing numbers', () => {
      const summary = buildFinancialSummary({
        profile: { username: 'Newbie' },
        transactions: [],
        budgets: [],
        savingsGoals: []
      });

      const reply = generateLocalFallbackResponse({
        userQuery: 'How much did I spend this month on food?',
        summary
      });

      assert.ok(reply.includes("haven't recorded any transactions yet"), 'Should state no transactions recorded');
      assert.ok(!reply.includes('RM150.00'), 'Should not invent arbitrary numbers');
    });
  });

  // Test 3: Spending Analysis with Real Data
  describe('3. Spending Analysis & Calculations', () => {
    const mockUserData = {
      profile: { username: 'Nurul Huda', university: 'UM' },
      categories: [
        { id: 'cat-food', name: 'Food & Dining', type: 'expense' },
        { id: 'cat-books', name: 'Books & Supplies', type: 'expense' },
        { id: 'cat-allowance', name: 'Allowance', type: 'income' }
      ],
      accounts: [
        { accountId: 'acc-1', accountName: 'Maybank Student', balance: 450.00, accountType: 'savings' }
      ],
      transactions: [
        { id: 't-1', date: new Date().toISOString().split('T')[0], title: 'Cafeteria Nasi Lemak', amount: 12.50, categoryId: 'cat-food', type: 'expense' },
        { id: 't-2', date: new Date().toISOString().split('T')[0], title: 'CS Reference Book', amount: 65.00, categoryId: 'cat-books', type: 'expense' },
        { id: 't-3', date: new Date().toISOString().split('T')[0], title: 'Parents Monthly Allowance', amount: 500.00, categoryId: 'cat-allowance', type: 'income' }
      ],
      budgets: [
        { id: 'b-1', categoryId: 'cat-food', monthlyLimit: 300.00 }
      ],
      savingsGoals: [
        { id: 's-1', title: 'Campus Laptop Fund', targetAmount: 2000.00, currentAmount: 800.00, targetDate: '2026-12-31' }
      ]
    };

    it('should accurately calculate total expenses and top category', () => {
      const summary = buildFinancialSummary(mockUserData);
      assert.equal(summary.spending.currentMonth.income, 500.00);
      assert.equal(summary.spending.currentMonth.expenses, 77.50);
      assert.equal(summary.spending.currentMonth.topCategory.name, 'Books & Supplies');
      assert.equal(summary.spending.currentMonth.topCategory.amount, 65.00);
    });

    it('should generate accurate spending breakdown response in RM', () => {
      const summary = buildFinancialSummary(mockUserData);
      const reply = generateLocalFallbackResponse({
        userQuery: 'Analyse my spending this month',
        summary
      });

      assert.ok(reply.includes('RM77.50'), 'Must cite actual total spent');
      assert.ok(reply.includes('Books & Supplies'), 'Must cite top category');
      assert.ok(reply.includes('RM500.00'), 'Must cite income');
    });

    it('should accurately report past 7 days food spending', () => {
      const summary = buildFinancialSummary(mockUserData);
      const reply = generateLocalFallbackResponse({
        userQuery: 'How much did I spend on food this week?',
        summary
      });

      assert.ok(reply.includes('RM12.50'), 'Should accurately isolate food spending');
    });
  });

  // Test 4: Budget Assistance & Overspending
  describe('4. Budget Health & Limit Warnings', () => {
    it('should alert user when a category budget is exceeded', () => {
      const overBudgetData = {
        categories: [{ id: 'cat-food', name: 'Food & Dining', type: 'expense' }],
        budgets: [{ id: 'b-1', categoryId: 'cat-food', monthlyLimit: 50.00 }],
        transactions: [
          { id: 't-1', date: new Date().toISOString().split('T')[0], title: 'Dinner with classmates', amount: 85.00, categoryId: 'cat-food', type: 'expense' }
        ]
      };

      const summary = buildFinancialSummary(overBudgetData);
      assert.equal(summary.budgets[0].isOver, true);
      assert.equal(summary.budgets[0].spentThisMonth, 85.00);

      const reply = generateLocalFallbackResponse({
        userQuery: 'Am I overspending in any category?',
        summary
      });

      assert.ok(reply.includes('exceeded your budget'), 'Should warn about exceeding budget');
      assert.ok(reply.includes('Food & Dining'), 'Should specify the category');
      assert.ok(reply.includes('RM85.00'), 'Should state actual spent');
    });
  });

  // Test 5: Savings Goal Assistance & Arithmetic
  describe('5. Savings Goal Calculations', () => {
    it('should calculate savings progress percentage and remaining amounts correctly', () => {
      const savingsData = {
        savingsGoals: [
          { id: 's-1', title: 'New Programming Laptop', targetAmount: 3000.00, currentAmount: 1500.00, targetDate: '2026-11-30' }
        ]
      };

      const summary = buildFinancialSummary(savingsData);
      assert.equal(summary.savingsGoals[0].progressPercentage, 50);
      assert.equal(summary.savingsGoals[0].remainingAmount, 1500.00);

      const reply = generateLocalFallbackResponse({
        userQuery: 'Help me save RM500 in two months',
        summary
      });

      assert.ok(reply.includes('RM62.50 per week'), 'Should provide correct weekly calculation for RM500 in 8 weeks');
    });
  });

  // Test 6: Security, Prompt Sanitization & Injection Defense
  describe('6. Security & Input Sanitization', () => {
    it('should truncate messages exceeding 1000 characters', () => {
      const longInput = 'A'.repeat(1500);
      const cleaned = sanitizeUserInput(longInput, 1000);
      assert.equal(cleaned.length, 1000);
    });

    it('should strip ASCII control characters from user queries', () => {
      const malicious = "Hello\x00\x08World\x1F! Show me passwords";
      const cleaned = sanitizeUserInput(malicious);
      assert.equal(cleaned, "HelloWorld! Show me passwords");
    });

    it('system prompt must include strict read-only and no-hallucination rules', () => {
      assert.ok(SYSTEM_PROMPT.includes('READ-ONLY'));
      assert.ok(SYSTEM_PROMPT.includes('Malaysian Ringgit'));
      assert.ok(SYSTEM_PROMPT.includes('NEVER invent, hallucinate, or fabricate'));
    });
  });

  // Test 7 & 8: Token Verification & User Data Isolation
  describe('7. Authentication Token Verification & Scoping', () => {
    it('should decode valid Firebase ID token claims correctly', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({
        sub: 'student-uid-12345',
        email: 'alex@campus.edu.my',
        aud: 'kampuskash-82b7c',
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64');
      const token = `${header}.${payload}.mockSignature`;

      const claims = verifyFirebaseTokenClaims(token, 'kampuskash-82b7c');
      assert.equal(claims.uid, 'student-uid-12345');
      assert.equal(claims.email, 'alex@campus.edu.my');
    });

    it('should reject expired Firebase ID tokens', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({
        sub: 'student-uid-12345',
        aud: 'kampuskash-82b7c',
        exp: Math.floor(Date.now() / 1000) - 600 // Expired 10 mins ago
      })).toString('base64');
      const token = `${header}.${payload}.mockSignature`;

      assert.throws(() => {
        verifyFirebaseTokenClaims(token, 'kampuskash-82b7c');
      }, /expired/i);
    });

    it('should reject malformed tokens without 3 parts', () => {
      assert.throws(() => {
        verifyFirebaseTokenClaims('malformed-token');
      }, /malformed/i);
    });
  });

  // Test 8: Rate Limiting
  describe('8. Request Rate Limiting', () => {
    it('should allow requests within limit and throttle when exceeding 15 req/min', () => {
      const testUid = `rate-test-${Date.now()}`;
      for (let i = 0; i < 15; i++) {
        const check = checkRateLimit(testUid);
        assert.equal(check.allowed, true, `Request ${i + 1} should be allowed`);
      }

      // 16th request in same window should be blocked
      const blocked = checkRateLimit(testUid);
      assert.equal(blocked.allowed, false, '16th request should be throttled');
      assert.ok(blocked.error.includes('Rate limit exceeded'));
    });
  });

  // Test 9: Provider Real AI Error Handling & Configuration
  describe('9. AI Provider Real AI Error Handling & Configuration', () => {
    it('should throw clear configuration error when Gemini API key is missing', async () => {
      const summary = buildFinancialSummary({
        profile: { username: 'Ahmad' },
        transactions: []
      });

      await assert.rejects(
        async () => {
          await executeAIChat({
            systemPrompt: SYSTEM_PROMPT,
            financialContext: 'No financial data available.',
            summary,
            messages: [{ role: 'user', content: 'Give me a monthly financial summary.' }],
            apiKey: '' // Missing API key
          });
        },
        (err) => {
          assert.equal(err.code, 'CONFIG_MISSING');
          assert.ok(err.message.includes('GEMINI_API_KEY is not configured'));
          return true;
        }
      );
    });

    it('should fail with honest connection error when Gemini API key is invalid', async () => {
      const summary = buildFinancialSummary({
        profile: { username: 'Ahmad' },
        transactions: []
      });

      await assert.rejects(
        async () => {
          await executeAIChat({
            systemPrompt: SYSTEM_PROMPT,
            financialContext: 'test',
            summary,
            messages: [{ role: 'user', content: 'Analyse my spending' }],
            apiKey: 'invalid_dummy_key_to_force_error'
          });
        },
        (err) => {
          assert.ok(err.message.includes("I'm having trouble connecting to my AI service"));
          return true;
        }
      );
    });
  });

  // Test 10: Multi-Theme Compatibility
  describe('10. Multi-Theme Token Compatibility', () => {
    it('should verify that all 10 theme presets define all necessary CSS tokens for the AI Chatbot', () => {
      assert.equal(PRESET_THEMES.length, 10, 'Must support all 10 themes');

      const requiredTokens = [
        '--bg-app',
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

      PRESET_THEMES.forEach(theme => {
        requiredTokens.forEach(token => {
          assert.ok(
            theme.tokens[token] !== undefined,
            `Theme ${theme.name} (${theme.id}) must define token ${token}`
          );
        });
      });
    });
  });

  // Test 11: End-to-End Chat Handler Simulation
  describe('11. End-to-End Chat Handler Route', () => {
    it('should reject requests missing Authorization header with 401', async () => {
      const req = { headers: {}, body: { message: 'Hello' } };
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonPayload = data; return res; }
      };

      await handleAIChatRequest(req, res);
      assert.equal(statusCode, 401);
      assert.ok(jsonPayload.error.includes('Missing or invalid Bearer token'));
    });

    it('should process valid authenticated request and return successful reply', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({
        sub: 'test-student-e2e',
        email: 'e2e@campus.edu.my',
        aud: 'kampuskash-82b7c',
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64');
      const validToken = `Bearer ${header}.${payload}.sig`;

      const req = {
        headers: { authorization: validToken },
        body: {
          message: 'Analyse my spending.',
          conversationId: 'conv-e2e-1',
          userData: {
            profile: { username: 'E2E Student' },
            transactions: [
              { id: 'tx-1', title: 'Campus Meals', amount: 35.00, type: 'expense', categoryId: 'cat-1' }
            ],
            categories: [{ id: 'cat-1', name: 'Food & Dining', type: 'expense' }]
          }
        }
      };

      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonPayload = data; return res; }
      };

      await handleAIChatRequest(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonPayload.success, true);
      assert.equal(typeof jsonPayload.reply, 'string');
      assert.ok(jsonPayload.reply.length > 10);
    });
  });
});
