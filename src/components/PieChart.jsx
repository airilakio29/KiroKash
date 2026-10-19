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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
        <svg
          viewBox="0 0 220 220"
          style={{ width: '100%', maxWidth: '220px', height: 'auto', maxHeight: '220px', overflow: 'visible' }}
          role="img"
          aria-label="Category Spending Donut Chart"
        >
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
      <div className="pie-legend-grid">
        {slices.map((item) => (
          <div
            key={item.id || item.index}
            className={`pie-legend-item ${hoveredIndex === item.index ? 'active' : ''}`}
            onMouseEnter={() => setHoveredIndex(item.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => setHoveredIndex(prev => prev === item.index ? null : item.index)}
          >
            <span
              className="pie-legend-dot"
              style={{ backgroundColor: item.color }}
            />
            <div className="pie-legend-text">
              <div className="pie-legend-name" title={item.name}>
                {item.name}
              </div>
              <div className="pie-legend-amount">
                RM {item.amount.toFixed(2)} <span className="pie-legend-pct">({item.percentage}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .pie-legend-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 0.6rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-light);
          width: 100%;
          box-sizing: border-box;
        }

        .pie-legend-item {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          padding: 0.55rem 0.65rem;
          min-height: 44px;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          border-radius: var(--radius-sm);
          background: var(--bg-card-subtle);
          cursor: pointer;
          transition: all var(--transition-fast);
          touch-action: manipulation;
        }

        .pie-legend-item:hover,
        .pie-legend-item.active {
          background: var(--primary-badge, rgba(139, 92, 246, 0.2));
          transform: translateY(-1px);
        }

        .pie-legend-item:active {
          transform: scale(0.97);
        }

        .pie-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .pie-legend-text {
          min-width: 0;
          flex: 1;
        }

        .pie-legend-name {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.25;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .pie-legend-amount {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 3px;
          line-height: 1.2;
          word-break: break-word;
        }

        .pie-legend-pct {
          color: var(--primary-light, #C4B5FD);
          opacity: 0.95;
          font-weight: 600;
        }

        @media (max-width: 600px) {
          .pie-legend-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }
        }

        @media (max-width: 340px) {
          .pie-legend-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
