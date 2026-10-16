/**
 * KiroKash Tutorial Service
 * Central definition of tour steps, walkthrough milestones, and helpers.
 */

export const TOUR_STEPS = [
  {
    id: 'welcome',
    targetSelector: '[data-tour="dashboard-metrics"]',
    tab: 'dashboard',
    title: 'Welcome to KiroKash',
    description: 'Your all-in-one student financial command center. These are sample student numbers to show how your metrics look. Yours will fill up as you add everyday transactions.',
    iconName: 'LayoutDashboard',
    preferredPosition: 'bottom'
  },
  {
    id: 'student-identity',
    targetSelector: '[data-tour="motto-banner"], [data-tour="header-greeting"]',
    tab: 'dashboard',
    title: 'Student Identity & Financial Motto',
    description: 'Personalize your financial mindset! Your custom motto (e.g. "CS Student | Saving for a laptop") and campus affiliation are displayed here to keep you inspired every day.',
    iconName: 'Sparkles',
    preferredPosition: 'bottom'
  },
  {
    id: 'my-accounts',
    targetSelector: '[data-tour="accounts"], [data-tour="nav-accounts"]',
    tab: 'dashboard',
    title: 'My Accounts & Balances',
    description: 'Keep tabs on all your funds across CIMB, MAE/Maybank, Bank Islam, cash reserves, and Touch \'n Go e-wallets. These sample cards demonstrate automatic balance updates across multiple accounts.',
    iconName: 'Landmark',
    preferredPosition: 'top'
  },
  {
    id: 'spending-breakdown',
    targetSelector: '[data-tour="category-chart"]',
    tab: 'dashboard',
    title: 'Category Spending Breakdown',
    description: 'See exactly where your money goes in real-time. This interactive color-coded chart categorizes sample student living costs — from food and campus transport to study materials.',
    iconName: 'PieChart',
    preferredPosition: 'top'
  },
  {
    id: 'export-pdf',
    targetSelector: '[data-tour="export-pdf-btn"]',
    tab: 'dashboard',
    title: 'One-Click PDF Statement',
    description: 'Generate a clean, printable PDF financial report on demand — perfect for sharing with parents or scholarship sponsors. (Export is paused during tutorial mode).',
    iconName: 'FileText',
    preferredPosition: 'bottom'
  },
  {
    id: 'transactions-nav',
    targetSelector: '[data-tour="nav-transactions"]',
    tab: 'transactions',
    title: 'Transaction Records & Smart Search',
    description: 'Explore your complete transaction ledger. Notice how search and filters work with sample entries. You can filter expenses, income, or specific accounts with one click.',
    iconName: 'ReceiptText',
    preferredPosition: 'right'
  },
  {
    id: 'add-transaction',
    targetSelector: '[data-tour="transactions-add-btn"], [data-tour="add-transaction"]',
    tab: 'transactions',
    title: 'Record Income & Expenses',
    description: 'Quickly log campus expenses, part-time wages, or allowance. Feel free to try adding a transaction now — in tutorial mode it writes safely to sample memory and disappears after.',
    iconName: 'PlusCircle',
    preferredPosition: 'bottom'
  },
  {
    id: 'budgets-nav',
    targetSelector: '[data-tour="nav-budgets"]',
    tab: 'budgets',
    title: 'Category Budgets & Limit Warnings',
    description: 'Set monthly spending caps for food, transport, or leisure. Sample budgets illustrate active limits, approaching warnings (yellow 80%+), and over-budget alerts (red).',
    iconName: 'Target',
    preferredPosition: 'right'
  },
  {
    id: 'savings-nav',
    targetSelector: '[data-tour="nav-savings"]',
    tab: 'savings',
    title: 'Student Savings Goals',
    description: 'Save towards what matters most — a new laptop, emergency fund, or trip. Try depositing sample funds to see progress percentages and remaining targets update live.',
    iconName: 'PiggyBank',
    preferredPosition: 'right'
  },
  {
    id: 'reports-nav',
    targetSelector: '[data-tour="nav-reports"]',
    tab: 'reports',
    title: 'Reports & Trend Analytics',
    description: 'Gain deep financial insights with multi-month cashflow bar charts, net savings calculations, and spending breakdown across all your linked student accounts.',
    iconName: 'BarChart3',
    preferredPosition: 'right'
  },
  {
    id: 'profile-customization',
    targetSelector: '[data-tour="settings-profile-card"], [data-tour="sidebar-profile-card"], [data-tour="profile-btn"]',
    tab: 'settings',
    title: 'Student Profile & Avatar Customizer',
    description: 'Express your campus persona! Pick from 8 modern preset avatars (Scholar, Techie, Smart Saver, Creative, etc.) or upload your photo (<2MB). Your profile stays 100% real.',
    iconName: 'User',
    preferredPosition: 'top'
  },
  {
    id: 'theme-selector',
    targetSelector: '[data-tour="theme-selector"]',
    tab: 'settings',
    title: 'Dark Royal Aesthetic & Themes',
    description: 'Personalize your workspace with curated themes like Dark Royal Gemstone, Midnight Emerald, and Crimson Velvet, or customize fine-tuned color accents.',
    iconName: 'Palette',
    preferredPosition: 'top'
  },
  {
    id: 'data-backup-replay',
    targetSelector: '[data-tour="replay-tutorial-btn"], [data-tour="backup-manager"]',
    tab: 'settings',
    title: 'Data Backup & Tutorial Replay',
    description: 'Keep full control of your financial data with JSON export and import. You can replay this interactive tutorial anytime from Settings whenever you need a tour.',
    iconName: 'BookOpen',
    preferredPosition: 'top'
  },
  {
    id: 'finish',
    targetSelector: null,
    tab: 'dashboard',
    title: "You're all set! 🎓",
    description: "Tutorial finished. We're switching you back to your real account, which starts empty. Add your first transaction to get started.",
    iconName: 'Check',
    preferredPosition: 'center'
  }
];

export function getTourStepById(id) {
  return TOUR_STEPS.find(step => step.id === id);
}

export function getTotalTourSteps() {
  return TOUR_STEPS.length;
}
