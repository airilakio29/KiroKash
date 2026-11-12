import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  UserMinus,
  LogOut,
  Split,
  HandCoins,
  Bell,
  Target,
  Trophy,
  Award,
  Sparkles,
  Globe,
  Flag,
  Trash2,
  ThumbsUp,
  Send,
  CheckCircle2,
  EyeOff,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocialWallet } from '../../context/SocialWalletContext';
import {
  SAVINGS_CHALLENGE_DISCLAIMER,
  COMMUNITY_GUIDELINES,
  PROFILE_ACHIEVEMENTS
} from '../../config/appConstants';
import { DEMO_WALLET_BANNER_TEXT } from '../../services/demoWalletService';
import {
  createConnectGroup,
  getUserGroups,
  getUserGroupInvitations,
  respondToGroupInvitation,
  inviteFriendToGroup,
  removeGroupMember,
  leaveConnectGroup,
  createGroupDemoSplitBill,
  payGroupDemoSplitShare,
  createGroupDemoPaymentRequest,
  sendGroupPaymentReminder,
  getGroupSplitBills,
  createGroupSavingsChallenge,
  updateSavingsChallengeProgress,
  getUserSavingsChallenges,
  ensureUserGamificationRecord,
  setLeaderboardOptIn,
  getConnectLeaderboard,
  discoverCommunities,
  createStudentCommunity,
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
  getCommunityPosts,
  toggleCommunityPostReaction,
  addCommunityComment,
  getCommunityComments,
  reportCommunityContent,
  moderateCommunityContent
} from '../../services/communityGroupService';

export default function Phase4GroupsChallengesCommunitiesPanel({
  activeTab = 'groups', // 'groups' | 'challenges' | 'communities'
  onOpenConversationInMessenger
}) {
  const { user } = useAuth();
  const {
    friendsList = [],
    demoP2PWallet,
    refreshSocialAndWalletState
  } = useSocialWallet() || {};

  const userId = user?.id;

  const [banner, setBanner] = useState(null);
  const showNotice = useCallback((text, type = 'success') => {
    setBanner({ text, type });
    setTimeout(() => {
      setBanner((prev) => (prev?.text === text ? null : prev));
    }, 3600);
  }, []);

  // =========================================================================
  // 1 & 2. GROUPS & GROUP DEMO WALLET STATE
  // =========================================================================
  const [groups, setGroups] = useState([]);
  const [groupInvites, setGroupInvites] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupSplitBills, setGroupSplitBills] = useState([]);

  // Create Group Form
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupAvatar, setNewGroupAvatar] = useState('cat');
  const [newGroupFriendIds, setNewGroupFriendIds] = useState([]);

  // Group Split Bill / Request Modal
  const [groupWalletModal, setGroupWalletModal] = useState(null); // null | 'split' | 'request'
  const [splitTitle, setSplitTitle] = useState('Group Dinner');
  const [splitTotal, setSplitTotal] = useState('100');
  const [splitMode, setSplitMode] = useState('equal');
  const [reqAmountPerMember, setReqAmountPerMember] = useState('20');
  const [reqNote, setReqNote] = useState('');
  const [confirmPayBillId, setConfirmPayBillId] = useState(null);

  // =========================================================================
  // 3 & 4. SAVINGS CHALLENGES, LEADERBOARDS & ACHIEVEMENTS STATE
  // =========================================================================
  const [challenges, setChallenges] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [leaderboardCategory, setLeaderboardCategory] = useState('challenge_progress');
  const [leaderboardRows, setLeaderboardRows] = useState([]);

  // Create Savings Challenge Modal
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [chalTitle, setChalTitle] = useState('30-Day RM1,000 Collective Savings');
  const [chalTarget, setChalTarget] = useState('1000');
  const [chalDays, setChalDays] = useState('30');
  const [chalFriendIds, setChalFriendIds] = useState([]);

  // Update Declared Progress Modal
  const [progressModalChal, setProgressModalChal] = useState(null);
  const [declaredAddAmount, setDeclaredAddAmount] = useState('50');
  const [declaredNote, setDeclaredNote] = useState('');

  // =========================================================================
  // 5 & 6. STUDENT COMMUNITIES & MODERATION STATE
  // =========================================================================
  const [communitySearch, setCommunitySearch] = useState('');
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('comm_utp_students');
  const [communityPostsState, setCommunityPostsState] = useState({ posts: [], hasMore: false, page: 1 });
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTag, setNewPostTag] = useState('Discussion');
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [postCommentsMap, setPostCommentsMap] = useState({});
  const [commentDraft, setCommentDraft] = useState('');
  const [createCommOpen, setCreateCommOpen] = useState(false);
  const [newCommName, setNewCommName] = useState('');
  const [newCommCategory, setNewCommCategory] = useState('Campus');
  const [newCommDesc, setNewCommDesc] = useState('');

  const refreshPhase4Data = useCallback(() => {
    if (!userId) return;
    try {
      const userGrps = getUserGroups(userId);
      setGroups(userGrps);
      setGroupInvites(getUserGroupInvitations(userId));
      const activeGid = selectedGroupId || userGrps[0]?.id || null;
      if (activeGid && userGrps.some((g) => g.id === activeGid)) {
        setSelectedGroupId(activeGid);
        setGroupSplitBills(getGroupSplitBills(activeGid, userId));
      } else {
        setSelectedGroupId(userGrps[0]?.id || null);
        setGroupSplitBills(userGrps[0] ? getGroupSplitBills(userGrps[0].id, userId) : []);
      }

      setChallenges(getUserSavingsChallenges(userId));
      setGamification(ensureUserGamificationRecord(userId));
      setLeaderboardRows(
        getConnectLeaderboard({
          category: leaderboardCategory,
          viewerId: userId,
          candidateUserIds: [userId, ...friendsList.map((f) => f.id)]
        })
      );

      const comms = discoverCommunities({ searchQuery: communitySearch, viewerId: userId });
      setCommunities(comms);
      if (selectedCommunityId) {
        setCommunityPostsState(getCommunityPosts(selectedCommunityId, { viewerId: userId, page: 1, pageSize: 10 }));
      }
    } catch {
      // ignore
    }
  }, [userId, selectedGroupId, leaderboardCategory, friendsList, communitySearch, selectedCommunityId]);

  useEffect(() => {
    refreshPhase4Data();
  }, [refreshPhase4Data]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;
  const selectedCommunity = communities.find((c) => c.id === selectedCommunityId) || communities[0] || null;

  // --- GROUP HANDLERS ---
  const handleCreateGroup = (e) => {
    e.preventDefault();
    try {
      const grp = createConnectGroup({
        authenticatedUid: userId,
        creatorId: userId,
        name: newGroupName,
        description: newGroupDesc,
        avatarUrl: newGroupAvatar,
        memberIds: newGroupFriendIds
      });
      setCreateGroupModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupFriendIds([]);
      setSelectedGroupId(grp.id);
      refreshPhase4Data();
      if (refreshSocialAndWalletState) refreshSocialAndWalletState(user);
      showNotice(`Created group "${grp.name}"!`);
    } catch (err) {
      showNotice(err.message || 'Could not create group.', 'error');
    }
  };

  const handleRespondGroupInvite = (inviteId, action) => {
    try {
      respondToGroupInvitation({
        authenticatedUid: userId,
        userId,
        inviteId,
        action
      });
      refreshPhase4Data();
      if (refreshSocialAndWalletState) refreshSocialAndWalletState(user);
      showNotice(action === 'accept' ? 'Joined group!' : 'Declined group invitation.');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleAddFriendToSelectedGroup = (friendId) => {
    if (!selectedGroup) return;
    try {
      inviteFriendToGroup({
        authenticatedUid: userId,
        actorId: userId,
        groupId: selectedGroup.id,
        targetUserId: friendId,
        directAdd: true
      });
      refreshPhase4Data();
      showNotice('Added friend to group!');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleRemoveGroupMember = (memberUserId) => {
    if (!selectedGroup) return;
    try {
      removeGroupMember({
        authenticatedUid: userId,
        actorId: userId,
        groupId: selectedGroup.id,
        targetUserId: memberUserId
      });
      refreshPhase4Data();
      showNotice('Removed member from group.');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleLeaveGroup = (groupId) => {
    try {
      leaveConnectGroup({
        authenticatedUid: userId,
        userId,
        groupId
      });
      setSelectedGroupId(null);
      refreshPhase4Data();
      showNotice('You left the group.');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleCreateGroupSplitBill = (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      const res = createGroupDemoSplitBill({
        authenticatedUid: userId,
        creatorId: userId,
        groupId: selectedGroup.id,
        title: splitTitle,
        totalAmount: Number(splitTotal),
        splitMode
      });
      setGroupWalletModal(null);
      refreshPhase4Data();
      if (refreshSocialAndWalletState) refreshSocialAndWalletState(user);
      showNotice(
        `Created Demo Split Bill (${res.splitBill.referenceCode}) — Outstanding: RM${res.splitBill.outstandingAmount.toFixed(2)}`
      );
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleCreateGroupRequest = (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      const res = createGroupDemoPaymentRequest({
        authenticatedUid: userId,
        requesterId: userId,
        groupId: selectedGroup.id,
        amountPerMember: Number(reqAmountPerMember),
        note: reqNote
      });
      setGroupWalletModal(null);
      refreshPhase4Data();
      if (refreshSocialAndWalletState) refreshSocialAndWalletState(user);
      showNotice(`Requested RM${Number(reqAmountPerMember).toFixed(2)} from ${res.requests.length} group member(s).`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleApprovePayGroupSplitShare = async (splitBillId) => {
    if (!selectedGroup) return;
    try {
      const res = await payGroupDemoSplitShare({
        authenticatedUid: userId,
        payerId: userId,
        groupId: selectedGroup.id,
        splitBillId,
        confirmed: true
      });
      setConfirmPayBillId(null);
      refreshPhase4Data();
      if (refreshSocialAndWalletState) refreshSocialAndWalletState(user);
      showNotice(
        `Approved & paid share (${res.transferResult.referenceCode})! Remaining group balance owed: RM${res.splitBill.outstandingAmount.toFixed(2)}`
      );
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleSendGroupReminder = (splitBillId) => {
    if (!selectedGroup) return;
    try {
      const res = sendGroupPaymentReminder({
        authenticatedUid: userId,
        actorId: userId,
        groupId: selectedGroup.id,
        splitBillId
      });
      showNotice(`Sent reminder to ${res.remindedCount} unpaid group member(s).`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // --- SAVINGS CHALLENGE & LEADERBOARD HANDLERS ---
  const handleCreateChallenge = (e) => {
    e.preventDefault();
    try {
      const chal = createGroupSavingsChallenge({
        authenticatedUid: userId,
        creatorId: userId,
        title: chalTitle,
        targetAmount: Number(chalTarget),
        deadlineDays: Number(chalDays),
        participantIds: chalFriendIds
      });
      setCreateChallengeOpen(false);
      refreshPhase4Data();
      showNotice(`Created Savings Challenge "${chal.title}" (Target: RM${chal.overallTarget.toFixed(2)})!`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleUpdateDeclaredProgress = (e) => {
    e.preventDefault();
    if (!progressModalChal) return;
    try {
      const res = updateSavingsChallengeProgress({
        authenticatedUid: userId,
        userId,
        challengeId: progressModalChal.id,
        amountToAdd: Number(declaredAddAmount),
        note: declaredNote
      });
      setProgressModalChal(null);
      setDeclaredNote('');
      refreshPhase4Data();
      if (res.newlyReachedMilestones.length > 0) {
        showNotice(
          `🎉 Milestone Reached (${res.newlyReachedMilestones.join('%, ')}%)! Total declared: RM${res.challenge.totalDeclaredContributions.toFixed(2)}`
        );
      } else {
        showNotice(`Updated declared savings progress (+RM${Number(declaredAddAmount).toFixed(2)}).`);
      }
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleToggleLeaderboardOptIn = () => {
    const next = !(gamification?.leaderboardOptIn !== false);
    setLeaderboardOptIn(userId, next);
    refreshPhase4Data();
    showNotice(
      next
        ? 'You are now visible on public habit leaderboards.'
        : 'You have opted out of public leaderboards.'
    );
  };

  // --- STUDENT COMMUNITIES HANDLERS ---
  const handleJoinOrLeaveCommunity = (comm) => {
    try {
      if (comm.isJoined) {
        leaveCommunity({ authenticatedUid: userId, userId, communityId: comm.id });
        showNotice(`Left ${comm.name}.`);
      } else {
        joinCommunity({ authenticatedUid: userId, userId, communityId: comm.id });
        showNotice(`Joined ${comm.name}!`);
      }
      refreshPhase4Data();
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleCreateCommunity = (e) => {
    e.preventDefault();
    try {
      const created = createStudentCommunity({
        authenticatedUid: userId,
        creatorId: userId,
        name: newCommName,
        category: newCommCategory,
        description: newCommDesc
      });
      setCreateCommOpen(false);
      setNewCommName('');
      setNewCommDesc('');
      setSelectedCommunityId(created.id);
      refreshPhase4Data();
      showNotice(`Created student community "${created.name}"!`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!selectedCommunity) return;
    try {
      createCommunityPost({
        authenticatedUid: userId,
        authorId: userId,
        communityId: selectedCommunity.id,
        title: newPostTitle,
        content: newPostContent,
        tag: newPostTag
      });
      setNewPostTitle('');
      setNewPostContent('');
      refreshPhase4Data();
      showNotice('Published post to community!');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleReactPost = (postId) => {
    if (!selectedCommunity) return;
    try {
      toggleCommunityPostReaction({
        authenticatedUid: userId,
        userId,
        communityId: selectedCommunity.id,
        postId,
        emoji: '👍'
      });
      refreshPhase4Data();
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleExpandComments = (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    const data = getCommunityComments(postId, { viewerId: userId, page: 1, pageSize: 20 });
    setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments }));
  };

  const handleAddComment = (e, postId) => {
    e.preventDefault();
    if (!selectedCommunity || !commentDraft.trim()) return;
    try {
      addCommunityComment({
        authenticatedUid: userId,
        authorId: userId,
        communityId: selectedCommunity.id,
        postId,
        content: commentDraft
      });
      setCommentDraft('');
      const data = getCommunityComments(postId, { viewerId: userId, page: 1, pageSize: 20 });
      setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments }));
      refreshPhase4Data();
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleReportContent = (targetType, targetId) => {
    if (!selectedCommunity) return;
    try {
      reportCommunityContent({
        authenticatedUid: userId,
        reporterId: userId,
        communityId: selectedCommunity.id,
        targetType,
        targetId,
        reason: 'Reported by community member for review'
      });
      showNotice(`Reported ${targetType} to community moderators.`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleRemoveContent = (targetType, targetId, postId = null) => {
    if (!selectedCommunity) return;
    try {
      moderateCommunityContent({
        authenticatedUid: userId,
        moderatorId: userId,
        communityId: selectedCommunity.id,
        targetType,
        targetId,
        action: 'remove'
      });
      if (postId) {
        const data = getCommunityComments(postId, { viewerId: userId, page: 1, pageSize: 20 });
        setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments }));
      }
      refreshPhase4Data();
      showNotice(`Removed ${targetType}.`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {banner && (
        <div
          className="card"
          style={{
            padding: '0.8rem 1rem',
            borderLeft: `4px solid ${banner.type === 'error' ? 'var(--expense)' : 'var(--income)'}`,
            fontWeight: 700,
            fontSize: '0.85rem'
          }}
        >
          {banner.text}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: GROUP CONVERSATIONS & GROUP DEMO WALLET                      */}
      {/* =================================================================== */}
      {activeTab === 'groups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Group Header Banner */}
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={19} color="var(--primary)" /> Campus Friend Groups &amp; Group Bill Splits
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Private group chats with your KampusKash friends + simulated Demo Wallet bill splitting (no shared pool; individual wallets stay separate).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreateGroupModalOpen(true)}
            >
              <Plus size={15} /> Create Group
            </button>
          </div>

          {/* Pending Group Invitations */}
          {groupInvites.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: '0.6rem' }}>
                <span>Pending Group Invitations ({groupInvites.length})</span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {groupInvites.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 12,
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div>
                      <strong>{inv.groupName}</strong>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Invited by {inv.inviterName}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRespondGroupInvite(inv.id, 'accept')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRespondGroupInvite(inv.id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups Master-Detail Layout */}
          {groups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              You haven&apos;t joined or created any groups yet. Click <strong>Create Group</strong> above to start a group conversation and split campus expenses with your friends!
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: '1rem'
              }}
            >
              {/* Left: Group List */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card-title" style={{ marginBottom: 4 }}>
                  <span>Your Groups ({groups.length})</span>
                </div>
                {groups.map((grp) => (
                  <div
                    key={grp.id}
                    onClick={() => {
                      setSelectedGroupId(grp.id);
                      setGroupSplitBills(getGroupSplitBills(grp.id, userId));
                    }}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border:
                        selectedGroup?.id === grp.id
                          ? '1.5px solid var(--primary)'
                          : '1px solid var(--border-light)',
                      background:
                        selectedGroup?.id === grp.id
                          ? 'color-mix(in srgb, var(--primary) 12%, var(--bg-card))'
                          : 'var(--bg-card-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{grp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {grp.members.length} members • Role: {grp.viewerRole.toUpperCase()}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenConversationInMessenger) {
                          onOpenConversationInMessenger(grp.conversationId);
                        }
                      }}
                    >
                      <MessageSquare size={13} /> Open Chat
                    </button>
                  </div>
                ))}
              </div>

              {/* Right: Selected Group Details, Members & Group Demo Wallet Splits */}
              {selectedGroup && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: 'var(--primary)',
                          marginBottom: 4
                        }}
                      >
                        <ShieldCheck size={12} /> {DEMO_WALLET_BANNER_TEXT}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{selectedGroup.name}</h3>
                      {selectedGroup.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {selectedGroup.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setGroupWalletModal('split')}
                      >
                        <Split size={13} /> Split Group Bill
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setGroupWalletModal('request')}
                      >
                        <HandCoins size={13} /> Request Money
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleLeaveGroup(selectedGroup.id)}
                      >
                        <LogOut size={13} /> Leave
                      </button>
                    </div>
                  </div>

                  {/* Group Members & Admin Controls */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                      Group Members ({selectedGroup.members.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedGroup.members.map((m) => (
                        <div
                          key={m.userId}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            borderRadius: 999,
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.76rem'
                          }}
                        >
                          <strong>{m.displayName}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>({m.role})</span>
                          {selectedGroup.isViewerAdmin &&
                            m.userId !== userId &&
                            m.userId !== selectedGroup.creatorId && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGroupMember(m.userId)}
                                title="Remove member (Admin)"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--expense)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex'
                                }}
                              >
                                <UserMinus size={13} />
                              </button>
                            )}
                        </div>
                      ))}
                    </div>

                    {/* Quick Add Friend to Group */}
                    {friendsList.filter((f) => !selectedGroup.memberIds.includes(f.id)).length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add Friend:</span>
                        {friendsList
                          .filter((f) => !selectedGroup.memberIds.includes(f.id))
                          .map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleAddFriendToSelectedGroup(f.id)}
                            >
                              <UserPlus size={12} /> {f.displayName}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Group Split Bills & Payment Tracking */}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 6 }}>
                      Group Demo Split Bills ({groupSplitBills.length})
                    </div>
                    {groupSplitBills.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        No group split bills yet. Click &ldquo;Split Group Bill&rdquo; to divide a shared expense in simulated RM.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {groupSplitBills.map((bill) => {
                          const myPart = bill.participants.find((p) => p.userId === userId);
                          return (
                            <div
                              key={bill.id}
                              style={{
                                padding: '0.75rem',
                                borderRadius: 12,
                                background: 'var(--bg-card-subtle)',
                                border: '1px solid var(--border-light)'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 4
                                }}
                              >
                                <strong>{bill.title}</strong>
                                <span className="badge" style={{ fontSize: '0.7rem' }}>
                                  Total: RM{Number(bill.totalAmount).toFixed(2)} • Outstanding: RM
                                  {Number(bill.outstandingAmount).toFixed(2)}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                                Ref: <code>{bill.referenceCode}</code> • Status: {bill.status.toUpperCase()}
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {bill.participants.map((p) => (
                                  <span
                                    key={p.userId}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      background:
                                        p.status === 'paid'
                                          ? 'rgba(16,185,129,0.14)'
                                          : 'rgba(245,158,11,0.14)',
                                      color: p.status === 'paid' ? 'var(--income)' : 'var(--warning)',
                                      fontWeight: 700
                                    }}
                                  >
                                    {p.displayName}: RM{Number(p.amountOwed).toFixed(2)} ({p.status.toUpperCase()})
                                  </span>
                                ))}
                              </div>

                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {myPart && myPart.status === 'pending' && (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setConfirmPayBillId(bill.id)}
                                  >
                                    <CheckCircle2 size={13} /> Approve &amp; Pay RM
                                    {Number(myPart.amountOwed).toFixed(2)}
                                  </button>
                                )}
                                {bill.outstandingAmount > 0 &&
                                  (bill.creatorId === userId || selectedGroup.isViewerAdmin) && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleSendGroupReminder(bill.id)}
                                    >
                                      <Bell size={13} /> Send Payment Reminder
                                    </button>
                                  )}
                              </div>

                              {/* Explicit Approval Confirmation Box */}
                              {confirmPayBillId === bill.id && myPart && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: '0.65rem',
                                    borderRadius: 10,
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--primary)'
                                  }}
                                >
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
                                    Confirm Demo Transfer of RM{Number(myPart.amountOwed).toFixed(2)} from your individual Demo Wallet (Available: RM
                                    {Number(demoP2PWallet?.balance ?? 100).toFixed(2)}) to {bill.creatorName}?
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleApprovePayGroupSplitShare(bill.id)}
                                    >
                                      Confirm Demo Payment
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setConfirmPayBillId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: GROUP SAVINGS CHALLENGES & HABIT LEADERBOARDS                */}
      {/* =================================================================== */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Disclaimer Banner */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1rem',
              background: 'color-mix(in srgb, var(--primary) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--primary) 35%, var(--border-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  letterSpacing: '0.04em'
                }}
              >
                {SAVINGS_CHALLENGE_DISCLAIMER}
              </div>
              <h3 style={{ margin: '4px 0 2px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={18} color="var(--primary)" /> Group Savings Challenges &amp; Habit Leaderboards
              </h3>
              <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--text-muted)' }}>
                Track collective savings goals with friends and earn habit badges without deducting money from your real accounts or demo wallet.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreateChallengeOpen(true)}
            >
              <Plus size={15} /> Create Savings Challenge
            </button>
          </div>

          {/* Active Challenges List */}
          {challenges.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.75rem 1rem', color: 'var(--text-muted)' }}>
              No active group savings challenges yet. Create a 30-day RM1,000 challenge with your friends to track collective milestones!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {challenges.map((chal) => (
                <div key={chal.id} className="card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 10,
                      marginBottom: 10
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem' }}>{chal.title}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {chal.daysRemaining} days remaining • Individual target: RM
                        {Number(chal.individualTargetAmount).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setProgressModalChal(chal);
                        setDeclaredAddAmount('50');
                      }}
                    >
                      <Sparkles size={13} /> Update My Declared Progress
                    </button>
                  </div>

                  {/* Stats Summary */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 8,
                      marginBottom: 10
                    }}
                  >
                    <div
                      style={{
                        padding: '0.6rem',
                        borderRadius: 10,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall Target</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                        RM {Number(chal.overallTarget).toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '0.6rem',
                        borderRadius: 10,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Declared</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--income)' }}>
                        RM {Number(chal.totalDeclaredContributions).toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '0.6rem',
                        borderRadius: 10,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Remaining</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                        RM {Number(chal.remainingAmount).toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '0.6rem',
                        borderRadius: 10,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completion</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {chal.completionPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: 'var(--bg-card-subtle)',
                      overflow: 'hidden',
                      marginBottom: 10
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, chal.completionPercentage)}%`,
                        height: '100%',
                        background: 'var(--primary)'
                      }}
                    />
                  </div>

                  {/* Milestone Celebrations */}
                  {chal.celebrations?.length > 0 && (
                    <div
                      style={{
                        padding: '0.55rem 0.8rem',
                        borderRadius: 10,
                        background: 'rgba(16,185,129,0.12)',
                        color: 'var(--income)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 10
                      }}
                    >
                      {chal.celebrations[chal.celebrations.length - 1].message}
                    </div>
                  )}

                  {/* Per-Member Declared Progress */}
                  <div style={{ display: 'grid', gap: 6 }}>
                    {chal.participants.map((p) => (
                      <div
                        key={p.userId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          padding: '4px 8px',
                          borderRadius: 8,
                          background: 'var(--bg-card-subtle)'
                        }}
                      >
                        <span>
                          <strong>{p.displayName}</strong> (@{p.handle})
                        </span>
                        <span>
                          Declared: <strong>RM {Number(p.declaredAmount).toFixed(2)}</strong> / RM{' '}
                          {Number(p.individualTarget).toFixed(2)} ({p.progressPercentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Gamification Badges & Privacy-Safe Leaderboard */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy size={18} color="#FBBF24" /> Habit Leaderboards &amp; Achievements
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ranked strictly by points, challenge progress &amp; habits — never by real wealth or account balances.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleToggleLeaderboardOptIn}
              >
                {gamification?.leaderboardOptIn !== false ? (
                  <>
                    <EyeOff size={13} /> Opt Out of Public Leaderboard
                  </>
                ) : (
                  <>
                    <Eye size={13} /> Opt In to Public Leaderboard
                  </>
                )}
              </button>
            </div>

            {/* Earned Achievements */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
                Your Unlocked Achievements ({gamification?.achievementIds?.length || 0}) • Total Points:{' '}
                <strong>{gamification?.points || 0} pts</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROFILE_ACHIEVEMENTS.map((badge) => {
                  const unlocked = gamification?.achievementIds?.includes(badge.id);
                  return (
                    <span
                      key={badge.id}
                      style={{
                        fontSize: '0.74rem',
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: '1px solid var(--border-light)',
                        background: unlocked
                          ? 'color-mix(in srgb, var(--primary) 16%, var(--bg-card))'
                          : 'var(--bg-card-subtle)',
                        opacity: unlocked ? 1 : 0.5,
                        fontWeight: unlocked ? 800 : 500
                      }}
                      title={badge.description}
                    >
                      <Award size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {badge.label} {unlocked ? '✓' : ''}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'challenge_progress', label: 'Challenge Progress %' },
                { id: 'participation', label: 'Challenge Participation' },
                { id: 'achievements', label: 'Habit Achievements' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn btn-sm ${leaderboardCategory === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLeaderboardCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Leaderboard Rows */}
            <div style={{ display: 'grid', gap: 6 }}>
              {leaderboardRows.map((row) => (
                <div
                  key={row.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 10,
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: 24 }}>
                      #{row.rank}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                        {row.displayName} <span style={{ color: 'var(--text-muted)' }}>@{row.handle}</span>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {row.achievementCount} badges • {row.challengeParticipationCount} challenges
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.84rem' }}>
                    <div>{row.points} pts</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--income)' }}>
                      {row.challengeProgressPercentage}% avg goal
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: STUDENT COMMUNITIES & MODERATION                             */}
      {/* =================================================================== */}
      {activeTab === 'communities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Community Header & Guidelines */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 8
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={18} color="var(--primary)" /> Student Interest Communities
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Moderated campus interest groups for budget travel, dorm cooking, financial literacy, and university life.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCreateCommOpen(true)}
              >
                <Plus size={14} /> New Community
              </button>
            </div>

            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: 10,
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)',
                fontSize: '0.74rem',
                color: 'var(--text-muted)'
              }}
            >
              <strong>Community Guidelines:</strong> {COMMUNITY_GUIDELINES.join(' • ')}
            </div>
          </div>

          {/* Search & Community Cards */}
          <div className="card">
            <input
              type="text"
              className="form-control"
              placeholder="Search student communities (e.g. UTP Students, Budget Travel, Student Cooking)..."
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 8
              }}
            >
              {communities.map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => setSelectedCommunityId(comm.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border:
                      selectedCommunity?.id === comm.id
                        ? '1.5px solid var(--primary)'
                        : '1px solid var(--border-light)',
                    background:
                      selectedCommunity?.id === comm.id
                        ? 'color-mix(in srgb, var(--primary) 12%, var(--bg-card))'
                        : 'var(--bg-card-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                      {comm.icon} {comm.name}
                    </div>
                    <button
                      type="button"
                      className={`btn btn-sm ${comm.isJoined ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinOrLeaveCommunity(comm);
                      }}
                    >
                      {comm.isJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {comm.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Community Discussion Feed */}
          {selectedCommunity && (
            <div className="card">
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                  {selectedCommunity.icon} {selectedCommunity.name} — Discussions
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedCommunity.memberCount} member(s) • Sensitive financial data is automatically blocked.
                </div>
              </div>

              {selectedCommunity.isJoined ? (
                <form onSubmit={handleCreatePost} style={{ marginBottom: 14, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Post title (optional)..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <select
                      className="form-control"
                      style={{ width: 140 }}
                      value={newPostTag}
                      onChange={(e) => setNewPostTag(e.target.value)}
                    >
                      <option value="Discussion">Discussion</option>
                      <option value="Tip">Saving Tip</option>
                      <option value="Question">Question</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Share a tip or question in ${selectedCommunity.name}...`}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      required
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary">
                      <Send size={14} /> Post
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 10,
                    background: 'var(--bg-card-subtle)',
                    marginBottom: 12,
                    fontSize: '0.82rem'
                  }}
                >
                  Join <strong>{selectedCommunity.name}</strong> above to create posts, react, and comment.
                </div>
              )}

              {/* Posts List */}
              {communityPostsState.posts.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                  No posts in this community yet. Be the first to start a discussion!
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {communityPostsState.posts.map((post) => {
                    const reactionCount = Object.keys(post.reactions || {}).length;
                    const comments = postCommentsMap[post.id] || [];
                    return (
                      <div
                        key={post.id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 12,
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.78rem' }}>
                            <strong>{post.authorName}</strong>{' '}
                            <span style={{ color: 'var(--text-muted)' }}>@{post.authorHandle}</span>
                          </div>
                          <span className="badge" style={{ fontSize: '0.68rem' }}>
                            {post.tag}
                          </span>
                        </div>
                        {post.title && (
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', marginTop: 4 }}>
                            {post.title}
                          </div>
                        )}
                        <div style={{ fontSize: '0.85rem', margin: '6px 0 8px' }}>{post.content}</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleReactPost(post.id)}
                          >
                            <ThumbsUp size={12} /> {reactionCount}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleExpandComments(post.id)}
                          >
                            <MessageSquare size={12} /> Comments ({post.commentCount || 0})
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleReportContent('post', post.id)}
                          >
                            <Flag size={12} /> Report
                          </button>
                          {(post.authorId === userId || selectedCommunity.isAdmin) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRemoveContent('post', post.id)}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          )}
                        </div>

                        {/* Comments Drawer */}
                        {expandedPostId === post.id && (
                          <div
                            style={{
                              marginTop: 10,
                              paddingTop: 8,
                              borderTop: '1px solid var(--border-light)',
                              display: 'grid',
                              gap: 6
                            }}
                          >
                            {comments.map((cmt) => (
                              <div
                                key={cmt.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.78rem',
                                  padding: '4px 8px',
                                  borderRadius: 8,
                                  background: 'var(--bg-card)'
                                }}
                              >
                                <div>
                                  <strong>{cmt.authorName}:</strong> {cmt.content}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleReportContent('comment', cmt.id)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer'
                                    }}
                                    title="Report comment"
                                  >
                                    <Flag size={11} />
                                  </button>
                                  {(cmt.authorId === userId || selectedCommunity.isAdmin) && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveContent('comment', cmt.id, post.id)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--expense)',
                                        cursor: 'pointer'
                                      }}
                                      title="Remove comment"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}

                            {selectedCommunity.isJoined && (
                              <form
                                onSubmit={(e) => handleAddComment(e, post.id)}
                                style={{ display: 'flex', gap: 6, marginTop: 4 }}
                              >
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Write a comment..."
                                  value={commentDraft}
                                  onChange={(e) => setCommentDraft(e.target.value)}
                                  required
                                />
                                <button type="submit" className="btn btn-primary btn-sm">
                                  Reply
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS: CREATE GROUP, GROUP WALLET, CREATE CHALLENGE, PROGRESS, COMM*/}
      {/* =================================================================== */}
      {createGroupModalOpen && (
        <div className="pay-modal-backdrop" onClick={() => setCreateGroupModalOpen(false)}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Create Friend Group</h3>
              <button
                type="button"
                onClick={() => setCreateGroupModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} style={{ display: 'grid', gap: 10 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Group Name (e.g. UTP Futsal & Mamak Squad)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />
              <input
                type="text"
                className="form-control"
                placeholder="Short description (optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
              />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
                  Add KampusKash Friends ({newGroupFriendIds.length} selected)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {friendsList.map((f) => {
                    const sel = newGroupFriendIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() =>
                          setNewGroupFriendIds((prev) =>
                            prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                          )
                        }
                      >
                        {sel ? '✓ ' : '+ '}
                        {f.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {groupWalletModal && selectedGroup && (
        <div className="pay-modal-backdrop" onClick={() => setGroupWalletModal(null)}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
              {DEMO_WALLET_BANNER_TEXT}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>
                {groupWalletModal === 'split'
                  ? `Split Expense in ${selectedGroup.name}`
                  : `Request Demo Money in ${selectedGroup.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setGroupWalletModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {groupWalletModal === 'split' ? (
              <form onSubmit={handleCreateGroupSplitBill} style={{ display: 'grid', gap: 10 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Expense Title (e.g. Shared Dinner)"
                  value={splitTitle}
                  onChange={(e) => setSplitTitle(e.target.value)}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-control"
                  placeholder="Total Bill Amount (RM)"
                  value={splitTotal}
                  onChange={(e) => setSplitTotal(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Splitting equally across {selectedGroup.members.length} group members:{' '}
                  <strong>
                    RM {(Number(splitTotal || 0) / Math.max(1, selectedGroup.members.length)).toFixed(2)} each
                  </strong>
                  . Each member must explicitly approve their own demo payment.
                </div>
                <button type="submit" className="btn btn-primary">
                  Create Group Split Bill
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateGroupRequest} style={{ display: 'grid', gap: 10 }}>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-control"
                  placeholder="Amount per member (RM)"
                  value={reqAmountPerMember}
                  onChange={(e) => setReqAmountPerMember(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Reason / Note"
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Send Group Payment Requests
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {createChallengeOpen && (
        <div className="pay-modal-backdrop" onClick={() => setCreateChallengeOpen(false)}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
              {SAVINGS_CHALLENGE_DISCLAIMER}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Create Group Savings Challenge</h3>
              <button
                type="button"
                onClick={() => setCreateChallengeOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateChallenge} style={{ display: 'grid', gap: 10 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Challenge Title"
                value={chalTitle}
                onChange={(e) => setChalTitle(e.target.value)}
                required
              />
              <input
                type="number"
                step="1"
                min="10"
                className="form-control"
                placeholder="Collective Target Amount (RM)"
                value={chalTarget}
                onChange={(e) => setChalTarget(e.target.value)}
                required
              />
              <input
                type="number"
                step="1"
                min="1"
                className="form-control"
                placeholder="Duration in Days (e.g. 30)"
                value={chalDays}
                onChange={(e) => setChalDays(e.target.value)}
                required
              />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
                  Invite Friends ({chalFriendIds.length} selected)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {friendsList.map((f) => {
                    const sel = chalFriendIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() =>
                          setChalFriendIds((prev) =>
                            prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                          )
                        }
                      >
                        {sel ? '✓ ' : '+ '}
                        {f.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Launch Savings Challenge
              </button>
            </form>
          </div>
        </div>
      )}

      {progressModalChal && (
        <div className="pay-modal-backdrop" onClick={() => setProgressModalChal(null)}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
              {SAVINGS_CHALLENGE_DISCLAIMER}
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Update Declared Progress — {progressModalChal.title}</h3>
            <form onSubmit={handleUpdateDeclaredProgress} style={{ display: 'grid', gap: 10 }}>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-control"
                placeholder="Declared RM Saved to Add"
                value={declaredAddAmount}
                onChange={(e) => setDeclaredAddAmount(e.target.value)}
                required
              />
              <input
                type="text"
                className="form-control"
                placeholder="Note (e.g. Cooked dinner at hostel instead of ordering out)"
                value={declaredNote}
                onChange={(e) => setDeclaredNote(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setProgressModalChal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Declared Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createCommOpen && (
        <div className="pay-modal-backdrop" onClick={() => setCreateCommOpen(false)}>
          <div className="pay-modal-content card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px' }}>Create Student Interest Community</h3>
            <form onSubmit={handleCreateCommunity} style={{ display: 'grid', gap: 10 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Community Name"
                value={newCommName}
                onChange={(e) => setNewCommName(e.target.value)}
                required
              />
              <input
                type="text"
                className="form-control"
                placeholder="Category (e.g. Campus, Finance, Food)"
                value={newCommCategory}
                onChange={(e) => setNewCommCategory(e.target.value)}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Community Description"
                value={newCommDesc}
                onChange={(e) => setNewCommDesc(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                Create Community
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

