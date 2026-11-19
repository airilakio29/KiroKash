import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('1. Spot Jimat — Compact single-row header, collapsible filters, and single quick-filter category row', () => {
  const communityView = fs.readFileSync(path.join(root, 'src/views/CommunityView.jsx'), 'utf8');
  const filtersCode = fs.readFileSync(path.join(root, 'src/components/community/CommunityFilters.jsx'), 'utf8');
  const communityCss = fs.readFileSync(path.join(root, 'src/styles/community.css'), 'utf8');

  // Redundant subtitle removed from header, compact Peta & Kongsi buttons kept
  assert.ok(!communityView.includes('community-subtitle-compact'));
  assert.ok(communityView.includes('<span>Peta</span>'));
  assert.ok(communityView.includes('<span>Kongsi</span>'));

  // Collapsible Filter toggle with active count badge and drawer containing dropdowns + tags
  assert.ok(filtersCode.includes('const [isFiltersOpen, setIsFiltersOpen] = useState(false)'));
  assert.ok(filtersCode.includes('community-filter-toggle-btn'));
  assert.ok(filtersCode.includes('community-filter-count-badge'));
  assert.ok(filtersCode.includes('id="spot-jimat-collapsible-filters"'));
  assert.ok(filtersCode.includes('id="campus-select"'));
  assert.ok(filtersCode.includes('id="sort-select"'));

  // Mobile header stays single row and bottom nav safe-area padding is preserved
  assert.ok(communityCss.includes('flex-direction: row;'));
  assert.ok(communityCss.includes('env(safe-area-inset-bottom, 0px)'));
});

test('2. AI Assistant — 4 concise quick prompts above input, visible greeting, slim notice bar, and hidden FAB on AI page', () => {
  const suggestedCode = fs.readFileSync(path.join(root, 'src/components/AIChat/SuggestedQuestions.jsx'), 'utf8');
  const chatWindowCode = fs.readFileSync(path.join(root, 'src/components/AIChat/ChatWindow.jsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');

  // Exactly 4 concise prompts
  assert.ok(suggestedCode.includes("label: 'Analyse spending'"));
  assert.ok(suggestedCode.includes("label: 'Budget RM900'"));
  assert.ok(suggestedCode.includes("label: 'Save RM1,000'"));
  assert.ok(suggestedCode.includes("label: 'Monthly summary'"));
  assert.ok(suggestedCode.includes("flexWrap: 'nowrap'"));

  // Slim single-line notice bar
  assert.ok(chatWindowCode.includes('Uses your records • Confirms before acting'));
  assert.ok(!chatWindowCode.includes('Grounded in your actual records • Actions require explicit confirmation'));

  // Auto-scroll does not push initial greeting off-screen, and SuggestedQuestions is outside message stream
  assert.ok(chatWindowCode.includes('if (messages.length > 1 || isLoading)'));
  const msgEndIdx = chatWindowCode.indexOf('ref={messagesEndRef}');
  const suggestedIdx = chatWindowCode.indexOf('<SuggestedQuestions');
  assert.ok(suggestedIdx > msgEndIdx, 'SuggestedQuestions must render below message stream directly above ChatInput');

  // Floating AI FAB hidden on AI Assistant page
  assert.ok(appCode.includes("activeTab !== 'ai-chat'") && appCode.includes('<FloatingChatButton'));
});

test('3. KampusKash Connect — Tight profile card, single-line privacy notice, and scannable 2-button student cards', () => {
  const connectView = fs.readFileSync(path.join(root, 'src/views/ConnectView.jsx'), 'utf8');
  const connectCss = fs.readFileSync(path.join(root, 'src/styles/connect.css'), 'utf8');

  // Redundant top badges removed from profile card
  assert.ok(!connectView.includes('kk-connect-badge-row'));
  assert.ok(!connectView.includes('Financial Privacy Guaranteed:'));

  // Compact single-line privacy strip
  assert.ok(connectView.includes('🔒 Private: Balances &amp; transactions are hidden.'));

  // Inline "View All (N)" header on Discover Campus Students without subtitle
  assert.ok(connectView.includes('kk-connect-section-header-inline'));
  assert.ok(connectView.includes('Discover Campus Students'));
  assert.ok(!connectView.includes('Connect with verified students across Malaysian universities'));

  // Discover student cards remove Online pill, course line, and friend count tag; keep 1-line truncated bio & 2 side-by-side buttons
  const discoverCardFn = connectView.slice(
    connectView.indexOf('const renderStudentDiscoverCard'),
    connectView.indexOf('const totalRequestsCount')
  );
  assert.ok(!discoverCardFn.includes('● Online'));
  assert.ok(!discoverCardFn.includes('person.course'));
  assert.ok(!discoverCardFn.includes('person.friendsCount'));
  assert.ok(connectCss.includes('text-overflow: ellipsis;'));
  assert.ok(connectCss.includes('padding-bottom: calc(var(--mobile-nav-clearance, 88px)'));
});
