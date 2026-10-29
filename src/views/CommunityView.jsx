import '../styles/community.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import {
  useSocialWallet,
  getStoredPitchSpots,
  saveStoredPitchSpots
} from '../context/SocialWalletContext';
import {
  filterAndSortThreads,
  migrateLegacyThreadToSpot,
  subscribeToCommunityThreads,
  createFirestoreCommunityThread,
  updateFirestoreCommunityThread,
  deleteFirestoreCommunityThread,
  toggleFirestoreCommunityVote,
  addFirestoreCommunityReply,
  reportFirestoreCommunityThread,
  subscribeToCommunityReplies
} from '../services/communityService';
import { SPOT_FEED_NAME } from '../config/appConstants';
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
  const socialWallet = useSocialWallet() || {};

  const {
    publicProfile,
    followingIds = [],
    savedSpotIds = [],
    blockedUserIds = [],
    toggleSave,
    notifySocialInteraction,
    setSelectedPublicProfileId,
    pitchModeLoaded,
    pitchSpotsVersion
  } = socialWallet;

  const isDemo = Boolean(finance.isDemoMode);

  // Live Firestore State (when not in demo mode)
  const [liveThreads, setLiveThreads] = useState([]);
  const [liveUserUpvotes, setLiveUserUpvotes] = useState(() => new Set());
  const [isLoadingLive, setIsLoadingLive] = useState(!isDemo);
  const [liveError, setLiveError] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Active Filter States (6c4f2e9 + Spot Jimat categories/tabs)
  const [feedTab, setFeedTab] = useState('explore'); // 'explore' | 'following' | 'saved'
  const [category, setCategory] = useState('all');
  const [budgetTag, setBudgetTag] = useState('all');
  const [campus, setCampus] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [maxPrice, setMaxPrice] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('newest');

  // Geolocation state for Nearest sort
  const [userCoords, setUserCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
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
    return generateDemoThreads().map((t) =>
      migrateLegacyThreadToSpot({ ...t, isCuratedStarter: true })
    );
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

  // Combine demo/live threads with Pitch Mode spots if loaded, preserving all existing Makan Murah posts
  const allThreads = useMemo(() => {
    const baseList = isDemo
      ? finance.communityThreads || []
      : liveThreads.length > 0
      ? liveThreads
      : starterCuratedThreads;

    const pitchSpots = getStoredPitchSpots();
    const map = new Map();
    for (const item of baseList) {
      const migrated = migrateLegacyThreadToSpot(item);
      map.set(migrated.id, migrated);
    }
    for (const s of pitchSpots) {
      const migrated = migrateLegacyThreadToSpot(s);
      if (!map.has(migrated.id)) {
        map.set(migrated.id, migrated);
      }
    }
    return Array.from(map.values());
  }, [isDemo, finance.communityThreads, liveThreads, starterCuratedThreads, pitchModeLoaded, pitchSpotsVersion]);

  const isShowingStarterFallbacks = !isDemo && liveThreads.length === 0;

  // Handle Sort Change (including Geolocation permission request for "nearest")
  const handleSortChange = useCallback(
    (nextSort) => {
      if (nextSort !== 'nearest') {
        setSortBy(nextSort);
        setLocationMessage('');
        return;
      }

      setSortBy('nearest');
      if (userCoords) {
        setLocationStatus('granted');
        setLocationMessage('Disusun mengikut jarak terdekat');
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setLocationStatus('denied');
        setLocationMessage('Geolokasi tidak disokong — guna koordinat kampus');
        return;
      }

      setLocationStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setLocationStatus('granted');
          setLocationMessage('Disusun mengikut lokasi semasa anda');
        },
        () => {
          setLocationStatus('denied');
          setUserCoords({ lat: 3.1209, lng: 101.6538 });
          setLocationMessage('Lokasi ditolak — guna pusat kampus KL');
        },
        { timeout: 6000, maximumAge: 60000 }
      );
    },
    [userCoords]
  );

  // Filter & Sort Threads
  const filteredThreads = useMemo(() => {
    return filterAndSortThreads(allThreads, {
      feedTab,
      followingIds,
      savedSpotIds,
      blockedUserIds,
      category,
      budgetTag,
      campus,
      maxPrice,
      selectedTags,
      sort: sortBy,
      searchQuery,
      userCoords
    });
  }, [
    allThreads,
    feedTab,
    followingIds,
    savedSpotIds,
    blockedUserIds,
    category,
    budgetTag,
    campus,
    maxPrice,
    selectedTags,
    sortBy,
    searchQuery,
    userCoords
  ]);

  // Set of user-upvoted thread IDs
  const userUpvotesSet = useMemo(() => {
    if (isDemo && finance.communityUserUpvotes instanceof Set) {
      return finance.communityUserUpvotes;
    }
    return liveUserUpvotes;
  }, [isDemo, finance.communityUserUpvotes, liveUserUpvotes]);

  // Toggle Upvote Handler
  const handleToggleUpvote = useCallback(
    async (threadId) => {
      const targetSpot = allThreads.find((t) => t.id === threadId);
      const alreadyUpvoted = userUpvotesSet.has(threadId);

      if (isDemo || isShowingStarterFallbacks) {
        if (finance.toggleCommunityVote) {
          finance.toggleCommunityVote(threadId);
        } else {
          setLiveUserUpvotes((prev) => {
            const next = new Set(prev);
            if (next.has(threadId)) next.delete(threadId);
            else next.add(threadId);
            return next;
          });
        }
      } else {
        if (!user) {
          showToast('Sila log masuk untuk mengundi ulasan.');
          return;
        }
        try {
          const isNowVoted = await toggleFirestoreCommunityVote(threadId, user.id || user.uid);
          setLiveUserUpvotes((prev) => {
            const next = new Set(prev);
            if (isNowVoted) next.add(threadId);
            else next.delete(threadId);
            return next;
          });
        } catch (err) {
          console.error('Upvote error:', err);
          showToast('Gagal mengemas kini undian.');
        }
      }

      if (!alreadyUpvoted && targetSpot && user?.id && targetSpot.authorId !== user.id && notifySocialInteraction) {
        notifySocialInteraction({
          recipientId: targetSpot.authorId,
          type: 'like',
          actorId: user.id,
          actorName: publicProfile?.displayName || user.username || 'Pelajar',
          actorHandle: publicProfile?.handle || user.handle || 'student',
          spotId: targetSpot.id,
          spotTitle: targetSpot.title,
          message: `@${publicProfile?.handle || 'student'} menyukai spot "${targetSpot.title}"`
        });
      }
    },
    [isDemo, isShowingStarterFallbacks, finance, user, showToast, allThreads, userUpvotesSet, notifySocialInteraction, publicProfile]
  );

  // Toggle Save / Bookmark Handler
  const handleToggleSave = useCallback(
    async (spotId) => {
      if (!toggleSave) return;
      const nowSaved = await toggleSave(spotId);
      showToast(nowSaved ? 'Spot disimpan ke senarai Disimpan!' : 'Spot dikeluarkan dari simpanan.');
    },
    [toggleSave, showToast]
  );

  // Create or Update Thread Handler
  const handleCreateThread = useCallback(
    async (formData, editingSpotId = null) => {
      if (editingSpotId) {
        const pitchSpots = getStoredPitchSpots();
        if (pitchSpots.some((s) => s.id === editingSpotId)) {
          saveStoredPitchSpots(
            pitchSpots.map((s) =>
              s.id === editingSpotId ? migrateLegacyThreadToSpot({ ...s, ...formData }) : s
            )
          );
        }
        if (!isDemo && user) {
          await updateFirestoreCommunityThread(editingSpotId, user, formData).catch(() => {});
        }
        setEditingSpot(null);
        showToast('Spot berjaya dikemaskini!');
        return;
      }

      if (isDemo) {
        if (finance.addCommunityThread) {
          finance.addCommunityThread(formData, user);
          showToast(`${SPOT_FEED_NAME} berjaya dikongsi dalam mod demo!`);
        }
        return;
      }

      try {
        await createFirestoreCommunityThread(user, formData);
        showToast(`${SPOT_FEED_NAME} berjaya dikongsi ke komuniti!`);
      } catch (err) {
        console.error('Create thread error:', err);
        throw err;
      }
    },
    [isDemo, finance, user, showToast]
  );

  const handleDeleteSpot = useCallback(
    async (spot) => {
      if (!spot) return;
      if (typeof window !== 'undefined' && !window.confirm(`Padam spot "${spot.title}"?`)) {
        return;
      }
      const pitchSpots = getStoredPitchSpots();
      if (pitchSpots.some((s) => s.id === spot.id)) {
        saveStoredPitchSpots(pitchSpots.filter((s) => s.id !== spot.id));
      }
      if (!isDemo && user) {
        await deleteFirestoreCommunityThread(spot.id, user).catch(() => {});
      }
      setSelectedThread(null);
      showToast('Spot telah dipadam.');
    },
    [isDemo, user, showToast]
  );

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
          category: starter.category || 'makan',
          title: starter.title,
          body: starter.body,
          pricePerMeal: starter.pricePerMeal,
          rating: starter.rating,
          campus: starter.campus,
          tags: starter.tags,
          address: starter.address || null
        });
      }
      showToast(`6 ${SPOT_FEED_NAME} starter berjaya dimuatkan ke komuniti live!`);
    } catch (err) {
      console.error('Failed to seed starter spots:', err);
      showToast('Gagal memuatkan spot starter: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Add Reply Handler
  const handleAddReply = useCallback(
    async (threadId, replyText) => {
      const targetSpot = allThreads.find((t) => t.id === threadId);

      if (isDemo || isShowingStarterFallbacks) {
        if (finance.addCommunityReply) {
          const newReply = finance.addCommunityReply(threadId, replyText, user);
          setActiveReplies((prev) => [...prev, newReply]);
        } else {
          const mockReply = {
            id: `rep-local-${Date.now()}`,
            authorId: user?.id || 'guest',
            authorName: publicProfile?.displayName || user?.username || 'Saya',
            authorUsername: publicProfile?.handle || user?.handle || 'student',
            authorUniversity: user?.university || 'Pelajar',
            body: replyText,
            createdAt: new Date().toISOString()
          };
          setActiveReplies((prev) => [...prev, mockReply]);
        }
        showToast('Komen berjaya dihantar!');
      } else {
        try {
          const newReply = await addFirestoreCommunityReply(threadId, user, replyText);
          setActiveReplies((prev) => [...prev, newReply]);
          showToast('Komen berjaya dihantar!');
        } catch (err) {
          console.error('Add reply error:', err);
          throw err;
        }
      }

      if (targetSpot && user?.id && targetSpot.authorId !== user.id && notifySocialInteraction) {
        notifySocialInteraction({
          recipientId: targetSpot.authorId,
          type: 'comment',
          actorId: user.id,
          actorName: publicProfile?.displayName || user.username || 'Pelajar',
          actorHandle: publicProfile?.handle || user.handle || 'student',
          spotId: targetSpot.id,
          spotTitle: targetSpot.title,
          message: `@${publicProfile?.handle || 'student'} mengulas pada "${targetSpot.title}"`
        });
      }
    },
    [isDemo, isShowingStarterFallbacks, finance, user, showToast, allThreads, publicProfile, notifySocialInteraction]
  );

  // Report Thread Handler
  const handleReportThread = useCallback(
    async (thread) => {
      const confirmed = window.confirm(
        `Adakah anda pasti ingin melaporkan ulasan "${thread.placeName}" untuk semakan pihak moderator kampus?`
      );
      if (!confirmed) return;

      if (isDemo || isShowingStarterFallbacks) {
        showToast('Laporan diterima untuk semakan moderator kampus.');
        return;
      }

      try {
        await reportFirestoreCommunityThread(
          thread.id,
          user,
          'Inappropriate or inaccurate information'
        );
        showToast('Laporan dihantar kepada moderator.');
      } catch (err) {
        console.error('Report error:', err);
        showToast('Gagal menghantar laporan.');
      }
    },
    [isDemo, isShowingStarterFallbacks, user, showToast]
  );

  // Live replies listener when detail modal is open
  useEffect(() => {
    if (!selectedThread) {
      setActiveReplies([]);
      return;
    }

    if (isDemo || isShowingStarterFallbacks) {
      const current = allThreads.find((t) => t.id === selectedThread.id);
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
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleResetFilters = () => {
    setCampus('all');
    setCategory('all');
    setBudgetTag('all');
    setSearchQuery('');
    setMaxPrice(null);
    setSelectedTags([]);
    setSortBy('newest');
    setLocationMessage('');
  };

  const handleOpenAuthorProfile = (authorIdentifier) => {
    if (!authorIdentifier || !setSelectedPublicProfileId) return;
    setSelectedPublicProfileId(authorIdentifier);
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

      {/* Compact Top Header (Exact 6c4f2e9 structure with new name "Spot Jimat") */}
      <div className="community-header-compact">
        <div className="header-compact-left">
          <div className="community-title-row">
            <h1 className="community-page-title">{SPOT_FEED_NAME}</h1>
            <span className="community-count-pill">{filteredThreads.length} spot</span>
          </div>
          <p className="community-subtitle-compact">
            Port makan sedap, thrift, aktiviti, ruang belajar &amp; promosi pelajar seluruh kampus
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
            onClick={() => {
              setEditingSpot(null);
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Kongsi Tempat</span>
          </button>
        </div>
      </div>

      {/* Notice: When viewing curated starters on fresh accounts */}
      {isShowingStarterFallbacks && (
        <div className="curated-starters-notice-bar">
          <div className="starters-notice-text">
            <Sparkles size={14} className="text-primary flex-shrink-0" />
            <span>
              Menampilkan <strong>cadangan {SPOT_FEED_NAME} pelajar</strong>. Anda boleh kongsi ulasan tempat baru atau muatkan cadangan ini.
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

      {/* Streamlined Unified Toolbar (Exact 6c4f2e9 look + categories & online tabs) */}
      <CommunityFilters
        feedTab={feedTab}
        onFeedTabChange={setFeedTab}
        category={category}
        onCategoryChange={setCategory}
        budgetTag={budgetTag}
        onBudgetTagChange={setBudgetTag}
        campus={campus}
        onCampusChange={setCampus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        locationStatus={locationStatus}
        locationMessage={locationMessage}
        followingCount={followingIds.length}
        savedCount={savedSpotIds.length}
        onResetFilters={handleResetFilters}
        totalCount={filteredThreads.length}
      />

      {/* Main Threads Content Grid */}
      <div className="community-feed-container">
        {isLoadingLive ? (
          <div className="community-loading-state">
            <div className="community-spinner" />
            <p>Memuat turun ulasan {SPOT_FEED_NAME}...</p>
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
            <h3>Tiada Spot Dijumpai</h3>
            <p>
              {feedTab === 'following'
                ? 'Belum ada spot daripada pelajar yang anda ikuti. Tukar ke tab Explore atau klik nama penulis untuk mengikuti mereka.'
                : feedTab === 'saved'
                ? 'Belum ada spot disimpan lagi. Klik ikon penanda buku pada mana-mana kad spot untuk simpan.'
                : 'Tiada tempat yang sepadan dengan tapisan carian anda. Sila ubah atau reset tapisan.'}
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setFeedTab('explore');
                  handleResetFilters();
                }}
              >
                Reset Tapisan
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingSpot(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus size={14} />
                <span>Kongsi Tempat Sekarang</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="community-cards-grid">
            {filteredThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                isUpvoted={userUpvotesSet.has(thread.id)}
                isSaved={savedSpotIds.includes(thread.id)}
                onToggleUpvote={handleToggleUpvote}
                onToggleSave={handleToggleSave}
                onClick={(t) => setSelectedThread(t)}
                onOpenAuthorProfile={handleOpenAuthorProfile}
                onReport={handleReportThread}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Thread Modal */}
      <CreateThreadModal
        isOpen={isCreateModalOpen}
        editingSpot={editingSpot}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSpot(null);
        }}
        onSubmit={handleCreateThread}
        user={user}
      />

      {/* Thread Detail Modal */}
      <ThreadDetailModal
        thread={selectedThread}
        isOpen={Boolean(selectedThread)}
        onClose={() => setSelectedThread(null)}
        isUpvoted={selectedThread ? userUpvotesSet.has(selectedThread.id) : false}
        isSaved={selectedThread ? savedSpotIds.includes(selectedThread.id) : false}
        currentUserId={user?.id || user?.uid}
        onToggleUpvote={handleToggleUpvote}
        onToggleSave={handleToggleSave}
        onAddReply={handleAddReply}
        onReport={handleReportThread}
        onEditSpot={(spot) => {
          setSelectedThread(null);
          setEditingSpot(spot);
          setIsCreateModalOpen(true);
        }}
        onDeleteSpot={handleDeleteSpot}
        onOpenAuthorProfile={(authorId) => {
          setSelectedThread(null);
          handleOpenAuthorProfile(authorId);
        }}
        replies={activeReplies}
        user={user}
      />
    </div>
  );
}
