import React, { useState, useMemo } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
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
  Store,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocialWallet, getStoredPitchSpots } from '../../context/SocialWalletContext';
import {
  getFollowersProfiles,
  getFollowingProfiles,
  fetchPublicProfileFromFirestore
} from '../../services/socialService';
import {
  generateInitialCommunityThreads,
  migrateExistingMakanMurahPosts
} from '../../services/communityService';
import { getAvatarSvg } from '../Avatars';
import { SPOT_CATEGORIES } from '../../config/appConstants';

export default function PublicProfileModal() {
  const { user } = useAuth();
  const {
    selectedPublicProfileId,
    setSelectedPublicProfileId,
    getPublicProfile,
    isFollowing,
    follow,
    unfollow,
    savedSpotIds,
    blockedUserIds,
    block,
    unblock,
    report,
    startSendMoneyToUser
  } = useSocialWallet();

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'saved' | 'followers' | 'following'
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or fake student account');
  const [reportDone, setReportDone] = useState(false);
  const [actionStatus, setActionStatus] = useState('');
  const [remoteProfile, setRemoteProfile] = useState(null);

  React.useEffect(() => {
    let isSubscribed = true;
    if (selectedPublicProfileId) {
      const cached = getPublicProfile(selectedPublicProfileId);
      if (cached) {
        setRemoteProfile(cached);
      } else {
        fetchPublicProfileFromFirestore(selectedPublicProfileId).then((res) => {
          if (isSubscribed && res) setRemoteProfile(res);
        });
      }
    } else {
      setRemoteProfile(null);
    }
    return () => { isSubscribed = false; };
  }, [selectedPublicProfileId, getPublicProfile]);

  const profile = remoteProfile || (selectedPublicProfileId ? getPublicProfile(selectedPublicProfileId) : null);

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
    if (!profile) return [];
    return allSpots.filter(
      (s) =>
        s.authorId === profile.id ||
        (s.authorHandle && s.authorHandle.toLowerCase() === profile.handle.toLowerCase()) ||
        (s.authorName && s.authorName.toLowerCase() === profile.displayName.toLowerCase())
    );
  }, [allSpots, profile]);

  const ownerSavedSpots = useMemo(() => {
    if (!profile || !user || profile.id !== user.id) return [];
    const savedSet = new Set(savedSpotIds || []);
    return allSpots.filter((s) => savedSet.has(s.id));
  }, [allSpots, profile, user, savedSpotIds]);

  const followersList = useMemo(
    () => (profile ? getFollowersProfiles(profile.id) : []),
    [profile]
  );

  const followingList = useMemo(
    () => (profile ? getFollowingProfiles(profile.id) : []),
    [profile]
  );

  if (!selectedPublicProfileId || !profile) return null;

  const isOwnProfile = Boolean(user && user.id === profile.id);
  const following = isFollowing(profile.id);
  const isBlocked = blockedUserIds.includes(profile.id);

  const handleFollowToggle = async () => {
    try {
      if (following) {
        await unfollow(profile.id);
        setActionStatus(`Unfollowed @${profile.handle}`);
      } else {
        await follow(profile.id);
        setActionStatus(`Following @${profile.handle}`);
      }
      setTimeout(() => setActionStatus(''), 2500);
    } catch (err) {
      setActionStatus(err?.message || 'Action failed');
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (isBlocked) {
        await unblock(profile.id);
        setActionStatus(`Unblocked @${profile.handle}`);
      } else {
        await block(profile.id);
        setActionStatus(`Blocked @${profile.handle}`);
      }
      setTimeout(() => setActionStatus(''), 2500);
    } catch (err) {
      setActionStatus(err?.message || 'Could not update block status');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    await report({
      targetUserId: profile.id,
      reason: reportReason
    });
    setReportDone(true);
    setTimeout(() => {
      setReportDone(false);
      setShowReportBox(false);
    }, 1800);
  };

  return (
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
        {/* Header */}
        <div className="community-modal-header">
          <div className="spot-detail-header-badges">
            <span className="modal-badge">
              <Users size={13} />
              Campus Student Profile
            </span>
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
            <div className="public-profile-avatar-lg">
              {getAvatarSvg(profile.avatarId || 'cat')}
            </div>

            <div className="public-profile-identity">
              <h2 className="public-profile-name">{profile.displayName}</h2>
              <div className="public-profile-handle">@{profile.handle}</div>
              <div className="public-profile-uni">
                <MapPin size={13} />
                <span>{profile.university || 'Malaysia Campus'}</span>
              </div>
            </div>
          </div>

          {profile.bio && <p className="public-profile-bio">{profile.bio}</p>}

          {/* Stats Row */}
          <div className="public-profile-stats-row">
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

          {actionStatus && (
            <div className="profile-action-feedback">{actionStatus}</div>
          )}

          {/* Action Buttons for Other Users (Follow, Send Money, Split with a Friend, Block, Report) */}
          {!isOwnProfile && (
            <div className="public-profile-actions-bar">
              <button
                type="button"
                className={`btn ${following ? 'btn-outline' : 'btn-primary'} profile-follow-btn`}
                onClick={handleFollowToggle}
                disabled={isBlocked}
              >
                {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                <span>{following ? 'Following' : 'Follow'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary profile-wallet-btn"
                onClick={() => startSendMoneyToUser(profile, { mode: 'send' })}
                disabled={isBlocked}
                title="Send demo credit via KampusKash Wallet"
              >
                <Send size={15} />
                <span>Send Money</span>
              </button>

              <button
                type="button"
                className="btn btn-outline profile-wallet-btn"
                onClick={() => startSendMoneyToUser(profile, { mode: 'split' })}
                disabled={isBlocked}
                title="Request half of a bill from this friend"
              >
                <Split size={15} />
                <span>Split with a Friend</span>
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
                title={isBlocked ? 'Unblock user' : 'Block user'}
                aria-label={isBlocked ? 'Unblock user' : 'Block user'}
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
                      <option value="Spam or fake student account">Spam or fake student account</option>
                      <option value="Harassment or abusive comments">Harassment or abusive comments</option>
                      <option value="Scam or misleading payment request">Scam or misleading payment request</option>
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

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
          {activeTab === 'posts' && (
            userPosts.length === 0 ? (
              <div className="replies-empty">
                @{profile.handle} hasn&apos;t posted any spots yet.
              </div>
            ) : (
              <div className="profile-spots-mini-list">
                {userPosts.map((spot) => {
                  const cat = SPOT_CATEGORIES.find((c) => c.id === spot.category) || SPOT_CATEGORIES[0];
                  return (
                    <div key={spot.id} className="profile-spot-mini-card">
                      <div>
                        <span className="spot-category-badge inline">{cat.label}</span>
                        <h4>{spot.title}</h4>
                        <div className="profile-spot-meta">
                          <Store size={12} /> {spot.placeName || spot.stallName} • {spot.campusArea}
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
            )
          )}

          {activeTab === 'saved' && isOwnProfile && (
            <div>
              <div className="profile-private-saved-note">
                <Lock size={14} />
                <span>Only visible to you — your saved bookmarks never appear to other users.</span>
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
                          <Store size={12} /> {spot.placeName || spot.stallName} • {spot.campusArea}
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

          {activeTab === 'followers' && (
            followersList.length === 0 ? (
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
                        <div className="person-handle">@{person.handle} • {person.university}</div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'following' && (
            followingList.length === 0 ? (
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
                        <div className="person-handle">@{person.handle} • {person.university}</div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Financial Privacy Guarantee Footer */}
        <div className="public-profile-privacy-footer">
          <ShieldCheck size={15} />
          <span>
            <strong>Financial Privacy Guarantee:</strong> Balances, budgets, tracker transactions,
            and wallet history are strictly private and never appear on public profiles.
          </span>
        </div>
      </div>
    </div>
  );
}

