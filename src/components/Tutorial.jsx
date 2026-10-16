import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  LayoutDashboard, 
  ReceiptText, 
  PlusCircle, 
  Target, 
  PiggyBank, 
  Palette, 
  Landmark, 
  BarChart3, 
  Sparkles, 
  User, 
  FileText, 
  BookOpen,
  PieChart as PieIcon
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { TOUR_STEPS } from '../services/tutorialService';

const ICON_MAP = {
  LayoutDashboard,
  ReceiptText,
  PlusCircle,
  Target,
  PiggyBank,
  Palette,
  Landmark,
  BarChart3,
  Sparkles,
  User,
  FileText,
  BookOpen,
  PieChart: PieIcon,
  Check
};

export default function Tutorial({
  onComplete,
  activeTab,
  setActiveTab,
  isTransactionModalOpen,
  onOpenAddTransaction,
  isProfileModalOpen,
  onOpenProfileModal,
  onCloseProfileModal
}) {
  const { completeTutorial } = useFinance();

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('kirokash_tutorial_current_step');
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < TOUR_STEPS.length) {
        return parsed;
      }
    } catch {}
    return 0;
  });
  const [targetRect, setTargetRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState({ top: 100, left: 100, placement: 'bottom' });
  const [isElementVisible, setIsElementVisible] = useState(false);

  const cardRef = useRef(null);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const Icon = ICON_MAP[step.iconName] || LayoutDashboard;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // On initial mount, sync activeTab if resumed at a non-dashboard step
  useEffect(() => {
    const initialStep = TOUR_STEPS[currentStepIndex];
    if (initialStep?.tab && setActiveTab && activeTab !== initialStep.tab) {
      setActiveTab(initialStep.tab);
    }
  }, []);

  // Complete tour handler
  const handleFinish = useCallback(() => {
    try {
      localStorage.removeItem('kirokash_tutorial_current_step');
    } catch {}
    if (completeTutorial) {
      completeTutorial();
    }
    if (onCloseProfileModal) {
      onCloseProfileModal();
    }
    if (onComplete) {
      onComplete();
    }
  }, [completeTutorial, onCloseProfileModal, onComplete]);

  // Navigate to step
  const goToStep = useCallback((index) => {
    if (index < 0 || index >= TOUR_STEPS.length) return;
    const nextStep = TOUR_STEPS[index];

    // Synchronize tab if needed
    if (nextStep.tab && setActiveTab && activeTab !== nextStep.tab) {
      setActiveTab(nextStep.tab);
    }

    // Auto-open transaction modal if step requires it and it's not open
    if (nextStep.requiresModal && !isTransactionModalOpen && onOpenAddTransaction) {
      onOpenAddTransaction();
    }

    // Auto-open profile modal if step requires it
    if (nextStep.requiresProfileModal && !isProfileModalOpen && onOpenProfileModal) {
      onOpenProfileModal();
    } else if (!nextStep.requiresProfileModal && isProfileModalOpen && onCloseProfileModal) {
      onCloseProfileModal();
    }

    try {
      localStorage.setItem('kirokash_tutorial_current_step', String(index));
    } catch {}
    setCurrentStepIndex(index);
  }, [
    activeTab, 
    setActiveTab, 
    isTransactionModalOpen, 
    onOpenAddTransaction, 
    isProfileModalOpen, 
    onOpenProfileModal, 
    onCloseProfileModal
  ]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleFinish();
    } else {
      goToStep(currentStepIndex + 1);
    }
  }, [isLastStep, currentStepIndex, goToStep, handleFinish]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStepIndex - 1);
    }
  }, [isFirstStep, currentStepIndex, goToStep]);

  // Find target element in DOM
  const findTargetElement = useCallback(() => {
    if (!step.targetSelector) return null;
    const selectors = step.targetSelector.split(',').map(s => s.trim());
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }, [step.targetSelector]);

  // Positioning calculation
  const updatePosition = useCallback(() => {
    const el = findTargetElement();

    if (!el) {
      setTargetRect(null);
      setIsElementVisible(true);
      // Fallback: center in viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardWidth = Math.min(340, vw - 32);
      const cardHeight = 220;
      setCardPlacement({
        top: Math.max(20, (vh - cardHeight) / 2),
        left: Math.max(16, (vw - cardWidth) / 2),
        placement: 'center'
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    setIsElementVisible(true);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardEl = cardRef.current;
    const cardWidth = cardEl ? cardEl.offsetWidth : Math.min(340, vw - 32);
    const cardHeight = cardEl ? cardEl.offsetHeight : 210;

    const margin = 12;
    const caretOffset = 10;
    const isMobile = vw < 768;

    const candidatePlacements = isMobile
      ? ['bottom', 'top', 'right', 'left']
      : [step.preferredPosition, 'bottom', 'right', 'top', 'left'];

    let chosenPlacement = 'bottom';
    let top = 0;
    let left = 0;

    for (const pos of candidatePlacements) {
      if (pos === 'right') {
        const rightSpace = vw - rect.right;
        if (rightSpace >= cardWidth + margin + caretOffset) {
          chosenPlacement = 'right';
          left = rect.right + caretOffset;
          top = rect.top + (rect.height - cardHeight) / 2;
          break;
        }
      } else if (pos === 'left') {
        const leftSpace = rect.left;
        if (leftSpace >= cardWidth + margin + caretOffset) {
          chosenPlacement = 'left';
          left = rect.left - cardWidth - caretOffset;
          top = rect.top + (rect.height - cardHeight) / 2;
          break;
        }
      } else if (pos === 'bottom') {
        const bottomSpace = vh - rect.bottom;
        if (bottomSpace >= cardHeight + margin + caretOffset) {
          chosenPlacement = 'bottom';
          top = rect.bottom + caretOffset;
          left = rect.left + (rect.width - cardWidth) / 2;
          break;
        }
      } else if (pos === 'top') {
        const topSpace = rect.top;
        if (topSpace >= cardHeight + margin + caretOffset) {
          chosenPlacement = 'top';
          top = rect.top - cardHeight - caretOffset;
          left = rect.left + (rect.width - cardWidth) / 2;
          break;
        }
      }
    }

    // Clamp coordinates safely within screen
    left = Math.max(margin, Math.min(left, vw - cardWidth - margin));
    top = Math.max(margin, Math.min(top, vh - cardHeight - margin));

    setCardPlacement({ top, left, placement: chosenPlacement, cardWidth, cardHeight });
  }, [findTargetElement, step.preferredPosition]);

  // Scroll target element into view if needed
  useEffect(() => {
    let timer = setTimeout(() => {
      const el = findTargetElement();
      if (el) {
        const rect = el.getBoundingClientRect();
        const isInView = (
          rect.top >= 40 &&
          rect.bottom <= window.innerHeight - 40 &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth
        );
        if (!isInView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }
      updatePosition();
    }, 120);

    return () => clearTimeout(timer);
  }, [currentStepIndex, findTargetElement, updatePosition]);

  // Window resize & scroll listener
  useEffect(() => {
    const handleScrollOrResize = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' && step.actionType === 'info') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish, handleNext, handleBack, step.actionType, isFirstStep]);

  // Calculate arrow caret positioning
  const getCaretStyles = () => {
    if (!targetRect || cardPlacement.placement === 'center') {
      return { display: 'none' };
    }

    const size = 8;
    const base = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid'
    };
    const cWidth = cardPlacement.cardWidth || 300;
    const cHeight = cardPlacement.cardHeight || 180;

    if (cardPlacement.placement === 'bottom') {
      const targetCenter = targetRect.left + targetRect.width / 2;
      const relativeLeft = Math.max(16, Math.min(targetCenter - cardPlacement.left, cWidth - 24));
      return {
        ...base,
        top: -size,
        left: `${relativeLeft}px`,
        borderWidth: `0 ${size}px ${size}px ${size}px`,
        borderColor: `transparent transparent var(--bg-card) transparent`,
        filter: 'drop-shadow(0 -1px 0 var(--border-light))'
      };
    }

    if (cardPlacement.placement === 'top') {
      const targetCenter = targetRect.left + targetRect.width / 2;
      const relativeLeft = Math.max(16, Math.min(targetCenter - cardPlacement.left, cWidth - 24));
      return {
        ...base,
        bottom: -size,
        left: `${relativeLeft}px`,
        borderWidth: `${size}px ${size}px 0 ${size}px`,
        borderColor: `var(--bg-card) transparent transparent transparent`,
        filter: 'drop-shadow(0 1px 0 var(--border-light))'
      };
    }

    if (cardPlacement.placement === 'right') {
      const targetCenter = targetRect.top + targetRect.height / 2;
      const relativeTop = Math.max(16, Math.min(targetCenter - cardPlacement.top, cHeight - 24));
      return {
        ...base,
        left: -size,
        top: `${relativeTop}px`,
        borderWidth: `${size}px ${size}px ${size}px 0`,
        borderColor: `transparent var(--bg-card) transparent transparent`,
        filter: 'drop-shadow(-1px 0 0 var(--border-light))'
      };
    }

    if (cardPlacement.placement === 'left') {
      const targetCenter = targetRect.top + targetRect.height / 2;
      const relativeTop = Math.max(16, Math.min(targetCenter - cardPlacement.top, cHeight - 24));
      return {
        ...base,
        right: -size,
        top: `${relativeTop}px`,
        borderWidth: `${size}px 0 ${size}px ${size}px`,
        borderColor: `transparent transparent transparent var(--bg-card)`,
        filter: 'drop-shadow(1px 0 0 var(--border-light))'
      };
    }

    return { display: 'none' };
  };

  return (
    <>
      {/* Target Highlight Spotlight (Non-blocking: pointer-events none) */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: '8px',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 28%, transparent), 0 0 20px color-mix(in srgb, var(--primary) 25%, transparent)',
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'all 0.22s ease-out',
            animation: 'targetPulse 2.4s infinite ease-in-out'
          }}
        />
      )}

      {/* Compact Contextual Tour Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-label="Product tour guide"
        style={{
          position: 'fixed',
          top: `${cardPlacement.top}px`,
          left: `${cardPlacement.left}px`,
          width: 'clamp(280px, 88vw, 350px)',
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25)',
          zIndex: 9999,
          padding: '1.15rem 1.2rem 1.05rem',
          display: isElementVisible ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '0.65rem',
          color: 'var(--text-main)',
          fontFamily: 'var(--font-sans, "Inter", sans-serif)',
          animation: 'cardFadeIn 0.2s ease-out'
        }}
      >
        {/* Caret arrow */}
        <div style={getCaretStyles()} />

        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'color-mix(in srgb, var(--primary) 20%, transparent)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={15} />
            </div>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}>
              Step {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleFinish}
            aria-label="Exit tour"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s ease'
            }}
            title="Exit tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '3px',
          background: 'var(--border-light)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%`,
            background: 'var(--primary)',
            transition: 'width 0.25s ease'
          }} />
        </div>

        {/* Title & Description */}
        <div>
          <h4 style={{
            fontSize: '1rem',
            fontWeight: 800,
            margin: '0 0 0.35rem 0',
            color: 'var(--text-main)',
            lineHeight: 1.3
          }}>
            {step.title}
          </h4>
          <p style={{
            fontSize: '0.83rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            margin: 0
          }}>
            {step.description}
          </p>
        </div>

        {/* Action Buttons & Skip link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.35rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--border-light)'
        }}>
          <button
            onClick={handleFinish}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textUnderlineOffset: '2px'
            }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {!isFirstStep && (
              <button
                onClick={handleBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0.38rem 0.7rem',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: isLastStep ? '0.45rem 1rem' : '0.4rem 0.9rem',
                background: 'var(--primary)',
                color: 'var(--text-white, #FFFFFF)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isLastStep ? (
                <>
                  <Check size={14} /> Start using KiroKash
                </>
              ) : (
                <>
                  Next <ChevronRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes targetPulse {
          0% {
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 14px color-mix(in srgb, var(--primary) 20%, transparent);
          }
          50% {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 15%, transparent), 0 0 24px color-mix(in srgb, var(--primary) 30%, transparent);
          }
          100% {
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 14px color-mix(in srgb, var(--primary) 20%, transparent);
          }
        }
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
