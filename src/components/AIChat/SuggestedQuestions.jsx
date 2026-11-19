import React from 'react';
import { PieChart, Wallet, PiggyBank, FileText } from 'lucide-react';

const COMPACT_PROMPTS = [
  {
    label: 'Analyse spending',
    prompt: 'Analyse my spending.',
    Icon: PieChart
  },
  {
    label: 'Budget RM900',
    prompt: 'Create a monthly budget of RM900.',
    Icon: Wallet
  },
  {
    label: 'Save RM1,000',
    prompt: 'Help me create a savings plan to save RM1,000.',
    Icon: PiggyBank
  },
  {
    label: 'Monthly summary',
    prompt: 'Give me a monthly financial summary.',
    Icon: FileText
  }
];

export default function SuggestedQuestions({ onSelectQuestion, disabled = false }) {
  return (
    <div
      className="ai-suggested-prompts-bar no-scrollbar"
      role="group"
      aria-label="Quick AI prompts"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: '0.45rem',
        overflowX: 'auto',
        padding: '0.5rem 0.9rem 0.45rem',
        borderTop: '1px solid var(--border-light)',
        background: 'var(--bg-card)',
        WebkitOverflowScrolling: 'touch',
        flexShrink: 0
      }}
    >
      {COMPACT_PROMPTS.map(({ label, prompt, Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelectQuestion(prompt)}
          disabled={disabled}
          className="ai-suggestion-chip"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.38rem 0.72rem',
            borderRadius: '999px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-main)',
            fontSize: '0.76rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.16s ease',
            opacity: disabled ? 0.6 : 1
          }}
        >
          <Icon size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
