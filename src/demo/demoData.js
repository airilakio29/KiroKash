/**
 * KiroKash Demo Mock Dataset Generator
 * Generates realistic Malaysian student financial data relative to today's date.
 * All amounts are in Ringgit Malaysia (RM).
 * 
 * DESIGN REQUIREMENT:
 * This dataset is strictly in-memory and must NEVER be persisted to Firestore or LocalStorage.
 */

export const DEMO_CATEGORIES = [
  { id: 'cat-1', name: 'Allowance', type: 'income', color: '#10B981', icon: 'Wallet' },
  { id: 'cat-2', name: 'Scholarship / Loan', type: 'income', color: '#059669', icon: 'Award' },
  { id: 'cat-3', name: 'Part-time Job', type: 'income', color: '#3B82F6', icon: 'Briefcase' },
  { id: 'cat-4', name: 'Tuition & Fees', type: 'expense', color: '#EF4444', icon: 'GraduationCap' },
  { id: 'cat-5', name: 'Hostel & Rent', type: 'expense', color: '#F59E0B', icon: 'Home' },
  { id: 'cat-6', name: 'Food & Dining', type: 'expense', color: '#8B5CF6', icon: 'Utensils' },
  { id: 'cat-7', name: 'Books & Supplies', type: 'expense', color: '#EC4899', icon: 'BookOpen' },
  { id: 'cat-8', name: 'Transport & Commute', type: 'expense', color: '#14B8A6', icon: 'Bus' },
  { id: 'cat-9', name: 'Entertainment & Leisure', type: 'expense', color: '#6366F1', icon: 'Film' }
];

export const DEMO_ACCOUNTS = [
  {
    accountId: 'acc-demo-maybank',
    accountName: 'Maybank Student Savings',
    institution: 'Maybank',
    accountType: 'savings',
    balance: 1240.00,
    currency: 'RM',
    source: 'manual',
    isDemo: true
  },
  {
    accountId: 'acc-demo-tng',
    accountName: 'Touch \'n Go eWallet',
    institution: 'Touch \'n Go',
    accountType: 'ewallet',
    balance: 86.50,
    currency: 'RM',
    source: 'manual',
    isDemo: true
  },
  {
    accountId: 'acc-demo-cash',
    accountName: 'Cash Reserves',
    institution: 'Physical Cash',
    accountType: 'cash',
    balance: 45.00,
    currency: 'RM',
    source: 'manual',
    isDemo: true
  }
];

export const DEMO_SAVINGS_GOALS = [
  {
    id: 's-demo-laptop',
    title: 'New Laptop',
    targetAmount: 1800,
    currentAmount: 720,
    targetDate: '2027-03-31',
    category: 'Education',
    isDemo: true
  },
  {
    id: 's-demo-emergency',
    title: 'Emergency Fund',
    targetAmount: 1000,
    currentAmount: 250,
    targetDate: '2026-12-31',
    category: 'Security',
    isDemo: true
  },
  {
    id: 's-demo-trip',
    title: 'Raya Trip',
    targetAmount: 300,
    currentAmount: 270,
    targetDate: '2027-04-15',
    category: 'Travel',
    isDemo: true
  }
];

export const DEMO_BUDGETS = [
  {
    id: 'b-demo-food',
    categoryId: 'cat-6', // Food & Dining: Limit RM 600, Spent RM 355.50 (59.3% -> Healthy)
    monthlyLimit: 600,
    isDemo: true
  },
  {
    id: 'b-demo-transport',
    categoryId: 'cat-8', // Transport: Limit RM 320, Spent RM 270.00 (84.4% -> Near limit warning)
    monthlyLimit: 320,
    isDemo: true
  },
  {
    id: 'b-demo-books',
    categoryId: 'cat-7', // Books & Supplies: Limit RM 200, Spent RM 231.50 (115.8% -> Over limit warning)
    monthlyLimit: 200,
    isDemo: true
  },
  {
    id: 'b-demo-leisure',
    categoryId: 'cat-9', // Entertainment: Limit RM 450, Spent RM 205.00 (45.6% -> Healthy)
    monthlyLimit: 450,
    isDemo: true
  }
];

/**
 * Format relative date helper: YYYY-MM-DD
 */
function getRelativeDateStr(baseDate, daysAgo = 0) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds the full realistic Malaysian student transactions list
 * Dates are distributed across the current month, previous month, and 2 months ago.
 */
export function generateDemoTransactions(baseDate = new Date()) {
  const txs = [
    // --- Current Month (M0): Recent days ---
    { title: 'Campus Kafeteria Lunch', amount: 9.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 0, note: 'Ayam kunyit with iced lemon tea' },
    { title: 'Kopi Kenangan Student Promo', amount: 11.90, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 1, note: 'Study fuel before lecture' },
    { title: 'Petronas Primax 95 Fuel', amount: 20.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-cash', daysAgo: 1, note: 'Motorcycle tank refill' },
    { title: 'Nasi Kandar Pelita Dinner', amount: 14.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 2, note: 'Dinner with project mates' },
    { title: 'Logitech Wireless Mouse & Mat', amount: 89.00, type: 'expense', categoryId: 'cat-7', accountId: 'acc-demo-maybank', daysAgo: 3, note: 'Ergonomic mouse for programming assignments' },
    { title: 'Monthly Allowance from Parents', amount: 800.00, type: 'income', categoryId: 'cat-1', accountId: 'acc-demo-maybank', daysAgo: 4, note: 'Maybank direct transfer' },
    { title: 'GrabFood Mamak Suprimo', amount: 24.80, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 4, note: 'Late night assignment craving' },
    { title: 'Peer Tutoring (Data Structures)', amount: 80.00, type: 'income', categoryId: 'cat-3', accountId: 'acc-demo-tng', daysAgo: 5, note: '2-hour weekend coding guidance session' },
    { title: 'RapidKL Student Concession Pass', amount: 50.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-tng', daysAgo: 6, note: 'Monthly unlimited LRT / MRT pass' },
    { title: 'Hostel Room Rental Share', amount: 250.00, type: 'expense', categoryId: 'cat-5', accountId: 'acc-demo-maybank', daysAgo: 7, note: 'Shared student room off-campus' },
    { title: 'Subway Sandwich Wrap Combo', amount: 16.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 8, note: 'Quick lunch between labs' },
    { title: 'Spotify Premium Student Plan', amount: 8.50, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 9, note: 'Student discount subscription' },
    { title: 'Tealive Roasted Milk Tea', amount: 9.90, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 10, note: 'Post-presentation reward' },
    { title: 'Grab Car to KTM Station', amount: 18.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-tng', daysAgo: 11, note: 'Raining heavily, shared with coursemate' },
    { title: 'GSC Cinema Movie Ticket & Popcorn', amount: 28.50, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-tng', daysAgo: 12, note: 'Friday night outing' },
    { title: 'Popular Bookstore Lecture Pads', amount: 18.00, type: 'expense', categoryId: 'cat-7', accountId: 'acc-demo-cash', daysAgo: 13, note: 'A4 grid notepads and pilot gel pens' },
    { title: 'Campus Cafe Fried Rice', amount: 8.00, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 14, note: 'Lunch at block V cafe' },
    { title: 'CelcomDigi Postpaid Student 5G', amount: 35.00, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 15, note: 'High speed hotspot for dorm' },
    { title: 'FamilyMart Oden & Onigiri', amount: 13.60, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 16, note: 'Dinner after tutorial lab' },
    { title: 'Motorcycle Chain Lube & Service', amount: 12.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-cash', daysAgo: 17, note: 'Routine chain maintenance' },
    { title: 'Campus Cafe Nasi Lemak Telur', amount: 6.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 18, note: 'Breakfast before 8 AM class' },
    { title: 'Steam Game Sale: Indie Co-op', amount: 28.00, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 19, note: 'Weekend game session' },
    { title: 'Mamak Teh Tarik & Roti Telur', amount: 7.20, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 20, note: 'Supper group study' },
    { title: 'A4 Printing & Binding for Project', amount: 17.00, type: 'expense', categoryId: 'cat-7', accountId: 'acc-demo-tng', daysAgo: 21, note: 'Midterm milestone documentation' },
    { title: 'McD McChicken Value Meal', amount: 13.90, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 22, note: 'Quick study snack' },

    // --- Previous Month (M-1): ~23 to 55 days ago ---
    { title: 'Monthly Allowance from Parents', amount: 800.00, type: 'income', categoryId: 'cat-1', accountId: 'acc-demo-maybank', daysAgo: 32, note: 'Monthly living allowance' },
    { title: 'PTPTN Semester Education Loan', amount: 1500.00, type: 'income', categoryId: 'cat-2', accountId: 'acc-demo-maybank', daysAgo: 35, note: 'Semester living disbursement' },
    { title: 'Hostel Room Rental Share', amount: 250.00, type: 'expense', categoryId: 'cat-5', accountId: 'acc-demo-maybank', daysAgo: 36, note: 'Monthly rent' },
    { title: 'Campus Lab Safety & Guild Fee', amount: 75.00, type: 'expense', categoryId: 'cat-4', accountId: 'acc-demo-maybank', daysAgo: 37, note: 'Semester club and lab fee' },
    { title: 'Campus Event Tech Crew Honorarium', amount: 120.00, type: 'income', categoryId: 'cat-3', accountId: 'acc-demo-maybank', daysAgo: 38, note: 'AV and stage setup weekend' },
    { title: 'Algorithm & Data Structure Textbook', amount: 65.00, type: 'expense', categoryId: 'cat-7', accountId: 'acc-demo-maybank', daysAgo: 39, note: 'Second hand senior textbook' },
    { title: 'RapidKL Student Concession Pass', amount: 50.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-tng', daysAgo: 40, note: 'Monthly public transit' },
    { title: 'Nasi Kandar Ayam Bawang Dinner', amount: 15.00, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 41, note: 'Restoran Al-Falah' },
    { title: 'Grocery Run: Oats, Milk, Eggs', amount: 48.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 42, note: 'Lotus Groceries' },
    { title: 'Petronas Petrol Refill', amount: 20.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-cash', daysAgo: 43, note: 'RON95 full tank' },
    { title: 'Mamak Roti Canai Banjir (2x)', amount: 6.80, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 44, note: 'Breakfast' },
    { title: 'Spotify Premium Student Plan', amount: 8.50, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 45, note: 'Monthly subscription' },
    { title: 'Campus Cafeteria Lunch', amount: 9.00, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 46, note: 'Chicken rice' },
    { title: 'CelcomDigi Postpaid Student 5G', amount: 35.00, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 47, note: 'Monthly data' },
    { title: 'KFC Snack Plate Combo', amount: 19.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 48, note: 'Treat after exam' },
    { title: 'Grab Ride from Campus to Mall', amount: 14.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-tng', daysAgo: 49, note: 'Weekend outing' },
    { title: 'Watsons Multivitamins & Panadol', amount: 28.00, type: 'expense', categoryId: 'cat-7', accountId: 'acc-demo-tng', daysAgo: 50, note: 'Health essentials during flu' },
    { title: 'Zus Coffee Iced Spanish Latte', amount: 12.80, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 51, note: 'Study treat' },
    { title: 'Campus Laundry Washer & Dryer', amount: 12.00, type: 'expense', categoryId: 'cat-5', accountId: 'acc-demo-cash', daysAgo: 52, note: 'Dorm self-service laundry' },
    { title: 'Texas Chicken 2pc Combo', amount: 18.20, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 53, note: 'Dinner' },
    { title: 'Stationery Refills & Sticky Notes', amount: 14.50, type: 'expense', categoryId: 'cat-7', accountId: 'acc-demo-cash', daysAgo: 54, note: 'Revision materials' },

    // --- Two Months Ago (M-2): ~58 to 85 days ago ---
    { title: 'Monthly Allowance from Parents', amount: 800.00, type: 'income', categoryId: 'cat-1', accountId: 'acc-demo-maybank', daysAgo: 62, note: 'Maybank fund transfer' },
    { title: 'Hostel Room Rental Share', amount: 250.00, type: 'expense', categoryId: 'cat-5', accountId: 'acc-demo-maybank', daysAgo: 63, note: 'Room rent share' },
    { title: 'UI/UX Mobile Wireframe Gig', amount: 150.00, type: 'income', categoryId: 'cat-3', accountId: 'acc-demo-maybank', daysAgo: 65, note: 'Freelance student commission' },
    { title: 'RapidKL Student Concession Pass', amount: 50.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-tng', daysAgo: 66, note: 'Public transit' },
    { title: 'Campus Cafeteria Lunch Bowl', amount: 8.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 67, note: 'Lunch' },
    { title: 'Spotify Premium Student Plan', amount: 8.50, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 68, note: 'Subscription' },
    { title: 'Petronas Petrol RON95 Refill', amount: 20.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-cash', daysAgo: 70, note: 'Motorcycle petrol' },
    { title: 'CelcomDigi Postpaid Student 5G', amount: 35.00, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-maybank', daysAgo: 72, note: 'Monthly plan' },
    { title: 'Mamak Maggi Goreng & Milo Ais', amount: 11.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-cash', daysAgo: 73, note: 'Supper with friends' },
    { title: 'Subway Italian BMT 6-inch', amount: 17.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 75, note: 'Dinner' },
    { title: 'Barber Haircut Student Rate', amount: 18.00, type: 'expense', categoryId: 'cat-9', accountId: 'acc-demo-cash', daysAgo: 77, note: 'Campus salon haircut' },
    { title: 'Campus Cafeteria Lunch', amount: 9.00, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 79, note: 'Economy rice' },
    { title: 'Lotus Supermarket Bulk Snacks', amount: 32.40, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 81, note: 'Biscuits, Milo sachet, tea' },
    { title: 'Boba Tea Chatime Milk Tea', amount: 10.50, type: 'expense', categoryId: 'cat-6', accountId: 'acc-demo-tng', daysAgo: 83, note: 'Weekend drink' },
    { title: 'KTM Komuter Trip to KL Sentral', amount: 16.00, type: 'expense', categoryId: 'cat-8', accountId: 'acc-demo-tng', daysAgo: 85, note: 'Weekend trip home' }
  ];

  return txs.map((tx, idx) => ({
    id: `tx-demo-${idx + 1}`,
    title: tx.title,
    amount: Number(tx.amount),
    type: tx.type,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    date: getRelativeDateStr(baseDate, tx.daysAgo),
    source: 'manual',
    isRecurring: tx.daysAgo % 30 === 0 && tx.amount >= 50,
    note: tx.note || '',
    isDemo: true,
    createdAt: new Date(baseDate.getTime() - (tx.daysAgo * 86400000)).toISOString(),
    updatedAt: new Date(baseDate.getTime() - (tx.daysAgo * 86400000)).toISOString()
  }));
}

/**
 * Generates the complete, self-contained mock financial bundle.
 * Purely in-memory; numbers are guaranteed internally consistent.
 */
export function generateDemoDataset(baseDate = new Date()) {
  const transactions = generateDemoTransactions(baseDate);
  const categories = [...DEMO_CATEGORIES];
  const accounts = [...DEMO_ACCOUNTS];
  const budgets = [...DEMO_BUDGETS];
  const savingsGoals = [...DEMO_SAVINGS_GOALS];

  return {
    categories,
    accounts,
    budgets,
    savingsGoals,
    transactions,
    generatedAt: baseDate.toISOString()
  };
}
