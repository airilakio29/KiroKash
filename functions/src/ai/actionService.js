/**
 * KampusKash AI Action & Financial Automation Service (Backend)
 * Implements intent detection, proposal generation, strict field validation,
 * anti-replay token tracking, and atomic approval-gated mutations.
 */

// In-memory action registry for tracking pending, approved, and cancelled actions.
// Keyed by actionId.
const actionRegistry = new Map();

// In-memory action history per user (persisted during server session)
const userActionHistory = new Map();

const ACTION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export const ACTION_TYPES = {
  CREATE_BUDGET: 'CREATE_BUDGET',
  UPDATE_BUDGET: 'UPDATE_BUDGET',
  CREATE_SAVINGS_GOAL: 'CREATE_SAVINGS_GOAL',
  UPDATE_SAVINGS_GOAL: 'UPDATE_SAVINGS_GOAL',
  CREATE_TRANSACTION: 'CREATE_TRANSACTION',
  SEARCH_TRANSACTIONS: 'SEARCH_TRANSACTIONS',
  GENERATE_FINANCIAL_REPORT: 'GENERATE_FINANCIAL_REPORT'
};

/**
 * Fuzzy category resolver
 */
export function resolveCategory(categoryNameOrId, categories = []) {
  if (!categoryNameOrId) return null;
  const cats = (categories && categories.length > 0) ? categories : [
    { id: 'cat-1', name: 'Food & Dining', type: 'expense' },
    { id: 'cat-2', name: 'Transport & Commute', type: 'expense' },
    { id: 'cat-3', name: 'Books & Supplies', type: 'expense' },
    { id: 'cat-4', name: 'Hostel & Rent', type: 'expense' },
    { id: 'cat-5', name: 'Entertainment & Leisure', type: 'expense' },
    { id: 'cat-6', name: 'General & Others', type: 'expense' },
    { id: 'cat-7', name: 'Allowance', type: 'income' },
    { id: 'cat-8', name: 'Scholarship / Loan', type: 'income' }
  ];
  const str = String(categoryNameOrId).toLowerCase().trim();

  // Direct ID match
  const byId = cats.find(c => c.id && c.id.toLowerCase() === str);
  if (byId) return byId;

  // Direct Name match
  const byName = cats.find(c => c.name && c.name.toLowerCase() === str);
  if (byName) return byName;

  // Substring or keyword match
  if (/food|dining|makan|lunch|dinner|breakfast|cafe|coffee|groceries/i.test(str)) {
    return cats.find(c => /food|dining/i.test(c.name)) || cats[0];
  }
  if (/allowance|pocket|money|parents|gaji|salary|income/i.test(str)) {
    return cats.find(c => /allowance/i.test(c.name)) || cats.find(c => c.type === 'income') || cats[0];
  }
  if (/scholarship|ptptn|loan|mara|jpa/i.test(str)) {
    return cats.find(c => /scholarship|loan/i.test(c.name)) || cats[0];
  }
  if (/rent|hostel|room|housing/i.test(str)) {
    return cats.find(c => /hostel|rent/i.test(c.name)) || cats[0];
  }
  if (/transport|commute|bus|grab|mrt|lrt|tng|petrol|fuel/i.test(str)) {
    return cats.find(c => /transport|commute/i.test(c.name)) || cats[0];
  }
  if (/book|stationary|supplies|print|notes/i.test(str)) {
    return cats.find(c => /book|supplies/i.test(c.name)) || cats[0];
  }
  if (/entertainment|game|movie|outing|mamak|leisure/i.test(str)) {
    return cats.find(c => /entertainment|leisure/i.test(c.name)) || cats[0];
  }

  return cats.find(c => c.name && c.name.toLowerCase().includes(str)) || cats[0] || null;
}

/**
 * Fuzzy account resolver
 */
export function resolveAccount(accountNameOrId, accounts = []) {
  if (!accountNameOrId) return accounts[0] || null;
  const str = String(accountNameOrId).toLowerCase().trim();

  const byId = accounts.find(a => a.accountId.toLowerCase() === str);
  if (byId) return byId;

  const byName = accounts.find(a => a.accountName.toLowerCase().includes(str));
  if (byName) return byName;

  return accounts[0] || null;
}

/**
 * Parse relative date string (e.g. "today", "yesterday") or YYYY-MM-DD
 */
export function parseDate(dateStr) {
  const now = new Date();
  if (!dateStr || dateStr.toLowerCase() === 'today') {
    return now.toISOString().split('T')[0];
  }
  if (dateStr.toLowerCase() === 'yesterday') {
    const y = new Date(now.getTime() - 86400000);
    return y.toISOString().split('T')[0];
  }
  // Validate format
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return dateStr.slice(0, 10);
}

/**
 * Extract Action Intent and Parameters from natural language query
 */
export function extractActionIntent(queryText, userData = {}) {
  const query = (queryText || '').trim();
  const qLower = query.toLowerCase();
  const DEFAULT_CATEGORIES = [
    { id: 'cat-1', name: 'Food & Dining', type: 'expense' },
    { id: 'cat-2', name: 'Transport & Commute', type: 'expense' },
    { id: 'cat-3', name: 'Books & Supplies', type: 'expense' },
    { id: 'cat-4', name: 'Hostel & Rent', type: 'expense' },
    { id: 'cat-5', name: 'Entertainment & Leisure', type: 'expense' },
    { id: 'cat-6', name: 'General & Others', type: 'expense' },
    { id: 'cat-7', name: 'Allowance', type: 'income' },
    { id: 'cat-8', name: 'Scholarship / Loan', type: 'income' }
  ];
  const categories = (userData.categories && userData.categories.length > 0)
    ? userData.categories
    : DEFAULT_CATEGORIES;
  const accounts = (userData.accounts && userData.accounts.length > 0)
    ? userData.accounts
    : [
      { accountId: 'acc-1', accountName: 'Cash', type: 'cash' },
      { accountId: 'acc-2', accountName: 'Bank Account', type: 'bank' }
    ];
  const budgets = userData.budgets || [];
  const savingsGoals = userData.savingsGoals || [];
  // 0. Filter out inquiry / analytical questions so they don't trigger action creation
  const isQuestion = /^(?:how|what|why|where|can you show|show|tell|check|analyse|analyze|did i|have i|am i|do i|is my|alert)\b|\?$/i.test(qLower) ||
                     /\b(how much|how many|what did i|what was|did i spend|have i spent|my spending|spending breakdown|spending analysis)\b/i.test(qLower);

  // 1. Transaction Creation: "spent RM15 on lunch", "bought notes for RM20", "received RM500 allowance"
  const isExpenseIntent = !isQuestion && (
    /^(?:i\s+)?(?:spent|paid|bought|ordered|terbeli|bayar)\b/i.test(qLower) ||
    /\b(?:spent|paid|bought)\s+rm\s*\d+/i.test(qLower) ||
    /\b(?:record|add|log|create|enter)\s+(?:an?\s+)?(?:expense|transaction|purchase)\b/i.test(qLower)
  );

  const isIncomeIntent = !isQuestion && (
    /^(?:i\s+)?(?:received|got|earned|claimed|masuk|terima)\b/i.test(qLower) ||
    /\b(?:received|got|earned)\s+rm\s*\d+/i.test(qLower) ||
    /\b(?:record|add|log|create|enter)\s+(?:an?\s+)?(?:income|allowance|salary|money)\b/i.test(qLower) ||
    /\bpocket\s+money\b/i.test(qLower)
  );

  if ((isExpenseIntent || isIncomeIntent) && !/budget|goal|save|saving|plan/i.test(qLower)) {
    const type = isIncomeIntent ? 'income' : 'expense';

    // Amount extraction: RM 15, RM15.50, $15, 15 ringgit
    const amtMatch = query.match(/rm\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
                     query.match(/(\d+(?:\.\d{1,2})?)\s*(?:ringgit|myr|rm)/i);

    if (!amtMatch) {
      // Missing essential amount information!
      return {
        hasAction: false,
        missingInfo: true,
        missingField: 'amount',
        promptReply: `I can help you record this ${type} transaction, but how much did you ${type === 'expense' ? 'spend' : 'receive'}? Please state the amount (e.g. RM15.00).`
      };
    }

    const rawAmt = amtMatch[1].replace(/,/g, '');
    const amount = parseFloat(rawAmt);
    if (isNaN(amount) || amount <= 0) {
      return {
        hasAction: false,
        invalidInfo: true,
        error: 'Please specify a valid transaction amount greater than RM 0.'
      };
    }

    // Title / description extraction
    let title = '';
    const forMatch = query.match(/(?:for|on|title|for\s+buying)\s+([^.,!?\n]+)/i);
    if (forMatch) {
      title = forMatch[1].trim();
    } else {
      // Heuristic from keywords
      const cleaned = query
        .replace(/rm\s*\d+(?:\.\d{1,2})?/gi, '')
        .replace(/today|yesterday|spent|spend|bought|paid|received|got|i/gi, '')
        .trim();
      title = cleaned.length > 2 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : (type === 'expense' ? 'Campus Expense' : 'Allowance');
    }

    // Category resolution
    const cat = resolveCategory(title, categories) ||
                (type === 'income' ? resolveCategory('allowance', categories) : resolveCategory('food', categories));

    // Date resolution
    let date = new Date().toISOString().split('T')[0];
    if (qLower.includes('yesterday')) {
      date = parseDate('yesterday');
    }

    // Account resolution
    let account = null;
    accounts.forEach(a => {
      if (qLower.includes(a.accountName.toLowerCase()) || qLower.includes(a.institution?.toLowerCase())) {
        account = a;
      }
    });
    if (!account && accounts.length > 0) {
      account = accounts[0]; // default to first account
    }

    return {
      hasAction: true,
      actionType: ACTION_TYPES.CREATE_TRANSACTION,
      payload: {
        type,
        amount,
        title,
        categoryId: cat?.id || (categories[0]?.id || 'cat-6'),
        categoryName: cat?.name || 'General',
        date,
        accountId: account?.accountId || null,
        accountName: account?.accountName || 'Cash / Default'
      },
      summary: `Record ${type.toUpperCase()}: RM${amount.toFixed(2)} for "${title}" (${cat?.name || 'General'})`
    };
  }

  // 2. Budget Creation & Update: "create food budget of RM250", "set RM300 for books", "update food budget to RM350"
  if (/budget/i.test(qLower) && (/create|set|make|add|new|update|change|increase|decrease|reduce|adjust/i.test(qLower))) {
    const isUpdate = /update|change|adjust|increase|decrease|reduce/i.test(qLower);

    const amtMatch = query.match(/rm\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
                     query.match(/(\d+(?:\.\d{1,2})?)\s*(?:ringgit|myr|rm)/i);

    if (!amtMatch) {
      return {
        hasAction: false,
        missingInfo: true,
        missingField: 'monthlyLimit',
        promptReply: 'What monthly budget limit would you like to set? Please state the amount (e.g. RM250).'
      };
    }

    const monthlyLimit = parseFloat(amtMatch[1].replace(/,/g, ''));
    if (isNaN(monthlyLimit) || monthlyLimit <= 0) {
      return {
        hasAction: false,
        invalidInfo: true,
        error: 'Budget limits must be greater than RM 0.'
      };
    }

    // Find category from query
    let cat = null;
    categories.forEach(c => {
      if (qLower.includes(c.name.toLowerCase())) {
        cat = c;
      }
    });

    if (!cat) {
      cat = resolveCategory(query, categories) || categories.find(c => /food/i.test(c.name)) || categories[0];
    }

    // Check if budget already exists for this category
    // Check if budget already exists for this category
    const existingBudget = budgets.find(b => b.categoryId === cat?.id);

    const catId = cat?.id || 'cat-1';
    const catName = cat?.name || 'Food & Dining';

    if (isUpdate) {
      return {
        hasAction: true,
        actionType: ACTION_TYPES.UPDATE_BUDGET,
        payload: {
          budgetId: existingBudget?.id || `b-${catId}`,
          categoryId: catId,
          categoryName: catName,
          monthlyLimit,
          previousLimit: existingBudget?.monthlyLimit || 0
        },
        summary: `Update ${catName} budget from RM${(existingBudget?.monthlyLimit || 0).toFixed(2)} to RM${monthlyLimit.toFixed(2)} / month`
      };
    }

    return {
      hasAction: true,
      actionType: ACTION_TYPES.CREATE_BUDGET,
      payload: {
        categoryId: catId,
        categoryName: catName,
        monthlyLimit,
        period: 'monthly'
      },
      summary: `Create monthly ${catName} budget of RM${monthlyLimit.toFixed(2)}`
    };
  }

  // 3. Savings Goal Creation & Update: "create savings goal RM1200 for laptop by december"
  if (/saving|goal|target|fund/i.test(qLower) && (/create|start|set|add|new|update|change|increase|adjust|target\s+date|target\s+is|aim/i.test(qLower))) {
    const isUpdate = /update|change|increase|adjust/i.test(qLower);

    const amtMatch = query.match(/rm\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
                     query.match(/(\d+(?:\.\d{1,2})?)\s*(?:ringgit|myr|rm)/i);

    if (!amtMatch && !isUpdate) {
      return {
        hasAction: false,
        missingInfo: true,
        missingField: 'targetAmount',
        promptReply: 'What is your target savings amount in RM? (e.g. RM1,000)'
      };
    }

    const targetAmount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 500;
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return {
        hasAction: false,
        invalidInfo: true,
        error: 'Target savings amount must be greater than RM 0.'
      };
    }

    // Extract title or match against existing goals
    let title = 'Campus Goal';
    const mentionedGoal = savingsGoals.find(g => qLower.includes(g.title.toLowerCase()));
    if (mentionedGoal) {
      title = mentionedGoal.title;
    } else {
      const forMatch = query.match(/(?:for|named|title|called)\s+([^.,!?\n]+)/i);
      if (forMatch) {
        title = forMatch[1]
          .replace(/^(?:a|an|the)\s+/i, '')
          .replace(/by\s+.*$/i, '')
          .trim();
      } else if (/phone|iphone/i.test(query)) {
        title = 'New Phone';
      } else if (/laptop/i.test(query)) {
        title = 'Laptop Fund';
      } else if (/emergency/i.test(query)) {
        title = 'Emergency Campus Buffer';
      } else if (/travel|holiday|trip/i.test(query)) {
        title = 'Semester Break Trip';
      }
    }

    // Target date extraction (check for YYYY-MM-DD or keywords)
    let targetDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    const explicitDateMatch = query.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (explicitDateMatch) {
      targetDate = explicitDateMatch[1];
    } else if (/next year/i.test(qLower)) {
      const nextYear = new Date().getFullYear() + 1;
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      let matchedMonth = 4; // default May (month index 4) if 'may' present
      for (let m = 0; m < 12; m++) {
        if (qLower.includes(monthNames[m])) {
          matchedMonth = m;
          break;
        }
      }
      const lastDay = new Date(nextYear, matchedMonth + 1, 0).getDate();
      const monthStr = String(matchedMonth + 1).padStart(2, '0');
      targetDate = `${nextYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    } else if (/december/i.test(qLower)) {
      targetDate = `${new Date().getFullYear()}-12-31`;
    } else if (/next month/i.test(qLower)) {
      targetDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    } else if (/six months|6 months/i.test(qLower)) {
      targetDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    }

    const currentAmount = /no money|no deposit|zero|rm\s*0\b/i.test(qLower) ? 0 : 0;

    const existingGoal = mentionedGoal || savingsGoals.find(g => g.title.toLowerCase().includes(title.toLowerCase()));

    if (existingGoal && isUpdate) {
      return {
        hasAction: true,
        actionType: ACTION_TYPES.UPDATE_SAVINGS_GOAL,
        payload: {
          goalId: existingGoal.id,
          title: existingGoal.title,
          targetAmount,
          targetDate
        },
        summary: `Update "${existingGoal.title}" target to RM${targetAmount.toFixed(2)} (Target Date: ${targetDate})`
      };
    }

    return {
      hasAction: true,
      actionType: ACTION_TYPES.CREATE_SAVINGS_GOAL,
      payload: {
        title,
        targetAmount,
        targetDate,
        currentAmount
      },
      summary: `Create savings goal: "${title}" of RM${targetAmount.toFixed(2)} by ${targetDate}`
    };
  }


  // 4. Financial Report Generation Request
  if (/generate.*report|export.*report|monthly.*statement|download.*pdf/i.test(qLower)) {
    const ymMatch = query.match(/(\d{4}-\d{2})/);
    const month = ymMatch ? ymMatch[1] : new Date().toISOString().slice(0, 7);
    return {
      hasAction: true,
      actionType: ACTION_TYPES.GENERATE_FINANCIAL_REPORT,
      payload: { month },
      summary: `Generate and download Monthly Financial Intelligence Statement for ${month}`
    };
  }

  return { hasAction: false };
}

/**
 * Validate an action proposal before creating it
 */
export function validateActionProposal(arg1, arg2, arg3) {
  let type, payload = {}, userData = {};
  if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
    type = arg1.type || arg1.actionType;
    payload = arg1.payload || {};
    userData = arg1.userData || {};
  } else {
    type = arg1;
    payload = arg2 || {};
    userData = arg3 || {};
  }

  if (!ACTION_TYPES[type]) {
    return { valid: false, error: `Unsupported action type: "${type}".` };
  }

  let amount = payload.amount !== undefined ? Number(payload.amount) : (payload.monthlyLimit !== undefined ? Number(payload.monthlyLimit) : (payload.targetAmount !== undefined ? Number(payload.targetAmount) : null));
  let category = payload.categoryName || null;
  let account = payload.accountName || null;
  let date = payload.date || payload.targetDate || null;

  switch (type) {
    case ACTION_TYPES.CREATE_BUDGET: {
      const limit = Number(payload.monthlyLimit);
      if (isNaN(limit) || limit <= 0 || !isFinite(limit)) {
        return { valid: false, error: 'Monthly budget limit must be a valid number greater than RM 0.' };
      }
      if (!payload.categoryId) {
        return { valid: false, error: 'Please specify a category for the budget.' };
      }
      // Check duplicate
      const budgets = userData.budgets || [];
      const exists = budgets.some(b => b.categoryId === payload.categoryId);
      if (exists) {
        return { valid: false, error: `A budget for ${payload.categoryName || 'this category'} already exists. Please update the existing budget instead.` };
      }
      return { valid: true, actionType: type, payload, amount, category, account, date, summary: payload.summary || `Create RM${limit.toFixed(2)} budget for ${category}` };
    }

    case ACTION_TYPES.UPDATE_BUDGET: {
      const limit = Number(payload.monthlyLimit);
      if (isNaN(limit) || limit <= 0 || !isFinite(limit)) {
        return { valid: false, error: 'Updated budget limit must be greater than RM 0.' };
      }
      return { valid: true, actionType: type, payload, amount, category, account, date, summary: payload.summary || `Update budget for ${category} to RM${limit.toFixed(2)}` };
    }

    case ACTION_TYPES.CREATE_SAVINGS_GOAL: {
      if (!payload.title || !payload.title.trim()) {
        return { valid: false, error: 'Savings goal requires a non-empty title.' };
      }
      const target = Number(payload.targetAmount);
      if (isNaN(target) || target <= 0 || !isFinite(target)) {
        return { valid: false, error: 'Target amount must be a positive number greater than RM 0.' };
      }
      if (payload.targetDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.targetDate)) {
          const parsed = Date.parse(payload.targetDate);
          if (!isNaN(parsed)) {
            const d = new Date(parsed);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            payload.targetDate = `${year}-${month}-${day}`;
          } else {
            return { valid: false, error: 'Invalid target date format. Please use YYYY-MM-DD.' };
          }
        } else if (isNaN(new Date(payload.targetDate).getTime())) {
          return { valid: false, error: 'Invalid target date format. Please use YYYY-MM-DD.' };
        }
      }
      return { valid: true, actionType: type, payload, amount: target, category, account, date: payload.targetDate || date, summary: payload.summary || `Create savings goal: "${payload.title}" of RM${target.toFixed(2)}` };
    }

    case ACTION_TYPES.UPDATE_SAVINGS_GOAL: {
      const goals = userData.savingsGoals || [];
      if (payload.goalId && !goals.some(g => g.id === payload.goalId)) {
        return { valid: false, error: `Savings goal with ID "${payload.goalId}" not found.` };
      }
      if (payload.targetAmount !== undefined) {
        const target = Number(payload.targetAmount);
        if (isNaN(target) || target <= 0) {
          return { valid: false, error: 'Target amount must be greater than RM 0.' };
        }
      }
      return { valid: true, actionType: type, payload, amount, category, account, date, summary: payload.summary || `Update savings goal: "${payload.title}"` };
    }

    case ACTION_TYPES.CREATE_TRANSACTION: {
      const amt = Number(payload.amount);
      if (isNaN(amt) || amt <= 0 || !isFinite(amt)) {
        return { valid: false, error: 'Transaction amount must be a positive number greater than RM 0.' };
      }
      if (!payload.title || !payload.title.trim()) {
        return { valid: false, error: 'Please provide a title or description for the transaction.' };
      }
      if (!payload.categoryId) {
        return { valid: false, error: 'Please specify a valid category.' };
      }
      if (payload.date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || isNaN(new Date(payload.date).getTime())) {
          return { valid: false, error: 'Invalid date format. Please use YYYY-MM-DD.' };
        }
      }
      return { valid: true, actionType: type, payload, amount, category, account, date, summary: payload.summary || `Record ${payload.type || 'expense'}: RM${amt.toFixed(2)} for "${payload.title}"` };
    }

    case ACTION_TYPES.SEARCH_TRANSACTIONS:
    case ACTION_TYPES.GENERATE_FINANCIAL_REPORT:
      return { valid: true, actionType: type, payload, amount, category, account, date, summary: payload.summary || 'Financial Action' };

    default:
      return { valid: false, error: 'Unknown action type.' };
  }
}

/**
 * Register a pending action in the backend registry
 */
export function createPendingAction(arg1, arg2) {
  let type, payload, userId, summary, amount, category, account, date;

  if (typeof arg1 === 'string' && typeof arg2 === 'object') {
    userId = arg1;
    type = arg2.actionType || arg2.type;
    payload = arg2.payload || arg2;
    summary = arg2.summary || '';
    amount = arg2.amount;
    category = arg2.category;
    account = arg2.account;
    date = arg2.date;
  } else {
    type = arg1.type || arg1.actionType;
    payload = arg1.payload || {};
    userId = arg1.userId || 'guest';
    summary = arg1.summary || '';
    amount = arg1.amount;
    category = arg1.category;
    account = arg1.account;
    date = arg1.date;
  }

  const actionId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const expiresAt = now.getTime() + ACTION_EXPIRY_MS;

  const action = {
    actionId,
    id: actionId,
    type,
    actionType: type,
    userId: userId || 'guest',
    payload,
    details: payload,
    summary,
    amount: amount !== undefined ? amount : (payload?.amount ?? payload?.monthlyLimit ?? payload?.targetAmount),
    category: category || payload?.categoryName || null,
    account: account || payload?.accountName || null,
    date: date || payload?.date || payload?.targetDate || null,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt,
    requiresConfirmation: true
  };

  actionRegistry.set(actionId, action);

  // Add to user action history
  if (!userActionHistory.has(userId)) {
    userActionHistory.set(userId, []);
  }
  userActionHistory.get(userId).unshift({
    actionId,
    type,
    actionType: type,
    summary,
    amount: action.amount,
    category: action.category,
    account: action.account,
    date: action.date,
    status: 'pending',
    createdAt: action.createdAt,
    payload
  });

  return action;
}

export const registerPendingAction = createPendingAction;

/**
 * Execute an approved action after authentication and ownership verification
 */
export function executeAction(arg1, arg2, arg3) {
  let actionId, userId, userData;
  if (typeof arg1 === 'string') {
    actionId = arg1;
    userId = arg2;
    userData = arg3 || {};
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    actionId = arg1.actionId || arg1.id;
    userId = arg1.userId;
    userData = arg1.userData || {};
  }

  if (!actionId || typeof actionId !== 'string') {
    return { success: false, error: 'Missing required actionId parameter.' };
  }

  const action = actionRegistry.get(actionId);

  if (!action) {
    return { success: false, error: 'Action proposal not found.' };
  }

  // 1. Ownership Check
  if (action.userId && action.userId !== 'guest' && action.userId !== userId) {
    return { success: false, error: 'Security violation: Unauthorized action ownership. You cannot execute an action proposed for another user.' };
  }

  // 2. Status / Replay Attack Check
  if (action.status !== 'pending') {
    return { success: false, error: `Action already approved or processed: ${action.status} (anti-replay check).` };
  }

  // 3. Expiration Check
  const expTime = typeof action.expiresAt === 'number' ? action.expiresAt : new Date(action.expiresAt).getTime();
  if (expTime < Date.now()) {
    action.status = 'expired';
    updateUserActionStatus(userId, actionId, 'expired');
    return { success: false, status: 'expired', error: 'This action proposal has expired (15-minute validity). Please request it again.' };
  }


  // 4. Perform Business Logic Mutation
  const executedAt = new Date().toISOString();
  let resultRecord = null;
  let updatedUserData = { ...userData };

  try {
    switch (action.type) {
      case ACTION_TYPES.CREATE_BUDGET: {
        const newBudget = {
          id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          categoryId: action.payload.categoryId,
          categoryName: action.payload.categoryName,
          monthlyLimit: Number(action.payload.monthlyLimit),
          createdAt: executedAt,
          updatedAt: executedAt
        };
        const currentBudgets = Array.isArray(userData.budgets) ? [...userData.budgets] : [];
        updatedUserData.budgets = [...currentBudgets, newBudget];
        resultRecord = newBudget;
        break;
      }

      case ACTION_TYPES.UPDATE_BUDGET: {
        const currentBudgets = Array.isArray(userData.budgets) ? [...userData.budgets] : [];
        const idx = currentBudgets.findIndex(b => b.id === action.payload.budgetId || b.categoryId === action.payload.categoryId);
        if (idx >= 0) {
          currentBudgets[idx] = {
            ...currentBudgets[idx],
            monthlyLimit: Number(action.payload.monthlyLimit),
            updatedAt: executedAt
          };
          resultRecord = currentBudgets[idx];
        } else {
          // create if not existing
          const newB = {
            id: `b-${Date.now()}`,
            categoryId: action.payload.categoryId,
            categoryName: action.payload.categoryName,
            monthlyLimit: Number(action.payload.monthlyLimit),
            createdAt: executedAt,
            updatedAt: executedAt
          };
          currentBudgets.push(newB);
          resultRecord = newB;
        }
        updatedUserData.budgets = currentBudgets;
        break;
      }

      case ACTION_TYPES.CREATE_SAVINGS_GOAL: {
        const newGoal = {
          id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: action.payload.title,
          targetAmount: Number(action.payload.targetAmount),
          currentAmount: Number(action.payload.currentAmount || 0),
          targetDate: action.payload.targetDate,
          createdAt: executedAt,
          updatedAt: executedAt
        };
        const currentGoals = Array.isArray(userData.savingsGoals) ? [...userData.savingsGoals] : [];
        updatedUserData.savingsGoals = [...currentGoals, newGoal];
        resultRecord = newGoal;
        break;
      }

      case ACTION_TYPES.UPDATE_SAVINGS_GOAL: {
        const currentGoals = Array.isArray(userData.savingsGoals) ? [...userData.savingsGoals] : [];
        const idx = currentGoals.findIndex(g => g.id === action.payload.goalId);
        if (idx >= 0) {
          currentGoals[idx] = {
            ...currentGoals[idx],
            targetAmount: Number(action.payload.targetAmount ?? currentGoals[idx].targetAmount),
            targetDate: action.payload.targetDate || currentGoals[idx].targetDate,
            updatedAt: executedAt
          };
          resultRecord = currentGoals[idx];
        }
        updatedUserData.savingsGoals = currentGoals;
        break;
      }

      case ACTION_TYPES.CREATE_TRANSACTION: {
        const newTx = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: action.payload.type,
          amount: Number(action.payload.amount),
          title: action.payload.title,
          categoryId: action.payload.categoryId,
          accountId: action.payload.accountId || null,
          date: action.payload.date || executedAt.split('T')[0],
          source: 'ai_assistant',
          isRecurring: false,
          note: 'Created via KampusKash AI Assistant',
          createdAt: executedAt,
          updatedAt: executedAt
        };

        const currentTxs = Array.isArray(userData.transactions) ? [...userData.transactions] : [];
        updatedUserData.transactions = [newTx, ...currentTxs];

        // Single Source of Truth Account Adjustment
        if (newTx.accountId && Array.isArray(userData.accounts)) {
          updatedUserData.accounts = userData.accounts.map(acc => {
            if (acc.accountId === newTx.accountId) {
              let newBalance = Number(acc.balance);
              if (newTx.type === 'expense') newBalance -= newTx.amount;
              else if (newTx.type === 'income') newBalance += newTx.amount;
              return { ...acc, balance: Number(newBalance.toFixed(2)), updatedAt: executedAt };
            }
            return acc;
          });
        }
        resultRecord = newTx;
        break;
      }

      case ACTION_TYPES.GENERATE_FINANCIAL_REPORT: {
        resultRecord = { month: action.payload.month, ready: true };
        break;
      }

      default:
        return { success: false, error: `Cannot execute action type ${action.type}` };
    }

    action.status = 'approved';
    action.executedAt = executedAt;
    action.resultRecordId = resultRecord?.id || resultRecord?.month || null;
    if (action.details) {
      action.details.recordId = action.resultRecordId;
    }

    updateUserActionStatus(userId, actionId, 'approved', executedAt, action.resultRecordId);

    return {
      success: true,
      action,
      actionId,
      actionType: action.type,
      message: `Action executed successfully: ${action.summary}`,
      resultRecord,
      updatedUserData,
      updatedData: updatedUserData
    };

  } catch (err) {
    action.status = 'failed';
    updateUserActionStatus(userId, actionId, 'failed');
    return { success: false, error: `Execution error: ${err.message}` };
  }
}

/**
 * Cancel a pending action
 */
export function cancelAction(arg1, arg2) {
  let actionId, userId;
  if (typeof arg1 === 'string') {
    actionId = arg1;
    userId = arg2;
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    actionId = arg1.actionId || arg1.id;
    userId = arg1.userId;
  }

  if (!actionId || typeof actionId !== 'string') {
    return { success: false, error: 'Missing required actionId parameter.' };
  }

  const action = actionRegistry.get(actionId);
  if (!action) {
    return { success: false, error: 'Action not found.' };
  }
  if (action.userId && action.userId !== 'guest' && action.userId !== userId) {
    return { success: false, error: 'Security violation: Unauthorized action ownership. Cannot cancel another user\'s action.' };
  }
  if (action.status !== 'pending') {
    return { success: false, error: `Action is already ${action.status}.` };
  }

  action.status = 'cancelled';
  updateUserActionStatus(userId, actionId, 'cancelled');

  return { success: true, action, actionId, status: 'cancelled', message: 'Action proposal cancelled. No changes were made.' };
}

/**
 * Retrieve user's AI action history
 */
export function getActionHistory(userId) {
  const list = userActionHistory.get(userId) || [];
  // Update expired statuses
  const now = Date.now();
  return list.map(item => {
    const act = actionRegistry.get(item.actionId);
    if (act && act.status === 'pending' && new Date(act.expiresAt).getTime() < now) {
      act.status = 'expired';
      item.status = 'expired';
    }
    return item;
  });
}

function updateUserActionStatus(userId, actionId, status, executedAt = null, resultRecordId = null) {
  const list = userActionHistory.get(userId) || [];
  const item = list.find(a => a.actionId === actionId);
  if (item) {
    item.status = status;
    if (executedAt) item.executedAt = executedAt;
    if (resultRecordId) item.resultRecordId = resultRecordId;
  }
}
