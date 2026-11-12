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
 * Dedicated Pay Section (QR & Instant Transfer)
 * Change PAY_SECTION_NAME here to rename across sidebar, routes, headers, and tabs.
 */
export const PAY_SECTION_NAME = 'Pay';
export const PAY_SECTION_SUBTITLE = 'QR payment, instant transfers, money requests & bill splitting';
export const PAY_ROUTES = ['/pay', '/pay/scan', '/pay/my-qr', '/pay/transfer', '/pay/request', '/pay/history'];

/**
 * KampusKash Connect — Phase 1: Friends & User Profiles
 */
export const CONNECT_SECTION_NAME = 'Connect';
export const CONNECT_SECTION_SUBTITLE = 'Discover campus peers, build mutual friendships, join student groups, savings challenges & communities';
export const CONNECT_ROUTES = [
  '/connect',
  '/connect/friends',
  '/connect/requests',
  '/connect/discover',
  '/connect/privacy',
  '/connect/groups',
  '/connect/challenges',
  '/connect/communities',
  '/connect/leaderboards'
];

/**
 * KampusKash Connect — Phase 2: Real-Time Messenger
 */
export const MESSAGES_SECTION_NAME = 'Messages';
export const MESSAGES_SECTION_SUBTITLE = 'Private real-time chat with your connected campus friends';
export const MESSAGES_ROUTES = ['/messages', '/connect/messages'];

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  LOCATION: 'location',
  SYSTEM: 'system',
  PAYMENT: 'payment', // Reserved for Phase 3
  VOICE: 'voice', // Reserved for future compatibility
  GROUP_CHALLENGE: 'group_challenge' // Reserved for future compatibility
};

export const MESSAGE_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '🙏'];
export const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_CHAT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const TYPING_INDICATOR_EXPIRY_MS = 4000;
export const MESSAGES_PAGE_SIZE = 25;

/**
 * Available Student Achievement Badges for Social Profiles & Gamification (Phase 1 + Phase 4)
 */
export const PROFILE_ACHIEVEMENTS = [
  { id: 'smart_saver', label: 'Smart Saver', description: 'Consistent monthly budget keeper', icon: 'PiggyBank', points: 60 },
  { id: 'spot_hunter', label: 'Spot Jimat Hunter', description: 'Shared campus deals with peers', icon: 'Compass', points: 50 },
  { id: 'streak_master', label: '7-Day Tracker Streak', description: 'Logged expenses for a full week', icon: 'Flame', points: 75 },
  { id: 'campus_connector', label: 'Campus Connector', description: 'Connected with fellow students', icon: 'Users', points: 50 },
  { id: 'goal_crusher', label: 'Goal Crusher', description: 'Reached a student savings milestone', icon: 'Trophy', points: 100 },
  { id: 'early_adopter', label: 'KampusKash Pioneer', description: 'Early member of KampusKash Connect', icon: 'Sparkles', points: 40 },
  // Phase 4 Gamification Achievements
  { id: 'first_savings_challenge', label: 'First Savings Challenge', description: 'Created or joined your first group savings challenge', icon: 'Target', points: 50 },
  { id: 'consistent_saver', label: 'Consistent Saver', description: 'Logged 3+ declared progress updates in savings challenges', icon: 'TrendingUp', points: 100 },
  { id: 'budget_master', label: 'Budget Master', description: 'Demonstrated disciplined financial habits & challenge commitment', icon: 'Award', points: 120 },
  { id: 'challenge_completed', label: 'Challenge Completed', description: 'Reached 100% of a group or personal savings challenge target', icon: 'Trophy', points: 200 },
  { id: 'helpful_friend', label: 'Helpful Friend', description: 'Settled group split bills and contributed to student communities', icon: 'HeartHandshake', points: 80 }
];

export const SAVINGS_CHALLENGE_DISCLAIMER =
  'DECLARED SAVINGS CHALLENGE — SELF-REPORTED PROGRESS ONLY — NOT AN ACTUAL DEPOSIT & NO REAL OR DEMO FUNDS DEDUCTED';

export const COMMUNITY_GUIDELINES = [
  'Be respectful, supportive, and constructive with fellow students across all universities.',
  'Never share private bank account numbers, passwords, TAC/OTP codes, or sensitive personal financial records.',
  'No spam, commercial scams, unlicensed money-lending, or misleading financial promotions.',
  'Report inappropriate posts or comments so community administrators can review and remove violations.'
];

export const DEFAULT_STUDENT_COMMUNITIES = [
  {
    id: 'comm_utp_students',
    name: 'UTP Students',
    category: 'Campus',
    icon: '🎓',
    description: 'Campus life, Village hostel updates, academic tips, and ride-sharing for Universiti Teknologi PETRONAS students.'
  },
  {
    id: 'comm_budget_travel',
    name: 'Budget Travel',
    category: 'Lifestyle',
    icon: '🚆',
    description: 'Student backpacking itineraries, KTMB/ETS student pass tips, and affordable weekend getaways under RM150.'
  },
  {
    id: 'comm_student_cooking',
    name: 'Student Cooking',
    category: 'Food',
    icon: '🍳',
    description: 'Dorm-friendly rice-cooker recipes, RM5 meal prep ideas, and cheap grocery hauls for campus students.'
  },
  {
    id: 'comm_savings_club',
    name: 'Savings Club',
    category: 'Finance',
    icon: '🐷',
    description: 'Group savings accountability, emergency fund milestones, and student 30-day no-spend challenges.'
  },
  {
    id: 'comm_financial_literacy',
    name: 'Financial Literacy',
    category: 'Finance',
    icon: '📚',
    description: 'PTPTN/scholarship planning, ASB & student budgeting basics, scam prevention, and smart money habits.'
  },
  {
    id: 'comm_university_life',
    name: 'University Life',
    category: 'Campus',
    icon: '🏛️',
    description: 'Inter-varsity clubs, hackathon teammates, internship advice, study spots, and general student discussions.'
  }
];

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

