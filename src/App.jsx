import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { missingFirebaseKeys } from './firebase';

import FullScreenLoader from './components/FullScreenLoader';
import OfflineBanner from './components/OfflineBanner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ResetPassword from './components/ResetPassword';
import GlitterBackground from './components/GlitterBackground';
import KiroAmbientParticles from './components/KiroAmbientParticles';
import Auth from './Auth';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Tutorial from './components/Tutorial';

import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import BudgetsView from './views/BudgetsView';
import SavingsView from './views/SavingsView';
import AccountsView from './views/AccountsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import ExploreView from './views/ExploreView';
import AIChatView from './views/AIChatView';
import FloatingChatButton from './components/AIChat/FloatingChatButton';

import TransactionModal from './components/TransactionModal';
import BudgetModal from './components/BudgetModal';
import SavingsModal from './components/SavingsModal';
import CategoryModal from './components/CategoryModal';
import AccountModal from './components/AccountModal';
import ProfileModal from './components/ProfileModal';
import OnboardingWizard from './components/OnboardingWizard';
import { DemoModeProvider } from './context/DemoModeProvider';
import TutorialDemoBanner from './components/TutorialDemoBanner';

function getInitialTabFromUrl() {
  try {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (pathname.includes('/ai-chat') || hash === '#ai-chat' || pathname.includes('/chat')) return 'ai-chat';
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
  isLoading,
  loadError
}) {
  // Block route navigation during Step A profile setup
  const handleTabChange = (newTab) => {
    if (isOnboardingActive && onboardingStep === 'profile') {
      return; // Route blocked until profile setup is complete
    }
    setActiveTab(newTab);
    try {
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      const targetUrl = newTab === 'dashboard' ? (basePath || '/') : `${basePath}/${newTab}`;
      window.history.pushState({ tab: newTab }, document.title, targetUrl);
    } catch {}
  };

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
      case 'explore':
        return (
          <ExploreView
            onOpenAddTransaction={handleOpenAddTransaction}
            onNavigateToBudgets={() => handleTabChange('budgets')}
          />
        );
      case 'ai-chat':
        return <AIChatView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return (
          <SettingsView
            onOpenAddCategory={handleOpenAddCategory}
            onReplayTutorial={onReplayTutorial}
            onOpenProfileModal={handleOpenProfileModal}
          />
        );
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
        />

        <main className="content-area">
          <TutorialDemoBanner onExitTour={onExitTour} />

          {isLoading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Loading your finances...
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                Syncing with your account data
              </div>
            </div>
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
              {renderActiveView()}
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

      {/* Floating KampusKash AI Assistant Button & Popup Panel */}
      <FloatingChatButton
        isOpen={isAiChatOpen}
        onToggle={setIsAiChatOpen}
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

      {/* Step B / Replay: Modern Contextual Product Tour */}
      {isTourActive && (
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
  const isOnboardingActive = !onboardingCompleted;
  const isTourActive = (isOnboardingActive && onboardingStep === 'tutorial') || isReplayingTutorial;

  const handleExitTour = () => {
    try {
      localStorage.removeItem('kirokash_tutorial_current_step');
    } catch {}
    if (isOnboardingActive) {
      completeOnboarding();
    } else {
      completeTutorial();
    }
    setIsReplayingTutorial(false);
    setActiveTab('dashboard');
  };

  return (
    <DemoModeProvider isTourActive={isTourActive} onExitTour={handleExitTour}>
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
            localStorage.setItem('kirokash_tutorial_current_step', '0');
          } catch {}
          setIsReplayingTutorial(true);
          setActiveTab('dashboard');
        }}
        isLoading={isLoading}
        loadError={loadError}
      />
    </DemoModeProvider>
  );
}

function FirebaseSetupNotice() {
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
      </div>
    </div>
  );
}

/**
 * Root Redirect Fallback:
 * If query parameters mode === 'resetPassword' and oobCode are detected at the root URL
 * (e.g. https://kampuskash.vercel.app/?mode=resetPassword&oobCode=...),
 * automatically redirect the user to /reset-password?oobCode=${oobCode}
 * without rendering the default landing page.
 */
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

// Perform root redirect synchronously on evaluation
handleRootResetRedirect();

function checkPasswordResetRoute() {
  try {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    // Dedicated /reset-password route
    if (pathname.includes('/reset-password') || pathname.endsWith('reset-password')) {
      return true;
    }
    // Action code query parameters
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

function AppAuthenticator() {
  const { user, isAuthenticated, isFirebaseConfigured } = useAuth();
  const [inResetFlow, setInResetFlow] = useState(() => {
    handleRootResetRedirect();
    return checkPasswordResetRoute();
  });
  const [authInitialMode, setAuthInitialMode] = useState(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('/login') || pathname.endsWith('login')) return 'login';
    } catch {
      // Fallback
    }
    return 'signup';
  });

  // Synchronize on URL changes / back-forward navigation & root redirect
  useEffect(() => {
    handleRootResetRedirect();

    const handleUrlChange = () => {
      handleRootResetRedirect();
      setInResetFlow(checkPasswordResetRoute());
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/login')) {
        setAuthInitialMode('login');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleBackToLogin = () => {
    setInResetFlow(false);
    setAuthInitialMode('login');
    try {
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      const loginUrl = `${basePath}/login`;
      window.history.replaceState(null, document.title, loginUrl);
    } catch {
      // Fallback
    }
  };

  if (!isFirebaseConfigured) {
    return <FirebaseSetupNotice />;
  }

  // Custom Password Reset Page for Firebase Action Emails or /reset-password
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
      } catch {
        // Fallback
      }
      return '';
    })();

    return (
      <>
        <GlitterBackground />
        <KiroAmbientParticles />
        <ResetPassword oobCode={oobCode} onBackToLogin={handleBackToLogin} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <GlitterBackground />
        <KiroAmbientParticles />
        <Auth initialMode={authInitialMode} />
      </>
    );
  }

  return (
    <FinanceProvider key={user.id}>
      <AppContent />
    </FinanceProvider>
  );
}

function AppWithLoader() {
  const { isAuthResolved } = useAuth();

  return (
    <>
      <OfflineBanner />
      <PWAInstallPrompt />
      <FullScreenLoader isResolved={isAuthResolved} />
      {isAuthResolved && <AppAuthenticator />}
    </>
  );
}

export default function App() {
  useEffect(() => {
    handleRootResetRedirect();
  }, []);

  return (
    <AuthProvider>
      <AppWithLoader />
    </AuthProvider>
  );
}
