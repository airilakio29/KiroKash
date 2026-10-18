import React from 'react';
import { Plus, MessageSquare, Trash2, X, AlertCircle } from 'lucide-react';

export default function ConversationDrawer({
  isOpen,
  onClose,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClearAllConversations
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        maxWidth: '85%',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-light)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)',
        animation: 'slideInLeft 0.2s ease-out'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.15rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
          Chat History
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex'
          }}
          title="Close history"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div style={{ padding: '0.85rem' }}>
        <button
          onClick={() => {
            onNewConversation();
            onClose();
          }}
          className="btn btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.65rem',
            fontSize: '0.85rem'
          }}
        >
          <Plus size={16} /> + New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 0.85rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}
      >
        {conversations.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.82rem'
            }}
          >
            <MessageSquare size={28} style={{ opacity: 0.35, margin: '0 auto 0.5rem' }} />
            <p>No past conversations yet.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.conversationId === activeConversationId;
            const title = conv.title || 'Conversation';
            const dateStr = conv.updatedAt
              ? new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : '';

            return (
              <div
                key={conv.conversationId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  background: isActive ? 'var(--bg-card-subtle)' : 'transparent',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onClick={() => {
                  onSelectConversation(conv);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <MessageSquare size={14} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {title}
                    </div>
                    {dateStr && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                        {dateStr}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this conversation?')) {
                      onDeleteConversation(conv.conversationId);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    opacity: 0.6,
                    transition: 'opacity 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--expense)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  title="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Clear All */}
      {conversations.length > 0 && (
        <div
          style={{
            padding: '0.75rem 0.85rem',
            borderTop: '1px solid var(--border-light)'
          }}
        >
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all conversation history?')) {
                onClearAllConversations();
              }
            }}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '0.45rem',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--expense)'; e.currentTarget.style.color = 'var(--expense)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Trash2 size={12} /> Clear All Chats
          </button>
        </div>
      )}
    </div>
  );
}
