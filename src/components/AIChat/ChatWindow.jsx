import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  History,
  RotateCcw,
  X,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { auth } from '../../firebase';
import {
  AI_WELCOME_MESSAGE,
  getConversations,
  saveConversation,
  deleteConversation,
  clearAllConversations,
  sendMessageToAI,
  executeAIAction,
  cancelAIAction
} from '../../services/aiService';

import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';
import TypingIndicator from './TypingIndicator';
import ConversationDrawer from './ConversationDrawer';
import ActionHistoryDrawer from './ActionHistoryDrawer';

export default function ChatWindow({
  onClose,
  isModal = false
}) {
  const { user } = useAuth();
  const financeData = useFinance();
  const userId = user?.id;

  const [conversationId, setConversationId] = useState(() => `conv-${Date.now()}`);
  const [messages, setMessages] = useState([AI_WELCOME_MESSAGE]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isLoading]);

  // Load chat history from Firestore
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    getConversations(userId).then((list) => {
      if (isMounted) {
        setConversations(list);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [userId]);

  // Start a new conversation
  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    setConversationId(newId);
    setMessages([AI_WELCOME_MESSAGE]);
    setError(null);
  };

  // Select a past conversation
  const handleSelectConversation = (conv) => {
    if (!conv) return;
    setConversationId(conv.conversationId);
    setMessages(conv.messages && conv.messages.length > 0 ? conv.messages : [AI_WELCOME_MESSAGE]);
    setError(null);
  };

  // Delete single conversation
  const handleDeleteConversation = async (delId) => {
    await deleteConversation(userId, delId);
    setConversations(prev => prev.filter(c => c.conversationId !== delId));
    if (delId === conversationId) {
      handleNewConversation();
    }
  };

  // Clear all conversations
  const handleClearAll = async () => {
    await clearAllConversations(userId);
    setConversations([]);
    handleNewConversation();
  };

  // Send a user message
  const handleSendMessage = async (userText) => {
    if (!userText || !userText.trim() || isLoading) return;

    setError(null);
    const userMessageObj = {
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessageObj];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const getIdTokenFn = auth?.currentUser
        ? () => auth.currentUser.getIdToken(false)
        : null;

      const response = await sendMessageToAI({
        message: userText.trim(),
        conversationId,
        history: newMessages,
        userData: {
          user,
          accounts: financeData?.accounts || [],
          transactions: financeData?.transactions || [],
          budgets: financeData?.budgets || [],
          savingsGoals: financeData?.savingsGoals || [],
          categories: financeData?.categories || []
        },
        getIdToken: getIdTokenFn
      });

      const aiMessageObj = {
        role: 'assistant',
        content: response.reply,
        proposedAction: response.proposedAction || null,
        timestamp: response.timestamp || new Date().toISOString()
      };

      const finalMessages = [...newMessages, aiMessageObj];
      setMessages(finalMessages);

      // Derive title for new conversation
      const convTitle = messages.length <= 1
        ? (userText.length > 32 ? `${userText.slice(0, 32)}...` : userText)
        : (conversations.find(c => c.conversationId === conversationId)?.title || userText.slice(0, 32));

      // Save conversation to Firestore
      if (userId) {
        const updatedConv = {
          conversationId,
          title: convTitle,
          createdAt: messages[0]?.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: finalMessages
        };
        await saveConversation(userId, updatedConv);
        // Refresh local list
        setConversations(prev => {
          const idx = prev.findIndex(c => c.conversationId === conversationId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedConv;
            return next;
          }
          return [updatedConv, ...prev];
        });
      }

    } catch (err) {
      console.error('[AI Chat Error]', err);
      setError(err.message || 'Failed to reach AI assistant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and Execute an AI Action Proposal (Feature 2 & 6)
  const handleConfirmAction = async (action) => {
    if (!action || !action.actionId) return;
    const getIdTokenFn = auth?.currentUser
      ? () => auth.currentUser.getIdToken(false)
      : null;

    // 1. Call execution backend with token
    const res = await executeAIAction(action.actionId, getIdTokenFn);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Execution failed on server.');
    }

    // 2. Mark action as approved in message list
    setMessages(prev => prev.map(msg => {
      if (msg.proposedAction && msg.proposedAction.actionId === action.actionId) {
        return {
          ...msg,
          proposedAction: { ...msg.proposedAction, status: 'approved' }
        };
      }
      return msg;
    }));

    // 3. Immediately synchronize local FinanceContext state so the dashboard updates
    const details = action.details || {};
    try {
      switch (action.actionType) {
        case 'CREATE_BUDGET':
        case 'UPDATE_BUDGET':
          if (details.categoryId && details.monthlyLimit !== undefined && financeData?.upsertBudget) {
            financeData.upsertBudget(details.categoryId, details.monthlyLimit);
          }
          break;
        case 'CREATE_SAVINGS_GOAL':
          if (financeData?.addSavingsGoal) {
            financeData.addSavingsGoal({
              title: details.title,
              targetAmount: details.targetAmount,
              targetDate: details.targetDate,
              currentAmount: details.currentAmount || 0
            });
          }
          break;
        case 'UPDATE_SAVINGS_GOAL':
          if (details.goalId && financeData?.updateSavingsGoal) {
            financeData.updateSavingsGoal(details.goalId, details);
          }
          break;
        case 'CREATE_TRANSACTION':
          if (financeData?.addTransaction) {
            financeData.addTransaction({
              title: details.title,
              amount: details.amount,
              type: details.type || 'expense',
              categoryId: details.categoryId,
              accountId: details.accountId || null,
              date: details.date,
              note: details.note || 'Created via KampusKash AI'
            });
          }
          break;
        case 'GENERATE_FINANCIAL_REPORT':
          if (financeData?.exportToPDF) {
            financeData.exportToPDF();
          }
          break;
        default:
          break;
      }
    } catch (syncErr) {
      console.warn('[FinanceContext Sync Warning]', syncErr);
    }

    // 4. Formulate verified natural language confirmation message per Feature 8
    let confirmText = 'Action executed and saved successfully.';
    if (action.actionType === 'CREATE_BUDGET') {
      confirmText = `Your monthly ${action.category || 'selected'} budget has been created successfully.`;
    } else if (action.actionType === 'UPDATE_BUDGET') {
      confirmText = `Your budget for ${action.category || 'selected category'} has been updated successfully to RM${Number(action.amount || details.monthlyLimit || 0).toFixed(2)}.`;
    } else if (action.actionType === 'CREATE_SAVINGS_GOAL') {
      confirmText = `Your savings goal "${details.title || 'Savings Goal'}" has been created successfully.`;
    } else if (action.actionType === 'UPDATE_SAVINGS_GOAL') {
      confirmText = `Your savings goal "${details.title || 'Savings Goal'}" has been updated successfully.`;
    } else if (action.actionType === 'CREATE_TRANSACTION') {
      confirmText = `${details.type === 'income' ? 'Income' : 'Expense'} transaction of RM${Number(action.amount || 0).toFixed(2)} for "${details.title || 'Transaction'}" has been recorded successfully.`;
    } else if (action.actionType === 'GENERATE_FINANCIAL_REPORT') {
      confirmText = 'Your financial summary report has been generated successfully and exported.';
    }

    const followUpMsg = {
      role: 'assistant',
      content: confirmText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => {
      const updated = [...prev, followUpMsg];
      if (userId) {
        saveConversation(userId, {
          conversationId,
          title: conversations.find(c => c.conversationId === conversationId)?.title || 'Conversation',
          createdAt: messages[0]?.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: updated
        }).catch(() => {});
      }
      return updated;
    });
  };

  // Cancel an AI Action Proposal (Feature 2 & 9)
  const handleCancelAction = async (action) => {
    if (!action || !action.actionId) return;
    const getIdTokenFn = auth?.currentUser
      ? () => auth.currentUser.getIdToken(false)
      : null;

    try {
      await cancelAIAction(action.actionId, getIdTokenFn);
    } catch (e) {
      console.warn('Failed to register cancellation on backend:', e);
    }

    setMessages(prev => prev.map(msg => {
      if (msg.proposedAction && msg.proposedAction.actionId === action.actionId) {
        return {
          ...msg,
          proposedAction: { ...msg.proposedAction, status: 'cancelled' }
        };
      }
      return msg;
    }));

    const followUpMsg = {
      role: 'assistant',
      content: 'The proposed action has been cancelled.',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => {
      const updated = [...prev, followUpMsg];
      if (userId) {
        saveConversation(userId, {
          conversationId,
          title: conversations.find(c => c.conversationId === conversationId)?.title || 'Conversation',
          createdAt: messages[0]?.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: updated
        }).catch(() => {});
      }
      return updated;
    });
  };


  const showSuggestedQuestions = messages.length <= 1;

  return (
    <div
      className={`kampuskash-ai-window ${isExpanded ? 'ai-window-expanded' : ''}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: isModal ? (isExpanded ? '88vh' : '640px') : '100%',
        maxHeight: isModal ? '90vh' : '100%',
        width: '100%',
        background: 'var(--bg-card)',
        borderRadius: isModal ? '20px' : '0',
        border: isModal ? '1px solid var(--border-light)' : 'none',
        boxShadow: isModal ? '0 24px 64px rgba(0, 0, 0, 0.5)' : 'none',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Slide-over Conversation Drawer */}
      <ConversationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearAllConversations={handleClearAll}
      />

      {/* Slide-over Action History Drawer (Feature 7) */}
      <ActionHistoryDrawer
        isOpen={isActionDrawerOpen}
        onClose={() => setIsActionDrawerOpen(false)}
        userId={userId}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'var(--bg-card-subtle)',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0
        }}
      >
        {/* Brand & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Sparkles size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                KampusKash AI
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--income, #10B981)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--income, #10B981)' }} />
                Online
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Personal Student Financial Assistant • Gemini AI
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => setIsActionDrawerOpen(prev => !prev)}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: '8px'
            }}
            title="AI Action History"
          >
            <Activity size={14} />
            <span className="hidden-on-mobile">Actions</span>
          </button>

          <button
            onClick={() => setIsDrawerOpen(prev => !prev)}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: '8px'
            }}
            title="Chat History"
          >
            <History size={14} />
            <span className="hidden-on-mobile">History</span>
          </button>

          <button
            onClick={handleNewConversation}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: '8px'
            }}
            title="Start New Chat"
          >
            <RotateCcw size={14} />
            <span className="hidden-on-mobile">New Chat</span>
          </button>

          {isModal && (
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex'
              }}
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex'
              }}
              title="Close Assistant"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Safety & Action Security Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 1.25rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid var(--border-light)',
          fontSize: '0.72rem',
          color: 'var(--text-light)',
          flexShrink: 0
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ShieldCheck size={13} color="var(--income)" />
          Grounded in your actual records • Actions require explicit confirmation
        </span>
        <span style={{ opacity: 0.8 }} className="hidden-on-mobile">
          Protected Actions
        </span>
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            message={msg}
            userAvatar={user?.avatar}
            onConfirmAction={handleConfirmAction}
            onCancelAction={handleCancelAction}
          />
        ))}


        {isLoading && <TypingIndicator />}

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--expense, #EF4444)',
              fontSize: '0.84rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage(messages[messages.length - 1]?.content)}
              style={{
                background: 'none',
                border: 'underline',
                color: 'inherit',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {showSuggestedQuestions && (
          <SuggestedQuestions
            onSelectQuestion={handleSendMessage}
            disabled={isLoading}
          />
        )}

        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '0.85rem 1.25rem 1rem',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-light)',
          flexShrink: 0
        }}
      >
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
