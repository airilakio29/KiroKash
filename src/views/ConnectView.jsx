import React, { useState, useMemo } from 'react';
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
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import UserAvatar from '../components/UserAvatar';
import { getAvatarSvg } from '../components/Avatars';
import Phase4GroupsChallengesCommunitiesPanel from '../components/connect/Phase4GroupsChallengesCommunitiesPanel';
import {
  CONNECT_SECTION_NAME,
  CONNECT_SECTION_SUBTITLE,
  PROFILE_ACHIEVEMENTS
} from '../config/appConstants';

const PAGE_SIZE = 6;

function renderProfileAvatar(profile, size = 46) {
  const avatarId = profile?.avatarId || profile?.avatar || 'cat';
  if (
    typeof avatarId === 'string' &&
    (avatarId.startsWith('preset-') || avatarId.startsWith('data:') || avatarId.startsWith('http'))
  ) {
    return <UserAvatar avatar={avatarId} name={profile?.displayName || 'Student'} size={size} />;
  }
  return (
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
        background: 'var(--bg-card-subtle)',
        border: '1px solid var(--border-light)'
      }}
    >
      {getAvatarSvg(avatarId)}
    </div>
  );
}

export default function ConnectView({ onOpenProfileModal }) {
  const { user } = useAuth();
  const {
    publicProfile,
    friendsList = [],
    incomingFriendRequests = [],
    outgoingFriendRequests = [],
    friendSuggestions = [],
    blockedUserIds = [],
    getPublicProfile,
    getFriendshipStatus,
    getMutualFriends,
    searchPublicProfiles,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    updatePrivacySettings,
    unblock,
    setSelectedPublicProfileId,
    startSendMoneyToUser,
    openChatWithFriend,
    setActiveConversationId
  } = useSocialWallet();

  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'friends' | 'requests' | 'discover' | 'privacy'
  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [discoverPage, setDiscoverPage] = useState(1);
  const [friendsSearch, setFriendsSearch] = useState('');
  const [friendsPage, setFriendsPage] = useState(1);
  const [feedbackBanner, setFeedbackBanner] = useState(null); // { type: 'success' | 'error', text: string }
  const [busyTargetId, setBusyTargetId] = useState(null);

  const showFeedback = (text, type = 'success') => {
    setFeedbackBanner({ text, type });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  // Paginated discovery search results
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
  }, [searchPublicProfiles, searchQuery, user?.id, blockedUserIds, universityFilter, discoverPage]);

  // Filtered & paginated friends list
  const filteredFriends = useMemo(() => {
    const q = friendsSearch.trim().toLowerCase().replace(/^@+/, '');
    if (!q) return friendsList;
    return friendsList.filter(
      (f) =>
        (f.displayName || '').toLowerCase().includes(q) ||
        (f.handle || '').toLowerCase().includes(q) ||
        (f.university || '').toLowerCase().includes(q) ||
        (f.course || '').toLowerCase().includes(q)
    );
  }, [friendsList, friendsSearch]);

  const visibleFriends = useMemo(
    () => filteredFriends.slice(0, friendsPage * PAGE_SIZE),
    [filteredFriends, friendsPage]
  );

  const blockedProfiles = useMemo(
    () =>
      (blockedUserIds || []).map((id) => {
        const p = getPublicProfile ? getPublicProfile(id) : null;
        return p || { id, displayName: 'Campus User', handle: 'restricted_user', university: 'KampusKash' };
      }),
    [blockedUserIds, getPublicProfile]
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

  const handleSendRequest = async (targetProfile) => {
    if (!targetProfile?.id) return;
    setBusyTargetId(targetProfile.id);
    try {
      await sendFriendRequest(targetProfile.id);
      showFeedback(`Friend request sent to ${targetProfile.displayName} (@${targetProfile.handle})!`);
    } catch (err) {
      showFeedback(err?.message || 'Failed to send friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleAcceptRequest = async (reqOrUserId, label = 'student') => {
    setBusyTargetId(reqOrUserId);
    try {
      await acceptFriendRequest(reqOrUserId);
      showFeedback(`You and ${label} are now friends!`);
    } catch (err) {
      showFeedback(err?.message || 'Could not accept friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleRejectRequest = async (reqOrUserId, label = 'student') => {
    setBusyTargetId(reqOrUserId);
    try {
      await rejectFriendRequest(reqOrUserId);
      showFeedback(`Declined friend request from ${label}.`);
    } catch (err) {
      showFeedback(err?.message || 'Could not reject friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleCancelRequest = async (reqOrUserId, label = 'student') => {
    setBusyTargetId(reqOrUserId);
    try {
      await cancelFriendRequest(reqOrUserId);
      showFeedback(`Cancelled friend request to ${label}.`);
    } catch (err) {
      showFeedback(err?.message || 'Could not cancel friend request.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handleRemoveFriend = async (friendProfile) => {
    if (!friendProfile?.id) return;
    setBusyTargetId(friendProfile.id);
    try {
      await removeFriend(friendProfile.id);
      showFeedback(`Removed @${friendProfile.handle} from your friends list.`);
    } catch (err) {
      showFeedback(err?.message || 'Could not remove friend.', 'error');
    } finally {
      setBusyTargetId(null);
    }
  };

  const handlePrivacyToggle = async (key, value) => {
    try {
      await updatePrivacySettings({ [key]: value });
      showFeedback('Privacy preferences saved.');
    } catch (err) {
      showFeedback(err?.message || 'Could not update privacy settings.', 'error');
    }
  };

  const handleUnblockUser = async (targetId, handle) => {
    try {
      await unblock(targetId);
      showFeedback(`Unblocked @${handle || 'user'}.`);
    } catch (err) {
      showFeedback(err?.message || 'Could not unblock user.', 'error');
    }
  };

  const renderRelationshipControls = (person) => {
    const rel = getFriendshipStatus ? getFriendshipStatus(person.id) : { status: 'none', canSendRequest: true };
    const isBusy = busyTargetId === person.id || busyTargetId === rel.requestId;

    if (rel.status === 'friends') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span
            className="badge badge-income"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          >
            <UserCheck size={13} /> Friends
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openChatWithFriend && openChatWithFriend(person.id)}
          >
            <MessageSquare size={13} /> Message
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedPublicProfileId(person.id)}
          >
            View Profile
          </button>
        </div>
      );
    }

    if (rel.status === 'outgoing_pending') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.3rem 0.6rem',
              fontSize: '0.74rem',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)'
            }}
          >
            <Clock size={12} /> Request Sent
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={isBusy}
            onClick={() => handleCancelRequest(rel.requestId || person.id, `@${person.handle}`)}
          >
            <X size={13} /> Cancel
          </button>
        </div>
      );
    }

    if (rel.status === 'incoming_pending') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isBusy}
            onClick={() => handleAcceptRequest(rel.requestId || person.id, `@${person.handle}`)}
          >
            <Check size={14} /> Accept
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={isBusy}
            onClick={() => handleRejectRequest(rel.requestId || person.id, `@${person.handle}`)}
          >
            <X size={14} /> Reject
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isBusy || !rel.canSendRequest}
          onClick={() => handleSendRequest(person)}
          title={!rel.canSendRequest ? 'User restricts incoming friend requests' : 'Send Friend Request'}
        >
          <UserPlus size={14} />
          <span>{rel.canSendRequest ? 'Add Friend' : 'Restricted'}</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedPublicProfileId(person.id)}
        >
          Profile
        </button>
      </div>
    );
  };

  const totalRequestsCount = incomingFriendRequests.length + outgoingFriendRequests.length;

  return (
    <div className="connect-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Hero & Current Student Social Profile Summary */}
      <section className="card" style={{ padding: '1.35rem 1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: '1 1 280px' }}>
            {renderProfileAvatar(publicProfile || user, 64)}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge" style={{
                  background: 'color-mix(in srgb, var(--primary) 18%, transparent)',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px'
                }}>
                  <Sparkles size={11} /> KampusKash {CONNECT_SECTION_NAME}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.73rem',
                  color: 'var(--text-muted)'
                }}>
                  {publicProfile?.privacySettings?.profileVisibility === 'friends' ? (
                    <><Lock size={12} /> Friends-Only Profile</>
                  ) : (
                    <><Globe size={12} /> Public Student Profile</>
                  )}
                </span>
              </div>

              <h1 style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-sans)',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '0.25rem',
                marginBottom: '0.1rem'
              }}>
                {publicProfile?.displayName || user?.username || 'Student'}
              </h1>

              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary)' }}>
                @{publicProfile?.handle || user?.handle || 'student'}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginTop: '0.35rem'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} /> {publicProfile?.university || user?.university || 'Malaysia Campus'}
                </span>
                {publicProfile?.course && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <GraduationCap size={13} /> {publicProfile.course}
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={13} /> {joinedLabel}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  <Users size={13} color="var(--primary)" /> {friendsList.length} Friend{friendsList.length === 1 ? '' : 's'}
                </span>
              </div>

              {publicProfile?.bio && (
                <p style={{ fontSize: '0.83rem', color: 'var(--text-main)', marginTop: '0.45rem', opacity: 0.9 }}>
                  &ldquo;{publicProfile.bio}&rdquo;
                </p>
              )}

              {myAchievements.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {myAchievements.map((ach) => (
                    <span
                      key={ach.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.28rem',
                        padding: '0.18rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <Award size={11} color="var(--primary)" />
                      {ach.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Profile & Privacy Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onOpenProfileModal && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onOpenProfileModal}
              >
                <Edit3 size={14} />
                <span>Edit Profile &amp; @Username</span>
              </button>
            )}
            {user?.id && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPublicProfileId(user.id)}
              >
                <Globe size={14} />
                <span>Preview Public Profile</span>
              </button>
            )}
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'privacy' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection(activeSection === 'privacy' ? 'all' : 'privacy')}
            >
              <Lock size={14} />
              <span>Privacy &amp; Safety</span>
            </button>
          </div>
        </div>

        {/* Financial Privacy Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-light)',
          fontSize: '0.76rem',
          color: 'var(--text-muted)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={15} color="var(--income)" />
            <span>
              <strong>Financial Privacy Guaranteed:</strong> {CONNECT_SECTION_SUBTITLE}. Account balances, budgets, and transactions are never visible to other users.
            </span>
          </span>
        </div>
      </section>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: feedbackBanner.type === 'error' ? 'var(--expense-bg)' : 'var(--income-bg)',
            color: feedbackBanner.type === 'error' ? 'var(--expense)' : 'var(--income)',
            border: '1px solid var(--border-light)',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
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

      {/* Navigation Pills for Connect Sections */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('all')}
        >
          <Sparkles size={14} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'discover' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('discover')}
        >
          <Search size={14} />
          <span>Discover Students</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('requests')}
        >
          <UserPlus size={14} />
          <span>Friend Requests ({totalRequestsCount})</span>
          {incomingFriendRequests.length > 0 && (
            <span style={{
              marginLeft: '0.25rem',
              padding: '0.05rem 0.45rem',
              borderRadius: '999px',
              background: 'var(--expense)',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              {incomingFriendRequests.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'friends' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('friends')}
        >
          <Users size={14} />
          <span>Friends ({friendsList.length})</span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/messages');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
        >
          <MessageSquare size={14} />
          <span>Messages</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'groups' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('groups')}
        >
          <Users size={14} />
          <span>Groups</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'challenges' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('challenges')}
        >
          <Target size={14} />
          <span>Challenges</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'communities' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('communities')}
        >
          <Globe size={14} />
          <span>Communities</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === 'privacy' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('privacy')}
        >
          <Lock size={14} />
          <span>Privacy &amp; Blocked ({blockedProfiles.length})</span>
        </button>
      </div>

      {/* Phase 4: Groups, Savings Challenges, Leaderboards & Student Communities */}
      {(activeSection === 'groups' ||
        activeSection === 'challenges' ||
        activeSection === 'communities') && (
        <Phase4GroupsChallengesCommunitiesPanel
          activeTab={activeSection}
          onOpenConversationInMessenger={(conversationId) => {
            if (setActiveConversationId) setActiveConversationId(conversationId);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/messages');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
        />
      )}

      {/* 1. Search & User Discovery Section */}
      {(activeSection === 'all' || activeSection === 'discover') && (
        <section className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Search size={18} color="var(--primary)" />
                <span>Discover KampusKash Users</span>
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Search by @username, display name, university, or course. Email addresses and financial data are never exposed.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="search"
                className="form-control"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Search students by @username or display name (e.g. @sarah_um, Aiman, UTP)..."
                value={searchQuery}
                maxLength={60}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDiscoverPage(1);
                }}
                aria-label="Search KampusKash users by username or display name"
              />
            </div>

            <input
              type="text"
              className="form-control"
              style={{ maxWidth: '210px' }}
              placeholder="Filter university..."
              value={universityFilter}
              maxLength={60}
              onChange={(e) => {
                setUniversityFilter(e.target.value);
                setDiscoverPage(1);
              }}
              aria-label="Filter by university"
            />
          </div>

          {/* Search Results Grid */}
          {discoveryData.results.length === 0 ? (
            <div style={{
              padding: '1.75rem 1rem',
              textAlign: 'center',
              background: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              No matching students found. Try searching another @username or display name.
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.85rem'
              }}>
                {discoveryData.results.map((person) => {
                  const mutuals = getMutualFriends ? getMutualFriends(person.id) : [];
                  return (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.95rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPublicProfileId(person.id)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                          aria-label={`Open ${person.displayName} profile`}
                        >
                          {renderProfileAvatar(person, 46)}
                        </button>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedPublicProfileId(person.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              color: 'var(--text-main)',
                              display: 'block',
                              width: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {person.displayName}
                          </button>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                            @{person.handle}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {person.university}
                          </div>
                          {person.course && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {person.course}
                            </div>
                          )}
                          {mutuals.length > 0 && (
                            <div style={{ fontSize: '0.71rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                              {mutuals.length} mutual friend{mutuals.length === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {person.friendsCount || 0} friends
                        </span>
                        {renderRelationshipControls(person)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {discoveryData.hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDiscoverPage((p) => p + 1)}
                  >
                    <span>Load More Students ({discoveryData.results.length} of {discoveryData.totalCount})</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* 2. Friend Suggestions (Campus Peers & Mutual Connections) */}
      {(activeSection === 'all' || activeSection === 'discover') && friendSuggestions.length > 0 && !searchQuery && (
        <section className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ marginBottom: '0.9rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Sparkles size={17} color="var(--primary)" />
              <span>Suggested Campus Friends</span>
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Students from your university or with mutual friends on KampusKash
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '0.8rem'
          }}>
            {friendSuggestions.slice(0, 4).map((sug) => (
              <div
                key={sug.id}
                style={{
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  {renderProfileAvatar(sug, 42)}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPublicProfileId(sug.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                        textAlign: 'left'
                      }}
                    >
                      {sug.displayName}
                    </button>
                    <div style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
                      @{sug.handle}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sug.mutualFriendsCount > 0
                        ? `${sug.mutualFriendsCount} mutual friend${sug.mutualFriendsCount === 1 ? '' : 's'}`
                        : sug.university}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={busyTargetId === sug.id}
                    onClick={() => handleSendRequest(sug)}
                  >
                    <UserPlus size={14} />
                    <span>Add Friend</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedPublicProfileId(sug.id)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Incoming & Outgoing Friend Requests */}
      {(activeSection === 'all' || activeSection === 'requests') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Incoming Requests Card */}
          <section className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <UserPlus size={17} color="var(--primary)" />
                <span>Incoming Requests ({incomingFriendRequests.length})</span>
              </h2>
            </div>

            {incomingFriendRequests.length === 0 ? (
              <div style={{
                padding: '1.35rem 1rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}>
                No pending incoming friend requests right now.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {incomingFriendRequests.map((req) => {
                  const sender = req.senderProfile || {
                    id: req.senderId,
                    displayName: req.senderName || 'Student',
                    handle: req.senderHandle || 'student',
                    avatarId: req.senderAvatar || 'cat',
                    university: 'KampusKash'
                  };
                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPublicProfileId(sender.id)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {renderProfileAvatar(sender, 42)}
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedPublicProfileId(sender.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: 'var(--text-main)',
                              textAlign: 'left'
                            }}
                          >
                            {sender.displayName}
                          </button>
                          <div style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
                            @{sender.handle}
                          </div>
                          {req.note && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              &ldquo;{req.note}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyTargetId === req.id}
                          onClick={() => handleAcceptRequest(req.id, `@${sender.handle}`)}
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busyTargetId === req.id}
                          onClick={() => handleRejectRequest(req.id, `@${sender.handle}`)}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Outgoing Sent Requests Card */}
          <section className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Clock size={17} color="var(--primary)" />
                <span>Sent Outgoing Requests ({outgoingFriendRequests.length})</span>
              </h2>
            </div>

            {outgoingFriendRequests.length === 0 ? (
              <div style={{
                padding: '1.35rem 1rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}>
                No pending outgoing friend requests.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {outgoingFriendRequests.map((req) => {
                  const receiver = req.receiverProfile || {
                    id: req.receiverId,
                    displayName: req.receiverName || 'Student',
                    handle: req.receiverHandle || 'student',
                    avatarId: req.receiverAvatar || 'cat',
                    university: 'KampusKash'
                  };
                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPublicProfileId(receiver.id)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {renderProfileAvatar(receiver, 42)}
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedPublicProfileId(receiver.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: 'var(--text-main)',
                              textAlign: 'left'
                            }}
                          >
                            {receiver.displayName}
                          </button>
                          <div style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
                            @{receiver.handle}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Pending
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busyTargetId === req.id}
                          onClick={() => handleCancelRequest(req.id, `@${receiver.handle}`)}
                        >
                          <X size={13} /> Cancel Request
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 4. My Friends List Section */}
      {(activeSection === 'all' || activeSection === 'friends') && (
        <section className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={18} color="var(--primary)" />
                <span>My Friends ({friendsList.length})</span>
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Mutual friends on KampusKash Connect — view profiles, split bills, or send demo transfers
              </p>
            </div>

            {friendsList.length > 0 && (
              <input
                type="search"
                className="form-control"
                style={{ maxWidth: '240px' }}
                placeholder="Filter friends..."
                value={friendsSearch}
                onChange={(e) => {
                  setFriendsSearch(e.target.value);
                  setFriendsPage(1);
                }}
                aria-label="Filter friends list"
              />
            )}
          </div>

          {filteredFriends.length === 0 ? (
            <div style={{
              padding: '1.75rem 1rem',
              textAlign: 'center',
              background: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              {friendsList.length === 0
                ? 'You have no connected friends yet. Search above or check Suggested Campus Friends to send a request!'
                : 'No friends match your filter.'}
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '0.85rem'
              }}>
                {visibleFriends.map((friend) => {
                  const mutuals = getMutualFriends ? getMutualFriends(friend.id) : [];
                  return (
                    <div
                      key={friend.id}
                      style={{
                        padding: '0.95rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPublicProfileId(friend.id)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {renderProfileAvatar(friend, 48)}
                        </button>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedPublicProfileId(friend.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                color: 'var(--text-main)',
                                textAlign: 'left'
                              }}
                            >
                              {friend.displayName}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                            @{friend.handle}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {friend.university}
                          </div>
                          {friend.course && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {friend.course}
                            </div>
                          )}
                          {mutuals.length > 0 && (
                            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {mutuals.length} mutual friend{mutuals.length === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border-light)'
                      }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openChatWithFriend && openChatWithFriend(friend.id)}
                            title="Open Real-Time Chat"
                          >
                            <MessageSquare size={13} /> Message
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedPublicProfileId(friend.id)}
                          >
                            Profile
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => startSendMoneyToUser(friend, { mode: 'send' })}
                            title="Send Demo Money"
                          >
                            <Send size={13} /> Send
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => startSendMoneyToUser(friend, { mode: 'split' })}
                            title="Split a Bill 50/50"
                          >
                            <Split size={13} /> Split
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--expense)' }}
                          disabled={busyTargetId === friend.id}
                          onClick={() => handleRemoveFriend(friend)}
                          title="Remove Friend"
                        >
                          <UserMinus size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleFriends.length < filteredFriends.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setFriendsPage((p) => p + 1)}
                  >
                    Load More Friends ({visibleFriends.length} of {filteredFriends.length})
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* 5. Privacy & Safety Settings Panel */}
      {activeSection === 'privacy' && (
        <section className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
            <Lock size={18} color="var(--primary)" />
            <span>Privacy &amp; Safety Controls</span>
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Control who can view your full profile, send you friend requests, or discover you in search.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Social Profile Visibility
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Choose whether all authenticated students or only your confirmed friends can view your full bio, programme, and friends list.
                </div>
              </div>
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '185px' }}
                value={publicProfile?.privacySettings?.profileVisibility || 'public'}
                onChange={(e) => handlePrivacyToggle('profileVisibility', e.target.value)}
                aria-label="Profile visibility setting"
              >
                <option value="public">Public (All Students)</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Allow Incoming Friend Requests
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
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

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Allow Profile Discovery in Search
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
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
          </div>

          {/* Blocked Users Management */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Ban size={16} color="var(--expense)" />
              <span>Blocked Users ({blockedProfiles.length})</span>
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Blocked users cannot send you friend requests, view your profile details, or interact with you.
            </p>

            {blockedProfiles.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                You haven&apos;t blocked any users.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {blockedProfiles.map((bp) => (
                  <div
                    key={bp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{bp.displayName}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                        @{bp.handle}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
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
    </div>
  );
}

