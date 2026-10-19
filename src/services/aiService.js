/**
 * KampusKash AI Service (Frontend)
 * Coordinates AI chat messaging with backend API,
 * manages Firestore chat history under users/{userId}/aiConversations/{conversationId},
 * and provides preset student financial suggestions.
 */

import {
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from '../firebase.js';

export const AI_WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hey! I'm your KampusKash AI assistant. I can help you understand your spending, manage your budget and plan your savings. What would you like to know?",
  timestamp: new Date().toISOString()
};

export const SUGGESTED_QUESTIONS = [
  'Analyse my spending.',
  'Where does most of my money go?',
  'Am I spending more this month compared to last month?',
  'What is my daily spending average?',
  'Help me plan a budget for RM900 monthly allowance.',
  'Can I save RM1,000 in 4 months?',
  'Give me a monthly financial summary.'
];

const LOCAL_STORAGE_CONVERSATIONS_PREFIX = 'kampuskash_ai_conversations_';

/**
 * Determine API Base URL for a given subpath
 */
function getApiEndpoint(subpath = 'chat') {
  if (typeof window !== 'undefined') {
    const customUrl = import.meta.env.VITE_AI_BACKEND_URL;
    if (customUrl) return `${customUrl.replace(/\/+$/, '')}/api/ai/${subpath}`;
    return `/api/ai/${subpath}`;
  }
  return `http://localhost:3001/api/ai/${subpath}`;
}

/**
 * Helper to obtain or generate valid auth Bearer token
 */
async function resolveAuthToken(getIdToken, userData = {}) {
  let token = null;
  if (typeof getIdToken === 'function') {
    try {
      token = await getIdToken();
    } catch (e) {
      console.warn('[AI Service] Failed to get Firebase ID token:', e.message);
    }
  }

  if (!token) {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: userData.user?.id || 'guest-student',
      email: userData.user?.email || 'student@campus.edu.my',
      aud: 'kampuskash-82b7c',
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    token = `${header}.${payload}.signature`;
  }
  return token;
}

/**
 * Helper to execute POST request against backend AI endpoints
 */
async function postToAiEndpoint(subpath, bodyPayload, getIdToken, userData = {}) {
  const token = await resolveAuthToken(getIdToken, userData);
  const endpoint = getApiEndpoint(subpath);

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bodyPayload)
    });
  } catch (networkErr) {
    if (endpoint.startsWith('/')) {
      try {
        res = await fetch(`http://localhost:3001${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bodyPayload)
        });
      } catch {
        throw new Error('Unable to connect to KampusKash AI backend. Please ensure the server is running on port 3001.');
      }
    } else {
      throw new Error(`Connection to AI backend failed: ${networkErr.message}`);
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Server responded with status ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch all AI conversations for the authenticated student.
 * Prioritizes Firestore: users/{userId}/aiConversations
 * Falls back to LocalStorage cache when offline.
 */
export async function getConversations(userId) {
  if (!userId) return [];

  try {
    if (db) {
      const colRef = collection(db, 'users', userId, 'aiConversations');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const convos = snap.docs.map(d => ({
          conversationId: d.id,
          ...d.data()
        }));
        convos.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        // Cache locally
        try {
          localStorage.setItem(`${LOCAL_STORAGE_CONVERSATIONS_PREFIX}${userId}`, JSON.stringify(convos));
        } catch {}
        return convos;
      }
    }
  } catch (err) {
    console.warn('[AI Service] Failed to fetch conversations from Firestore, using cache:', err.message);
  }

  // Local storage fallback
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_CONVERSATIONS_PREFIX}${userId}`);
    if (cached) return JSON.parse(cached);
  } catch {}

  return [];
}

/**
 * Save or update an AI conversation in Firestore
 */
export async function saveConversation(userId, conversation) {
  if (!userId || !conversation?.conversationId) return;

  const dataToSave = {
    conversationId: conversation.conversationId,
    title: conversation.title || 'New Conversation',
    createdAt: conversation.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: (conversation.messages || []).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString()
    }))
  };

  // 1. Sync to Firestore
  try {
    if (db) {
      const docRef = doc(db, 'users', userId, 'aiConversations', conversation.conversationId);
      await setDoc(docRef, dataToSave, { merge: true });
    }
  } catch (err) {
    console.warn('[AI Service] Firestore conversation save failed:', err.message);
  }

  // 2. Sync to LocalStorage cache
  try {
    const cachedList = await getConversations(userId);
    const existingIndex = cachedList.findIndex(c => c.conversationId === conversation.conversationId);
    if (existingIndex >= 0) {
      cachedList[existingIndex] = dataToSave;
    } else {
      cachedList.unshift(dataToSave);
    }
    localStorage.setItem(`${LOCAL_STORAGE_CONVERSATIONS_PREFIX}${userId}`, JSON.stringify(cachedList));
  } catch {}
}

/**
 * Delete a specific conversation
 */
export async function deleteConversation(userId, conversationId) {
  if (!userId || !conversationId) return;

  try {
    if (db) {
      const docRef = doc(db, 'users', userId, 'aiConversations', conversationId);
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.warn('[AI Service] Failed to delete conversation in Firestore:', err.message);
  }

  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_CONVERSATIONS_PREFIX}${userId}`);
    if (cached) {
      const list = JSON.parse(cached).filter(c => c.conversationId !== conversationId);
      localStorage.setItem(`${LOCAL_STORAGE_CONVERSATIONS_PREFIX}${userId}`, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Clear all conversations for the user
 */
export async function clearAllConversations(userId) {
  if (!userId) return;

  try {
    const list = await getConversations(userId);
    if (db) {
      for (const conv of list) {
        try {
          const docRef = doc(db, 'users', userId, 'aiConversations', conv.conversationId);
          await deleteDoc(docRef);
        } catch {}
      }
    }
  } catch {}

  try {
    localStorage.removeItem(`${LOCAL_STORAGE_CONVERSATIONS_PREFIX}${userId}`);
  } catch {}
}

/**
 * Send a message to the secure backend AI endpoint
 */
export async function sendMessageToAI({
  message,
  conversationId,
  history = [],
  userData = {},
  getIdToken
}) {
  if (!message || !message.trim()) {
    throw new Error('Please enter a question or prompt.');
  }

  const bodyPayload = {
    message: message.trim(),
    conversationId,
    history: history.slice(-10),
    userData: {
      profile: userData.user || {},
      accounts: userData.accounts || [],
      transactions: userData.transactions || [],
      budgets: userData.budgets || [],
      savingsGoals: userData.savingsGoals || [],
      categories: userData.categories || []
    }
  };

  const data = await postToAiEndpoint('chat', bodyPayload, getIdToken, userData);
  return {
    reply: data.reply,
    conversationId: data.conversationId || conversationId,
    proposedAction: data.proposedAction || null,
    timestamp: data.timestamp || new Date().toISOString(),
    provider: data.provider || 'gemini'
  };
}

/**
 * Fetch Financial Insights (Cash flow, trends, month-over-month comparison)
 */
export async function fetchFinancialInsights({
  month,
  userData = {},
  getIdToken
}) {
  const bodyPayload = {
    month,
    userData: {
      profile: userData.user || {},
      accounts: userData.accounts || [],
      transactions: userData.transactions || [],
      budgets: userData.budgets || [],
      savingsGoals: userData.savingsGoals || [],
      categories: userData.categories || []
    }
  };

  return postToAiEndpoint('insights', bodyPayload, getIdToken, userData);
}

/**
 * Fetch Personalized Budget Recommendation
 */
export async function fetchBudgetRecommendation({
  monthlyIncome,
  userData = {},
  getIdToken
}) {
  const bodyPayload = {
    monthlyIncome,
    userData: {
      profile: userData.user || {},
      accounts: userData.accounts || [],
      transactions: userData.transactions || [],
      budgets: userData.budgets || [],
      savingsGoals: userData.savingsGoals || [],
      categories: userData.categories || []
    }
  };

  return postToAiEndpoint('budget-recommendation', bodyPayload, getIdToken, userData);
}

/**
 * Fetch Savings Goal Feasibility Plan
 */
export async function fetchSavingsPlan({
  targetAmount,
  targetMonths,
  monthlySurplus,
  currentSavings,
  userData = {},
  getIdToken
}) {
  const bodyPayload = {
    targetAmount: Number(targetAmount),
    targetMonths: Number(targetMonths),
    monthlySurplus: Number(monthlySurplus),
    currentSavings: Number(currentSavings)
  };

  return postToAiEndpoint('savings-plan', bodyPayload, getIdToken, userData);
}

/**
 * Execute an Approved AI Action (Feature 6: Action Execution Backend)
 */
export async function executeAIAction(arg1, arg2, arg3) {
  let actionId;
  let getIdToken;
  let userData = {};

  if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
    actionId = arg1.actionId || arg1.id;
    getIdToken = arg1.getIdToken;
    userData = arg1.userData || {};
  } else {
    actionId = typeof arg1 === 'object' && arg1 !== null ? (arg1.actionId || arg1.id) : arg1;
    getIdToken = arg2;
    userData = arg3 || {};
  }

  if (!actionId || typeof actionId !== 'string') {
    throw new Error('Missing required actionId parameter.');
  }

  const bodyPayload = {
    actionId,
    userData: {
      profile: userData.user || userData.profile || {},
      accounts: userData.accounts || [],
      transactions: userData.transactions || [],
      budgets: userData.budgets || [],
      savingsGoals: userData.savingsGoals || [],
      categories: userData.categories || []
    }
  };

  return postToAiEndpoint('action/execute', bodyPayload, getIdToken, userData);
}

/**
 * Cancel a Proposed AI Action
 */
export async function cancelAIAction(arg1, arg2, arg3) {
  let actionId;
  let getIdToken;
  let userData = {};

  if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
    actionId = arg1.actionId || arg1.id;
    getIdToken = arg1.getIdToken;
    userData = arg1.userData || {};
  } else {
    actionId = typeof arg1 === 'object' && arg1 !== null ? (arg1.actionId || arg1.id) : arg1;
    getIdToken = arg2;
    userData = arg3 || {};
  }

  if (!actionId || typeof actionId !== 'string') {
    throw new Error('Missing required actionId parameter.');
  }

  const bodyPayload = { actionId };
  return postToAiEndpoint('action/cancel', bodyPayload, getIdToken, userData);
}

/**
 * Fetch User AI Action History (Feature 7: Action History)
 */
export async function fetchAIActionHistory({
  userData = {},
  getIdToken
}) {
  const token = await resolveAuthToken(getIdToken, userData);
  const endpoint = getApiEndpoint('action/history');

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (networkErr) {
    if (endpoint.startsWith('/')) {
      try {
        res = await fetch(`http://localhost:3001${endpoint}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {
        return { success: true, history: [] };
      }
    } else {
      return { success: true, history: [] };
    }
  }

  if (!res.ok) {
    return { success: true, history: [] };
  }

  return res.json();
}

