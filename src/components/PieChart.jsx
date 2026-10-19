import React, { useState } from 'react';

/**
 * Direct Category Spending Pie/Donut Chart component built with SVG.
 * Renders an uncluttered, modern pie chart with interactive slices,
 * legend, and real-time expense calculations in RM.
 * 
 * Bulletproof rendering:
 * - 0 categories: Clean empty state message
 * - 1 category: Visible 100% donut ring (uses evenodd two-arc path)
 * - 2+ categories: Proportional arc segments
 */
export default function PieChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const totalSpent = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  if (!data || data.length === 0 || totalSpent === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No expense data logged yet.</p>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Add an expense transaction to see your spending breakdown.</span>
      </div>
    );
  }

  const cx = 110;
  const cy = 110;
  const radius = 90;
  const innerRadius = 50; // Donut hole

  let slices = [];

  if (data.length === 1) {
    // Single category: guaranteed 100% visible donut ring via evenodd fill
    const item = data[0];
    const fullDonutPath = [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
      'Z',
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}`,
      'Z'
    ].join(' ');

    slices = [{
      ...item,
      percentage: '100.0',
      pathData: fullDonutPath,
      color: item.color || '#52B788',
      index: 0
    }];
  } else {
    // 2+ categories: proportional slices
    let currentAngle = 0;
    slices = data.map((item, index) => {
      const percentage = (Number(item.amount) || 0) / totalSpent;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = startAngle + angle;

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const ix1 = cx + innerRadius * Math.cos(endRad);
      const iy1 = cy + innerRadius * Math.sin(endRad);
      const ix2 = cx + innerRadius * Math.cos(startRad);
      const iy2 = cy + innerRadius * Math.sin(startRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
        'Z'
      ].join(' ');

      currentAngle = endAngle;

      return {
        ...item,
        percentage: (percentage * 100).toFixed(1),
        pathData,
        color: item.color || '#52B788',
        index
      };
    });
  }

  const activeItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <path
                key={slice.id || slice.index}
                d={slice.pathData}
                fill={slice.color}
                fillRule="evenodd"
                opacity={hoveredIndex === null || isHovered ? 1 : 0.4}
                style={{
                  transition: 'all 0.25s ease',
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: '110px 110px',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Center Info Text */}
          <text x="110" y="102" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500">
            {activeItem ? activeItem.name : 'Total Expense'}
          </text>
          <text x="110" y="125" textAnchor="middle" fill="var(--text-main)" fontSize="15" fontWeight="700">
            {activeItem ? `RM ${activeItem.amount.toFixed(2)}` : `RM ${totalSpent.toFixed(2)}`}
          </text>
          {activeItem && (
            <text x="110" y="142" textAnchor="middle" fill="var(--primary)" fontSize="11" fontWeight="600">
              {activeItem.percentage}%
            </text>
          )}
        </svg>
      </div>

      {/* Legend Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
        gap: '0.65rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-light)'
      }}>
        {slices.map((item) => (
          <div
            key={item.id || item.index}
            onMouseEnter={() => setHoveredIndex(item.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => setHoveredIndex(prev => prev === item.index ? null : item.index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0.65rem',
              minHeight: '44px',
              boxSizing: 'border-box',
              borderRadius: 'var(--radius-sm)',
              background: hoveredIndex === item.index ? 'var(--primary-badge)' : 'var(--bg-card-subtle)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: item.color,
              flexShrink: 0
            }} />
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                RM {item.amount.toFixed(2)} ({item.percentage}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
