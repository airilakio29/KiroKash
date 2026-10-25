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
  Download
} from 'lucide-react';
import KampusKashLogo from './KampusKashLogo';
import UserAvatar from './UserAvatar';
import { triggerInstallPrompt } from './PWAInstallPrompt';
import { isPWAInstalled } from '../registerServiceWorker';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenAddTransaction,
  onOpenProfileModal,
  isMobileOpen,
  setIsMobileOpen
}) {
  const { user, logout } = useAuth();

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
    { id: 'ai-chat', label: 'KampusKash AI', icon: Sparkles, badge: 'AI' },
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
    // Reject anything that looks like a UID/hash (32+ hex chars)
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
                <KampusKashLogo size={32} textColor="#FFFFFF" showWordmark={true} />
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
                    setActiveTab(item.id);
                    if (isMobileOpen) setIsMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  aria-label={item.label}
                >
                  <Icon size={20} color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-badge, #A855F7) 100%)',
                        color: '#FFFFFF',
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
          borderTop: '1px solid rgba(255,255,255,0.12)',
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
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-md)',
              cursor: onOpenProfileModal ? 'pointer' : 'default',
              transition: 'background var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
              <UserAvatar avatar={user?.avatar} name={displayName} size={36} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.bio || user?.university || 'Student'}
                </div>
              </div>
            </div>
            {onOpenProfileModal && (
              <span style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', marginLeft: '0.35rem' }}>
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

      <style>{`
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--bg-sidebar);
          color: #FFFFFF;
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
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .sidebar::-webkit-scrollbar {
          width: 5px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }

        .sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        .sidebar-content-top {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-content-footer {
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
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
          outline: 2px solid var(--primary, #8b5cf6);
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
          color: rgba(255, 255, 255, 0.65);
          font-weight: 500;
          margin-top: 0.5rem;
          letter-spacing: 0.01em;
          display: block;
        }

        .sidebar-add-btn {
          width: 100%;
          min-height: 44px;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: #FFFFFF;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          font-weight: 600;
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
          color: rgba(255, 255, 255, 0.6);
          font-weight: 500;
          font-size: 0.92rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        .sidebar-nav-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }

        .sidebar-nav-item.active {
          background: var(--bg-sidebar-active);
          color: #FFFFFF;
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
          background: rgba(231, 76, 60, 0.15);
          color: #FCA5A5;
          border: 1px solid rgba(231, 76, 60, 0.25);
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
          background: rgba(139, 92, 246, 0.18);
          color: #DDD6FE;
          border: 1px solid rgba(139, 92, 246, 0.35);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sidebar-install-btn:hover {
          background: rgba(139, 92, 246, 0.32);
          color: #FFFFFF;
        }

        .sidebar-logout-btn:hover {
          background: rgba(231, 76, 60, 0.25);
        }

        .mobile-close-btn {
          display: none;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #FFF;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast);
        }

        .mobile-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .sidebar-mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 5, 15, 0.68);
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
        }
      `}</style>
    </>
  );
}
