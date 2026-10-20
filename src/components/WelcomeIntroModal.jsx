import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Target,
  PiggyBank,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';
import logoImg from '../assets/kiro-logo.png';

/**
 * KampusKash 3-Screen Welcome Introduction
 * For first-time students or tutorial replay:
 * 1. Welcome to KampusKash — Manage your student finances
 * 2. Track income, expenses and budgets
 * 3. Set savings goals and use the AI Assistant
 * Includes Skip, Next, Back, and Get Started controls.
 */
export default function WelcomeIntroModal({ isOpen, onComplete, onSkip }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const publicLogo = `${import.meta.env.BASE_URL || '/'}kiro-logo.png`.replace(/\/{2,}/g, '/');

  const slides = [
    {
      step: 1,
      title: 'Welcome to KampusKash',
      subtitle: 'Your modern student financial companion',
      description:
        'Manage your everyday campus spending, allowances, part-time wages, and student accounts in one sleek, secure workspace designed just for university life.',
      icon: Wallet,
      badge: 'Step 1 of 3',
      highlights: [
        'Live balance across bank accounts, MAE, and e-wallets',
        'Built with dark purple gemstone aesthetic',
        'Private and offline-ready on any mobile device'
      ]
    },
    {
      step: 2,
      title: 'Track Income, Expenses & Budgets',
      subtitle: 'Know where every ringgit goes',
      description:
        'Easily record food, campus transport, tuition, hostel rent, and study materials. Set monthly spending caps per category to stay comfortably within your semester allowance.',
      icon: TrendingUp,
      badge: 'Step 2 of 3',
      highlights: [
        'One-tap transaction logging with smart student categories',
        'Real-time spending breakdowns and warning alerts at 80%+',
        'Instant printable PDF statements for parents or scholarships'
      ]
    },
    {
      step: 3,
      title: 'Savings Goals & AI Assistant',
      subtitle: 'Plan ahead and get intelligent advice',
      description:
        'Save towards your dream laptop, emergency fund, or graduation trip. Chat with KampusKash AI anytime for instant spending analysis, budget checks, and student saving tips.',
      icon: Sparkles,
      badge: 'Step 3 of 3',
      highlights: [
        'Interactive progress tracking for all your semester goals',
        'AI Assistant that understands your real transactions',
        'Customizable student personas, avatars, and dark themes'
      ]
    }
  ];

  const current = slides[currentSlide];
  const Icon = current.icon;
  const isLast = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (onComplete) onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Introduction"
      style={{
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        background: 'rgba(10, 8, 20, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-card, #2A1F35)',
          border: '1px solid var(--border-light, rgba(168, 85, 247, 0.3))',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(121, 40, 202, 0.25)',
          padding: '2rem',
          color: 'var(--text-main, #FFFFFF)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Header: Logo + Skip Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <img
            src={logoImg || publicLogo}
            alt="KampusKash"
            onError={(e) => {
              if (e.target.src !== publicLogo) e.target.src = publicLogo;
            }}
            style={{ width: '130px', height: 'auto', maxHeight: '42px', objectFit: 'contain' }}
          />

          <button
            onClick={onSkip}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
            aria-label="Skip introduction"
          >
            Skip Intro
          </button>
        </div>

        {/* Step Progress Dots */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
          {slides.map((s, idx) => (
            <div
              key={s.step}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: idx <= currentSlide ? 'var(--primary, #8B5CF6)' : 'rgba(255, 255, 255, 0.12)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div style={{ animation: 'slideFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          {/* Icon Badge */}
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 30%, transparent) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-light, #E8DEF5)',
              marginBottom: '1rem',
              boxShadow: '0 4px 18px color-mix(in srgb, var(--primary) 20%, transparent)'
            }}
          >
            <Icon size={26} />
          </div>

          <div
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--primary-light, #E8DEF5)',
              background: 'color-mix(in srgb, var(--primary) 22%, transparent)',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              marginBottom: '0.65rem'
            }}
          >
            {current.badge}
          </div>

          <h3
            style={{
              fontFamily: "'Plus Jakarta Sans', var(--font-sans)",
              fontSize: '1.45rem',
              fontWeight: 800,
              margin: '0 0 0.35rem',
              color: 'var(--text-main, #FFFFFF)'
            }}
          >
            {current.title}
          </h3>

          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--primary-light, #DDD6FE)',
              marginBottom: '0.75rem'
            }}
          >
            {current.subtitle}
          </div>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted, #C4B5D4)',
              lineHeight: 1.6,
              marginBottom: '1.25rem'
            }}
          >
            {current.description}
          </p>

          {/* Highlights List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.75rem'
            }}
          >
            {current.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.83rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={15} color="var(--primary-light, #E8DEF5)" style={{ flexShrink: 0 }} />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls: Back, Next, Get Started */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
          {currentSlide > 0 ? (
            <button
              onClick={handleBack}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.55rem 1rem',
                fontSize: '0.86rem'
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isLast ? '0.65rem 1.4rem' : '0.6rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '10px'
            }}
          >
            {isLast ? (
              <>
                Get Started <Sparkles size={16} />
              </>
            ) : (
              <>
                Next <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideFadeIn {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
