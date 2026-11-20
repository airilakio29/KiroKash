import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

const MAX_CHARS = 1000;

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  onInputFocus,
  onInputBlur
}) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize single-line textarea smoothly up to 110px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 110)}px`;
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
  const showCharCounter = text.length > 800;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        width: '100%'
      }}
    >
      {/* Compact WhatsApp-style Input Pill + Inline Send Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.5rem',
          width: '100%'
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-card-subtle)',
            border: isFocused ? '1px solid var(--primary)' : '1px solid var(--border-light)',
            borderRadius: '22px',
            padding: '0.2rem 0.9rem',
            minHeight: '44px',
            boxShadow: isFocused ? '0 0 0 2px var(--border-light)' : 'none',
            transition: 'border-color 0.15s ease'
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 50))}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (typeof onInputFocus === 'function') onInputFocus();
            }}
            onBlur={() => {
              setIsFocused(false);
              if (typeof onInputBlur === 'function') onInputBlur();
            }}
            placeholder="Ask KampusKash AI..."
            aria-label="Ask KampusKash AI"
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              width: '100%',
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              lineHeight: 1.4,
              fontFamily: 'inherit',
              maxHeight: '110px',
              padding: '0.45rem 0',
              margin: 0
            }}
          />
        </div>

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
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: (!text.trim() || isLoading || isOverLimit) ? 'not-allowed' : 'pointer',
            opacity: (!text.trim() || isLoading || isOverLimit) ? 0.5 : 1,
            transition: 'opacity 0.15s ease, transform 0.15s ease'
          }}
          title="Send message"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Subtle footer: desktop shortcut hint (hidden on mobile/touch) & counter only above 800 chars */}
      <div
        className={showCharCounter ? '' : 'chat-shortcut-hint'}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 0.35rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}
      >
        <span className="chat-shortcut-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <CornerDownLeft size={10} /> Press <strong style={{ color: 'var(--text-main)' }}>Enter</strong> to send, <strong style={{ color: 'var(--text-main)' }}>Shift+Enter</strong> for newline
        </span>

        {showCharCounter && (
          <span style={{ color: isOverLimit ? 'var(--expense)' : 'var(--text-muted)', marginLeft: 'auto', fontWeight: 600 }}>
            {text.length}/{MAX_CHARS}
          </span>
        )}
      </div>
    </form>
  );
}
