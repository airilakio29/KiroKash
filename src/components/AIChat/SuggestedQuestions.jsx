import React from 'react';
import { Sparkles, TrendingUp, HelpCircle, PiggyBank, DollarSign, PieChart } from 'lucide-react';
import { SUGGESTED_QUESTIONS } from '../../services/aiService';

const QUESTION_ICONS = {
  'Analyse my spending.': PieChart,
  'Where does most of my money go?': TrendingUp,
  'Help me create a savings plan.': PiggyBank,
  'Can I afford something expensive?': DollarSign,
  'Give me a monthly financial summary.': HelpCircle
};

export default function SuggestedQuestions({ onSelectQuestion, disabled = false }) {
  return (
    <div style={{ margin: '1rem 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.65rem'
        }}
      >
        <Sparkles size={14} color="var(--primary)" />
        <span>Suggested Student Questions</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        {SUGGESTED_QUESTIONS.map((question, idx) => {
          const IconComp = QUESTION_ICONS[question] || Sparkles;
          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(question)}
              disabled={disabled}
              className="ai-suggestion-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '20px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease-in-out',
                opacity: disabled ? 0.6 : 1,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.background = 'var(--bg-card-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <IconComp size={14} color="var(--primary)" />
              <span>{question}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
