import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import {
  X,
  Camera,
  Check,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Upload,
  RotateCcw,
  AtSign,
  ShieldCheck
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import {
  PRESET_AVATARS,
  SUPPORTED_CURRENCIES,
  validateAvatarFile,
  fileToDataUrl,
  saveFullUserProfile
} from '../services/profileService';
import { normalizeHandle } from '../utils/safetyUtils';

export default function ProfileModal({ isOpen, onClose }) {
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <ProfileModalContent
      key={user?.id || 'profile-modal'}
      user={user}
      onClose={onClose}
    />
  );
}

function ProfileModalContent({ user, onClose }) {
  const { updateUserProfile } = useAuth();
  const { publicProfile, updateSocialProfile } = useSocialWallet();
  const fileInputRef = useRef(null);

  // Form State initialized directly from user / publicProfile prop
  const [username, setUsername] = useState(() => publicProfile?.displayName || user?.username || '');
  const [handle, setHandle] = useState(() => publicProfile?.handle || user?.handle || normalizeHandle(user?.username || 'student'));
  const [bio, setBio] = useState(() => publicProfile?.bio || user?.bio || '');
  const [university, setUniversity] = useState(() => publicProfile?.university || user?.university || '');
  const [monthlyBudget, setMonthlyBudget] = useState(() => user?.monthlyBudget ? String(user.monthlyBudget) : '');
  const [currency, setCurrency] = useState(() => user?.currency || 'RM');
  const [selectedAvatar, setSelectedAvatar] = useState(() => user?.avatar || publicProfile?.avatarId || 'preset-scholar');

  // UI state
  const [avatarTab, setAvatarTab] = useState('presets'); // 'presets' | 'upload'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setSelectedAvatar(dataUrl);
      setSuccessMsg('Photo loaded for preview! Click "Save Changes" to apply.');
    } catch {
      setErrorMsg('Failed to process image file. Please try another image.');
    }
  };

  const handleSelectPreset = (presetId) => {
    setSelectedAvatar(presetId);
    setErrorMsg('');
  };

  const handleResetAvatar = () => {
    setSelectedAvatar('preset-scholar');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter your full or display name.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cleanHandle = normalizeHandle(handle || username);

    const profileData = {
      username: username.trim(),
      displayName: username.trim(),
      handle: cleanHandle,
      bio: bio.trim(),
      university: university.trim(),
      monthlyBudget: monthlyBudget ? Math.max(0, Number(monthlyBudget)) : 0,
      currency,
      avatar: selectedAvatar
    };

    try {
      // 1. Update public social profile (validates unique @handle and strips financial data)
      if (updateSocialProfile) {
        await updateSocialProfile({
          displayName: username.trim(),
          handle: cleanHandle,
          bio: bio.trim(),
          university: university.trim(),
          avatarId: selectedAvatar
        });
      }

      // 2. Optimistic update to global React context so header & dashboard reflect immediately
      if (updateUserProfile) {
        updateUserProfile(profileData);
      }

      // 3. Persist to Firestore & sync with Firebase Auth
      await saveFullUserProfile(user?.id, profileData);

      setSuccessMsg('Profile & public @username updated! ✨');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="modal-content profile-modal-container">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'color-mix(in srgb, var(--primary) 20%, transparent)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 id="profile-modal-title" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 800 }}>
                Student Social Profile &amp; Customization
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Customize your display name, unique @username, avatar, bio, and campus details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            disabled={isSaving}
            aria-label="Close profile modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--expense-bg)',
            color: 'var(--expense)',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '1rem'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--income-bg)',
            color: 'var(--income)',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Circular Live Preview Header */}
          <div data-tour="profile-avatar-preview" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem 1rem',
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <UserAvatar
                avatar={selectedAvatar}
                name={username || user?.username || 'Student'}
                size={84}
                style={{
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  border: '3px solid var(--primary-light)'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setAvatarTab('upload');
                  fileInputRef.current?.click();
                }}
                className="btn-icon"
                title="Upload Photo"
                aria-label="Upload custom photo"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#FFFFFF',
                  border: '2px solid var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}
              >
                <Camera size={15} />
              </button>
            </div>

            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'Plus Jakarta Sans' }}>
              {username || 'Student Name'}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.1rem' }}>
              @{normalizeHandle(handle || username || 'student')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {bio ? `"${bio}"` : (university || 'Campus Student')}
            </div>
          </div>

          {/* Avatar Selector Switcher */}
          <div data-tour="profile-avatar-presets" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Choose Your Avatar
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setAvatarTab('presets')}
                  className={`btn btn-sm ${avatarTab === 'presets' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '32px', padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('upload')}
                  className={`btn btn-sm ${avatarTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '32px', padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                >
                  Upload Photo
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            {avatarTab === 'presets' && (
              <div className="preset-avatars-grid">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = selectedAvatar === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`preset-avatar-btn ${isSelected ? 'selected' : ''}`}
                      title={preset.label}
                      aria-label={`Select ${preset.label} avatar preset`}
                    >
                      <UserAvatar avatar={preset.id} size={42} showBorder={false} />
                      <span className="preset-avatar-label">{preset.label}</span>
                      {isSelected && (
                        <span className="preset-check-badge">
                          <Check size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Photo Upload Box */}
            {avatarTab === 'upload' && (
              <div style={{
                padding: '1.25rem',
                background: 'var(--bg-card-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-light)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                />

                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  Upload a personal picture or student ID avatar
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  PNG, JPG, WebP, or GIF (Maximum file size: 2MB)
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: '40px' }}
                  >
                    <Upload size={15} /> Select Photo File
                  </button>

                  {selectedAvatar?.startsWith('data:image') && (
                    <button
                      type="button"
                      onClick={handleResetAvatar}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: '40px' }}
                      title="Revert to preset"
                    >
                      <RotateCcw size={14} /> Revert
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} data-tour="profile-fields">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-username">
                Full / Display Name *
              </label>
              <input
                id="profile-username"
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Airil Asyraff"
                required
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-handle">
                <AtSign size={13} style={{ verticalAlign: 'middle' }} /> Unique @username *
              </label>
              <input
                id="profile-handle"
                type="text"
                className="form-control"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. airil_um"
                required
                maxLength={24}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-bio">
              Short Bio / Campus Motto
            </label>
            <input
              id="profile-bio"
              type="text"
              className="form-control"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. CS Student | Spot Jimat hunter & coffee lover"
              maxLength={140}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-university">
              University / Campus Institution
            </label>
            <input
              id="profile-university"
              type="text"
              className="form-control"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. Universiti Malaya (UM)"
              maxLength={60}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-budget">
                Private Monthly Budget ({currency})
              </label>
              <input
                id="profile-budget"
                type="number"
                min="0"
                step="10"
                className="form-control"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="e.g. 800"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-currency">
                Default Currency
              </label>
              <select
                id="profile-currency"
                className="form-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-light)',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            marginTop: '0.5rem'
          }}>
            <ShieldCheck size={15} color="var(--primary)" />
            <span>
              <strong>Financial Privacy:</strong> Your budget target, balances, tracker transactions, and wallet history are private and never shown on your public profile.
            </span>
          </div>

          {/* Modal Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-light)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ minWidth: '140px' }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .profile-modal-container {
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .preset-avatars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.65rem;
        }

        .preset-avatar-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          padding: 0.65rem 0.35rem;
          background: var(--bg-card-subtle);
          border: 1.5px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--text-main);
          min-height: 76px;
        }

        .preset-avatar-btn:hover {
          background: color-mix(in srgb, var(--primary) 15%, transparent);
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .preset-avatar-btn.selected {
          border-color: var(--primary);
          background: color-mix(in srgb, var(--primary) 25%, transparent);
          box-shadow: 0 0 0 2px var(--primary);
        }

        .preset-avatar-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .preset-check-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spin-animation {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .profile-modal-container {
            padding: 1.25rem 1rem;
          }
          .preset-avatars-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
