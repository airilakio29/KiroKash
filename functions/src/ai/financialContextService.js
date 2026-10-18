import {
  calculateMonthlyCashFlow,
  calculateMonthToMonthComparison,
  detectSpendingTrends,
  getMonthDaysInfo
} from './financialAnalysisService.js';

/**
 * Sanitize and validate incoming user prompt
 * Capped at max 1,000 characters and stripped of control codes.
 */
export function sanitizeUserInput(input, maxLen = 1000) {
  if (typeof input !== 'string') return '';
  // Remove ASCII control characters except newline and tab
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLen);
}

/**
 * Filter transactions by a date range (ISO YYYY-MM-DD)
 */
function getTransactionsInRange(transactions, startDate, endDate) {
  const todayStr = new Date().toISOString().split('T')[0];
  return transactions.filter(t => {
    const d = (t.date && typeof t.date === 'string') ? t.date : todayStr;
    return d >= startDate && d <= endDate;
  });
}

/**
 * Build consolidated, privacy-safe financial summary
 */
export function buildFinancialSummary(userData = {}) {
  const categories = Array.isArray(userData.categories) ? userData.categories : [];
  const transactions = Array.isArray(userData.transactions) ? userData.transactions : [];
  const budgets = Array.isArray(userData.budgets) ? userData.budgets : [];
  const savingsGoals = Array.isArray(userData.savingsGoals) ? userData.savingsGoals : [];
  const accounts = Array.isArray(userData.accounts) ? userData.accounts : [];
  const profile = userData.profile || {};

  const categoryMap = new Map();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  // Date ranges
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

  const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
  const endOfLastMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

  // 7 days ago
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  // Accounts & Balances
  const totalAccountBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const accountSummaries = accounts.map(a => ({
    name: a.accountName,
    type: a.accountType,
    balance: Number(a.balance || 0),
    institution: a.institution || 'Standard'
  }));

  // Transactions overall
  const totalIncomeAllTime = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpensesAllTime = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // This Month
  const currentMonthTxs = getTransactionsInRange(transactions, startOfMonth, endOfMonth);
  const currentMonthIncome = currentMonthTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const currentMonthExpenses = currentMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Last Month
  const lastMonthTxs = getTransactionsInRange(transactions, startOfLastMonth, endOfLastMonth);
  const lastMonthIncome = lastMonthTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const lastMonthExpenses = lastMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Category Spending this month
  const categorySpendingThisMonth = {};
  currentMonthTxs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const catName = categoryMap.get(t.categoryId) || 'Uncategorized';
      categorySpendingThisMonth[catName] = (categorySpendingThisMonth[catName] || 0) + Number(t.amount || 0);
    });

  // Top category this month
  let topCategoryThisMonth = null;
  let topCategoryAmount = 0;
  for (const [catName, amount] of Object.entries(categorySpendingThisMonth)) {
    if (amount > topCategoryAmount) {
      topCategoryAmount = amount;
      topCategoryThisMonth = { name: catName, amount };
    }
  }

  // Food spending in last 7 days
  const last7DaysTxs = getTransactionsInRange(transactions, sevenDaysAgoDate, todayStr);
  const foodCatIds = categories
    .filter(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dining'))
    .map(c => c.id);

  const foodSpendingPastWeek = last7DaysTxs
    .filter(t => t.type === 'expense' && (foodCatIds.includes(t.categoryId) || /food|meal|cafeteria|lunch|dinner|breakfast|makan|kfc|mcd/i.test(t.title)))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Budgets status
  const budgetSummaries = budgets.map(b => {
    const catName = categoryMap.get(b.categoryId) || 'General';
    const limit = Number(b.monthlyLimit || 0);
    const spent = currentMonthTxs
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const remaining = Math.max(0, limit - spent);
    const isOver = spent > limit;
    const isNear = spent >= limit * 0.8 && !isOver;
    return {
      category: catName,
      monthlyLimit: limit,
      spentThisMonth: spent,
      remaining,
      isOver,
      isNear,
      percentage: limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0
    };
  });

  // Savings Goals status
  const savingsSummaries = savingsGoals.map(g => {
    const target = Number(g.targetAmount || 0);
    const current = Number(g.currentAmount || 0);
    const remaining = Math.max(0, target - current);
    const progressPct = target > 0 ? Number(((current / target) * 100).toFixed(1)) : 0;
    return {
      title: g.title,
      targetAmount: target,
      currentAmount: current,
      remainingAmount: remaining,
      progressPercentage: progressPct,
      targetDate: g.targetDate || 'None'
    };
  });

  // Recent 10 transactions
  const recentTransactions = transactions
    .slice()
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 10)
    .map(t => ({
      date: t.date,
      title: t.title,
      amount: Number(t.amount || 0),
      type: t.type,
      category: categoryMap.get(t.categoryId) || 'Uncategorized'
    }));

  return {
    student: {
      username: profile.username || 'Student',
      university: profile.university || 'Campus Student',
      currency: profile.currency || 'RM',
      monthlyAllowanceOrBudget: profile.monthlyBudget ? Number(profile.monthlyBudget) : null
    },
    accounts: {
      totalBalance: Number(totalAccountBalance.toFixed(2)),
      accountsCount: accounts.length,
      items: accountSummaries
    },
    spending: {
      hasTransactions: transactions.length > 0,
      totalTransactionsCount: transactions.length,
      currentMonth: {
        income: currentMonthIncome,
        expenses: currentMonthExpenses,
        netSavings: currentMonthIncome - currentMonthExpenses,
        categoryBreakdown: categorySpendingThisMonth,
        topCategory: topCategoryThisMonth
      },
      lastMonth: {
        income: lastMonthIncome,
        expenses: lastMonthExpenses,
        netSavings: lastMonthIncome - lastMonthExpenses
      },
      foodPast7Days: foodSpendingPastWeek,
      allTime: {
        totalIncome: totalIncomeAllTime,
        totalExpenses: totalExpensesAllTime
      }
    },
    budgets: budgetSummaries,
    savingsGoals: savingsSummaries,
    recentTransactions,
    intelligence: {
      cashFlow: calculateMonthlyCashFlow(transactions, categories),
      monthComparison: calculateMonthToMonthComparison(transactions, categories),
      trends: detectSpendingTrends(transactions, categories, budgets)
    }
  };
}

/**
 * Format financial summary into clean, grounded context text for the AI prompt.
 */
export function formatContextForPrompt(summary) {
  if (!summary) return 'No financial data available.';

  const s = summary.student;
  const acc = summary.accounts;
  const sp = summary.spending;
  const bg = summary.budgets;
  const sg = summary.savingsGoals;
  const txs = summary.recentTransactions;
  const intel = summary.intelligence;

  let text = `=== AUTHENTICATED USER FINANCIAL PROFILE ===\n`;
  text += `Student: ${s.username} (${s.university})\n`;
  text += `Base Currency: ${s.currency}\n`;
  if (s.monthlyAllowanceOrBudget) {
    text += `Target Monthly Budget: RM${s.monthlyAllowanceOrBudget.toFixed(2)}\n`;
  }

  text += `\n=== ACCOUNTS & BALANCES ===\n`;
  text += `Total Combined Account Balance: RM${acc.totalBalance.toFixed(2)}\n`;
  if (acc.items.length === 0) {
    text += `No linked financial accounts recorded yet.\n`;
  } else {
    acc.items.forEach(a => {
      text += `- ${a.name} (${a.type}): RM${a.balance.toFixed(2)} [${a.institution}]\n`;
    });
  }

  text += `\n=== SPENDING & CASH FLOW ===\n`;
  if (!sp.hasTransactions) {
    text += `The student has 0 recorded transactions so far.\n`;
  } else {
    text += `Total recorded transactions: ${sp.totalTransactionsCount}\n`;
    text += `This Month: Income RM${sp.currentMonth.income.toFixed(2)}, Expenses RM${sp.currentMonth.expenses.toFixed(2)}, Net RM${sp.currentMonth.netSavings.toFixed(2)}\n`;
    text += `Last Month: Income RM${sp.lastMonth.income.toFixed(2)}, Expenses RM${sp.lastMonth.expenses.toFixed(2)}, Net RM${sp.lastMonth.netSavings.toFixed(2)}\n`;
    text += `Food & Dining spent in past 7 days: RM${sp.foodPast7Days.toFixed(2)}\n`;

    if (sp.currentMonth.topCategory) {
      text += `Top Spending Category this month: ${sp.currentMonth.topCategory.name} (RM${sp.currentMonth.topCategory.amount.toFixed(2)})\n`;
    }

    const cats = Object.entries(sp.currentMonth.categoryBreakdown);
    if (cats.length > 0) {
      text += `This Month Category Breakdown:\n`;
      cats.forEach(([name, amt]) => {
        text += `  * ${name}: RM${amt.toFixed(2)}\n`;
      });
    }
  }

  if (intel) {
    const cf = intel.cashFlow;
    const comp = intel.monthComparison;

    text += `\n=== VERIFIED FINANCIAL INTELLIGENCE & TRENDS ===\n`;
    text += `Average Daily Spending: RM${cf.averageDailySpending.toFixed(2)}/day (Calculated across ${cf.monthInfo.daysElapsed} days elapsed in ${cf.monthInfo.yearMonth})\n`;
    text += `Weekly Spending Breakdown:\n`;
    text += `  * ${cf.weeklyDistribution.week1.label}: RM${cf.weeklyDistribution.week1.total.toFixed(2)}\n`;
    text += `  * ${cf.weeklyDistribution.week2.label}: RM${cf.weeklyDistribution.week2.total.toFixed(2)}\n`;
    text += `  * ${cf.weeklyDistribution.week3.label}: RM${cf.weeklyDistribution.week3.total.toFixed(2)}\n`;
    text += `  * ${cf.weeklyDistribution.week4.label}: RM${cf.weeklyDistribution.week4.total.toFixed(2)}\n`;

    if (comp && comp.previousLikeForLikeExpense > 0) {
      text += `Month-to-Month Comparison (${comp.currentMonth} vs ${comp.previousMonth}):\n`;
      text += `  * Like-for-like change: ${comp.expenseDiffPct >= 0 ? '+' : ''}${comp.expenseDiffPct}% (RM${comp.expenseDiff >= 0 ? '+' : ''}${comp.expenseDiff.toFixed(2)})\n`;
      text += `  * Previous month full total: RM${comp.previousFullExpense.toFixed(2)}\n`;
    }

    if (intel.trends && intel.trends.length > 0) {
      text += `Detected Spending Trends:\n`;
      intel.trends.forEach(t => {
        text += `  * [${t.type}] ${t.title}: ${t.explanation} (${t.recommendation})\n`;
      });
    }
  }

  text += `\n=== BUDGETS ===\n`;
  if (bg.length === 0) {
    text += `No category budgets have been set up yet.\n`;
  } else {
    bg.forEach(b => {
      const statusStr = b.isOver ? 'OVER BUDGET!' : (b.isNear ? 'NEAR LIMIT (80%+)' : 'ON TRACK');
      text += `- ${b.category}: Spent RM${b.spentThisMonth.toFixed(2)} / Limit RM${b.monthlyLimit.toFixed(2)} (${b.percentage}%) - ${statusStr}. Remaining: RM${b.remaining.toFixed(2)}\n`;
    });
  }

  text += `\n=== SAVINGS GOALS ===\n`;
  if (sg.length === 0) {
    text += `No active savings goals recorded.\n`;
  } else {
    sg.forEach(g => {
      text += `- ${g.title}: Saved RM${g.currentAmount.toFixed(2)} / Target RM${g.targetAmount.toFixed(2)} (${g.progressPercentage}%). Remaining: RM${g.remainingAmount.toFixed(2)}. Target Date: ${g.targetDate}\n`;
    });
  }

  text += `\n=== RECENT TRANSACTIONS ===\n`;
  if (txs.length === 0) {
    text += `None.\n`;
  } else {
    txs.forEach(t => {
      const sign = t.type === 'income' ? '+' : '-';
      text += `* ${t.date} | ${t.title} | ${sign}RM${t.amount.toFixed(2)} | Category: ${t.category}\n`;
    });
  }

  return text.trim();
}
