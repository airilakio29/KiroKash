import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('KiroKash ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    try {
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      window.location.href = basePath || '/';
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--bg-app, #120e18)',
          color: 'var(--text-main, #ffffff)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-card, #231b30)',
            border: '1px solid var(--border-light, rgba(255,255,255,0.1))',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, rgba(255,255,255,0.7))', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              An unexpected display issue occurred. You can return to the home page or reload the application.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: 'var(--primary, #7C3AED)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Return to Home Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
