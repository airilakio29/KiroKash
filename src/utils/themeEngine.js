/**
 * KampusKash Theme Engine & Design System
 * 
 * Supports clean fintech aesthetic (Light by default, Dark, or System mode)
 * along with legacy preset compatibility for existing test suites.
 */

export const STORAGE_KEY_THEME = 'kampuskash_theme_mode';
export const STORAGE_KEY_LEGACY = 'student_tracker_theme_customization';

export const THEME_MODES = [
  { id: 'light', name: 'Light', icon: '☀️', description: 'Clean fintech light theme' },
  { id: 'dark', name: 'Dark', icon: '🌙', description: 'Modern midnight dark theme' },
  { id: 'system', name: 'System', icon: '💻', description: 'Sync with system preferences' }
];

export const LIGHT_TOKENS = {
  '--bg-app': '#F8FAFC',
  '--bg-card': '#FFFFFF',
  '--bg-card-subtle': '#F1F5F9',
  '--bg-sidebar': '#0F172A',
  '--bg-sidebar-active': '#1E293B',
  '--primary': '#4F46E5',
  '--primary-hover': '#4338CA',
  '--primary-light': '#EEF2FF',
  '--primary-badge': '#E0E7FF',
  '--text-main': '#0F172A',
  '--text-muted': '#64748B',
  '--text-light': '#94A3B8',
  '--text-white': '#FFFFFF',
  '--income': '#10B981',
  '--income-bg': 'rgba(16, 185, 129, 0.1)',
  '--expense': '#EF4444',
  '--expense-bg': 'rgba(239, 68, 68, 0.1)',
  '--warning': '#F59E0B',
  '--warning-bg': 'rgba(245, 158, 11, 0.1)',
  '--border-light': '#E2E8F0',
  '--border-focus': '#4F46E5',
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  '--shadow-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  '--shadow-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
};

export const DARK_TOKENS = {
  '--bg-app': '#0B0F19',
  '--bg-card': '#111827',
  '--bg-card-subtle': '#1F2937',
  '--bg-sidebar': '#080C14',
  '--bg-sidebar-active': '#1F2937',
  '--primary': '#6366F1',
  '--primary-hover': '#4F46E5',
  '--primary-light': '#1E1B4B',
  '--primary-badge': '#312E81',
  '--text-main': '#F9FAFB',
  '--text-muted': '#9CA3AF',
  '--text-light': '#6B7280',
  '--text-white': '#FFFFFF',
  '--income': '#10B981',
  '--income-bg': 'rgba(16, 185, 129, 0.18)',
  '--expense': '#EF4444',
  '--expense-bg': 'rgba(239, 68, 68, 0.18)',
  '--warning': '#F59E0B',
  '--warning-bg': 'rgba(245, 158, 11, 0.18)',
  '--border-light': 'rgba(255, 255, 255, 0.09)',
  '--border-focus': '#6366F1',
  '--shadow-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
  '--shadow-card': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  '--shadow-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  '--shadow-modal': '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
};

export const PRESET_THEMES = [
  {
    id: 'light',
    name: 'Fintech Light',
    icon: '☀️',
    description: 'Clean modern slate & indigo theme (Recommended)',
    isDecorativeCat: false,
    tokens: LIGHT_TOKENS
  },
  {
    id: 'kiro',
    name: 'Fintech Dark',
    icon: '🌙',
    description: 'Crisp midnight dark theme with emerald & indigo',
    isDecorativeCat: false,
    tokens: DARK_TOKENS
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    icon: '🌊',
    description: 'Deep navy and azure ocean theme',
    isDecorativeCat: false,
    tokens: {
      ...DARK_TOKENS,
      '--bg-app': '#0F172A',
      '--bg-card': '#1E293B',
      '--bg-card-subtle': '#0F172A',
      '--primary': '#38BDF8',
      '--primary-hover': '#0284C7',
      '--primary-light': '#E0F2FE',
      '--primary-badge': '#BAE6FD'
    }
  },
  {
    id: 'mint',
    name: 'Mint Emerald',
    icon: '🌿',
    description: 'Fresh mint and emerald campus theme',
    isDecorativeCat: false,
    tokens: {
      ...DARK_TOKENS,
      '--bg-app': '#064E3B',
      '--bg-card': '#065F46',
      '--bg-card-subtle': '#044E39',
      '--primary': '#10B981',
      '--primary-hover': '#059669',
      '--primary-light': '#D1FAE5',
      '--primary-badge': '#A7F3D0'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    icon: '🌅',
    description: 'Warm dusk and vibrant sunset tone',
    isDecorativeCat: false,
    tokens: {
      ...DARK_TOKENS,
      '--bg-app': '#2E1065',
      '--bg-card': '#3B0764',
      '--bg-card-subtle': '#240742',
      '--primary': '#F97316',
      '--primary-hover': '#EA580C',
      '--primary-light': '#FFEDD5',
      '--primary-badge': '#FED7AA'
    }
  },
  {
    id: 'rose',
    name: 'Rose Minimal',
    icon: '🌸',
    description: 'Soft rose accents with high-contrast text',
    isDecorativeCat: false,
    tokens: {
      ...LIGHT_TOKENS,
      '--primary': '#E11D48',
      '--primary-hover': '#BE123C',
      '--primary-light': '#FFE4E6',
      '--primary-badge': '#FECDD3'
    }
  },
  {
    id: 'dark',
    name: 'Onyx Monochrome',
    icon: '⚡',
    description: 'High-contrast midnight dark theme',
    isDecorativeCat: false,
    tokens: {
      ...DARK_TOKENS,
      '--bg-app': '#000000',
      '--bg-card': '#121212',
      '--bg-card-subtle': '#1A1A1A',
      '--primary': '#A855F7',
      '--primary-hover': '#9333EA'
    }
  },
  {
    id: 'cute_cat',
    name: 'Campus Lilac',
    icon: '🐱',
    description: 'Friendly pastel theme with warm accents',
    isDecorativeCat: true,
    tokens: {
      ...LIGHT_TOKENS,
      '--primary': '#8B5CF6',
      '--primary-hover': '#7C3AED',
      '--primary-light': '#EDE9FE',
      '--primary-badge': '#DDD6FE'
    }
  },
  {
    id: 'forest',
    name: 'Nordic Pine',
    icon: '🌲',
    description: 'Pine forest greens with clean whites',
    isDecorativeCat: false,
    tokens: {
      ...LIGHT_TOKENS,
      '--primary': '#059669',
      '--primary-hover': '#047857',
      '--primary-light': '#D1FAE5',
      '--primary-badge': '#A7F3D0'
    }
  },
  {
    id: 'purple',
    name: 'Classic Violet',
    icon: '🔮',
    description: 'Signature violet theme',
    isDecorativeCat: false,
    tokens: {
      ...DARK_TOKENS,
      '--primary': '#8B5CF6',
      '--primary-hover': '#7C3AED'
    }
  }
];

export function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeTokens(themeConfig) {
  if (!themeConfig || typeof document === 'undefined') return;
  const root = document.documentElement;

  // Resolve preset or mode
  let targetPresetId = themeConfig.presetId || 'light';
  if (targetPresetId === 'system') {
    targetPresetId = getSystemTheme() === 'dark' ? 'kiro' : 'light';
  }

  const preset = PRESET_THEMES.find(t => t.id === targetPresetId) || PRESET_THEMES[0];
  const finalTokens = { ...preset.tokens };

  if (themeConfig.customColors) {
    if (themeConfig.customColors.primary) finalTokens['--primary'] = themeConfig.customColors.primary;
    if (themeConfig.customColors.bgApp) finalTokens['--bg-app'] = themeConfig.customColors.bgApp;
    if (themeConfig.customColors.bgCard) finalTokens['--bg-card'] = themeConfig.customColors.bgCard;
    if (themeConfig.customColors.textMain) finalTokens['--text-main'] = themeConfig.customColors.textMain;
    if (themeConfig.customColors.income) finalTokens['--income'] = themeConfig.customColors.income;
    if (themeConfig.customColors.expense) finalTokens['--expense'] = themeConfig.customColors.expense;
  }

  Object.entries(finalTokens).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });

  const isDark = targetPresetId === 'kiro' || targetPresetId === 'dark' || targetPresetId === 'ocean' || targetPresetId === 'mint' || targetPresetId === 'sunset' || targetPresetId === 'purple';
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  root.setAttribute('data-theme-preset', preset.id);
  root.setAttribute('data-theme-mode', themeConfig.mode || (targetPresetId === 'light' ? 'light' : 'dark'));

  if (preset.id === 'kiro') {
    root.setAttribute('data-kiro', 'true');
  } else {
    root.removeAttribute('data-kiro');
  }
  if (preset.isDecorativeCat) {
    root.setAttribute('data-cute-cat', 'true');
  } else {
    root.removeAttribute('data-cute-cat');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { presetId: preset.id, config: themeConfig } }));
  }
}

export function loadSavedTheme() {
  try {
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'dark' || urlTheme === 'light') {
        const config = {
          mode: urlTheme,
          presetId: urlTheme === 'dark' ? 'kiro' : 'light',
          customColors: null
        };
        applyThemeTokens(config);
        return config;
      }
    }
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedMode) {
        const config = {
          mode: savedMode,
          presetId: savedMode === 'dark' ? 'kiro' : (savedMode === 'system' ? (getSystemTheme() === 'dark' ? 'kiro' : 'light') : 'light'),
          customColors: null
        };
        applyThemeTokens(config);
        return config;
      }
      const legacySaved = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacySaved) {
        const config = JSON.parse(legacySaved);
        applyThemeTokens(config);
        return config;
      }
    }
  } catch (e) {
    console.warn('Failed to load theme from LocalStorage', e);
  }
  // Default: Clean Fintech Light!
  const defaultConfig = { presetId: 'light', mode: 'light', customColors: null };
  applyThemeTokens(defaultConfig);
  return defaultConfig;
}

export function saveTheme(themeConfig) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(themeConfig));
      if (themeConfig.mode) {
        localStorage.setItem(STORAGE_KEY_THEME, themeConfig.mode);
      } else if (themeConfig.presetId === 'light') {
        localStorage.setItem(STORAGE_KEY_THEME, 'light');
      } else if (themeConfig.presetId === 'kiro' || themeConfig.presetId === 'dark') {
        localStorage.setItem(STORAGE_KEY_THEME, 'dark');
      }
      applyThemeTokens(themeConfig);
    }
  } catch (e) {
    console.warn('Failed to save theme to LocalStorage', e);
  }
}

export function setThemeMode(mode) {
  const presetId = mode === 'dark' ? 'kiro' : (mode === 'system' ? (getSystemTheme() === 'dark' ? 'kiro' : 'light') : 'light');
  const config = { mode, presetId, customColors: null };
  saveTheme(config);
  return config;
}

export function initTheme() {
  return loadSavedTheme();
}
