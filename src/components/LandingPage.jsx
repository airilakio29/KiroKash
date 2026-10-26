import React from 'react';
import {
  ArrowRight,
  Sparkles,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Target,
  Smartphone,
  Check,
  LogIn,
  Sun,
  Moon
} from 'lucide-react';
import KampusKashLogo from './KampusKashLogo';

export default function LandingPage({ onOpenLogin, onOpenSignup, onTryDemo, currentTheme, onToggleTheme }) {
  return (
    <div className="landing-page-wrapper">
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <KampusKashLogo size={34} showWordmark={true} />

          <div className="landing-nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#preview" className="nav-link">Live Preview</a>
            <a href="#benefits" className="nav-link">Student Perks</a>
          </div>

          <div className="landing-nav-actions">
            <button
              onClick={onToggleTheme}
              className="theme-toggle-btn"
              title="Toggle theme appearance"
              aria-label="Toggle theme appearance"
            >
              {currentTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={onOpenLogin}
              className="btn btn-secondary btn-sm nav-login-btn"
            >
              <LogIn size={15} />
              <span>Log In</span>
            </button>

            <button
              onClick={onTryDemo}
              className="btn btn-primary btn-sm nav-demo-btn"
            >
              <Sparkles size={15} />
              <span>Try Instant Demo</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-flag">🇲🇾</span>
            <span>Designed for Malaysian University & College Students</span>
          </div>

          <h1 className="hero-headline">
            Student budgeting that <span className="highlight-text">actually makes sense</span>.
          </h1>

          <p className="hero-subhead">
            Track your allowance, PTPTN disbursements, hostel rent, and daily mamak meals
            in <strong>Ringgit Malaysia (RM)</strong> across Maybank, Touch 'n Go, and Cash.
            Zero financial jargon. Zero clutter.
          </p>

          <div className="hero-cta-group">
            <button
              onClick={onTryDemo}
              className="btn btn-primary hero-btn-main"
            >
              <Sparkles size={18} />
              <span>Try Instant Demo</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onOpenSignup}
              className="btn btn-secondary hero-btn-sub"
            >
              <span>Create Free Account</span>
            </button>
          </div>

          <div className="hero-perks-row">
            <div className="hero-perk-item">
              <Check size={16} className="perk-icon" />
              <span>1-Click demo (no sign up)</span>
            </div>
            <div className="hero-perk-item">
              <Check size={16} className="perk-icon" />
              <span>100% Free & Open Source</span>
            </div>
            <div className="hero-perk-item">
              <Check size={16} className="perk-icon" />
              <span>Works offline (PWA)</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive App Snapshot Preview Card */}
        <div id="preview" className="hero-mockup-wrapper">
          <div className="mockup-frame">
            <div className="mockup-top-bar">
              <div className="mockup-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="mockup-search-pill">
                <span>kampuskash.app/dashboard</span>
              </div>
              <div className="mockup-badge">Live RM Demo</div>
            </div>

            <div className="mockup-body">
              {/* Metric Row */}
              <div className="mockup-metric-grid">
                <div className="mockup-card">
                  <div className="m-card-label">Total Balance</div>
                  <div className="m-card-val text-primary">RM 1,655.00</div>
                  <div className="m-card-sub text-income">↑ RM 800 allowance received</div>
                </div>
                <div className="mockup-card">
                  <div className="m-card-label">This Month Spent</div>
                  <div className="m-card-val">RM 485.50</div>
                  <div className="m-card-sub">Daily avg: RM 24.20</div>
                </div>
                <div className="mockup-card">
                  <div className="m-card-label">Food & Dining Budget</div>
                  <div className="m-card-val">RM 280 / 400</div>
                  <div className="m-progress-bar">
                    <div className="m-progress-fill" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>

              {/* Accounts & Recent Transactions */}
              <div className="mockup-split-row">
                {/* Accounts */}
                <div className="mockup-subcard">
                  <div className="mockup-card-header">
                    <span>My Accounts</span>
                    <span className="mockup-badge-tiny">3 Linked</span>
                  </div>
                  <div className="mockup-account-item">
                    <div className="acc-icon-pill">🏦</div>
                    <div className="acc-info">
                      <div className="acc-name">Maybank Savings</div>
                      <div className="acc-type">Primary Bank</div>
                    </div>
                    <div className="acc-bal">RM 1,450.00</div>
                  </div>
                  <div className="mockup-account-item">
                    <div className="acc-icon-pill">📲</div>
                    <div className="acc-info">
                      <div className="acc-name">Touch 'n Go eWallet</div>
                      <div className="acc-type">Campus QR Pay</div>
                    </div>
                    <div className="acc-bal">RM 120.00</div>
                  </div>
                  <div className="mockup-account-item">
                    <div className="acc-icon-pill">💵</div>
                    <div className="acc-info">
                      <div className="acc-name">Physical Cash</div>
                      <div className="acc-type">Pocket cash</div>
                    </div>
                    <div className="acc-bal">RM 85.00</div>
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="mockup-subcard">
                  <div className="mockup-card-header">
                    <span>Recent Transactions</span>
                    <button onClick={onTryDemo} className="mockup-interactive-link">
                      Interact in Live Demo →
                    </button>
                  </div>
                  <div className="mockup-tx-item">
                    <div className="tx-icon-pill expense">🍛</div>
                    <div className="tx-info">
                      <div className="tx-title">Restoran Nasi Kandar Pelita</div>
                      <div className="tx-cat">Food & Dining · TnG eWallet</div>
                    </div>
                    <div className="tx-amt expense">-RM 9.50</div>
                  </div>
                  <div className="mockup-tx-item">
                    <div className="tx-icon-pill expense">📚</div>
                    <div className="tx-info">
                      <div className="tx-title">Campus Bookstore — Notebooks</div>
                      <div className="tx-cat">Books & Supplies · Cash</div>
                    </div>
                    <div className="tx-amt expense">-RM 18.00</div>
                  </div>
                  <div className="mockup-tx-item">
                    <div className="tx-icon-pill income">🎓</div>
                    <div className="tx-info">
                      <div className="tx-title">Monthly Family Allowance</div>
                      <div className="tx-cat">Allowance · Maybank</div>
                    </div>
                    <div className="tx-amt income">+RM 800.00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Pillars */}
      <section id="features" className="landing-features">
        <div className="features-header">
          <div className="section-pill">Built for Campus Life</div>
          <h2 className="section-title">Everything you need to survive the semester</h2>
          <p className="section-subtitle">
            Say goodbye to clunky enterprise accounting software. KampusKash gives you clear answers to:
            "Can I afford dinner tonight?" and "How much rent do I have left?"
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Wallet size={24} color="var(--primary)" />
            </div>
            <h3 className="feature-card-title">Real Multi-Account Tracking</h3>
            <p className="feature-card-desc">
              Track your Maybank, CIMB, Touch 'n Go eWallet, GrabPay, and cash in your pocket.
              Transactions adjust account balances automatically without double counting.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Target size={24} color="var(--income)" />
            </div>
            <h3 className="feature-card-title">Category Budget Caps</h3>
            <p className="feature-card-desc">
              Set realistic caps on Food & Dining, Hostel Rent, and Books.
              Receive clear visual indicators before you exceed your limit.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Sparkles size={24} color="var(--accent-fg)" />
            </div>
            <h3 className="feature-card-title">KampusKash AI Assistant</h3>
            <p className="feature-card-desc">
              Powered by Google Gemini. Ask questions in plain language:
              "How much did I spend this week?" or "Create a monthly food budget of RM300".
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <TrendingUp size={24} color="var(--warning)" />
            </div>
            <h3 className="feature-card-title">Savings Goals Milestones</h3>
            <p className="feature-card-desc">
              Save up for next semester's tuition, a new laptop, or an emergency stash.
              Track your progress percentage and remaining ringgit with clear milestones.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Smartphone size={24} color="var(--primary)" />
            </div>
            <h3 className="feature-card-title">PWA & Offline Ready</h3>
            <p className="feature-card-desc">
              Install it directly to your iPhone or Android home screen with no app store delay.
              Works seamlessly without internet connection and synchronizes when you reconnect.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={24} color="var(--income)" />
            </div>
            <h3 className="feature-card-title">100% Privacy & Cloud Security</h3>
            <p className="feature-card-desc">
              Your financial records are strictly yours. Powered by Firebase secure auth with
              per-user Firestore rules, encrypted in transit and at rest.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <UtensilsCrossed size={24} color="#EC4899" />
            </div>
            <h3 className="feature-card-title">Makan Murah Campus Food Board</h3>
            <p className="feature-card-desc">
              Discover authentic student-vetted budget food spots under RM10–RM15 near your campus.
              Share reviews, student tips, star ratings, and upvote the tastiest cheap meals.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section id="benefits" className="landing-cta-banner">
        <div className="cta-banner-card">
          <h2 className="cta-title">Ready to take control of your student finances?</h2>
          <p className="cta-desc">
            Try the demo right now in your browser with prefilled data, or create your free account in 30 seconds.
          </p>

          <div className="cta-buttons">
            <button onClick={onTryDemo} className="btn btn-primary cta-btn-demo">
              <Sparkles size={18} />
              <span>Try Instant Demo (No signup)</span>
            </button>

            <button onClick={onOpenSignup} className="btn btn-secondary cta-btn-signup">
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <KampusKashLogo size={28} showWordmark={true} />
          <p className="footer-tagline">
            Made with craft for students across Malaysia 🇲🇾 · Open Source personal finance
          </p>
          <div className="footer-actions">
            <button onClick={onOpenLogin} className="footer-link-btn">Log In</button>
            <span className="footer-sep">·</span>
            <button onClick={onOpenSignup} className="footer-link-btn">Sign Up</button>
            <span className="footer-sep">·</span>
            <button onClick={onTryDemo} className="footer-link-btn">Launch Demo</button>
          </div>
        </div>
      </footer>

      {/* Scoped Modern Fintech Styles */}
      <style>{`
        .landing-page-wrapper {
          min-height: 100vh;
          width: 100%;
          background: transparent;
          color: var(--text-main);
          font-family: var(--font-sans);
          overflow-x: hidden;
          position: relative;
        }

        /* Nav */
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: color-mix(in srgb, var(--bg-app) 88%, transparent);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-light);
        }

        .landing-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0.85rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .landing-nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-link {
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-main);
        }

        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .theme-toggle-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          color: var(--text-main);
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .theme-toggle-btn:hover {
          background: var(--bg-card-subtle);
          border-color: var(--border-focus);
        }

        /* Hero */
        .landing-hero {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4.5rem 1.5rem 3rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          padding: 0.4rem 0.95rem;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          box-shadow: var(--shadow-sm);
          margin-bottom: 1.5rem;
        }

        .hero-headline {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: clamp(2.4rem, 6vw, 3.8rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--text-main);
          margin-bottom: 1.25rem;
        }

        .highlight-text {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-badge) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subhead {
          font-size: clamp(1.05rem, 2vw, 1.25rem);
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 680px;
          margin-bottom: 2.25rem;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.75rem;
        }

        .hero-btn-main {
          padding: 0.85rem 1.75rem;
          font-size: 1.05rem;
          font-weight: 700;
          border-radius: var(--radius-md);
          gap: 0.65rem;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
        }

        .hero-btn-sub {
          padding: 0.85rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: var(--radius-md);
          background: var(--bg-card);
        }

        .hero-perks-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .hero-perk-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .perk-icon {
          color: var(--income);
        }

        /* Mockup */
        .hero-mockup-wrapper {
          width: 100%;
          max-width: 1040px;
          margin-top: 3.5rem;
        }

        .mockup-frame {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-modal);
          overflow: hidden;
          text-align: left;
        }

        .mockup-top-bar {
          background: var(--bg-card-subtle);
          border-bottom: 1px solid var(--border-light);
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mockup-dots {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot-red { background: var(--expense); }
        .dot-yellow { background: var(--warning); }
        .dot-green { background: var(--income); }

        .mockup-search-pill {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          padding: 0.25rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .mockup-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          background: rgba(16, 185, 129, 0.15);
          color: var(--income);
          border-radius: 9999px;
        }

        .mockup-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: var(--bg-app);
        }

        .mockup-metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .mockup-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.2rem;
          box-shadow: var(--shadow-sm);
        }

        .m-card-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.4rem;
        }

        .m-card-val {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-main);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }

        .text-primary {
          color: var(--primary);
        }

        .m-card-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 0.35rem;
        }

        .text-income {
          color: var(--income);
          font-weight: 600;
        }

        .m-progress-bar {
          height: 8px;
          background: var(--bg-card-subtle);
          border-radius: 9999px;
          margin-top: 0.65rem;
          overflow: hidden;
        }

        .m-progress-fill {
          height: 100%;
          background: var(--income);
          border-radius: 9999px;
        }

        .mockup-split-row {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 1rem;
        }

        .mockup-subcard {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          box-shadow: var(--shadow-sm);
        }

        .mockup-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 1rem;
          padding-bottom: 0.65rem;
          border-bottom: 1px solid var(--border-light);
        }

        .mockup-badge-tiny {
          font-size: 0.7rem;
          padding: 0.15rem 0.5rem;
          background: var(--bg-card-subtle);
          border-radius: 9999px;
          color: var(--text-muted);
        }

        .mockup-interactive-link {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .mockup-account-item,
        .mockup-tx-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.65rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        .mockup-account-item:last-child,
        .mockup-tx-item:last-child {
          border-bottom: none;
        }

        .acc-icon-pill,
        .tx-icon-pill {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--bg-card-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .acc-info,
        .tx-info {
          flex: 1;
          min-width: 0;
        }

        .acc-name,
        .tx-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .acc-type,
        .tx-cat {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .acc-bal,
        .tx-amt {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 0.92rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        .tx-amt.expense { color: var(--expense); }
        .tx-amt.income { color: var(--income); }

        /* Features Section */
        .landing-features {
          max-width: 1200px;
          margin: 0 auto;
          padding: 5rem 1.5rem;
        }

        .features-header {
          text-align: center;
          max-width: 640px;
          margin: 0 auto 3.5rem auto;
        }

        .section-pill {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary);
          margin-bottom: 0.75rem;
        }

        .section-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), border-color var(--transition-fast);
        }

        .feature-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
        }

        .feature-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: var(--bg-card-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .feature-card-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.65rem;
        }

        .feature-card-desc {
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        /* Bottom CTA */
        .landing-cta-banner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem 5rem 1.5rem;
        }

        .cta-banner-card {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-subtle) 100%);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          padding: 3.5rem 2rem;
          text-align: center;
          box-shadow: var(--shadow-card);
        }

        .cta-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 0.85rem;
        }

        .cta-desc {
          font-size: 1.05rem;
          color: var(--text-muted);
          max-width: 580px;
          margin: 0 auto 2rem auto;
        }

        .cta-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .cta-btn-demo {
          padding: 0.85rem 1.75rem;
          font-size: 1.05rem;
          font-weight: 700;
          gap: 0.65rem;
        }

        .cta-btn-signup {
          padding: 0.85rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          background: var(--bg-card);
        }

        /* Footer */
        .landing-footer {
          border-top: 1px solid var(--border-light);
          padding: 2rem 1.5rem;
          background: var(--bg-card);
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-tagline {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .footer-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .footer-link-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .footer-link-btn:hover {
          color: var(--primary);
        }

        .footer-sep {
          color: var(--border-light);
        }

        @media (max-width: 768px) {
          .landing-nav-links {
            display: none;
          }
          .nav-login-btn {
            display: none;
          }
          .mockup-split-row {
            grid-template-columns: 1fr;
          }
          .hero-cta-group {
            flex-direction: column;
            width: 100%;
          }
          .hero-btn-main,
          .hero-btn-sub {
            width: 100%;
          }
          .footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
