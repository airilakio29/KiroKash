/**
 * KampusKash Financial Intelligence & Analysis Service
 * Pure mathematical analysis engine: smart spending calculations,
 * trend detection, budget recommendations, and savings feasibility.
 * Decoupled from AI generation to ensure 100% verified arithmetic.
 */

/**
 * Returns month days information and handles incomplete/current months.
 */
export function getMonthDaysInfo(yearMonthStr, referenceDate) {
  const now = referenceDate ? (referenceDate instanceof Date ? referenceDate : new Date(referenceDate)) : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const [year, month] = (yearMonthStr || currentYearMonth).split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const isCurrentMonth = (year === currentYear && month === currentMonth);
  const daysElapsed = isCurrentMonth
    ? Math.min(Math.max(1, now.getDate()), daysInMonth)
    : daysInMonth;
  const isCompleteMonth = !isCurrentMonth || daysElapsed === daysInMonth;

  return {
    year,
    month,
    yearMonth: `${year}-${String(month).padStart(2, '0')}`,
    daysInMonth,
    daysElapsed,
    isCurrentMonth,
    isCompleteMonth,
    daysRemaining: Math.max(0, daysInMonth - daysElapsed)
  };
}

/**
 * Helper to get the previous month string (YYYY-MM)
 */
export function getPreviousMonthStr(yearMonthStr) {
  const [year, month] = yearMonthStr.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Calculate comprehensive monthly cash flow, category breakdowns,
 * daily averages, and 4-week distribution.
 */
export function calculateMonthlyCashFlow(transactions = [], categories = [], targetYearMonth, referenceDate) {
  const monthInfo = getMonthDaysInfo(targetYearMonth, referenceDate);
  const ym = monthInfo.yearMonth;

  const categoryMap = new Map();
  categories.forEach(c => categoryMap.set(c.id, { id: c.id, name: c.name, type: c.type, color: c.color }));

  // Filter transactions for this month. Fallback missing dates to target month.
  const monthTxs = transactions.filter(t => {
    const txDate = t.date || (targetYearMonth ? `${targetYearMonth}-01` : new Date().toISOString().split('T')[0]);
    return txDate.startsWith(ym);
  });

  let totalIncome = 0;
  let totalExpense = 0;

  // Category spending map
  const catSpending = {};
  // Weekly buckets
  const weeklyBuckets = {
    week1: { label: 'Week 1 (Days 1–7)', total: 0, days: Math.min(7, monthInfo.daysElapsed) },
    week2: { label: 'Week 2 (Days 8–14)', total: 0, days: monthInfo.daysElapsed >= 8 ? Math.min(7, monthInfo.daysElapsed - 7) : 0 },
    week3: { label: 'Week 3 (Days 15–21)', total: 0, days: monthInfo.daysElapsed >= 15 ? Math.min(7, monthInfo.daysElapsed - 14) : 0 },
    week4: { label: `Week 4+ (Days 22–${monthInfo.daysInMonth})`, total: 0, days: monthInfo.daysElapsed >= 22 ? monthInfo.daysElapsed - 21 : 0 }
  };

  monthTxs.forEach(t => {
    const amt = Number(t.amount || 0);
    const txDate = t.date || (targetYearMonth ? `${targetYearMonth}-01` : new Date().toISOString().split('T')[0]);
    const day = parseInt(txDate.split('-')[2] || '1', 10);

    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpense += amt;

      const catInfo = categoryMap.get(t.categoryId) || { id: t.categoryId || 'uncategorized', name: 'Uncategorized', color: '#8B5CF6' };
      const catName = catInfo.name;
      const catId = t.categoryId || catInfo.id;

      if (!catSpending[catName]) {
        catSpending[catName] = {
          categoryId: catId,
          name: catName,
          categoryName: catName,
          total: 0,
          amount: 0,
          count: 0
        };
      }
      catSpending[catName].total += amt;
      catSpending[catName].amount += amt;
      catSpending[catName].count += 1;

      // Assign to weekly buckets
      if (day <= 7) {
        weeklyBuckets.week1.total += amt;
      } else if (day <= 14) {
        weeklyBuckets.week2.total += amt;
      } else if (day <= 21) {
        weeklyBuckets.week3.total += amt;
      } else {
        weeklyBuckets.week4.total += amt;
      }
    }
  });

  const netCashFlow = totalIncome - totalExpense;
  const averageDailySpending = monthInfo.daysElapsed > 0
    ? totalExpense / monthInfo.daysElapsed
    : 0;

  // Category Breakdown sorted descending
  const categoryBreakdown = Object.values(catSpending)
    .map(c => ({
      categoryId: c.categoryId,
      name: c.name,
      categoryName: c.name,
      total: Number(c.total.toFixed(2)),
      amount: Number(c.amount.toFixed(2)),
      count: c.count,
      percentage: totalExpense > 0 ? Number(((c.total / totalExpense) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.total - a.total);

  const highestCategory = categoryBreakdown.length > 0
    ? categoryBreakdown[0]
    : null;

  const savingsRate = totalIncome > 0
    ? Number((Math.max(0, netCashFlow / totalIncome) * 100).toFixed(1))
    : 0;

  const weeklyList = [
    { weekNumber: 1, label: weeklyBuckets.week1.label, totalExpense: Number(weeklyBuckets.week1.total.toFixed(2)), dateRange: 'Days 1–7' },
    { weekNumber: 2, label: weeklyBuckets.week2.label, totalExpense: Number(weeklyBuckets.week2.total.toFixed(2)), dateRange: 'Days 8–14' },
    { weekNumber: 3, label: weeklyBuckets.week3.label, totalExpense: Number(weeklyBuckets.week3.total.toFixed(2)), dateRange: 'Days 15–21' },
    { weekNumber: 4, label: weeklyBuckets.week4.label, totalExpense: Number(weeklyBuckets.week4.total.toFixed(2)), dateRange: `Days 22–${monthInfo.daysInMonth}` }
  ];
  weeklyList.week1 = weeklyBuckets.week1;
  weeklyList.week2 = weeklyBuckets.week2;
  weeklyList.week3 = weeklyBuckets.week3;
  weeklyList.week4 = weeklyBuckets.week4;

  return {
    monthInfo,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    netCashFlow: Number(netCashFlow.toFixed(2)),
    savingsRate,
    averageDailySpending: Number(averageDailySpending.toFixed(2)),
    dailyAverageSpending: Number(averageDailySpending.toFixed(2)),
    transactionCount: monthTxs.length,
    highestCategory,
    highestExpenseCategory: highestCategory,
    categoryBreakdown,
    categoryExpenses: categoryBreakdown,
    weeklyDistribution: weeklyList,
    daysElapsed: monthInfo.daysElapsed,
    daysInMonth: monthInfo.daysInMonth,
    projectedMonthlyExpense: Number((averageDailySpending * monthInfo.daysInMonth).toFixed(2))
  };
}

/**
 * Compare target month against previous month with like-for-like pro-rating.
 */
export function calculateMonthToMonthComparison(transactions = [], categories = [], targetYearMonth, referenceDate) {
  const currentFlow = calculateMonthlyCashFlow(transactions, categories, targetYearMonth, referenceDate);
  const prevYm = getPreviousMonthStr(currentFlow.monthInfo.yearMonth);
  const prevFlow = calculateMonthlyCashFlow(transactions, categories, prevYm, referenceDate);

  // Like-for-like comparison (same days elapsed range)
  let prevLikeForLikeExpense = 0;
  if (currentFlow.monthInfo.isCurrentMonth && currentFlow.monthInfo.daysElapsed > 0) {
    const maxDay = currentFlow.monthInfo.daysElapsed;
    const prevTxsLike = transactions.filter(t => {
      const txDate = t.date || '';
      if (!txDate.startsWith(prevYm)) return false;
      const day = parseInt(txDate.split('-')[2] || '1', 10);
      return day <= maxDay && t.type === 'expense';
    });
    prevLikeForLikeExpense = prevTxsLike.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  } else {
    prevLikeForLikeExpense = prevFlow.totalExpense;
  }

  const expenseDiff = currentFlow.totalExpense - prevLikeForLikeExpense;
  const expenseDiffPct = prevLikeForLikeExpense > 0
    ? Number(((expenseDiff / prevLikeForLikeExpense) * 100).toFixed(1))
    : 0;

  const isFirstMonth = prevLikeForLikeExpense === 0 && prevFlow.totalExpense === 0;
  const status = isFirstMonth
    ? 'first_month'
    : expenseDiff > 0
    ? 'higher'
    : expenseDiff < 0
    ? 'lower'
    : 'same';

  return {
    currentMonth: currentFlow.monthInfo.yearMonth,
    prevMonth: prevYm,
    previousMonth: prevYm,
    currentExpense: currentFlow.totalExpense,
    likeForLikeCurrent: currentFlow.totalExpense,
    previousFullExpense: prevFlow.totalExpense,
    fullPreviousMonthExpense: prevFlow.totalExpense,
    previousLikeForLikeExpense: Number(prevLikeForLikeExpense.toFixed(2)),
    likeForLikePrevious: Number(prevLikeForLikeExpense.toFixed(2)),
    isLikeForLike: currentFlow.monthInfo.isCurrentMonth,
    expenseDiff: Number(expenseDiff.toFixed(2)),
    spendingDiff: Number(expenseDiff.toFixed(2)),
    expenseDiffPct,
    spendingChangePct: expenseDiffPct,
    status,
    daysCompared: currentFlow.monthInfo.daysElapsed,
    currentIncome: currentFlow.totalIncome,
    previousIncome: prevFlow.totalIncome,
    incomeDiff: Number((currentFlow.totalIncome - prevFlow.totalIncome).toFixed(2))
  };
}

/**
 * Spending Trend Detection Engine
 * Identifies categories with increasing/decreasing trends, spikes, and budget issues.
 */
export function detectSpendingTrends(transactions = [], categories = [], budgets = [], targetYearMonth) {
  const currentFlow = calculateMonthlyCashFlow(transactions, categories, targetYearMonth);
  const prevYm = getPreviousMonthStr(currentFlow.monthInfo.yearMonth);
  const prevFlow = calculateMonthlyCashFlow(transactions, categories, prevYm);
  const comparison = calculateMonthToMonthComparison(transactions, categories, targetYearMonth);

  const categoryMap = new Map();
  categories.forEach(c => categoryMap.set(c.id, { id: c.id, name: c.name }));

  const trends = [];
  const risingCategories = [];
  const fallingCategories = [];
  const budgetRisks = [];
  const anomalies = [];
  const savingsOpportunities = [];

  // 1. Overall Monthly Expense Change
  if (comparison.previousLikeForLikeExpense > 0) {
    if (comparison.expenseDiffPct > 15) {
      trends.push({
        id: 'trend-overall-increase',
        type: 'INCREASING',
        severity: 'warning',
        title: 'Spending Up vs Last Month',
        explanation: `Your expenses are ${comparison.expenseDiffPct}% higher (RM${Math.abs(comparison.expenseDiff).toFixed(2)}) compared to the same period last month.`,
        supportingFigures: {
          current: currentFlow.totalExpense,
          previous: comparison.previousLikeForLikeExpense,
          changeAmount: comparison.expenseDiff,
          changePct: comparison.expenseDiffPct
        },
        comparisonPeriod: comparison.isLikeForLike
          ? `Compared to days 1–${currentFlow.monthInfo.daysElapsed} of ${prevYm}`
          : `Compared to ${prevYm}`,
        recommendation: 'Review your highest discretionary categories this week to steady your allowance.'
      });
    } else if (comparison.expenseDiffPct < -10) {
      trends.push({
        id: 'trend-overall-decrease',
        type: 'DECREASING',
        severity: 'positive',
        title: 'Lower Spending Trend',
        explanation: `Great pace! You have spent ${Math.abs(comparison.expenseDiffPct)}% less (saving RM${Math.abs(comparison.expenseDiff).toFixed(2)}) compared to this point last month.`,
        supportingFigures: {
          current: currentFlow.totalExpense,
          previous: comparison.previousLikeForLikeExpense,
          changeAmount: comparison.expenseDiff,
          changePct: comparison.expenseDiffPct
        },
        comparisonPeriod: `Compared to ${prevYm}`,
        recommendation: 'Consider sweeping a portion of this surplus into one of your savings goals.'
      });
    }
  }

  // 2. Category Trend Shifts (Increasing / Decreasing)
  const prevCatMap = {};
  prevFlow.categoryBreakdown.forEach(c => {
    prevCatMap[c.name] = c.total || c.amount;
  });

  currentFlow.categoryBreakdown.forEach(cat => {
    const prevAmt = prevCatMap[cat.name] || 0;
    if (prevAmt > 0) {
      const diff = cat.total - prevAmt;
      const pct = Number(((diff / prevAmt) * 100).toFixed(1));

      if (diff > 0 && pct >= 15) {
        risingCategories.push({
          name: cat.name,
          currentSpent: cat.total,
          previousSpent: prevAmt,
          percentageChange: pct,
          changeAmount: diff
        });

        trends.push({
          id: `trend-cat-inc-${cat.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'INCREASING',
          severity: 'warning',
          title: `Rising Expense in ${cat.name}`,
          explanation: `Spending in ${cat.name} increased by ${pct}% (+RM${diff.toFixed(2)}) compared to last month.`,
          supportingFigures: {
            current: cat.total,
            previous: prevAmt,
            changeAmount: diff,
            changePct: pct
          },
          comparisonPeriod: `Month-over-month (${prevYm} to ${currentFlow.monthInfo.yearMonth})`,
          recommendation: `Set a daily cap for ${cat.name} or look for student discounts to curb further rises.`
        });
      } else if (diff < 0 && pct <= -15) {
        fallingCategories.push({
          name: cat.name,
          currentSpent: cat.total,
          previousSpent: prevAmt,
          percentageChange: pct,
          changeAmount: diff
        });

        trends.push({
          id: `trend-cat-dec-${cat.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'DECREASING',
          severity: 'positive',
          title: `Reduced Spending in ${cat.name}`,
          explanation: `You cut spending in ${cat.name} by ${Math.abs(pct)}% (-RM${Math.abs(diff).toFixed(2)}).`,
          supportingFigures: {
            current: cat.total,
            previous: prevAmt,
            changeAmount: diff,
            changePct: pct
          },
          comparisonPeriod: `Month-over-month (${prevYm} to ${currentFlow.monthInfo.yearMonth})`,
          recommendation: `Awesome discipline! Keep maintaining this habit.`
        });
      }
    }
  });

  // 3. Budget Overspending / Limit Warnings
  budgets.forEach(b => {
    const catObj = categoryMap.get(b.categoryId);
    const catName = b.categoryName || catObj?.name || 'General';
    const limit = Number(b.monthlyLimit || b.limit || b.amount || 0);
    const catEntry = currentFlow.categoryBreakdown.find(c => c.name === catName || c.categoryId === b.categoryId);
    const spent = catEntry ? (catEntry.total || catEntry.amount) : 0;
    const pct = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;

    if (spent > limit) {
      const overAmt = spent - limit;
      budgetRisks.push({
        categoryId: b.categoryId,
        categoryName: catName,
        limit,
        spent,
        percentage: pct,
        status: 'exceeded'
      });

      trends.push({
        id: `trend-budget-over-${b.id || catName}`,
        type: 'BUDGET_OVERSPENT',
        severity: 'warning',
        title: `Over Budget in ${catName}`,
        explanation: `You have spent RM${spent.toFixed(2)} exceeding your monthly budget limit of RM${limit.toFixed(2)} by RM${overAmt.toFixed(2)}.`,
        supportingFigures: {
          current: spent,
          previous: limit,
          changeAmount: overAmt,
          changePct: pct
        },
        comparisonPeriod: currentFlow.monthInfo.yearMonth,
        recommendation: `Pause non-essential expenses in ${catName} for the rest of this month.`
      });
    } else if (limit > 0 && spent >= limit * 0.8) {
      budgetRisks.push({
        categoryId: b.categoryId,
        categoryName: catName,
        limit,
        spent,
        percentage: pct,
        status: 'warning'
      });

      trends.push({
        id: `trend-budget-near-${b.id || catName}`,
        type: 'NEAR_LIMIT',
        severity: 'warning',
        title: `Approaching Budget Limit in ${catName}`,
        explanation: `${catName} is at ${pct}% of limit (RM${spent.toFixed(2)} / RM${limit.toFixed(2)}) with ${currentFlow.monthInfo.daysRemaining} days remaining.`,
        supportingFigures: {
          current: spent,
          previous: limit,
          changeAmount: limit - spent,
          changePct: pct
        },
        comparisonPeriod: currentFlow.monthInfo.yearMonth,
        recommendation: `You have RM${(limit - spent).toFixed(2)} left. Aim for ~RM${((limit - spent) / Math.max(1, currentFlow.monthInfo.daysRemaining)).toFixed(2)}/day.`
      });
    }
  });

  // 4. Spending Anomalies (Single transactions > 2.5x category average)
  const monthTxs = transactions.filter(t => {
    const txDate = t.date || (targetYearMonth ? `${targetYearMonth}-01` : new Date().toISOString().split('T')[0]);
    return txDate.startsWith(currentFlow.monthInfo.yearMonth);
  });

  const catTxsMap = {};
  monthTxs.forEach(t => {
    if (t.type === 'expense') {
      const catKey = t.categoryId || 'uncategorized';
      if (!catTxsMap[catKey]) catTxsMap[catKey] = [];
      catTxsMap[catKey].push(t);
    }
  });

  Object.entries(catTxsMap).forEach(([catKey, txList]) => {
    if (txList.length >= 2) {
      const avg = txList.reduce((s, t) => s + Number(t.amount || 0), 0) / txList.length;
      txList.forEach(t => {
        const amt = Number(t.amount || 0);
        if (amt >= 30 && amt >= avg * 2.5) {
          const catName = categoryMap.get(catKey)?.name || 'General';
          anomalies.push({
            id: `anomaly-${t.id || t.title}`,
            title: t.title || 'Unusual Expense',
            amount: amt,
            categoryName: catName,
            reason: `Amount is ${((amt / avg)).toFixed(1)}x higher than category average (RM${avg.toFixed(2)})`
          });
        }
      });
    }
  });

  // 5. Potential Savings Opportunity
  const diningOrEntertainment = currentFlow.categoryBreakdown.filter(c =>
    /food|dining|entertainment|leisure|shopping|cafe/i.test(c.name)
  );
  const discretionaryTotal = diningOrEntertainment.reduce((s, c) => s + c.total, 0);
  if (discretionaryTotal >= 100) {
    const potentialSaving = Number((discretionaryTotal * 0.15).toFixed(2));
    savingsOpportunities.push({
      categoryName: diningOrEntertainment[0]?.name || 'Food & Dining',
      potentialMonthlySavings: potentialSaving,
      tip: 'Trimming 15% on dining or food deliveries by cooking campus meals on weekends'
    });

    trends.push({
      id: 'trend-savings-opportunity',
      type: 'SAVINGS_OPPORTUNITY',
      severity: 'info',
      title: 'Discretionary Savings Opportunity',
      explanation: `You've spent RM${discretionaryTotal.toFixed(2)} across dining & leisure. Trimming 15% would save you ~RM${potentialSaving.toFixed(2)}.`,
      supportingFigures: {
        current: discretionaryTotal,
        previous: 0,
        changeAmount: potentialSaving,
        changePct: 15
      },
      comparisonPeriod: currentFlow.monthInfo.yearMonth,
      recommendation: 'Brew your own morning coffee or cook dinner once a week to unlock extra savings.'
    });
  }

  // Attach structured collections to trends object
  trends.risingCategories = risingCategories;
  trends.fallingCategories = fallingCategories;
  trends.budgetRisks = budgetRisks;
  trends.anomalies = anomalies;
  trends.savingsOpportunities = savingsOpportunities;

  return trends;
}

/**
 * Personalized Budget Synthesis Engine
 * Recommends balanced allocations based on Malaysian student reality.
 */
export function calculateBudgetRecommendation({
  monthlyIncome,
  transactions = [],
  categories = [],
  budgets = [],
  savingsGoals = []
}) {
  const income = Math.max(100, Number(monthlyIncome) || 850);

  // Student 55/25/20 allocation rule
  const needsPercentage = 55;
  const wantsPercentage = 25;
  const savingsPercentage = 20;

  const needsBudget = Number((income * (needsPercentage / 100)).toFixed(2));
  const wantsBudget = Number((income * (wantsPercentage / 100)).toFixed(2));
  const savingsBudget = Number((income * (savingsPercentage / 100)).toFixed(2));

  const allocations = [
    {
      categoryId: 'cat-6',
      name: 'Food & Dining',
      percentage: 35,
      proposedLimit: Number((income * 0.35).toFixed(2)),
      explanation: 'Cafeteria meals, campus pantry groceries, and water.'
    },
    {
      categoryId: 'cat-5',
      name: 'Hostel & Rent',
      percentage: 20,
      proposedLimit: Number((income * 0.20).toFixed(2)),
      explanation: 'Campus hostel or rental room share.'
    },
    {
      categoryId: 'cat-8',
      name: 'Transport & Commute',
      percentage: 10,
      proposedLimit: Number((income * 0.10).toFixed(2)),
      explanation: 'Campus shuttle, transit card or motorcycle fuel.'
    },
    {
      categoryId: 'cat-9',
      name: 'Entertainment & Leisure',
      percentage: 15,
      proposedLimit: Number((income * 0.15).toFixed(2)),
      explanation: 'Mamak sessions, study coffee, streaming subscriptions.'
    },
    {
      categoryId: 'cat-savings',
      name: 'Savings & Goals',
      percentage: 20,
      proposedLimit: savingsBudget,
      explanation: 'Reserve towards student laptop fund or emergency buffer.'
    }
  ];

  return {
    monthlyIncome: income,
    needsPercentage,
    wantsPercentage,
    savingsPercentage,
    needsBudget,
    wantsBudget,
    savingsBudget,
    allocations,
    suggestedSavingsMonthly: savingsBudget,
    rationale: `This budget follows an affordable Malaysian student lifestyle formula reserving RM${savingsBudget.toFixed(2)} monthly towards your savings targets while prioritizing everyday campus nutrition.`
  };
}

/**
 * Savings Planner & Feasibility Engine
 */
export function calculateSavingsPlan({
  targetAmount,
  targetMonths,
  monthlySurplus = 0,
  currentSavings = 0
}) {
  const target = Math.max(10, Number(targetAmount) || 500);
  const months = Math.max(1, Number(targetMonths) || 3);
  const remainingTarget = Math.max(0, target - Number(currentSavings || 0));

  const monthlyRequired = Number((remainingTarget / months).toFixed(2));
  const weeklyRequired = Number((remainingTarget / (months * 4.333)).toFixed(2));

  const now = new Date();
  const completionDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate())
    .toISOString().split('T')[0];

  const surplus = Number(monthlySurplus) || 0;
  let feasibility = 'MODERATE';
  let feasibilityTier = 'Moderate';
  let feasibilityNote = '';
  const alternatives = [];

  if (surplus > 0 && monthlyRequired <= surplus * 0.7) {
    feasibility = 'HIGH';
    feasibilityTier = 'High';
    feasibilityNote = `High feasibility! Your monthly surplus (RM${surplus.toFixed(2)}) easily accommodates RM${monthlyRequired.toFixed(2)}/mo with plenty of breathing room.`;
  } else if (surplus > 0 && monthlyRequired <= surplus) {
    feasibility = 'MODERATE';
    feasibilityTier = 'Moderate';
    feasibilityNote = `Moderate feasibility. The required RM${monthlyRequired.toFixed(2)}/mo consumes ${(monthlyRequired / surplus * 100).toFixed(0)}% of your monthly surplus.`;
  } else {
    feasibility = 'STRETCH';
    feasibilityTier = 'Stretch';
    feasibilityNote = `Stretch goal. The required RM${monthlyRequired.toFixed(2)}/mo exceeds your current monthly surplus (RM${surplus.toFixed(2)}).`;

    const realisticMonths = Math.max(months + 2, surplus > 10 ? Math.ceil(remainingTarget / surplus) : months * 2);
    alternatives.push({
      type: 'EXTEND_TIMELINE',
      targetMonths: realisticMonths,
      requiredMonthlySavings: surplus > 10 ? surplus : Number((remainingTarget / realisticMonths).toFixed(2)),
      title: `Extend timeline to ${realisticMonths} months`,
      description: `Saving RM${(surplus > 10 ? surplus : remainingTarget / realisticMonths).toFixed(2)}/mo achieves your target comfortably.`
    });
  }

  const isRealistic = feasibility !== 'STRETCH';

  return {
    targetAmount: target,
    remainingTarget,
    currentSavings: Number(currentSavings || 0),
    targetMonths: months,
    monthlyRequired,
    weeklyRequired,
    requiredMonthlySavings: monthlyRequired,
    requiredWeeklySavings: weeklyRequired,
    estimatedCompletionDate: completionDate,
    feasibility,
    feasibilityTier,
    isRealistic,
    feasibilityNote,
    recommendation: feasibilityNote,
    alternatives,
    suggestedAlternative: alternatives[0] || null
  };
}
