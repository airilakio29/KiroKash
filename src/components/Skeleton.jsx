import React from 'react';

/**
 * KampusKash Premium Skeleton Loaders
 * Realistic placeholders matching the dark purple gemstone theme
 * with subtle shimmer animations to prevent layout shifts.
 * Never displays fake financial figures.
 */

export function SkeletonBox({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm, 4px)', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="view-fade-in" aria-busy="true" aria-label="Loading dashboard data">
      {/* Motto / Quick Banner Skeleton */}
      <div
        className="card"
        style={{
          height: '60px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.9rem 1.25rem'
        }}
      >
        <SkeletonBox width="38px" height="38px" borderRadius="10px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <SkeletonBox width="30%" height="16px" />
          <SkeletonBox width="55%" height="12px" />
        </div>
      </div>

      {/* 4 Metric Cards Skeleton Grid */}
      <div className="grid-metrics" style={{ marginBottom: '1.75rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card metric-card" style={{ minHeight: '110px' }}>
            <div className="metric-icon-box" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              <SkeletonBox width="28px" height="28px" borderRadius="50%" />
            </div>
            <div className="metric-info" style={{ flex: 1 }}>
              <SkeletonBox width="50%" height="13px" style={{ marginBottom: '0.5rem' }} />
              <SkeletonBox width="75%" height="26px" style={{ marginBottom: '0.4rem' }} />
              <SkeletonBox width="40%" height="12px" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Chart + Recent Transactions */}
      <div className="grid-dashboard-main">
        {/* Chart Card Skeleton */}
        <div className="card" style={{ minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <SkeletonBox width="45%" height="18px" />
            <SkeletonBox width="20%" height="14px" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px' }}>
            <SkeletonBox width="190px" height="190px" borderRadius="50%" />
          </div>
        </div>

        {/* Recent Transactions Card Skeleton */}
        <div className="card" style={{ minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <SkeletonBox width="35%" height="18px" />
            <SkeletonBox width="22%" height="32px" borderRadius="6px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.8rem 1rem',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <SkeletonBox width="45%" height="15px" />
                  <SkeletonBox width="28%" height="12px" />
                </div>
                <SkeletonBox width="24%" height="18px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="view-fade-in" aria-busy="true" aria-label="Loading transactions">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ width: '40%' }}>
            <SkeletonBox width="160px" height="22px" style={{ marginBottom: '0.35rem' }} />
            <SkeletonBox width="100px" height="14px" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <SkeletonBox width="100px" height="38px" borderRadius="6px" />
            <SkeletonBox width="130px" height="38px" borderRadius="6px" />
          </div>
        </div>
        <SkeletonBox width="100%" height="40px" borderRadius="8px" style={{ marginBottom: '1.25rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'var(--bg-card-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                <SkeletonBox width="35%" height="16px" />
                <SkeletonBox width="20%" height="12px" />
              </div>
              <SkeletonBox width="15%" height="18px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountsSkeleton() {
  return (
    <div className="view-fade-in" aria-busy="true" aria-label="Loading accounts">
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '40%' }}>
          <SkeletonBox width="140px" height="22px" style={{ marginBottom: '0.35rem' }} />
          <SkeletonBox width="220px" height="14px" />
        </div>
        <SkeletonBox width="120px" height="38px" borderRadius="6px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ minHeight: '130px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <SkeletonBox width="42px" height="42px" borderRadius="8px" />
              <div style={{ flex: 1 }}>
                <SkeletonBox width="60%" height="16px" style={{ marginBottom: '0.3rem' }} />
                <SkeletonBox width="40%" height="12px" />
              </div>
            </div>
            <SkeletonBox width="50%" height="24px" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetsSkeleton() {
  return (
    <div className="view-fade-in" aria-busy="true" aria-label="Loading budgets">
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '45%' }}>
          <SkeletonBox width="180px" height="22px" style={{ marginBottom: '0.35rem' }} />
          <SkeletonBox width="240px" height="14px" />
        </div>
        <SkeletonBox width="130px" height="38px" borderRadius="6px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ minHeight: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <SkeletonBox width="45%" height="18px" />
              <SkeletonBox width="25%" height="16px" />
            </div>
            <SkeletonBox width="100%" height="8px" borderRadius="4px" style={{ marginBottom: '0.85rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <SkeletonBox width="35%" height="12px" />
              <SkeletonBox width="25%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SavingsSkeleton() {
  return (
    <div className="view-fade-in" aria-busy="true" aria-label="Loading savings goals">
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '45%' }}>
          <SkeletonBox width="170px" height="22px" style={{ marginBottom: '0.35rem' }} />
          <SkeletonBox width="230px" height="14px" />
        </div>
        <SkeletonBox width="130px" height="38px" borderRadius="6px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ minHeight: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <SkeletonBox width="50%" height="18px" />
              <SkeletonBox width="20%" height="16px" />
            </div>
            <SkeletonBox width="100%" height="10px" borderRadius="5px" style={{ marginBottom: '0.85rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <SkeletonBox width="30%" height="12px" />
              <SkeletonBox width="30%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="view-fade-in" aria-busy="true" aria-label="Loading financial reports">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SkeletonBox width="160px" height="22px" style={{ marginBottom: '0.35rem' }} />
        <SkeletonBox width="260px" height="14px" />
      </div>
      <div className="grid-dashboard-main">
        <div className="card" style={{ minHeight: '260px' }}>
          <SkeletonBox width="40%" height="18px" style={{ marginBottom: '1.5rem' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '170px' }}>
            {[40, 75, 55, 90, 65, 80].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', gap: '3px', alignItems: 'flex-end', height: '100%' }}>
                <SkeletonBox width="12px" height={`${h}%`} borderRadius="3px 3px 0 0" />
                <SkeletonBox width="12px" height={`${Math.max(20, h - 20)}%`} borderRadius="3px 3px 0 0" />
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ minHeight: '260px' }}>
          <SkeletonBox width="45%" height="18px" style={{ marginBottom: '1.5rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
            <SkeletonBox width="160px" height="160px" borderRadius="50%" />
          </div>
        </div>
      </div>
    </div>
  );
}
