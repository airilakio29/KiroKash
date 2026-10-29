import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Calendar, ShieldCheck, FileText, LogOut, ChevronDown, User, Palette, Sparkles, Globe } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import { PRESET_THEMES, loadSavedTheme, saveTheme } from '../utils/themeEngine';
import UserAvatar from './UserAvatar';
import NotificationBell from './social/NotificationBell';

export default function Header({ onOpenMobileMenu, onOpenProfileModal, onNavigateTab, title = "Dashboard" }) {
  const { user, logout } = useAuth();
  const { exportToPDF } = useFinance();
  const {
    publicProfile,
    setSelectedPublicProfileId,
    pitchModeLoaded,
    switchPitchDemoAccount
  } = useSocialWallet();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme-preset') || loadSavedTheme()?.presetId || 'kiro';
    }
    return 'kiro';
  });

  const dropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.presetId) {
        setCurrentThemeId(e.detail.presetId);
      }
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleSelectTheme = (presetId) => {
    saveTheme({ presetId, customColors: null });
    setCurrentThemeId(presetId);
    setIsThemeOpen(false);
  };

  const currentTheme = PRESET_THEMES.find(t => t.id === currentThemeId) || PRESET_THEMES[0];

  // Derive a clean display name — never show UID or technical identifiers
  const displayName = (() => {
    const name = publicProfile?.displayName || user?.username;
    if (!name) return 'Student';
    if (/^[a-f0-9]{20,}$/i.test(name.replace(/[\s-]/g, ''))) return 'Student';
    return name;
  })();

  const handleStr = publicProfile?.handle || user?.handle;

  const todayStr = new Date().toLocaleDateString('en-MY', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setIsThemeOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsThemeOpen(false);
      }
    };

    if (isProfileOpen || isThemeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen, isThemeOpen]);

  const handleExportPDF = () => {
    setIsProfileOpen(false);
    exportToPDF(user);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  return (
    <header className="app-header">
      {/* Left: Hamburger + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          onClick={onOpenMobileMenu}
          className="btn btn-secondary btn-icon header-mobile-menu"
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h2 className="header-page-title">
            {title}
          </h2>
          <div className="header-subtitle" data-tour="header-greeting">
            <span>
              Welcome back, <strong>{displayName}</strong>
              {handleStr ? <span style={{ opacity: 0.8 }}> (@{handleStr})</span> : ''} 👋
            </span>
            {(publicProfile?.bio || user?.bio) && (
              <span className="header-bio-pill" title={publicProfile?.bio || user?.bio}>
                · &ldquo;{publicProfile?.bio || user?.bio}&rdquo;
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Desktop: Action Bar */}
      <div className="header-desktop-actions">
        {/* Pitch Mode Live Account Switcher Pill */}
        {(pitchModeLoaded || user?.isPitchDemo) && (
          <div className="header-pitch-switcher" title="Pitch Mode Quick Account Switcher">
            <Sparkles size={13} />
            <button
              type="button"
              className={`header-pitch-btn ${user?.id === 'demo_user_aiman' ? 'active' : ''}`}
              onClick={() => switchPitchDemoAccount('demo_user_aiman')}
            >
              @aiman_utp
            </button>
            <button
              type="button"
              className={`header-pitch-btn ${user?.id === 'demo_user_sarah' ? 'active' : ''}`}
              onClick={() => switchPitchDemoAccount('demo_user_sarah')}
            >
              @sarah_um
            </button>
          </div>
        )}

        {/* Date Display Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: 'var(--bg-card-subtle)',
          padding: '0.45rem 0.85rem',
          borderRadius: '20px',
          border: '1px solid var(--border-light)',
          fontSize: '0.82rem',
          color: 'var(--text-main)',
          fontWeight: 500,
          whiteSpace: 'nowrap'
        }}>
          <Calendar size={14} color="var(--text-main)" />
          <span>{todayStr}</span>
        </div>

        {/* Notifications Bell */}
        <NotificationBell onNavigateTab={onNavigateTab} />

        {/* Navbar Theme Selector */}
        <div style={{ position: 'relative' }} ref={themeDropdownRef}>
          <button
            onClick={() => setIsThemeOpen(prev => !prev)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.75rem' }}
            title="Switch Theme"
            aria-label="Theme Selector"
            aria-expanded={isThemeOpen}
          >
            <span>{currentTheme?.icon || '⚡'}</span>
            <span style={{ fontWeight: 600 }}>{currentTheme?.name || 'Theme'}</span>
            <ChevronDown size={14} style={{ transform: isThemeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {isThemeOpen && (
            <div
              className="navbar-theme-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                background: 'var(--surface-solid, var(--bg-card))',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-modal)',
                padding: '0.4rem',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                animation: 'slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preset Themes
              </div>
              {PRESET_THEMES.map(t => {
                const isSelected = currentThemeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      color: isSelected ? 'var(--accent-fg)' : 'var(--text-main)',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                    </span>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: t.tokens['--primary'],
                        boxShadow: isSelected ? `0 0 6px ${t.tokens['--primary']}` : 'none',
                        border: '1px solid var(--border-light)'
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Public Social Profile Button */}
        {user?.id && (
          <button
            type="button"
            onClick={() => setSelectedPublicProfileId(user.id)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.7rem' }}
            title="View Your Public Social Profile & Saved Spots"
          >
            <Globe size={14} />
            <span>Public Profile</span>
          </button>
        )}

        {/* Profile Pill Button */}
        {onOpenProfileModal && (
          <button
            data-tour="profile-btn"
            onClick={onOpenProfileModal}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem' }}
            title="Edit Profile & Avatar"
            aria-label="Edit Profile"
          >
            <UserAvatar avatar={publicProfile?.avatarId || user?.avatar} name={displayName} size={24} showBorder={false} />
            <span style={{ fontWeight: 600 }}>Profile</span>
          </button>
        )}

        {/* Quick PDF Export */}
        <button
          data-tour="export-pdf-btn"
          onClick={handleExportPDF}
          className="btn btn-secondary btn-sm"
          title="Export PDF Report"
          aria-label="Export PDF"
        >
          <FileText size={15} />
          <span>Export PDF</span>
        </button>

        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Log Out"
          aria-label="Log Out"
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </button>
      </div>

      {/* Right Mobile: Notifications + Avatar / Profile Dropdown Trigger */}
      <div className="header-mobile-actions" ref={dropdownRef}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <NotificationBell onNavigateTab={onNavigateTab} />
          <button
            data-tour="profile-btn"
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="mobile-profile-trigger"
            aria-expanded={isProfileOpen}
            aria-label="User profile and quick actions menu"
          >
            <UserAvatar avatar={publicProfile?.avatarId || user?.avatar} name={displayName} size={32} showBorder={false} />
            <ChevronDown
              size={16}
              style={{
                transition: 'transform var(--transition-fast)',
                transform: isProfileOpen ? 'rotate(180deg)' : 'none'
              }}
            />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isProfileOpen && (
          <div className="mobile-profile-dropdown">
            {/* User Details */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <UserAvatar avatar={publicProfile?.avatarId || user?.avatar} name={displayName} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName} {handleStr ? `(@${handleStr})` : ''}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {publicProfile?.bio || user?.bio || user?.university || 'Student'}
                </div>
              </div>
              <span className="badge badge-income" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                <ShieldCheck size={11} /> Active
              </span>
            </div>

            {/* Pitch Mode Account Switcher inside Mobile Dropdown */}
            {(pitchModeLoaded || user?.isPitchDemo) && (
              <div style={{
                padding: '0.6rem 0.85rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                gap: '0.4rem'
              }}>
                <button
                  type="button"
                  className={`header-pitch-btn ${user?.id === 'demo_user_aiman' ? 'active' : ''}`}
                  onClick={() => {
                    switchPitchDemoAccount('demo_user_aiman');
                    setIsProfileOpen(false);
                  }}
                >
                  @aiman_utp
                </button>
                <button
                  type="button"
                  className={`header-pitch-btn ${user?.id === 'demo_user_sarah' ? 'active' : ''}`}
                  onClick={() => {
                    switchPitchDemoAccount('demo_user_sarah');
                    setIsProfileOpen(false);
                  }}
                >
                  @sarah_um
                </button>
              </div>
            )}

            {/* Date Pill inside Dropdown */}
            <div style={{
              padding: '0.65rem 1rem',
              background: 'var(--bg-card-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <Calendar size={13} />
              <span>{todayStr}</span>
            </div>

            {/* Theme Quick Selector for Mobile */}
            <div style={{
              padding: '0.6rem 0.85rem',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Palette size={13} /> Theme Preset
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {PRESET_THEMES.slice(0, 5).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    style={{
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.75rem',
                      borderRadius: '12px',
                      border: currentThemeId === t.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      background: currentThemeId === t.id ? 'var(--primary)' : 'transparent',
                      color: currentThemeId === t.id ? '#FFFFFF' : 'var(--text-main)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions List */}
            <div style={{ padding: '0.5rem' }}>
              {user?.id && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setSelectedPublicProfileId(user.id);
                  }}
                  className="dropdown-action-btn"
                >
                  <Globe size={17} color="var(--primary-light)" />
                  <span>Public Profile &amp; Saved Spots</span>
                </button>
              )}

              {onOpenProfileModal && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onOpenProfileModal();
                  }}
                  className="dropdown-action-btn"
                  aria-label="Edit Profile & Avatar"
                >
                  <User size={17} color="var(--primary-light)" />
                  <span>Edit Profile &amp; Avatar</span>
                </button>
              )}

              <button
                onClick={handleExportPDF}
                className="dropdown-action-btn"
                aria-label="Export PDF"
              >
                <FileText size={17} color="var(--primary-light)" />
                <span>Export PDF Report</span>
              </button>

              <button
                onClick={handleLogout}
                className="dropdown-action-btn dropdown-action-danger"
                aria-label="Log Out"
              >
                <LogOut size={17} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.15rem 2rem;
          padding-top: max(1.15rem, calc(env(safe-area-inset-top, 0px) + 0.65rem));
          padding-left: max(2rem, env(safe-area-inset-left, 0px));
          padding-right: max(2rem, env(safe-area-inset-right, 0px));
          background: color-mix(in srgb, var(--bg-app) 92%, transparent);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid color-mix(in srgb, var(--border-light) 100%, transparent);
          position: sticky;
          top: 0;
          z-index: 90;
          width: 100%;
          box-sizing: border-box;
        }

        .header-page-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.15rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-desktop-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-shrink: 0;
        }

        .header-pitch-switcher {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-light);
          color: var(--text-main);
          font-size: 0.74rem;
        }

        .header-pitch-btn {
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.74rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .header-pitch-btn.active {
          background: var(--primary);
          color: #FFFFFF;
        }

        .header-mobile-actions {
          display: none;
          position: relative;
        }

        .header-mobile-menu {
          display: none;
        }

        .mobile-profile-trigger {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-light);
          padding: 0.35rem 0.65rem;
          border-radius: 24px;
          color: var(--text-main);
          cursor: pointer;
          min-height: 44px;
          transition: background var(--transition-fast);
        }

        .mobile-profile-trigger:hover,
        .mobile-profile-trigger:focus-visible {
          background: color-mix(in srgb, var(--text-main) 12%, transparent);
        }

        .mobile-profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .mobile-profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 260px;
          background: var(--bg-sidebar);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-lg);
          box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          z-index: 1000;
          animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dropdown-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          border: none;
          background: transparent;
          color: var(--text-main);
          font-family: var(--font-sans);
          font-size: 0.88rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          min-height: 44px;
          transition: background var(--transition-fast);
          text-align: left;
        }

        .dropdown-action-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .dropdown-action-danger {
          color: #FCA5A5;
        }

        .dropdown-action-danger:hover {
          background: rgba(231, 76, 60, 0.2);
        }

        @media (max-width: 900px) {
          .header-mobile-menu {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 0.85rem 1rem;
            padding-top: max(0.95rem, calc(env(safe-area-inset-top, 0px) + 0.55rem));
            padding-left: max(1rem, env(safe-area-inset-left, 0px));
            padding-right: max(1rem, env(safe-area-inset-right, 0px));
          }
          .header-page-title {
            font-size: 1.15rem;
          }
          .header-subtitle {
            font-size: 0.75rem;
          }
          .header-desktop-actions {
            display: none;
          }
          .header-mobile-actions {
            display: block;
          }
        }

        @media (max-width: 480px) {
          .app-header {
            padding: 0.65rem 0.75rem;
            padding-top: max(0.85rem, calc(env(safe-area-inset-top, 0px) + 0.5rem));
            padding-left: max(0.75rem, env(safe-area-inset-left, 0px));
            padding-right: max(0.75rem, env(safe-area-inset-right, 0px));
          }
          .header-page-title {
            font-size: 1.05rem;
          }
          .header-subtitle {
            font-size: 0.72rem;
          }
        }
      `}</style>
    </header>
  );
}
