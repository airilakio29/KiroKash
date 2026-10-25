import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = login(username.trim(), password);
      if (!result.success) {
        setError(result.error);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        borderRadius: '6px',
        border: '1px solid var(--border-light)',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#FFFFFF'
          }}>
            KK
          </div>
          <h1 style={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '0.35rem'
          }}>
            KampusKash
          </h1>
          <p style={{
            fontSize: '0.88rem',
            color: 'rgba(255, 255, 255, 0.55)',
            fontWeight: 500
          }}>
            Your friendly campus wallet
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.75)',
              marginBottom: '0.45rem'
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="rgba(255,255,255,0.35)" style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.6rem',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.92rem',
                  color: '#F3EDF9',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  transition: 'all 0.18s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'color-mix(in srgb, var(--text-main) 10%, transparent)';
                  e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'color-mix(in srgb, var(--border-light) 100%, transparent)';
                  e.target.style.background = 'color-mix(in srgb, var(--text-main) 6%, transparent)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.75)',
              marginBottom: '0.45rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="rgba(255,255,255,0.35)" style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.92rem',
                  color: '#F3EDF9',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  transition: 'all 0.18s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'color-mix(in srgb, var(--text-main) 10%, transparent)';
                  e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'color-mix(in srgb, var(--border-light) 100%, transparent)';
                  e.target.style.background = 'color-mix(in srgb, var(--text-main) 6%, transparent)';
                  e.target.style.boxShadow = 'none';
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
                  padding: '4px',
                  display: 'flex',
                  color: 'rgba(255,255,255,0.4)'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              background: 'rgba(231, 76, 60, 0.2)',
              color: '#FCA5A5',
              borderRadius: '4px',
              fontSize: '0.82rem',
              fontWeight: 500,
              marginBottom: '1.25rem'
            }}>
              <ShieldCheck size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.18s ease',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 40%, transparent)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = 'linear-gradient(135deg, var(--primary-hover), var(--primary))';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-hover))';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.3)';
            }}
          >
            {loading ? (
              <span style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : (
              <>
                <LogIn size={18} />
                Log In
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.35)' }}>
            Demo account: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Airil Asyraf</strong> /{' '}
            <strong style={{ color: 'rgba(255,255,255,0.5)' }}>KrackedDevs</strong>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}