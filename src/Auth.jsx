import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { 
  Lock, 
  User, 
  LogIn, 
  Eye, 
  EyeOff, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Mail, 
  Send, 
  RefreshCw 
} from 'lucide-react';
import KampusKashLogo from './components/KampusKashLogo';
import MicrosoftLogo from './components/MicrosoftLogo';
import { formatAuthError } from './services/authService';
import { getAuthLabel } from './utils/authLabels';

export default function Auth({ initialMode, onBackToLanding }) {
  const { 
    loginWithFirebase, 
    signupWithFirebase, 
    loginWithGoogle, 
    signInWithMicrosoft,
    pendingLinkCredential,
    redirectError,
    resetPasswordWithFirebase
  } = useAuth();

  // Mode initialization: respects initialMode prop or URL path (/login, /signup, etc.)
  const [mode, setMode] = useState(() => {
    if (initialMode) return initialMode;
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('/login') || pathname.endsWith('login')) return 'login';
      if (pathname.includes('/signup') || pathname.endsWith('signup')) return 'signup';
      if (pathname.includes('/forgot-password') || pathname.includes('/reset')) return 'reset';
    } catch {
      // Fallback
    }
    return 'signup';
  });

  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
  if (initialMode && initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
  }

  const [emailInput, setEmailInput] = useState(() => pendingLinkCredential?.email || '');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [universityInput, setUniversityInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => redirectError?.message ? formatAuthError(redirectError) : '');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailInput.trim() || !password.trim() || !displayNameInput.trim()) {
      setError('Please fill in your Full Name, Email, and Password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const result = await signupWithFirebase(
        emailInput.trim(), 
        password, 
        displayNameInput.trim(), 
        universityInput.trim() || 'Campus Student'
      );

      if (result.success) {
        setSuccess('Account registered successfully! Welcome to KampusKash.');
      } else {
        setError(formatAuthError(result));
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailInput.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithFirebase(emailInput.trim(), password);

      if (result.success) {
        setSuccess('Login successful! Redirecting...');
      } else {
        setError(formatAuthError(result));
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setError('Please enter your university or registered student email.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordWithFirebase(trimmedEmail);
      if (result.success) {
        setSuccess(`A password reset link was dispatched to ${trimmedEmail}. Check your inbox and spam folder.`);
      } else {
        setError(formatAuthError(result));
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Click handler invokes login synchronously with no prior await to avoid popup blocking
  const handleGoogleSignIn = () => {
    setError('');
    setSuccess('');
    setLoading(true);
    loginWithGoogle()
      .then((result) => {
        setLoading(false);
        if (result.success) {
          setSuccess('Signed in with Google successfully!');
        } else if (result.code === 'auth/popup-closed-by-user' || result.code === 'auth/cancelled-popup-request') {
          // Silent per specification
        } else {
          setError(formatAuthError(result));
        }
      })
      .catch((err) => {
        setLoading(false);
        const msg = formatAuthError(err);
        if (msg) setError(msg);
      });
  };

  // Click handler invokes login synchronously with no prior await to avoid popup blocking
  const handleMicrosoftSignIn = () => {
    setError('');
    setSuccess('');
    setLoading(true);
    signInWithMicrosoft()
      .then((result) => {
        setLoading(false);
        if (result.success) {
          setSuccess('Signed in with Microsoft successfully!');
        } else if (result.code === 'auth/popup-closed-by-user' || result.code === 'auth/cancelled-popup-request') {
          // Silent per specification
        } else {
          setError(formatAuthError(result));
        }
      })
      .catch((err) => {
        setLoading(false);
        const msg = formatAuthError(err);
        if (msg) setError(msg);
      });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1.5rem',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem 2rem',
        background: 'var(--surface-solid, var(--bg-card))',
        backdropFilter: 'blur(24px)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-modal)'
      }}>
        {/* Back button to return to Landing Page */}
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '1rem',
              padding: 0
            }}
          >
            <ArrowLeft size={16} />
            <span>{getAuthLabel('backToHome')}</span>
          </button>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <KampusKashLogo size={42} showWordmark={true} />
          </div>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
            margin: 0
          }}>
            {mode === 'signup' && 'Create your account to start tracking your student finances'}
            {mode === 'login' && 'Welcome back! Sign in to manage your campus wallet'}
            {mode === 'reset' && 'Reset your account password via university email'}
          </p>
        </div>

        {/* Account Linking Prompt Banner (when Microsoft email already exists with another method) */}
        {pendingLinkCredential && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'var(--primary-light)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md, 10px)',
            color: 'var(--accent-fg)',
            fontSize: '0.84rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}>
              <AlertCircle size={16} /> Account Linking Required
            </div>
            <span>
              {getAuthLabel('signInWithOriginal', 'en', pendingLinkCredential.email ? 'your email/password or Google' : 'your original sign-in method')}
            </span>
          </div>
        )}

        {/* Mode Selector Tabs (Sign Up is active by default) */}
        {mode !== 'reset' && (
          <div style={{
            display: 'flex',
            background: 'var(--bg-card-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-md, 8px)',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-light)'
          }}>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                background: mode === 'signup' ? 'var(--primary)' : 'transparent',
                color: mode === 'signup' ? 'var(--text-on-primary, #FFFFFF)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <UserPlus size={15} /> Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                background: mode === 'login' ? 'var(--primary)' : 'transparent',
                color: mode === 'login' ? 'var(--text-on-primary, #FFFFFF)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <LogIn size={15} /> Log In
            </button>
          </div>
        )}

        {/* Third-Party Provider Buttons: Google & Microsoft */}
        {mode !== 'reset' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.72rem 1rem',
                  background: 'var(--provider-btn-bg, #FFFFFF)',
                  color: 'var(--provider-btn-text, #1F2937)',
                  border: '1px solid var(--provider-btn-border, rgba(31, 41, 55, 0.28))',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{getAuthLabel('continueWithGoogle')}</span>
              </button>

              {/* Microsoft Button */}
              <button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.72rem 1rem',
                  background: 'var(--provider-btn-bg, #FFFFFF)',
                  color: 'var(--provider-btn-text, #1F2937)',
                  border: '1px solid var(--provider-btn-border, rgba(31, 41, 55, 0.28))',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <MicrosoftLogo size={18} />
                <span>{getAuthLabel('continueWithMicrosoft')}</span>
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '1.25rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.74rem',
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
              <span>{getAuthLabel('orWithEmail')}</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            </div>
          </>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 0.9rem',
            background: 'var(--expense-bg)',
            border: '1px solid var(--border-light)',
            color: 'var(--expense)',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.82rem',
            fontWeight: 500,
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} color="var(--expense)" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 0.9rem',
            background: 'var(--income-bg)',
            border: '1px solid var(--border-light)',
            color: 'var(--income)',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.82rem',
            fontWeight: 500,
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={16} color="var(--income)" style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Sign Up Mode (Default) */}
        {mode === 'signup' ? (
          <form onSubmit={handleSignupSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Full Name / Student Name
              </label>
              <input
                type="text"
                required
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="e.g. Airil Asyraf"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                University / Campus
              </label>
              <input
                type="text"
                value={universityInput}
                onChange={(e) => setUniversityInput(e.target.value)}
                placeholder="e.g. Universiti Malaya (UM)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="student@university.edu.my"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Password (min 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 1rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md, 8px)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-on-primary, #FFFFFF)',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <UserPlus size={18} /> Create Account
            </button>
          </form>
        ) : mode === 'login' ? (
          /* Log In Mode */
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="student@university.edu.my"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md, 8px)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-fg)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.6rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md, 8px)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-on-primary, #FFFFFF)',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <LogIn size={18} /> Sign In
            </button>
          </form>
        ) : (
          /* Password Reset Mode */
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
              Reset Account Password
            </h3>

            {success ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--income-bg)',
                  border: '2px solid var(--income)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem'
                }}>
                  <CheckCircle2 size={32} color="var(--income)" />
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
                  Reset Link Dispatched!
                </h4>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
                  {success}
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-on-primary, #FFFFFF)',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    border: 'none',
                    borderRadius: 'var(--radius-md, 8px)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <ArrowLeft size={16} /> Return to Log In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit}>
                <div style={{
                  background: 'var(--primary-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  color: 'var(--accent-fg)',
                  lineHeight: 1.5
                }}>
                  Enter your registered student email address. We will send you an official password reset link.
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    Account Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="student@university.edu.my"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.6rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-main)',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--input-border)',
                        borderRadius: 'var(--radius-md, 8px)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-on-primary, #FFFFFF)',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    border: 'none',
                    borderRadius: 'var(--radius-md, 8px)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    boxShadow: 'var(--shadow-card)',
                    opacity: loading ? 0.75 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Send Reset Link
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                    style={{
                      flex: 1,
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm, 6px)',
                      padding: '0.6rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                    style={{
                      flex: 1,
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm, 6px)',
                      padding: '0.6rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    Sign Up Instead
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
