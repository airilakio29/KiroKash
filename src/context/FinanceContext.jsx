import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { generateFinancialPDF } from '../utils/pdfExport';
import { useAuth } from './AuthContext';
import { db, doc, onSnapshot, setDoc } from '../firebase';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCategorySpending
} from '../services/transactionService';
import {
  calculateTotalAccountBalance
} from '../services/accountService';
import {
  setTutorialCompletion,
  setOnboardingStatus,
  ONBOARDING_KEY_PREFIX,
  ONBOARDING_STEP_PREFIX
} from '../services/settingsService';

export const FinanceContext = createContext();

const STORAGE_KEYS = {
  TRANSACTIONS: 'student_tracker_transactions',
  CATEGORIES: 'student_tracker_categories',
  BUDGETS: 'student_tracker_budgets',
  SAVINGS: 'student_tracker_savings',
  ACCOUNTS: 'student_tracker_accounts',
  TUTORIAL: 'kirokash_tutorial_completed'
};

const defaultCategories = [
  { id: 'cat-1', name: 'Allowance', type: 'income', color: '#10B981', icon: 'Wallet' },
  { id: 'cat-2', name: 'Scholarship / Loan', type: 'income', color: '#059669', icon: 'Award' },
  { id: 'cat-3', name: 'Part-time Job', type: 'income', color: '#3B82F6', icon: 'Briefcase' },
  { id: 'cat-4', name: 'Tuition & Fees', type: 'expense', color: '#EF4444', icon: 'GraduationCap' },
  { id: 'cat-5', name: 'Hostel & Rent', type: 'expense', color: '#F59E0B', icon: 'Home' },
  { id: 'cat-6', name: 'Food & Dining', type: 'expense', color: '#8B5CF6', icon: 'Utensils' },
  { id: 'cat-7', name: 'Books & Supplies', type: 'expense', color: '#EC4899', icon: 'BookOpen' },
  { id: 'cat-8', name: 'Transport & Commute', type: 'expense', color: '#14B8A6', icon: 'Bus' },
  { id: 'cat-9', name: 'Entertainment & Leisure', type: 'expense', color: '#6366F1', icon: 'Film' }
];

export function FinanceProvider({ children }) {
  const { user, updateUserProfile } = useAuth();
  const userId = user?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // State
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.CATEGORIES}_${userId}`);
      return saved ? JSON.parse(saved) : defaultCategories;
    } catch { return defaultCategories; }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.TRANSACTIONS}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.BUDGETS}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [savingsGoals, setSavingsGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.SAVINGS}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.ACCOUNTS}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [tutorialCompleted, setTutorialCompleted] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.TUTORIAL}_${userId}`);
      return saved === 'true';
    } catch { return false; }
  });

  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    try {
      const saved = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${userId}`);
      if (saved !== null) return saved === 'true';
      const tut = localStorage.getItem(`${STORAGE_KEYS.TUTORIAL}_${userId}`);
      return tut === 'true';
    } catch { return false; }
  });

  const [onboardingStep, setOnboardingStep] = useState(() => {
    try {
      const step = localStorage.getItem(`${ONBOARDING_STEP_PREFIX}${userId}`);
      if (step) return step;
      const saved = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${userId}`);
      if (saved === 'true') return 'completed';
    } catch {}
    return 'profile';
  });

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Real-time Firestore Sync per User UID
  useEffect(() => {
    if (!userId || user?.isDemoUser) {
      setIsLoading(false);
      return;
    }
    if (!db) {
      setIsLoading(false);
      return;
    }
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      const currentUser = userRef.current;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profile && updateUserProfile && currentUser) {
          const p = data.profile;
          if (
            currentUser.username !== p.username ||
            currentUser.university !== p.university ||
            currentUser.bio !== p.bio ||
            currentUser.monthlyBudget !== p.monthlyBudget ||
            currentUser.currency !== p.currency ||
            currentUser.avatar !== p.avatar
          ) {
            updateUserProfile(p);
          }
        }
        if (data.categories) setCategories(data.categories);
        if (data.transactions) setTransactions(data.transactions);
        if (data.budgets) setBudgets(data.budgets);
        if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
        if (Array.isArray(data.accounts)) setAccounts(data.accounts);

        // Synchronize onboarding & tutorial status
        if (typeof data.onboardingCompleted === 'boolean') {
          setOnboardingCompleted(data.onboardingCompleted);
          const resolvedStep = data.onboardingStep || (data.onboardingCompleted ? 'completed' : 'profile');
          setOnboardingStep(resolvedStep);
          setTutorialCompleted(data.onboardingCompleted || Boolean(data.tutorialCompleted));
          try {
            localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, String(data.onboardingCompleted));
            localStorage.setItem(`${ONBOARDING_STEP_PREFIX}${userId}`, resolvedStep);
            localStorage.setItem(`${STORAGE_KEYS.TUTORIAL}_${userId}`, String(data.onboardingCompleted || Boolean(data.tutorialCompleted)));
          } catch (e) {
            console.error('LocalStorage write error', e);
          }
        } else {
          // Graceful handling for existing accounts:
          // Existing users with accounts should not be forced through onboarding unless profile is empty
          const isProfileSet = Boolean(
            data.profile?.username &&
            data.profile.username !== 'Student' &&
            !/^[a-f0-9]{20,}$/i.test(data.profile.username.replace(/[\s-]/g, '')) &&
            (data.profile.university || data.profile.bio || data.profile.monthlyBudget)
          );
          const hasFinancialHistory = Boolean(
            (data.transactions && data.transactions.length > 0) ||
            (data.accounts && data.accounts.length > 0) ||
            data.tutorialCompleted === true
          );

          if (isProfileSet || hasFinancialHistory) {
            setOnboardingCompleted(true);
            setOnboardingStep('completed');
            setTutorialCompleted(true);
            try {
              localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'true');
              localStorage.setItem(`${ONBOARDING_STEP_PREFIX}${userId}`, 'completed');
              localStorage.setItem(`${STORAGE_KEYS.TUTORIAL}_${userId}`, 'true');
            } catch (_e) {}
            // Gracefully persist to Firestore
            setDoc(userDocRef, {
              onboardingCompleted: true,
              onboardingStep: 'completed',
              tutorialCompleted: true
            }, { merge: true }).catch(() => {});
          } else {
            setOnboardingCompleted(false);
            setOnboardingStep('profile');
            try {
              localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'false');
              localStorage.setItem(`${ONBOARDING_STEP_PREFIX}${userId}`, 'profile');
            } catch (_e) {}
          }
        }
      } else if (currentUser) {
        // Initial Seed for New Firestore User
        setDoc(userDocRef, {
          profile: {
            username: currentUser.username,
            email: currentUser.email,
            university: currentUser.university,
            currency: currentUser.currency || 'RM'
          },
          categories: defaultCategories,
          transactions: [],
          budgets: [],
          savingsGoals: [],
          accounts: [],
          onboardingCompleted: false,
          onboardingStep: 'profile',
          tutorialCompleted: false,
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Firestore seed warning', err));
      }
      setIsLoading(false);
      setLoadError(null);
    }, (err) => {
      console.warn('Firestore sync listener error', err);
      setIsLoading(false);
      setLoadError('Unable to sync with cloud. Your data may not be saved.');
    });

    return () => unsubscribe();
  }, [userId, updateUserProfile]);

  const updateOnboardingStep = useCallback((step) => {
    setOnboardingStep(step);
    try {
      localStorage.setItem(`${ONBOARDING_STEP_PREFIX}${userId}`, step);
    } catch (_e) {}
    setOnboardingStatus(userId, { completed: step === 'completed', step });
  }, [userId]);

  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted(true);
    setOnboardingStep('completed');
    setTutorialCompleted(true);
    try {
      localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, 'true');
      localStorage.setItem(`${ONBOARDING_STEP_PREFIX}${userId}`, 'completed');
      localStorage.setItem(`${STORAGE_KEYS.TUTORIAL}_${userId}`, 'true');
    } catch (_e) {}
    setOnboardingStatus(userId, { completed: true, step: 'completed' });
    setTutorialCompletion(userId, true);
  }, [userId]);

  const completeTutorial = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const resetTutorial = useCallback(() => {
    setTutorialCompleted(false);
    setTutorialCompletion(userId, false);
  }, [userId]);

  // Helper to sync changes to Firestore & LocalStorage
  const persistUserData = useCallback((
    newCat = categories,
    newTx = transactions,
    newBud = budgets,
    newSav = savingsGoals,
    newAcc = accounts
  ) => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CATEGORIES}_${userId}`, JSON.stringify(newCat));
      localStorage.setItem(`${STORAGE_KEYS.TRANSACTIONS}_${userId}`, JSON.stringify(newTx));
      localStorage.setItem(`${STORAGE_KEYS.BUDGETS}_${userId}`, JSON.stringify(newBud));
      localStorage.setItem(`${STORAGE_KEYS.SAVINGS}_${userId}`, JSON.stringify(newSav));
      localStorage.setItem(`${STORAGE_KEYS.ACCOUNTS}_${userId}`, JSON.stringify(newAcc));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }

    if (userId && db && !user?.isDemoUser) {
      const userDocRef = doc(db, 'users', userId);
      setDoc(userDocRef, {
        categories: newCat,
        transactions: newTx,
        budgets: newBud,
        savingsGoals: newSav,
        accounts: newAcc,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore sync error', e));
    }
  }, [userId, categories, transactions, budgets, savingsGoals, accounts]);

  // ==================== Financial Calculations (centralized) ====================
  const totalIncome = useMemo(() => calculateTotalIncome(transactions), [transactions]);
  const totalExpense = useMemo(() => calculateTotalExpenses(transactions), [transactions]);
  const totalBalance = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);
  const totalAccountBalance = useMemo(() => calculateTotalAccountBalance(accounts), [accounts]);

  const totalSavedInGoals = useMemo(() =>
    savingsGoals.reduce((sum, s) => sum + Number(s.currentAmount || 0), 0),
    [savingsGoals]
  );

  const categorySpendingBreakdown = useMemo(() =>
    calculateCategorySpending(transactions, categories),
    [transactions, categories]
  );

  // ==================== Account CRUD ====================
  const addAccount = useCallback((newAccount) => {
    const now = new Date().toISOString();
    const account = {
      accountId: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      accountName: (newAccount.accountName || '').trim(),
      institution: (newAccount.institution || '').trim(),
      accountType: newAccount.accountType || 'savings',
      balance: Number(newAccount.balance) || 0,
      currency: newAccount.currency || 'RM',
      source: 'manual',
      createdAt: now,
      updatedAt: now
    };
    const updated = [...accounts, account];
    setAccounts(updated);
    persistUserData(categories, transactions, budgets, savingsGoals, updated);
    return account;
  }, [accounts, categories, transactions, budgets, savingsGoals, persistUserData]);

  const updateAccount = useCallback((accountId, updates) => {
    const updated = accounts.map(a =>
      a.accountId === accountId
        ? { ...a, ...updates, balance: Number(updates.balance ?? a.balance), updatedAt: new Date().toISOString() }
        : a
    );
    setAccounts(updated);
    persistUserData(categories, transactions, budgets, savingsGoals, updated);
  }, [accounts, categories, transactions, budgets, savingsGoals, persistUserData]);

  const deleteAccount = useCallback((accountId) => {
    // When deleting an account, set transactions' accountId to null (don't delete transactions)
    const updatedTx = transactions.map(t =>
      t.accountId === accountId ? { ...t, accountId: null } : t
    );
    const updatedAccounts = accounts.filter(a => a.accountId !== accountId);
    setTransactions(updatedTx);
    setAccounts(updatedAccounts);
    persistUserData(categories, updatedTx, budgets, savingsGoals, updatedAccounts);
  }, [accounts, transactions, categories, budgets, savingsGoals, persistUserData]);

  // ==================== Transaction CRUD ====================
  const addTransaction = useCallback((newTx) => {
    const created = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount: Number(newTx.amount),
      accountId: newTx.accountId || null,
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Adjust account balance
    let updatedAccounts = accounts;
    if (created.accountId) {
      updatedAccounts = accounts.map(a => {
        if (a.accountId === created.accountId) {
          let newBal = Number(a.balance);
          if (created.type === 'expense') newBal -= created.amount;
          else if (created.type === 'income') newBal += created.amount;
          return { ...a, balance: newBal, updatedAt: new Date().toISOString() };
        }
        return a;
      });
      setAccounts(updatedAccounts);
    }

    const updatedTx = [created, ...transactions];
    setTransactions(updatedTx);
    persistUserData(categories, updatedTx, budgets, savingsGoals, updatedAccounts);
  }, [transactions, accounts, categories, budgets, savingsGoals, persistUserData]);

  const updateTransaction = useCallback((id, updatedTx) => {
    const oldTx = transactions.find(t => t.id === id);
    let updatedAccounts = [...accounts];

    if (oldTx) {
      // Reverse the old transaction's effect on its account
      if (oldTx.accountId) {
        updatedAccounts = updatedAccounts.map(a => {
          if (a.accountId === oldTx.accountId) {
            let bal = Number(a.balance);
            if (oldTx.type === 'expense') bal += Number(oldTx.amount);
            else if (oldTx.type === 'income') bal -= Number(oldTx.amount);
            return { ...a, balance: bal, updatedAt: new Date().toISOString() };
          }
          return a;
        });
      }
      // Apply the new transaction's effect
      const newAccountId = updatedTx.accountId || null;
      if (newAccountId) {
        updatedAccounts = updatedAccounts.map(a => {
          if (a.accountId === newAccountId) {
            let bal = Number(a.balance);
            if (updatedTx.type === 'expense') bal -= Number(updatedTx.amount);
            else if (updatedTx.type === 'income') bal += Number(updatedTx.amount);
            return { ...a, balance: bal, updatedAt: new Date().toISOString() };
          }
          return a;
        });
      }
    }

    const updatedList = transactions.map(t =>
      t.id === id
        ? { ...t, ...updatedTx, amount: Number(updatedTx.amount), accountId: updatedTx.accountId || null, updatedAt: new Date().toISOString() }
        : t
    );

    setAccounts(updatedAccounts);
    setTransactions(updatedList);
    persistUserData(categories, updatedList, budgets, savingsGoals, updatedAccounts);
  }, [transactions, accounts, categories, budgets, savingsGoals, persistUserData]);

  const deleteTransaction = useCallback((id) => {
    const tx = transactions.find(t => t.id === id);
    let updatedAccounts = accounts;

    if (tx && tx.accountId) {
      updatedAccounts = accounts.map(a => {
        if (a.accountId === tx.accountId) {
          let bal = Number(a.balance);
          if (tx.type === 'expense') bal += Number(tx.amount);
          else if (tx.type === 'income') bal -= Number(tx.amount);
          return { ...a, balance: bal, updatedAt: new Date().toISOString() };
        }
        return a;
      });
      setAccounts(updatedAccounts);
    }

    const updatedTx = transactions.filter(t => t.id !== id);
    setTransactions(updatedTx);
    persistUserData(categories, updatedTx, budgets, savingsGoals, updatedAccounts);
  }, [transactions, accounts, categories, budgets, savingsGoals, persistUserData]);

  // ==================== Category CRUD ====================
  const addCategory = useCallback((newCat) => {
    const cat = {
      ...newCat,
      id: `cat-${Date.now()}`,
      color: newCat.color || '#52B788'
    };
    const updated = [...categories, cat];
    setCategories(updated);
    persistUserData(updated, transactions, budgets, savingsGoals, accounts);
  }, [categories, transactions, budgets, savingsGoals, accounts, persistUserData]);

  const deleteCategory = useCallback((id) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    persistUserData(updated, transactions, budgets, savingsGoals, accounts);
  }, [categories, transactions, budgets, savingsGoals, accounts, persistUserData]);

  // ==================== Budget CRUD ====================
  const upsertBudget = useCallback((categoryId, monthlyLimit) => {
    let updated = [];
    const existingIndex = budgets.findIndex(b => b.categoryId === categoryId);
    if (existingIndex >= 0) {
      updated = [...budgets];
      updated[existingIndex] = { ...updated[existingIndex], monthlyLimit: Number(monthlyLimit) };
    } else {
      updated = [...budgets, { id: `b-${Date.now()}`, categoryId, monthlyLimit: Number(monthlyLimit) }];
    }
    setBudgets(updated);
    persistUserData(categories, transactions, updated, savingsGoals, accounts);
  }, [budgets, categories, transactions, savingsGoals, accounts, persistUserData]);

  const deleteBudget = useCallback((id) => {
    const updated = budgets.filter(b => b.id !== id);
    setBudgets(updated);
    persistUserData(categories, transactions, updated, savingsGoals, accounts);
  }, [budgets, categories, transactions, savingsGoals, accounts, persistUserData]);

  // ==================== Savings Goal CRUD ====================
  const addSavingsGoal = useCallback((newGoal) => {
    const goal = {
      ...newGoal,
      id: `s-${Date.now()}`,
      targetAmount: Math.max(0, Number(newGoal.targetAmount) || 0),
      currentAmount: Math.max(0, Number(newGoal.currentAmount || 0))
    };
    const updated = [...savingsGoals, goal];
    setSavingsGoals(updated);
    persistUserData(categories, transactions, budgets, updated, accounts);
  }, [savingsGoals, categories, transactions, budgets, accounts, persistUserData]);

  const updateSavingsGoal = useCallback((goalId, updates) => {
    const updated = savingsGoals.map(g =>
      g.id === goalId
        ? {
          ...g,
          ...updates,
          targetAmount: Math.max(0, Number(updates.targetAmount ?? g.targetAmount)),
          currentAmount: Math.max(0, Number(updates.currentAmount ?? g.currentAmount))
        }
        : g
    );
    setSavingsGoals(updated);
    persistUserData(categories, transactions, budgets, updated, accounts);
  }, [savingsGoals, categories, transactions, budgets, accounts, persistUserData]);

  const depositToSavingsGoal = useCallback((goalId, amount) => {
    const numAmount = Math.max(0, Number(amount));
    const updatedGoals = savingsGoals.map(g => {
      if (g.id === goalId) {
        return { ...g, currentAmount: g.currentAmount + numAmount };
      }
      return g;
    });
    setSavingsGoals(updatedGoals);

    const goal = savingsGoals.find(g => g.id === goalId);
    let updatedTx = transactions;
    if (goal) {
      const depositTx = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString().split('T')[0],
        title: `Savings Deposit: ${goal.title}`,
        amount: numAmount,
        type: 'expense',
        categoryId: 'cat-6',
        accountId: null,
        isRecurring: false,
        source: 'manual',
        note: 'Deposit towards savings goal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedTx = [depositTx, ...transactions];
      setTransactions(updatedTx);
    }
    persistUserData(categories, updatedTx, budgets, updatedGoals, accounts);
  }, [savingsGoals, transactions, categories, budgets, accounts, persistUserData]);

  const deleteSavingsGoal = useCallback((id) => {
    const updated = savingsGoals.filter(g => g.id !== id);
    setSavingsGoals(updated);
    persistUserData(categories, transactions, budgets, updated, accounts);
  }, [savingsGoals, categories, transactions, budgets, accounts, persistUserData]);

  // ==================== Data Export ====================
  const exportToPDF = useCallback((currentUser) => {
    generateFinancialPDF({
      transactions,
      categories,
      totalBalance,
      totalIncome,
      totalExpense,
      totalSavedInGoals,
      user: currentUser || user
    });
  }, [transactions, categories, totalBalance, totalIncome, totalExpense, totalSavedInGoals, user]);

  const exportToCSV = useCallback(() => {
    const headers = ['ID', 'Date', 'Type', 'Title', 'Amount (RM)', 'Category', 'Account', 'Source', 'Recurring', 'Note'];
    const rows = transactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const acc = accounts.find(a => a.accountId === t.accountId);
      return [
        t.id,
        t.date,
        t.type,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        Number(t.amount).toFixed(2),
        `"${cat ? cat.name : 'Uncategorized'}"`,
        `"${acc ? acc.accountName : 'Unassigned'}"`,
        t.source || 'manual',
        t.isRecurring ? 'Yes' : 'No',
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kirokash_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [transactions, categories, accounts]);

  const exportJSONBackup = useCallback(() => {
    const dataBundle = {
      version: 2,
      exportDate: new Date().toISOString(),
      user: user?.username || 'Student',
      categories,
      transactions,
      budgets,
      savingsGoals,
      accounts
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataBundle, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `kirokash_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [user, categories, transactions, budgets, savingsGoals, accounts]);

  const importJSONBackup = useCallback((jsonData) => {
    try {
      const newCat = jsonData.categories || categories;
      const newTx = jsonData.transactions || transactions;
      const newBud = jsonData.budgets || budgets;
      const newSav = jsonData.savingsGoals || savingsGoals;
      const newAcc = jsonData.accounts || accounts;
      setCategories(newCat);
      setTransactions(newTx);
      setBudgets(newBud);
      setSavingsGoals(newSav);
      setAccounts(newAcc);
      persistUserData(newCat, newTx, newBud, newSav, newAcc);
      return true;
    } catch (err) {
      console.error('Failed to import JSON data', err);
      return false;
    }
  }, [categories, transactions, budgets, savingsGoals, accounts, persistUserData]);

  const value = useMemo(() => ({
    // State
    categories,
    transactions,
    budgets,
    savingsGoals,
    accounts,
    isLoading,
    loadError,
    // Computed
    totalBalance,
    totalIncome,
    totalExpense,
    totalAccountBalance,
    totalSavedInGoals,
    categorySpendingBreakdown,
    // Account CRUD
    addAccount,
    updateAccount,
    deleteAccount,
    // Transaction CRUD
    addTransaction,
    updateTransaction,
    deleteTransaction,
    // Category CRUD
    addCategory,
    deleteCategory,
    // Budget CRUD
    upsertBudget,
    deleteBudget,
    // Savings CRUD
    addSavingsGoal,
    updateSavingsGoal,
    depositToSavingsGoal,
    deleteSavingsGoal,
    // Export
    exportToPDF,
    exportToCSV,
    exportJSONBackup,
    importJSONBackup,
    // Tutorial & Onboarding
    tutorialCompleted,
    completeTutorial,
    resetTutorial,
    onboardingCompleted,
    onboardingStep,
    updateOnboardingStep,
    completeOnboarding
  }), [
    categories, transactions, budgets, savingsGoals, accounts, isLoading, loadError,
    totalBalance, totalIncome, totalExpense, totalAccountBalance, totalSavedInGoals, categorySpendingBreakdown,
    addAccount, updateAccount, deleteAccount,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, deleteCategory,
    upsertBudget, deleteBudget,
    addSavingsGoal, updateSavingsGoal, depositToSavingsGoal, deleteSavingsGoal,
    exportToPDF, exportToCSV, exportJSONBackup, importJSONBackup,
    tutorialCompleted, completeTutorial, resetTutorial,
    onboardingCompleted, onboardingStep, updateOnboardingStep, completeOnboarding
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
