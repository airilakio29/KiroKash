import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { SocialWalletProvider, useSocialWallet } from './context/SocialWalletContext';
import { missingFirebaseKeys } from './firebase';
import { SPOT_FEED_NAME } from './config/appConstants';

import FullScreenLoader from './components/FullScreenLoader';
import OfflineBanner from './components/OfflineBanner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ResetPassword from './components/ResetPassword';
import GlitterBackground from './components/GlitterBackground';
import KiroAmbientParticles from './components/KiroAmbientParticles';
import Auth from './Auth';
import LandingPage from './components/LandingPage';
import { setThemeMode } from './utils/themeEngine';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Tutorial from './components/Tutorial';
import WelcomeIntroModal from './components/WelcomeIntroModal';
import ErrorBoundary from './components/ErrorBoundary';
import { DashboardSkeleton } from './components/Skeleton';
import { ToastProvider } from './context/ToastContext';

import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import BudgetsView from './views/BudgetsView';
import SavingsView from './views/SavingsView';
import AccountsView from './views/AccountsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import ExploreView from './views/ExploreView';
import CommunityView from './views/CommunityView';
import WalletView from './views/WalletView';
import AIChatView from './views/AIChatView';
import FloatingChatButton from './components/AIChat/FloatingChatButton';
import FloatingNavButton from './components/FloatingNavButton';

import TransactionModal from './components/TransactionModal';
import BudgetModal from './components/BudgetModal';
import SavingsModal from './components/SavingsModal';
import CategoryModal from './components/CategoryModal';
import AccountModal from './components/AccountModal';
import ProfileModal from './components/ProfileModal';
import PublicProfileModal from './components/social/PublicProfileModal';
import WalletReceiptModal from './components/wallet/WalletReceiptModal';
import OnboardingWizard from './components/OnboardingWizard';
import { DemoModeProvider } from './context/DemoModeProvider';
import TutorialDemoBanner from './components/TutorialDemoBanner';

function getInitialTabFromUrl() {
  try {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (pathname.includes('/ai-chat') || hash === '#ai-chat' || pathname.includes('/chat')) return 'ai-chat';
    if (
      pathname.includes('/community') ||
      pathname.includes('/spot-jimat') ||
      pathname.includes('/spots') ||
      pathname.includes('/makan-murah') ||
      hash === '#community' ||
      hash === '#spot-jimat'
    ) {
      return 'community';
    }
    if (pathname.includes('/wallet') || hash === '#wallet') return 'wallet';
    if (pathname.includes('/explore') || hash === '#explore') return 'explore';
    if (pathname.includes('/transactions') || hash === '#transactions') return 'transactions';
    if (pathname.includes('/budgets') || hash === '#budgets') return 'budgets';
    if (pathname.includes('/savings') || hash === '#savings') return 'savings';
    if (pathname.includes('/accounts') || hash === '#accounts') return 'accounts';
    if (pathname.includes('/reports') || hash === '#reports') return 'reports';
    if (pathname.includes('/settings') || hash === '#settings') return 'settings';
  } catch {}
  return 'dashboard';
}

function AppLayout({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  isProfileModalOpen,
  setIsProfileModalOpen,
  isOnboardingActive,
  onboardingStep,
  updateOnboardingStep,
  isTourActive,
  onExitTour,
  onReplayTutorial,
  isWelcomeIntroOpen,
  onCompleteWelcomeIntro,
  onSkipWelcomeIntro,
  isLoading,
  loadError
}) {
  const { user } = useAuth();
  const { activeReceiptModal, setActiveReceiptModal } = useSocialWallet();

  // Block route navigation during Step A profile setup
  const handleTabChange = (newTab) => {
    if (isOnboardingActive && onboardingStep === 'profile') {
      return; // Route blocked until profile setup is complete
    }
    setActiveTab(newTab);
    try {
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      const urlSlug = newTab === 'community' ? 'spot-jimat' : newTab;
      const targetUrl = newTab === 'dashboard' ? (basePath || '/') : `${basePath}/${urlSlug}`;
      window.history.pushState({ tab: newTab }, document.title, targetUrl);
    } catch {}
  };

  // Scroll main area to top when active tab changes
  useEffect(() => {
    const mainWrapper = document.querySelector('.main-wrapper');
    if (mainWrapper) {
      mainWrapper.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const handleOpenProfileModal = () => {
    if (isOnboardingActive && onboardingStep === 'profile') return;
    setIsProfileModalOpen(true);
  };

  // Modal Control States
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsModalMode, setSavingsModalMode] = useState('create');
  const [selectedSavingsGoalId, setSelectedSavingsGoalId] = useState(null);
  const [editingSavings, setEditingSavings] = useState(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Floating AI Assistant State
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const handleOpenAddTransaction = (prefill = null) => {
    setEditingTransaction(prefill);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  const handleOpenAddBudget = () => {
    setEditingBudget(null);
    setIsBudgetModalOpen(true);
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setIsBudgetModalOpen(true);
  };

  const handleOpenAddSavings = () => {
    setSavingsModalMode('create');
    setSelectedSavingsGoalId(null);
    setEditingSavings(null);
    setIsSavingsModalOpen(true);
  };

  const handleEditSavings = (goal) => {
    setSavingsModalMode('edit');
    setSelectedSavingsGoalId(goal.id);
    setEditingSavings(goal);
    setIsSavingsModalOpen(true);
  };

  const handleOpenDepositSavings = (goalId) => {
    setSavingsModalMode('deposit');
    setSelectedSavingsGoalId(goalId);
    setEditingSavings(null);
    setIsSavingsModalOpen(true);
  };

  const handleOpenAddCategory = () => {
    setIsCategoryModalOpen(true);
  };

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onOpenAddTransaction={handleOpenAddTransaction}
            onOpenAddBudget={handleOpenAddBudget}
            onOpenAddSavings={handleOpenAddSavings}
            onOpenAddAccount={handleOpenAddAccount}
            onOpenAIChat={() => setIsAiChatOpen(true)}
          />
        );
      case 'transactions':
        return (
          <TransactionsView
            onOpenAddTransaction={handleOpenAddTransaction}
            onEditTransaction={handleEditTransaction}
          />
        );
      case 'budgets':
        return (
          <BudgetsView
            onOpenAddBudget={handleOpenAddBudget}
            onEditBudget={handleEditBudget}
          />
        );
      case 'savings':
        return (
          <SavingsView
            onOpenAddSavings={handleOpenAddSavings}
            onOpenDepositSavings={handleOpenDepositSavings}
            onEditSavings={handleEditSavings}
          />
        );
      case 'accounts':
        return (
          <AccountsView
            onOpenAddAccount={handleOpenAddAccount}
            onEditAccount={handleEditAccount}
          />
        );
      case 'community':
        return (
          <CommunityView
            onNavigateToExplore={() => handleTabChange('explore')}
          />
        );
      case 'wallet':
        return <WalletView />;
      case 'explore':
        return (
          <ExploreView
            onOpenAddTransaction={handleOpenAddTransaction}
            onNavigateToBudgets={() => handleTabChange('budgets')}
            onNavigateToCommunity={() => handleTabChange('community')}
          />
        );
      case 'ai-chat':
        return <AIChatView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
      case 'profile':
        return (
          <SettingsView
            onOpenAddCategory={handleOpenAddCategory}
            onReplayTutorial={onReplayTutorial}
            onOpenProfileModal={handleOpenProfileModal}
          />
        );
      default:
        return (
          <DashboardView
            onOpenAddTransaction={handleOpenAddTransaction}
            onOpenAddBudget={handleOpenAddBudget}
            onOpenAddSavings={handleOpenAddSavings}
            onOpenAddAccount={handleOpenAddAccount}
            onOpenAIChat={() => setIsAiChatOpen(true)}
          />
        );
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Financial Dashboard';
      case 'ai-chat': return 'KampusKash AI Assistant';
      case 'transactions': return 'Transaction Records';
      case 'budgets': return 'Category Budgets';
      case 'savings': return 'Student Savings Goals';
      case 'accounts': return 'My Accounts';
      case 'community': return `${SPOT_FEED_NAME} (Student Spots)`;
      case 'wallet': return 'KampusKash Demo Wallet';
      case 'explore': return 'Explore Ipoh';
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'App Settings & Backup';
      case 'profile': return 'Student Profile & Customization';
      default: return 'Financial Dashboard';
    }
  };

  return (
    <div className="app-container">
      <GlitterBackground />
      <KiroAmbientParticles />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenAddTransaction={handleOpenAddTransaction}
        onOpenProfileModal={handleOpenProfileModal}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="main-wrapper">
        <Header
          title={getPageTitle()}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenProfileModal={handleOpenProfileModal}
          onNavigateTab={handleTabChange}
        />

        <main className="content-area">
          <TutorialDemoBanner onExitTour={onExitTour} />

          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {loadError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⚠️ {loadError}
                </div>
              )}
              <div key={activeTab} className="page-transition-wrapper">
                {renderActiveView()}
              </div>
            </>
          )}
        </main>
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        initialData={editingTransaction}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        initialData={editingBudget}
      />

      <SavingsModal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        mode={savingsModalMode}
        goalId={selectedSavingsGoalId}
        initialData={editingSavings}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialData={editingAccount}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Global Social Public Profile Modal */}
      <PublicProfileModal />

      {/* Global KampusKash Demo Wallet Receipt Modal */}
      <WalletReceiptModal
        receipt={activeReceiptModal}
        currentUserId={user?.id}
        onClose={() => setActiveReceiptModal(null)}
      />

      {/* Floating KampusKash AI Assistant Button & Popup Panel (Bottom-Right) */}
      <FloatingChatButton
        isOpen={isAiChatOpen}
        onToggle={setIsAiChatOpen}
      />

      {/* Floating Mobile Navigation Button (Bottom-Left) */}
      <FloatingNavButton
        isOpen={isMobileOpen}
        onOpen={() => setIsMobileOpen(true)}
      />

      {/* Step A: Profile Setup Wizard (shown immediately on first login before reaching Dashboard) */}
      {isOnboardingActive && onboardingStep === 'profile' && (
        <OnboardingWizard
          onCompleteProfile={() => {
            updateOnboardingStep('tutorial');
            setActiveTab('dashboard');
          }}
        />
      )}

      {/* Step A-2: 3-Screen Welcome Introduction */}
      <WelcomeIntroModal
        isOpen={Boolean(isWelcomeIntroOpen)}
        onComplete={onCompleteWelcomeIntro}
        onSkip={onSkipWelcomeIntro}
      />

      {/* Step B / Replay: Modern Contextual Product Tour */}
      {isTourActive && !isWelcomeIntroOpen && (
        <Tutorial
          onComplete={onExitTour}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isTransactionModalOpen={isTransactionModalOpen}
          onOpenAddTransaction={handleOpenAddTransaction}
          isProfileModalOpen={isProfileModalOpen}
          onOpenProfileModal={handleOpenProfileModal}
          onCloseProfileModal={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const {
    completeTutorial,
    onboardingCompleted,
    onboardingStep,
    updateOnboardingStep,
    completeOnboarding,
    isLoading,
    loadError
  } = useFinance();
  const [activeTab, setActiveTab] = useState(getInitialTabFromUrl);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isReplayingTutorial, setIsReplayingTutorial] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWelcomeIntroOpen, setIsWelcomeIntroOpen] = useState(() => {
    try {
      if (user?.isDemoUser) return false;
      const uid = user?.id || user?.uid;
      if (!uid) return false;
      const seen = localStorage.getItem(`kampuskash_welcome_seen_${uid}`);
      return !seen;
    } catch {
      return false;
    }
  });

  // Synchronize on browser history popstate / back-forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentTab = getInitialTabFromUrl();
      setActiveTab(currentTab);
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Mandatory Onboarding Flow:
  // Step A: Profile setup (required first, blocks app routes)
  // Step B: Guided interactive tutorial on Dashboard
  const isDemo = Boolean(user?.isDemoUser);
  const isOnboardingActive = !onboardingCompleted && !isDemo;
  const isTourActive = (isOnboardingActive && onboardingStep === 'tutorial') || isReplayingTutorial;
  const isDemoDataActive = isDemo || isTourActive;

  const handleCompleteWelcomeIntro = () => {
    try {
      const uid = user?.id || user?.uid;
      if (uid) localStorage.setItem(`kampuskash_welcome_seen_${uid}`, 'true');
    } catch {}
    setIsWelcomeIntroOpen(false);
  };

  const handleSkipWelcomeIntro = () => {
    try {
      const uid = user?.id || user?.uid;
      if (uid) localStorage.setItem(`kampuskash_welcome_seen_${uid}`, 'true');
    } catch {}
    setIsWelcomeIntroOpen(false);
  };

  const handleExitTour = () => {
    try {
      localStorage.removeItem('kirokash_tutorial_current_step');
    } catch {}
    if (user?.isDemoUser) {
      if (logout) logout();
      return;
    }
    if (isOnboardingActive) {
      completeOnboarding();
    } else {
      completeTutorial();
    }
    setIsReplayingTutorial(false);
    setActiveTab('dashboard');
  };

  return (
    <DemoModeProvider isTourActive={isDemoDataActive} onExitTour={handleExitTour}>
      <SocialWalletProvider onNavigateTab={setActiveTab}>
        <AppLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          isProfileModalOpen={isProfileModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
          isOnboardingActive={isOnboardingActive}
          onboardingStep={onboardingStep}
          updateOnboardingStep={updateOnboardingStep}
          isTourActive={isTourActive}
          onExitTour={handleExitTour}
          onReplayTutorial={() => {
            try {
              const uid = user?.id || user?.uid;
              if (uid) {
                localStorage.setItem(`kirokash_tutorial_step_${uid}`, '0');
                localStorage.setItem('kirokash_tutorial_current_step', '0');
              }
            } catch {}
            setIsWelcomeIntroOpen(true);
            setIsReplayingTutorial(true);
            setActiveTab('dashboard');
          }}
          isWelcomeIntroOpen={isWelcomeIntroOpen}
          onCompleteWelcomeIntro={handleCompleteWelcomeIntro}
          onSkipWelcomeIntro={handleSkipWelcomeIntro}
          isLoading={isLoading}
          loadError={loadError}
        />
      </SocialWalletProvider>
    </DemoModeProvider>
  );
}

function FirebaseSetupNotice({ onBack }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        padding: '2.5rem 2rem',
        background: 'var(--bg-card, rgba(54, 40, 68, 0.85))',
        borderRadius: '16px',
        border: '1px solid var(--border-light, rgba(255, 255, 255, 0.15))',
        boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Firebase setup required
        </h1>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted, rgba(255,255,255,0.65))' }}>
          Add your Firebase web app credentials to the <code>.env</code> file, then restart the dev server.
        </p>
        <ul style={{ margin: '1rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.9 }}>
          {missingFirebaseKeys.map((key) => (
            <li key={key}><code>{key}</code></li>
          ))}
        </ul>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            style={{ marginTop: '1.5rem', width: '100%' }}
          >
            ← Back to Landing Page / Demo
          </button>
        )}
      </div>
    </div>
  );
}

function handleRootResetRedirect() {
  try {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    const pathname = window.location.pathname.toLowerCase();

    if ((mode === 'resetPassword' || oobCode) && oobCode) {
      if (!pathname.includes('/reset-password')) {
        const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
        const targetUrl = `${basePath}/reset-password?${searchParams.toString()}`;
        window.history.replaceState({ fromRootRedirect: true }, document.title, targetUrl);
        return true;
      }
    }
  } catch (err) {
    console.error('Failed to perform root resetPassword redirect:', err);
  }
  return false;
}

handleRootResetRedirect();

function checkPasswordResetRoute() {
  try {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (pathname.includes('/reset-password') || pathname.endsWith('reset-password')) {
      return true;
    }
    if (mode === 'resetPassword' || Boolean(oobCode)) {
      return true;
    }
    const hash = window.location.hash;
    if (hash.includes('reset-password') || hash.includes('oobCode')) {
      return true;
    }
  } catch {
    // Fallback
  }
  return false;
}

function DataLoaderReporter({ onDataReady }) {
  const { isLoading } = useFinance();
  useEffect(() => {
    if (!isLoading && typeof onDataReady === 'function') {
      onDataReady();
    }
  }, [isLoading, onDataReady]);
  return null;
}

function AppAuthenticator() {
  const { user, isAuthenticated, isAuthResolved, isFirebaseConfigured, loginAsDemo } = useAuth();
  const [inResetFlow, setInResetFlow] = useState(() => {
    handleRootResetRedirect();
    return checkPasswordResetRoute();
  });
  const [authInitialMode, setAuthInitialMode] = useState(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('/login') || pathname.endsWith('login')) return 'login';
    } catch {}
    return 'signup';
  });
  const [showAuthForm, setShowAuthForm] = useState(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/auth')) return true;
    } catch {}
    return false;
  });
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
    return 'light';
  });

  const [loaderDone, setLoaderDone] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    handleRootResetRedirect();

    const handleUrlChange = () => {
      handleRootResetRedirect();
      setInResetFlow(checkPasswordResetRoute());
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/login')) {
        setAuthInitialMode('login');
        setShowAuthForm(true);
      } else if (path.includes('/signup')) {
        setAuthInitialMode('signup');
        setShowAuthForm(true);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoaderDone(false);
      setIsDataReady(false);
      setShowAuthForm(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && loaderDone) {
      const handlePopStateGuard = () => {
        setLoaderDone(true);
      };
      window.addEventListener('popstate', handlePopStateGuard);
      return () => window.removeEventListener('popstate', handlePopStateGuard);
    }
  }, [isAuthenticated, loaderDone]);

  const handleBackToLogin = () => {
    setInResetFlow(false);
    setAuthInitialMode('login');
    setShowAuthForm(true);
    try {
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      const loginUrl = `${basePath}/login`;
      window.history.replaceState(null, document.title, loginUrl);
    } catch {}
  };

  if (inResetFlow) {
    const oobCode = (() => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('oobCode') || searchParams.get('code');
        if (code) return code;
        if (window.location.hash) {
          const match = window.location.hash.match(/[?&#](?:oobCode|code)=([^&#]+)/);
          if (match && match[1]) return decodeURIComponent(match[1]);
        }
      } catch {}
      return '';
    })();

    return (
      <ResetPassword oobCode={oobCode} onBackToLogin={handleBackToLogin} />
    );
  }

  if (!isAuthResolved) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-app-gradient, var(--bg-app))',
          backgroundColor: 'var(--bg-app)',
          zIndex: 99999
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (!showAuthForm) {
      return (
        <LandingPage
          onOpenLogin={() => {
            setAuthInitialMode('login');
            setShowAuthForm(true);
          }}
          onOpenSignup={() => {
            setAuthInitialMode('signup');
            setShowAuthForm(true);
          }}
          onTryDemo={() => {
            loginAsDemo();
          }}
          currentTheme={currentTheme}
          onToggleTheme={() => {
            const next = currentTheme === 'dark' ? 'light' : 'dark';
            setThemeMode(next);
            setCurrentTheme(next);
          }}
        />
      );
    }

    if (!isFirebaseConfigured) {
      return <FirebaseSetupNotice onBack={() => setShowAuthForm(false)} />;
    }

    return (
      <Auth
        initialMode={authInitialMode}
        onBackToLanding={() => setShowAuthForm(false)}
      />
    );
  }

  if (!isFirebaseConfigured && !user?.isDemoUser) {
    return <FirebaseSetupNotice onBack={() => setShowAuthForm(false)} />;
  }

  if (!loaderDone) {
    return (
      <FinanceProvider key={user.id}>
        <DataLoaderReporter onDataReady={() => setIsDataReady(true)} />
        <FullScreenLoader
          isDataReady={isDataReady}
          onComplete={() => {
            setLoaderDone(true);
            try {
              const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
              window.history.replaceState({ appReady: true }, document.title, basePath || '/');
            } catch {}
          }}
        />
      </FinanceProvider>
    );
  }

  return (
    <FinanceProvider key={user.id}>
      <AppContent />
    </FinanceProvider>
  );
}

function AppRoot() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
        <PWAInstallPrompt />
        <AppAuthenticator />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  useEffect(() => {
    handleRootResetRedirect();
  }, []);

  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
