/**
 * KiroKash Account Service
 * Manages user financial accounts (KampusKash Demo Account, Savings, Current, E-wallet, Cash, Credit Card, Other).
 * Phase 1: source = "manual" or "kampuskash_demo".
 * Future: source can be "bank" or "imported".
 */

import { db, doc, setDoc } from '../firebase.js';
import { INITIAL_DEMO_WALLET_BALANCE, DEMO_WALLET } from '../config/appConstants.js';

export const KAMPUSKASH_ACCOUNT_ID = 'acc-kampuskash';
export const KAMPUSKASH_ACCOUNT_TYPE = 'kampuskash';

export const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' }
];

export const ACCOUNT_TYPE_ICONS = {
  kampuskash: '⚡',
  savings: '🏦',
  current: '💳',
  ewallet: '📱',
  cash: '💵',
  credit_card: '💳',
  other: '📋'
};

/**
 * Creates the pre-loaded KampusKash Demo Account object (`type: "kampuskash"`).
 * Automatically created for every user before they connect or add any other bank or e-wallet account.
 * New users start with RM100.00 of demo money (or their migrated wallet balance).
 */
export function createKampusKashAccount(balance = INITIAL_DEMO_WALLET_BALANCE) {
  const now = new Date().toISOString();
  const numericBalance = Number.isFinite(Number(balance))
    ? Math.round((Number(balance) + Number.EPSILON) * 100) / 100
    : INITIAL_DEMO_WALLET_BALANCE;

  return {
    accountId: KAMPUSKASH_ACCOUNT_ID,
    accountName: 'KampusKash',
    institution: 'KampusKash Pay (Demo)',
    accountType: KAMPUSKASH_ACCOUNT_TYPE,
    balance: numericBalance,
    currency: 'RM',
    source: 'kampuskash_demo',
    logoUrl: '/kiro-logo.png',
    isKampusKash: true,
    isDemo: true,
    cannotDelete: true,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Ensures the pre-loaded "KampusKash" account is present at the top of the user's accounts list,
 * and migrates/synchronizes any existing wallet balance into it so nothing is lost.
 */
export function ensureKampusKashAccount(accounts = [], migratedBalance = null) {
  const safeList = Array.isArray(accounts) ? [...accounts] : [];
  if (!DEMO_WALLET) return safeList;

  const existingIdx = safeList.findIndex(
    (a) =>
      a &&
      (a.accountId === KAMPUSKASH_ACCOUNT_ID ||
        a.accountType === KAMPUSKASH_ACCOUNT_TYPE ||
        a.isKampusKash === true)
  );

  if (existingIdx >= 0) {
    const existing = safeList[existingIdx];
    const resolvedBalance =
      migratedBalance !== null && migratedBalance !== undefined && Number.isFinite(Number(migratedBalance))
        ? Math.round((Number(migratedBalance) + Number.EPSILON) * 100) / 100
        : Number(existing.balance ?? INITIAL_DEMO_WALLET_BALANCE);

    const normalized = {
      ...createKampusKashAccount(resolvedBalance),
      ...existing,
      accountId: KAMPUSKASH_ACCOUNT_ID,
      accountName: 'KampusKash',
      accountType: KAMPUSKASH_ACCOUNT_TYPE,
      balance: resolvedBalance,
      isKampusKash: true,
      isDemo: true,
      cannotDelete: true
    };

    const others = safeList.filter((_, idx) => idx !== existingIdx);
    return [normalized, ...others];
  }

  const starterBalance =
    migratedBalance !== null && migratedBalance !== undefined && Number.isFinite(Number(migratedBalance))
      ? Number(migratedBalance)
      : INITIAL_DEMO_WALLET_BALANCE;

  return [createKampusKashAccount(starterBalance), ...safeList];
}

/**
 * Create a new account object with proper defaults.
 */
export function createAccount({ accountName, institution, accountType, balance, currency = 'RM' }) {
  const now = new Date().toISOString();
  return {
    accountId: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountName: (accountName || '').trim(),
    institution: (institution || '').trim(),
    accountType: accountType || 'savings',
    balance: Number(balance) || 0,
    currency: currency || 'RM',
    source: 'manual',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Validate an account before saving.
 * Returns an error string or null if valid.
 */
export function validateAccount(account) {
  if (!account.accountName || !account.accountName.trim()) {
    return 'Please enter an account name';
  }
  if (account.accountName.trim().length > 50) {
    return 'Account name must be 50 characters or fewer';
  }
  const bal = Number(account.balance);
  if (isNaN(bal) || !isFinite(bal)) {
    return 'Please enter a valid balance amount';
  }
  const validTypes = [...ACCOUNT_TYPES.map((t) => t.value), KAMPUSKASH_ACCOUNT_TYPE];
  if (!validTypes.includes(account.accountType)) {
    return 'Please select a valid account type';
  }
  return null;
}

/**
 * Persist accounts array to Firestore.
 */
export async function persistAccounts(userId, accounts) {
  if (!userId || !db) return;
  const userDocRef = doc(db, 'users', userId);
  try {
    await setDoc(
      userDocRef,
      {
        accounts,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to persist accounts to Firestore', e);
  }
}

/**
 * Calculate total balance across all accounts (including KampusKash account).
 */
export function calculateTotalAccountBalance(accounts = []) {
  return accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
}

/**
 * Get account by ID.
 */
export function getAccountById(accounts = [], accountId) {
  return accounts.find((a) => a.accountId === accountId) || null;
}
