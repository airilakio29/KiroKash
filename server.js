import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Load local .env file securely if present (without exposing keys to client)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // .env may not exist in production / cloud environments where env vars are injected directly
}
import {
  handleAIChatRequest,
  handleFinancialInsightsRequest,
  handleBudgetRecommendationRequest,
  handleSavingsPlanRequest,
  handleExecuteActionRequest,
  handleCancelActionRequest,
  handleActionHistoryRequest
} from './functions/src/ai/chatFunction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure compatibility with Vercel serverless rewrites (whether /api prefix is stripped or preserved)
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/assets')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'KiroKash API',
    currency: 'MYR (RM)',
    aiAssistant: 'KampusKash AI Financial Intelligence (Groq LPU)',
    aiProvider: 'groq',
    timestamp: new Date().toISOString()
  });
});

// KampusKash AI Chat Assistant Endpoint (Secure Firebase & Groq LPU Backend)
app.post('/api/ai/chat', async (req, res) => {
  await handleAIChatRequest(req, res);
});

// KampusKash AI Financial Intelligence Insights Endpoint
app.post('/api/ai/insights', async (req, res) => {
  await handleFinancialInsightsRequest(req, res);
});

// KampusKash AI Personalized Budget Recommendation Endpoint
app.post('/api/ai/budget-recommendation', async (req, res) => {
  await handleBudgetRecommendationRequest(req, res);
});

// KampusKash AI Savings Feasibility Planner Endpoint
app.post('/api/ai/savings-plan', async (req, res) => {
  await handleSavingsPlanRequest(req, res);
});

// KampusKash AI Action Execution Endpoint (Feature 6: Action Execution Backend)
app.post('/api/ai/action/execute', async (req, res) => {
  await handleExecuteActionRequest(req, res);
});

// KampusKash AI Action Cancellation Endpoint
app.post('/api/ai/action/cancel', async (req, res) => {
  await handleCancelActionRequest(req, res);
});

// KampusKash AI Action History Endpoint (Feature 7: Action History)
app.get('/api/ai/action/history', async (req, res) => {
  await handleActionHistoryRequest(req, res);
});

// Default initial dataset endpoint for initial seeding or hard resets
app.get('/api/initial-data', (req, res) => {
  res.json({
    user: {
      username: "Alex Student",
      email: "alex.campus@university.edu.my",
      isGuest: true,
      currency: "RM"
    },
    categories: [
      { id: "cat-1", name: "Allowance", type: "income", color: "#10B981", icon: "Wallet" },
      { id: "cat-2", name: "Scholarship / Loan", type: "income", color: "#059669", icon: "Award" },
      { id: "cat-3", name: "Part-time Job", type: "income", color: "#3B82F6", icon: "Briefcase" },
      { id: "cat-4", name: "Tuition & Fees", type: "expense", color: "#EF4444", icon: "GraduationCap" },
      { id: "cat-5", name: "Hostel & Rent", type: "expense", color: "#F59E0B", icon: "Home" },
      { id: "cat-6", name: "Food & Dining", type: "expense", color: "#8B5CF6", icon: "Utensils" },
      { id: "cat-7", name: "Books & Stationeries", type: "expense", color: "#EC4899", icon: "BookOpen" },
      { id: "cat-8", name: "Transport & Commute", type: "expense", color: "#14B8A6", icon: "Bus" },
      { id: "cat-9", name: "Entertainment & Leisure", type: "expense", color: "#6366F1", icon: "Film" }
    ],
    transactions: [
      {
        id: "tx-1",
        date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        title: "PTPTN / Scholarship Disbursement",
        amount: 2500.00,
        type: "income",
        categoryId: "cat-2",
        isRecurring: false,
        note: "Semester allowance disbursement"
      },
      {
        id: "tx-2",
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        title: "Monthly Family Allowance",
        amount: 850.00,
        type: "income",
        categoryId: "cat-1",
        isRecurring: true,
        note: "Bank transfer from parents"
      },
      {
        id: "tx-3",
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        title: "Semester Tuition Fee Deposit",
        amount: 1200.00,
        type: "expense",
        categoryId: "cat-4",
        isRecurring: false,
        note: "Paid via Student Portal"
      },
      {
        id: "tx-4",
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        title: "Campus Hostel Rent",
        amount: 350.00,
        type: "expense",
        categoryId: "cat-5",
        isRecurring: true,
        note: "Monthly room rental"
      },
      {
        id: "tx-5",
        date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        title: "Campus Cafeteria Meals",
        amount: 42.50,
        type: "expense",
        categoryId: "cat-6",
        isRecurring: false,
        note: "Lunch & Dinner with friends"
      },
      {
        id: "tx-6",
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        title: "Reference Textbooks & Printing",
        amount: 85.00,
        type: "expense",
        categoryId: "cat-7",
        isRecurring: false,
        note: "CS101 Course Materials"
      },
      {
        id: "tx-7",
        date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
        title: "RapidKL Bus Pass Reload",
        amount: 50.00,
        type: "expense",
        categoryId: "cat-8",
        isRecurring: true,
        note: "Monthly Touch 'n Go reload"
      }
    ],
    budgets: [
      { id: "b-1", categoryId: "cat-6", monthlyLimit: 450.00 }, // Food
      { id: "b-2", categoryId: "cat-5", monthlyLimit: 400.00 }, // Hostel
      { id: "b-3", categoryId: "cat-8", monthlyLimit: 100.00 }, // Transport
      { id: "b-4", categoryId: "cat-9", monthlyLimit: 150.00 }  // Entertainment
    ],
    savings: [
      {
        id: "s-1",
        title: "New Laptop for Programming",
        targetAmount: 3200.00,
        currentAmount: 1850.00,
        targetDate: "2026-12-31",
        category: "Tech"
      },
      {
        id: "s-2",
        title: "Emergency Campus Fund",
        targetAmount: 1000.00,
        currentAmount: 650.00,
        targetDate: "2026-11-15",
        category: "Safety"
      }
    ]
  });
});

// Serve static assets in production mode if dist folder exists
app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.send("Student Financial Tracker Backend is running on port " + PORT + ". Run 'npm run dev' to access Vite frontend.");
    }
  });
});

// Only start listener when running as standalone Node process (not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[KiroKash Node Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
