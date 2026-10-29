import React, { useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import ConfirmModal from '../components/ConfirmModal';
import { PRESET_THEMES, loadSavedTheme, saveTheme } from '../utils/themeEngine';
import { PITCH_MODE_ENABLED } from '../config/appConstants';
import {
  PlusCircle,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Palette,
  Sparkles,
  Check,
  BookOpen,
  User,
  ShieldCheck,
  Globe,
  Users,
  Database,
  RefreshCw,
  AtSign
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

const getHexFromToken = (tokenValue) => {
  if (!tokenValue) return '#000000';
  if (tokenValue.startsWith('#')) return tokenValue.slice(0, 7);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = tokenValue;
  return ctx.fillStyle;
};

const getPresetColors = (presetId) => {
  const preset = PRESET_THEMES.find(t => t.id === presetId) || PRESET_THEMES[0];
  return {
    primary: getHexFromToken(preset.tokens['--primary']),
    bgApp: getHexFromToken(preset.tokens['--bg-app']),
    bgCard: getHexFromToken(preset.tokens['--bg-card']),
    income: getHexFromToken(preset.tokens['--income']),
    expense: getHexFromToken(preset.tokens['--expense']),
    textMain: getHexFromToken(preset.tokens['--text-main'])
  };
};

export default function SettingsView({ onOpenAddCategory, onReplayTutorial, onOpenProfileModal }) {
  const {
    categories,
    deleteCategory,
    exportJSONBackup,
    importJSONBackup,
    resetTutorial: resetFinanceTutorial
  } = useFinance();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const {
    publicProfile,
    updateSocialProfile,
    wallet,
    toggleAutoSyncTracker,
    setSelectedPublicProfileId,
    pitchModeLoaded,
    loadPitchDemoData,
    resetPitchDemoData,
    switchPitchDemoAccount,
    pitchDemoUsers
  } = useSocialWallet();

  const fileInputRef = useRef(null);
  const [msg, setMsg] = useState({ text: '', isError: false });
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const [activeThemeConfig, setActiveThemeConfig] = useState(() => loadSavedTheme());
  const [, setUseCustomColors] = useState(() => Boolean(activeThemeConfig.customColors));
  const [customColors, setCustomColors] = useState(() => activeThemeConfig.customColors || getPresetColors(activeThemeConfig.presetId));

  // Inline Social Handle / Bio quick editor state
  const [editHandle, setEditHandle] = useState(() => publicProfile?.handle || user?.handle || 'student');
  const [editDisplayName, setEditDisplayName] = useState(() => publicProfile?.displayName || user?.username || 'Student');
  const [editBio, setEditBio] = useState(() => publicProfile?.bio || user?.bio || '');

  // Derive a clean display name
  const displayName = (() => {
    const name = publicProfile?.displayName || user?.username;
    if (!name) return 'Student';
    if (/^[a-f0-9]{20,}$/i.test(name.replace(/[\s-]/g, ''))) return 'Student';
    return name;
  })();

  const handleSelectPreset = (presetId) => {
    const newConfig = { presetId, customColors: null };
    setActiveThemeConfig(newConfig);
    saveTheme(newConfig);
    setUseCustomColors(false);
    setCustomColors(getPresetColors(presetId));
    setMsg({ text: `Theme updated to "${PRESET_THEMES.find(t => t.id === presetId)?.name}"!`, isError: false });
  };

  const handleCustomColorChange = (key, hexValue) => {
    const updatedCustom = { ...customColors, [key]: hexValue };
    setCustomColors(updatedCustom);
    setUseCustomColors(true);
    const newConfig = { presetId: activeThemeConfig.presetId, customColors: updatedCustom };
    setActiveThemeConfig(newConfig);
    saveTheme(newConfig);
  };

  const handleResetTheme = () => {
    setUseCustomColors(false);
    const defaultConfig = { presetId: 'light', customColors: null };
    setActiveThemeConfig(defaultConfig);
    saveTheme(defaultConfig);
    setCustomColors(getPresetColors('light'));
    setMsg({ text: 'Theme reset to default (Fintech Light).', isError: false });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const success = importJSONBackup(json);
        if (success) {
          setMsg({ text: 'Backup data restored successfully!', isError: false });
        } else {
          setMsg({ text: 'Invalid backup file format.', isError: true });
        }
      } catch {
        setMsg({ text: 'Failed to read JSON backup file.', isError: true });
      }
    };
    reader.readAsText(file);
  };

  const handleSaveQuickSocialProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateSocialProfile({
        displayName: editDisplayName,
        handle: editHandle,
        bio: editBio
      });
      setEditHandle(updated.handle);
      setEditDisplayName(updated.displayName);
      setEditBio(updated.bio);
      setMsg({ text: `Social profile @${updated.handle} saved!`, isError: false });
      showSuccess(`Updated social profile @${updated.handle}`);
    } catch (err) {
      setMsg({ text: err?.message || 'Could not update social profile.', isError: true });
      showError(err?.message || 'Could not update social profile.');
    }
  };

  const handleLoadPitchData = () => {
    const res = loadPitchDemoData();
    setMsg({
      text: `Pitch Mode seeded: ${res.usersCount} fictional student accounts, ${res.spotsCount} Spot Jimat posts across all 6 categories, follows, and demo wallet transfers!`,
      isError: false
    });
    showSuccess('Pitch Mode demo data loaded!');
  };

  const handleResetPitchData = () => {
    resetPitchDemoData();
    setMsg({
      text: 'Pitch Mode demo data has been cleanly removed.',
      isError: false
    });
    showSuccess('Pitch Mode demo data reset.');
  };

  return (
    <div className="view-fade-in">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Settings &amp; Customization
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Logged in as <strong>{displayName}</strong> (@{publicProfile?.handle || user?.handle || 'student'} · {user?.email || 'Local User'}).
          Customize your public social profile, privacy settings, theme appearance, or Pitch Mode demo tools.
        </p>
      </div>

      {msg.text && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: msg.isError ? 'var(--expense-bg)' : 'var(--income-bg)',
          color: msg.isError ? 'var(--expense)' : 'var(--income)',
          fontWeight: 600,
          fontSize: '0.88rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {msg.isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {msg.text}
        </div>
      )}

      {/* PART 4: Pitch Mode Section (Development / Pitch Recording Tools) */}
      {PITCH_MODE_ENABLED && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1.5px solid var(--primary)' }}>
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--primary)" /> Pitch Mode (Developer &amp; Live Recording Tools)
            </span>
            <span className="badge badge-income" style={{ fontSize: '0.72rem' }}>
              {pitchModeLoaded ? 'Demo Data Active' : 'Ready to Seed'}
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Seed 8 clearly fictional Malaysian student profiles, 28 varied <strong>Spot Jimat</strong> posts across all 6 categories,
            social follows, comments, likes, and demo wallet transactions. Use the <strong>Quick Account Switcher</strong> below
            to demonstrate a live transfer from <code>@aiman_utp</code> to <code>@sarah_um</code> in a single recording.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLoadPitchData}
            >
              <Database size={16} />
              <span>Load demo data (8 Users &amp; 28 Spots)</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetPitchData}
            >
              <RefreshCw size={16} />
              <span>Reset demo data</span>
            </button>
          </div>

          {/* Quick Account Switcher between Two Primary Demo Accounts + All 8 Fictional Students */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={16} color="var(--primary)" /> Quick Account Switcher (Single-Recording Live Transfer Demo)
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${user?.id === 'demo_user_aiman' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  const switched = switchPitchDemoAccount('demo_user_aiman');
                  setEditHandle(switched.handle);
                  setEditDisplayName(switched.displayName);
                  setEditBio(switched.bio);
                  showSuccess('Switched to Account A: Aiman Hakim (@aiman_utp)');
                }}
              >
                Account A: Aiman Hakim (@aiman_utp) — PIN: 1234
              </button>

              <button
                type="button"
                className={`btn btn-sm ${user?.id === 'demo_user_sarah' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  const switched = switchPitchDemoAccount('demo_user_sarah');
                  setEditHandle(switched.handle);
                  setEditDisplayName(switched.displayName);
                  setEditBio(switched.bio);
                  showSuccess('Switched to Account B: Sarah Lim (@sarah_um)');
                }}
              >
                Account B: Sarah Lim (@sarah_um) — PIN: 1234
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <span>Other seeded campus students:</span>
              {pitchDemoUsers.slice(2).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    const switched = switchPitchDemoAccount(u.id);
                    setEditHandle(switched.handle);
                    setEditDisplayName(switched.displayName);
                    setEditBio(switched.bio);
                    showSuccess(`Switched to @${u.handle}`);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '999px',
                    border: user?.id === u.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                    background: user?.id === u.id ? 'var(--primary)' : 'transparent',
                    color: user?.id === u.id ? '#FFFFFF' : 'var(--text-main)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  @{u.handle}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PART 2: Student Social Profile & Financial Privacy Section */}
      <div className="card" data-tour="settings-profile-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title" style={{ marginBottom: '1.25rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--primary)" /> Social Profile, Avatar &amp; Privacy Settings
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {user?.id && (
              <button
                type="button"
                onClick={() => setSelectedPublicProfileId(user.id)}
                className="btn btn-secondary btn-sm"
              >
                <Globe size={14} /> View Public Profile
              </button>
            )}
            {onOpenProfileModal && (
              <button data-tour="settings-edit-profile-btn" onClick={onOpenProfileModal} className="btn btn-primary btn-sm">
                Edit Avatar &amp; Full Profile
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          padding: '1.25rem',
          background: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          marginBottom: '1rem'
        }}>
          <UserAvatar avatar={publicProfile?.avatarId || user?.avatar} name={displayName} size={64} />

          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h4 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {displayName}
              </h4>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                @{publicProfile?.handle || user?.handle || 'student'}
              </span>
              <span className="badge badge-income" style={{ fontSize: '0.72rem' }}>
                {user?.currency || 'RM'} Student Account
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.5rem' }}>
              {(publicProfile?.bio || user?.bio) ? `"${publicProfile?.bio || user?.bio}"` : 'No campus bio set yet.'}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-light)' }}>
              <span>🏫 <strong>Campus:</strong> {publicProfile?.university || user?.university || 'Campus Student'}</span>
              <span>👥 <strong>Followers:</strong> {publicProfile?.followerCount || 0}</span>
              <span>🧭 <strong>Following:</strong> {publicProfile?.followingCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Social Handle & Bio Editor */}
        <form onSubmit={handleSaveQuickSocialProfile} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
          marginBottom: '1rem'
        }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Display Name</label>
            <input
              type="text"
              className="form-control"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>
              <AtSign size={12} style={{ verticalAlign: 'middle' }} /> Unique @username
            </label>
            <input
              type="text"
              className="form-control"
              value={editHandle}
              onChange={(e) => setEditHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={24}
              required
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Public Bio</label>
            <input
              type="text"
              className="form-control"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              maxLength={140}
              placeholder="Campus spot hunter..."
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '40px' }}>
            <Check size={15} /> Save Social Profile
          </button>
        </form>

        {/* Explicit Privacy Guarantee Statement */}
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Financial Privacy Guarantee
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Your financial data — including <strong>balances, budgets, tracker transactions, savings goals, and wallet history</strong> — is
                strictly private and <strong>never appears on your public profile</strong>. Other students can only see your public avatar,
                display name, @username, bio, follower counts, and the Spot Jimat posts you share.
              </p>
            </div>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.83rem',
            color: 'var(--text-main)',
            cursor: 'pointer',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-light)'
          }}>
            <input
              type="checkbox"
              checked={Boolean(wallet?.autoSyncTracker ?? true)}
              onChange={(e) => toggleAutoSyncTracker(e.target.checked)}
            />
            <span>
              <strong>Auto-sync KampusKash transfers to Finance Tracker</strong> (automatically logs completed transfers under the <em>&ldquo;Transfer&rdquo;</em> category)
            </span>
          </label>
        </div>
      </div>

      {/* Theme & Appearance Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={18} color="var(--primary)" /> Appearance &amp; Theme Customization
          </span>
          <button onClick={handleResetTheme} className="btn btn-secondary btn-sm">
            <RotateCcw size={14} /> Reset Theme
          </button>
        </div>

        {/* Preset Theme Cards Grid */}
        <div data-tour="theme-selector" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.5rem'
        }}>
          {PRESET_THEMES.map(preset => {
            const isSelected = activeThemeConfig.presetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectPreset(preset.id); }}
                aria-label={`Select ${preset.name} theme`}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card-subtle)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{preset.icon}</span> {preset.name}
                  </span>
                  {isSelected && (
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={12} />
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, minHeight: '32px' }}>
                  {preset.description}
                </p>

                {/* Real Tinted Layout Preview */}
                <div style={{
                  height: '46px',
                  borderRadius: 'var(--radius-sm)',
                  background: preset.tokens['--bg-app-gradient'] || preset.tokens['--bg-app'],
                  border: '1px solid ' + (preset.tokens['--border-light'] || 'rgba(0,0,0,0.1)'),
                  padding: '4px',
                  display: 'flex',
                  gap: '5px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '18px',
                    height: '100%',
                    borderRadius: '3px',
                    background: preset.tokens['--bg-sidebar'],
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: '3px',
                    gap: '2px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: preset.tokens['--primary'] }} />
                    <span style={{ width: '8px', height: '2px', borderRadius: '1px', background: preset.tokens['--sidebar-text-muted'] || '#999' }} />
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      background: preset.tokens['--bg-card'],
                      borderRadius: '3px',
                      padding: '3px 5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: preset.tokens['--text-main']
                      }}>
                        {preset.isDark ? 'Dark' : 'Tinted'}
                      </span>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: preset.tokens['--income'] }} />
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: preset.tokens['--expense'] }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Theme Color Adjuster */}
        <div style={{
          background: 'var(--bg-card-subtle)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--primary)" /> Fine-Tune Custom Accent Colors
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { key: 'primary', label: 'Primary Accent' },
              { key: 'bgApp', label: 'Background Tone' },
              { key: 'bgCard', label: 'Card Tone' },
              { key: 'income', label: 'Income Accent' },
              { key: 'expense', label: 'Expense Accent' }
            ].map(item => (
              <div key={item.key}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  {item.label}
                </label>
                <input
                  type="color"
                  value={customColors[item.key]}
                  onChange={e => handleCustomColorChange(item.key, e.target.value)}
                  style={{ width: '100%', height: '34px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  aria-label={item.label}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Category Management */}
        <div className="card" data-tour="category-manager">
          <div className="card-title">
            <span>Category Manager</span>
            <button onClick={onOpenAddCategory} className="btn btn-primary btn-sm">
              <PlusCircle size={14} /> Add Category
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '350px', overflowY: 'auto' }}>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: cat.color,
                    flexShrink: 0
                  }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cat.name}</span>
                  <span className={`badge ${cat.type === 'income' ? 'badge-income' : 'badge-expense'}`} style={{ fontSize: '0.7rem' }}>
                    {cat.type}
                  </span>
                </div>

                <button
                  onClick={() => setCategoryToDelete(cat)}
                  className="btn btn-danger btn-icon"
                  style={{ width: '28px', height: '28px' }}
                  title="Delete category"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data Backup & Restore */}
        <div className="card" data-tour="backup-manager">
          <div className="card-title">
            <span>Data Backup &amp; Management</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Export your full financial dataset as a JSON file or restore from a previous backup.
            </p>

            <button onClick={exportJSONBackup} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              <Download size={16} /> Export JSON Data Backup
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              <Upload size={16} /> Import / Restore JSON Backup
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />

            <button
              data-tour="replay-tutorial-btn"
              onClick={() => {
                if (resetFinanceTutorial) resetFinanceTutorial();
                if (onReplayTutorial) onReplayTutorial();
                showSuccess('Onboarding guide & feature tour restarted!');
              }}
              className="btn btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              <BookOpen size={16} /> Replay Tutorial &amp; Onboarding
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Category Modal */}
      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Existing transactions categorized under this will retain their record.`}
        confirmLabel="Delete Category"
        isDanger={true}
        onConfirm={() => {
          if (categoryToDelete) {
            deleteCategory(categoryToDelete.id);
            showSuccess(`Category "${categoryToDelete.name}" deleted.`);
            setCategoryToDelete(null);
          }
        }}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
