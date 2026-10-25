/**
 * KampusKash Theme Engine & Design System
 *
 * Every preset is a *fully tinted* palette: the page is a hue gradient, cards are
 * a lighter tint of the same hue (never pure white), the sidebar is a deeper shade
 * and buttons/highlights use a stronger accent. All other design tokens that the
 * UI needs (overlays, inputs, tooltips, sidebar text, text-on-accent, ...) are
 * DERIVED from the palette here, so no component ever needs a hardcoded
 * white/near-white value.
 *
 * Persistence:
 *  - STORAGE_KEY_LEGACY  : full theme config JSON { presetId, mode, customColors }
 *  - STORAGE_KEY_THEME   : coarse light/dark/system mode (kept for compatibility)
 *  - STORAGE_KEY_BOOT    : computed token snapshot read by the inline <head> script in
 *                          index.html so the very first paint already uses the saved
 *                          theme (no flash of the default theme).
 */

export const STORAGE_KEY_THEME = 'kampuskash_theme_mode';
export const STORAGE_KEY_LEGACY = 'student_tracker_theme_customization';
export const STORAGE_KEY_BOOT = 'kampuskash_theme_boot';
export const DEFAULT_PRESET_ID = 'light';

export const THEME_MODES = [
  { id: 'light', name: 'Light', icon: '☀️', description: 'Tinted light theme' },
  { id: 'dark', name: 'Dark', icon: '🌙', description: 'Modern midnight dark theme' },
  { id: 'system', name: 'System', icon: '💻', description: 'Sync with system preferences' }
];

/* ==========================================================================
   Color math helpers (pure, no DOM) — also used by scripts/check-theme-contrast
   ========================================================================== */

export function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    return {
      r: parseInt(m[1].slice(0, 2), 16),
      g: parseInt(m[1].slice(2, 4), 16),
      b: parseInt(m[1].slice(4, 6), 16),
      a: 1
    };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  return null;
}

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));

export function toHex(c) {
  const h = (n) => clamp255(n).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

/** Mix `a` toward `b` by ratio t (0 = a, 1 = b). Returns hex. */
export function mixColors(a, b, t) {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return a;
  return toHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t
  });
}

export function relativeLuminance(input) {
  const c = typeof input === 'string' ? parseColor(input) : input;
  if (!c) return 0;
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite a (possibly translucent) color over an opaque background. */
export function compositeOver(fg, bg) {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return bg;
  const a = f.a;
  return toHex({
    r: f.r * a + b.r * (1 - a),
    g: f.g * a + b.g * (1 - a),
    b: f.b * a + b.b * (1 - a)
  });
}

const rgbTriplet = (hex) => {
  const c = parseColor(hex);
  return c ? `${clamp255(c.r)}, ${clamp255(c.g)}, ${clamp255(c.b)}` : '0, 0, 0';
};

/**
 * Pick the readable foreground for `bg`. White is preferred whenever it already
 * passes WCAG AA (4.5:1), otherwise the supplied dark ink is used.
 */
function readableOn(bg, darkInk) {
  const WHITE = '#FFFFFF';
  return contrastRatio(WHITE, bg) >= 4.5 ? WHITE : darkInk;
}

/* ==========================================================================
   Palette specs (the only place raw hues are chosen)
   ========================================================================== */

const THEME_SPECS = [
  /* ------------------------------ LIGHT, TINTED ------------------------------ */
  {
    id: 'light',
    name: 'Fintech Light',
    icon: '☀️',
    description: 'Soft indigo-tinted light theme (Recommended)',
    isDecorativeCat: false,
    isDark: false,
    bg: ['#CFD8FF', '#DAD6FF', '#E6D6FA'],
    card: '#EEF0FF',
    cardSubtle: '#E0E4FF',
    sidebar: '#2A3392',
    sidebarActive: '#4A52C8',
    primary: '#4338CA',
    accentFg: '#3730A3',
    primaryLight: '#C7CEFF',
    primaryBadge: '#BFC8FF',
    textMain: '#171A45',
    textMuted: '#40467F',
    textLight: '#4B5189',
    income: '#065F46',
    expense: '#991B1B',
    warning: '#8F4108',
    border: 'rgba(67, 56, 202, 0.26)'
  },
  {
    id: 'rose',
    name: 'Rose Minimal',
    icon: '🌸',
    description: 'Soft rose-pink gradient with deep rose accents',
    isDecorativeCat: false,
    isDark: false,
    bg: ['#F7A8C0', '#F9BDCD', '#FCD2DC'],
    card: '#FFE6ED',
    cardSubtle: '#FBD3DF',
    sidebar: '#8B1A47',
    sidebarActive: '#BE185D',
    primary: '#BE185D',
    accentFg: '#881337',
    primaryLight: '#F9C0D1',
    primaryBadge: '#F7B3C7',
    textMain: '#46061F',
    textMuted: '#721A3E',
    textLight: '#7E2648',
    income: '#065F46',
    expense: '#991B1B',
    warning: '#8F4108',
    border: 'rgba(157, 23, 77, 0.28)'
  },
  {
    id: 'cute_cat',
    name: 'Campus Lilac',
    icon: '🐱',
    description: 'Friendly lilac gradient with deep violet accents',
    isDecorativeCat: true,
    isDark: false,
    bg: ['#D3C2F4', '#DFCFF7', '#EBDBF8'],
    card: '#F1E8FC',
    cardSubtle: '#E4D6F8',
    sidebar: '#4B2784',
    sidebarActive: '#6D3FB8',
    primary: '#7E22CE',
    accentFg: '#6B21A8',
    primaryLight: '#DCC8F6',
    primaryBadge: '#D3B9F4',
    textMain: '#2A0F5E',
    textMuted: '#52327F',
    textLight: '#5E3F8C',
    income: '#065F46',
    expense: '#991B1B',
    warning: '#8F4108',
    border: 'rgba(126, 34, 206, 0.26)'
  },
  {
    id: 'forest',
    name: 'Nordic Pine',
    icon: '🌲',
    description: 'Fresh pine-green gradient with deep forest accents',
    isDecorativeCat: false,
    isDark: false,
    bg: ['#B3E2C4', '#C4E8CF', '#CFEDD8'],
    card: '#E9F7EC',
    cardSubtle: '#D2ECD9',
    sidebar: '#14532D',
    sidebarActive: '#1F7A45',
    primary: '#15803D',
    accentFg: '#14532D',
    primaryLight: '#BFE5CB',
    primaryBadge: '#A9DABA',
    textMain: '#0E2B1A',
    textMuted: '#26523A',
    textLight: '#31604A',
    income: '#065F46',
    expense: '#991B1B',
    warning: '#8F4108',
    border: 'rgba(21, 128, 61, 0.28)'
  },

  /* ------------------------------ DARK, HUE-CARRYING ------------------------------ */
  {
    id: 'kiro',
    name: 'Fintech Dark',
    icon: '🌙',
    description: 'Deep indigo midnight theme with electric accents',
    isDecorativeCat: false,
    isDark: true,
    bg: ['#090C20', '#10154A', '#1A1B5E'],
    card: '#171C54',
    cardSubtle: '#1F2563',
    sidebar: '#060919',
    sidebarActive: '#3A41C0',
    primary: '#7C83FF',
    primaryLight: '#C7CBFF',
    primaryBadge: '#9AA0FF',
    textMain: '#F1F2FF',
    textMuted: '#BCC1F7',
    textLight: '#A9AFF0',
    income: '#34D399',
    expense: '#FDA4AF',
    warning: '#FBBF24',
    border: 'rgba(140, 150, 255, 0.26)'
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    icon: '🌊',
    description: 'Deep navy and azure ocean theme',
    isDecorativeCat: false,
    isDark: true,
    bg: ['#061A36', '#0A3560', '#0D5580'],
    card: '#0C3256',
    cardSubtle: '#124469',
    sidebar: '#041224',
    sidebarActive: '#0369A1',
    primary: '#38BDF8',
    primaryLight: '#BAE6FD',
    primaryBadge: '#7DD3FC',
    textMain: '#EAF6FF',
    textMuted: '#B2DCF5',
    textLight: '#9BCFEC',
    income: '#34D399',
    expense: '#FDA4AF',
    warning: '#FBBF24',
    border: 'rgba(125, 211, 252, 0.28)'
  },
  {
    id: 'mint',
    name: 'Mint Emerald',
    icon: '🌿',
    description: 'Fresh mint and emerald campus theme',
    isDecorativeCat: false,
    isDark: true,
    bg: ['#03312A', '#05463A', '#07564A'],
    card: '#064436',
    cardSubtle: '#085143',
    sidebar: '#021F19',
    sidebarActive: '#047857',
    primary: '#34D399',
    primaryLight: '#A7F3D0',
    primaryBadge: '#6EE7B7',
    textMain: '#E9FFF6',
    textMuted: '#A9F0D3',
    textLight: '#A8EBCB',
    income: '#BBF7D0',
    expense: '#FECDD3',
    warning: '#FDE047',
    border: 'rgba(110, 231, 183, 0.28)'
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    icon: '🌅',
    description: 'Warm dusk purple melting into sunset orange',
    isDecorativeCat: false,
    isDark: true,
    bg: ['#2A0C57', '#64195F', '#8E2F1B'],
    card: '#4A1A66',
    cardSubtle: '#5A2478',
    sidebar: '#1D0942',
    sidebarActive: '#C2410C',
    primary: '#FB923C',
    primaryLight: '#FED7AA',
    primaryBadge: '#FDBA74',
    textMain: '#FFF4E8',
    textMuted: '#FFD9B8',
    textLight: '#FFCCA2',
    income: '#86EFAC',
    expense: '#FDA4AF',
    warning: '#FDE047',
    border: 'rgba(255, 190, 140, 0.30)'
  },
  {
    id: 'dark',
    name: 'Onyx Monochrome',
    icon: '⚡',
    description: 'Near-black onyx with a violet undertone',
    isDecorativeCat: false,
    isDark: true,
    bg: ['#06040B', '#0D0916', '#150E26'],
    card: '#150F22',
    cardSubtle: '#1D1530',
    sidebar: '#040207',
    sidebarActive: '#4C1D95',
    primary: '#B26BFA',
    primaryLight: '#E5D0FF',
    primaryBadge: '#C99BFF',
    textMain: '#F5F0FF',
    textMuted: '#C9BEDF',
    textLight: '#B3A6CE',
    income: '#2DD4BF',
    expense: '#FDA4AF',
    warning: '#FBBF24',
    border: 'rgba(190, 150, 255, 0.24)'
  },
  {
    id: 'purple',
    name: 'Classic Violet',
    icon: '🔮',
    description: 'Signature rich violet theme',
    isDecorativeCat: false,
    isDark: true,
    bg: ['#180D3A', '#2A1768', '#3C1F8C'],
    card: '#2B1A68',
    cardSubtle: '#35227D',
    sidebar: '#10082B',
    sidebarActive: '#6D3FE0',
    primary: '#7C4DFF',
    primaryLight: '#D9CCFF',
    primaryBadge: '#B79CFF',
    textMain: '#F4F0FF',
    textMuted: '#CDC2F7',
    textLight: '#BBAEF0',
    income: '#34D399',
    expense: '#FDA4AF',
    warning: '#FBBF24',
    border: 'rgba(180, 150, 255, 0.28)'
  }
];

/* ==========================================================================
   Token derivation
   ========================================================================== */

/**
 * Turn a palette spec (plus optional user color overrides) into the complete
 * CSS custom-property map. Pure function: no DOM access.
 */
export function buildThemeTokens(spec, customColors = null) {
  const s = { ...spec, bg: [...spec.bg] };

  if (customColors) {
    if (customColors.primary) s.primary = customColors.primary;
    if (customColors.bgApp) {
      s.bg = [
        customColors.bgApp,
        mixColors(customColors.bgApp, s.primary, 0.08),
        mixColors(customColors.bgApp, s.primary, 0.16)
      ];
    }
    if (customColors.bgCard) {
      s.card = customColors.bgCard;
      s.cardSubtle = mixColors(customColors.bgCard, s.isDark ? '#FFFFFF' : '#000000', 0.07);
    }
    if (customColors.textMain) s.textMain = customColors.textMain;
    if (customColors.income) s.income = customColors.income;
    if (customColors.expense) s.expense = customColors.expense;
  }

  const [bgFrom, bgMid, bgTo] = s.bg;
  const WHITE = '#FFFFFF';
  const darkInk = s.isDark ? s.sidebar : s.textMain;

  const onPrimary = readableOn(s.primary, darkInk);
  const primaryHover = mixColors(s.primary, onPrimary === WHITE ? '#000000' : WHITE, 0.16);
  const accentFg = s.accentFg || (s.isDark ? s.primaryLight : s.primary);

  const sidebarText = readableOn(s.sidebar, darkInk);
  const sidebarMuted = mixColors(sidebarText, s.sidebar, 0.3);
  const shadowRgb = s.isDark ? '0, 0, 0' : rgbTriplet(mixColors(s.textMain, '#000000', 0.25));
  const overlayRgb = s.isDark ? '255, 255, 255' : rgbTriplet(s.textMain);

  const surfaceSolid = s.isDark ? mixColors(s.card, WHITE, 0.05) : s.card;
  const shadowA = s.isDark ? [0.35, 0.5, 0.6, 0.7] : [0.1, 0.18, 0.24, 0.34];

  const tokens = {
    '--bg-app': bgMid,
    '--bg-app-gradient': `linear-gradient(165deg, ${bgFrom} 0%, ${bgMid} 52%, ${bgTo} 100%)`,
    '--bg-card': s.card,
    '--bg-card-subtle': s.cardSubtle,
    '--bg-sidebar': s.sidebar,
    '--bg-sidebar-active': s.sidebarActive,
    '--primary': s.primary,
    '--primary-hover': primaryHover,
    '--primary-light': s.primaryLight,
    '--primary-badge': s.primaryBadge,
    '--accent-fg': accentFg,
    '--text-main': s.textMain,
    '--text-muted': s.textMuted,
    '--text-light': s.textLight,
    '--text-white': onPrimary,
    '--text-on-primary': onPrimary,
    '--text-on-income': readableOn(s.income, darkInk),
    '--text-on-expense': readableOn(s.expense, darkInk),
    '--income': s.income,
    '--income-bg': `color-mix(in srgb, ${s.income} ${s.isDark ? 20 : 14}%, transparent)`,
    '--expense': s.expense,
    '--expense-bg': `color-mix(in srgb, ${s.expense} ${s.isDark ? 20 : 14}%, transparent)`,
    '--warning': s.warning,
    '--warning-bg': `color-mix(in srgb, ${s.warning} ${s.isDark ? 20 : 16}%, transparent)`,
    '--border-light': s.border,
    '--border-focus': s.primary,

    /* Derived surfaces & helpers (everything components need instead of "white") */
    '--overlay-rgb': overlayRgb,
    '--shadow-rgb': shadowRgb,
    '--surface-solid': surfaceSolid,
    '--input-bg': s.cardSubtle,
    '--input-border': `color-mix(in srgb, ${s.textMain} 30%, transparent)`,
    '--tooltip-bg': s.sidebar,
    '--tooltip-text': sidebarText,
    '--chart-bg': s.cardSubtle,
    '--scrim': `rgba(${shadowRgb}, ${s.isDark ? 0.7 : 0.55})`,
    '--sidebar-text': sidebarText,
    '--sidebar-text-muted': sidebarMuted,
    '--sidebar-active-text': readableOn(s.sidebarActive, darkInk),
    '--sidebar-overlay-rgb': rgbTriplet(sidebarText),
    '--provider-btn-bg': s.isDark
      ? mixColors(WHITE, s.primary, 0.08)
      : mixColors(s.card, WHITE, 0.55),
    '--provider-btn-text': '#1F2937',
    '--provider-btn-border': 'rgba(31, 41, 55, 0.28)',
    '--theme-color': bgFrom,

    '--shadow-sm': `0 1px 3px 0 rgba(${shadowRgb}, ${shadowA[0]})`,
    '--shadow-card': `0 4px 14px -2px rgba(${shadowRgb}, ${shadowA[1]}), 0 1px 3px rgba(${shadowRgb}, ${shadowA[0]})`,
    '--shadow-hover': `0 14px 28px -6px rgba(${shadowRgb}, ${shadowA[2]})`,
    '--shadow-modal': `0 24px 48px -12px rgba(${shadowRgb}, ${shadowA[3]})`
  };

  return { tokens, isDark: s.isDark, bgStops: s.bg, spec: s };
}

export const PRESET_THEMES = THEME_SPECS.map((spec) => {
  const built = buildThemeTokens(spec);
  return {
    id: spec.id,
    name: spec.name,
    icon: spec.icon,
    description: spec.description,
    isDecorativeCat: spec.isDecorativeCat,
    isDark: spec.isDark,
    bgStops: spec.bg,
    spec,
    tokens: built.tokens
  };
});

export const LIGHT_TOKENS = PRESET_THEMES.find((t) => t.id === 'light').tokens;
export const DARK_TOKENS = PRESET_THEMES.find((t) => t.id === 'kiro').tokens;

export function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/* ==========================================================================
   DOM application
   ========================================================================== */

function setMetaContent(name, content) {
  if (typeof document === 'undefined') return;
  const metas = document.querySelectorAll(`meta[name="${name}"]`);
  if (metas.length === 0) {
    const el = document.createElement('meta');
    el.setAttribute('name', name);
    el.setAttribute('content', content);
    document.head.appendChild(el);
    return;
  }
  metas.forEach((el) => el.setAttribute('content', content));
}

/** Keep the browser/PWA chrome color in sync with the active theme. */
export function syncMetaThemeColor(color) {
  setMetaContent('theme-color', color);
  setMetaContent('msapplication-TileColor', color);
}

function resolvePresetId(themeConfig) {
  let id = themeConfig.presetId || DEFAULT_PRESET_ID;
  if (id === 'system') {
    id = getSystemTheme() === 'dark' ? 'kiro' : 'light';
  }
  return PRESET_THEMES.some((t) => t.id === id) ? id : DEFAULT_PRESET_ID;
}

export function applyThemeTokens(themeConfig) {
  if (!themeConfig || typeof document === 'undefined') return;
  const root = document.documentElement;

  const presetId = resolvePresetId(themeConfig);
  const preset = PRESET_THEMES.find((t) => t.id === presetId) || PRESET_THEMES[0];
  const { tokens, isDark } = themeConfig.customColors
    ? buildThemeTokens(preset.spec, themeConfig.customColors)
    : { tokens: preset.tokens, isDark: preset.isDark };

  Object.entries(tokens).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });
  root.style.colorScheme = isDark ? 'dark' : 'light';

  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  root.setAttribute('data-theme-preset', preset.id);
  root.setAttribute('data-theme-mode', themeConfig.mode || (isDark ? 'dark' : 'light'));

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

  syncMetaThemeColor(tokens['--theme-color']);

  try {
    localStorage.setItem(
      STORAGE_KEY_BOOT,
      JSON.stringify({ presetId: preset.id, isDark, tokens })
    );
  } catch {
    // Storage unavailable (private mode): first paint just falls back to defaults.
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { presetId: preset.id, config: themeConfig } }));
  }
}

/**
 * Pure resolution of the persisted theme config (no DOM writes).
 * Precedence: ?theme= URL override → saved full config → saved coarse mode → default.
 */
export function readSavedThemeConfig() {
  try {
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'dark' || urlTheme === 'light') {
        return {
          mode: urlTheme,
          presetId: urlTheme === 'dark' ? 'kiro' : 'light',
          customColors: null
        };
      }
      if (urlTheme && PRESET_THEMES.some((t) => t.id === urlTheme)) {
        return { presetId: urlTheme, customColors: null };
      }
    }
    if (typeof localStorage !== 'undefined') {
      // The full config is the source of truth for WHICH preset is active. (The
      // coarse mode key only ever stores light/dark/system, so reading it first
      // used to silently revert e.g. "Rose Minimal" to "Fintech Light" on reload.)
      const legacySaved = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacySaved) {
        const config = JSON.parse(legacySaved);
        if (config && typeof config === 'object') return config;
      }
      const savedMode = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedMode) {
        return {
          mode: savedMode,
          presetId:
            savedMode === 'dark'
              ? 'kiro'
              : savedMode === 'system'
                ? (getSystemTheme() === 'dark' ? 'kiro' : 'light')
                : 'light',
          customColors: null
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load theme from LocalStorage', e);
  }
  return { presetId: DEFAULT_PRESET_ID, mode: 'light', customColors: null };
}

export function loadSavedTheme() {
  const config = readSavedThemeConfig();
  applyThemeTokens(config);
  return config;
}

export function saveTheme(themeConfig) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(themeConfig));
      const preset = PRESET_THEMES.find((t) => t.id === themeConfig.presetId);
      const mode = themeConfig.mode || (preset?.isDark ? 'dark' : 'light');
      localStorage.setItem(STORAGE_KEY_THEME, mode);
    }
    applyThemeTokens(themeConfig);
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
