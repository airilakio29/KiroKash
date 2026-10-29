import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Users,
  Heart,
  RefreshCw,
  Compass,
  Bookmark,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeProvider';
import {
  useSocialWallet,
  getStoredPitchSpots,
  saveStoredPitchSpots
} from '../context/SocialWalletContext';
import {
  generateInitialCommunityThreads,
  migrateExistingMakanMurahPosts,
  migrateLegacyThreadToSpot,
  filterAndSortThreads,
  createThreadObject,
  createReplyObject,
  fetchFirestoreCommunityThreads,
  createFirestoreCommunityThread,
  updateFirestoreCommunityThread,
  deleteFirestoreCommunityThread,
  addFirestoreThreadReply,
  toggleFirestoreThreadVote,
  reportFirestoreCommunityThread
} from '../services/communityService';
import { SPOT_FEED_NAME, SPOT_CATEGORIES } from '../config/appConstants';
import CommunityFilters from '../components/community/CommunityFilters';
import ThreadCard from '../components/community/ThreadCard';
import CreateThreadModal from '../components/community/CreateThreadModal';
import ThreadDetailModal from '../components/community/ThreadDetailModal';
import '../styles/community.css';

const STORAGE_KEY_THREADS = 'kampuskash_community_threads_v1';
const STORAGE_KEY_UPVOTES = 'kampuskash_community_upvotes_v1';
const PAGE_SIZE = 9;

export default function CommunityView() {
  const { user, isAuthenticated, isFirebaseConfigured } = useAuth();
  const { isDemoMode } = useDemoMode();
  const {
    publicProfile,
    followingIds,
    savedSpotIds,
    blockedUserIds,
    toggleSave,
    notifySocialInteraction,
    setSelectedPublicProfileId,
    pitchModeLoaded,
    pitchSpotsVersion,
    loadPitchDemoData
  } = useSocialWallet();

  // Offline state
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // State: Base threads (migrated Makan Murah + user posts)
  const [threads, setThreads] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THREADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return migrateExistingMakanMurahPosts(parsed);
        }
      }
    } catch {
      // fallback to initial seed
    }
    return generateInitialCommunityThreads();
  });

  // State: Upvoted thread IDs for current user
  const [upvotedIds, setUpvotedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UPVOTES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Filters & Feed Tabs
  const [feedTab, setFeedTab] = useState('explore'); // 'explore' | 'following' | 'saved'
  const [category, setCategory] = useState('all');
  const [budgetTag, setBudgetTag] = useState('all');
  const [studentPriceOnly, setStudentPriceOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [campusArea, setCampusArea] = useState('All Campuses');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('trending');

  // Geolocation state for "Nearest" sort
  const [userCoords, setUserCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'denied'
  const [locationMessage, setLocationMessage] = useState('');

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Modals & Loading state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine user/migrated threads with Pitch Mode spots if Pitch Mode is loaded
  const combinedThreads = useMemo(() => {
    const pitchSpots = getStoredPitchSpots();
    const map = new Map();
    for (const s of pitchSpots) {
      const migrated = migrateLegacyThreadToSpot(s);
      map.set(migrated.id, migrated);
    }
    for (const t of threads) {
      const migrated = migrateLegacyThreadToSpot(t);
      map.set(migrated.id, migrated);
    }
    return Array.from(map.values());
  }, [threads, pitchModeLoaded, pitchSpotsVersion]);

  // Persist base threads and upvotes locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
    } catch {
      // ignore storage quota errors
    }
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_UPVOTES, JSON.stringify(upvotedIds));
    } catch {
      // ignore
    }
  }, [upvotedIds]);

  // Load Firestore threads when configured and not in demo mode
  const loadThreads = useCallback(async () => {
    if (!isFirebaseConfigured || isDemoMode) return;
    setIsLoading(true);
    try {
      const remoteThreads = await fetchFirestoreCommunityThreads();
      if (Array.isArray(remoteThreads) && remoteThreads.length > 0) {
        setThreads((prev) => {
          const map = new Map();
          prev.forEach((t) => map.set(t.id, migrateLegacyThreadToSpot(t)));
          remoteThreads.forEach((t) => map.set(t.id, migrateLegacyThreadToSpot(t)));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('CommunityView: Falling back to cached Spot Jimat threads', err);
    } finally {
      setIsLoading(false);
    }
  }, [isFirebaseConfigured, isDemoMode]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [feedTab, category, budgetTag, studentPriceOnly, searchQuery, campusArea, selectedTags, sortBy]);

  // Handle Sort Change (including Geolocation permission request for "Nearest")
  const handleSortChange = useCallback((nextSort) => {
    if (nextSort !== 'nearest') {
      setSortBy(nextSort);
      setLocationMessage('');
      return;
    }

    setSortBy('nearest');
    if (userCoords) {
      setLocationStatus('granted');
      setLocationMessage('Sorted by distance from your current location.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('denied');
      setLocationMessage('Geolocation is not supported by this browser. Falling back to Trending spots.');
      return;
    }

    setLocationStatus('requesting');
    setLocationMessage('Requesting location permission to find the nearest student spots...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocationStatus('granted');
        setLocationMessage('Showing spots closest to your current location.');
      },
      () => {
        // Fallback gracefully to UM Kuala Lumpur campus center coordinates or trending
        setLocationStatus('denied');
        setUserCoords({ lat: 3.1209, lng: 101.6538 });
        setLocationMessage(
          'Location permission was denied — gracefully falling back to central Kuala Lumpur campus coordinates.'
        );
      },
      { timeout: 6000, maximumAge: 60000 }
    );
  }, [userCoords]);

  // Filtered & sorted threads
  const filteredThreads = useMemo(() => {
    return filterAndSortThreads(combinedThreads, {
      feedTab,
      followingIds,
      savedSpotIds,
      blockedUserIds,
      category,
      budgetTag,
      studentPriceOnly,
      searchQuery,
      campusArea,
      selectedTags,
      sortBy,
      userCoords
    });
  }, [
    combinedThreads,
    feedTab,
    followingIds,
    savedSpotIds,
    blockedUserIds,
    category,
    budgetTag,
    studentPriceOnly,
    searchQuery,
    campusArea,
    selectedTags,
    sortBy,
    userCoords
  ]);

  const paginatedThreads = useMemo(
    () => filteredThreads.slice(0, visibleCount),
    [filteredThreads, visibleCount]
  );

  const selectedThread = useMemo(
    () => combinedThreads.find((t) => t.id === selectedThreadId) || null,
    [combinedThreads, selectedThreadId]
  );

  // Stats for banner
  const stats = useMemo(() => {
    const totalSpots = combinedThreads.length;
    const studentDealsCount = combinedThreads.filter((t) => t.studentPrice || Number(t.priceRM) <= 10).length;
    const totalLikes = combinedThreads.reduce((sum, t) => sum + Number(t.upvotes || 0), 0);
    return { totalSpots, studentDealsCount, totalLikes };
  }, [combinedThreads]);

  // Handlers
  const handleToggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleResetFilters = () => {
    setCategory('all');
    setBudgetTag('all');
    setStudentPriceOnly(false);
    setSearchQuery('');
    setCampusArea('All Campuses');
    setSelectedTags([]);
    setSortBy('trending');
    setLocationMessage('');
  };

  const updateSpotAcrossStores = (spotId, updater) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === spotId ? updater(t) : t))
    );
    const pitchSpots = getStoredPitchSpots();
    if (pitchSpots.some((s) => s.id === spotId)) {
      const updatedPitch = pitchSpots.map((s) => (s.id === spotId ? updater(s) : s));
      saveStoredPitchSpots(updatedPitch);
    }
  };

  const handleToggleUpvote = async (threadId) => {
    const alreadyUpvoted = upvotedIds.includes(threadId);
    const delta = alreadyUpvoted ? -1 : 1;

    setUpvotedIds((prev) =>
      alreadyUpvoted ? prev.filter((id) => id !== threadId) : [...prev, threadId]
    );

    const targetSpot = combinedThreads.find((t) => t.id === threadId);

    updateSpotAcrossStores(threadId, (t) => ({
      ...t,
      upvotes: Math.max(0, Number(t.upvotes || 0) + delta)
    }));

    if (!alreadyUpvoted && targetSpot && user?.id && targetSpot.authorId !== user.id) {
      notifySocialInteraction({
        recipientId: targetSpot.authorId,
        type: 'like',
        actorId: user.id,
        actorName: publicProfile?.displayName || user.username || 'Student',
        actorHandle: publicProfile?.handle || user.handle || 'student',
        spotId: targetSpot.id,
        spotTitle: targetSpot.title,
        message: `@${publicProfile?.handle || 'student'} liked your spot "${targetSpot.title}"`
      });
    }

    if (isFirebaseConfigured && !isDemoMode && user?.id) {
      await toggleFirestoreThreadVote(threadId, user.id, !alreadyUpvoted);
    }
  };

  const handleToggleSaveSpot = async (spotId) => {
    try {
      await toggleSave(spotId);
    } catch (err) {
      console.warn('Save spot failed:', err);
    }
  };

  const handleCreateOrUpdateSpot = async (formData, editingSpotId = null) => {
    setIsSubmitting(true);
    try {
      const authorMeta = {
        id: user?.id || 'guest-student',
        username: publicProfile?.displayName || user?.username || 'Campus Student',
        handle: publicProfile?.handle || user?.handle || 'student',
        avatar: publicProfile?.avatarId || user?.avatar || 'cat',
        university: publicProfile?.university || user?.university || formData.campusArea
      };

      if (editingSpotId) {
        updateSpotAcrossStores(editingSpotId, (existing) =>
          migrateLegacyThreadToSpot({
            ...existing,
            ...formData,
            id: editingSpotId,
            updatedAt: new Date().toISOString()
          })
        );
        if (isFirebaseConfigured && !isDemoMode && user?.id) {
          await updateFirestoreCommunityThread(editingSpotId, formData, user.id);
        }
        setEditingSpot(null);
        return;
      }

      const newThread = createThreadObject(formData, authorMeta);
      setThreads((prev) => [newThread, ...prev]);

      if (isFirebaseConfigured && !isDemoMode) {
        await createFirestoreCommunityThread(newThread);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSpot = async (spot) => {
    if (!spot || !user?.id || spot.authorId !== user.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Delete spot "${spot.title}"?`)) {
      return;
    }

    setThreads((prev) => prev.filter((t) => t.id !== spot.id));
    const pitchSpots = getStoredPitchSpots();
    if (pitchSpots.some((s) => s.id === spot.id)) {
      saveStoredPitchSpots(pitchSpots.filter((s) => s.id !== spot.id));
    }

    if (selectedThreadId === spot.id) {
      setSelectedThreadId(null);
    }

    if (isFirebaseConfigured && !isDemoMode) {
      await deleteFirestoreCommunityThread(spot.id, user.id);
    }
  };

  const handleAddReply = async (threadId, replyText) => {
    const authorMeta = {
      id: user?.id || 'guest-student',
      username: publicProfile?.displayName || user?.username || 'Campus Student',
      handle: publicProfile?.handle || user?.handle || 'student',
      avatar: publicProfile?.avatarId || user?.avatar || 'bear'
    };
    const reply = createReplyObject(replyText, authorMeta);
    const targetSpot = combinedThreads.find((t) => t.id === threadId);

    updateSpotAcrossStores(threadId, (t) => {
      const nextReplies = [...(Array.isArray(t.replies) ? t.replies : []), reply];
      return {
        ...t,
        replies: nextReplies,
        replyCount: nextReplies.length,
        updatedAt: new Date().toISOString()
      };
    });

    if (targetSpot && user?.id && targetSpot.authorId !== user.id) {
      notifySocialInteraction({
        recipientId: targetSpot.authorId,
        type: 'comment',
        actorId: user.id,
        actorName: authorMeta.username,
        actorHandle: authorMeta.handle,
        spotId: targetSpot.id,
        spotTitle: targetSpot.title,
        message: `@${authorMeta.handle} commented on "${targetSpot.title}": "${reply.body.slice(0, 60)}"`
      });
    }

    if (isFirebaseConfigured && !isDemoMode) {
      await addFirestoreThreadReply(threadId, reply);
    }
  };

  const handleReportThread = async (threadId, reason) => {
    await reportFirestoreCommunityThread(threadId, {
      reason,
      reporterId: user?.id || 'anonymous'
    });
  };

  const handleOpenAuthorProfile = (authorIdentifier) => {
    if (!authorIdentifier) return;
    setSelectedPublicProfileId(authorIdentifier);
  };

  return (
    <div className="community-view">
      {/* Offline Banner */}
      {isOffline && (
        <div className="spot-offline-banner" role="status">
          <WifiOff size={16} />
          <span>You are offline. Viewing cached {SPOT_FEED_NAME} posts — new posts will sync when reconnected.</span>
        </div>
      )}

      {/* Hero Banner */}
      <section className="community-hero card">
        <div className="community-hero-content">
          <div className="community-hero-badge">
            <Sparkles size={14} />
            <span>Campus Student Discovery Feed</span>
          </div>
          <h1 className="community-hero-title">
            {SPOT_FEED_NAME} — Budget Spots, Deals & Campus Gems
          </h1>
          <p className="community-hero-subtitle">
            Discover and share student-verified Makan spots, Thrift &amp; bundles, Activities &amp; sports,
            Study spots, Campus services, and Free events across Malaysian universities.
          </p>

          <div className="community-hero-stats">
            <div className="hero-stat-pill">
              <Compass size={15} />
              <span>
                <strong>{stats.totalSpots}</strong> Verified Spots
              </span>
            </div>
            <div className="hero-stat-pill">
              <Sparkles size={15} />
              <span>
                <strong>{stats.studentDealsCount}</strong> Student Deals &amp; Under RM10
              </span>
            </div>
            <div className="hero-stat-pill">
              <Heart size={15} />
              <span>
                <strong>{stats.totalLikes}</strong> Student Likes
              </span>
            </div>
          </div>
        </div>

        <div className="community-hero-actions">
          <button
            type="button"
            className="btn btn-primary community-share-btn"
            onClick={() => {
              setEditingSpot(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Post a Spot</span>
          </button>

          {!pitchModeLoaded && (
            <button
              type="button"
              className="btn btn-outline community-refresh-btn"
              onClick={loadPitchDemoData}
              title="Seed 28 realistic campus spots across all 6 categories for demo"
            >
              <Sparkles size={15} />
              <span>Load 28 Demo Spots</span>
            </button>
          )}

          {isFirebaseConfigured && !isDemoMode && (
            <button
              type="button"
              className="btn btn-outline community-refresh-btn"
              onClick={loadThreads}
              disabled={isLoading}
              title="Refresh spots feed"
            >
              <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
              <span>Sync</span>
            </button>
          )}
        </div>
      </section>

      {/* Filters Panel */}
      <CommunityFilters
        feedTab={feedTab}
        onFeedTabChange={setFeedTab}
        category={category}
        onCategoryChange={setCategory}
        budgetTag={budgetTag}
        onBudgetTagChange={setBudgetTag}
        studentPriceOnly={studentPriceOnly}
        onStudentPriceOnlyChange={setStudentPriceOnly}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        campusArea={campusArea}
        onCampusChange={setCampusArea}
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

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="community-threads-grid" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="community-thread-card card spot-skeleton-card">
              <div className="spot-skeleton-banner" />
              <div className="spot-skeleton-line short" />
              <div className="spot-skeleton-line title" />
              <div className="spot-skeleton-line medium" />
              <div className="spot-skeleton-line long" />
            </div>
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="community-empty-state card">
          {feedTab === 'following' ? (
            <>
              <Users size={42} className="empty-icon" />
              <h3>No spots from people you follow yet</h3>
              <p>
                Switch to the <strong>Explore</strong> tab and click on any student author to follow them,
                or load Pitch Mode demo data to follow campus spotters!
              </p>
              <div className="empty-state-btn-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setFeedTab('explore')}
                >
                  Explore All Spots
                </button>
                {!pitchModeLoaded && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={loadPitchDemoData}
                  >
                    Load Pitch Demo Spots
                  </button>
                )}
              </div>
            </>
          ) : feedTab === 'saved' ? (
            <>
              <Bookmark size={42} className="empty-icon" />
              <h3>No saved spots yet</h3>
              <p>Tap the bookmark icon on any spot card to save it here for quick access.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setFeedTab('explore')}
              >
                Browse Spots
              </button>
            </>
          ) : (
            <>
              <Compass size={42} className="empty-icon" />
              <h3>No student spots match your filters</h3>
              <p>
                Know a hidden campus gem in{' '}
                {category !== 'all'
                  ? SPOT_CATEGORIES.find((c) => c.id === category)?.label
                  : campusArea !== 'All Campuses'
                  ? campusArea
                  : 'your campus'}
                ? Be the first to share it!
              </p>
              <div className="empty-state-btn-row">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingSpot(null);
                    setIsCreateOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Post a Spot</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="community-threads-grid">
            {paginatedThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                isUpvoted={upvotedIds.includes(thread.id)}
                isSaved={savedSpotIds.includes(thread.id)}
                currentUserId={user?.id}
                onSelectThread={(t) => setSelectedThreadId(t.id)}
                onToggleUpvote={handleToggleUpvote}
                onToggleSave={handleToggleSaveSpot}
                onOpenAuthorProfile={handleOpenAuthorProfile}
                onEditSpot={(spot) => {
                  setEditingSpot(spot);
                  setIsCreateOpen(true);
                }}
                onDeleteSpot={handleDeleteSpot}
              />
            ))}
          </div>

          {/* Pagination / Load More */}
          {visibleCount < filteredThreads.length && (
            <div className="spot-load-more-wrap">
              <button
                type="button"
                className="btn btn-outline spot-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Load More Spots ({filteredThreads.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Spot Modal */}
      <CreateThreadModal
        isOpen={isCreateOpen}
        editingSpot={editingSpot}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingSpot(null);
        }}
        onSubmit={handleCreateOrUpdateSpot}
        isSubmitting={isSubmitting}
      />

      {/* Spot Detail Modal */}
      <ThreadDetailModal
        thread={selectedThread}
        isUpvoted={selectedThread ? upvotedIds.includes(selectedThread.id) : false}
        isSaved={selectedThread ? savedSpotIds.includes(selectedThread.id) : false}
        currentUserId={user?.id}
        onClose={() => setSelectedThreadId(null)}
        onToggleUpvote={handleToggleUpvote}
        onToggleSave={handleToggleSaveSpot}
        onAddReply={handleAddReply}
        onReportThread={handleReportThread}
        onEditSpot={(spot) => {
          setSelectedThreadId(null);
          setEditingSpot(spot);
          setIsCreateOpen(true);
        }}
        onDeleteSpot={handleDeleteSpot}
        onOpenAuthorProfile={(authorId) => {
          setSelectedThreadId(null);
          handleOpenAuthorProfile(authorId);
        }}
        isAuthenticated={isAuthenticated || isDemoMode}
      />
    </div>
  );
}
