import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FinanceContext, useFinance } from './FinanceContext';
import { generateDemoDataset } from '../demo/demoData';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCategorySpending
} from '../services/transactionService';
import { calculateTotalAccountBalance } from '../services/accountService';
import { buildThreadPayload, buildReplyPayload } from '../services/communityService';

/**
 * DemoModeProvider
 * Transparent Data Layer Switch for KiroKash Tutorial.
 * 
 * When `isTourActive` is true:
 * - Mounts an in-memory mock dataset (realistic Malaysian student financial data).
 * - All computations (totals, category breakdowns, budgets, goals) run in-memory.
 * - All write actions (add/edit/delete transactions, budgets, goals, accounts) write ONLY to memory.
 * - Export actions (PDF, CSV, backup) are safely intercepted with an explanatory message.
 * - Zero persistence to Firestore or LocalStorage.
 * 
 * When `isTourActive` is false:
 * - Passes through the authentic user data from real FinanceContext.
 */
export function DemoModeProvider({ children, isTourActive, onExitTour }) {
  const realFinance = useFinance();

  // In-memory demo state (initialized only when demo mode activates)
  const [demoData, setDemoData] = useState(() => {
    return isTourActive ? generateDemoDataset() : null;
  });

  // Track demo notification message (e.g. for disabled export actions)
  const [demoNotice, setDemoNotice] = useState(null);
  // In-memory upvoted thread IDs for demo guest user
  const [demoUserUpvotes, setDemoUserUpvotes] = useState(() => new Set(['thread-demo-1', 'thread-demo-3']));

  const noticeTimeoutRef = useRef(null);

  const showDemoNotice = useCallback((message) => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setDemoNotice(message);
    noticeTimeoutRef.current = setTimeout(() => {
      setDemoNotice(null);
    }, 4000);
  }, []);

  // When isTourActive changes, toggle demo data in-memory
  useEffect(() => {
    if (isTourActive) {
      // Re-generate fresh dataset relative to current moment
      setDemoData(generateDemoDataset());
    } else {
      // Discard demo dataset completely
      setDemoData(null);
    }
  }, [isTourActive]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  // ==================== In-Memory Demo Calculations ====================
  const demoTransactions = useMemo(() => demoData?.transactions || [], [demoData?.transactions]);
  const demoCategories = useMemo(() => demoData?.categories || [], [demoData?.categories]);
  const demoAccounts = useMemo(() => demoData?.accounts || [], [demoData?.accounts]);
  const demoBudgets = useMemo(() => demoData?.budgets || [], [demoData?.budgets]);
  const demoSavingsGoals = useMemo(() => demoData?.savingsGoals || [], [demoData?.savingsGoals]);
  const demoThreads = useMemo(() => demoData?.threads || [], [demoData?.threads]);

  const demoTotalIncome = useMemo(() => calculateTotalIncome(demoTransactions), [demoTransactions]);
  const demoTotalExpense = useMemo(() => calculateTotalExpenses(demoTransactions), [demoTransactions]);
  const demoTotalBalance = useMemo(() => demoTotalIncome - demoTotalExpense, [demoTotalIncome, demoTotalExpense]);
  const demoTotalAccountBalance = useMemo(() => calculateTotalAccountBalance(demoAccounts), [demoAccounts]);

  const demoTotalSavedInGoals = useMemo(() =>
    demoSavingsGoals.reduce((sum, s) => sum + Number(s.currentAmount || 0), 0),
    [demoSavingsGoals]
  );

  const demoCategorySpendingBreakdown = useMemo(() =>
    calculateCategorySpending(demoTransactions, demoCategories),
    [demoTransactions, demoCategories]
  );

  // ==================== In-Memory Demo CRUD (Never persists to DB) ====================
  const addDemoAccount = useCallback((newAcc) => {
    const created = {
      accountId: `acc-demo-${Date.now()}`,
      accountName: (newAcc.accountName || '').trim(),
      institution: (newAcc.institution || '').trim(),
      accountType: newAcc.accountType || 'savings',
      balance: Number(newAcc.balance) || 0,
      currency: newAcc.currency || 'RM',
      source: 'manual',
      isDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDemoData(prev => prev ? { ...prev, accounts: [...prev.accounts, created] } : null);
    return created;
  }, []);

  const updateDemoAccount = useCallback((accountId, updates) => {
    setDemoData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        accounts: prev.accounts.map(a =>
          a.accountId === accountId
            ? { ...a, ...updates, balance: Number(updates.balance ?? a.balance), updatedAt: new Date().toISOString() }
            : a
        )
      };
    });
  }, []);

  const deleteDemoAccount = useCallback((accountId) => {
    setDemoData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        accounts: prev.accounts.filter(a => a.accountId !== accountId),
        transactions: prev.transactions.map(t => t.accountId === accountId ? { ...t, accountId: null } : t)
      };
    });
  }, []);

  const addDemoTransaction = useCallback((newTx) => {
    const created = {
      ...newTx,
      id: `tx-demo-${Date.now()}`,
      amount: Number(newTx.amount) || 0,
      accountId: newTx.accountId || null,
      source: 'manual',
      isDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDemoData(prev => {
      if (!prev) return null;
      let updatedAccounts = prev.accounts;
      if (created.accountId) {
        updatedAccounts = prev.accounts.map(a => {
          if (a.accountId === created.accountId) {
            let newBal = Number(a.balance);
            if (created.type === 'expense') newBal -= created.amount;
            else if (created.type === 'income') newBal += created.amount;
            return { ...a, balance: newBal, updatedAt: new Date().toISOString() };
          }
          return a;
        });
      }
      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: [created, ...prev.transactions]
      };
    });
    return created;
  }, []);

  const updateDemoTransaction = useCallback((id, updatedTx) => {
    setDemoData(prev => {
      if (!prev) return null;
      const oldTx = prev.transactions.find(t => t.id === id);
      let updatedAccounts = [...prev.accounts];
      if (oldTx) {
        if (oldTx.accountId) {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.accountId === oldTx.accountId) {
              let bal = Number(a.balance);
              if (oldTx.type === 'expense') bal += Number(oldTx.amount);
              else if (oldTx.type === 'income') bal -= Number(oldTx.amount);
              return { ...a, balance: bal };
            }
            return a;
          });
        }
        const newAccId = updatedTx.accountId || null;
        if (newAccId) {
          updatedAccounts = updatedAccounts.map(a => {
            if (a.accountId === newAccId) {
              let bal = Number(a.balance);
              if (updatedTx.type === 'expense') bal -= Number(updatedTx.amount);
              else if (updatedTx.type === 'income') bal += Number(updatedTx.amount);
              return { ...a, balance: bal };
            }
            return a;
          });
        }
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: prev.transactions.map(t =>
          t.id === id ? { ...t, ...updatedTx, amount: Number(updatedTx.amount) } : t
        )
      };
    });
  }, []);

  const deleteDemoTransaction = useCallback((id) => {
    setDemoData(prev => {
      if (!prev) return null;
      const tx = prev.transactions.find(t => t.id === id);
      let updatedAccounts = prev.accounts;
      if (tx && tx.accountId) {
        updatedAccounts = prev.accounts.map(a => {
          if (a.accountId === tx.accountId) {
            let bal = Number(a.balance);
            if (tx.type === 'expense') bal += Number(tx.amount);
            else if (tx.type === 'income') bal -= Number(tx.amount);
            return { ...a, balance: bal };
          }
          return a;
        });
      }
      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: prev.transactions.filter(t => t.id !== id)
      };
    });
  }, []);

  const addDemoCategory = useCallback((newCat) => {
    const cat = {
      ...newCat,
      id: `cat-demo-${Date.now()}`,
      color: newCat.color || '#52B788'
    };
    setDemoData(prev => prev ? { ...prev, categories: [...prev.categories, cat] } : null);
  }, []);

  const deleteDemoCategory = useCallback((id) => {
    setDemoData(prev => prev ? { ...prev, categories: prev.categories.filter(c => c.id !== id) } : null);
  }, []);

  const upsertDemoBudget = useCallback((categoryId, monthlyLimit) => {
    setDemoData(prev => {
      if (!prev) return null;
      let updated = [];
      const existingIndex = prev.budgets.findIndex(b => b.categoryId === categoryId);
      if (existingIndex >= 0) {
        updated = [...prev.budgets];
        updated[existingIndex] = { ...updated[existingIndex], monthlyLimit: Number(monthlyLimit) };
      } else {
        updated = [...prev.budgets, { id: `b-demo-${Date.now()}`, categoryId, monthlyLimit: Number(monthlyLimit), isDemo: true }];
      }
      return { ...prev, budgets: updated };
    });
  }, []);

  const deleteDemoBudget = useCallback((id) => {
    setDemoData(prev => prev ? { ...prev, budgets: prev.budgets.filter(b => b.id !== id) } : null);
  }, []);

  const addDemoSavingsGoal = useCallback((newGoal) => {
    const goal = {
      ...newGoal,
      id: `s-demo-${Date.now()}`,
      targetAmount: Math.max(0, Number(newGoal.targetAmount) || 0),
      currentAmount: Math.max(0, Number(newGoal.currentAmount || 0)),
      isDemo: true
    };
    setDemoData(prev => prev ? { ...prev, savingsGoals: [...prev.savingsGoals, goal] } : null);
  }, []);

  const updateDemoSavingsGoal = useCallback((goalId, updates) => {
    setDemoData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        savingsGoals: prev.savingsGoals.map(g =>
          g.id === goalId
            ? {
                ...g,
                ...updates,
                targetAmount: Math.max(0, Number(updates.targetAmount ?? g.targetAmount)),
                currentAmount: Math.max(0, Number(updates.currentAmount ?? g.currentAmount))
              }
            : g
        )
      };
    });
  }, []);

  const depositToDemoSavingsGoal = useCallback((goalId, amount) => {
    const numAmount = Math.max(0, Number(amount));
    setDemoData(prev => {
      if (!prev) return null;
      const updatedGoals = prev.savingsGoals.map(g =>
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + numAmount } : g
      );
      const goal = prev.savingsGoals.find(g => g.id === goalId);
      const depositTx = {
        id: `tx-demo-dep-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        title: `Savings Deposit: ${goal ? goal.title : 'Goal'}`,
        amount: numAmount,
        type: 'expense',
        categoryId: 'cat-6',
        accountId: null,
        isRecurring: false,
        source: 'manual',
        isDemo: true,
        note: 'Deposit towards savings goal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...prev,
        savingsGoals: updatedGoals,
        transactions: [depositTx, ...prev.transactions]
      };
    });
  }, []);

  const deleteDemoSavingsGoal = useCallback((id) => {
    setDemoData(prev => prev ? { ...prev, savingsGoals: prev.savingsGoals.filter(g => g.id !== id) } : null);
  }, []);

  
  // ==================== In-Memory Demo Community Threads ====================
  const addDemoCommunityThread = useCallback((inputData, user) => {
    const payload = buildThreadPayload(user, inputData);
    const newThread = {
      ...payload,
      id: `thread-demo-${Date.now()}`,
      replies: []
    };
    setDemoData(prev => prev ? {
      ...prev,
      threads: [newThread, ...(prev.threads || [])]
    } : null);
    return newThread;
  }, []);

  const toggleDemoCommunityVote = useCallback((threadId) => {
    setDemoUserUpvotes(prev => {
      const next = new Set(prev);
      const isVoted = next.has(threadId);
      if (isVoted) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      setDemoData(d => {
        if (!d || !d.threads) return d;
        return {
          ...d,
          threads: d.threads.map(t => {
            if (t.id === threadId) {
              return {
                ...t,
                upvoteCount: Math.max(0, (t.upvoteCount || 0) + (isVoted ? -1 : 1))
              };
            }
            return t;
          })
        };
      });
      return next;
    });
  }, []);

  const addDemoCommunityReply = useCallback((threadId, replyText, user) => {
    const reply = buildReplyPayload(user, replyText);
    const newReply = {
      ...reply,
      id: `rep-demo-${Date.now()}`
    };
    setDemoData(prev => {
      if (!prev || !prev.threads) return prev;
      return {
        ...prev,
        threads: prev.threads.map(t => {
          if (t.id === threadId) {
            const existingReplies = Array.isArray(t.replies) ? t.replies : [];
            return {
              ...t,
              replyCount: (t.replyCount || 0) + 1,
              replies: [...existingReplies, newReply]
            };
          }
          return t;
        })
      };
    });
    return newReply;
  }, []);

  const reportDemoCommunityThread = useCallback((threadId) => {
    setDemoData(prev => {
      if (!prev || !prev.threads) return prev;
      return {
        ...prev,
        threads: prev.threads.map(t => {
          if (t.id === threadId) {
            return {
              ...t,
              reportCount: (t.reportCount || 0) + 1
            };
          }
          return t;
        })
      };
    });
    showDemoNotice('Laporan diterima untuk semakan moderator.');
    return true;
  }, [showDemoNotice]);

  // Intercepted exports with friendly user guidance
  const interceptedExportPDF = useCallback(() => {
    showDemoNotice('Export PDF is disabled in Tutorial Mode to protect sample data.');
  }, [showDemoNotice]);

  const interceptedExportCSV = useCallback(() => {
    showDemoNotice('CSV Export is disabled in Tutorial Mode to protect sample data.');
  }, [showDemoNotice]);

  const interceptedExportJSONBackup = useCallback(() => {
    showDemoNotice('JSON Backup is disabled in Tutorial Mode.');
  }, [showDemoNotice]);

  const interceptedImportJSONBackup = useCallback(() => {
    showDemoNotice('Data Import is disabled in Tutorial Mode.');
    return false;
  }, [showDemoNotice]);

  // Construct context value:
  // When isTourActive is true, return the in-memory mock store.
  // When isTourActive is false, return realFinance with isDemoMode = false.
  const contextValue = useMemo(() => {
    if (!isTourActive || !demoData) {
      return {
        ...realFinance,
        isDemoMode: false,
        demoNotice: null,
        exitTour: onExitTour
      };
    }

    return {
      // Pass-through state/controls
      ...realFinance,
      isDemoMode: true,
      demoNotice,
      exitTour: onExitTour,
      // Overridden In-Memory Data
      categories: demoCategories,
      transactions: demoTransactions,
      budgets: demoBudgets,
      savingsGoals: demoSavingsGoals,
      accounts: demoAccounts,
      // Overridden Computed Values
      totalBalance: demoTotalBalance,
      totalIncome: demoTotalIncome,
      totalExpense: demoTotalExpense,
      totalAccountBalance: demoTotalAccountBalance,
      totalSavedInGoals: demoTotalSavedInGoals,
      categorySpendingBreakdown: demoCategorySpendingBreakdown,
      // Overridden In-Memory CRUD
      addAccount: addDemoAccount,
      updateAccount: updateDemoAccount,
      deleteAccount: deleteDemoAccount,
      addTransaction: addDemoTransaction,
      updateTransaction: updateDemoTransaction,
      deleteTransaction: deleteDemoTransaction,
      addCategory: addDemoCategory,
      deleteCategory: deleteDemoCategory,
      upsertBudget: upsertDemoBudget,
      deleteBudget: deleteDemoBudget,
      addSavingsGoal: addDemoSavingsGoal,
      updateSavingsGoal: updateDemoSavingsGoal,
      depositToSavingsGoal: depositToDemoSavingsGoal,
      deleteSavingsGoal: deleteDemoSavingsGoal,
    demoThreads,
    demoUserUpvotes,
    addDemoCommunityThread,
    toggleDemoCommunityVote,
    addDemoCommunityReply,
    reportDemoCommunityThread,
      // Overridden In-Memory Community
      communityThreads: demoThreads,
      communityUserUpvotes: demoUserUpvotes,
      addCommunityThread: addDemoCommunityThread,
      toggleCommunityVote: toggleDemoCommunityVote,
      addCommunityReply: addDemoCommunityReply,
      reportCommunityThread: reportDemoCommunityThread,
      // Blocked Export Functions
      exportToPDF: interceptedExportPDF,
      exportToCSV: interceptedExportCSV,
      exportJSONBackup: interceptedExportJSONBackup,
      importJSONBackup: interceptedImportJSONBackup
    };
  }, [
    isTourActive,
    demoData,
    realFinance,
    demoNotice,
    onExitTour,
    demoCategories,
    demoTransactions,
    demoBudgets,
    demoSavingsGoals,
    demoAccounts,
    demoTotalBalance,
    demoTotalIncome,
    demoTotalExpense,
    demoTotalAccountBalance,
    demoTotalSavedInGoals,
    demoCategorySpendingBreakdown,
    addDemoAccount,
    updateDemoAccount,
    deleteDemoAccount,
    addDemoTransaction,
    updateDemoTransaction,
    deleteDemoTransaction,
    addDemoCategory,
    deleteDemoCategory,
    upsertDemoBudget,
    deleteDemoBudget,
    addDemoSavingsGoal,
    updateDemoSavingsGoal,
    depositToDemoSavingsGoal,
    deleteDemoSavingsGoal,
    interceptedExportPDF,
    interceptedExportCSV,
    interceptedExportJSONBackup,
    interceptedImportJSONBackup
  ]);

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
}

export default DemoModeProvider;
