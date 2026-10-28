import React, { useState } from 'react';
import { Sparkles, User, Copy, Check } from 'lucide-react';
import ActionConfirmationCard from './ActionConfirmationCard';
import UserAvatar from '../UserAvatar';

function formatTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Sanitize sensitive tokens, JWTs, Groq/Gemini API keys, reasoning tags, and base64 strings from display
 */
function sanitizeChatText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<function[\s\S]*?<\/function>/gi, '')
    .replace(/```action[\s\S]*?```/gi, '')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/gsk_[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[0-9A-Za-z-_]{20,50}/g, '[REDACTED_API_KEY]')
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]{40,}/gi, '[IMAGE]')
    .replace(/[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[REDACTED_TOKEN]')
    .trim();
}

/**
 * Lightweight safe markdown renderer for chat bubbles
 * Formats: headers (###), bold (**), bullet points (- / *), code blocks, and paragraph spacing.
 * Ensures long unbroken strings wrap safely and code blocks scroll horizontally without breaking bubble layout.
 */
function renderMarkdownContent(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null;
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  const flushList = (key) => {
    if (currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol
            key={`ol-${key}`}
            style={{
              paddingLeft: '1.25rem',
              margin: '0.4rem 0',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word'
            }}
          >
            {currentList.map((item, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: '0.25rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  maxWidth: '100%',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word'
                }}
              >
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul
            key={`ul-${key}`}
            style={{
              paddingLeft: '1.25rem',
              margin: '0.4rem 0',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word'
            }}
          >
            {currentList.map((item, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: '0.25rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  maxWidth: '100%',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word'
                }}
              >
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const flushCodeBlock = (key) => {
    if (codeLines.length > 0 || inCodeBlock) {
      elements.push(
        <div
          key={`codeblock-wrap-${key}`}
          style={{
            margin: '0.65rem 0',
            borderRadius: '8px',
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid var(--border-light)',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          {codeLang && (
            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                padding: '0.25rem 0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
                fontFamily: 'monospace'
              }}
            >
              {codeLang}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: '0.75rem 1rem',
              overflowX: 'auto',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              fontSize: '0.82rem',
              lineHeight: 1.5,
              color: 'var(--text-main)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              whiteSpace: 'pre'
            }}
          >
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      codeLines = [];
      codeLang = '';
      inCodeBlock = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Code block toggle (```)
    if (trimmed.startsWith('```')) {
      flushList(idx);
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
        codeLang = trimmed.slice(3).trim();
      } else {
        flushCodeBlock(idx);
      }
      return;
    }

    // Inside code block: preserve exact code line
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushList(idx);
      elements.push(
        <div
          key={`quote-${idx}`}
          style={{
            borderLeft: '3px solid var(--primary)',
            paddingLeft: '0.75rem',
            margin: '0.5rem 0',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            fontSize: '0.88rem',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          {renderInlineFormatting(trimmed.replace(/^>\s*/, ''))}
        </div>
      );
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h4
          key={`h4-${idx}`}
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            margin: '0.75rem 0 0.35rem',
            color: 'var(--text-main)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          {renderInlineFormatting(trimmed.replace('### ', ''))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h3
          key={`h3-${idx}`}
          style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            margin: '0.85rem 0 0.4rem',
            color: 'var(--text-main)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          {renderInlineFormatting(trimmed.replace('## ', ''))}
        </h3>
      );
      return;
    }

    // Unordered List
    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== 'ul') flushList(idx);
      listType = 'ul';
      currentList.push(trimmed.replace(/^[-*]\s+/, ''));
      return;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') flushList(idx);
      listType = 'ol';
      currentList.push(trimmed.replace(/^\d+\.\s+/, ''));
      return;
    }

    // Normal paragraph
    flushList(idx);
    elements.push(
      <p
        key={`p-${idx}`}
        style={{
          margin: '0.35rem 0',
          fontSize: '0.92rem',
          lineHeight: 1.6,
          color: 'inherit',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word'
        }}
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList('end');
  flushCodeBlock('end');
  return elements;
}

/**
 * Handle inline markdown: bold (**), italics (*), code (`), and currency tags
 */
function renderInlineFormatting(text) {
  if (!text) return '';

  // Process bold: **text**
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      const isRM = boldText.includes('RM');
      return (
        <strong
          key={index}
          style={{
            fontWeight: 700,
            color: isRM ? 'var(--income, #10B981)' : 'var(--text-main)',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          {boldText}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em
          key={index}
          style={{
            fontStyle: 'italic',
            color: 'var(--text-muted)',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            fontSize: '0.85em',
            color: 'var(--primary-light)',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            maxWidth: '100%',
            display: 'inline-block',
            boxSizing: 'border-box'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return (
      <span key={index} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {part}
      </span>
    );
  });
}

export default function ChatMessage({
  message,
  userAvatar,
  onConfirmAction,
  onCancelAction
}) {
  const isAI = message.role === 'assistant' || message.role === 'model';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isAI ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: '0.65rem',
        marginBottom: '1.25rem',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Avatar Icon */}
      {isAI ? (
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '0.9rem',
            flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          <Sparkles size={17} />
        </div>
      ) : (
        <UserAvatar
          avatar={userAvatar}
          size={34}
          name="You"
          showBorder={true}
        />
      )}

      {/* Message Bubble Container */}
      <div
        style={{
          maxWidth: isAI && message.proposedAction ? '100%' : '84%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAI ? 'flex-start' : 'flex-end',
          width: isAI && message.proposedAction ? '100%' : 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Name / Role Label */}
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0 0.25rem',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontWeight: 600 }}>{isAI ? 'KampusKash AI' : 'You'}</span>
          <span>•</span>
          <span>{formatTimestamp(message.timestamp)}</span>
        </div>

        {/* Bubble */}
        <div
          className="kampuskash-chat-message-bubble"
          style={{
            position: 'relative',
            padding: '0.85rem 1.15rem',
            borderRadius: '16px',
            borderTopLeftRadius: isAI ? '4px' : '16px',
            borderTopRightRadius: isAI ? '16px' : '4px',
            background: isAI
              ? 'var(--bg-card-subtle)'
              : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            color: isAI ? 'var(--text-main)' : '#FFFFFF',
            border: isAI ? '1px solid var(--border-light)' : 'none',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            width: isAI && message.proposedAction ? '100%' : 'auto'
          }}
        >
          {isAI ? (
            <div style={{ maxWidth: '100%', minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word', boxSizing: 'border-box' }}>
              {renderMarkdownContent(sanitizeChatText(message.content))}
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.92rem',
                lineHeight: 1.55,
                maxWidth: '100%',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                boxSizing: 'border-box',
                whiteSpace: 'pre-wrap'
              }}
            >
              {sanitizeChatText(message.content)}
            </div>
          )}

          {/* Copy Button for AI replies */}
          {isAI && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '0.35rem'
              }}
            >
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease'
                }}
                title="Copy response"
              >
                {copied ? <Check size={12} color="var(--income)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Confirmation Card (Feature 2) */}
        {isAI && message.proposedAction && (
          <div style={{ width: '100%' }}>
            <ActionConfirmationCard
              action={message.proposedAction}
              onConfirm={onConfirmAction}
              onCancel={onCancelAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}

