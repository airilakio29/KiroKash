import '../styles/community.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import {
  filterAndSortThreads,
  subscribeToCommunityThreads,
  createFirestoreCommunityThread,
  toggleFirestoreCommunityVote,
  addFirestoreCommunityReply,
  reportFirestoreCommunityThread,
  subscribeToCommunityReplies
} from '../services/communityService';
import { generateDemoThreads } from '../demo/demoData';
import CommunityFilters from '../components/community/CommunityFilters';
import ThreadCard from '../components/community/ThreadCard';
import CreateThreadModal from '../components/community/CreateThreadModal';
import ThreadDetailModal from '../components/community/ThreadDetailModal';
import {
  Utensils,
  Plus,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  DownloadCloud
} from 'lucide-react';

export default function CommunityView({ onNavigateToExplore, initialSearchQuery = '' }) {
  const { user } = useAuth();
  const finance = useFinance() || {};

  const isDemo = Boolean(finance.isDemoMode);

  // Live Firestore State (when not in demo mode)
  const [liveThreads, setLiveThreads] = useState([]);
  const [liveUserUpvotes, setLiveUserUpvotes] = useState(() => new Set());
  const [isLoadingLive, setIsLoadingLive] = useState(!isDemo);
  const [liveError, setLiveError] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Active Filter States
  const [campus, setCampus] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [maxPrice, setMaxPrice] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('newest');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeReplies, setActiveReplies] = useState([]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Curated student starter spots (used as fallback when database is fresh)
  const starterCuratedThreads = useMemo(() => {
    return generateDemoThreads().map(t => ({ ...t, isCuratedStarter: true }));
  }, []);

  // Subscribe to live Firestore threads when not in demo mode
  useEffect(() => {
    if (isDemo) {
      setIsLoadingLive(false);
      return;
    }

    setIsLoadingLive(true);
    setLiveError(null);

    const unsubscribe = subscribeToCommunityThreads(
      (threads) => {
        setLiveThreads(threads);
        setIsLoadingLive(false);
      },
      (err) => {
        console.error('Failed to load community threads from Firestore:', err);
        setLiveError('Gagal memuat turun ulasan komuniti.');
        setIsLoadingLive(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isDemo]);

  // If in demo mode: use finance.communityThreads
  // If in live mode with records: use liveThreads
  // If in live mode with 0 records: fallback to starterCuratedThreads so screen is NEVER a ghost town
  const allThreads = useMemo(() => {
    if (isDemo) {
      return finance.communityThreads || [];
    }
    if (liveThreads.length > 0) {
      return liveThreads;
    }
    return starterCuratedThreads;
  }, [isDemo, finance.communityThreads, liveThreads, starterCuratedThreads]);

  const isShowingStarterFallbacks = !isDemo && liveThreads.length === 0;

  // Filter & Sort Threads
  const filteredThreads = useMemo(() => {
    return filterAndSortThreads(allThreads, {
      campus,
      maxPrice,
      selectedTags,
      sort: sortBy,
      searchQuery
    });
  }, [allThreads, campus, maxPrice, selectedTags, sortBy, searchQuery]);

  // Set of user-upvoted thread IDs
  const userUpvotesSet = useMemo(() => {
    if (isDemo) {
      return finance.communityUserUpvotes || new Set();
    }
    return liveUserUpvotes;
  }, [isDemo, finance.communityUserUpvotes, liveUserUpvotes]);

  // Toggle Upvote Handler
  const handleToggleUpvote = useCallback(async (threadId) => {
    if (isDemo || isShowingStarterFallbacks) {
      if (finance.toggleCommunityVote) {
        finance.toggleCommunityVote(threadId);
      } else {
        setLiveUserUpvotes(prev => {
          const next = new Set(prev);
          if (next.has(threadId)) next.delete(threadId);
          else next.add(threadId);
          return next;
        });
      }
      return;
    }

    if (!user) {
      showToast('Sila log masuk untuk mengundi ulasan.');
      return;
    }

    try {
      const isNowVoted = await toggleFirestoreCommunityVote(threadId, user.id || user.uid);
      setLiveUserUpvotes(prev => {
        const next = new Set(prev);
        if (isNowVoted) next.add(threadId);
        else next.delete(threadId);
        return next;
      });
    } catch (err) {
      console.error('Upvote error:', err);
      showToast('Gagal mengemas kini undian.');
    }
  }, [isDemo, isShowingStarterFallbacks, finance, user, showToast]);

  // Create Thread Handler
  const handleCreateThread = useCallback(async (formData) => {
    if (isDemo) {
      if (finance.addCommunityThread) {
        finance.addCommunityThread(formData, user);
        showToast('Port makan berjaya dikongsi dalam mod demo!');
      }
      return;
    }

    try {
      await createFirestoreCommunityThread(user, formData);
      showToast('Port makan bajet berjaya dikongsi ke komuniti!');
    } catch (err) {
      console.error('Create thread error:', err);
      throw err;
    }
  }, [isDemo, finance, user, showToast]);

  // One-click Seed Starter Spots into Live Firestore
  const handleSeedStarterSpots = async () => {
    if (!user) {
      showToast('Sila log masuk terlebih dahulu.');
      return;
    }
    try {
      setIsSeeding(true);
      for (const starter of starterCuratedThreads) {
        await createFirestoreCommunityThread(user, {
          placeName: starter.placeName,
          title: starter.title,
          body: starter.body,
          pricePerMeal: starter.pricePerMeal,
          rating: starter.rating,
          campus: starter.campus,
          tags: starter.tags,
          address: starter.address || null
        });
      }
      showToast('6 port makan bajet berjaya dimuatkan ke komuniti live!');
    } catch (err) {
      console.error('Failed to seed starter spots:', err);
      showToast('Gagal memuatkan port starter: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Add Reply Handler
  const handleAddReply = useCallback(async (threadId, replyText) => {
    if (isDemo || isShowingStarterFallbacks) {
      if (finance.addCommunityReply) {
        const newReply = finance.addCommunityReply(threadId, replyText, user);
        setActiveReplies(prev => [...prev, newReply]);
      } else {
        const mockReply = {
          id: `rep-local-${Date.now()}`,
          authorName: user?.username || 'Saya',
          authorUniversity: user?.university || 'Pelajar',
          body: replyText,
          createdAt: new Date().toISOString()
        };
        setActiveReplies(prev => [...prev, mockReply]);
      }
      showToast('Komen berjaya dihantar!');
      return;
    }

    try {
      const newReply = await addFirestoreCommunityReply(threadId, user, replyText);
      setActiveReplies(prev => [...prev, newReply]);
      showToast('Komen berjaya dihantar!');
    } catch (err) {
      console.error('Add reply error:', err);
      throw err;
    }
  }, [isDemo, isShowingStarterFallbacks, finance, user, showToast]);

  // Report Thread Handler
  const handleReportThread = useCallback(async (thread) => {
    const confirmed = window.confirm(`Adakah anda pasti ingin melaporkan ulasan "${thread.placeName}" untuk semakan pihak moderator kampus?`);
    if (!confirmed) return;

    if (isDemo || isShowingStarterFallbacks) {
      showToast('Laporan diterima untuk semakan moderator kampus.');
      return;
    }

    try {
      await reportFirestoreCommunityThread(thread.id, user, 'Inappropriate or inaccurate information');
      showToast('Laporan dihantar kepada moderator.');
    } catch (err) {
      console.error('Report error:', err);
      showToast('Gagal menghantar laporan.');
    }
  }, [isDemo, isShowingStarterFallbacks, user, showToast]);

  // Live replies listener when detail modal is open
  useEffect(() => {
    if (!selectedThread) {
      setActiveReplies([]);
      return;
    }

    if (isDemo || isShowingStarterFallbacks) {
      const current = allThreads.find(t => t.id === selectedThread.id);
      setActiveReplies(current?.replies || selectedThread.replies || []);
      return;
    }

    const unsub = subscribeToCommunityReplies(
      selectedThread.id,
      (replies) => setActiveReplies(replies),
      (err) => console.error('Replies listener error:', err)
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [selectedThread, isDemo, isShowingStarterFallbacks, allThreads]);

  const handleToggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="community-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="community-floating-toast" role="status" aria-live="polite">
          <CheckCircle2 size={16} className="toast-icon text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Item 2: Compact Top Header (Saves 180px of vertical space) */}
      <div className="community-header-compact">
        <div className="header-compact-left">
          <div className="community-title-row">
            <h1 className="community-page-title">Makan Murah</h1>
            <span className="community-count-pill">{filteredThreads.length} port</span>
          </div>
          <p className="community-subtitle-compact">
            Port makan sedap & bajet pelajar RM3–RM15 seluruh kampus
          </p>
        </div>

        <div className="header-compact-actions">
          {onNavigateToExplore && (
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={onNavigateToExplore}
              title="Lihat Peta Kafe di Sekitar"
            >
              <Compass size={15} />
              <span>Peta Explore</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary btn-compact"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={15} />
            <span>Kongsi Tempat</span>
          </button>
        </div>
      </div>

      {/* Item 5 Notice: When viewing curated starters on fresh accounts */}
      {isShowingStarterFallbacks && (
        <div className="curated-starters-notice-bar">
          <div className="starters-notice-text">
            <Sparkles size={14} className="text-primary flex-shrink-0" />
            <span>
              Menampilkan <strong>6 cadangan port makanan bajet pelajar</strong>. Anda boleh kongsi ulasan kedai baru atau muatkan cadangan ini.
            </span>
          </div>
          {user && (
            <button
              type="button"
              className="btn-seed-starters"
              onClick={handleSeedStarterSpots}
              disabled={isSeeding}
            >
              <DownloadCloud size={13} />
              <span>{isSeeding ? 'Memuatkan...' : 'Simpan ke Live'}</span>
            </button>
          )}
        </div>
      )}

      {/* Item 3: Streamlined Unified Toolbar */}
      <CommunityFilters
        campus={campus}
        onCampusChange={setCampus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalCount={filteredThreads.length}
      />

      {/* Main Threads Content Grid */}
      <div className="community-feed-container">
        {isLoadingLive ? (
          <div className="community-loading-state">
            <div className="community-spinner" />
            <p>Memuat turun ulasan makanan bajet...</p>
          </div>
        ) : liveError ? (
          <div className="community-error-card">
            <AlertTriangle size={28} className="text-warning" />
            <h3>Maaf, sambungan terganggu</h3>
            <p>{liveError}</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="community-empty-state">
            <div className="empty-icon-wrap">
              <Utensils size={30} className="text-muted" />
            </div>
            <h3>Tiada Port Dijumpai</h3>
            <p>
              Tiada kedai yang sepadan dengan tapisan carian anda. Sila ubah atau reset tapisan.
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCampus('all');
                  setSearchQuery('');
                  setMaxPrice(null);
                  setSelectedTags([]);
                }}
              >
                Reset Tapisan
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={14} />
                <span>Kongsi Tempat Sekarang</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="community-cards-grid">
            {filteredThreads.map(thread => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                isUpvoted={userUpvotesSet.has(thread.id)}
                onToggleUpvote={handleToggleUpvote}
                onClick={(t) => setSelectedThread(t)}
                onReport={handleReportThread}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateThread}
        user={user}
      />

      {/* Thread Detail Modal */}
      <ThreadDetailModal
        thread={selectedThread}
        isOpen={Boolean(selectedThread)}
        onClose={() => setSelectedThread(null)}
        isUpvoted={selectedThread ? userUpvotesSet.has(selectedThread.id) : false}
        onToggleUpvote={handleToggleUpvote}
        onAddReply={handleAddReply}
        onReport={handleReportThread}
        replies={activeReplies}
        user={user}
      />
    </div>
  );
}
