/**
 * Official Microsoft 4-square brand logo
 * The one place fixed brand colors are allowed per design guidelines.
 * COLOR_LINT_ALLOW: official brand colors #F25022, #7FBA00, #00A4EF, #FFB900
 */
import React from 'react';

export default function MicrosoftLogo({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
