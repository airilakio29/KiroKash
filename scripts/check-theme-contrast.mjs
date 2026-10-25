#!/usr/bin/env node
/**
 * Theme contrast & tint audit.
 *
 * For every preset theme this checks (WCAG AA = 4.5:1 for text):
 *   - text tokens (main / muted / light / accent) on every page-gradient stop, card and subtle-card
 *   - text-on-primary on the primary button (rest + hover state)
 *   - sidebar text / muted text / active-item text
 *   - income, expense and warning colours on cards and on their tinted badge backgrounds
 *   - income vs expense stay semantically distinct (green vs red hue)
 *   - no theme uses a bright white page stop or a pure white card
 *
 * Usage: node scripts/check-theme-contrast.mjs   (exit code 1 on any failure)
 */
import {
  PRESET_THEMES,
  contrastRatio,
  compositeOver,
  parseColor,
  relativeLuminance
} from '../src/utils/themeEngine.js';

const AA = 4.5;
let failures = 0;

function hue({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return (h * 60 + 360) % 360;
}

function check(label, fg, bg, min = AA, rows) {
  const ratio = contrastRatio(fg, bg);
  const ok = ratio >= min;
  if (!ok) {
    failures += 1;
    rows.push(`  ✖ ${label}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (needs ${min})`);
  }
  return ratio;
}

const summary = [];

for (const preset of PRESET_THEMES) {
  const t = preset.tokens;
  const rows = [];
  const stops = preset.bgStops;
  const card = t['--bg-card'];
  const subtle = t['--bg-card-subtle'];
  const surfaces = {
    'bg-top': stops[0],
    'bg-mid': stops[1],
    'bg-bottom': stops[2],
    card,
    'card-subtle': subtle
  };

  for (const [surfName, surf] of Object.entries(surfaces)) {
    for (const tok of ['--text-main', '--text-muted', '--text-light', '--accent-fg']) {
      check(`${tok} on ${surfName}`, t[tok], surf, AA, rows);
    }
  }

  // Primary button (rest + hover)
  check('text-on-primary on primary', t['--text-on-primary'], t['--primary'], AA, rows);
  check('text-on-primary on primary-hover', t['--text-on-primary'], t['--primary-hover'], AA, rows);

  // Sidebar
  check('sidebar-text on sidebar', t['--sidebar-text'], t['--bg-sidebar'], AA, rows);
  check('sidebar-text-muted on sidebar', t['--sidebar-text-muted'], t['--bg-sidebar'], AA, rows);
  check('sidebar-active-text on sidebar-active', t['--sidebar-active-text'], t['--bg-sidebar-active'], AA, rows);

  // Semantic money colours on cards and on their tinted badge backgrounds
  const badgeMix = preset.isDark ? 0.2 : 0.14;
  for (const key of ['income', 'expense', 'warning']) {
    const col = t[`--${key}`];
    check(`${key} on card`, col, card, AA, rows);
    check(`${key} on card-subtle`, col, subtle, AA, rows);
    const c = parseColor(col);
    const tinted = compositeOver(`rgba(${c.r}, ${c.g}, ${c.b}, ${key === 'warning' && !preset.isDark ? 0.16 : badgeMix})`, card);
    check(`${key} on its own badge bg`, col, tinted, AA, rows);
  }

  // Provider (Google / Microsoft) button text
  check('provider-btn text on provider-btn bg', t['--provider-btn-text'], t['--provider-btn-bg'], AA, rows);

  // Semantic hue separation
  const incHue = hue(parseColor(t['--income']));
  const expHue = hue(parseColor(t['--expense']));
  const inGreen = incHue >= 90 && incHue <= 185;
  const inRed = expHue >= 335 || expHue <= 25;
  if (!inGreen) {
    failures += 1;
    rows.push(`  ✖ income hue ${incHue.toFixed(0)}° is not green`);
  }
  if (!inRed) {
    failures += 1;
    rows.push(`  ✖ expense hue ${expHue.toFixed(0)}° is not red`);
  }

  // Tint rules: no bright white page, no pure white card
  for (const stop of stops) {
    const c = parseColor(stop);
    const chroma = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    if (!preset.isDark && (relativeLuminance(c) > 0.82 || chroma < 25)) {
      failures += 1;
      rows.push(`  ✖ page stop ${stop} is too white / not tinted enough (luminance ${relativeLuminance(c).toFixed(2)}, chroma ${chroma})`);
    }
  }
  if (/^#f{6}$/i.test(card) || /^#fff$/i.test(card)) {
    failures += 1;
    rows.push('  ✖ card is pure white');
  }

  summary.push({ preset, rows });
}

for (const { preset, rows } of summary) {
  const t = preset.tokens;
  console.log(
    `${rows.length === 0 ? '✔' : '✖'} ${preset.name.padEnd(18)} [${preset.isDark ? 'dark ' : 'light'}] ` +
      `page ${preset.bgStops.join(' → ')} | card ${t['--bg-card']} | sidebar ${t['--bg-sidebar']} | accent ${t['--primary']}`
  );
  rows.forEach((r) => console.log(r));
}

if (failures > 0) {
  console.error(`\n${failures} contrast/tint check(s) failed.`);
  process.exit(1);
}
console.log('\nAll themes pass WCAG AA contrast and tint rules.');
