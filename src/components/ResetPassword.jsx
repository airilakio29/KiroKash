import React, { useState, useEffect, useId } from 'react';
import { verifyResetCode, confirmNewPassword } from '../services/authService';
import logoImg from '../assets/kiro-logo.png';
import KampusKashLogo from './KampusKashLogo';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  KeyRound, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

/**
 * Custom Password Reset Component for KiroKash
 * Handles action links from Firebase auth action emails (oobCode parameter).
 *
 * Flow:
 * 1. Reads `oobCode` from window.location.search or hash
 * 2. Validates code with verifyPasswordResetCode(auth, actionCode)
 * 3. Shows target email & password reset form
 * 4. Submits with confirmPasswordReset(auth, actionCode, newPassword)
 * 5. Shows success card with redirect to login
 */
export default function ResetPassword({ oobCode: propCode, onBackToLogin }) {
  const publicLogo = `${import.meta.env.BASE_URL || '/'}kiro-logo.png`.replace(/\/{2,}/g, '/');

  // URL action code extraction (prop, search query, or hash params)
  const extractCode = () => {
    if (propCode) return propCode;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const codeFromSearch = searchParams.get('oobCode') || searchParams.get('code');
      if (codeFromSearch) return codeFromSearch;

      if (window.location.hash) {
        const match = window.location.hash.match(/[?&#](?:oobCode|code)=([^&#]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }
    } catch {
      // Fallback
    }
    return '';
  };

  const [actionCode, setActionCode] = useState(extractCode);

  useEffect(() => {
    const code = propCode || extractCode();
    if (code && code !== actionCode) {
      setActionCode(code);
    }
  }, [propCode]);

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'ready' | 'submitting' | 'success' | 'error'
  const [targetEmail, setTargetEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // Validate actionCode on load
  useEffect(() => {
    let isMounted = true;

    async function validateCode(code) {
      if (!code) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('This password reset link is invalid, expired, or missing. Please request a new link from the login page.');
        }
        return;
      }

      setStatus('verifying');
      setErrorMessage('');

      try {
        const result = await verifyResetCode(code);
        if (!isMounted) return;

        if (result.success) {
          setTargetEmail(result.email || 'your account');
          setStatus('ready');
        } else {
          setStatus('error');
          const codeStr = result.code || result.error || '';
          if (codeStr.includes('invalid-action-code')) {
            setErrorMessage('This password reset link is invalid, expired, or has already been used.');
          } else if (codeStr.includes('expired-action-code')) {
            setErrorMessage('This password reset link has expired. Please request a new password reset link.');
          } else {
            setErrorMessage(result.error || 'This password reset link has expired or is invalid. Please request a new link.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'An unexpected error occurred verifying your link.');
        }
      }
    }

    validateCode(actionCode);

    return () => {
      isMounted = false;
    };
  }, [actionCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newPassword || newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setFormError('Password must contain both letters and numbers.');
      return;
    }

    if (newPassword !== confirmPasswordVal) {
      setFormError('Passwords do not match. Please re-enter them carefully.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await confirmNewPassword(actionCode, newPassword);
      if (res.success) {
        setStatus('success');
      } else {
        setStatus('ready');
        const codeStr = res.code || res.error || '';
        if (codeStr.includes('weak-password')) {
          setFormError('Password is too weak. Please include letters and numbers with at least 6 characters.');
        } else if (codeStr.includes('expired-action-code') || codeStr.includes('invalid-action-code')) {
          setStatus('error');
          setErrorMessage('This reset code is no longer valid. Please request a new link.');
        } else {
          setFormError(res.error || 'Failed to update password. Please try again.');
        }
      }
    } catch (err) {
      setStatus('ready');
      setFormError(err.message || 'An unexpected error occurred while resetting password.');
    }
  };

  const cleanUrlAndGoToLogin = () => {
    try {
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      const loginPath = `${basePath}/login`;
      window.history.replaceState({}, document.title, loginPath);
    } catch {
      // Ignore URL manipulation failures
    }
    if (onBackToLogin) {
      onBackToLogin();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        position: 'relative',
        zIndex: 10
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem 2rem',
          background: 'var(--bg-card, rgba(54, 40, 68, 0.88))',
          backdropFilter: 'blur(24px)',
          borderRadius: '20px',
          border: '1px solid var(--border-light, rgba(255, 255, 255, 0.16))',
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.65)',
          color: 'var(--text-main, #FFFFFF)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 'min(210px, 65vw)',
              height: 'auto',
              maxHeight: '75px',
              margin: '0 auto 0.75rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={logoImg || publicLogo}
              alt="KiroKash Logo"
              onError={(e) => {
                if (e.target.src !== publicLogo) e.target.src = publicLogo;
              }}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '75px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 6px 18px rgba(139, 92, 246, 0.35))'
              }}
            />
          </div>
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', var(--font-sans, sans-serif)",
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-main, #FFFFFF)',
              margin: 0,
              letterSpacing: '-0.025em'
            }}
          >
            Reset Password
          </h1>
          <p
            style={{
              fontSize: '0.86rem',
              color: 'var(--text-muted, #C4B5D4)',
              fontWeight: 500,
              marginTop: '0.35rem',
              marginBottom: 0
            }}
          >
            Create a secure new password for your KampusKash account
          </p>
        </div>

        {/* State 1: Verifying link */}
        {status === 'verifying' && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '3px solid rgba(255, 255, 255, 0.15)',
                borderTopColor: 'var(--primary, #8B5CF6)',
                animation: 'spin 0.9s linear infinite'
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                Verifying reset link...
              </p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #C4B5D4)' }}>
                Checking code validity with Firebase
              </span>
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* State 2: Invalid or expired code error */}
        {status === 'error' && (
          <div>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#FCA5A5',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}
            >
              <AlertCircle size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#FECACA' }}>
                  Invalid or Expired Link
                </h2>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.84rem', lineHeight: 1.5, color: '#FCA5A5' }}>
                  {errorMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cleanUrlAndGoToLogin}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--primary, #8B5CF6) 35%, transparent)'
              }}
            >
              <ArrowLeft size={16} /> Return to Log In
            </button>
          </div>
        )}

        {/* State 3: Ready to reset / Form entry */}
        {(status === 'ready' || status === 'submitting') && (
          <form onSubmit={handleSubmit}>
            {/* Target Email Banner */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--primary, #8B5CF6) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--primary, #8B5CF6) 35%, transparent)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1.25rem'
              }}
            >
              <ShieldCheck size={18} color="var(--primary-light, #C4B5FD)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--text-muted, #C4B5D4)' }}>Resetting password for: </span>
                <strong style={{ color: 'var(--text-main, #FFFFFF)' }}>{targetEmail}</strong>
              </div>
            </div>

            {formError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 0.9rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#FCA5A5',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  marginBottom: '1.25rem'
                }}
              >
                <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* New Password */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label
                htmlFor={newPasswordId}
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '0.4rem'
                }}
              >
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id={newPasswordId}
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 2.6rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label
                htmlFor={confirmPasswordId}
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '0.4rem'
                }}
              >
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id={confirmPasswordId}
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 2.6rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Live Password Checklist */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginBottom: '1.25rem',
              padding: '0.65rem 0.85rem',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.78rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: newPassword.length >= 6 ? '#34D399' : 'var(--text-muted, #C4B5D4)'
              }}>
                <CheckCircle2 size={13} style={{ opacity: newPassword.length >= 6 ? 1 : 0.4 }} />
                <span>At least 6 characters</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: (/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) ? '#34D399' : 'var(--text-muted, #C4B5D4)'
              }}>
                <CheckCircle2 size={13} style={{ opacity: (/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) ? 1 : 0.4 }} />
                <span>Contains letters and numbers</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: (confirmPasswordVal && newPassword === confirmPasswordVal) ? '#34D399' : 'var(--text-muted, #C4B5D4)'
              }}>
                <CheckCircle2 size={13} style={{ opacity: (confirmPasswordVal && newPassword === confirmPasswordVal) ? 1 : 0.4 }} />
                <span>Passwords match</span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                border: 'none',
                borderRadius: '10px',
                cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--primary, #8B5CF6) 40%, transparent)',
                opacity: status === 'submitting' ? 0.75 : 1
              }}
            >
              {status === 'submitting' ? (
                <>
                  <RefreshCw size={17} className="animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  <KeyRound size={17} /> Save New Password
                </>
              )}
            </button>

            <button
              type="button"
              onClick={cleanUrlAndGoToLogin}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #C4B5D4)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.4rem'
              }}
            >
              <ArrowLeft size={16} /> Cancel & Back to Login
            </button>
          </form>
        )}

        {/* State 4: Success confirmation */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.18)',
                border: '2px solid rgba(16, 185, 129, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
              }}
            >
              <CheckCircle2 size={36} color="#10B981" />
            </div>

            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', var(--font-sans, sans-serif)",
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--text-main, #FFFFFF)',
                margin: '0 0 0.5rem'
              }}
            >
              Password Reset Complete!
            </h2>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-muted, #C4B5D4)',
                lineHeight: 1.55,
                margin: '0 0 1.75rem'
              }}
            >
              Your password has been securely updated. You can now log in to KampusKash with your new credentials.
            </p>

            <button
              type="button"
              onClick={cleanUrlAndGoToLogin}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--primary, #8B5CF6) 40%, transparent)'
              }}
            >
              Proceed to Log In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
