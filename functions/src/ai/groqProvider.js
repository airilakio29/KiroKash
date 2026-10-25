/**
 * KampusKash Real Groq AI Provider
 * High-speed LPU-accelerated inference with official OpenAI-compatible endpoint.
 * Real-time, dynamic AI processing with zero hardcoded fake replies.
 */

import { extractActionIntent } from './actionService.js';

export const SUPPORTED_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

/**
 * Format system prompt, financial context, and messages into valid OpenAI/Groq chat format:
 * [{ role: 'system' | 'user' | 'assistant', content }]
 */
export function formatGroqMessages(systemPrompt, financialContext, messages = []) {
  const combinedSystemPrompt = financialContext && financialContext.trim()
    ? `${systemPrompt}\n\n=== USER FINANCIAL CONTEXT ===\n${financialContext}\n=== END USER FINANCIAL CONTEXT ===`
    : systemPrompt;

  const formatted = [
    {
      role: 'system',
      content: combinedSystemPrompt
    }
  ];

  for (const msg of messages) {
    if (!msg || !msg.content || typeof msg.content !== 'string') continue;
    const text = msg.content.trim();
    if (!text) continue;

    // Map role: assistant/model -> assistant; user -> user
    const role = (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user';

    // Collapse consecutive same-role messages
    if (formatted.length > 1 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].content += `\n\n${text}`;
    } else {
      formatted.push({
        role,
        content: text
      });
    }
  }

  // Ensure there is at least one user message following the system prompt
  if (formatted.length === 1) {
    formatted.push({
      role: 'user',
      content: 'Please assist me based on my financial data.'
    });
  }

  return formatted;
}

/**
 * Call Groq Cloud API using standard high-performance fetch
 */
export async function callGroqAPI({
  systemPrompt,
  financialContext,
  messages = [],
  apiKey,
  model = 'openai/gpt-oss-120b'
}) {
  const cleanKey = apiKey ? apiKey.trim() : (process.env.GROQ_API_KEY || '').trim();

  if (!cleanKey || cleanKey === 'your_groq_api_key_here') {
    const err = new Error('Backend AI configuration error: GROQ_API_KEY is not configured (or GEMINI_API_KEY is not configured) on the server. Please configure your Groq API key in backend environment variables or secrets.');
    err.code = 'CONFIG_MISSING';
    err.status = 503;
    throw err;
  }

  const formattedMessages = formatGroqMessages(systemPrompt, financialContext, messages);
  const candidateModels = [model, ...SUPPORTED_MODELS.filter(m => m !== model)];
  let lastError = null;

  for (const targetModel of candidateModels) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data?.error?.message || `Groq API responded with HTTP ${response.status}`;
        const groqErr = new Error(errorMsg);
        groqErr.status = response.status;
        groqErr.code = data?.error?.code || 'GROQ_API_ERROR';
        throw groqErr;
      }

      const replyText = data.choices?.[0]?.message?.content;
      if (!replyText || !replyText.trim()) {
        throw new Error('Groq API returned an empty response.');
      }

      return {
        reply: replyText.trim(),
        provider: 'groq',
        model: targetModel,
        usage: data.usage || null
      };
    } catch (err) {
      lastError = err;
      const isRecoverable = err.status === 404 || err.status === 429 || err.status === 503 ||
        (err.message && (
          err.message.includes('404') ||
          err.message.includes('429') ||
          err.message.includes('503') ||
          err.message.includes('model_not_found') ||
          err.message.includes('rate_limit') ||
          err.message.includes('overloaded')
        ));

      if (!isRecoverable) {
        break;
      }
    }
  }

  throw lastError || new Error('Failed to connect to Groq AI API.');
}

/**
 * Main AI Execution Controller
 * Dispatches to Groq API, parses proposed actions, and handles errors honestly.
 * NEVER returns hardcoded, fake, or simulated responses.
 */
export async function executeAIChat({
  systemPrompt,
  financialContext,
  summary,
  messages = [],
  apiKey,
  model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
}) {
  const cleanKey = apiKey !== undefined ? apiKey : (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

  if (!cleanKey || cleanKey === 'your_groq_api_key_here') {
    const configErr = new Error('Backend AI configuration error: GROQ_API_KEY is not configured (or GEMINI_API_KEY is not configured) on the server. Please add GROQ_API_KEY to your environment variables or secret configuration.');
    configErr.code = 'CONFIG_MISSING';
    configErr.status = 503;
    throw configErr;
  }

  const lastUserMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'user')?.content || '';

  try {
    const groqResult = await callGroqAPI({
      systemPrompt,
      financialContext,
      messages,
      apiKey: cleanKey,
      model
    });

    let cleanReply = groqResult.reply;
    let proposedAction = null;

    // Check if Groq generated an action block
    const actionMatch = cleanReply.match(/```action\s*([\s\S]*?)\s*```/);
    if (actionMatch) {
      try {
        proposedAction = JSON.parse(actionMatch[1]);
        cleanReply = cleanReply.replace(/```action\s*[\s\S]*?\s*```/, '').trim();
      } catch (jsonErr) {
        console.warn('[Groq Action Parser] Failed to parse action json:', jsonErr.message);
      }
    }

    // Secondary fallback action intent detection for natural student inputs
    if (!proposedAction && summary) {
      const intent = extractActionIntent(lastUserMessage, summary);
      if (intent.hasAction) {
        proposedAction = {
          type: intent.actionType,
          payload: intent.payload,
          summary: intent.summary
        };
      }
    }

    return {
      reply: cleanReply,
      proposedAction,
      provider: 'groq',
      model: groqResult.model,
      usage: groqResult.usage
    };
  } catch (err) {
    console.error('[KampusKash Groq Provider Error]', err);

    if (err.code === 'CONFIG_MISSING') {
      throw err;
    }

    const honestError = new Error("I'm having trouble connecting to my AI service. Please try again.");
    honestError.originalError = err.message;
    honestError.status = err.status || 503;
    throw honestError;
  }
}

/**
 * Deterministic Rules Calculation Helper
 * Preserved for offline test verification.
 */
export function generateLocalFallbackResponse({ userQuery, summary }) {
  const query = (userQuery || '').toLowerCase();
  const sp = summary.spending;
  const bg = summary.budgets;
  const sg = summary.savingsGoals;
  const acc = summary.accounts;
  const intel = summary.intelligence;
  const stu = summary.student || summary.profile || { username: 'Student' };
  const banner = '';

  const actionIntent = extractActionIntent(query, summary);
  if (actionIntent.missingInfo) {
    return actionIntent.promptReply;
  }
  if (actionIntent.hasAction) {
    const { actionType, payload } = actionIntent;
    if (actionType === 'CREATE_BUDGET') {
      return `Sure! I've prepared a monthly ${payload.categoryName} budget of RM${payload.monthlyLimit.toFixed(2)}. Would you like me to save it? Please review and confirm below.`;
    }
    if (actionType === 'UPDATE_BUDGET') {
      return `Sure! I've prepared an update for your ${payload.categoryName} budget to RM${payload.monthlyLimit.toFixed(2)} / month. Would you like me to save it? Please review and confirm below.`;
    }
    if (actionType === 'CREATE_SAVINGS_GOAL') {
      return `Sure! I've prepared your savings goal for "${payload.title}" with a target of RM${payload.targetAmount.toFixed(2)} by ${payload.targetDate}. Would you like me to save it? Please review and confirm below.`;
    }
    if (actionType === 'UPDATE_SAVINGS_GOAL') {
      return `Sure! I've prepared an update for your savings goal "${payload.title}". Would you like me to save it? Please review and confirm below.`;
    }
    if (actionType === 'CREATE_TRANSACTION') {
      return `Sure! I've prepared this ${payload.type} transaction of RM${payload.amount.toFixed(2)} for "${payload.title}" (${payload.categoryName}). Would you like me to record it? Please review and confirm below.`;
    }
    if (actionType === 'GENERATE_FINANCIAL_REPORT') {
      return `I can generate your official monthly financial report for ${payload.month}. Please confirm below to review and download the statement.`;
    }
  }

  if (/why.*spend.*more|trend|compare.*(?:month|last|three)|habit|unusual/i.test(query)) {
    if (!sp.hasTransactions) {
      return banner + `You don't have enough transaction history yet to detect spending trends! 📈\n\nOnce you record transactions across this and previous months, I'll automatically track your rising categories and like-for-like trends.`;
    }

    let reply = banner + `### 📈 Spending Trend Intelligence\n\n`;
    if (intel && intel.monthComparison) {
      const comp = intel.monthComparison;
      if (comp.previousLikeForLikeExpense > 0) {
        const sign = comp.expenseDiff >= 0 ? '+' : '';
        reply += `- **Like-for-Like Trend:** ${sign}${comp.expenseDiffPct}% (${sign}RM${comp.expenseDiff.toFixed(2)}) compared to the equivalent point last month (${comp.previousMonth}).\n`;
        reply += `- **Daily Average Pace:** RM${intel.cashFlow.averageDailySpending.toFixed(2)}/day across ${intel.cashFlow.monthInfo.daysElapsed} days elapsed.\n\n`;
      }
    }

    if (intel && intel.trends && intel.trends.length > 0) {
      reply += `**Key Detected Trends & Shifts:**\n`;
      intel.trends.forEach(t => {
        reply += `- **${t.title}:** ${t.explanation}\n  *Recommendation:* ${t.recommendation}\n`;
      });
    } else {
      reply += `Your spending habits have remained stable across your monitored categories with no unusual spikes detected.`;
    }

    return reply;
  }

  if (/biggest.*expense|highest.*category|what.*spend.*most|top.*spending/i.test(query)) {
    if (!sp.hasTransactions || !sp.currentMonth.topCategory) {
      return banner + `You haven't recorded any expenses yet for this month! 🏷️\n\nLog your transactions to see which category takes up the largest share of your student budget.`;
    }

    const top = sp.currentMonth.topCategory;
    const totalExp = sp.currentMonth.expenses;
    const pct = totalExp > 0 ? ((top.amount / totalExp) * 100).toFixed(1) : 0;

    return banner + `### 🏷️ Your Highest Expense Category\n\n` +
      `- **Category:** **${top.name}**\n` +
      `- **Amount Spent This Month:** **RM${top.amount.toFixed(2)}**\n` +
      `- **Share of Total Monthly Spending:** **${pct}%** (out of RM${totalExp.toFixed(2)})\n\n` +
      `💡 *Student Insight:* Because ${top.name} represents your single biggest outflow, even a small 10% trim here frees up approximately **RM${(top.amount * 0.1).toFixed(2)}** for your savings goals!`;
  }

  if (/create.*budget|make.*budget|help.*budget|receive.*monthly|allowance.*budget/i.test(query)) {
    const incomeMatch = query.match(/rm\s*(\d+(?:\.\d{1,2})?)/i) || query.match(/(\d{3,5})\s*(?:monthly|ringgit|allowance|income)?/i);
    const parsedIncome = incomeMatch ? parseFloat(incomeMatch[1]) : (stu.monthlyAllowanceOrBudget || 850);

    const allocations = [
      { name: 'Food & Dining (Cafeteria & Meals)', pct: 40, amt: parsedIncome * 0.40, why: '~RM11-13/day for regular nutritious cafeteria meals.' },
      { name: 'Hostel & Rent / Utilities', pct: 25, amt: parsedIncome * 0.25, why: 'Room rental share or campus residential fees.' },
      { name: 'Transport & Commute (RapidKL / TnG)', pct: 10, amt: parsedIncome * 0.10, why: 'Monthly Touch n Go reload or student transit pass.' },
      { name: 'Entertainment & Mamak Socials', pct: 10, amt: parsedIncome * 0.10, why: 'Weekend study group socials and campus recreation.' },
      { name: 'Books, Supplies & Printing', pct: 5, amt: parsedIncome * 0.05, why: 'Course notes, assignments, and campus stationeries.' },
      { name: 'Savings & Emergency Reserve', pct: 10, amt: parsedIncome * 0.10, why: 'Monthly automated buffer for savings targets.' }
    ];

    let reply = banner + `### 🎯 Proposed Student Budget for RM${parsedIncome.toFixed(2)} / Month\n\n` +
      `Based on balanced campus living standards, here is an affordable student allocation:\n\n`;

    allocations.forEach(a => {
      reply += `- **${a.name}:** **RM${a.amt.toFixed(2)}** (${a.pct}%)\n  *${a.why}*\n`;
    });

    reply += `\n💡 *Next Step:* You can adjust these proposed caps to match your personal commitments in the **Insights Dashboard** or set them in the **Budgets** tab! (I will never modify your real budgets automatically without your confirmation).`;
    return reply;
  }

  if (/budget|overspend|allowance|limit|afford/i.test(query)) {
    if (bg.length === 0) {
      return banner + `You don't have any category budgets set up yet! 🎯\n\nSetting a monthly limit for categories like **Food & Dining (e.g. RM400)** or **Entertainment (e.g. RM150)** will help keep your allowance on track. Go to the **Budgets** tab to set your first limit!`;
    }

    const overBudgets = bg.filter(b => b.isOver);
    const nearBudgets = bg.filter(b => b.isNear);

    let reply = banner + `### 🎯 Budget Status & Allowance Health\n\n`;

    if (overBudgets.length > 0) {
      reply += `⚠️ **Attention needed:** You have exceeded your budget in **${overBudgets.map(b => b.category).join(', ')}**!\n`;
      overBudgets.forEach(b => {
        const overAmt = b.spentThisMonth - b.monthlyLimit;
        reply += `- **${b.category}:** Spent RM${b.spentThisMonth.toFixed(2)} / RM${b.monthlyLimit.toFixed(2)} (Over by RM${overAmt.toFixed(2)})\n`;
      });
      reply += `\n`;
    } else if (nearBudgets.length > 0) {
      reply += `🔔 **Heads up:** You are nearing your limit (>80%) in **${nearBudgets.map(b => b.category).join(', ')}**.\n\n`;
    } else {
      reply += `✅ **Great job!** All your category budgets are currently on track!\n\n`;
    }

    reply += `**Active Category Budgets:**\n`;
    bg.forEach(b => {
      reply += `- **${b.category}:** RM${b.spentThisMonth.toFixed(2)} of RM${b.monthlyLimit.toFixed(2)} used (${b.percentage}%). Remaining: **RM${b.remaining.toFixed(2)}**\n`;
    });

    return reply;
  }

  if (/save|saving|goal|reach|target|laptop|emergency/i.test(query)) {
    const targetMatch = query.match(/rm\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i) || query.match(/save\s*(\d+)/i);
    let targetMonths = 3;
    const wordNums = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
    const monthWordMatch = query.match(/(one|two|three|four|five|six|seven|eight|nine|ten|twelve|\d+)\s*months?/i);
    if (monthWordMatch) {
      const captured = monthWordMatch[1].toLowerCase();
      targetMonths = wordNums[captured] || parseInt(captured, 10) || 3;
    }

    const targetAmt = targetMatch ? parseFloat(targetMatch[1].replace(/,/g, '')) : (sg[0]?.targetAmount || 500);
    const monthlyReq = targetAmt / targetMonths;
    const weeklyReq = targetAmt / (targetMonths * 4);
    const currentSurplus = sp.currentMonth.netSavings;

    let reply = banner + `### 💰 Student Savings Feasibility Plan: RM${targetAmt.toFixed(2)} in ${targetMonths} Months\n\n` +
      `- **Required Monthly Savings:** **RM${monthlyReq.toFixed(2)} / month**\n` +
      `- **Required Weekly Savings:** **RM${weeklyReq.toFixed(2)} per week** (~RM${(weeklyReq / 7).toFixed(2)}/day)\n` +
      `- **Current Monthly Net Surplus:** **RM${currentSurplus.toFixed(2)}**\n\n`;

    if (currentSurplus >= monthlyReq) {
      reply += `✅ **Feasibility: REALISTIC.** Your current cash flow surplus can cover this target!\n\n`;
    } else {
      reply += `⚠️ **Feasibility: STRETCH GOAL.** Your current monthly surplus is RM${currentSurplus.toFixed(2)}, which is below RM${monthlyReq.toFixed(2)}/mo.\n\n` +
        `**Alternative Practical Options:**\n` +
        `1. *Extend Timeline:* Achieve RM${targetAmt} in **${Math.ceil(targetAmt / Math.max(50, currentSurplus))} months** without stress.\n` +
        `2. *Adjust Target:* Save **RM${Math.max(50, currentSurplus * targetMonths).toFixed(2)}** over ${targetMonths} months at your current pace.\n` +
        `3. *Trim Expenses:* Cutting ~RM${((monthlyReq - currentSurplus) / 4.33).toFixed(2)}/week in dining out will bridge the gap.\n\n`;
    }

    if (sg.length > 0) {
      reply += `**Your Current Active Goals:**\n`;
      sg.forEach(g => {
        reply += `- **${g.title}:** Saved RM${g.currentAmount.toFixed(2)} / RM${g.targetAmount.toFixed(2)} (${g.progressPercentage}%)\n`;
      });
    }

    return reply;
  }

  if (/spend|spent|expense|where.*money|category|food.*week|cost|outflow/i.test(query)) {
    if (!sp.hasTransactions) {
      return banner + `You haven't recorded any transactions yet in KampusKash! 📝\n\nTo get started, tap **+ Add Transaction** to log your daily cafeteria meals, books, or Touch 'n Go reloads. Once you have a few records, I'll be able to break down your highest spending categories and compare your monthly outflows!`;
    }

    if (/food|dining|makan|meal/i.test(query)) {
      const weekFood = sp.foodPast7Days;
      const foodMonth = sp.currentMonth.categoryBreakdown['Food & Dining'] || 0;
      return banner + `### 🍔 Food & Dining Spending Analysis\n\n` +
        `- **Past 7 Days:** You've spent **RM${weekFood.toFixed(2)}** on food & dining.\n` +
        `- **This Month Total:** RM${foodMonth.toFixed(2)} on food.\n\n` +
        `💡 *Student Tip:* An average campus meal at the cafeteria is RM8–RM12. Packing simple breakfasts or sharing GrabFood orders during study sessions can easily save you RM40–RM60 a week!`;
    }

    const topCat = sp.currentMonth.topCategory;
    const thisMonthExp = sp.currentMonth.expenses;
    const lastMonthExp = sp.lastMonth.expenses;
    const diff = thisMonthExp - lastMonthExp;
    const diffText = diff > 0
      ? `RM${diff.toFixed(2)} higher than last month`
      : `RM${Math.abs(diff).toFixed(2)} lower than last month`;

    let reply = banner + `### 📊 Monthly Spending Breakdown\n\n` +
      `- **Total Spent This Month:** **RM${thisMonthExp.toFixed(2)}** (${diffText}).\n` +
      `- **Total Income This Month:** **RM${sp.currentMonth.income.toFixed(2)}**.\n` +
      `- **Net Cashflow:** **RM${sp.currentMonth.netSavings.toFixed(2)}**.\n\n`;

    if (topCat) {
      reply += `🏆 **Highest Expense Category:** **${topCat.name}** at **RM${topCat.amount.toFixed(2)}**.\n\n`;
    }

    const cats = Object.entries(sp.currentMonth.categoryBreakdown);
    if (cats.length > 0) {
      reply += `**Where your money went this month:**\n`;
      cats.forEach(([name, amt]) => {
        const pct = thisMonthExp > 0 ? ((amt / thisMonthExp) * 100).toFixed(1) : 0;
        reply += `- **${name}:** RM${amt.toFixed(2)} (${pct}%)\n`;
      });
    }

    return reply;
  }

  if (/summary|situation|balance|account|overview|net|health/i.test(query)) {
    const dailyAvg = intel?.cashFlow?.averageDailySpending || 0;
    return banner + `### 💼 Financial Health Summary for ${stu.username}\n\n` +
      `- **Combined Account Balance:** **RM${acc.totalBalance.toFixed(2)}**\n` +
      `- **Average Daily Spending:** **RM${dailyAvg.toFixed(2)}/day**\n` +
      `- **This Month's Inflows:** RM${sp.currentMonth.income.toFixed(2)}\n` +
      `- **This Month's Outflows:** RM${sp.currentMonth.expenses.toFixed(2)}\n` +
      `- **Net Monthly Surplus:** **RM${sp.currentMonth.netSavings.toFixed(2)}**\n` +
      `- **Active Budgets:** ${bg.length} categories (${bg.filter(b => b.isOver).length} over budget)\n` +
      `- **Active Savings Goals:** ${sg.length} goal(s) tracking RM${sg.reduce((s, g) => s + g.currentAmount, 0).toFixed(2)}\n\n` +
      `Your finances are clear and verified. Explore the **Insights Dashboard** for interactive budget recommendations and spending trend charts!`;
  }

  return banner + `Hello ${stu.username}! 🎓 I'm your KampusKash AI personal financial intelligence assistant.\n\n` +
    `Here is where your finances stand today:\n` +
    `- **Current Balance:** RM${acc.totalBalance.toFixed(2)}\n` +
    `- **Spent This Month:** RM${sp.currentMonth.expenses.toFixed(2)}\n` +
    `- **Average Daily Spending:** RM${(intel?.cashFlow?.averageDailySpending || 0).toFixed(2)}/day\n\n` +
    `Try asking me any intelligence question:\n` +
    `1. *"Why did I spend more this month?"*\n` +
    `2. *"What is my biggest expense?"*\n` +
    `3. *"I receive RM900 monthly. Help me create a budget."*\n` +
    `4. *"I want to save RM1,000 in four months."*`;
}
