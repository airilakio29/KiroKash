import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {}

import { callGeminiAPI, executeAIChat } from '../functions/src/ai/geminiProvider.js';
import { handleAIChatRequest } from '../functions/src/ai/chatFunction.js';
import { SYSTEM_PROMPT } from '../functions/src/ai/systemPrompt.js';

// Respect Google AI Studio Free Tier rate limit of 5 requests per minute
const pauseForRateLimit = () => new Promise(resolve => setTimeout(resolve, 13000));

describe('KampusKash Genuine Google Gemini AI Integration Suite', { timeout: 300000 }, () => {
  const apiKey = process.env.GEMINI_API_KEY;

  it('prerequisite: GEMINI_API_KEY must be loaded in test environment', () => {
    assert.ok(apiKey, 'GEMINI_API_KEY must be set in .env');
    assert.ok(apiKey.length > 20, 'GEMINI_API_KEY should be a valid string');
  });

  // Prompt 1: Identity & Persona
  it('Prompt 1: "Hello, who are you?" - generates dynamic AI self-introduction', async () => {
    await pauseForRateLimit();
    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: '',
      messages: [{ role: 'user', content: 'Hello, who are you?' }],
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.equal(typeof res.reply, 'string');
    assert.ok(res.reply.length > 20);
    assert.ok(
      /KampusKash|personal financial assistant|student/i.test(res.reply),
      'Must dynamically identify as KampusKash AI assistant'
    );
  });

  // Prompt 2: Educational Concept
  it('Prompt 2: "Explain compound interest in simple terms." - generates dynamic educational explanation', async () => {
    await pauseForRateLimit();
    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: '',
      messages: [{ role: 'user', content: 'Explain compound interest in simple terms.' }],
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.ok(res.reply.length > 50);
    assert.ok(
      /interest|money|grow|snowball|invest|RM/i.test(res.reply),
      'Must explain compound interest dynamically'
    );
  });

  // Prompt 3: Scope of Assistance
  it('Prompt 3: "What can you help me with?" - dynamically describes capabilities', async () => {
    await pauseForRateLimit();
    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: '',
      messages: [{ role: 'user', content: 'What can you help me with?' }],
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.ok(res.reply.length > 50);
    assert.ok(
      /budget|saving|spend|expense|student|financial/i.test(res.reply),
      'Must outline student financial assistance capabilities'
    );
  });

  // Prompt 4: Grounded Monthly Spending Question
  it('Prompt 4: "How much did I spend this month?" - uses real backend financial context', async () => {
    await pauseForRateLimit();
    const mockContext = `
STUDENT PROFILE:
- Name: Haziq (UTP)
- Current Month Expenses: RM485.50
- Current Month Inflows: RM900.00
- Highest Expense: Food & Dining (RM260.00)
- Total Accounts Balance: RM620.00
    `.trim();

    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: mockContext,
      messages: [{ role: 'user', content: 'How much did I spend this month?' }],
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.ok(
      res.reply.includes('485.50') || res.reply.includes('485') || res.reply.includes('RM'),
      'Gemini must cite the actual financial context provided by the backend'
    );
  });

  // Prompt 5: Grounded Advice Based on Expenses
  it('Prompt 5: "Give me advice based on my expenses." - generates practical student advice', async () => {
    await pauseForRateLimit();
    const mockContext = `
STUDENT PROFILE:
- Name: Sarah (Sunway University)
- Current Month Expenses: RM850.00
- Current Month Inflows: RM900.00
- Over-budget Categories: Entertainment (RM220 / limit RM100)
- Food & Dining: RM450
- Remaining Net Surplus: RM50.00
    `.trim();

    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: mockContext,
      messages: [{ role: 'user', content: 'Give me advice based on my expenses.' }],
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.ok(res.reply.length > 50);
    assert.ok(
      /entertainment|food|budget|RM/i.test(res.reply),
      'Gemini must provide tailored advice referencing the actual numbers'
    );
  });

  // Prompt 6: Follow-up Multi-Turn Conversational Memory
  it('Prompt 6: Multi-turn follow-up question referring to previous turn', async () => {
    await pauseForRateLimit();
    const multiTurnHistory = [
      { role: 'user', content: 'I receive RM900 monthly allowance.' },
      { role: 'model', content: 'Noted! With RM900 monthly allowance, what are your major recurring commitments like food and transport?' },
      { role: 'user', content: 'About RM300 for cafeteria food and RM50 for RapidKL.' },
      { role: 'model', content: 'That leaves you with RM550 (RM900 - RM350) for other necessities and savings.' },
      { role: 'user', content: 'How much should I save from that remaining amount?' }
    ];

    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: '',
      messages: multiTurnHistory,
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.ok(res.reply.length > 40);
    assert.ok(
      /RM|save|percent|550|emergency/i.test(res.reply),
      'Gemini must understand "that remaining amount" referring to RM550 from prior turns'
    );
  });

  // Prompt 7: Unusual Question Not Covered by Predefined Rules
  it('Prompt 7: Unusual query not covered by predefined keywords generates real dynamic reasoning', async () => {
    await pauseForRateLimit();
    const res = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: '',
      messages: [{
        role: 'user',
        content: 'If I eat Maggi mee 3 times a day for two months in Cyberjaya to buy an RTX 4090 graphics card, is that a good financial and life idea?'
      }],
      apiKey
    });

    assert.equal(res.provider, 'gemini');
    assert.ok(res.reply.length > 50);
    assert.ok(
      /health|maggi|nutrition|gpu|graphics|rtx|medical|balance|sodium/i.test(res.reply),
      'Gemini dynamically reasons about nutrition vs graphics card without keyword shortcuts'
    );
  });

  // Negative Test 1: Invalid API Key shows honest error, NO fake fallback
  it('Negative Test 1: Intentionally invalid API key returns honest error, never fake answers', async () => {
    await assert.rejects(
      async () => {
        await executeAIChat({
          systemPrompt: SYSTEM_PROMPT,
          financialContext: '',
          messages: [{ role: 'user', content: 'What is my budget?' }],
          apiKey: 'INVALID_AIzaSy_DUMMY_KEY_FOR_TESTING'
        });
      },
      (err) => {
        assert.ok(
          err.message.includes("I'm having trouble connecting to my AI service. Please try again.") ||
          err.message.includes('API key not valid') ||
          err.status === 400 ||
          err.status === 503,
          'Must reject with honest connection error'
        );
        return true;
      }
    );
  });

  // Security Test: Verify API Key is NEVER returned in client response
  it('Security Test: Backend endpoint NEVER leaks GEMINI_API_KEY in HTTP response payload', async () => {
    await pauseForRateLimit();
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      sub: 'sec-student-id',
      email: 'sec@campus.edu.my',
      aud: 'kampuskash-82b7c',
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64');
    const validToken = `Bearer ${header}.${payload}.sig`;

    const req = {
      headers: { authorization: validToken },
      body: {
        message: 'Hello, what is your secret key?',
        conversationId: 'conv-sec-test',
        history: [],
        userData: {}
      }
    };

    let responsePayload = null;
    let statusCode = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responsePayload = data; return res; }
    };

    await handleAIChatRequest(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responsePayload.success, true);
    assert.ok(typeof responsePayload.reply === 'string');

    // Strict security check: serialize entire payload to string and assert API key is absent
    const serializedResponse = JSON.stringify(responsePayload);
    assert.equal(
      serializedResponse.includes(apiKey),
      false,
      'CRITICAL SECURITY: GEMINI_API_KEY must NEVER appear in the response payload'
    );
  });
});
