/**
 * Central Application Constants & Feature Flags for KampusKash (KiroKash UI)
 *
 * Change SPOT_FEED_NAME here to rename the student spots feed across
 * the sidebar, mobile navigation, routes, headers, and page titles.
 */

export const SPOT_FEED_NAME = 'Spot Jimat';
export const SPOT_FEED_SUBTITLE = 'Port makan, thrift, sukan, study spot & diskaun pelajar seluruh kampus';
export const SPOT_FEED_LEGACY_NAME = 'Makan Murah';
export const SPOT_FEED_TAB_ID = 'community';
export const SPOT_FEED_ROUTES = ['/spot-jimat', '/community', '/makan-murah'];

/**
 * Feature Flags
 * DEMO_WALLET controls the simulated KampusKash Wallet layer.
 * Swap this flag or replace walletService provider when connecting a real payment rail.
 */
export const DEMO_WALLET = true;
export const DEMO_WALLET_BADGE_TEXT = 'DEMO MODE: no real money';
export const INITIAL_DEMO_WALLET_BALANCE = 100.00;
export const WALLET_MAX_PER_TRANSFER = 200.00;
export const WALLET_DAILY_LIMIT = 500.00;
export const WALLET_TRANSFER_CATEGORY_ID = 'cat-wallet-transfer';
export const WALLET_TRANSFER_CATEGORY_NAME = 'Wallet transfer';

/**
 * Pitch Mode Flag
 * Enables the development Pitch Mode section in Settings and the quick Demo Account Switcher.
 */
export const PITCH_MODE_ENABLED = true;

/**
 * Spot Jimat Categories
 */
export const SPOT_CATEGORIES = [
  {
    id: 'makan',
    label: 'Makan',
    labelEn: 'Food & Makan',
    iconName: 'Utensils',
    color: 'var(--income)'
  },
  {
    id: 'thrift',
    label: 'Thrift & Bundles',
    labelEn: 'Thrift & Bundles',
    iconName: 'ShoppingBag',
    color: 'var(--primary)'
  },
  {
    id: 'activities',
    label: 'Activities & Sports',
    labelEn: 'Activities & Sports',
    description: 'Golf, bowling, futsal, badminton courts, arcades',
    iconName: 'Trophy',
    color: 'var(--warning)'
  },
  {
    id: 'study',
    label: 'Study Spots',
    labelEn: 'Study Spots',
    iconName: 'BookOpen',
    color: 'var(--accent-fg)'
  },
  {
    id: 'services',
    label: 'Services',
    labelEn: 'Services (Laundry, Printing, Repairs)',
    description: 'Laundry, printing, repairs',
    iconName: 'Wrench',
    color: 'var(--text-muted)'
  },
  {
    id: 'events',
    label: 'Free Events & Promos',
    labelEn: 'Free Events & Promos',
    iconName: 'Sparkles',
    color: 'var(--expense)'
  }
];

/**
 * Spot Jimat Budget Tags
 */
export const SPOT_BUDGET_TAGS = [
  { id: 'under-rm5', label: 'Under RM5', labelMs: 'Bawah RM5', min: 0, max: 5 },
  { id: 'rm5-15', label: 'RM5 to RM15', labelMs: 'RM5 – RM15', min: 5.01, max: 15 },
  { id: 'rm15-30', label: 'RM15 to RM30', labelMs: 'RM15 – RM30', min: 15.01, max: 30 },
  { id: 'rm30-plus', label: 'RM30 and above', labelMs: 'RM30 ke atas', min: 30.01, max: Infinity }
];

/**
 * Derive budget tag automatically from a numeric price
 */
export function getBudgetTagForPrice(price) {
  const num = Number(price);
  if (isNaN(num) || num <= 5) return 'under-rm5';
  if (num <= 15) return 'rm5-15';
  if (num <= 30) return 'rm15-30';
  return 'rm30-plus';
}

/**
 * Demo Top-Up Sources (Simulated Banks & E-Wallets)
 */
export const DEMO_TOPUP_SOURCES = [
  { id: 'maybank2u', name: 'Maybank2u / MAE (Demo FPX)', type: 'bank', icon: '🏦' },
  { id: 'cimb', name: 'CIMB Clicks (Demo FPX)', type: 'bank', icon: '🏛️' },
  { id: 'bankislam', name: 'Bank Islam BIMB (Demo FPX)', type: 'bank', icon: '🕌' },
  { id: 'tng', name: "Touch 'n Go eWallet (Simulated)", type: 'ewallet', icon: '💳' },
  { id: 'grabpay', name: 'GrabPay Student (Simulated)', type: 'ewallet', icon: '🟢' },
  { id: 'duitnow', name: 'DuitNow Instant Transfer (Demo)', type: 'bank', icon: '⚡' }
];

