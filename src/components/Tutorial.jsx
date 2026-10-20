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
import { useAuth } from '../context/AuthContext';
import { db, doc, setDoc } from '../firebase';
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
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    try {
      const userSaved = localStorage.getItem(`kirokash_tutorial_step_${userId}`);
      const fallback = localStorage.getItem('kirokash_tutorial_current_step');
      const saved = userSaved !== null ? userSaved : fallback;
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < TOUR_STEPS.length) {
        return parsed;
      }
    } catch {}
    return 0;
  });

  const [targetRect, setTargetRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState({ top: 100, left: 100, isMobileSheet: false });
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
      localStorage.removeItem(`kirokash_tutorial_step_${userId}`);
      localStorage.removeItem('kirokash_tutorial_current_step');
    } catch {}

    if (userId && db) {
      setDoc(doc(db, 'users', userId), {
        tutorialCompleted: true,
        onboardingCompleted: true,
        tutorialStep: TOUR_STEPS.length - 1
      }, { merge: true }).catch(() => {});
    }

    if (completeTutorial) {
      completeTutorial();
    }
    if (onCloseProfileModal) {
      onCloseProfileModal();
    }
    if (onComplete) {
      onComplete();
    }
  }, [completeTutorial, onCloseProfileModal, onComplete, userId]);

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
      localStorage.setItem(`kirokash_tutorial_step_${userId}`, String(index));
      localStorage.setItem('kirokash_tutorial_current_step', String(index));
    } catch {}

    // Persist user progress in Firestore
    if (userId && db) {
      setDoc(doc(db, 'users', userId), {
        tutorialStep: index
      }, { merge: true }).catch(() => {});
    }

    setCurrentStepIndex(index);
  }, [
    activeTab, 
    setActiveTab, 
    isTransactionModalOpen, 
    onOpenAddTransaction, 
    isProfileModalOpen, 
    onOpenProfileModal, 
    onCloseProfileModal,
    userId
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;

    // Mobile: Always use bottom-sheet layout to prevent cut-offs and keyboard conflicts
    if (isMobile) {
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
      setIsElementVisible(true);
      setCardPlacement({
        top: 0,
        left: 0,
        isMobileSheet: true,
        placement: 'bottom-sheet'
      });
      return;
    }

    if (!el) {
      setTargetRect(null);
      setIsElementVisible(true);
      // Fallback: center in viewport on desktop
      const cardWidth = Math.min(360, vw - 32);
      const cardHeight = 220;
      setCardPlacement({
        top: Math.max(20, (vh - cardHeight) / 2),
        left: Math.max(16, (vw - cardWidth) / 2),
        isMobileSheet: false,
        placement: 'center',
        cardWidth,
        cardHeight
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    setIsElementVisible(true);

    const cardEl = cardRef.current;
    const cardWidth = cardEl ? cardEl.offsetWidth : Math.min(360, vw - 32);
    const cardHeight = cardEl ? cardEl.offsetHeight : 210;

    const margin = 16;
    const caretOffset = 10;

    const candidatePlacements = [step.preferredPosition, 'bottom', 'right', 'top', 'left'];

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

    setCardPlacement({
      top,
      left,
      isMobileSheet: false,
      placement: chosenPlacement,
      cardWidth,
      cardHeight
    });
  }, [findTargetElement, step.preferredPosition]);

  // Scroll target element into view if needed
  useEffect(() => {
    let timer = setTimeout(() => {
      const el = findTargetElement();
      if (el) {
        const isMobile = window.innerWidth < 768;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;

        if (isMobile) {
          // Keep target element in top 55% of the mobile viewport so bottom-sheet doesn't cover it
          if (rect.bottom > vh * 0.55 || rect.top < 60) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          const isInView = (
            rect.top >= 50 &&
            rect.bottom <= vh - 50 &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth
          );
          if (!isInView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }
        }
      }
      updatePosition();
    }, 140);

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
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish, handleNext, handleBack, isFirstStep]);

  // Calculate arrow caret positioning on desktop
  const getCaretStyles = () => {
    if (!targetRect || cardPlacement.isMobileSheet || cardPlacement.placement === 'center') {
      return { display: 'none' };
    }

    const size = 8;
    const base = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid'
    };
    const cWidth = cardPlacement.cardWidth || 340;
    const cHeight = cardPlacement.cardHeight || 200;

    if (cardPlacement.placement === 'bottom') {
      const targetCenter = targetRect.left + targetRect.width / 2;
      const relativeLeft = Math.max(16, Math.min(targetCenter - cardPlacement.left, cWidth - 24));
      return {
        ...base,
        top: -size,
        left: `${relativeLeft}px`,
        borderWidth: `0 ${size}px ${size}px ${size}px`,
        borderColor: `transparent transparent var(--bg-card, #2A1F35) transparent`,
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
        borderColor: `var(--bg-card, #2A1F35) transparent transparent transparent`,
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
        borderColor: `transparent var(--bg-card, #2A1F35) transparent transparent`,
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
        borderColor: `transparent transparent transparent var(--bg-card, #2A1F35)`,
        filter: 'drop-shadow(1px 0 0 var(--border-light))'
      };
    }

    return { display: 'none' };
  };

  const isMobile = cardPlacement.isMobileSheet;

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
            borderRadius: '10px',
            border: '2px solid var(--primary, #8B5CF6)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 28%, transparent), 0 0 24px color-mix(in srgb, var(--primary) 35%, transparent)',
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: 'targetPulse 2.4s infinite ease-in-out'
          }}
        />
      )}

      {/* Contextual Tour Tooltip / Mobile Bottom Sheet */}
      <div
        ref={cardRef}
        role="dialog"
        aria-label="KampusKash Product Tour"
        className={isMobile ? 'tutorial-sheet-mobile' : 'tutorial-card-desktop'}
        style={{
          position: 'fixed',
          top: isMobile ? 'auto' : `${cardPlacement.top}px`,
          bottom: isMobile ? 'calc(1rem + env(safe-area-inset-bottom, 0px))' : 'auto',
          left: isMobile ? '1rem' : `${cardPlacement.left}px`,
          right: isMobile ? '1rem' : 'auto',
          width: isMobile ? 'auto' : 'clamp(300px, 88vw, 360px)',
          maxWidth: isMobile ? 'calc(100vw - 2rem)' : '360px',
          background: 'var(--bg-card, #2A1F35)',
          borderRadius: isMobile ? '18px' : '14px',
          border: '1px solid var(--border-light, rgba(255, 255, 255, 0.15))',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.25)',
          zIndex: 9999,
          padding: '1.2rem 1.25rem 1.1rem',
          display: isElementVisible ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '0.7rem',
          color: 'var(--text-main, #FFFFFF)',
          fontFamily: 'var(--font-sans, "Inter", sans-serif)',
          animation: isMobile ? 'sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'cardFadeIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Caret arrow on desktop */}
        {!isMobile && <div style={getCaretStyles()} />}

        {/* Card Header: Step counter and exit X */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'color-mix(in srgb, var(--primary) 22%, transparent)',
              color: 'var(--primary-light, #E8DEF5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={16} />
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted, #C4B5D4)'
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
              color: 'var(--text-muted, #C4B5D4)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s ease'
            }}
            title="Exit tour"
          >
            <X size={17} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--primary, #8B5CF6), var(--primary-light, #E8DEF5))',
            transition: 'width 0.28s ease',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)'
          }} />
        </div>

        {/* Title & Description */}
        <div>
          <h4 style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            margin: '0 0 0.35rem 0',
            color: 'var(--text-main, #FFFFFF)',
            lineHeight: 1.3
          }}>
            {step.title}
          </h4>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted, #C4B5D4)',
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
          marginTop: '0.4rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-light, rgba(255, 255, 255, 0.1))'
        }}>
          <button
            onClick={handleFinish}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #C4B5D4)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px',
              textDecoration: 'underline',
              textUnderlineOffset: '2px'
            }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!isFirstStep && (
              <button
                onClick={handleBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0.42rem 0.75rem',
                  background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.08))',
                  color: 'var(--text-main, #FFFFFF)',
                  border: '1px solid var(--border-light, rgba(255, 255, 255, 0.15))',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: isLastStep ? '0.48rem 1.15rem' : '0.45rem 1rem',
                background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isLastStep ? (
                <>
                  <Check size={14} /> Finish Tour
                </>
              ) : (
                <>
                  Next <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes targetPulse {
          0% {
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 16px color-mix(in srgb, var(--primary) 25%, transparent);
          }
          50% {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 18%, transparent), 0 0 28px color-mix(in srgb, var(--primary) 38%, transparent);
          }
          100% {
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 16px color-mix(in srgb, var(--primary) 25%, transparent);
          }
        }
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes sheetSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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
