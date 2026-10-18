import * as jspdfModule from 'jspdf';
import * as autoTableModule from 'jspdf-autotable';

const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;
const autoTable = autoTableModule.default || autoTableModule;

export function generateFinancialPDF({ transactions, categories, totalBalance, totalIncome, totalExpense, totalSavedInGoals, user }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const timestamp = new Date().toLocaleString('en-MY', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // KampusKash Purple Theme Color Palette
  const primaryColor = [98, 72, 115]; // #624873 KampusKash Purple
  const darkHeaderBg = [42, 31, 53]; // #2A1F35 Deep Purple Dark
  const accentPurple = [126, 90, 155]; // #7E5A9B Soft Purple
  const incomeColor = [40, 167, 69]; // Emerald/Green for Income
  const expenseColor = [231, 76, 60]; // Rose Red for Expense
  const textColor = [51, 65, 85]; // Slate 700

  // 1. Header Graphic Banner (KampusKash Theme)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 28, 'F');

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('KAMPUSKASH', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Student Financial Statement & Transaction Report', 14, 21);

  // Sub-header Right Info
  doc.setFontSize(9);
  doc.text('CURRENCY: MYR (RM)', 196, 14, { align: 'right' });
  doc.text(`DATE: ${new Date().toISOString().split('T')[0]}`, 196, 21, { align: 'right' });

  // 2. User & Report Metadata Graphic Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 24, 3, 3, 'FD');

  doc.setTextColor(...darkHeaderBg);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('STUDENT PROFILE & STATEMENT METADATA', 18, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);

  // Left Column: User details
  const studentName = user?.username || 'Student';
  const studentEmail = user?.email || '-';
  const institution = user?.university || 'Campus Student';
  const accountType = 'Authenticated Student';

  doc.text(`Student Name: ${studentName}`, 18, 47);
  doc.text(`Email Address: ${studentEmail}`, 18, 52.5);

  // Right Column: Institution & Timestamp
  doc.text(`Institution: ${institution} (${accountType})`, 110, 47);
  doc.text(`Generated On: ${timestamp}`, 110, 52.5);

  // 3. Key Financial Summary Cards (KampusKash Visual Metric Cards)
  const cardY = 64;
  const cardWidth = 42.5;
  const cardHeight = 22;
  const cardGap = 4;

  const metrics = [
    { title: 'Total Balance', value: `RM ${totalBalance.toFixed(2)}`, color: totalBalance >= 0 ? primaryColor : expenseColor },
    { title: 'Total Income', value: `RM ${totalIncome.toFixed(2)}`, color: incomeColor },
    { title: 'Total Expense', value: `RM ${totalExpense.toFixed(2)}`, color: expenseColor },
    { title: 'Saved Goals', value: `RM ${totalSavedInGoals.toFixed(2)}`, color: accentPurple }
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (cardWidth + cardGap);
    
    // Outer Border & Fill
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    // Colored Accent Line on top of metric card
    doc.setFillColor(...m.color);
    doc.rect(x, cardY, cardWidth, 2, 'F');

    // Card Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title.toUpperCase(), x + 4, cardY + 8);

    // Card Value
    doc.setFontSize(10);
    doc.setTextColor(...m.color);
    doc.text(m.value, x + 4, cardY + 16);
  });

  // 4. Section Header for Transaction Records
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkHeaderBg);
  doc.text('TRANSACTION RECORDS SUMMARY', 14, 95);

  doc.setLineWidth(0.5);
  doc.setDrawColor(...primaryColor);
  doc.line(14, 97, 196, 97);

  // 5. Transaction Table Construction
  const tableHeaders = [['#', 'Date', 'Title & Note', 'Category', 'Type', 'Amount (RM)']];
  
  const tableData = transactions.map((t, index) => {
    const cat = categories.find(c => c.id === t.categoryId);
    const categoryName = cat ? cat.name : 'Uncategorized';
    const isIncome = t.type === 'income';
    const amountStr = `${isIncome ? '+' : '-'} RM ${t.amount.toFixed(2)}`;
    const titleWithNote = t.note ? `${t.title}\n(${t.note})` : t.title;

    return [
      (index + 1).toString(),
      t.date,
      titleWithNote,
      categoryName,
      t.type.toUpperCase(),
      amountStr
    ];
  });

  autoTable(doc, {
    startY: 101,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 8.5
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 68 },
      3: { cellWidth: 35 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 29, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const cellText = data.cell.raw || '';
        if (cellText.startsWith('+')) {
          data.cell.styles.textColor = incomeColor;
        } else {
          data.cell.styles.textColor = expenseColor;
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 20 }
  });

  // 6. Page Numbers and Footer Info
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);

    doc.text('KampusKash — Your Friendly Campus Wallet | Official Statement Export', 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  // Trigger browser download
  const dateStamp = new Date().toISOString().split('T')[0];
  if (typeof window !== 'undefined' && doc.save) {
    try {
      doc.save(`kampuskash_report_${dateStamp}.pdf`);
    } catch {}
  }
  return doc;
}

/**
 * Generate KampusKash AI Monthly Financial Intelligence PDF Statement
 */
export function generateMonthlyIntelligencePDF({ reportData = {}, user = {} }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const timestamp = new Date().toLocaleString('en-MY', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const primaryColor = [98, 72, 115]; // #624873 KampusKash Purple
  const darkHeaderBg = [42, 31, 53]; // #2A1F35 Deep Purple Dark
  const accentPurple = [126, 90, 155]; // #7E5A9B
  const incomeColor = [40, 167, 69]; // Emerald/Green
  const expenseColor = [231, 76, 60]; // Rose Red
  const textColor = [51, 65, 85]; // Slate 700

  const month = reportData.month || new Date().toISOString().slice(0, 7);
  const cashFlow = reportData.cashFlow || {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    savingsRate: 0,
    dailyAverageSpending: 0,
    categoryExpenses: [],
    weeklyDistribution: []
  };
  const comparison = reportData.monthComparison || null;
  const trends = reportData.trends || {};
  const budgets = Array.isArray(reportData.budgets) ? reportData.budgets : [];

  // 1. Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('KAMPUSKASH AI — FINANCIAL INTELLIGENCE REPORT', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Monthly Spending Analysis & Smart Advisory • Statement Period: ${month}`, 14, 21);

  doc.setFontSize(9);
  doc.text('CURRENCY: MYR (RM)', 196, 13, { align: 'right' });
  doc.text(`DATE: ${new Date().toISOString().split('T')[0]}`, 196, 21, { align: 'right' });

  // 2. Student Profile Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 22, 2.5, 2.5, 'FD');

  doc.setTextColor(...darkHeaderBg);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STUDENT PROFILE & STATEMENT DETAILS', 18, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  const studentName = user?.username || 'KampusKash Student';
  const studentEmail = user?.email || '-';
  const institution = user?.university || 'Campus Student';

  doc.text(`Student: ${studentName} (${studentEmail})`, 18, 46.5);
  doc.text(`Campus / Institution: ${institution}`, 18, 51.5);
  doc.text(`Generated On: ${timestamp}`, 115, 46.5);
  doc.text(`Statement Cycle: ${month} (Daily Avg: RM ${(cashFlow.dailyAverageSpending || 0).toFixed(2)}/day)`, 115, 51.5);

  // 3. 4 Key Metric Cards
  const cardY = 61;
  const cardW = 42.5;
  const cardH = 20;
  const cardGap = 4;

  const metrics = [
    { title: 'Total Income', value: `RM ${(cashFlow.totalIncome || 0).toFixed(2)}`, color: incomeColor },
    { title: 'Total Expenses', value: `RM ${(cashFlow.totalExpense || 0).toFixed(2)}`, color: expenseColor },
    { title: 'Net Savings', value: `RM ${(cashFlow.netCashFlow || 0).toFixed(2)}`, color: (cashFlow.netCashFlow || 0) >= 0 ? incomeColor : expenseColor },
    { title: 'Savings Rate', value: `${(cashFlow.savingsRate || 0).toFixed(1)}%`, color: accentPurple }
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (cardW + cardGap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

    doc.setFillColor(...m.color);
    doc.rect(x, cardY, cardW, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title.toUpperCase(), x + 4, cardY + 7.5);

    doc.setFontSize(9.5);
    doc.setTextColor(...m.color);
    doc.text(m.value, x + 4, cardY + 15);
  });

  // 4. Intelligence & Comparison Highlights Box
  let currentY = 85;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 245, 255); // subtle purple tint
  doc.roundedRect(14, currentY, 182, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('AI INTELLIGENCE & MONTH COMPARISON SUMMARY', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);

  let comparisonText = 'No prior month data available for like-for-like comparison.';
  if (comparison && comparison.status !== 'first_month') {
    const diffText = Math.abs(comparison.spendingChangePct || 0).toFixed(1);
    const direction = comparison.status === 'higher' ? 'HIGHER' : comparison.status === 'lower' ? 'LOWER' : 'SIMILAR';
    comparisonText = `Spending is ${direction} by ${diffText}% compared to the same calendar elapsed period in ${comparison.prevMonth} (RM ${(comparison.likeForLikeCurrent || 0).toFixed(2)} vs RM ${(comparison.likeForLikePrevious || 0).toFixed(2)}).`;
  }
  doc.text(comparisonText, 18, currentY + 11);

  const topCategory = cashFlow.highestExpenseCategory;
  const topCatText = topCategory && topCategory.total > 0
    ? `Highest Category: ${topCategory.name} accounted for RM ${topCategory.total.toFixed(2)} (${topCategory.percentage.toFixed(1)}% of total monthly expenses).`
    : 'No expenses recorded for this month.';
  doc.text(topCatText, 18, currentY + 16);

  currentY += 25;

  // 5. Category Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkHeaderBg);
  doc.text('EXPENSE CATEGORY BREAKDOWN', 14, currentY);

  const catRows = (cashFlow.categoryExpenses || []).map((cat, idx) => [
    (idx + 1).toString(),
    cat.categoryName || 'Uncategorized',
    `RM ${(cat.total || 0).toFixed(2)}`,
    `${(cat.percentage || 0).toFixed(1)}%`,
    (cat.count || 0).toString()
  ]);

  if (catRows.length === 0) {
    catRows.push(['-', 'No expense transactions recorded', 'RM 0.00', '0.0%', '0']);
  }

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Category', 'Amount (RM)', 'Share of Spending', 'Transactions']],
    body: catRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 32, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 6. Budget Performance Table (if applicable)
  if (budgets && budgets.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...darkHeaderBg);
    doc.text('MONTHLY BUDGET PERFORMANCE', 14, currentY);

    const budgetRows = budgets.map(b => {
      const catSpent = (cashFlow.categoryExpenses || []).find(c => c.categoryId === b.categoryId)?.total || 0;
      const limit = Number(b.limit || b.amount || 0);
      const remaining = limit - catSpent;
      const pct = limit > 0 ? (catSpent / limit) * 100 : 0;
      let statusStr = pct > 100 ? 'EXCEEDED' : pct >= 80 ? 'WARNING (80%+)' : 'ON TRACK';

      return [
        b.categoryName || b.category || 'Budget',
        `RM ${limit.toFixed(2)}`,
        `RM ${catSpent.toFixed(2)}`,
        `RM ${remaining.toFixed(2)}`,
        `${pct.toFixed(0)}% (${statusStr})`
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Budget Name / Category', 'Monthly Limit', 'Actual Spent', 'Remaining', 'Status / Utilization']],
      body: budgetRows,
      theme: 'grid',
      headStyles: {
        fillColor: darkHeaderBg,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 32, halign: 'right' },
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 36, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 7. Detected Trends & AI Recommendations
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkHeaderBg);
  doc.text('AI SPENDING PATTERNS & RECOMMENDATIONS', 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);

  const insightsList = [];
  if (trends.risingCategories && trends.risingCategories.length > 0) {
    trends.risingCategories.forEach(rc => {
      insightsList.push(`• Rising Expense: ${rc.name} increased by ${rc.percentageChange.toFixed(0)}% (RM ${rc.currentSpent.toFixed(2)} vs RM ${rc.previousSpent.toFixed(2)}).`);
    });
  }
  if (trends.fallingCategories && trends.fallingCategories.length > 0) {
    trends.fallingCategories.forEach(fc => {
      insightsList.push(`• Reduced Expense: ${fc.name} decreased by ${Math.abs(fc.percentageChange).toFixed(0)}% — excellent savings discipline!`);
    });
  }
  if (trends.budgetRisks && trends.budgetRisks.length > 0) {
    trends.budgetRisks.forEach(br => {
      insightsList.push(`• Budget Alert: ${br.categoryName} is at ${br.percentage.toFixed(0)}% utilization (${br.status === 'exceeded' ? 'exceeded limit' : 'approaching limit'}).`);
    });
  }
  if (trends.anomalies && trends.anomalies.length > 0) {
    trends.anomalies.forEach(an => {
      insightsList.push(`• Spike Detected: RM ${an.amount.toFixed(2)} on "${an.title}" (${an.reason}).`);
    });
  }
  if (trends.savingsOpportunities && trends.savingsOpportunities.length > 0) {
    trends.savingsOpportunities.forEach(so => {
      insightsList.push(`• Savings Opportunity: In ${so.categoryName}, you could save approx RM ${so.potentialMonthlySavings.toFixed(2)}/mo (${so.tip}).`);
    });
  }

  if (insightsList.length === 0) {
    insightsList.push('• Maintain regular transaction tracking to unlock deeper AI spending pattern detection.');
    insightsList.push('• Consider setting category budgets to automatically monitor your daily campus burn rate.');
  }

  insightsList.forEach(item => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(item, 16, currentY);
    currentY += 5;
  });

  // 8. Footers on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);

    doc.text('KampusKash AI Financial Intelligence Statement | Confidential Student Financial Record', 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  if (typeof window !== 'undefined' && doc.save) {
    try {
      doc.save(`kampuskash_monthly_intelligence_${month}.pdf`);
    } catch {}
  }

  return doc;
}
