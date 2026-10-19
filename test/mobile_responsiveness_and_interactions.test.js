import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('KampusKash — Mobile Responsiveness & Premium Interaction Upgrade Tests', () => {
  const indexHtmlPath = path.resolve('index.html');
  const indexCssPath = path.resolve('src/index.css');
  const appPath = path.resolve('src/App.jsx');
  const headerPath = path.resolve('src/components/Header.jsx');
  const sidebarPath = path.resolve('src/components/Sidebar.jsx');
  const pieChartPath = path.resolve('src/components/PieChart.jsx');
  const floatingNavBtnPath = path.resolve('src/components/FloatingNavButton.jsx');
  const floatingChatBtnPath = path.resolve('src/components/AIChat/FloatingChatButton.jsx');
  const dashboardViewPath = path.resolve('src/views/DashboardView.jsx');
  const chatWindowPath = path.resolve('src/components/AIChat/ChatWindow.jsx');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const headerCode = fs.readFileSync(headerPath, 'utf8');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  const pieChartCode = fs.readFileSync(pieChartPath, 'utf8');
  const floatingNavBtnCode = fs.readFileSync(floatingNavBtnPath, 'utf8');
  const floatingChatBtnCode = fs.readFileSync(floatingChatBtnPath, 'utf8');
  const dashboardCode = fs.readFileSync(dashboardViewPath, 'utf8');
  const chatWindowCode = fs.readFileSync(chatWindowPath, 'utf8');

  describe('PHASE 1: Mobile Dashboard Overflow & Layout Responsiveness', () => {
    it('1. PieChart legend uses 2-column wrapping grid on mobile without cut-off', () => {
      assert.ok(pieChartCode.includes('.pie-legend-grid'), 'PieChart defines .pie-legend-grid');
      assert.ok(pieChartCode.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'PieChart uses 2 equal minmax(0, 1fr) columns on mobile');
      assert.ok(pieChartCode.includes('word-break: break-word') || pieChartCode.includes('overflow-wrap: break-word'), 'PieChart legend text allows natural multi-line wrapping');
    });

    it('2. Donut SVG has max-width constraint to prevent horizontal blowout', () => {
      assert.ok(pieChartCode.includes("maxWidth: '220px'"), 'SVG donut chart constrained to maxWidth: 220px');
      assert.ok(pieChartCode.includes("width: '100%'"), 'SVG donut chart scales down with width: 100%');
    });

    it('3. Recent Transactions flex layout prevents amount clipping and wraps long descriptions', () => {
      assert.ok(dashboardCode.includes("whiteSpace: 'nowrap'") && dashboardCode.includes("flexShrink: 0"), 'Amount in Recent Transactions is protected with flexShrink: 0');
      assert.ok(dashboardCode.includes("wordBreak: 'break-word'"), 'Title and date in Recent Transactions wrap cleanly');
    });

    it('4. CSS Grid tracks at <= 1024px enforce minmax(0, 1fr) to prevent track blowout', () => {
      assert.ok(indexCss.includes('grid-template-columns: minmax(0, 1fr) !important'), 'Main dashboard grid uses minmax(0, 1fr)');
    });

    it('5. Metric cards at <= 480px enforce minmax(0, 1fr)', () => {
      assert.ok(indexCss.includes('grid-template-columns: minmax(0, 1fr)'), 'Metrics grid wraps to single column on small screens');
    });
  });

  describe('PHASE 2: Floating Mobile Navigation Button', () => {
    it('1. Floating navigation button component exists and is rendered in App.jsx', () => {
      assert.ok(appCode.includes('<FloatingNavButton'), 'App.jsx mounts FloatingNavButton');
      assert.ok(appCode.includes("import FloatingNavButton from './components/FloatingNavButton'"), 'FloatingNavButton imported in App.jsx');
    });

    it('2. Floating nav button is positioned fixed at bottom-left respecting safe-area-inset-bottom and left', () => {
      assert.ok(floatingNavBtnCode.includes('position: fixed'), 'Floating nav button is fixed');
      assert.ok(floatingNavBtnCode.includes('calc(1.25rem + env(safe-area-inset-bottom, 0px))'), 'Floating nav button respects bottom safe area');
      assert.ok(floatingNavBtnCode.includes('calc(1.25rem + env(safe-area-inset-left, 0px))'), 'Floating nav button respects left safe area');
    });

    it('3. Floating nav button adheres to KampusKash purple brand identity and 50px circular design', () => {
      assert.ok(floatingNavBtnCode.includes('width: 50px'), '50px width');
      assert.ok(floatingNavBtnCode.includes('height: 50px'), '50px height');
      assert.ok(floatingNavBtnCode.includes('border-radius: 50%'), 'Circular 50% border radius');
      assert.ok(floatingNavBtnCode.includes('rgba(139, 92, 246') || floatingNavBtnCode.includes('rgba(168, 85, 247'), 'Purple border or glow applied');
    });

    it('4. Floating nav button only renders on mobile viewports (hidden on desktop)', () => {
      assert.ok(floatingNavBtnCode.includes('display: none'), 'Hidden by default on desktop');
      assert.ok(floatingNavBtnCode.includes('@media (max-width: 900px)'), 'Mobile media query displays button');
    });

    it('5. Floating nav button and AI button do not overlap and have sufficient clearance', () => {
      assert.ok(floatingNavBtnCode.includes('left: calc('), 'Nav button sits at bottom-left');
      assert.ok(floatingChatBtnCode.includes('right: calc('), 'AI Assistant button sits at bottom-right');
    });

    it('6. Content area adds bottom padding to ensure floating buttons never cover content', () => {
      assert.ok(indexCss.includes('calc(5.5rem + env(safe-area-inset-bottom, 0px))'), 'content-area adds 5.5rem bottom clearance for floating action buttons');
    });
  });

  describe('PHASE 3: iPhone Status Bar, Notch and Safe Area Handling', () => {
    it('1. index.html includes viewport-fit=cover and black-translucent status bar meta', () => {
      assert.ok(indexHtml.includes('viewport-fit=cover'), 'index.html contains viewport-fit=cover');
      assert.ok(indexHtml.includes('apple-mobile-web-app-status-bar-style'), 'iOS status bar style defined');
    });

    it('2. Header starts safely below iPhone status bar / Dynamic Island', () => {
      assert.ok(headerCode.includes('env(safe-area-inset-top, 0px)'), 'Header uses env(safe-area-inset-top)');
      assert.ok(headerCode.includes('position: sticky'), 'Header stays sticky at top of viewport');
      assert.ok(headerCode.includes('top: 0'), 'Header pinned to top: 0');
    });

    it('3. Navigation drawer respects top, bottom and left safe-area insets', () => {
      assert.ok(sidebarCode.includes('calc(env(safe-area-inset-top, 0px)'), 'Sidebar respects top safe area');
      assert.ok(sidebarCode.includes('calc(env(safe-area-inset-bottom, 0px)'), 'Sidebar respects bottom safe area');
      assert.ok(sidebarCode.includes('calc(env(safe-area-inset-left, 0px)'), 'Sidebar respects left safe area');
    });

    it('4. Modal overlay and AI full-screen modal respect safe-area insets', () => {
      assert.ok(indexCss.includes('padding-top: max(1rem, env(safe-area-inset-top, 0px))'), 'Modal overlay respects top safe area');
      assert.ok(chatWindowCode.includes('env(safe-area-inset-top, 0px)'), 'ChatWindow respects top safe area');
      assert.ok(chatWindowCode.includes('env(safe-area-inset-bottom, 0px)'), 'ChatWindow respects bottom safe area');
    });
  });

  describe('PHASE 4 & 5: Premium Animations, Transitions & Performance', () => {
    it('1. Buttons, icons, and interactive elements have tactile active scale micro-interactions', () => {
      assert.ok(indexCss.includes('.btn:active'), 'Buttons have :active styles');
      assert.ok(indexCss.includes('transform: scale(0.97) !important'), 'Interactive elements scale down subtly on press');
    });

    it('2. View fade-in animation exists for seamless page switches', () => {
      assert.ok(indexCss.includes('.view-fade-in'), 'Defines .view-fade-in class');
      assert.ok(indexCss.includes('@keyframes viewFadeIn'), 'Defines @keyframes viewFadeIn');
    });

    it('3. Modal uses scale-up transition instead of abrupt layout jump', () => {
      assert.ok(indexCss.includes('@keyframes modalScaleIn'), 'Defines modalScaleIn keyframes');
      assert.ok(indexCss.includes('animation: modalScaleIn'), 'Modal content applies modalScaleIn');
    });

    it('4. Accessibility: prefers-reduced-motion is respected', () => {
      assert.ok(indexCss.includes('@media (prefers-reduced-motion: reduce)'), 'prefers-reduced-motion media query is implemented');
      assert.ok(indexCss.includes('animation-duration: 0.01ms !important'), 'Animations disabled when user prefers reduced motion');
    });
  });
});
