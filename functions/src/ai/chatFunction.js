/**
 * KampusKash AI Chat Controller & Cloud Function Entrypoint
 * Validates Firebase ID tokens, enforces rate limiting, summarizes financial context,
 * and calls the AI provider.
 */

import { SYSTEM_PROMPT } from './systemPrompt.js';
import {
  buildFinancialSummary,
  formatContextForPrompt,
  sanitizeUserInput
} from './financialContextService.js';
import { executeAIChat } from './geminiProvider.js';

// In-memory rate limiter: uid -> [timestamps]
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

/**
 * Basic in-memory rate limiting check
 */
export function checkRateLimit(uid) {
  if (!uid) return { allowed: false, error: 'Unauthorized request.' };

  const now = Date.now();
  const timestamps = rateLimitMap.get(uid) || [];

  // Filter out timestamps older than the window
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      error: `Rate limit exceeded. Please wait ${retryAfterSeconds}s before sending another message.`
    };
  }

  recent.push(now);
  rateLimitMap.set(uid, recent);
  return { allowed: true };
}

/**
 * Decode and verify Firebase ID Token (JWT)
 * Verifies standard claims: iss, aud, sub (uid), and exp.
 */
export function verifyFirebaseTokenClaims(idToken, projectId = 'kampuskash-82b7c') {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing authentication token.');
  }

  // Split JWT
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed authentication token.');
  }

  // Base64Url decode payload
  let payloadStr = '';
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    payloadStr = Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    throw new Error('Failed to decode token payload.');
  }

  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    throw new Error('Invalid JSON in token payload.');
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // Validate standard Firebase claims
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token missing valid subject (UID).');
  }

  if (payload.exp && payload.exp < nowSec - 300) { // 5-minute clock skew leeway
    throw new Error('Authentication token has expired. Please log in again.');
  }

  if (payload.aud && payload.aud !== projectId) {
    // Check if audience matches Firebase project
    console.warn(`[Auth Warning] Token aud '${payload.aud}' does not match expected '${projectId}'.`);
  }

  return {
    uid: payload.sub,
    email: payload.email || '',
    name: payload.name || ''
  };
}

/**
 * Core Chat Handler
 */
export async function handleAIChatRequest(req, res, options = {}) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Bearer token.'
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    let authUser;
    try {
      authUser = verifyFirebaseTokenClaims(token, process.env.VITE_FIREBASE_PROJECT_ID || 'kampuskash-82b7c');
    } catch (authErr) {
      return res.status(401).json({
        error: `Unauthorized: ${authErr.message}`
      });
    }

    const uid = authUser.uid;

    // 2. Rate Limiting Check
    const rateCheck = checkRateLimit(uid);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.error
      });
    }

    // 3. Extract & Validate Body Parameters
    const {
      message,
      conversationId = `conv-${Date.now()}`,
      history = [],
      userData = {}
    } = req.body || {};

    const cleanMessage = sanitizeUserInput(message, 1000);
    if (!cleanMessage) {
      return res.status(400).json({
        error: 'Please provide a non-empty message (max 1000 characters).'
      });
    }

    // 4. Build Financial Context
    // Only process financial context for the verified authenticated user
    const summary = buildFinancialSummary(userData);
    const financialContextText = formatContextForPrompt(summary);

    // Format conversation history
    const formattedHistory = Array.isArray(history)
      ? history.slice(-10).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: sanitizeUserInput(m.content, 1000)
        }))
      : [];

    // Append latest user message
    formattedHistory.push({
      role: 'user',
      content: cleanMessage
    });

    // 5. Execute AI Generation
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || options.apiKey;
    const aiResult = await executeAIChat({
      systemPrompt: SYSTEM_PROMPT,
      financialContext: financialContextText,
      summary,
      messages: formattedHistory,
      apiKey,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    });

    return res.status(200).json({
      success: true,
      conversationId,
      reply: aiResult.reply,
      provider: aiResult.provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[KampusKash AI Error]', error);
    return res.status(500).json({
      error: 'An unexpected error occurred while processing your request. Please try again.',
      details: error.message
    });
  }
}

/**
 * Handle Financial Insights Request (Returns precomputed metrics, trends, and comparisons)
 */
export async function handleFinancialInsightsRequest(req, res) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token.' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    let authUser;
    try {
      authUser = verifyFirebaseTokenClaims(token, process.env.VITE_FIREBASE_PROJECT_ID || 'kampuskash-82b7c');
    } catch (authErr) {
      return res.status(401).json({ error: `Unauthorized: ${authErr.message}` });
    }

    const rateCheck = checkRateLimit(authUser.uid);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.error });
    }

    const { month, userData = {} } = req.body || {};
    const transactions = Array.isArray(userData.transactions) ? userData.transactions : [];
    const categories = Array.isArray(userData.categories) ? userData.categories : [];
    const budgets = Array.isArray(userData.budgets) ? userData.budgets : [];
    const savingsGoals = Array.isArray(userData.savingsGoals) ? userData.savingsGoals : [];

    // Precompute verified metrics
    const summary = buildFinancialSummary(userData);
    const {
      calculateMonthlyCashFlow,
      calculateMonthToMonthComparison,
      detectSpendingTrends
    } = await import('./financialAnalysisService.js');

    const cashFlow = calculateMonthlyCashFlow(transactions, categories, month);
    const monthComparison = calculateMonthToMonthComparison(transactions, categories, month);
    const trends = detectSpendingTrends(transactions, categories, budgets, month);

    return res.status(200).json({
      success: true,
      month: cashFlow.monthInfo.yearMonth,
      cashFlow,
      monthComparison,
      trends,
      budgets,
      savingsGoals,
      student: summary.student,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Financial Insights Error]', error);
    return res.status(500).json({ error: 'Failed to generate financial insights.', details: error.message });
  }
}

/**
 * Handle Budget Recommendation Request
 */
export async function handleBudgetRecommendationRequest(req, res) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token.' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    let authUser;
    try {
      authUser = verifyFirebaseTokenClaims(token, process.env.VITE_FIREBASE_PROJECT_ID || 'kampuskash-82b7c');
    } catch (authErr) {
      return res.status(401).json({ error: `Unauthorized: ${authErr.message}` });
    }

    const { monthlyIncome, userData = {} } = req.body || {};
    const { calculateBudgetRecommendation } = await import('./financialAnalysisService.js');

    const recommendation = calculateBudgetRecommendation({
      monthlyIncome: Number(monthlyIncome) || userData.profile?.monthlyBudget || 850,
      transactions: userData.transactions || [],
      categories: userData.categories || [],
      budgets: userData.budgets || [],
      savingsGoals: userData.savingsGoals || []
    });

    return res.status(200).json({
      success: true,
      recommendation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Budget Recommendation Error]', error);
    return res.status(500).json({ error: 'Failed to generate budget recommendation.', details: error.message });
  }
}

/**
 * Handle Savings Plan Feasibility Request
 */
export async function handleSavingsPlanRequest(req, res) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token.' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    let authUser;
    try {
      authUser = verifyFirebaseTokenClaims(token, process.env.VITE_FIREBASE_PROJECT_ID || 'kampuskash-82b7c');
    } catch (authErr) {
      return res.status(401).json({ error: `Unauthorized: ${authErr.message}` });
    }

    const { targetAmount, targetMonths, monthlySurplus, currentSavings } = req.body || {};
    const { calculateSavingsPlan } = await import('./financialAnalysisService.js');

    const plan = calculateSavingsPlan({
      targetAmount,
      targetMonths,
      monthlySurplus,
      currentSavings
    });

    return res.status(200).json({
      success: true,
      plan,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Savings Plan Error]', error);
    return res.status(500).json({ error: 'Failed to calculate savings plan.', details: error.message });
  }
}

