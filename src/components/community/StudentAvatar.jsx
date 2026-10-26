import React from 'react';

const AVATAR_PALETTES = [
  { bg: 'rgba(79, 70, 229, 0.15)', text: '#6366F1' },
  { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
  { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899' },
  { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4' },
  { bg: 'rgba(139, 92, 246, 0.15)', text: '#8B5CF6' }
];

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'S';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPalette(name) {
  if (!name || typeof name !== 'string') return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export default function StudentAvatar({ name = 'Student', size = 32, className = '' }) {
  const initials = getInitials(name);
  const palette = getPalette(name);

  return (
    <div
      className={`student-avatar-monogram ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '50%',
        backgroundColor: palette.bg,
        color: palette.text,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.38)}px`,
        fontWeight: 700,
        letterSpacing: '0.02em',
        userSelect: 'none'
      }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
