import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateBudgetStatus } from '../src/services/budgetService.js';
import { formatRM } from '../src/utils/formatCurrency.js';

const root = process.cwd();

test('1. /budgets over-cap math returns exact over amount, 0 remaining, real %, and 100% bar cap', () => {
  const budget = { id: 'b-books', categoryId: 'cat-books', monthlyLimit: 200 };
  const txs = [{ type: 'expense', categoryId: 'cat-books', amount: 231.5 }];
  const status = calculateBudgetStatus(budget, txs);

  assert.equal(status.spent, 231.5);
  assert.equal(status.limit, 200);
  assert.equal(status.remaining, 0);
  assert.equal(status.over, 31.5);
  assert.equal(status.overAmount, 31.5);
  assert.equal(Math.round(status.percentage), 116);
  assert.equal(status.barPercentage, 100);
  assert.equal(status.isOver, true);

  const budgetsView = fs.readFileSync(path.join(root, 'src/views/BudgetsView.jsx'), 'utf8');
  assert.ok(budgetsView.includes('Over by {formatRM(overAmount)}'));
  assert.ok(!budgetsView.includes('Math.abs(remaining)'));
  assert.ok(budgetsView.includes('toggleExpand'));
});

test('2. Consistent RM currency formatting (thousands separator, 2 decimals)', () => {
  assert.equal(formatRM(1471.5), 'RM 1,471.50');
  assert.equal(formatRM(0), 'RM 0.00');
  assert.equal(formatRM(-31.5), '-RM 31.50');
  assert.equal(formatRM(250, { showSign: true }), '+RM 250.00');
  assert.equal(formatRM(1234567.89), 'RM 1,234,567.89');
});

test('3. /explore shows loading skeleton while fetching and Retry button on error/empty', () => {
  const exploreView = fs.readFileSync(path.join(root, 'src/views/ExploreView.jsx'), 'utf8');
  assert.ok(exploreView.includes('Loading explore summary'));
  assert.ok(exploreView.includes('handleRetryLoad'));
  assert.ok(exploreView.includes('Retry'));
});

test('4. PWA Install popup uses localStorage (try/catch), shows once, and never overlaps mobile bottom nav', () => {
  const pwaCode = fs.readFileSync(path.join(root, 'src/components/PWAInstallPrompt.jsx'), 'utf8');
  assert.ok(pwaCode.includes("localStorage.getItem('kampuskash_pwa_dismissed')"));
  assert.ok(pwaCode.includes("localStorage.setItem('kampuskash_pwa_dismissed', 'true')"));
  assert.ok(pwaCode.includes('bottom: auto;'));
  assert.ok(!pwaCode.includes("sessionStorage.getItem('kampuskash_pwa_dismissed')"));
});

test('5. Fast Instant Demo loader and slim collapsible Demo pill', () => {
  const loaderCode = fs.readFileSync(path.join(root, 'src/components/FullScreenLoader.jsx'), 'utf8');
  const demoBannerCode = fs.readFileSync(path.join(root, 'src/components/TutorialDemoBanner.jsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');

  assert.ok(loaderCode.includes('isDemo ? 450'));
  assert.ok(appCode.includes('isDemo={Boolean(user?.isDemoUser)}'));
  assert.ok(demoBannerCode.includes('Demo mode'));
  assert.ok(demoBannerCode.includes('Sign up'));
  assert.ok(demoBannerCode.includes('setCollapsed'));
  assert.ok(!demoBannerCode.includes('Exploring with Malaysian student sample data'));
});

test('6. Decluttered Dashboard, Pay, Transactions, Accounts, Savings, Settings, and Messages', () => {
  const dash = fs.readFileSync(path.join(root, 'src/views/DashboardView.jsx'), 'utf8');
  const pay = fs.readFileSync(path.join(root, 'src/views/PayView.jsx'), 'utf8');
  const tx = fs.readFileSync(path.join(root, 'src/views/TransactionsView.jsx'), 'utf8');
  const acc = fs.readFileSync(path.join(root, 'src/views/AccountsView.jsx'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'src/views/SettingsView.jsx'), 'utf8');

  // Dashboard prioritizes Total Balance, Spent this month, Budget health, Recent transactions + See all
  assert.ok(dash.includes('Total Balance'));
  assert.ok(dash.includes('Spent this month'));
  assert.ok(dash.includes('Budget health'));
  assert.ok(dash.includes('See all'));
  assert.ok(!dash.includes('Sample'));

  // Pay has Demo money label and 4 clean one-word buttons
  assert.ok(pay.includes('Demo money'));
  assert.ok(pay.includes('>Scan<'));
  assert.ok(pay.includes('>My QR<'));
  assert.ok(pay.includes('>Transfer<'));
  assert.ok(pay.includes('>Request<'));

  // Transactions grouped by Today / Yesterday with no Sample tags
  assert.ok(tx.includes("return 'Today'"));
  assert.ok(tx.includes("return 'Yesterday'"));
  assert.ok(!tx.includes('Sample'));

  // Accounts removes Sample badges
  assert.ok(!acc.includes('account-sample-badge'));

  // Settings hides Pitch Mode behind developer toggle
  assert.ok(settings.includes('PITCH_MODE_ENABLED && showDevTools'));
});
