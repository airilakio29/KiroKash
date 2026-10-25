import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Lock, User, LogIn, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, ArrowLeft, Mail, Send, RefreshCw } from 'lucide-react';
import KampusKashLogo from './components/KampusKashLogo';

export default function Auth({ initialMode, onBackToLanding }) {
  const { 
    loginWithFirebase, 
    signupWithFirebase, 
    loginWithGoogle, 
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
  const [emailInput, setEmailInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [universityInput, setUniversityInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const formatFirebaseError = (err) => {
    if (!err) return 'An error occurred during authentication.';
    const code = err.code || err.message || '';
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
      return 'Invalid email or password. Please check your credentials.';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Try logging in instead.';
    }
    if (code.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters long.';
    }
    if (code.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code.includes('auth/operation-not-allowed')) {
      return 'This sign-in method is disabled. In Firebase Console, go to Authentication -> Sign-in method and enable Email/Password and Google.';
    }
    if (code.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was closed before completing.';
    }
    if (code.includes('auth/configuration-not-found') || code.includes('auth/invalid-api-key')) {
      return 'Firebase API keys missing. Please configure your .env credentials.';
    }
    return err.message || 'Authentication failed. Please try again.';
  };

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
        setError(result.error ? formatFirebaseError({ message: result.error, code: result.code }) : 'Failed to register account.');
      }
    } catch (err) {
      setError(formatFirebaseError(err));
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
        setError(result.error ? formatFirebaseError({ message: result.error, code: result.code }) : 'Invalid email or password.');
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = emailInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      setError('Please enter your university or registered student email.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. student@university.edu).');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordWithFirebase(trimmedEmail);
      if (result.success) {
        setSuccess(`Password reset email sent to ${trimmedEmail}! Check your inbox and click the link to set your new password.`);
      } else {
        setError(result.error ? formatFirebaseError({ message: result.error, code: result.code }) : 'Failed to send reset link.');
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        setSuccess('Signed in with Google successfully!');
      } else {
        setError(result.error ? formatFirebaseError({ message: result.error, code: result.code }) : 'Google Sign-In failed.');
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
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
        background: 'var(--bg-card, rgba(54, 40, 68, 0.85))',
        backdropFilter: 'blur(24px)',
        borderRadius: '16px',
        border: '1px solid var(--border-light, rgba(255, 255, 255, 0.15))',
        boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6)'
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
            <span>Back to home</span>
          </button>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <KampusKashLogo size={42} showWordmark={true} />
          </div>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted, #C4B5D4)',
            fontWeight: 500,
            margin: 0
          }}>
            {mode === 'signup' && 'Create your account to start tracking your student finances'}
            {mode === 'login' && 'Welcome back! Sign in to manage your campus wallet'}
            {mode === 'reset' && 'Reset your account password via university email'}
          </p>
        </div>

        {/* Mode Selector Tabs (Sign Up is active by default) */}
        {mode !== 'reset' && (
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '4px',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'signup' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                color: mode === 'signup' ? '#FFFFFF' : 'var(--text-muted)',
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
                borderRadius: '6px',
                border: 'none',
                background: mode === 'login' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                color: mode === 'login' ? '#FFFFFF' : 'var(--text-muted)',
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

        {/* Google Sign-In Button */}
        {mode !== 'reset' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#FFFFFF',
                color: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                marginBottom: '1.25rem',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '1.25rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.75rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span>OR WITH EMAIL & PASSWORD</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
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
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FCA5A5',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 500,
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 0.9rem',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#6EE7B7',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 500,
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
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
                placeholder="e.g. Universiti Teknologi Malaysia (UTM)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
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
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--primary, #8B5CF6) 35%, transparent)'
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
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
                    color: 'var(--primary-light, #C4B5FD)',
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
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
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--primary, #8B5CF6) 35%, transparent)'
              }}
            >
              <LogIn size={18} /> Log In
            </button>
          </form>
        ) : (
          /* Password Reset Mode */
          <div>
            {success ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
                }}>
                  <CheckCircle2 size={32} color="#10B981" />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #FFFFFF)', margin: '0 0 0.5rem' }}>
                  Reset Link Dispatched!
                </h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #C4B5D4)', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
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
                    color: '#FFFFFF',
                    background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                    border: 'none',
                    borderRadius: '8px',
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
            ) : (
              <form onSubmit={handlePasswordResetSubmit}>
                <div style={{
                  background: 'color-mix(in srgb, var(--primary, #8B5CF6) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--primary, #8B5CF6) 25%, transparent)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted, #C4B5D4)',
                  lineHeight: 1.5
                }}>
                  Enter your registered student email address. We will send you an official Firebase password reset link with a direct redirect to our custom reset page.
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
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
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
                    color: '#FFFFFF',
                    background: 'linear-gradient(135deg, var(--primary, #8B5CF6), var(--primary-hover, #7C3AED))',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 16px color-mix(in srgb, var(--primary, #8B5CF6) 35%, transparent)',
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
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      borderRadius: '6px',
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
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      borderRadius: '6px',
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
