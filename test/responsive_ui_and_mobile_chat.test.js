import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('KampusKash — Responsive UI, Desktop Sidebar & Mobile AI Chatbot Verification', () => {
  const sidebarPath = path.resolve('src/components/Sidebar.jsx');
  const chatWindowPath = path.resolve('src/components/AIChat/ChatWindow.jsx');
  const chatInputPath = path.resolve('src/components/AIChat/ChatInput.jsx');
  const floatingButtonPath = path.resolve('src/components/AIChat/FloatingChatButton.jsx');
  const budgetsViewPath = path.resolve('src/views/BudgetsView.jsx');
  const savingsViewPath = path.resolve('src/views/SavingsView.jsx');
  const accountsViewPath = path.resolve('src/views/AccountsView.jsx');
  const indexCssPath = path.resolve('src/index.css');

  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const chatWindowContent = fs.readFileSync(chatWindowPath, 'utf8');
  const chatInputContent = fs.readFileSync(chatInputPath, 'utf8');
  const floatingButtonContent = fs.readFileSync(floatingButtonPath, 'utf8');
  const budgetsContent = fs.readFileSync(budgetsViewPath, 'utf8');
  const savingsContent = fs.readFileSync(savingsViewPath, 'utf8');
  const accountsContent = fs.readFileSync(accountsViewPath, 'utf8');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

  describe('Issue 1: Desktop Left Sidebar Scrolling Behavior', () => {
    it('1. Desktop sidebar does not use position: fixed or position: sticky', () => {
      // Find the base .sidebar declaration before the mobile query
      const baseSidebarBlock = sidebarContent.match(/\.sidebar\s*\{[\s\S]*?\}/);
      assert.ok(baseSidebarBlock, 'Base .sidebar block should exist');
      const css = baseSidebarBlock[0];
      assert.ok(!css.includes('position: fixed'), 'Desktop sidebar must not have position: fixed');
      assert.ok(!css.includes('position: sticky'), 'Desktop sidebar must not have position: sticky');
      assert.ok(css.includes('position: relative'), 'Desktop sidebar should have position: relative');
    });

    it('2. Desktop sidebar has align-self: flex-start and scrolls naturally with the document', () => {
      const baseSidebarBlock = sidebarContent.match(/\.sidebar\s*\{[\s\S]*?\}/);
      const css = baseSidebarBlock[0];
      assert.ok(css.includes('align-self: flex-start'), 'Desktop sidebar must have align-self: flex-start to scroll with document');
      assert.ok(css.includes('width: 260px'), 'Desktop sidebar preserves 260px width');
    });

    it('3. Mobile drawer uses scroll lock on document body when open', () => {
      assert.ok(sidebarContent.includes("document.body.style.overflow = 'hidden'"), 'Sidebar locks background body scroll when mobile drawer is open');
      assert.ok(sidebarContent.includes('document.body.style.overflow = originalOverflow'), 'Sidebar restores background scroll when closed');
    });
  });

  describe('Issue 2: Mobile Dashboard Responsiveness & Modals', () => {
    it('1. BudgetsView avoids fixed 320px column overflow by using min(100%, 280px)', () => {
      assert.ok(budgetsContent.includes('minmax(min(100%, 280px), 1fr)'), 'BudgetsView uses responsive minmax(min(100%, 280px), 1fr)');
    });

    it('2. SavingsView avoids fixed 320px column overflow by using min(100%, 280px)', () => {
      assert.ok(savingsContent.includes('minmax(min(100%, 280px), 1fr)'), 'SavingsView uses responsive minmax(min(100%, 280px), 1fr)');
    });

    it('3. AccountsView avoids fixed 300px column overflow by using min(100%, 280px)', () => {
      assert.ok(accountsContent.includes('minmax(min(100%, 280px), 1fr)'), 'AccountsView uses responsive minmax(min(100%, 280px), 1fr)');
    });

    it('4. Tables enforce touch-friendly horizontal momentum scrolling', () => {
      assert.ok(indexCssContent.includes('-webkit-overflow-scrolling: touch;'), 'Table container provides momentum touch scrolling');
    });

    it('5. Modals enforce max-height and internal vertical scrolling', () => {
      assert.ok(indexCssContent.includes('max-height: calc(100vh - 2rem)'), 'Modal content constrains max-height for mobile viewport');
      assert.ok(indexCssContent.includes('overflow-y: auto'), 'Modal content enables internal vertical scrolling');
    });
  });

  describe('Issue 3: Mobile AI Chatbot Close Button', () => {
    it('1. Close button is placed in top-right of chatbot header with type="button"', () => {
      assert.ok(chatWindowContent.includes('className="chat-header-close-btn"'), 'ChatWindow has dedicated chat-header-close-btn');
      assert.ok(chatWindowContent.includes('type="button"'), 'Close button explicitly specifies type="button" to prevent form submission');
    });

    it('2. Close button has a minimum 44px by 44px touch target', () => {
      assert.ok(chatWindowContent.includes("minWidth: '44px'"), 'Close button has minWidth: 44px');
      assert.ok(chatWindowContent.includes("minHeight: '44px'"), 'Close button has minHeight: 44px');
    });

    it('3. Closing only hides the modal without deleting messages or history', () => {
      assert.ok(chatWindowContent.includes('onClick={onClose}'), 'Close button invokes onClose');
      assert.ok(!chatWindowContent.includes('onClick={() => { setMessages([]); onClose(); }}'), 'Close button does not clear message array');
    });

    it('4. Escape key listener is registered to close chatbot', () => {
      assert.ok(chatWindowContent.includes("e.key === 'Escape' && onClose"), 'ChatWindow listens for Escape key');
      assert.ok(floatingButtonContent.includes("e.key === 'Escape' && isOpen"), 'Floating button listens for Escape key');
    });

    it('5. Backdrop overlay exists for tap-outside closing', () => {
      assert.ok(floatingButtonContent.includes('className="kampuskash-ai-backdrop"'), 'Floating button renders kampuskash-ai-backdrop');
      assert.ok(indexCssContent.includes('.kampuskash-ai-backdrop'), 'CSS defines backdrop overlay styling');
    });
  });

  describe('Issue 4: Mobile Chatbot Input & Keyboard Handling', () => {
    it('1. Keyboard shortcut instruction is tagged with chat-shortcut-hint and hidden on mobile/touch', () => {
      assert.ok(chatInputContent.includes('className="chat-shortcut-hint"'), 'ChatInput wraps shortcut instruction in .chat-shortcut-hint');
      assert.ok(/\.chat-shortcut-hint\s*\{\s*display:\s*none\s*!important;\s*\}/.test(indexCssContent), 'Mobile query hides .chat-shortcut-hint');
      assert.ok(/@media\s*\(pointer:\s*coarse\)[\s\S]*?\.chat-shortcut-hint/.test(indexCssContent), 'Touch pointer query hides .chat-shortcut-hint');
    });

    it('2. Mobile touch devices do not submit on Enter, allowing natural multiline input', () => {
      assert.ok(chatInputContent.includes("'ontouchstart' in window"), 'ChatInput checks touch capabilities');
      assert.ok(chatInputContent.includes('if (!isTouch)'), 'ChatInput only prevents default and submits on Enter for non-touch/desktop keyboards');
    });

    it('3. Send button has >= 44px touch target on mobile', () => {
      assert.ok(chatInputContent.includes("minWidth: '44px'"), 'Send button has minWidth 44px');
      assert.ok(chatInputContent.includes("minHeight: '44px'"), 'Send button has minHeight 44px');
    });

    it('4. Safe-area bottom padding is respected for mobile input', () => {
      assert.ok(chatWindowContent.includes('env(safe-area-inset-bottom'), 'ChatWindow applies safe-area-inset-bottom padding');
      assert.ok(indexCssContent.includes('env(safe-area-inset-bottom'), 'index.css applies safe-area-inset-bottom padding to floating button');
    });
  });

  describe('Issue 5: Mobile Viewport Height (dvh) and Action Confirmation Cards', () => {
    it('1. Mobile chat overlay uses 100dvh to adapt to on-screen virtual keyboard', () => {
      assert.ok(indexCssContent.includes('height: 100dvh !important;'), 'index.css uses 100dvh for popup overlay height');
      assert.ok(indexCssContent.includes('max-height: 100dvh !important;'), 'index.css uses 100dvh for popup overlay max-height');
    });

    it('2. Action confirmation card buttons wrap and provide >= 44px touch targets', () => {
      const actionCardPath = path.resolve('src/components/AIChat/ActionConfirmationCard.jsx');
      const actionCardContent = fs.readFileSync(actionCardPath, 'utf8');
      assert.ok(actionCardContent.includes("flexWrap: 'wrap'"), 'Action confirmation card buttons flexWrap');
      assert.ok(actionCardContent.includes("minHeight: '44px'"), 'Action confirmation card buttons have minHeight 44px');
    });
  });
});
