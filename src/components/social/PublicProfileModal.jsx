import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  Check,
  Send,
  Split,
  ShieldCheck,
  Lock,
  Flag,
  Ban,
  Bookmark,
  Compass,
  Users,
  MapPin,
  GraduationCap,
  Calendar,
  Award,
  Store,
  CheckCircle2,
  MessageSquare,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocialWallet, getStoredPitchSpots } from '../../context/SocialWalletContext';
import { useToast } from '../../context/ToastContext';
import {
  getFollowersProfiles,
  getFollowingProfiles,
  getFriendsList,
  getMutualFriends,
  fetchPublicProfileFromFirestore
} from '../../services/socialService';
import { getUserPresenceForViewer } from '../../services/messengerService';
import {
  generateInitialCommunityThreads,
  migrateExistingMakanMurahPosts
} from '../../services/communityService';
import { getAvatarSvg } from '../Avatars';
import UserAvatar from '../UserAvatar';
import ConfirmModal from '../ConfirmModal';
import { SPOT_CATEGORIES, PROFILE_ACHIEVEMENTS } from '../../config/appConstants';

export default function PublicProfileModal() {
  const { user } = useAuth();
  const toast = useToast();
  const {
    selectedPublicProfileId,
    setSelectedPublicProfileId,
    socialGraphVersion = 0,
    getPublicProfile,
    getPublicProfileForViewer,
    getFriendshipStatus,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    isFollowing,
    follow,
    unfollow,
    savedSpotIds,
    blockedUserIds,
    block,
    unblock,
    report,
    startSendMoneyToUser,
    openChatWithFriend
  } = useSocialWallet();

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'friends' | 'saved' | 'followers' | 'following'
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or fake student account');
  const [reportDone, setReportDone] = useState(false);
  const [actionStatus, setActionStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'remove' | 'block' | null

  React.useEffect(() => {
    let isSubscribed = true;
    if (selectedPublicProfileId) {
      const cached = getPublicProfileForViewer
        ? getPublicProfileForViewer(selectedPublicProfileId)
        : getPublicProfile(selectedPublicProfileId);
      if (cached) {
        setRemoteProfile(cached);
      } else {
        fetchPublicProfileFromFirestore(selectedPublicProfileId).then((res) => {
          if (isSubscribed && res) {
            const tailored = getPublicProfileForViewer
              ? getPublicProfileForViewer(res.id)
              : res;
            setRemoteProfile(tailored);
          }
        });
      }
    } else {
      setRemoteProfile(null);
      setConfirmAction(null);
    }
    return () => {
      isSubscribed = false;
    };
  }, [selectedPublicProfileId, getPublicProfile, getPublicProfileForViewer, socialGraphVersion]);

  const rawProfile = useMemo(() => {
    if (!selectedPublicProfileId) return null;
    return getPublicProfileForViewer
      ? getPublicProfileForViewer(selectedPublicProfileId)
      : getPublicProfile(selectedPublicProfileId);
  }, [selectedPublicProfileId, getPublicProfile, getPublicProfileForViewer, socialGraphVersion]);

  const profile = rawProfile || remoteProfile;

  const allSpots = useMemo(() => {
    if (!profile) return [];
    let localThreads = [];
    try {
      const raw = localStorage.getItem('kampuskash_community_threads_v1');
      localThreads = raw
        ? migrateExistingMakanMurahPosts(JSON.parse(raw))
        : generateInitialCommunityThreads();
    } catch {
      localThreads = generateInitialCommunityThreads();
    }
    const pitchSpots = getStoredPitchSpots();
    const map = new Map();
    pitchSpots.forEach((s) => map.set(s.id, s));
    localThreads.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [profile]);

  const userPosts = useMemo(() => {
    if (!profile || profile.isRestrictedView || profile.isBlockedView) return [];
    return allSpots.filter(
      (s) =>
        s.authorId === profile.id ||
        (s.authorHandle && s.authorHandle.toLowerCase() === (profile.handle || '').toLowerCase()) ||
        (s.authorName && s.authorName.toLowerCase() === (profile.displayName || '').toLowerCase())
    );
  }, [allSpots, profile]);

  const ownerSavedSpots = useMemo(() => {
    if (!profile || !user || profile.id !== user.id) return [];
    const savedSet = new Set(savedSpotIds || []);
    return allSpots.filter((s) => savedSet.has(s.id));
  }, [allSpots, profile, user, savedSpotIds]);

  const profileFriends = useMemo(
    () =>
      profile && !profile.isRestrictedView && !profile.isBlockedView
        ? getFriendsList(profile.id)
        : [],
    [profile, socialGraphVersion]
  );

  const mutualFriends = useMemo(
    () =>
      profile && user && user.id !== profile.id
        ? getMutualFriends(user.id, profile.id)
        : [],
    [profile, user, socialGraphVersion]
  );

  const followersList = useMemo(
    () =>
      profile && !profile.isRestrictedView && !profile.isBlockedView
        ? getFollowersProfiles(profile.id)
        : [],
    [profile, socialGraphVersion]
  );

  const followingList = useMemo(
    () =>
      profile && !profile.isRestrictedView && !profile.isBlockedView
        ? getFollowingProfiles(profile.id)
        : [],
    [profile, socialGraphVersion]
  );

  if (!selectedPublicProfileId || !profile) return null;

  const isOwnProfile = Boolean(user && user.id === profile.id);
  const following = isFollowing(profile.id);
  const isBlocked = blockedUserIds.includes(profile.id) || Boolean(profile.isBlockedView);
  const relStatus = getFriendshipStatus
    ? getFriendshipStatus(profile.id)
    : { status: 'none', canSendRequest: true };
  const presence = getUserPresenceForViewer(profile.id, user?.id);
  const isOnline = presence.state === 'online';

  const joinedLabel = (() => {
    try {
      const dt = new Date(profile.joinedAt || '2026-01-15T08:00:00.000Z');
      if (isNaN(dt.getTime())) return 'Joined 2026';
      return `Joined ${dt.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Joined 2026';
    }
  })();

  const resolvedAchievements = (Array.isArray(profile.achievements) ? profile.achievements : [])
    .map((id) => PROFILE_ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean);

  const showTimedFeedback = (msg, type = 'success') => {
    setActionStatus(msg);
    if (toast) {
      if (type === 'error' && toast.showError) toast.showError(msg);
      else if (type === 'info' && toast.showInfo) toast.showInfo(msg);
      else if (toast.showSuccess) toast.showSuccess(msg);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleFriendAction = async (actionType) => {
    setIsBusy(true);
    try {
      if (actionType === 'send') {
        await sendFriendRequest(profile.id);
        showTimedFeedback(`Friend request sent to @${profile.handle}!`);
      } else if (actionType === 'cancel') {
        await cancelFriendRequest(relStatus.requestId || profile.id);
        showTimedFeedback(`Cancelled friend request to @${profile.handle}.`, 'info');
      } else if (actionType === 'accept') {
        await acceptFriendRequest(relStatus.requestId || profile.id);
        showTimedFeedback(`You and @${profile.handle} are now friends!`);
      } else if (actionType === 'reject') {
        await rejectFriendRequest(relStatus.requestId || profile.id);
        showTimedFeedback(`Declined friend request from @${profile.handle}.`, 'info');
      } else if (actionType === 'remove') {
        await removeFriend(profile.id);
        showTimedFeedback(`Removed @${profile.handle} from friends.`, 'info');
      }
    } catch (err) {
      showTimedFeedback(err?.message || 'Could not complete friend action', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (following) {
        await unfollow(profile.id);
        showTimedFeedback(`Unfollowed @${profile.handle}`, 'info');
      } else {
        await follow(profile.id);
        showTimedFeedback(`Following @${profile.handle}`);
      }
    } catch (err) {
      showTimedFeedback(err?.message || 'Action failed', 'error');
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (blockedUserIds.includes(profile.id)) {
        await unblock(profile.id);
        showTimedFeedback(`Unblocked @${profile.handle}`);
      } else {
        setConfirmAction('block');
      }
    } catch (err) {
      showTimedFeedback(err?.message || 'Could not update block status', 'error');
    }
  };

  const handleConfirmDestructive = async () => {
    const mode = confirmAction;
    setConfirmAction(null);
    if (mode === 'remove') {
      await handleFriendAction('remove');
    } else if (mode === 'block') {
      try {
        await block(profile.id);
        showTimedFeedback(`Blocked @${profile.handle}`, 'info');
      } catch (err) {
        showTimedFeedback(err?.message || 'Could not block user', 'error');
      }
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    await report({
      targetUserId: profile.id,
      reason: reportReason
    });
    setReportDone(true);
    if (toast?.showSuccess) {
      toast.showSuccess('Report submitted to KampusKash safety team.');
    }
    setTimeout(() => {
      setReportDone(false);
      setShowReportBox(false);
    }, 1800);
  };

  const modalContent = (
    <div
      className="community-modal-backdrop"
      onClick={() => setSelectedPublicProfileId(null)}
    >
      <div
        className="community-modal-content public-profile-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${profile.displayName} public profile`}
      >
        {/* Header Banner */}
        <div
          className="community-modal-header"
          style={{
            background:
              'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(6, 182, 212, 0.14) 60%, rgba(16, 185, 129, 0.1) 100%)',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div
            className="spot-detail-header-badges"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
          >
            <span className="modal-badge">
              <Users size={13} />
              KampusKash Connect Profile
            </span>
            {relStatus.status === 'friends' && (
              <span
                className="modal-badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.35)'
                }}
              >
                <UserCheck size={12} />
                Friends
              </span>
            )}
            {!presence.onlineHidden && (
              <span
                className="modal-badge"
                style={{
                  background: isOnline ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.06)',
                  color: isOnline ? 'var(--success)' : 'var(--text-muted)'
                }}
              >
                ● {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
            {profile.privacySettings?.profileVisibility === 'friends' ? (
              <span className="modal-badge">
                <Lock size={12} />
                Friends-Only
              </span>
            ) : (
              <span className="modal-badge">
                <Globe size={12} />
                Public
              </span>
            )}
          </div>
          <button
            type="button"
            className="community-modal-close"
            onClick={() => setSelectedPublicProfileId(null)}
            aria-label="Close profile"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Identity Card */}
        <div className="public-profile-hero">
          <div className="public-profile-top">
            <div className="public-profile-avatar-lg" style={{ position: 'relative' }}>
              {profile.avatarId?.startsWith('preset-') ||
              profile.avatarId?.startsWith('data:') ||
              profile.avatarId?.startsWith('http') ? (
                <UserAvatar avatar={profile.avatarId} name={profile.displayName} size={68} />
              ) : (
                getAvatarSvg(profile.avatarId || 'cat')
              )}
              {!presence.onlineHidden && (
                <span
                  className={`kk-connect-online-dot ${isOnline ? 'online' : 'offline'}`}
                  title={isOnline ? 'Online now' : 'Offline'}
                />
              )}
            </div>

            <div className="public-profile-identity">
              <h2 className="public-profile-name">{profile.displayName}</h2>
              <div className="public-profile-handle">@{profile.handle}</div>
              <div className="public-profile-uni">
                <MapPin size={13} />
                <span>{profile.university || 'Malaysia Campus'}</span>
              </div>
              {!profile.isRestrictedView && !profile.isBlockedView && profile.course && (
                <div className="public-profile-uni" style={{ marginTop: '0.15rem' }}>
                  <GraduationCap size={13} />
                  <span>{profile.course}</span>
                </div>
              )}
              <div className="public-profile-uni" style={{ marginTop: '0.15rem', opacity: 0.8 }}>
                <Calendar size={12} />
                <span>{joinedLabel}</span>
              </div>
            </div>
          </div>

          {!profile.isRestrictedView && !profile.isBlockedView && profile.bio && (
            <p className="public-profile-bio">&ldquo;{profile.bio}&rdquo;</p>
          )}

          {/* Achievements Row */}
          {!profile.isRestrictedView && !profile.isBlockedView && resolvedAchievements.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                marginTop: '0.5rem',
                marginBottom: '0.5rem'
              }}
            >
              {resolvedAchievements.map((ach) => (
                <span
                  key={ach.id}
                  className="kk-student-tag mutual"
                  title={ach.description}
                >
                  <Award size={12} />
                  <span>{ach.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Mutual Friends Indicator */}
          {!isOwnProfile && !profile.isBlockedView && mutualFriends.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.8rem',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.28)',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                marginTop: '0.35rem',
                marginBottom: '0.35rem'
              }}
            >
              <Users size={14} color="var(--accent-primary)" />
              <span>
                <strong>
                  {mutualFriends.length} mutual friend{mutualFriends.length === 1 ? '' : 's'}:
                </strong>{' '}
                {mutualFriends
                  .slice(0, 3)
                  .map((m) => `@${m.handle}`)
                  .join(', ')}
                {mutualFriends.length > 3 ? ` +${mutualFriends.length - 3} more` : ''}
              </span>
            </div>
          )}

          {/* Stats Row */}
          <div
            className="public-profile-stats-row"
            style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
          >
            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <strong>{profile.friendsCount || profileFriends.length || 0}</strong>
              <span>Friends</span>
            </button>
            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              <strong>{userPosts.length}</strong>
              <span>Spots</span>
            </button>
            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'followers' ? 'active' : ''}`}
              onClick={() => setActiveTab('followers')}
            >
              <strong>{followersList.length}</strong>
              <span>Followers</span>
            </button>
            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              <strong>{followingList.length}</strong>
              <span>Following</span>
            </button>
          </div>

          {actionStatus && <div className="profile-action-feedback">{actionStatus}</div>}

          {/* Relationship & Action Buttons for Other Users */}
          {!isOwnProfile && (
            <div className="public-profile-actions-bar" style={{ flexWrap: 'wrap', gap: '8px' }}>
              {relStatus.status === 'none' && (
                <button
                  type="button"
                  className="kk-btn kk-btn-primary"
                  onClick={() => handleFriendAction('send')}
                  disabled={isBusy || isBlocked || !relStatus.canSendRequest}
                  title={
                    !relStatus.canSendRequest
                      ? 'This user restricts incoming friend requests'
                      : 'Send Friend Request'
                  }
                >
                  <UserPlus size={15} />
                  <span>
                    {isBusy
                      ? 'Sending...'
                      : relStatus.canSendRequest
                      ? 'Add Friend'
                      : 'Requests Restricted'}
                  </span>
                </button>
              )}

              {relStatus.status === 'outgoing_pending' && (
                <>
                  <span className="kk-btn kk-btn-sent">
                    <Clock size={14} />
                    <span>Request Sent</span>
                  </span>
                  <button
                    type="button"
                    className="kk-btn kk-btn-ghost"
                    disabled={isBusy}
                    onClick={() => handleFriendAction('cancel')}
                  >
                    <X size={14} />
                    <span>Cancel Request</span>
                  </button>
                </>
              )}

              {relStatus.status === 'incoming_pending' && (
                <>
                  <button
                    type="button"
                    className="kk-btn kk-btn-accept"
                    disabled={isBusy}
                    onClick={() => handleFriendAction('accept')}
                  >
                    <Check size={15} />
                    <span>Accept Request</span>
                  </button>
                  <button
                    type="button"
                    className="kk-btn kk-btn-ghost"
                    disabled={isBusy}
                    onClick={() => handleFriendAction('reject')}
                  >
                    <X size={14} />
                    <span>Decline</span>
                  </button>
                </>
              )}

              {relStatus.status === 'friends' && (
                <>
                  <button
                    type="button"
                    className="kk-btn kk-btn-primary"
                    onClick={() => {
                      setSelectedPublicProfileId(null);
                      if (openChatWithFriend) openChatWithFriend(profile.id);
                    }}
                    title="Open Real-Time Chat"
                  >
                    <MessageSquare size={15} />
                    <span>Message</span>
                  </button>
                  <span className="kk-btn kk-btn-friends">
                    <UserCheck size={15} />
                    <span>Friends</span>
                  </span>
                  <button
                    type="button"
                    className="kk-btn kk-btn-danger-ghost"
                    disabled={isBusy}
                    onClick={() => setConfirmAction('remove')}
                    title="Remove Friend"
                  >
                    <UserMinus size={14} />
                    <span>Remove Friend</span>
                  </button>
                </>
              )}

              {/* Secondary Follow Button for Spot Jimat Feed */}
              <button
                type="button"
                className="kk-btn kk-btn-ghost"
                onClick={handleFollowToggle}
                disabled={isBlocked}
              >
                {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                <span>{following ? 'Following' : 'Follow'}</span>
              </button>

              <button
                type="button"
                className="kk-btn kk-btn-ghost"
                onClick={() => startSendMoneyToUser(profile, { mode: 'send' })}
                disabled={isBlocked}
                title="Send demo credit via KampusKash Wallet"
              >
                <Send size={14} />
                <span>Send Demo RM</span>
              </button>

              <button
                type="button"
                className="kk-btn kk-btn-ghost"
                onClick={() => startSendMoneyToUser(profile, { mode: 'split' })}
                disabled={isBlocked}
                title="Request half of a bill from this friend"
              >
                <Split size={14} />
                <span>Split Bill</span>
              </button>

              <button
                type="button"
                className="spot-owner-icon-btn"
                onClick={() => setShowReportBox((prev) => !prev)}
                title="Report user"
                aria-label="Report user"
              >
                <Flag size={15} />
              </button>

              <button
                type="button"
                className="spot-owner-icon-btn danger"
                onClick={handleBlockToggle}
                title={blockedUserIds.includes(profile.id) ? 'Unblock user' : 'Block user'}
                aria-label={blockedUserIds.includes(profile.id) ? 'Unblock user' : 'Block user'}
              >
                <Ban size={15} />
              </button>
            </div>
          )}

          {showReportBox && (
            <div className="community-report-panel">
              {reportDone ? (
                <div className="report-success-msg">
                  <CheckCircle2 size={16} />
                  <span>Report submitted. Thank you for keeping KampusKash safe.</span>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="report-form-inline">
                  <label>Report @{profile.handle}</label>
                  <div className="report-controls">
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    >
                      <option value="Spam or fake student account">
                        Spam or fake student account
                      </option>
                      <option value="Harassment or abusive comments">
                        Harassment or abusive comments
                      </option>
                      <option value="Scam or misleading payment request">
                        Scam or misleading payment request
                      </option>
                    </select>
                    <button type="submit" className="kk-btn kk-btn-primary">
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Restricted or Blocked Notice */}
        {profile.isBlockedView ? (
          <div className="public-profile-tab-body">
            <div
              className="replies-empty"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Ban size={24} color="var(--danger)" />
              <strong>Interaction Restricted</strong>
              <span>
                {profile.blockedByViewer
                  ? `You have blocked @${profile.handle}. Unblock them if you wish to view their profile.`
                  : 'This profile is currently unavailable.'}
              </span>
            </div>
          </div>
        ) : profile.isRestrictedView ? (
          <div className="public-profile-tab-body">
            <div
              className="replies-empty"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Lock size={24} color="var(--accent-primary)" />
              <strong>Friends-Only Profile</strong>
              <span>
                @{profile.handle} shares their full bio, programme, friends list, and campus spots only with confirmed friends.
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Tabs */}
            <div className="public-profile-tabs">
              <button
                type="button"
                className={`public-profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                <Compass size={15} />
                <span>Spots ({userPosts.length})</span>
              </button>

              <button
                type="button"
                className={`public-profile-tab ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                <Users size={15} />
                <span>Friends ({profileFriends.length})</span>
              </button>

              {/* Saved Tab is strictly visible ONLY to the owner */}
              {isOwnProfile && (
                <button
                  type="button"
                  className={`public-profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
                  onClick={() => setActiveTab('saved')}
                >
                  <Bookmark size={15} />
                  <span>Saved ({ownerSavedSpots.length})</span>
                  <Lock size={12} title="Only visible to you" />
                </button>
              )}

              <button
                type="button"
                className={`public-profile-tab ${activeTab === 'followers' ? 'active' : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                <Users size={15} />
                <span>Followers ({followersList.length})</span>
              </button>

              <button
                type="button"
                className={`public-profile-tab ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => setActiveTab('following')}
              >
                <Users size={15} />
                <span>Following ({followingList.length})</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="public-profile-tab-body">
              {activeTab === 'posts' &&
                (userPosts.length === 0 ? (
                  <div className="replies-empty">
                    @{profile.handle} hasn&apos;t posted any spots yet.
                  </div>
                ) : (
                  <div className="profile-spots-mini-list">
                    {userPosts.map((spot) => {
                      const cat =
                        SPOT_CATEGORIES.find((c) => c.id === spot.category) ||
                        SPOT_CATEGORIES[0];
                      return (
                        <div key={spot.id} className="profile-spot-mini-card">
                          <div>
                            <span className="spot-category-badge inline">{cat.label}</span>
                            <h4>{spot.title}</h4>
                            <div className="profile-spot-meta">
                              <Store size={12} /> {spot.placeName || spot.stallName} •{' '}
                              {spot.campusArea}
                            </div>
                          </div>
                          <div className="community-price-badge">
                            <span className="price-value">
                              {spot.priceRange || `RM${Number(spot.priceRM || 0).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

              {activeTab === 'friends' &&
                (profileFriends.length === 0 ? (
                  <div className="replies-empty">No friends connected yet.</div>
                ) : (
                  <div className="profile-people-list">
                    {profileFriends.map((person) => (
                      <div key={person.id} className="profile-person-row">
                        <button
                          type="button"
                          className="profile-person-info"
                          onClick={() => {
                            setActiveTab('posts');
                            setSelectedPublicProfileId(person.id);
                          }}
                        >
                          <div className="community-author-avatar">
                            {getAvatarSvg(person.avatarId || 'cat')}
                          </div>
                          <div>
                            <strong>{person.displayName}</strong>
                            <div className="person-handle">
                              @{person.handle} • {person.university}
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

              {activeTab === 'saved' && isOwnProfile && (
                <div>
                  <div className="profile-private-saved-note">
                    <Lock size={14} />
                    <span>
                      Only visible to you — your saved bookmarks never appear to other users.
                    </span>
                  </div>
                  {ownerSavedSpots.length === 0 ? (
                    <div className="replies-empty">You haven&apos;t bookmarked any spots yet.</div>
                  ) : (
                    <div className="profile-spots-mini-list">
                      {ownerSavedSpots.map((spot) => (
                        <div key={spot.id} className="profile-spot-mini-card">
                          <div>
                            <h4>{spot.title}</h4>
                            <div className="profile-spot-meta">
                              <Store size={12} /> {spot.placeName || spot.stallName} •{' '}
                              {spot.campusArea}
                            </div>
                          </div>
                          <div className="community-price-badge">
                            <span className="price-value">
                              {spot.priceRange || `RM${Number(spot.priceRM || 0).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'followers' &&
                (followersList.length === 0 ? (
                  <div className="replies-empty">No followers yet.</div>
                ) : (
                  <div className="profile-people-list">
                    {followersList.map((person) => (
                      <div key={person.id} className="profile-person-row">
                        <button
                          type="button"
                          className="profile-person-info"
                          onClick={() => {
                            setActiveTab('posts');
                            setSelectedPublicProfileId(person.id);
                          }}
                        >
                          <div className="community-author-avatar">
                            {getAvatarSvg(person.avatarId || 'cat')}
                          </div>
                          <div>
                            <strong>{person.displayName}</strong>
                            <div className="person-handle">
                              @{person.handle} • {person.university}
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

              {activeTab === 'following' &&
                (followingList.length === 0 ? (
                  <div className="replies-empty">Not following anyone yet.</div>
                ) : (
                  <div className="profile-people-list">
                    {followingList.map((person) => (
                      <div key={person.id} className="profile-person-row">
                        <button
                          type="button"
                          className="profile-person-info"
                          onClick={() => {
                            setActiveTab('posts');
                            setSelectedPublicProfileId(person.id);
                          }}
                        >
                          <div className="community-author-avatar">
                            {getAvatarSvg(person.avatarId || 'cat')}
                          </div>
                          <div>
                            <strong>{person.displayName}</strong>
                            <div className="person-handle">
                              @{person.handle} • {person.university}
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </>
        )}

        {/* Financial Privacy Guarantee Footer */}
        <div className="public-profile-privacy-footer">
          <ShieldCheck size={15} />
          <span>
            <strong>Financial Privacy Guarantee:</strong> Balances, budgets, tracker transactions,
            and wallet history are strictly private and never appear on public profiles.
          </span>
        </div>
      </div>

      {/* Confirmation Dialog for Remove Friend / Block User */}
      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction === 'block'
            ? `Block @${profile.handle}?`
            : `Remove @${profile.handle} from friends?`
        }
        message={
          confirmAction === 'block'
            ? `Blocking ${profile.displayName} will remove any existing friendship, cancel pending friend requests, and prevent them from interacting with you.`
            : `Are you sure you want to remove ${profile.displayName} (@${profile.handle}) from your KampusKash friends list?`
        }
        confirmText={confirmAction === 'block' ? 'Block User' : 'Remove Friend'}
        cancelText="Cancel"
        isDestructive
        onConfirm={handleConfirmDestructive}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
