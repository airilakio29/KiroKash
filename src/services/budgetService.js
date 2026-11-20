/**
 * KampusKash Budget Service
 * Handles budget creation, validation, spending calculation, and persistence.
 * Phase 1: Local state + Firestore users/{userId} sync.
 * Future (Phase 2): AWS Lambda + DynamoDB.
 */

import { db, doc, setDoc } from '../firebase.js';

/**
 * Create a new budget object with proper defaults.
 */
export function createBudget({ categoryId, monthlyLimit }) {
  return {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoryId: categoryId || '',
    monthlyLimit: Math.max(0, Number(monthlyLimit) || 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Validate budget parameters.
 */
export function validateBudget(budget) {
  if (!budget.categoryId) {
    return 'Please select a category';
  }
  const limit = Number(budget.monthlyLimit);
  if (isNaN(limit) || limit <= 0 || !isFinite(limit)) {
    return 'Please enter a valid monthly budget limit greater than RM 0';
  }
  return null;
}

/**
 * Calculate spending and status for a given budget limit and category transactions.
 */
export function calculateBudgetStatus(budget, transactions = []) {
  if (!budget) {
    return {
      spent: 0,
      limit: 0,
      remaining: 0,
      over: 0,
      overAmount: 0,
      percentage: 0,
      barPercentage: 0,
      isOver: false,
      isNear: false
    };
  }

  const limit = Number(budget.monthlyLimit) || 0;
  const spent = transactions
    .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const remaining = Math.max(limit - spent, 0);
  const over = Math.max(spent - limit, 0);
  const rawPercentage = limit > 0 ? (spent / limit) * 100 : 0;
  const percentage = Number(rawPercentage.toFixed(1));
  const barPercentage = Math.min(100, percentage);
  const isOver = spent > limit;
  const isNear = spent >= limit * 0.8 && !isOver;

  return {
    spent,
    limit,
    remaining,
    over,
    overAmount: over,
    percentage,
    barPercentage,
    isOver,
    isNear
  };
}

/**
 * Persist budgets array to Firestore for the user.
 */
export async function persistBudgets(userId, budgets) {
  if (!userId || !db) return;
  const userDocRef = doc(db, 'users', userId);
  try {
    await setDoc(userDocRef, {
      budgets,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to persist budgets to Firestore', err);
  }
}
