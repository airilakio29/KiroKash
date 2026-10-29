import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  PiggyBank,
  Settings,
  PlusCircle,
  LogOut,
  X,
  Landmark,
  BarChart3,
  User as UserIcon,
  Compass,
  Sparkles,
  UtensilsCrossed,
  QrCode,
  LayoutGrid,
  Menu,
  Download
} from 'lucide-react';
import KampusKashLogo from './KampusKashLogo';
import UserAvatar from './UserAvatar';
import { triggerInstallPrompt } from './PWAInstallPrompt';
import { isPWAInstalled } from '../registerServiceWorker';
import { SPOT_FEED_NAME, DEMO_WALLET, PAY_SECTION_NAME } from '../config/appConstants';
import { useSocialWallet } from '../context/SocialWalletContext';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenAddTransaction,
  onOpenProfileModal,
  isMobileOpen,
  setIsMobileOpen
}) {
  const { user, logout } = useAuth();
  const [hasVisitedPay, setHasVisitedPay] = React.useState(() => {
    try {
      return localStorage.getItem('kirokash_visited_pay_tab') === 'true';
    } catch {
      return false;
    }
  });

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'pay',
      label: PAY_SECTION_NAME,
      icon: QrCode,
      badge: hasVisitedPay ? null : 'New',
      isHighlight: true
    },
    { id: 'ai-chat', label: 'KampusKash AI', icon: Sparkles, badge: 'AI' },
    { id: 'community', label: SPOT_FEED_NAME, icon: UtensilsCrossed },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'accounts', label: 'Accounts', icon: Landmark },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'savings', label: 'Savings Goals', icon: PiggyBank },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Derive a clean display name — never show UID or technical identifiers
  const displayName = (() => {
    const name = user?.username;
    if (!name) return 'Student';
    if (/^[a-f0-9]{20,}$/i.test(name.replace(/[\s-]/g, ''))) return 'Student';
    return name;
  })();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="sidebar-mobile-overlay"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-content-top">
          {/* Brand Logo & Header */}
          <div className="sidebar-brand-wrapper">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                className="sidebar-logo-btn"
                aria-label="KampusKash - Go to Dashboard"
                title="Go to Dashboard"
              >
                <KampusKashLogo size={32} textColor="var(--sidebar-text)" showWordmark={true} />
              </button>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="mobile-close-btn"
                aria-label="Close navigation drawer"
                title="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <span className="sidebar-tagline">
              Smart Student Finance
            </span>
          </div>

          {/* Quick Add Button with Min 44px Height */}
          <button
            data-tour="add-transaction"
            onClick={() => {
              onOpenAddTransaction();
              if (isMobileOpen) setIsMobileOpen(false);
            }}
            className="btn sidebar-add-btn"
          >
            <PlusCircle size={18} />
            <span>+ Add Transaction</span>
          </button>

          {/* Navigation Links with Accessible Touch Targets (min 44px) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-tour={`nav-${item.id}`}
                  onClick={() => {
                    if (item.id === 'pay' && !hasVisitedPay) {
                      try {
                        localStorage.setItem('kirokash_visited_pay_tab', 'true');
                      } catch {}
                      setHasVisitedPay(true);
                    }
                    setActiveTab(item.id);
                    if (isMobileOpen) setIsMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''} ${item.isHighlight && !isActive ? 'highlight-nav' : ''}`}
                  aria-label={item.label}
                >
                  <Icon size={20} color={isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-muted)'} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-badge) 100%)',
                        color: 'var(--text-on-primary)',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile & Logout */}
        <div className="sidebar-content-footer" style={{
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(var(--sidebar-overlay-rgb), 0.12)',
          marginTop: 'auto',
          flexShrink: 0
        }}>
          <div
            data-tour="sidebar-profile-card"
            onClick={() => {
              if (onOpenProfileModal) {
                onOpenProfileModal();
                if (isMobileOpen) setIsMobileOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (onOpenProfileModal) onOpenProfileModal();
                if (isMobileOpen) setIsMobileOpen(false);
              }
            }}
            title="Edit Profile & Avatar"
            aria-label="Edit Profile & Avatar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              background: 'rgba(var(--sidebar-overlay-rgb), 0.08)',
              borderRadius: 'var(--radius-md)',
              cursor: onOpenProfileModal ? 'pointer' : 'default',
              transition: 'background var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
              <UserAvatar avatar={user?.avatar} name={displayName} size={36} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sidebar-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--sidebar-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.bio || user?.university || 'Student'}
                </div>
              </div>
            </div>
            {onOpenProfileModal && (
              <span style={{ color: 'var(--sidebar-text-muted)', display: 'flex', alignItems: 'center', marginLeft: '0.35rem' }}>
                <UserIcon size={14} />
              </span>
            )}
          </div>

          {!isPWAInstalled() && (
            <button
              onClick={() => {
                triggerInstallPrompt();
                if (isMobileOpen) setIsMobileOpen(false);
              }}
              title="Install KampusKash Mobile Application"
              aria-label="Install KampusKash Mobile Application"
              className="sidebar-install-btn"
            >
              <Download size={15} />
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={logout}
            title="Log Out"
            aria-label="Log Out"
            className="sidebar-logout-btn"
          >
            <LogOut size={15} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation with CIMB OCTO-Style Raised Center Scan QR Button */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Primary Navigation">
        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="mobile-nav-indicator" />
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <span className="mobile-nav-indicator" />
          <Landmark size={20} />
          <span>Accounts</span>
        </button>

        <div className="mobile-bottom-qr-slot">
          {/* Subtle curved arch cutout ring around the button */}
          <div className="mobile-bottom-qr-cutout" />
          <button
            type="button"
            data-tour="mobile-scan-pay-btn"
            className={`mobile-bottom-qr-btn ${activeTab === 'pay' ? 'active' : ''}`}
            onClick={() => {
              if (!hasVisitedPay) {
                try {
                  localStorage.setItem('kirokash_visited_pay_tab', 'true');
                } catch {}
                setHasVisitedPay(true);
              }
              // Center button opens camera scanner immediately (fastest path!)
              setActiveTab('pay', 'scan');
            }}
            aria-label={t('scanQrBtnLabel') || 'Scan QR'}
          >
            <span className="mobile-bottom-qr-circle">
              {/* Authentic Scanner QR icon with framing corners */}
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8V5a1 1 0 0 1 1-1h3" />
                <path d="M16 4h3a1 1 0 0 1 1 1v3" />
                <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
                <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
                <rect x="7" y="7" width="3" height="3" fill="currentColor" stroke="none" rx="0.5" />
                <rect x="14" y="7" width="3" height="3" fill="currentColor" stroke="none" rx="0.5" />
                <rect x="7" y="14" width="3" height="3" fill="currentColor" stroke="none" rx="0.5" />
                <path d="M14 14h1v1h-1z" fill="currentColor" />
                <path d="M16 16h1v1h-1z" fill="currentColor" />
                <path d="M14 17h3" strokeWidth="1.8" />
              </svg>
            </span>
            <span className="mobile-bottom-qr-label">{t('scanQrBtnLabel') || 'Scan QR'}</span>
          </button>
        </div>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <span className="mobile-nav-indicator" />
          <UtensilsCrossed size={20} />
          <span>{SPOT_FEED_NAME}</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${isMobileOpen ? 'active' : ''}`}
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open More Menu"
        >
          <span className="mobile-nav-indicator" />
          <LayoutGrid size={20} />
          <span>More</span>
        </button>
      </nav>

      <style>{`
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--bg-sidebar);
          color: var(--sidebar-text);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem 1.25rem;
          flex-shrink: 0;
          z-index: 100;
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          box-sizing: border-box;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(var(--sidebar-overlay-rgb), 0.2) transparent;
        }

        .sidebar::-webkit-scrollbar {
          width: 5px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(var(--sidebar-overlay-rgb), 0.2);
          border-radius: 4px;
        }

        .sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--sidebar-overlay-rgb), 0.35);
        }

        .sidebar-content-top {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-content-footer {
          padding-top: 1.25rem;
          border-top: 1px solid rgba(var(--sidebar-overlay-rgb), 0.12);
          margin-top: auto;
          flex-shrink: 0;
        }

        .sidebar-brand-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 0.25rem;
          padding-bottom: 1.25rem;
          margin-bottom: 0.25rem;
        }

        .sidebar-logo-btn {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          text-align: left;
          border-radius: 8px;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .sidebar-logo-btn:hover {
          transform: scale(1.02);
          opacity: 0.95;
        }

        .sidebar-logo-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 4px;
        }

        .sidebar-logo-img {
          width: 160px;
          max-width: 175px;
          height: auto;
          max-height: 65px;
          object-fit: contain;
          display: block;
        }

        .sidebar-tagline {
          font-size: 0.74rem;
          color: var(--sidebar-text-muted);
          font-weight: 500;
          margin-top: 0.5rem;
          letter-spacing: 0.01em;
          display: block;
        }

        .sidebar-add-btn {
          width: 100%;
          min-height: 44px;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: var(--text-on-primary, #FFFFFF);
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 14px rgba(var(--shadow-rgb), 0.25);
          font-weight: 600;
        }

        .sidebar-nav-item.highlight-nav {
          border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
          background: color-mix(in srgb, var(--primary) 8%, transparent);
          color: var(--text-main);
        }

        .mobile-bottom-nav {
          display: none;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          width: 100%;
          min-height: 44px;
          padding: 0.65rem 1rem;
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          color: var(--sidebar-text-muted);
          font-weight: 500;
          font-size: 0.92rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        .sidebar-nav-item:hover {
          background: rgba(var(--sidebar-overlay-rgb), 0.08);
          color: var(--sidebar-text);
        }

        .sidebar-nav-item.active {
          background: var(--bg-sidebar-active);
          color: var(--sidebar-active-text);
          font-weight: 600;
        }

        .sidebar-logout-btn {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.6rem;
          background: var(--expense-bg);
          color: var(--expense);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .sidebar-install-btn {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.6rem;
          background: var(--primary-light);
          color: var(--accent-fg);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sidebar-install-btn:hover {
          background: var(--primary-badge);
          color: var(--accent-fg);
        }

        .sidebar-logout-btn:hover {
          filter: brightness(0.95);
        }

        .mobile-close-btn {
          display: none;
          background: rgba(var(--sidebar-overlay-rgb), 0.1);
          border: none;
          color: var(--sidebar-text);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast);
        }

        .mobile-close-btn:hover {
          background: rgba(var(--sidebar-overlay-rgb), 0.2);
        }

        .sidebar-mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: var(--scrim, rgba(10, 5, 15, 0.68));
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 998;
          animation: fadeIn var(--anim-duration-drawer, 320ms) var(--anim-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
        }

        @media (max-width: 900px) {
          .sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh;
            height: 100dvh;
            max-height: 100vh;
            max-height: 100dvh;
            width: 280px;
            max-width: 85vw;
            padding-top: max(1.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem));
            padding-bottom: max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem));
            padding-left: max(1.25rem, calc(env(safe-area-inset-left, 0px) + 0.5rem));
            transform: translateX(-100%);
            box-shadow: none;
            transition: transform var(--anim-duration-drawer, 320ms) var(--anim-ease-out, cubic-bezier(0.16, 1, 0.3, 1)), box-shadow var(--anim-duration-drawer, 320ms) ease;
            z-index: 999;
            align-self: auto;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .sidebar.mobile-open {
            transform: translateX(0);
            box-shadow: 10px 0 32px rgba(0, 0, 0, 0.65);
          }

          .mobile-close-btn {
            display: flex !important;
          }

          .sidebar-logo-img {
            width: 115px;
            max-width: 125px;
          }

          .mobile-bottom-nav {
            display: grid;
            grid-template-columns: 1fr 1fr 1.25fr 1fr 1fr;
            align-items: center;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: calc(64px + env(safe-area-inset-bottom, 0px));
            padding-bottom: env(safe-area-inset-bottom, 0px);
            background: var(--bg-sidebar);
            border-top: 1px solid rgba(var(--sidebar-overlay-rgb), 0.16);
            box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.4);
            z-index: 950;
          }

          .mobile-bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            height: 100%;
            min-height: 44px;
            background: transparent;
            border: none;
            color: var(--sidebar-text-muted);
            font-size: 0.68rem;
            font-weight: 600;
            cursor: pointer;
            padding: 0.25rem;
            position: relative;
            transition: color 0.15s ease;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-bottom-nav-item.active {
            color: var(--primary);
            font-weight: 700;
          }

          .mobile-nav-indicator {
            display: none;
            position: absolute;
            top: 0;
            left: 20%;
            right: 20%;
            height: 3px;
            border-radius: 0 0 4px 4px;
            background: var(--primary);
          }

          .mobile-bottom-nav-item.active .mobile-nav-indicator {
            display: block;
          }

          .mobile-bottom-qr-slot {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            height: 100%;
          }

          /* CIMB OCTO-style curved cutout ring around the raised circular button */
          .mobile-bottom-qr-cutout {
            position: absolute;
            top: -26px;
            width: 78px;
            height: 78px;
            border-radius: 50%;
            background: var(--bg-sidebar);
            border: 4px solid var(--bg-app);
            box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.2);
            pointer-events: none;
            z-index: 951;
          }

          .mobile-bottom-qr-btn {
            position: absolute;
            top: -28px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.2rem;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            z-index: 952;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-bottom-qr-circle {
            width: 64px;
            height: 64px;
            min-width: 64px;
            min-height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            color: var(--text-on-primary, #FFFFFF);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid var(--bg-sidebar);
            box-shadow: 0 8px 24px rgba(var(--shadow-rgb), 0.45);
            transition: transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.16s ease;
          }

          .mobile-bottom-qr-btn:active .mobile-bottom-qr-circle {
            transform: scale(0.92);
            box-shadow: 0 4px 12px rgba(var(--shadow-rgb), 0.3);
          }

          .mobile-bottom-qr-label {
            font-size: 0.68rem;
            font-weight: 800;
            color: var(--sidebar-text);
            white-space: nowrap;
            letter-spacing: 0.01em;
          }
        }
      `}</style>
    </>
  );
}
