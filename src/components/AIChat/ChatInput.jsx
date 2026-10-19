import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

const MAX_CHARS = 1000;

export default function ChatInput({ onSendMessage, isLoading = false }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;

    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    const isTouch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );

    if (e.key === 'Enter' && !e.shiftKey) {
      if (!isTouch) {
        e.preventDefault();
        handleSubmit(e);
      }
      // On mobile touch devices, let Enter insert a newline naturally
    }
  };

  const isOverLimit = text.length > MAX_CHARS;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: 'relative',
        background: 'var(--bg-card-subtle)',
        border: '1px solid var(--border-light)',
        borderRadius: '16px',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
      }}
      onFocusCapture={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-light)';
      }}
      onBlurCapture={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-light)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.65rem' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 50))}
          onKeyDown={handleKeyDown}
          placeholder="Ask KampusKash AI about spending, budgets, or savings..."
          aria-label="Ask KampusKash AI"
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--text-main)',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            maxHeight: '120px',
            padding: '0.35rem 0'
          }}
        />

        <button
          type="submit"
          disabled={!text.trim() || isLoading || isOverLimit}
          className="btn btn-primary chat-send-btn"
          style={{
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            padding: 0,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: (!text.trim() || isLoading || isOverLimit) ? 'not-allowed' : 'pointer',
            opacity: (!text.trim() || isLoading || isOverLimit) ? 0.5 : 1,
            transition: 'all 0.15s ease'
          }}
          title="Send message"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Footer info: Character counter & shortcut hints */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.4rem',
          paddingTop: '0.35rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)'
        }}
      >
        <span className="chat-shortcut-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <CornerDownLeft size={11} /> Press <strong style={{ color: 'var(--text-main)' }}>Enter</strong> to send, <strong style={{ color: 'var(--text-main)' }}>Shift+Enter</strong> for newline
        </span>

        <span style={{ color: isOverLimit ? 'var(--expense)' : 'var(--text-muted)', marginLeft: 'auto' }}>
          {text.length}/{MAX_CHARS}
        </span>
      </div>
    </form>
  );
}
