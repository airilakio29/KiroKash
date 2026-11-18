import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Search,
  Clock,
  Check,
  X,
  ShieldCheck,
  Lock,
  Globe,
  MapPin,
  GraduationCap,
  Calendar,
  Award,
  Send,
  Split,
  Ban,
  Edit3,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Target,
  MoreHorizontal,
  ArrowUpDown,
  Inbox,
  SendHorizontal,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import { useToast } from '../context/ToastContext';
import UserAvatar from '../components/UserAvatar';
import { getAvatarSvg } from '../components/Avatars';
import ConfirmModal from '../components/ConfirmModal';
import Phase4GroupsChallengesCommunitiesPanel from '../components/connect/Phase4GroupsChallengesCommunitiesPanel';
import { getUserPresenceForViewer } from '../services/messengerService';
import {
  CONNECT_SECTION_NAME,
  CONNECT_SECTION_SUBTITLE,
  PROFILE_ACHIEVEMENTS
} from '../config/appConstants';
import '../styles/connect.css';

const PAGE_SIZE = 9;

const CAMPUS_QUICK_FILTERS = [
  { label: 'All Campuses', value: '' },
  { label: 'UM', value: 'Universiti Malaya' },
  { label: 'UTM', value: 'Universiti Teknologi Malaysia' },
  { label: 'USM', value: 'Universiti Sains Malaysia' },
  { label: 'UKM', value: 'Universiti Kebangsaan Malaysia' },
  { label: 'UiTM', value: 'UiTM' },
  { label: 'Taylor’s / Sunway / Monash', value: 'University' }
];

function renderProfileAvatar(profile, size = 48, showOnlineDot = false, isOnline = false) {
  const avatarId = profile?.avatarId || profile?.avatar || 'cat';
  const isCustomOrPreset =
    typeof avatarId === 'string' &&
    (avatarId.startsWith('preset-') || avatarId.startsWith('data:') || avatarId.startsWith('http'));

  return (
    <div className="kk-connect-avatar-wrap" style={{ width: `${size}px`, height: `${size}px` }}>
      {isCustomOrPreset ? (
        <UserAvatar avatar={avatarId} name={profile?.displayName || 'Student'} size={size} />
      ) : (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--border-highlight)'
          }}
        >
          {getAvatarSvg(avatarId)}
        </div>
      )}
      {showOnlineDot && (
        <span
          className={`kk-connect-online-dot ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'Online now' : 'Offline'}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Recently';
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return 'Recently';
    const diffMs = Date.now() - dt.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
}

export default function ConnectView({ onOpenProfileModal, onNavigateTab }) {
  const { user } = useAuth();
  const toast = useToast();
  const {
    publicProfile,
    friendsList = [],
    incomingFriendRequests = [],
    outgoingFriendRequests = [],
    friendSuggestions = [],
    blockedUserIds = [],
    totalUnreadMessages = 0,
    socialGraphVersion = 0,
    getPublicProfile,
    getFriendshipStatus,
    getMutualFriends,
    searchPublicProfiles,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    block,
    unblock,
    updatePrivacySettings,
    setSelectedPublicProfileId,
    startSendMoneyToUser,
    openChatWithFriend,
    setActiveConversationId
  } = useSocialWallet();

  // Primary navigation tabs: 'overview' | 'discover' | 'friends' | 'requests' | 'groups' | 'challenges' | 'communities' | 'privacy'
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [discoverPage, setDiscoverPage] = useState(1);

  // My Friends controls
  const [friendsSearch, setFriendsSearch] = useState('');
  const [friendsSortBy, setFriendsSortBy] = useState('online'); // 'online' | 'name' | 'university' | 'mutuals' | 'recent'
  const [friendsPage, setFriendsPage] = useState(1);
  const [openMoreMenuFriendId, setOpenMoreMenuFriendId] = useState(null);

  // Requests sub-filter ('all' | 'incoming' | 'outgoing')
  const [requestsFilter, setRequestsFilter] = useState('all');

  // Feedback & confirmation modal states
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [busyTargetId, setBusyTargetId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'remove' | 'block', targetProfile }

  // Close friend "⋯" menu when clicking outside
  useEffect(() => {
    if (!openMoreMenuFriendId) return undefined;
    const handleDocClick = () => setOpenMoreMenuFriendId(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, [openMoreMenuFriendId]);

  const notify = (text, type = 'success') => {
    setFeedbackBanner({ text, type });
    if (toast) {
      if (type === 'error' && toast.showError) toast.showError(text);
      else if (type === 'info' && toast.showInfo) toast.showInfo(text);
      else if (toast.showSuccess) toast.showSuccess(text);
    }
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.text === text ? null : prev));
    }, 3400);
  };

  const navigateToMessages = () => {
    if (onNavigateTab) {
      onNavigateTab('messages');
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/messages');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Enrich friends list with online status & mutual friend count
  const enrichedFriends = useMemo(() => {
    const viewerUni = (publicProfile?.university || user?.university || '').toLowerCase();
    return friendsList.map((f) => {
      const presence = getUserPresenceForViewer(f.id, user?.id);
      const mutuals = getMutualFriends ? getMutualFriends(f.id) : [];
      const sameCampus =
        Boolean(viewerUni && f.university && f.university.toLowerCase() === viewerUni);
      return {
        ...f,
        isOnline: presence.state === 'online',
        lastSeen: presence.lastSeen,
        mutuals,
        mutualFriendsCount: mutuals.length,
        sameCampus
      };
    });
  }, [friendsList, user?.id, user?.university, publicProfile?.university, getMutualFriends, socialGraphVersion]);

  const onlineFriends = useMemo(
    () => enrichedFriends.filter((f) => f.isOnline),
    [enrichedFriends]
  );

  // Filtered & sorted friends list for My Friends tab
  const filteredAndSortedFriends = useMemo(() => {
    const q = friendsSearch.trim().toLowerCase().replace(/^@+/, '');
    const list = enrichedFriends.filter((f) => {
      if (!q) return true;
      return (
        (f.displayName || '').toLowerCase().includes(q) ||
        (f.handle || '').toLowerCase().includes(q) ||
        (f.university || '').toLowerCase().includes(q) ||
        (f.course || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (friendsSortBy === 'online') {
        if (Number(b.isOnline) !== Number(a.isOnline)) {
          return Number(b.isOnline) - Number(a.isOnline);
        }
      } else if (friendsSortBy === 'university') {
        if (Number(b.sameCampus) !== Number(a.sameCampus)) {
          return Number(b.sameCampus) - Number(a.sameCampus);
        }
      } else if (friendsSortBy === 'mutuals') {
        if ((b.mutualFriendsCount || 0) !== (a.mutualFriendsCount || 0)) {
          return (b.mutualFriendsCount || 0) - (a.mutualFriendsCount || 0);
        }
      } else if (friendsSortBy === 'recent') {
        const tA = new Date(a.friendsSince || a.joinedAt || 0).getTime();
        const tB = new Date(b.friendsSince || b.joinedAt || 0).getTime();
        if (tB !== tA) return tB - tA;
      }
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [enrichedFriends, friendsSearch, friendsSortBy]);

  const visibleFriends = useMemo(
    () => filteredAndSortedFriends.slice(0, friendsPage * PAGE_SIZE),
    [filteredAndSortedFriends, friendsPage]
  );

  // Paginated discovery search results (re-evaluates whenever socialGraphVersion updates)
  const discoveryData = useMemo(() => {
    if (!searchPublicProfiles) {
      return { results: [], totalCount: 0, hasMore: false, page: 1 };
    }
    return searchPublicProfiles(searchQuery, {
      viewerId: user?.id,
      excludeUserId: user?.id,
      blockedUserIds,
      university: universityFilter,
      page: 1,
      pageSize: discoverPage * PAGE_SIZE,
      includePagination: true
    });
  }, [
    searchPublicProfiles,
    searchQuery,
    user?.id,
    blockedUserIds,
    universityFilter,
    discoverPage,
    socialGraphVersion
  ]);

  const blockedProfiles = useMemo(
    () =>
      (blockedUserIds || []).map((id) => {
        const p = getPublicProfile ? getPublicProfile(id) : null;
        return p || { id, displayName: 'Campus User', handle: 'restricted_user', university: 'KampusKash' };
      }),
    [blockedUserIds, getPublicProfile, socialGraphVersion]
  );

  const myAchievements = useMemo(() => {
    const ids = Array.isArray(publicProfile?.achievements) ? publicProfile.achievements : [];
    return ids.map((id) => PROFILE_ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  }, [publicProfile?.achievements]);

  const joinedLabel = useMemo(() => {
    try {
      const dt = new Date(publicProfile?.joinedAt || '2026-01-15T08:00:00.000Z');
      if (isNaN(dt.getTime())) return 'Joined Jan 2026';
      return `Joined ${dt.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Joined Jan 2026';
    }
  }, [publicProfile?.joinedAt]);

  // Friend & Relationship Actions
  const handleSendRequest = async (targetProfile) => {
    if (!targetProfile?.id) return;
    setBusyTargetId(targetProfile.id);
    try {
      await sendFriendRequest(targetProfile.id);
      notify(`Friend request sent to ${targetProfile.displayName} (@${targetProfile.handle})!`);
    } catch (err) {
      notify(err?.message || 'Failed to send friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleAcceptRequest = async (reqOrUserId, label = 'student') => {
    setBusyTargetId(reqOrUserId);
    try {
      await acceptFriendRequest(reqOrUserId);
      notify(`Friend request accepted! You and ${label} are now connected.`);
    } catch (err) {
      notify(err?.message || 'Could not accept friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleRejectRequest = async (reqOrUserId, label = 'student') => {
    setBusyTargetId(reqOrUserId);
    try {
      await rejectFriendRequest(reqOrUserId);
      notify(`Declined friend request from ${label}.`, 'info');
    } catch (err) {
      notify(err?.message || 'Could not decline friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleCancelRequest = async (reqOrUserId, label = 'student') => {
    setBusyTargetId(reqOrUserId);
    try {
      await cancelFriendRequest(reqOrUserId);
      notify(`Cancelled friend request to ${label}.`, 'info');
    } catch (err) {
      notify(err?.message || 'Could not cancel friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const promptRemoveFriend = (friendProfile) => {
    setOpenMoreMenuFriendId(null);
    setConfirmDialog({
      type: 'remove',
      targetProfile: friendProfile
    });
  };

  const promptBlockUser = (targetProfile) => {
    setOpenMoreMenuFriendId(null);
    setConfirmDialog({
      type: 'block',
      targetProfile
    });
  };

  const handleConfirmDialogAction = async () => {
    if (!confirmDialog?.targetProfile) return;
    const { type, targetProfile } = confirmDialog;
    setConfirmDialog(null);
    setBusyTargetId(targetProfile.id);
    try {
      if (type === 'remove') {
        await removeFriend(targetProfile.id);
        notify(`Removed @${targetProfile.handle} from your friends.`, 'info');
      } else if (type === 'block') {
        await block(targetProfile.id);
        notify(`Blocked @${targetProfile.handle}. They can no longer interact with you.`, 'info');
      }
    } catch (err) {
      notify(err?.message || 'Action could not be completed.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handlePrivacyToggle = async (key, value) => {
    try {
      await updatePrivacySettings({ [key]: value });
      notify('Privacy preferences updated.');
    } catch (err) {
      notify(err?.message || 'Could not update privacy settings.', 'error');
    }
  };

  const handleUnblockUser = async (targetId, handle) => {
    try {
      await unblock(targetId);
      notify(`Unblocked @${handle || 'user'}.`);
    } catch (err) {
      notify(err?.message || 'Could not unblock user.', 'error');
    }
  };

  // Dynamic relationship button renderer for Discover & Suggestions cards
  const renderRelationshipControls = (person) => {
    const rel = getFriendshipStatus
      ? getFriendshipStatus(person.id)
      : { status: 'none', canSendRequest: true };
    const isBusy = busyTargetId === person.id || busyTargetId === rel.requestId;

    if (rel.status === 'friends') {
      return (
        <div className="kk-student-actions">
          <span className="kk-btn kk-btn-friends" aria-label="Friends status">
            <UserCheck size={14} />
            <span>Friends</span>
          </span>
          <button
            type="button"
            className="kk-btn kk-btn-primary"
            onClick={() => openChatWithFriend && openChatWithFriend(person.id)}
          >
            <MessageSquare size={14} />
            <span>Message</span>
          </button>
          <button
            type="button"
            className="kk-btn kk-btn-ghost"
            onClick={() => setSelectedPublicProfileId(person.id)}
          >
            <span>Profile</span>
          </button>
        </div>
      );
    }

    if (rel.status === 'outgoing_pending') {
      return (
        <div className="kk-student-actions">
          <span className="kk-btn kk-btn-sent" aria-label="Friend request sent">
            <Clock size={13} />
            <span>Request Sent</span>
          </span>
          <button
            type="button"
            className="kk-btn kk-btn-ghost"
            disabled={isBusy}
            onClick={() => handleCancelRequest(rel.requestId || person.id, `@${person.handle}`)}
            title="Cancel outgoing friend request"
          >
            <X size={13} />
            <span>Cancel</span>
          </button>
        </div>
      );
    }

    if (rel.status === 'incoming_pending') {
      return (
        <div className="kk-student-actions">
          <button
            type="button"
            className="kk-btn kk-btn-accept"
            disabled={isBusy}
            onClick={() => handleAcceptRequest(rel.requestId || person.id, `@${person.handle}`)}
          >
            <Check size={14} />
            <span>Accept</span>
          </button>
          <button
            type="button"
            className="kk-btn kk-btn-ghost"
            disabled={isBusy}
            onClick={() => handleRejectRequest(rel.requestId || person.id, `@${person.handle}`)}
          >
            <X size={14} />
            <span>Decline</span>
          </button>
        </div>
      );
    }

    if (rel.status === 'blocked') {
      return (
        <div className="kk-student-actions">
          <span className="kk-btn kk-btn-danger-ghost">
            <Ban size={13} />
            <span>Blocked</span>
          </span>
        </div>
      );
    }

    return (
      <div className="kk-student-actions">
        <button
          type="button"
          className="kk-btn kk-btn-primary"
          disabled={isBusy || !rel.canSendRequest}
          onClick={() => handleSendRequest(person)}
          title={!rel.canSendRequest ? 'User restricts incoming friend requests' : `Add @${person.handle} as a friend`}
        >
          <UserPlus size={14} />
          <span>{ isBusy ? 'Sending...' : rel.canSendRequest ? 'Add Friend' : 'Restricted' }</span>
        </button>
        <button
          type="button"
          className="kk-btn kk-btn-ghost"
          onClick={() => setSelectedPublicProfileId(person.id)}
        >
          <span>View Profile</span>
        </button>
      </div>
    );
  };

  const renderStudentDiscoverCard = (person) => {
    const mutuals = getMutualFriends ? getMutualFriends(person.id) : [];
    const presence = getUserPresenceForViewer(person.id, user?.id);
    const isOnline = presence.state === 'online';
    const sameCampus =
      Boolean(
        publicProfile?.university &&
          person.university &&
          publicProfile.university.toLowerCase() === person.university.toLowerCase()
      );
    const rel = getFriendshipStatus ? getFriendshipStatus(person.id) : { status: 'none' };

    return (
      <article
        key={person.id}
        className={`kk-student-card ${rel.status === 'incoming_pending' ? 'incoming-highlight' : ''}`}
      >
        <div>
          <div className="kk-student-card-top">
            <button
              type="button"
              onClick={() => setSelectedPublicProfileId(person.id)}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label={`Open ${person.displayName}'s profile`}
            >
              {renderProfileAvatar(person, 50, true, isOnline)}
            </button>

            <div className="kk-student-card-info">
              <button
                type="button"
                className="kk-student-name-btn"
                onClick={() => setSelectedPublicProfileId(person.id)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {person.displayName}
                </span>
              </button>
              <span className="kk-student-handle">@{person.handle}</span>

              {person.university && (
                <div className="kk-student-uni">
                  <MapPin size={12} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.university}
                  </span>
                </div>
              )}

              {person.course && (
                <div className="kk-student-uni" style={{ marginTop: '2px' }}>
                  <GraduationCap size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.course}
                  </span>
                </div>
              )}
            </div>
          </div>

          {person.bio && <p className="kk-student-bio">{person.bio}</p>}

          <div className="kk-student-tags">
            {isOnline && (
              <span className="kk-student-tag online">● Online</span>
            )}
            {mutuals.length > 0 && (
              <span className="kk-student-tag mutual">
                <Users size={11} />
                {mutuals.length} mutual friend{mutuals.length === 1 ? '' : 's'}
              </span>
            )}
            {sameCampus && (
              <span className="kk-student-tag same-campus">Same Campus</span>
            )}
            <span className="kk-student-tag">
              {person.friendsCount || 0} friend{(person.friendsCount || 0) === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="kk-student-card-footer">
          {renderRelationshipControls(person)}
        </div>
      </article>
    );
  };

  const totalRequestsCount = incomingFriendRequests.length + outgoingFriendRequests.length;

  return (
    <div className="kk-connect-page connect-view-container">
      {/* 1. Connect Hero Header & Current Student Identity */}
      <section className="kk-connect-hero" aria-label="KampusKash Connect Profile Header">
        <div className="kk-connect-hero-banner">
          <div className="kk-connect-hero-top">
            <div className="kk-connect-profile-main">
              {renderProfileAvatar(publicProfile || user, 68, true, true)}

              <div className="kk-connect-hero-meta">
                <div className="kk-connect-badge-row">
                  <span className="kk-connect-pill">
                    <Sparkles size={11} />
                    <span>KampusKash {CONNECT_SECTION_NAME}</span>
                  </span>
                  {publicProfile?.privacySettings?.profileVisibility === 'friends' ? (
                    <span className="kk-connect-pill friends-only">
                      <Lock size={11} />
                      <span>Friends-Only Profile</span>
                    </span>
                  ) : (
                    <span className="kk-connect-pill privacy">
                      <Globe size={11} />
                      <span>Public Student Profile</span>
                    </span>
                  )}
                </div>

                <div className="kk-connect-name-row">
                  <h1 className="kk-connect-display-name">
                    {publicProfile?.displayName || user?.username || 'Student'}
                  </h1>
                  <span className="kk-connect-handle">
                    @{publicProfile?.handle || user?.handle || 'student'}
                  </span>
                </div>

                <div className="kk-connect-meta-row">
                  <span className="kk-connect-meta-item">
                    <MapPin size={13} color="var(--accent-primary)" />
                    <span>{publicProfile?.university || user?.university || 'Malaysia Campus'}</span>
                  </span>
                  {publicProfile?.course && (
                    <span className="kk-connect-meta-item">
                      <GraduationCap size={13} />
                      <span>{publicProfile.course}</span>
                    </span>
                  )}
                  <span className="kk-connect-meta-item">
                    <Calendar size={13} />
                    <span>{joinedLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('friends')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Users size={13} color="var(--accent-primary)" />
                    <span>
                      {friendsList.length} Friend{friendsList.length === 1 ? '' : 's'}
                    </span>
                  </button>
                </div>

                {publicProfile?.bio && (
                  <p className="kk-connect-bio">&ldquo;{publicProfile.bio}&rdquo;</p>
                )}

                {myAchievements.length > 0 && (
                  <div className="kk-student-tags" style={{ marginTop: '9px' }}>
                    {myAchievements.map((ach) => (
                      <span key={ach.id} className="kk-student-tag mutual">
                        <Award size={11} />
                        <span>{ach.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="kk-connect-hero-actions">
              {onOpenProfileModal && (
                <button
                  type="button"
                  className="kk-btn kk-btn-primary"
                  onClick={onOpenProfileModal}
                >
                  <Edit3 size={14} />
                  <span>Edit Profile &amp; @Username</span>
                </button>
              )}
              {user?.id && (
                <button
                  type="button"
                  className="kk-btn kk-btn-ghost"
                  onClick={() => setSelectedPublicProfileId(user.id)}
                >
                  <Globe size={14} />
                  <span>View My Public Profile</span>
                </button>
              )}
              <button
                type="button"
                className="kk-btn kk-btn-ghost"
                onClick={navigateToMessages}
              >
                <MessageSquare size={14} />
                <span>Messages</span>
                {totalUnreadMessages > 0 && (
                  <span className="kk-connect-tab-badge alert">{totalUnreadMessages}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Strict Financial Privacy Strip */}
        <div className="kk-connect-privacy-strip">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <ShieldCheck size={15} color="var(--success)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Financial Privacy Guaranteed:</strong> {CONNECT_SECTION_SUBTITLE}. Your real bank balances, budgets, and transactions are never visible to other students.
            </span>
          </span>
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === 'privacy' ? 'overview' : 'privacy')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--accent-primary)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Lock size={12} />
            <span>Privacy Settings</span>
          </button>
        </div>
      </section>

      {/* Inline Status Banner */}
      {feedbackBanner && (
        <div
          role="status"
          style={{
            padding: '11px 16px',
            borderRadius: '14px',
            background:
              feedbackBanner.type === 'error'
                ? 'rgba(239, 68, 68, 0.14)'
                : 'rgba(16, 185, 129, 0.14)',
            color: feedbackBanner.type === 'error' ? 'var(--danger)' : 'var(--success)',
            border: `1px solid ${
              feedbackBanner.type === 'error'
                ? 'rgba(239, 68, 68, 0.35)'
                : 'rgba(16, 185, 129, 0.35)'
            }`,
            fontSize: '0.83rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. Primary Connect Navigation Tabs */}
      <nav className="kk-connect-nav-wrap" aria-label="KampusKash Connect Navigation">
        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <Sparkles size={15} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveSection('discover')}
        >
          <Compass size={15} />
          <span>Discover Users</span>
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveSection('friends')}
        >
          <Users size={15} />
          <span>My Friends</span>
          <span className="kk-connect-tab-badge info">{friendsList.length}</span>
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveSection('requests')}
        >
          <UserPlus size={15} />
          <span>Friend Requests</span>
          {incomingFriendRequests.length > 0 ? (
            <span className="kk-connect-tab-badge alert">{incomingFriendRequests.length}</span>
          ) : (
            <span className="kk-connect-tab-badge info">{totalRequestsCount}</span>
          )}
        </button>

        <button
          type="button"
          className="kk-connect-tab-btn"
          onClick={navigateToMessages}
        >
          <MessageSquare size={15} />
          <span>Messages</span>
          {totalUnreadMessages > 0 && (
            <span className="kk-connect-tab-badge alert">{totalUnreadMessages}</span>
          )}
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveSection('groups')}
        >
          <Users size={15} />
          <span>Groups</span>
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveSection('challenges')}
        >
          <Target size={15} />
          <span>Challenges</span>
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'communities' ? 'active' : ''}`}
          onClick={() => setActiveSection('communities')}
        >
          <Globe size={15} />
          <span>Communities</span>
        </button>

        <button
          type="button"
          className={`kk-connect-tab-btn ${activeSection === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveSection('privacy')}
        >
          <Lock size={15} />
          <span>Privacy &amp; Safety</span>
          {blockedProfiles.length > 0 && (
            <span className="kk-connect-tab-badge info">{blockedProfiles.length}</span>
          )}
        </button>
      </nav>

      {/* Prominent User Search Bar (Visible on Overview & Discover) */}
      {(activeSection === 'overview' || activeSection === 'discover') && (
        <div className="kk-connect-search-shell">
          <div className="kk-connect-search-row">
            <div className="kk-connect-search-input-wrap">
              <Search size={17} className="kk-connect-search-icon" />
              <input
                type="search"
                className="kk-connect-search-input"
                placeholder="Search students by @username, display name, university, or course..."
                value={searchQuery}
                maxLength={60}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setDiscoverPage(1);
                }}
                aria-label="Search KampusKash users by username or display name"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="kk-connect-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    setDiscoverPage(1);
                  }}
                  aria-label="Clear search query"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {activeSection === 'overview' && (
              <button
                type="button"
                className="kk-btn kk-btn-primary"
                onClick={() => setActiveSection('discover')}
              >
                <Compass size={14} />
                <span>Explore Directory ({discoveryData.totalCount})</span>
              </button>
            )}
          </div>

          <div className="kk-connect-filter-chips" role="group" aria-label="Filter by university">
            {CAMPUS_QUICK_FILTERS.map((chip) => {
              const isActive = universityFilter === chip.value;
              return (
                <button
                  key={chip.label}
                  type="button"
                  className={`kk-connect-chip ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setUniversityFilter(isActive ? '' : chip.value);
                    setDiscoverPage(1);
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
         SECTION A: CONNECT LANDING PAGE (OVERVIEW)
         ===================================================================== */}
      {activeSection === 'overview' && (
        <>
          {/* If user is actively typing a search query on Overview, show instant search results right away */}
          {(searchQuery.trim() !== '' || universityFilter !== '') && (
            <section className="kk-connect-section">
              <div className="kk-connect-section-header">
                <div>
                  <h2 className="kk-connect-section-title">
                    <Search size={18} color="var(--accent-primary)" />
                    <span>Search Results ({discoveryData.totalCount})</span>
                  </h2>
                  <p className="kk-connect-section-sub">
                    Showing matching students across KampusKash Connect
                  </p>
                </div>
                <button
                  type="button"
                  className="kk-btn kk-btn-ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setUniversityFilter('');
                  }}
                >
                  Clear Filter
                </button>
              </div>

              {discoveryData.results.length === 0 ? (
                <div className="kk-empty-state">
                  <div className="kk-empty-icon">
                    <Search size={22} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    No matching students found
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                    Try searching another @username, student name, or clear the university filter.
                  </div>
                </div>
              ) : (
                <div className="kk-connect-grid">
                  {discoveryData.results.map((person) => renderStudentDiscoverCard(person))}
                </div>
              )}
            </section>
          )}

          {/* Friends Online Strip */}
          <section className="kk-connect-section">
            <div className="kk-connect-section-header">
              <div>
                <h2 className="kk-connect-section-title">
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '999px',
                      background: 'var(--success)',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)'
                    }}
                  />
                  <span>Friends Online ({onlineFriends.length})</span>
                </h2>
                <p className="kk-connect-section-sub">
                  Start an instant chat or split a campus meal with friends currently active
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="kk-btn kk-btn-ghost"
                  onClick={() => setActiveSection('friends')}
                >
                  <span>All Friends ({friendsList.length})</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {onlineFriends.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {friendsList.length === 0
                    ? 'You have no friends connected yet. Add campus friends below to see when they are online!'
                    : 'No friends are online right now. You can still message them anytime.'}
                </span>
                <button
                  type="button"
                  className="kk-btn kk-btn-primary"
                  onClick={() =>
                    friendsList.length === 0 ? setActiveSection('discover') : navigateToMessages()
                  }
                >
                  {friendsList.length === 0 ? (
                    <>
                      <UserPlus size={14} />
                      <span>Discover Friends</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={14} />
                      <span>Open Messenger</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="kk-online-strip">
                {onlineFriends.map((friend) => (
                  <div key={friend.id} className="kk-online-friend-pill">
                    <button
                      type="button"
                      onClick={() => setSelectedPublicProfileId(friend.id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {renderProfileAvatar(friend, 42, true, true)}
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <button
                        type="button"
                        className="kk-student-name-btn"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => setSelectedPublicProfileId(friend.id)}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {friend.displayName}
                        </span>
                      </button>
                      <span className="kk-student-handle" style={{ fontSize: '0.72rem' }}>
                        @{friend.handle}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="kk-btn kk-btn-primary kk-btn-icon"
                      onClick={() => openChatWithFriend && openChatWithFriend(friend.id)}
                      title={`Message ${friend.displayName}`}
                      aria-label={`Message ${friend.displayName}`}
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Overview Two-Column Row: Incoming Friend Requests Preview & Quick Messenger Access */}
          <div className="kk-connect-overview-columns">
            {/* Incoming Friend Request Preview */}
            <section className="kk-connect-section">
              <div className="kk-connect-section-header">
                <div>
                  <h2 className="kk-connect-section-title">
                    <Inbox size={18} color="var(--accent-primary)" />
                    <span>Incoming Friend Requests ({incomingFriendRequests.length})</span>
                  </h2>
                  <p className="kk-connect-section-sub">
                    Students who want to connect with you on KampusKash
                  </p>
                </div>
                <button
                  type="button"
                  className="kk-btn kk-btn-ghost"
                  onClick={() => setActiveSection('requests')}
                >
                  <span>Manage ({totalRequestsCount})</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {incomingFriendRequests.length === 0 ? (
                <div className="kk-empty-state" style={{ padding: '22px 16px' }}>
                  <div className="kk-empty-icon">
                    <UserPlus size={20} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    No pending incoming requests
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {outgoingFriendRequests.length > 0
                      ? `You have ${outgoingFriendRequests.length} outgoing request${
                          outgoingFriendRequests.length === 1 ? '' : 's'
                        } awaiting response.`
                      : 'When students send you a friend request, it will appear here instantly.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {incomingFriendRequests.slice(0, 3).map((req) => {
                    const sender = req.senderProfile || {
                      id: req.senderId,
                      displayName: req.senderName || 'Student',
                      handle: req.senderHandle || 'student',
                      avatarId: req.senderAvatar || 'cat',
                      university: req.senderUniversity || 'Malaysia Campus'
                    };
                    const mutuals = getMutualFriends ? getMutualFriends(sender.id) : [];
                    return (
                      <div
                        key={req.id}
                        className="kk-student-card incoming-highlight"
                        style={{ padding: '12px 14px' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedPublicProfileId(sender.id)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              {renderProfileAvatar(sender, 44)}
                            </button>
                            <div style={{ minWidth: 0 }}>
                              <button
                                type="button"
                                className="kk-student-name-btn"
                                onClick={() => setSelectedPublicProfileId(sender.id)}
                              >
                                {sender.displayName}
                              </button>
                              <span className="kk-student-handle">@{sender.handle}</span>
                              <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {mutuals.length > 0
                                  ? `${mutuals.length} mutual friend${mutuals.length === 1 ? '' : 's'} · `
                                  : ''}
                                {formatRelativeTime(req.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="kk-btn kk-btn-accept"
                              disabled={busyTargetId === req.id}
                              onClick={() => handleAcceptRequest(req.id, `@${sender.handle}`)}
                            >
                              <Check size={14} />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              className="kk-btn kk-btn-ghost"
                              disabled={busyTargetId === req.id}
                              onClick={() => handleRejectRequest(req.id, `@${sender.handle}`)}
                            >
                              <X size={14} />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Suggested Friends Preview */}
            <section className="kk-connect-section">
              <div className="kk-connect-section-header">
                <div>
                  <h2 className="kk-connect-section-title">
                    <Sparkles size={18} color="var(--accent-primary)" />
                    <span>Suggested for You</span>
                  </h2>
                  <p className="kk-connect-section-sub">
                    Campus peers from {publicProfile?.university || 'your university'} or with mutual friends
                  </p>
                </div>
                <button
                  type="button"
                  className="kk-btn kk-btn-ghost"
                  onClick={() => setActiveSection('discover')}
                >
                  <span>See All</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {friendSuggestions.length === 0 ? (
                <div className="kk-empty-state" style={{ padding: '22px 16px' }}>
                  <div className="kk-empty-icon">
                    <Compass size={20} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    You’ve explored all current suggestions!
                  </div>
                  <button
                    type="button"
                    className="kk-btn kk-btn-primary"
                    onClick={() => setActiveSection('discover')}
                  >
                    Browse Full Directory
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {friendSuggestions.slice(0, 3).map((sug) => {
                    const rel = getFriendshipStatus
                      ? getFriendshipStatus(sug.id)
                      : { status: 'none', canSendRequest: true };
                    const isBusy = busyTargetId === sug.id || busyTargetId === rel.requestId;

                    return (
                      <div
                        key={sug.id}
                        className="kk-student-card"
                        style={{ padding: '12px 14px' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedPublicProfileId(sug.id)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              {renderProfileAvatar(sug, 44)}
                            </button>
                            <div style={{ minWidth: 0 }}>
                              <button
                                type="button"
                                className="kk-student-name-btn"
                                onClick={() => setSelectedPublicProfileId(sug.id)}
                              >
                                {sug.displayName}
                              </button>
                              <span className="kk-student-handle">@{sug.handle}</span>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {sug.mutualFriendsCount > 0
                                  ? `${sug.mutualFriendsCount} mutual friend${sug.mutualFriendsCount === 1 ? '' : 's'}`
                                  : sug.university}
                              </div>
                            </div>
                          </div>

                          <div>
                            {rel.status === 'outgoing_pending' ? (
                              <button
                                type="button"
                                className="kk-btn kk-btn-sent"
                                disabled={isBusy}
                                onClick={() => handleCancelRequest(rel.requestId || sug.id, `@${sug.handle}`)}
                              >
                                <Clock size={13} />
                                <span>Request Sent</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="kk-btn kk-btn-primary"
                                disabled={isBusy || !rel.canSendRequest}
                                onClick={() => handleSendRequest(sug)}
                              >
                                <UserPlus size={14} />
                                <span>{isBusy ? 'Sending...' : 'Add Friend'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Discover Campus Directory Preview on Overview */}
          {searchQuery.trim() === '' && universityFilter === '' && (
            <section className="kk-connect-section">
              <div className="kk-connect-section-header">
                <div>
                  <h2 className="kk-connect-section-title">
                    <Compass size={18} color="var(--accent-primary)" />
                    <span>Discover Campus Students</span>
                  </h2>
                  <p className="kk-connect-section-sub">
                    Connect with verified students across Malaysian universities
                  </p>
                </div>
                <button
                  type="button"
                  className="kk-btn kk-btn-ghost"
                  onClick={() => setActiveSection('discover')}
                >
                  <span>View All ({discoveryData.totalCount})</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="kk-connect-grid">
                {discoveryData.results.slice(0, 6).map((person) => renderStudentDiscoverCard(person))}
              </div>
            </section>
          )}
        </>
      )}

      {/* =====================================================================
         SECTION B: DISCOVER USERS
         ===================================================================== */}
      {activeSection === 'discover' && (
        <section className="kk-connect-section">
          <div className="kk-connect-section-header">
            <div>
              <h2 className="kk-connect-section-title">
                <Compass size={18} color="var(--accent-primary)" />
                <span>Discover KampusKash Users ({discoveryData.totalCount})</span>
              </h2>
              <p className="kk-connect-section-sub">
                Search by @username or display name. Email addresses and private financial data are never exposed.
              </p>
            </div>
            {(searchQuery || universityFilter) && (
              <button
                type="button"
                className="kk-btn kk-btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setUniversityFilter('');
                  setDiscoverPage(1);
                }}
              >
                Reset Search
              </button>
            )}
          </div>

          {discoveryData.results.length === 0 ? (
            <div className="kk-empty-state">
              <div className="kk-empty-icon">
                <Search size={22} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                No students match &ldquo;{searchQuery || universityFilter}&rdquo;
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                Check the spelling of their @username or display name, or clear the campus filter to browse all students.
              </div>
              <button
                type="button"
                className="kk-btn kk-btn-primary"
                onClick={() => {
                  setSearchQuery('');
                  setUniversityFilter('');
                }}
              >
                Show All Students
              </button>
            </div>
          ) : (
            <>
              <div className="kk-connect-grid">
                {discoveryData.results.map((person) => renderStudentDiscoverCard(person))}
              </div>

              {discoveryData.hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '18px' }}>
                  <button
                    type="button"
                    className="kk-btn kk-btn-ghost"
                    onClick={() => setDiscoverPage((p) => p + 1)}
                  >
                    <span>
                      Load More Students ({discoveryData.results.length} of {discoveryData.totalCount})
                    </span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* =====================================================================
         SECTION C: MY FRIENDS
         ===================================================================== */}
      {activeSection === 'friends' && (
        <section className="kk-connect-section">
          <div className="kk-connect-section-header">
            <div>
              <h2 className="kk-connect-section-title">
                <Users size={18} color="var(--accent-primary)" />
                <span>My Friends ({friendsList.length})</span>
              </h2>
              <p className="kk-connect-section-sub">
                Your connected campus network — message in real time, view profiles, or split group expenses
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '210px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="search"
                  className="kk-connect-search-input"
                  style={{ padding: '8px 12px 8px 32px', fontSize: '0.8rem' }}
                  placeholder="Search my friends..."
                  value={friendsSearch}
                  onChange={(e) => {
                    setFriendsSearch(e.target.value);
                    setFriendsPage(1);
                  }}
                  aria-label="Search friends list"
                />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUpDown size={14} color="var(--text-secondary)" />
                <select
                  className="kk-connect-search-input"
                  style={{ width: 'auto', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                  value={friendsSortBy}
                  onChange={(e) => setFriendsSortBy(e.target.value)}
                  aria-label="Sort friends by"
                >
                  <option value="online">Sort: Online First</option>
                  <option value="name">Sort: Name (A–Z)</option>
                  <option value="university">Sort: Same University</option>
                  <option value="mutuals">Sort: Most Mutual Friends</option>
                  <option value="recent">Sort: Recently Connected</option>
                </select>
              </div>
            </div>
          </div>

          {filteredAndSortedFriends.length === 0 ? (
            <div className="kk-empty-state">
              <div className="kk-empty-icon">
                <Users size={22} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {friendsList.length === 0
                  ? 'Your friends list is empty'
                  : `No friends match "${friendsSearch}"`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                {friendsList.length === 0
                  ? 'Discover classmates and campus peers to start chatting and splitting bills on KampusKash Connect.'
                  : 'Try clearing your search filter to see all connected friends.'}
              </div>
              <button
                type="button"
                className="kk-btn kk-btn-primary"
                onClick={() => {
                  if (friendsList.length === 0) setActiveSection('discover');
                  else setFriendsSearch('');
                }}
              >
                {friendsList.length === 0 ? (
                  <>
                    <UserPlus size={14} />
                    <span>Discover Students</span>
                  </>
                ) : (
                  <span>Reset Filter</span>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="kk-connect-grid">
                {visibleFriends.map((friend) => {
                  const isMenuOpen = openMoreMenuFriendId === friend.id;
                  return (
                    <article key={friend.id} className="kk-student-card">
                      <div>
                        <div className="kk-student-card-top">
                          <button
                            type="button"
                            onClick={() => setSelectedPublicProfileId(friend.id)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            aria-label={`View ${friend.displayName}'s profile`}
                          >
                            {renderProfileAvatar(friend, 52, true, friend.isOnline)}
                          </button>

                          <div className="kk-student-card-info">
                            <button
                              type="button"
                              className="kk-student-name-btn"
                              onClick={() => setSelectedPublicProfileId(friend.id)}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {friend.displayName}
                              </span>
                            </button>
                            <span className="kk-student-handle">@{friend.handle}</span>

                            <div className="kk-student-uni">
                              <MapPin size={12} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {friend.university || 'Malaysia Campus'}
                              </span>
                            </div>

                            {friend.course && (
                              <div className="kk-student-uni" style={{ marginTop: '2px' }}>
                                <GraduationCap size={12} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {friend.course}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="kk-student-tags">
                          <span className={`kk-student-tag ${friend.isOnline ? 'online' : ''}`}>
                            {friend.isOnline ? '● Online now' : 'Offline'}
                          </span>
                          {friend.mutualFriendsCount > 0 && (
                            <span className="kk-student-tag mutual">
                              <Users size={11} />
                              {friend.mutualFriendsCount} mutual friend{friend.mutualFriendsCount === 1 ? '' : 's'}
                            </span>
                          )}
                          {friend.sameCampus && (
                            <span className="kk-student-tag same-campus">Same Campus</span>
                          )}
                        </div>
                      </div>

                      <div className="kk-student-card-footer">
                        <div className="kk-student-actions">
                          <button
                            type="button"
                            className="kk-btn kk-btn-primary"
                            onClick={() => openChatWithFriend && openChatWithFriend(friend.id)}
                          >
                            <MessageSquare size={14} />
                            <span>Message</span>
                          </button>
                          <button
                            type="button"
                            className="kk-btn kk-btn-ghost"
                            onClick={() => setSelectedPublicProfileId(friend.id)}
                          >
                            <span>View Profile</span>
                          </button>
                        </div>

                        {/* More Options Menu (⋯) */}
                        <div
                          className="kk-more-menu-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="kk-btn kk-btn-ghost kk-btn-icon"
                            onClick={() =>
                              setOpenMoreMenuFriendId(isMenuOpen ? null : friend.id)
                            }
                            aria-label={`More options for ${friend.displayName}`}
                            aria-expanded={isMenuOpen}
                            title="More options"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {isMenuOpen && (
                            <div className="kk-more-dropdown" role="menu">
                              <button
                                type="button"
                                className="kk-more-item"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMoreMenuFriendId(null);
                                  startSendMoneyToUser(friend, { mode: 'send' });
                                }}
                              >
                                <Send size={14} color="var(--accent-primary)" />
                                <span>Send Demo RM</span>
                              </button>
                              <button
                                type="button"
                                className="kk-more-item"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMoreMenuFriendId(null);
                                  startSendMoneyToUser(friend, { mode: 'split' });
                                }}
                              >
                                <Split size={14} color="var(--accent-secondary)" />
                                <span>Split a Bill</span>
                              </button>
                              <button
                                type="button"
                                className="kk-more-item danger"
                                role="menuitem"
                                onClick={() => promptRemoveFriend(friend)}
                              >
                                <UserMinus size={14} />
                                <span>Remove Friend</span>
                              </button>
                              <button
                                type="button"
                                className="kk-more-item danger"
                                role="menuitem"
                                onClick={() => promptBlockUser(friend)}
                              >
                                <Ban size={14} />
                                <span>Block @{friend.handle}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {visibleFriends.length < filteredAndSortedFriends.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '18px' }}>
                  <button
                    type="button"
                    className="kk-btn kk-btn-ghost"
                    onClick={() => setFriendsPage((p) => p + 1)}
                  >
                    <span>
                      Load More Friends ({visibleFriends.length} of {filteredAndSortedFriends.length})
                    </span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* =====================================================================
         SECTION D: FRIEND REQUESTS (INCOMING & OUTGOING)
         ===================================================================== */}
      {activeSection === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div className="kk-connect-filter-chips">
              <button
                type="button"
                className={`kk-connect-chip ${requestsFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRequestsFilter('all')}
              >
                All Requests ({totalRequestsCount})
              </button>
              <button
                type="button"
                className={`kk-connect-chip ${requestsFilter === 'incoming' ? 'active' : ''}`}
                onClick={() => setRequestsFilter('incoming')}
              >
                Incoming ({incomingFriendRequests.length})
              </button>
              <button
                type="button"
                className={`kk-connect-chip ${requestsFilter === 'outgoing' ? 'active' : ''}`}
                onClick={() => setRequestsFilter('outgoing')}
              >
                Outgoing Sent ({outgoingFriendRequests.length})
              </button>
            </div>

            <button
              type="button"
              className="kk-btn kk-btn-ghost"
              onClick={() => setActiveSection('discover')}
            >
              <UserPlus size={14} />
              <span>Find More Students</span>
            </button>
          </div>

          {/* Incoming Friend Requests */}
          {(requestsFilter === 'all' || requestsFilter === 'incoming') && (
            <section className="kk-connect-section">
              <div className="kk-connect-section-header">
                <div>
                  <h2 className="kk-connect-section-title">
                    <Inbox size={18} color="var(--accent-primary)" />
                    <span>Incoming Requests ({incomingFriendRequests.length})</span>
                  </h2>
                  <p className="kk-connect-section-sub">
                    Accepting a request creates a mutual friendship and unlocks real-time messaging
                  </p>
                </div>
              </div>

              {incomingFriendRequests.length === 0 ? (
                <div className="kk-empty-state">
                  <div className="kk-empty-icon">
                    <Inbox size={22} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                    No incoming friend requests
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                    You’re all caught up! Share your @{publicProfile?.handle || 'username'} with campus friends or discover peers in the directory.
                  </div>
                </div>
              ) : (
                <div className="kk-connect-grid">
                  {incomingFriendRequests.map((req) => {
                    const sender = req.senderProfile || {
                      id: req.senderId,
                      displayName: req.senderName || 'Student',
                      handle: req.senderHandle || 'student',
                      avatarId: req.senderAvatar || 'cat',
                      university: req.senderUniversity || 'Malaysia Campus'
                    };
                    const mutuals = getMutualFriends ? getMutualFriends(sender.id) : [];
                    const isBusy = busyTargetId === req.id || busyTargetId === sender.id;

                    return (
                      <article key={req.id} className="kk-student-card incoming-highlight">
                        <div>
                          <div className="kk-student-card-top">
                            <button
                              type="button"
                              onClick={() => setSelectedPublicProfileId(sender.id)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              {renderProfileAvatar(sender, 50)}
                            </button>
                            <div className="kk-student-card-info">
                              <button
                                type="button"
                                className="kk-student-name-btn"
                                onClick={() => setSelectedPublicProfileId(sender.id)}
                              >
                                {sender.displayName}
                              </button>
                              <span className="kk-student-handle">@{sender.handle}</span>
                              {sender.university && (
                                <div className="kk-student-uni">
                                  <MapPin size={12} color="var(--accent-primary)" />
                                  <span>{sender.university}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {req.note && (
                            <p className="kk-student-bio" style={{ fontStyle: 'italic' }}>
                              &ldquo;{req.note}&rdquo;
                            </p>
                          )}

                          <div className="kk-student-tags">
                            <span className="kk-student-tag">
                              <Clock size={11} />
                              {formatRelativeTime(req.createdAt)}
                            </span>
                            {mutuals.length > 0 && (
                              <span className="kk-student-tag mutual">
                                <Users size={11} />
                                {mutuals.length} mutual friend{mutuals.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="kk-student-card-footer">
                          <div className="kk-student-actions">
                            <button
                              type="button"
                              className="kk-btn kk-btn-accept"
                              disabled={isBusy}
                              onClick={() => handleAcceptRequest(req.id, `@${sender.handle}`)}
                            >
                              <Check size={14} />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              className="kk-btn kk-btn-ghost"
                              disabled={isBusy}
                              onClick={() => handleRejectRequest(req.id, `@${sender.handle}`)}
                            >
                              <X size={14} />
                              <span>Decline</span>
                            </button>
                            <button
                              type="button"
                              className="kk-btn kk-btn-ghost"
                              onClick={() => setSelectedPublicProfileId(sender.id)}
                            >
                              <span>Profile</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Outgoing Friend Requests */}
          {(requestsFilter === 'all' || requestsFilter === 'outgoing') && (
            <section className="kk-connect-section">
              <div className="kk-connect-section-header">
                <div>
                  <h2 className="kk-connect-section-title">
                    <SendHorizontal size={18} color="var(--accent-primary)" />
                    <span>Outgoing Requests ({outgoingFriendRequests.length})</span>
                  </h2>
                  <p className="kk-connect-section-sub">
                    Friend requests you’ve sent that are awaiting approval
                  </p>
                </div>
              </div>

              {outgoingFriendRequests.length === 0 ? (
                <div className="kk-empty-state">
                  <div className="kk-empty-icon">
                    <Clock size={22} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                    No pending outgoing requests
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                    Requests you send to other KampusKash students will show up here until accepted.
                  </div>
                </div>
              ) : (
                <div className="kk-connect-grid">
                  {outgoingFriendRequests.map((req) => {
                    const receiver = req.receiverProfile || {
                      id: req.receiverId,
                      displayName: req.receiverName || 'Student',
                      handle: req.receiverHandle || 'student',
                      avatarId: req.receiverAvatar || 'cat',
                      university: req.receiverUniversity || 'Malaysia Campus'
                    };
                    const isBusy = busyTargetId === req.id || busyTargetId === receiver.id;

                    return (
                      <article key={req.id} className="kk-student-card">
                        <div>
                          <div className="kk-student-card-top">
                            <button
                              type="button"
                              onClick={() => setSelectedPublicProfileId(receiver.id)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              {renderProfileAvatar(receiver, 50)}
                            </button>
                            <div className="kk-student-card-info">
                              <button
                                type="button"
                                className="kk-student-name-btn"
                                onClick={() => setSelectedPublicProfileId(receiver.id)}
                              >
                                {receiver.displayName}
                              </button>
                              <span className="kk-student-handle">@{receiver.handle}</span>
                              {receiver.university && (
                                <div className="kk-student-uni">
                                  <MapPin size={12} color="var(--accent-primary)" />
                                  <span>{receiver.university}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="kk-student-tags">
                            <span className="kk-student-tag">
                              <Clock size={11} />
                              Sent {formatRelativeTime(req.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="kk-student-card-footer">
                          <div className="kk-student-actions">
                            <span className="kk-btn kk-btn-sent">
                              <Clock size={13} />
                              <span>Request Sent</span>
                            </span>
                            <button
                              type="button"
                              className="kk-btn kk-btn-danger-ghost"
                              disabled={isBusy}
                              onClick={() => handleCancelRequest(req.id, `@${receiver.handle}`)}
                            >
                              <X size={13} />
                              <span>Cancel Request</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* =====================================================================
         PHASE 4: GROUPS, SAVINGS CHALLENGES & STUDENT COMMUNITIES
         ===================================================================== */}
      {(activeSection === 'groups' ||
        activeSection === 'challenges' ||
        activeSection === 'communities') && (
        <Phase4GroupsChallengesCommunitiesPanel
          activeTab={activeSection}
          onOpenConversationInMessenger={(conversationId) => {
            if (setActiveConversationId) setActiveConversationId(conversationId);
            navigateToMessages();
          }}
        />
      )}

      {/* =====================================================================
         PRIVACY & SAFETY SETTINGS PANEL
         ===================================================================== */}
      {activeSection === 'privacy' && (
        <section className="kk-connect-section">
          <div className="kk-connect-section-header">
            <div>
              <h2 className="kk-connect-section-title">
                <Lock size={18} color="var(--accent-primary)" />
                <span>Privacy &amp; Safety Controls</span>
              </h2>
              <p className="kk-connect-section-sub">
                Control who can view your full profile, send you friend requests, see your online status, or find you in search
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Social Profile Visibility
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Choose whether all authenticated students or only your confirmed friends can view your full bio, course, and friends list.
                </div>
              </div>
              <select
                className="kk-connect-search-input"
                style={{ width: 'auto', minWidth: '185px', padding: '8px 12px' }}
                value={publicProfile?.privacySettings?.profileVisibility || 'public'}
                onChange={(e) => handlePrivacyToggle('profileVisibility', e.target.value)}
                aria-label="Profile visibility setting"
              >
                <option value="public">Public (All Students)</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Allow Incoming Friend Requests
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  When disabled, other users cannot send you new friend requests.
                </div>
              </div>
              <input
                type="checkbox"
                checked={publicProfile?.privacySettings?.allowFriendRequests !== false}
                onChange={(e) => handlePrivacyToggle('allowFriendRequests', e.target.checked)}
                aria-label="Allow incoming friend requests"
              />
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Allow Profile Discovery in Search
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  When disabled, your profile is hidden from general user discovery and friend suggestions for non-friends.
                </div>
              </div>
              <input
                type="checkbox"
                checked={publicProfile?.privacySettings?.allowDiscovery !== false}
                onChange={(e) => handlePrivacyToggle('allowDiscovery', e.target.checked)}
                aria-label="Allow profile discovery in search"
              />
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Show Online Status Indicator
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Let your friends see when you are active on KampusKash Connect and Messenger.
                </div>
              </div>
              <input
                type="checkbox"
                checked={publicProfile?.privacySettings?.showOnlineStatus !== false}
                onChange={(e) => handlePrivacyToggle('showOnlineStatus', e.target.checked)}
                aria-label="Show online status indicator"
              />
            </div>
          </div>

          {/* Blocked Users Management */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <h3
              style={{
                fontSize: '0.94rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                margin: '0 0 6px'
              }}
            >
              <Ban size={16} color="var(--danger)" />
              <span>Blocked Users ({blockedProfiles.length})</span>
            </h3>
            <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Blocked users cannot send you friend requests, message you, or view your profile details.
            </p>

            {blockedProfiles.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                You haven&apos;t blocked any users.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blockedProfiles.map((bp) => (
                  <div
                    key={bp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {bp.displayName}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--accent-primary)',
                          marginLeft: '8px',
                          fontWeight: 700
                        }}
                      >
                        @{bp.handle}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="kk-btn kk-btn-ghost"
                      onClick={() => handleUnblockUser(bp.id, bp.handle)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Destructive Action Confirmation Modal (Remove Friend / Block User) */}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        title={
          confirmDialog?.type === 'block'
            ? `Block @${confirmDialog?.targetProfile?.handle || 'user'}?`
            : `Remove @${confirmDialog?.targetProfile?.handle || 'friend'}?`
        }
        message={
          confirmDialog?.type === 'block'
            ? `Blocking ${confirmDialog?.targetProfile?.displayName || 'this user'} will remove any existing friendship, cancel pending requests, and prevent them from messaging or finding you.`
            : `Are you sure you want to remove ${confirmDialog?.targetProfile?.displayName || 'this student'} (@${confirmDialog?.targetProfile?.handle || 'student'}) from your KampusKash friends list?`
        }
        confirmText={confirmDialog?.type === 'block' ? 'Block User' : 'Remove Friend'}
        cancelText="Cancel"
        isDestructive
        onConfirm={handleConfirmDialogAction}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
