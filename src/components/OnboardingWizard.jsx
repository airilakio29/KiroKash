import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Camera,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
  GraduationCap,
  Upload,
  User,
  Building,
  Target,
  Coins
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import {
  PRESET_AVATARS,
  SUPPORTED_CURRENCIES,
  validateAvatarFile,
  fileToDataUrl
} from '../services/profileService';
import logoImg from '../assets/kiro-logo.png';

export default function OnboardingWizard({ onCompleteProfile }) {
  const { user, saveProfile } = useAuth();
  const fileInputRef = useRef(null);

  // Form State initialized from authenticated user
  const initialName = (() => {
    const n = user?.username;
    if (n && n !== 'Student' && !/^[a-f0-9]{20,}$/i.test(n.replace(/[\s-]/g, ''))) {
      return n;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      const clean = prefix.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim();
      if (clean) return clean;
    }
    return '';
  })();

  const [username, setUsername] = useState(initialName);
  const [university, setUniversity] = useState(user?.university || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [monthlyBudget, setMonthlyBudget] = useState(user?.monthlyBudget ? String(user.monthlyBudget) : '');
  const [currency, setCurrency] = useState(user?.currency || 'RM');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'preset-scholar');

  // UI state
  const [avatarTab, setAvatarTab] = useState('presets'); // 'presets' | 'upload'
  const [nameError, setNameError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setAvatarError(validation.error);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setSelectedAvatar(dataUrl);
    } catch {
      setAvatarError('Failed to read image file. Please choose another image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameError('');
    setAvatarError('');

    const trimmedName = username.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Please enter your full or preferred display name (at least 2 characters).');
      return;
    }

    const budgetNum = monthlyBudget ? Number(monthlyBudget) : 0;
    if (monthlyBudget && (isNaN(budgetNum) || budgetNum < 0)) {
      setNameError('Please enter a valid non-negative monthly budget target.');
      return;
    }

    setIsSaving(true);

    const profileData = {
      username: trimmedName,
      university: university.trim(),
      bio: bio.trim(),
      monthlyBudget: budgetNum > 0 ? budgetNum : 0,
      currency,
      avatar: selectedAvatar
    };

    try {
      if (saveProfile) {
        await saveProfile(profileData);
      }
      if (onCompleteProfile) {
        onCompleteProfile(profileData);
      }
    } catch (err) {
      console.error('Failed to save profile during onboarding:', err);
      // Fallback: still advance user so onboarding is not permanently blocked on cloud errors
      if (onCompleteProfile) {
        onCompleteProfile(profileData);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-container">
        
        {/* Brand & Progress Header */}
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <img
              src={logoImg || `${import.meta.env.BASE_URL || '/'}kiro-logo.png`.replace(/\/{2,}/g, '/')}
              alt="KampusKash"
              className="onboarding-brand-logo"
            />
            <span className="onboarding-tagline">Your friendly campus wallet</span>
          </div>

          {/* Stepper Indicator */}
          <div className="onboarding-stepper">
            <div className="stepper-step active">
              <span className="step-badge">1</span>
              <span className="step-label">Profile Setup</span>
            </div>
            <div className="stepper-divider" />
            <div className="stepper-step">
              <span className="step-badge">2</span>
              <span className="step-label">Guided Tour</span>
            </div>
          </div>
        </div>

        {/* Card Title & Welcome */}
        <div className="onboarding-intro">
          <h2 id="onboarding-title" className="onboarding-title">
            Welcome to KampusKash! 🎓
          </h2>
          <p className="onboarding-subtitle">
            Let's personalize your student wallet. Your name, avatar, and campus info will be displayed across your dashboard and statements.
          </p>
        </div>

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="onboarding-form">
          {/* Avatar Section */}
          <div className="onboarding-avatar-section">
            <div className="avatar-preview-box">
              <UserAvatar
                user={{ username: username || 'Student', avatar: selectedAvatar }}
                size="76px"
                className="onboarding-avatar-preview"
              />
              <span className="avatar-preview-label">Live Preview</span>
            </div>

            <div className="avatar-picker-controls">
              <div className="avatar-tab-pills">
                <button
                  type="button"
                  onClick={() => setAvatarTab('presets')}
                  className={`avatar-tab-btn ${avatarTab === 'presets' ? 'active' : ''}`}
                >
                  <Sparkles size={13} /> Preset Personas
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('upload')}
                  className={`avatar-tab-btn ${avatarTab === 'upload' ? 'active' : ''}`}
                >
                  <Camera size={13} /> Upload Photo
                </button>
              </div>

              {avatarTab === 'presets' ? (
                <div className="avatar-preset-grid">
                  {PRESET_AVATARS.map(preset => {
                    const isSelected = selectedAvatar === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatar(preset.id)}
                        className={`preset-choice-btn ${isSelected ? 'selected' : ''}`}
                        title={preset.label}
                        aria-label={`Select ${preset.label} avatar`}
                      >
                        <div
                          className="preset-circle"
                          style={{ background: preset.bg, color: preset.color }}
                        >
                          <GraduationCap size={16} />
                          {isSelected && (
                            <span className="preset-selected-check">
                              <Check size={11} />
                            </span>
                          )}
                        </div>
                        <span className="preset-name">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="avatar-upload-box">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="avatar-upload-btn"
                  >
                    <Upload size={16} /> Choose Image File (&lt;2MB)
                  </button>
                  <span className="avatar-upload-hint">
                    Supports PNG, JPEG, or WebP. Cropped neatly into a circle.
                  </span>
                </div>
              )}

              {avatarError && (
                <div className="inline-error-msg">
                  <AlertCircle size={14} /> {avatarError}
                </div>
              )}
            </div>
          </div>

          <div className="onboarding-fields-grid">
            {/* Display Name (Required) */}
            <div className="form-group full-width">
              <label htmlFor="onboarding-username" className="form-label required">
                <User size={14} /> Display Name / Full Name
              </label>
              <input
                id="onboarding-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder="e.g. Airil Asyraff"
                className={`form-input ${nameError ? 'input-error' : ''}`}
                autoFocus
                required
              />
              {nameError ? (
                <span className="inline-error-msg">
                  <AlertCircle size={13} /> {nameError}
                </span>
              ) : (
                <span className="form-hint">
                  Your campus identity displayed on greeting banners and export statements.
                </span>
              )}
            </div>

            {/* University / Campus */}
            <div className="form-group">
              <label htmlFor="onboarding-university" className="form-label">
                <Building size={14} /> University / Campus
              </label>
              <input
                id="onboarding-university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Universiti Malaya (UM)"
                className="form-input"
              />
            </div>

            {/* Currency Target */}
            <div className="form-group">
              <label htmlFor="onboarding-currency" className="form-label">
                <Coins size={14} /> Primary Currency
              </label>
              <select
                id="onboarding-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="form-input"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Financial Motto / Bio */}
            <div className="form-group full-width">
              <label htmlFor="onboarding-bio" className="form-label">
                <Sparkles size={14} /> Financial Motto / Goal
              </label>
              <input
                id="onboarding-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. CS Sophomore | Saving for semester tuition & laptop"
                className="form-input"
              />
            </div>

            {/* Monthly Budget Target */}
            <div className="form-group full-width">
              <label htmlFor="onboarding-budget" className="form-label">
                <Target size={14} /> Monthly Spending Target ({currency})
              </label>
              <input
                id="onboarding-budget"
                type="number"
                min="0"
                step="10"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="e.g. 600"
                className="form-input"
              />
              <span className="form-hint">
                Optional. We'll use this to track your monthly spending pace on your dashboard.
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="onboarding-actions">
            <button
              type="submit"
              disabled={isSaving}
              className="onboarding-submit-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="spin-icon" /> Saving Profile...
                </>
              ) : (
                <>
                  Continue to Guided Tour <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(10, 10, 15, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          overflow-y: auto;
          box-sizing: border-box;
          animation: onboardingFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .onboarding-container {
          width: 100%;
          max-width: 620px;
          background: var(--bg-card, #13111f);
          border: 1px solid var(--border-light, rgba(139, 92, 246, 0.25));
          border-radius: 20px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 45px rgba(121, 40, 202, 0.25);
          padding: 2.25rem 2rem;
          color: var(--text-main, #FFFFFF);
          box-sizing: border-box;
          max-height: 94vh;
          overflow-y: auto;
        }

        .onboarding-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
          padding-bottom: 1.25rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .onboarding-brand {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .onboarding-brand-logo {
          width: 135px;
          height: auto;
          max-height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.35));
        }

        .onboarding-tagline {
          font-size: 0.72rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.65));
          margin-top: 0.2rem;
          font-weight: 500;
        }

        .onboarding-stepper {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(255, 255, 255, 0.04);
          padding: 0.4rem 0.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .stepper-step {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          font-weight: 600;
        }

        .stepper-step.active {
          color: var(--primary, #a855f7);
        }

        .step-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
        }

        .stepper-step.active .step-badge {
          background: var(--primary, #8b5cf6);
          color: #FFFFFF;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }

        .stepper-divider {
          width: 16px;
          height: 2px;
          background: rgba(255, 255, 255, 0.15);
        }

        .onboarding-intro {
          margin-bottom: 1.5rem;
        }

        .onboarding-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text-main, #FFFFFF);
          margin: 0 0 0.4rem 0;
          letter-spacing: -0.02em;
        }

        .onboarding-subtitle {
          font-size: 0.88rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.7));
          line-height: 1.5;
          margin: 0;
        }

        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }

        .onboarding-avatar-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
          border-radius: 14px;
        }

        .avatar-preview-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }

        .avatar-preview-label {
          font-size: 0.7rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.6));
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .avatar-picker-controls {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .avatar-tab-pills {
          display: flex;
          gap: 0.4rem;
        }

        .avatar-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.32rem 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: var(--text-muted, rgba(255, 255, 255, 0.65));
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .avatar-tab-btn.active {
          background: color-mix(in srgb, var(--primary, #8b5cf6) 20%, transparent);
          border-color: var(--primary, #8b5cf6);
          color: #FFFFFF;
        }

        .avatar-preset-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }

        .preset-choice-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 0.35rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .preset-choice-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .preset-choice-btn.selected {
          border-color: var(--primary, #8b5cf6);
          background: rgba(139, 92, 246, 0.15);
        }

        .preset-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .preset-selected-check {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #10B981;
          color: #FFFFFF;
          border-radius: 50%;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
        }

        .preset-name {
          font-size: 0.68rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.75));
          font-weight: 500;
        }

        .avatar-upload-box {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .avatar-upload-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px dashed var(--border-light, rgba(255, 255, 255, 0.2));
          border-radius: 8px;
          color: var(--text-main, #FFFFFF);
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .avatar-upload-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--primary, #8b5cf6);
        }

        .avatar-upload-hint {
          font-size: 0.72rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.55));
        }

        .onboarding-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.15rem;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-main, #F1F5F9);
          margin-bottom: 0.35rem;
        }

        .form-label.required::after {
          content: '*';
          color: #EF4444;
          margin-left: 2px;
        }

        .form-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.65rem 0.85rem;
          background: var(--bg-input, rgba(15, 12, 27, 0.8));
          border: 1px solid var(--border-light, rgba(255, 255, 255, 0.15));
          border-radius: 10px;
          color: var(--text-main, #FFFFFF);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-input:focus {
          border-color: var(--primary, #8b5cf6);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
        }

        .form-input.input-error {
          border-color: #EF4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25) !important;
        }

        .inline-error-msg {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.78rem;
          color: #F87171;
          font-weight: 500;
          margin-top: 0.3rem;
        }

        .form-hint {
          display: block;
          font-size: 0.74rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          margin-top: 0.3rem;
        }

        .onboarding-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .onboarding-submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.6rem;
          background: linear-gradient(135deg, var(--primary, #8b5cf6), var(--primary-hover, #7c3aed));
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(139, 92, 246, 0.4);
          transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
          width: 100%;
        }

        .onboarding-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(139, 92, 246, 0.5);
        }

        .onboarding-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes onboardingFadeIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 600px) {
          .onboarding-container {
            padding: 1.5rem 1.15rem;
          }
          .onboarding-avatar-section {
            flex-direction: column;
            align-items: flex-start;
          }
          .avatar-preset-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .onboarding-fields-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: span 1;
          }
          .onboarding-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
