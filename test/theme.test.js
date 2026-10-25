import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  PRESET_THEMES, 
  DEFAULT_PRESET_ID, 
  buildThemeTokens, 
  contrastRatio,
  relativeLuminance 
} from '../src/utils/themeEngine.js';

describe('KampusKash Theme Engine & Design System', () => {
  it('should define exactly 10 tinted presets with full design tokens', () => {
    assert.strictEqual(PRESET_THEMES.length, 10);
    assert.strictEqual(DEFAULT_PRESET_ID, 'light');
    
    const expectedIds = ['light', 'rose', 'cute_cat', 'forest', 'kiro', 'ocean', 'mint', 'sunset', 'dark', 'purple'];
    expectedIds.forEach(id => {
      const found = PRESET_THEMES.find(t => t.id === id);
      assert.ok(found, `Missing preset with id: ${id}`);
      assert.ok(found.tokens['--bg-app'], `Missing --bg-app in ${id}`);
      assert.ok(found.tokens['--bg-app-gradient'], `Missing --bg-app-gradient in ${id}`);
      assert.ok(found.tokens['--bg-card'], `Missing --bg-card in ${id}`);
      assert.ok(found.tokens['--bg-sidebar'], `Missing --bg-sidebar in ${id}`);
      assert.ok(found.tokens['--primary'], `Missing --primary in ${id}`);
      assert.ok(found.tokens['--accent-fg'], `Missing --accent-fg in ${id}`);
      assert.ok(found.tokens['--income'], `Missing --income in ${id}`);
      assert.ok(found.tokens['--expense'], `Missing --expense in ${id}`);
    });
  });

  it('should satisfy WCAG AA contrast (>= 4.5:1) for textMain against card and background surfaces', () => {
    PRESET_THEMES.forEach(preset => {
      const text = preset.tokens['--text-main'];
      const card = preset.tokens['--bg-card'];
      const ratio = contrastRatio(text, card);
      assert.ok(
        ratio >= 4.5, 
        `Preset ${preset.id} failed WCAG AA on card: ratio is ${ratio.toFixed(2)}:1 (text: ${text}, card: ${card})`
      );
    });
  });

  it('should guarantee that no light theme uses a pure white page or card background', () => {
    const lightPresets = PRESET_THEMES.filter(t => !t.isDark);
    lightPresets.forEach(preset => {
      const bgFrom = preset.bgStops[0].toUpperCase();
      const card = preset.tokens['--bg-card'].toUpperCase();
      assert.notStrictEqual(bgFrom, '#FFFFFF', `Preset ${preset.id} has pure white page bg`);
      assert.notStrictEqual(card, '#FFFFFF', `Preset ${preset.id} has pure white card bg`);
      assert.ok(relativeLuminance(bgFrom) < 0.90, `Preset ${preset.id} page bg is too near-white`);
    });
  });

  it('should maintain distinct semantic income and expense indicators for every preset', () => {
    PRESET_THEMES.forEach(preset => {
      const income = preset.tokens['--income'];
      const expense = preset.tokens['--expense'];
      assert.notStrictEqual(income, expense, `Preset ${preset.id} has identical income and expense`);
      const incomeOnCard = contrastRatio(income, preset.tokens['--bg-card']);
      const expenseOnCard = contrastRatio(expense, preset.tokens['--bg-card']);
      assert.ok(incomeOnCard >= 4.5, `Preset ${preset.id} income contrast on card is ${incomeOnCard.toFixed(2)}`);
      assert.ok(expenseOnCard >= 4.5, `Preset ${preset.id} expense contrast on card is ${expenseOnCard.toFixed(2)}`);
    });
  });
});
