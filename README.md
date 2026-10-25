# KampusKash — Student Financial Tracker 🎓💰

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tests](https://img.shields.io/badge/Tests-34%20Passed-brightgreen)](package.json)

> **A modern, reliable, student-focused personal finance management platform** designed to track multi-account balances, daily campus expenses, category budgets, and savings goals in **Ringgit Malaysia (RM)** with real-time cloud synchronization and contextual guided onboarding.

🌐 **Live Demo:** [https://airilakio29.github.io/UFinance-Student-Financial-Tracker/](https://airilakio29.github.io/UFinance-Student-Financial-Tracker/)

---

## 🌟 Overview & Key Features

KampusKash solves the unique financial challenges college and university students face: managing allowances, part-time earnings, loans (e.g. PTPTN), hostel rent, food budgets, and semester savings goals across multiple bank accounts and e-wallets.

### 🏦 1. Multi-Account Foundation (Manual Phase 1)
- **Account Types Supported**: Savings, Current, E-Wallet (Touch 'n Go, GrabPay, Boost), Cash, Credit Card, and Other.
- **Account Management**: Create, edit, delete, and view individual balances and aggregate balance across all accounts.
- **Balance Synchronization**: Transactions linked to an account automatically adjust account balances without double counting.
- **Account Breakdown**: Dedicated Accounts view and Dashboard overview cards showing distribution of funds.

### 💳 2. Transaction Management & Safe Legacy Compatibility
- **Full CRUD Support**: Add, edit, delete income and expense transactions.
- **Account Linking**: Optionally associate transactions with specific accounts or leave as unassigned.
- **Legacy Compatibility**: Old transactions created without an `accountId` remain fully functional and are labeled as `Unassigned` without breaking historical balances.
- **Search & Advanced Filters**: Real-time filtering by search keywords (title, note, category), transaction type (Income/Expense), category, account, and date range.
- **Statement Exports**: Branded PDF reports (`jspdf` + `jspdf-autotable`) and CSV exports for external spreadsheet budgeting.

### 🎯 3. Monthly Category Budgets
- **Category Caps**: Set spending limits on categories such as Food & Dining, Hostel & Rent, and Books & Supplies.
- **Visual Alert States**:
  - 🟢 **On Track**: Normal consumption (< 80% used).
  - 🟡 **Approaching Limit**: Warning state (80% – 100% used).
  - 🔴 **Over Budget**: Visual limit breach indicator with exact excess amount in RM.
- **Quick Edit & Delete**: Manage budget limits with instantaneous progress recalculations.

### 🌱 4. Student Savings Milestones
- **Target Tracking**: Set goals for tuition fees, new laptops, emergency reserves, or semester trips.
- **Metrics**: Real-time calculation of saved amount, target amount, remaining amount in RM, and percentage achieved.
- **Deposit Workflow**: Quick deposits adjust goal progress and optionally log a corresponding expense record.
- **Goal Completion**: Celebratory visual state when 100% milestone is achieved.

### 📊 5. Reports & Analytics
- **Summary Metrics**: Total Income, Total Expenses, Net Cash Flow, and Savings Progress.
- **Category Distribution**: Bulletproof interactive SVG Donut Chart with hover tooltips and dynamic color indicators.
- **Monthly Trend Chart**: Responsive bar chart comparing monthly income vs. expenses over 3, 6, or 12 months.
- **Account Spending Distribution**: Breakdown showing expenditure by account or unassigned bucket.

### 🎨 6. Theme System & Dynamic Backgrounds
- **9 Curated Themes**: Velvet Dusk, Emerald Night, Royal Purple, Sunset Gold, Ocean Breeze, Cyberpunk, Rose Gold, Mint Fresh, and Clean Light.
- **Centralized Design Tokens**: Complete elimination of hardcoded colors in favor of CSS variables (`--primary`, `--bg-app`, `--bg-card`, `--border-light`, `--text-main`, `--income`, `--expense`).
- **Interactive Gemstone Canvas**: Subtle, high-performance HTML5 Canvas particle background generating sparkling crystals and theme-driven floating ambient particles.

### 🧭 7. Contextual 16-Step Guided Onboarding Tour
- **Non-blocking Interactive Tour**: Highlights actual UI elements with a pulsing spotlight and pointing arrow caret instead of opaque modal overlays.
- **16 Progressive Steps**: Covers Dashboard, Transactions, Modal Inputs, Categories, Accounts, Budgets, Savings Goals, Reports, and Theme Customization.
- **Per-User Persistence**: Tour completion status is stored in the authenticated user's Firestore document.
- **Replay Anytime**: Available directly from Settings.

### 👤 8. Sanitized User Profile & Authentication
- **Secure Authentication**: Firebase Email/Password registration, Login, Password Reset, and Google OAuth popup.
- **Clean Display Name Priority**:
  1. User saved profile username
  2. Firebase Auth displayName
  3. Clean name derived from email prefix
  4. Fallback "Student"
- **Zero Technical IDs**: Regex-based safeguards ensure Firebase UIDs, internal document IDs, and hex hashes are **never** displayed as visible usernames.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) (ESM) |
| **Styling & Theming** | Vanilla CSS Design Tokens, Dynamic CSS Variables, HTML5 Canvas |
| **Icons & UI** | [Lucide React](https://lucide.dev/) |
| **Document Generation** | [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| **Backend & Cloud** | [Google Firebase](https://firebase.google.com/) (Authentication & Cloud Firestore) |
| **Code Quality & Testing** | [Oxlint](https://oxc.rs/), Native Node.js Test Runner (`node:test`, `node:assert`) |
| **Hosting & CI/CD** | GitHub Pages / Vercel + GitHub Actions |

---

## 🏛️ System Architecture

```text
React 19 Client (UI Views & Components)
   │
   ▼
Context Providers (AuthContext, FinanceContext)
   │
   ▼
Service Layer (src/services/)
   ├── authService.js
   ├── accountService.js
   ├── transactionService.js
   ├── budgetService.js
   ├── savingsService.js
   ├── profileService.js
   └── settingsService.js
   │
   ▼
Firebase Cloud Firestore (users/{userId})
```

For complete architectural details and the planned Phase 2 AWS migration path, read the [Architecture Documentation](docs/architecture.md).

---

## 🔒 Security & Data Isolation Model

KampusKash enforces strict multi-tenant isolation at the database layer via Cloud Firestore Security Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
      match /{allPaths=**} {
        allow read, write: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- **Authentication Scoping**: No user can access or alter another student's accounts, transactions, or budgets.
- **Zero Sensitive Banking Credentials**: In accordance with Phase 1 guidelines, KampusKash does **NOT** ask for, scrape, or store bank passwords, PINs, OTPs, or login credentials.
- **Client Sanitization**: All frontend inputs are validated for non-negative balances, proper decimal formatting, and valid category associations.

---

## 📂 Project Structure

```text
UFinance-Student-Financial-Tracker/
├── docs/
│   └── architecture.md         # Architecture & AWS Migration Roadmap
├── public/                     # Favicons & static manifest
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AccountModal.jsx    # Account create/edit modal
│   │   ├── BudgetModal.jsx     # Category budget limit modal
│   │   ├── CategoryModal.jsx   # Custom category manager modal
│   │   ├── GlitterBackground.jsx # HTML5 Canvas ambient particle background
│   │   ├── Header.jsx          # App header with clean name & quick actions
│   │   ├── PieChart.jsx        # Bulletproof SVG donut spending chart
│   │   ├── SavingsModal.jsx    # Savings goal create/edit/deposit modal
│   │   ├── Sidebar.jsx         # Navigation drawer & quick-add action
│   │   ├── SplashScreen.jsx    # Smooth launch screen
│   │   ├── TransactionModal.jsx# Income/expense logging modal with account picker
│   │   └── Tutorial.jsx        # Contextual 16-step onboarding tour
│   ├── context/
│   │   ├── AuthContext.jsx     # User authentication state
│   │   └── FinanceContext.jsx  # Central financial store & sync
│   ├── services/               # Modular service layer (Phase 2 ready)
│   │   ├── accountService.js   # Account CRUD, validation, & balance logic
│   │   ├── authService.js      # Auth helpers & UID-safe user formatting
│   │   ├── budgetService.js    # Budget calculations & limit alerts
│   │   ├── profileService.js   # Profile persistence & sanitization
│   │   ├── savingsService.js   # Savings milestone progress calculations
│   │   ├── settingsService.js  # User preferences & tour completion
│   │   └── transactionService.js # Transaction logic, filters, & monthly aggregates
│   ├── utils/
│   │   ├── pdfExport.js        # PDF financial report generator
│   │   └── themeEngine.js      # Theme engine & design tokens
│   ├── views/                  # Primary screen views
│   │   ├── AccountsView.jsx    # Multi-account balance manager
│   │   ├── BudgetsView.jsx     # Category budget caps & usage
│   │   ├── DashboardView.jsx   # Hero financial overview & accounts summary
│   │   ├── ReportsView.jsx     # Financial analytics & trend charts
│   │   ├── SavingsView.jsx     # Savings targets & milestone tracker
│   │   ├── SettingsView.jsx    # Appearance, backup, & tour replay
│   │   └── TransactionsView.jsx# Filterable transaction table & search
│   ├── App.jsx                 # Application root & view switching
│   ├── Auth.jsx                # Registration, Login, & Google Auth screen
│   ├── firebase.js             # Firebase client configuration
│   └── index.css               # Design system & CSS tokens
├── test/
│   └── phase1.test.js          # Automated unit & integration test suite
├── firestore.rules             # Firestore security rules
├── package.json
└── vite.config.js
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher (v20+ recommended)
- `npm` v9.0.0 or higher

### 2. Clone and Install
```bash
git clone https://github.com/airilakio29/UFinance-Student-Financial-Tracker.git
cd UFinance-Student-Financial-Tracker
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Firebase credentials:
```bash
cp .env.example .env
```
Fill in the following variables:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server
```bash
npm run client
# or run client and server concurrently:
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Run Automated Tests
```bash
npm test
```

### 6. Run Code Linter
```bash
npm run lint
```

### 7. Production Build
```bash
npm run build
```

---

## 🛣️ Long-Term Roadmap

- [x] **Phase 1: Complete Product Foundation** *(Current)*
  - Full manual multi-account system (Savings, Current, E-wallet, Cash, Credit Card, Other)
  - Account-aware transactions with backward compatibility for legacy transactions
  - Accurate balance arithmetic (no double counting on create/edit/delete/transfer)
  - Reports & Analytics with monthly trends and account-based breakdowns
  - Budget caps with Normal / Approaching limit / Over-budget states
  - Savings goals with target, saved, remaining, and percentage calculations
  - Bulletproof SVG pie/donut chart (0, 1, 2+ categories)
  - Theme system with centralized CSS tokens and background decorations
  - Contextual guided tour with per-user persistence and replay
  - Clean profile names (guaranteed no Firebase UIDs / hashes displayed)
  - Firebase Authentication + Google Login + strict user data isolation
  - Modular service layer in `src/services/`
- [ ] **Phase 2: AWS Cloud Migration**
  - Amazon Cognito for identity federation
  - AWS API Gateway & Lambda microservices
  - DynamoDB single-table database migration
  - S3 + CloudFront CDN hosting
- [ ] **Phase 3: Advanced Multi-Account Financial Architecture**
  - Account reconciliation workflows
  - Inter-account balance transfers with audit history
  - Recurring scheduled transaction automation
- [ ] **Phase 4: Authorized Bank / Open Finance Integrations**
  - Official Open Banking API integrations (PayNet / DuitNow framework)
  - Read-only account synchronization under consent-driven authorization
  - Zero storage of banking credentials or passwords
- [ ] **Phase 5: AI Financial Assistant**
  - Amazon Bedrock conversational financial assistant
  - Smart student spending recommendations and budget forecasting
- [ ] **Phase 6: University / Campus Financial Platform**
  - Campus merchant integrations, student meal plan vouchers, club dues
- [ ] **Phase 7: Commercial Product**
  - Mobile application deployment and enterprise university administration portal

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
