import React from 'react';
import { Compass, Ticket, Wallet, Zap } from 'lucide-react';

export default function ExploreSummaryCards({ cafes = [], vouchers = [] }) {
  const activeVouchers = vouchers.filter((v) => v.status !== 'expired');

  // Compute average min and max budget only from venues with listed budgets
  const budgeted = cafes.filter((c) => c.minBudget != null && c.maxBudget != null);
  const avgMin = budgeted.length
    ? Math.round(budgeted.reduce((sum, c) => sum + Number(c.minBudget || 0), 0) / budgeted.length)
    : 8;
  const avgMax = budgeted.length
    ? Math.round(budgeted.reduce((sum, c) => sum + Number(c.maxBudget || 0), 0) / budgeted.length)
    : 16;

  // Best deal today
  const bestDeal = activeVouchers.find((v) => v.discountValue.includes('BUY 1') || v.discountValue.includes('25%')) || activeVouchers[0];

  return (
    <div className="grid-metrics" style={{ marginBottom: '1.75rem' }}>
      {/* 1. Venues Discovered */}
      <div className="card metric-card">
        <div className="metric-icon-box balance">
          <Compass size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Venues Nearby</div>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            {cafes.length} Places
          </div>
          <div className="metric-sub">
            <span>Partners & OpenStreetMap</span>
          </div>
        </div>
      </div>

      {/* 2. Active Vouchers */}
      <div className="card metric-card">
        <div className="metric-icon-box income">
          <Ticket size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Active Vouchers</div>
          <div className="metric-value" style={{ color: 'var(--income)' }}>
            {activeVouchers.length} Deals
          </div>
          <div className="metric-sub" style={{ color: 'var(--income)' }}>
            <span>Verified student promo codes</span>
          </div>
        </div>
      </div>

      {/* 3. Average Budget Range */}
      <div className="card metric-card">
        <div className="metric-icon-box expense">
          <Wallet size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Avg Budget Range</div>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            RM {avgMin} - {avgMax}
          </div>
          <div className="metric-sub">
            <span>Student meal & drink estimate</span>
          </div>
        </div>
      </div>

      {/* 4. Best Deal Today */}
      <div className="card metric-card">
        <div className="metric-icon-box savings">
          <Zap size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Best Deal Today</div>
          <div className="metric-value" style={{ color: 'var(--primary-light)', fontSize: '1.35rem' }}>
            {bestDeal ? bestDeal.discountValue : '15% OFF'}
          </div>
          <div className="metric-sub">
            <span>{bestDeal ? bestDeal.cafeName : 'Campus Special'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
