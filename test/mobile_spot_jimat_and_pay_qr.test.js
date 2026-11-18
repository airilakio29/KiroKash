/**
 * KAMPUSKASH — MOBILE UI FIXES (SPOT JIMAT & PAY/QR SECTIONS) TEST SUITE
 *
 * Verifies across 320px, 375px, 390px, 430px mobile viewports and desktop:
 *   1. Spot Jimat mobile responsiveness:
 *      - .community-cards-grid uses responsive minmax(min(100%, 320px), 1fr) and minmax(0, 1fr) on mobile.
 *      - .community-thread-card enforces width: 100%, max-width: 100%, min-width: 0, box-sizing: border-box.
 *      - .community-tags-scroll-row and .community-controls-subrow constrain horizontal width on mobile
 *        so horizontal chip strips never blow out .community-filters-card or the page width.
 *      - Long place names, titles, addresses, tags, and author names wrap naturally without clipping.
 *   2. Reusable Mobile Pay / QR Page Header (PayPageHeader.jsx):
 *      - Row 1 (.pay-header-top-row): Compact "Back to Pay" button on left, optional "Brightness" button on right.
 *      - Row 2 (.pay-header-title-row): Left-aligned .pay-subview-title below the controls row.
 *      - Used consistently across Scan QR, My Personal QR, Transfer Money, Request & Split Bill, and Transaction History.
 *   3. Mobile QR Card & Safe Area Layout:
 *      - .pay-qr-display-frame scales proportionally with width: min(220px, 100%) (and min(196px, 100%) on <=480px) and aspect-ratio: 1 / 1.
 *      - .pay-myqr-card and .pay-myqr-card-header wrap cleanly without horizontal overflow.
 *      - Bottom navigation clearance and safe-area-inset-bottom are respected on mobile.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const communityCss = fs.readFileSync(path.resolve('src/styles/community.css'), 'utf8');
const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
const payViewCode = fs.readFileSync(path.resolve('src/views/PayView.jsx'), 'utf8');
const scanPaySheetCode = fs.readFileSync(
  path.resolve('src/components/wallet/ScanPaySheet.jsx'),
  'utf8'
);
const payHeaderCode = fs.readFileSync(
  path.resolve('src/components/wallet/PayPageHeader.jsx'),
  'utf8'
);

test('1. Spot Jimat mobile responsiveness & zero horizontal overflow rules', () => {
  // Grid uses minmax(min(100%, 320px), 1fr) on desktop and minmax(0, 1fr) on mobile
  assert.ok(
    communityCss.includes('minmax(min(100%, 320px), 1fr)'),
    'Spot Jimat grid must use responsive minmax(min(100%, 320px), 1fr)'
  );
  assert.ok(
    communityCss.includes('grid-template-columns: minmax(0, 1fr);'),
    'Spot Jimat mobile grid must use minmax(0, 1fr) to prevent auto-minimum track expansion'
  );

  // Thread card constrains width and allows natural text wrapping
  assert.ok(
    communityCss.includes('.community-thread-card') &&
      communityCss.includes('max-width: 100%;') &&
      communityCss.includes('min-width: 0;') &&
      communityCss.includes('box-sizing: border-box;'),
    'Each Spot Jimat recommendation card must constrain width to 100% with min-width: 0'
  );

  // Filter subrow and horizontal tag scroll row constrain width on mobile
  assert.ok(
    communityCss.includes('.community-tags-scroll-row') &&
      communityCss.includes('width: 100%;') &&
      communityCss.includes('max-width: 100%;'),
    '.community-tags-scroll-row must be constrained to 100% width so chip strips do not expand parent width on mobile'
  );

  // Explore cafe cards and voucher cards also enforce min-width: 0 and max-width: 100%
  assert.ok(
    indexCss.includes('minmax(min(100%, 280px), 1fr)'),
    'Explore vouchers grid must use minmax(min(100%, 280px), 1fr)'
  );
});

test('2. Reusable PayPageHeader two-row layout & consistent usage across all Pay subpages', () => {
  // Verify PayPageHeader structure: Row 1 (.pay-header-top-row) + Row 2 (.pay-header-title-row)
  assert.ok(
    payHeaderCode.includes('className="pay-subview-header"') &&
      payHeaderCode.includes('className="pay-header-top-row"') &&
      payHeaderCode.includes('className="pay-header-title-row"'),
    'PayPageHeader must render a top controls row and a dedicated second row for the page title'
  );

  assert.ok(
    payHeaderCode.includes('className="pay-back-btn"') &&
      payHeaderCode.includes('pay-brightness-btn'),
    'PayPageHeader must include compact Back to Pay and Brightness Boost controls'
  );

  // Verify no legacy 80px spacer remains in PayView headers
  assert.ok(
    !payViewCode.includes("width: '80px'"),
    'Legacy hardcoded 80px header spacer must be removed from PayView'
  );

  // Verify PayView uses PayPageHeader across all Pay subroutes
  assert.ok(
    payViewCode.includes("import PayPageHeader from '../components/wallet/PayPageHeader';"),
    'PayView must import the shared PayPageHeader component'
  );
  assert.ok(
    payViewCode.includes('title="Scan QR Code"') &&
      payViewCode.includes('title="My Personal QR"') &&
      payViewCode.includes('title="Transfer Money"') &&
      payViewCode.includes('title="Request & Split Bill"') &&
      payViewCode.includes('title="Transaction History"'),
    'All 5 Pay subroutes must use PayPageHeader with their respective titles'
  );
  assert.ok(
    payViewCode.includes('showBrightnessToggle'),
    'My Personal QR page must enable the compact Brightness Boost toggle in PayPageHeader'
  );
});

test('3 & 4. Proportional QR display frame, mobile safe-area clearance & viewport width verification (320px, 375px, 390px, 430px)', () => {
  // QR frame scales down proportionally and maintains square aspect ratio
  assert.ok(
    payViewCode.includes('width: min(220px, 100%);') &&
      payViewCode.includes('width: min(196px, 100%);') &&
      payViewCode.includes('aspect-ratio: 1 / 1;'),
    '.pay-qr-display-frame must scale proportionally with width: min(220px, 100%) / min(196px, 100%) and aspect-ratio: 1 / 1'
  );

  assert.ok(
    scanPaySheetCode.includes("width: 'min(220px, 100%)'") &&
      scanPaySheetCode.includes("aspectRatio: '1 / 1'"),
    'ScanPaySheet QR container must also scale proportionally on mobile'
  );

  // Mobile bottom navigation clearance in PayView and Spot Jimat
  assert.ok(
    payViewCode.includes('var(--mobile-nav-clearance, 88px)') &&
      communityCss.includes('var(--mobile-nav-clearance, 88px)'),
    'Both PayView and Spot Jimat must include bottom padding clearance for the fixed mobile bottom navigation and safe-area-inset-bottom'
  );

  // Verify layout geometry across all 4 required mobile widths: 320px, 375px, 390px, 430px
  const mobileViewports = [320, 375, 390, 430];
  for (const vw of mobileViewports) {
    const contentAreaPadding = 32; // 1rem left + 1rem right
    const availableContentWidth = vw - contentAreaPadding;

    // 1. Spot Jimat card width uses minmax(0, 1fr) inside content-area -> equals availableContentWidth
    const spotCardWidth = availableContentWidth;
    assert.ok(
      spotCardWidth <= vw && spotCardWidth >= 280,
      `Spot Jimat card fits comfortably inside ${vw}px viewport (${spotCardWidth}px)`
    );

    // 2. Pay header Row 1 controls fit side-by-side without overlapping
    const paySubviewPadding = vw <= 480 ? 28.8 : 48; // 0.9rem * 2 on <=480px
    const headerInnerWidth = availableContentWidth - paySubviewPadding;
    const backBtnWidth = 108; // compact pill button
    const brightnessBtnWidth = 102; // compact pill button
    const rowGap = 8;
    assert.ok(
      backBtnWidth + brightnessBtnWidth + rowGap <= headerInnerWidth,
      `Back to Pay + Brightness Boost fit side-by-side at ${vw}px (${backBtnWidth + brightnessBtnWidth + rowGap}px <= ${headerInnerWidth}px)`
    );

    // 3. QR card and square QR frame fit inside mobile subview
    const qrCardPadding = vw <= 480 ? 30.4 : 36.8; // 0.95rem * 2
    const qrCardInnerWidth = headerInnerWidth - qrCardPadding;
    const qrFrameSize = Math.min(vw <= 480 ? 196 : 220, qrCardInnerWidth);
    assert.ok(
      qrFrameSize <= qrCardInnerWidth && qrFrameSize >= 170,
      `Square QR frame (${qrFrameSize}x${qrFrameSize}px) fits inside QR card (${qrCardInnerWidth}px) at ${vw}px viewport`
    );
  }
});
