import {
    db,
    doc,
    setDoc
} from '../firebase.js';
import {
    MESSAGE_TYPES,
    PROFILE_ACHIEVEMENTS,
    SAVINGS_CHALLENGE_DISCLAIMER,
    COMMUNITY_GUIDELINES,
    DEFAULT_STUDENT_COMMUNITIES
} from '../config/appConstants.js';
import {
    sanitizeText,
    checkProfanityAndSpam,
    checkRateLimit
} from '../utils/safetyUtils.js';
import {
    getPublicProfile,
    areFriends,
    isBlockedBetween,
    createNotification,
    updateProfilePrivacySettings
} from './socialService.js';
import {
    createGroupConversationStructure,
    upsertGroupConversationInMessenger,
    sendMessage,
    getConversationMessages,
    subscribeToConversationMessages,
    uploadConversationImage,
    getAttachmentForParticipant
} from './messengerService.js';
import {
    DEMO_WALLET_BANNER_TEXT,
    roundRM,
    validateRMAmount,
    createDemoPaymentRequest,
    createDemoSplitBill,
    payDemoSplitBillShare,
    getUserDemoSplitBills
} from './demoWalletService.js';

const PHASE4_STORAGE_KEYS = {
    GROUPS: 'kk_connect_groups_v1',
    GROUP_INVITES: 'kk_connect_group_invites_v1',
    SAVINGS_CHALLENGES: 'kk_connect_savings_challenges_v1',
    GAMIFICATION: 'kk_connect_gamification_v1',
    COMMUNITIES: 'kk_connect_communities_v1',
    COMMUNITY_POSTS: 'kk_connect_community_posts_v1',
    COMMUNITY_COMMENTS: 'kk_connect_community_comments_v1',
    COMMUNITY_REPORTS: 'kk_connect_community_reports_v1',
    NOTIF_PREFS: 'kk_connect_phase4_notif_prefs_v1',
    DEDUP_NOTIFS: 'kk_connect_phase4_dedup_notifs_v1'
};

const memoryPhase4Store = {
    [PHASE4_STORAGE_KEYS.GROUPS]: null,
    [PHASE4_STORAGE_KEYS.GROUP_INVITES]: null,
    [PHASE4_STORAGE_KEYS.SAVINGS_CHALLENGES]: null,
    [PHASE4_STORAGE_KEYS.GAMIFICATION]: null,
    [PHASE4_STORAGE_KEYS.COMMUNITIES]: null,
    [PHASE4_STORAGE_KEYS.COMMUNITY_POSTS]: null,
    [PHASE4_STORAGE_KEYS.COMMUNITY_COMMENTS]: null,
    [PHASE4_STORAGE_KEYS.COMMUNITY_REPORTS]: null,
    [PHASE4_STORAGE_KEYS.NOTIF_PREFS]: null,
    [PHASE4_STORAGE_KEYS.DEDUP_NOTIFS]: null
};

let phase4Seq = 0;

function readP4Store(key, fallback) {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw !== null) return JSON.parse(raw);
        } catch {
            // ignore
        }
    }
    if (memoryPhase4Store[key] !== null && memoryPhase4Store[key] !== undefined) {
        return JSON.parse(JSON.stringify(memoryPhase4Store[key]));
    }
    return typeof fallback === 'function' ? fallback() : fallback;
}

function writeP4Store(key, value) {
    memoryPhase4Store[key] = JSON.parse(JSON.stringify(value));
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore
        }
    }
}

export function resetPhase4StateForTesting() {
    Object.keys(memoryPhase4Store).forEach((key) => {
        memoryPhase4Store[key] = null;
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.removeItem(key);
            } catch {
                // ignore
            }
        }
    });
    phase4Seq = 0;
}

// ---------------------------------------------------------------------------
// 7. Phase 4 Notification Preferences & Deduplicated Dispatch
// ---------------------------------------------------------------------------

export const DEFAULT_PHASE4_NOTIFICATION_PREFS = {
    groupInvites: true,
    groupMessages: true,
    challengeInvites: true,
    challengeMilestones: true,
    paymentRequests: true,
    splitBillUpdates: true,
    communityInteractions: true
};

export function getPhase4NotificationPrefs(userId) {
    if (!userId) return { ...DEFAULT_PHASE4_NOTIFICATION_PREFS };
    const map = readP4Store(PHASE4_STORAGE_KEYS.NOTIF_PREFS, () => ({}));
    return {
        ...DEFAULT_PHASE4_NOTIFICATION_PREFS,
        ...(map[userId] || {})
    };
}

export function updatePhase4NotificationPrefs(userId, patch = {}) {
    if (!userId) throw new Error('User ID is required.');
    const map = readP4Store(PHASE4_STORAGE_KEYS.NOTIF_PREFS, () => ({}));
    const current = getPhase4NotificationPrefs(userId);
    const updated = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
    };
    map[userId] = updated;
    writeP4Store(PHASE4_STORAGE_KEYS.NOTIF_PREFS, map);
    return updated;
}

export function dispatchPhase4Notification({
    recipientId,
    actorId,
    category = 'groupInvites', // key in DEFAULT_PHASE4_NOTIFICATION_PREFS
    type = 'connect_notification',
    dedupKey = null,
    message = '',
    metadata = {}
}) {
    if (!recipientId || (actorId && String(recipientId) === String(actorId))) {
        return { delivered: false, reason: 'self_or_missing' };
    }
    if (actorId && isBlockedBetween(actorId, recipientId)) {
        return { delivered: false, reason: 'blocked' };
    }
    const prefs = getPhase4NotificationPrefs(recipientId);
    if (category && prefs[category] === false) {
        return { delivered: false, reason: 'disabled_by_preference' };
    }

    const dedupMap = readP4Store(PHASE4_STORAGE_KEYS.DEDUP_NOTIFS, () => ({}));
    const effectiveDedupKey = dedupKey ? `${recipientId}_${dedupKey}` : null;
    if (effectiveDedupKey && dedupMap[effectiveDedupKey]) {
        return { delivered: false, reason: 'duplicate', notification: dedupMap[effectiveDedupKey] };
    }

    const actorProfile = actorId ? getPublicProfile(actorId) : null;
    const notif = createNotification({
        recipientId,
        type,
        actorId: actorId || 'system',
        actorName: actorProfile?.displayName || 'KampusKash Connect',
        actorHandle: actorProfile?.username || actorProfile?.handle || 'connect',
        message,
        ...metadata
    });

    if (effectiveDedupKey && notif) {
        dedupMap[effectiveDedupKey] = notif;
        writeP4Store(PHASE4_STORAGE_KEYS.DEDUP_NOTIFS, dedupMap);
    }

    return { delivered: true, notification: notif };
}

// ---------------------------------------------------------------------------
// 1. Group Conversations (Integrated with Friends & Real-Time Messenger)
// ---------------------------------------------------------------------------

function getAllGroupsMap() {
    return readP4Store(PHASE4_STORAGE_KEYS.GROUPS, () => ({}));
}

function saveAllGroupsMap(map) {
    writeP4Store(PHASE4_STORAGE_KEYS.GROUPS, map);
}

function getAllGroupInvitesMap() {
    return readP4Store(PHASE4_STORAGE_KEYS.GROUP_INVITES, () => ({}));
}

function saveAllGroupInvitesMap(map) {
    writeP4Store(PHASE4_STORAGE_KEYS.GROUP_INVITES, map);
}

/**
 * Creates a new group chat with KampusKash friends.
 * - Creator becomes group administrator (`role: 'admin'`).
 * - Invited/added initial members must be friends of the creator and not blocked.
 * - Automatically creates and syncs the group conversation in `messengerService`.
 */
export function createConnectGroup({
    authenticatedUid,
    creatorId,
    name,
    description = '',
    avatarUrl = 'cat',
    memberIds = [],
    inviteIds = []
} = {}) {
    if (!authenticatedUid || !creatorId || String(authenticatedUid) !== String(creatorId)) {
        throw new Error('Unauthorized: Authenticated UID must match group creator ID.');
    }

    const cleanName = sanitizeText(name || '', 80);
    if (!cleanName || cleanName.length < 2) {
        throw new Error('Group name must be at least 2 characters long.');
    }
    const modCheck = checkProfanityAndSpam(cleanName);
    if (!modCheck.valid) {
        throw new Error(modCheck.error || 'Group name contains inappropriate language.');
    }

    const cleanDesc = sanitizeText(description || '', 240);
    const creatorProfile = getPublicProfile(creatorId);
    if (!creatorProfile) {
        throw new Error('Creator profile not found.');
    }

    const validatedMembers = [String(creatorId)];
    const roles = {
        [String(creatorId)]: 'admin'
    };

    for (const rawId of memberIds) {
        const fid = String(rawId || '');
        if (!fid || fid === String(creatorId)) continue;
        if (isBlockedBetween(creatorId, fid)) {
            throw new Error('Cannot add a blocked user to a group.');
        }
        if (!areFriends(creatorId, fid)) {
            throw new Error('You can only add your KampusKash friends to a group.');
        }
        if (!validatedMembers.includes(fid)) {
            validatedMembers.push(fid);
            roles[fid] = 'member';
        }
    }

    phase4Seq += 1;
    const nowIso = new Date().toISOString();
    const groupId = `grp_${Date.now()}_${phase4Seq}`;
    const groupConv = createGroupConversationStructure({
        creatorId: String(creatorId),
        participantIds: validatedMembers,
        title: cleanName,
        groupId,
        avatarUrl: avatarUrl || 'cat'
    });

    upsertGroupConversationInMessenger(groupConv);

    const groupRecord = {
        id: groupId,
        conversationId: groupConv.id,
        name: cleanName,
        description: cleanDesc,
        avatarUrl: avatarUrl || 'cat',
        creatorId: String(creatorId),
        adminIds: [String(creatorId)],
        memberIds: validatedMembers,
        roles,
        pendingInviteIds: [],
        isPrivate: true,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const groupsMap = getAllGroupsMap();
    groupsMap[groupId] = groupRecord;
    saveAllGroupsMap(groupsMap);

    // Send initial system message into the group conversation
    sendMessage({
        conversationId: groupConv.id,
        senderId: String(creatorId),
        authenticatedUid: String(creatorId),
        type: MESSAGE_TYPES.SYSTEM,
        text: `${creatorProfile.displayName} created group "${cleanName}"`,
        systemEvent: 'group_created'
    });

    // Notify added friends
    for (const mid of validatedMembers) {
        if (mid === String(creatorId)) continue;
        dispatchPhase4Notification({
            recipientId: mid,
            actorId: String(creatorId),
            category: 'groupInvites',
            type: 'group_added',
            dedupKey: `grp_add_${groupId}_${mid}`,
            message: `${creatorProfile.displayName} added you to the group "${cleanName}".`,
            metadata: { groupId, conversationId: groupConv.id }
        });
    }

    // Also process optional invitations
    for (const invUid of inviteIds) {
        const targetId = String(invUid || '');
        if (!targetId || validatedMembers.includes(targetId)) continue;
        inviteFriendToGroup({
            authenticatedUid: String(creatorId),
            actorId: String(creatorId),
            groupId,
            targetUserId: targetId
        });
    }

    if (db) {
        setDoc(doc(db, 'connectGroups', groupId), groupsMap[groupId]).catch(() => {});
    }

    return getGroupDetails(groupId, String(creatorId));
}

/**
 * Retrieves a group and verifies that `viewerId` is an active member.
 * Non-members are strictly denied access to private group conversations.
 */
export function getGroupDetails(groupId, viewerId) {
    if (!groupId || !viewerId) {
        throw new Error('Authentication required to view group.');
    }
    const groupsMap = getAllGroupsMap();
    const group = groupsMap[groupId];
    if (!group) {
        throw new Error('Group not found.');
    }
    if (!Array.isArray(group.memberIds) || !group.memberIds.includes(String(viewerId))) {
        throw new Error('Access denied: You are not a member of this private group.');
    }

    const hydratedMembers = group.memberIds.map((uid) => {
        const p = getPublicProfile(uid);
        return {
            userId: uid,
            displayName: p?.displayName || 'Student',
            username: p?.username || p?.handle || 'student',
            handle: p?.handle || p?.username || 'student',
            avatarId: p?.avatarId || 'cat',
            university: p?.university || 'Campus',
            role: group.roles?.[uid] || (group.adminIds?.includes(uid) ? 'admin' : 'member')
        };
    });

    return {
        ...group,
        members: hydratedMembers,
        viewerRole: group.roles?.[String(viewerId)] || 'member',
        isViewerAdmin: Boolean(
            group.roles?.[String(viewerId)] === 'admin' || group.adminIds?.includes(String(viewerId))
        )
    };
}

export function getUserGroups(userId) {
    if (!userId) return [];
    const groupsMap = getAllGroupsMap();
    return Object.values(groupsMap)
        .filter((g) => Array.isArray(g.memberIds) && g.memberIds.includes(String(userId)))
        .map((g) => getGroupDetails(g.id, userId))
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function updateConnectGroup({
    authenticatedUid,
    actorId,
    groupId,
    name,
    description,
    avatarUrl
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized: Authenticated UID must match actor ID.');
    }
    const groupsMap = getAllGroupsMap();
    const group = groupsMap[groupId];
    if (!group) throw new Error('Group not found.');
    if (!group.memberIds.includes(String(actorId))) {
        throw new Error('Access denied: You are not a member of this group.');
    }
    if (group.roles?.[actorId] !== 'admin' && !group.adminIds?.includes(String(actorId))) {
        throw new Error('Permission denied: Only group administrators can update group settings.');
    }

    if (name !== undefined) {
        const cleanName = sanitizeText(name, 80);
        if (!cleanName || cleanName.length < 2) {
            throw new Error('Group name must be at least 2 characters long.');
        }
        group.name = cleanName;
    }
    if (description !== undefined) {
        group.description = sanitizeText(description, 240);
    }
    if (avatarUrl !== undefined) {
        group.avatarUrl = avatarUrl || 'cat';
    }
    group.updatedAt = new Date().toISOString();
    groupsMap[groupId] = group;
    saveAllGroupsMap(groupsMap);

    upsertGroupConversationInMessenger({
        id: group.conversationId,
        type: 'group',
        groupId: group.id,
        title: group.name,
        avatarUrl: group.avatarUrl,
        creatorId: group.creatorId,
        adminIds: group.adminIds,
        participants: group.memberIds
    });

    return getGroupDetails(groupId, actorId);
}

/**
 * Invites a friend to join a group (creates an invitation that the friend can accept or decline,
 * or adds directly if `directAdd === true`).
 */
export function inviteFriendToGroup({
    authenticatedUid,
    actorId,
    groupId,
    targetUserId,
    directAdd = false
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized: Authenticated UID must match actor ID.');
    }
    const groupsMap = getAllGroupsMap();
    const group = groupsMap[groupId];
    if (!group) throw new Error('Group not found.');
    if (!group.memberIds.includes(String(actorId))) {
        throw new Error('Access denied: Only group members can invite friends.');
    }
    if (!targetUserId || group.memberIds.includes(String(targetUserId))) {
        throw new Error('User is already a member of this group.');
    }
    if (isBlockedBetween(actorId, targetUserId)) {
        throw new Error('Cannot invite a blocked user.');
    }
    if (!areFriends(actorId, targetUserId)) {
        throw new Error('You can only invite your KampusKash friends to a group.');
    }

    const nowIso = new Date().toISOString();
    const actorProfile = getPublicProfile(actorId);
    const targetProfile = getPublicProfile(targetUserId);

    if (directAdd) {
        group.memberIds.push(String(targetUserId));
        group.roles[String(targetUserId)] = 'member';
        group.pendingInviteIds = (group.pendingInviteIds || []).filter((id) => id !== String(targetUserId));
        group.updatedAt = nowIso;
        groupsMap[groupId] = group;
        saveAllGroupsMap(groupsMap);

        upsertGroupConversationInMessenger({
            id: group.conversationId,
            type: 'group',
            groupId: group.id,
            title: group.name,
            avatarUrl: group.avatarUrl,
            creatorId: group.creatorId,
            adminIds: group.adminIds,
            participants: group.memberIds
        });

        sendMessage({
            conversationId: group.conversationId,
            senderId: String(actorId),
            authenticatedUid: String(actorId),
            type: MESSAGE_TYPES.SYSTEM,
            text: `${actorProfile?.displayName || 'Admin'} added ${targetProfile?.displayName || 'a friend'} to the group.`,
            systemEvent: 'member_added'
        });

        dispatchPhase4Notification({
            recipientId: String(targetUserId),
            actorId: String(actorId),
            category: 'groupInvites',
            type: 'group_added',
            dedupKey: `grp_add_${groupId}_${targetUserId}`,
            message: `${actorProfile?.displayName || 'A friend'} added you to "${group.name}".`,
            metadata: { groupId, conversationId: group.conversationId }
        });

        return { status: 'added', group: getGroupDetails(groupId, actorId) };
    }

    // Create pending group invitation
    phase4Seq += 1;
    const inviteId = `ginv_${groupId}_${targetUserId}`;
    const invitesMap = getAllGroupInvitesMap();
    const inviteRecord = {
        id: inviteId,
        groupId,
        groupName: group.name,
        groupAvatar: group.avatarUrl,
        inviterId: String(actorId),
        inviterName: actorProfile?.displayName || 'Friend',
        inviteeId: String(targetUserId),
        status: 'pending',
        createdAt: nowIso,
        updatedAt: nowIso
    };
    invitesMap[inviteId] = inviteRecord;
    saveAllGroupInvitesMap(invitesMap);

    if (!group.pendingInviteIds.includes(String(targetUserId))) {
        group.pendingInviteIds.push(String(targetUserId));
        groupsMap[groupId] = group;
        saveAllGroupsMap(groupsMap);
    }

    dispatchPhase4Notification({
        recipientId: String(targetUserId),
        actorId: String(actorId),
        category: 'groupInvites',
        type: 'group_invitation',
        dedupKey: `grp_inv_${inviteId}`,
        message: `${actorProfile?.displayName || 'A friend'} invited you to join the group "${group.name}".`,
        metadata: { groupId, inviteId }
    });

    return { status: 'invited', invitation: inviteRecord };
}

export function getUserGroupInvitations(userId) {
    if (!userId) return [];
    const invitesMap = getAllGroupInvitesMap();
    return Object.values(invitesMap).filter(
        (inv) => String(inv.inviteeId) === String(userId) && inv.status === 'pending'
    );
}

export function respondToGroupInvitation({
    authenticatedUid,
    userId,
    inviteId,
    groupId = null,
    action = 'accept' // 'accept' | 'decline'
} = {}) {
    if (!authenticatedUid || !userId || String(authenticatedUid) !== String(userId)) {
        throw new Error('Unauthorized: Authenticated UID must match user ID.');
    }
    const invitesMap = getAllGroupInvitesMap();
    const resolvedId = inviteId || (groupId ? `ginv_${groupId}_${userId}` : null);
    const invite = resolvedId ? invitesMap[resolvedId] : null;
    if (!invite || String(invite.inviteeId) !== String(userId)) {
        throw new Error('Group invitation not found.');
    }
    if (invite.status !== 'pending') {
        throw new Error(`Invitation has already been ${invite.status}.`);
    }

    const groupsMap = getAllGroupsMap();
    const group = groupsMap[invite.groupId];
    if (!group) throw new Error('Group no longer exists.');

    const nowIso = new Date().toISOString();
    invite.status = action === 'accept' ? 'accepted' : 'declined';
    invite.updatedAt = nowIso;
    invitesMap[invite.id] = invite;
    saveAllGroupInvitesMap(invitesMap);

    group.pendingInviteIds = (group.pendingInviteIds || []).filter((id) => id !== String(userId));

    if (action === 'accept') {
        if (!group.memberIds.includes(String(userId))) {
            group.memberIds.push(String(userId));
            group.roles[String(userId)] = 'member';
        }
        group.updatedAt = nowIso;
        groupsMap[group.id] = group;
        saveAllGroupsMap(groupsMap);

        upsertGroupConversationInMessenger({
            id: group.conversationId,
            type: 'group',
            groupId: group.id,
            title: group.name,
            avatarUrl: group.avatarUrl,
            creatorId: group.creatorId,
            adminIds: group.adminIds,
            participants: group.memberIds
        });

        const userProf = getPublicProfile(userId);
        sendMessage({
            conversationId: group.conversationId,
            senderId: String(userId),
            authenticatedUid: String(userId),
            type: MESSAGE_TYPES.SYSTEM,
            text: `${userProf?.displayName || 'A student'} joined the group.`,
            systemEvent: 'member_joined'
        });

        return { invitation: invite, group: getGroupDetails(group.id, userId) };
    }

    groupsMap[group.id] = group;
    saveAllGroupsMap(groupsMap);
    return { invitation: invite, group: null };
}

/**
 * Removes a member from a group. Requires administrator privileges.
 */
export function removeGroupMember({
    authenticatedUid,
    actorId,
    groupId,
    targetUserId
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized: Authenticated UID must match actor ID.');
    }
    const groupsMap = getAllGroupsMap();
    const group = groupsMap[groupId];
    if (!group) throw new Error('Group not found.');

    const isAdmin = group.roles?.[actorId] === 'admin' || group.adminIds?.includes(String(actorId));
    if (!isAdmin) {
        throw new Error('Permission denied: Only group administrators can remove members.');
    }
    if (String(targetUserId) === String(group.creatorId)) {
        throw new Error('Cannot remove the original group creator.');
    }
    if (!group.memberIds.includes(String(targetUserId))) {
        throw new Error('User is not a member of this group.');
    }

    group.memberIds = group.memberIds.filter((id) => id !== String(targetUserId));
    group.adminIds = (group.adminIds || []).filter((id) => id !== String(targetUserId));
    delete group.roles[String(targetUserId)];
    group.updatedAt = new Date().toISOString();
    groupsMap[groupId] = group;
    saveAllGroupsMap(groupsMap);

    upsertGroupConversationInMessenger({
        id: group.conversationId,
        type: 'group',
        groupId: group.id,
        title: group.name,
        avatarUrl: group.avatarUrl,
        creatorId: group.creatorId,
        adminIds: group.adminIds,
        participants: group.memberIds
    });

    return getGroupDetails(groupId, actorId);
}

export function setGroupMemberRole({
    authenticatedUid,
    actorId,
    groupId,
    targetUserId,
    role = 'admin' // 'admin' | 'member'
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized.');
    }
    const groupsMap = getAllGroupsMap();
    const group = groupsMap[groupId];
    if (!group) throw new Error('Group not found.');
    if (group.roles?.[actorId] !== 'admin' && !group.adminIds?.includes(String(actorId))) {
        throw new Error('Permission denied: Only group administrators can change member roles.');
    }
    if (!group.memberIds.includes(String(targetUserId))) {
        throw new Error('Target user is not a member of this group.');
    }

    group.roles[String(targetUserId)] = role;
    if (role === 'admin' && !group.adminIds.includes(String(targetUserId))) {
        group.adminIds.push(String(targetUserId));
    } else if (role === 'member' && String(targetUserId) !== String(group.creatorId)) {
        group.adminIds = group.adminIds.filter((id) => id !== String(targetUserId));
    }
    group.updatedAt = new Date().toISOString();
    groupsMap[groupId] = group;
    saveAllGroupsMap(groupsMap);
    return getGroupDetails(groupId, actorId);
}

/**
 * Allows a member to leave a group voluntarily.
 */
export function leaveConnectGroup({
    authenticatedUid,
    userId,
    groupId
} = {}) {
    if (!authenticatedUid || !userId || String(authenticatedUid) !== String(userId)) {
        throw new Error('Unauthorized: Authenticated UID must match user ID.');
    }
    const groupsMap = getAllGroupsMap();
    const group = groupsMap[groupId];
    if (!group) throw new Error('Group not found.');
    if (!group.memberIds.includes(String(userId))) {
        throw new Error('You are not a member of this group.');
    }

    const userProf = getPublicProfile(userId);
    sendMessage({
        conversationId: group.conversationId,
        senderId: String(userId),
        authenticatedUid: String(userId),
        type: MESSAGE_TYPES.SYSTEM,
        text: `${userProf?.displayName || 'A member'} left the group.`,
        systemEvent: 'member_left'
    });

    group.memberIds = group.memberIds.filter((id) => id !== String(userId));
    group.adminIds = (group.adminIds || []).filter((id) => id !== String(userId));
    delete group.roles[String(userId)];

    // If no admin remains but members still exist, promote the earliest remaining member
    if (group.memberIds.length > 0 && group.adminIds.length === 0) {
        const nextAdmin = group.memberIds[0];
        group.adminIds = [nextAdmin];
        group.roles[nextAdmin] = 'admin';
    }

    group.updatedAt = new Date().toISOString();
    groupsMap[groupId] = group;
    saveAllGroupsMap(groupsMap);

    upsertGroupConversationInMessenger({
        id: group.conversationId,
        type: 'group',
        groupId: group.id,
        title: group.name,
        avatarUrl: group.avatarUrl,
        creatorId: group.creatorId,
        adminIds: group.adminIds,
        participants: group.memberIds
    });

    return { left: true, groupId, remainingMemberCount: group.memberIds.length };
}

/**
 * Sends a message in a group conversation (supports text, image, location, system, payment cards).
 * Strictly enforces group membership.
 */
export function sendGroupMessage({
    authenticatedUid,
    senderId,
    groupId,
    type = MESSAGE_TYPES.TEXT,
    text = '',
    attachment = null,
    location = null,
    replyTo = null,
    paymentMetadata = null
} = {}) {
    if (!authenticatedUid || !senderId || String(authenticatedUid) !== String(senderId)) {
        throw new Error('Unauthorized: Authenticated UID must match sender ID.');
    }
    const group = getGroupDetails(groupId, senderId);
    const msg = sendMessage({
        conversationId: group.conversationId,
        senderId: String(senderId),
        authenticatedUid: String(authenticatedUid),
        type,
        text,
        attachment,
        location,
        replyTo,
        paymentMetadata
    });

    // Notify other group members according to their Phase 4 groupMessages preference
    const senderProf = getPublicProfile(senderId);
    for (const mid of group.memberIds) {
        if (mid === String(senderId)) continue;
        dispatchPhase4Notification({
            recipientId: mid,
            actorId: String(senderId),
            category: 'groupMessages',
            type: 'group_message',
            dedupKey: `grp_msg_${msg.id}_${mid}`,
            message: `[${group.name}] ${senderProf?.displayName || 'Member'}: ${sanitizeText(text || type, 60)}`,
            metadata: { groupId, conversationId: group.conversationId, messageId: msg.id }
        });
    }

    return msg;
}

export function getGroupMessages(groupId, viewerId, options = {}) {
    const group = getGroupDetails(groupId, viewerId);
    return getConversationMessages(group.conversationId, viewerId, options);
}

export function subscribeToGroupMessages(groupId, viewerId, onUpdate, options = {}) {
    const group = getGroupDetails(groupId, viewerId);
    return subscribeToConversationMessages(group.conversationId, viewerId, onUpdate, options);
}

export async function uploadGroupImage({ groupId, senderId, file, previewUrl = null }) {
    const group = getGroupDetails(groupId, senderId);
    return uploadConversationImage({
        conversationId: group.conversationId,
        senderId,
        file,
        previewUrl
    });
}

export function getGroupAttachment(groupId, storagePath, viewerId) {
    const group = getGroupDetails(groupId, viewerId);
    return getAttachmentForParticipant(group.conversationId, storagePath, viewerId);
}

// ---------------------------------------------------------------------------
// 2. Group Demo Wallet Interactions (No Shared Pool — Individual Demo Wallets)
// ---------------------------------------------------------------------------

/**
 * Splits an expense among group members using simulated demo currency (`RM`).
 * - Example: 5 students in a group share a RM100 expense -> Equal split creates RM20 per student.
 * - Creator's RM20 is marked paid; each of the 4 other students receives a RM20 pending share.
 * - No shared pool of money is created; individual demo wallets remain separate.
 * - Each payment requires explicit approval (`confirmed: true`) from that member.
 */
export function createGroupDemoSplitBill({
    authenticatedUid,
    creatorId,
    groupId,
    title = 'Group Expense Split',
    totalAmount,
    splitMode = 'equal', // 'equal' | 'custom'
    participants = null, // defaults to all group members
    includeCreator = true
} = {}) {
    if (!authenticatedUid || !creatorId || String(authenticatedUid) !== String(creatorId)) {
        throw new Error('Unauthorized: Authenticated UID must match creator ID.');
    }
    const group = getGroupDetails(groupId, creatorId);

    const targetParticipants =
        Array.isArray(participants) && participants.length > 0
            ? participants
            : group.memberIds.filter((id) => id !== String(creatorId));

    // Verify every participant is a member of this group
    for (const item of targetParticipants) {
        const uid = typeof item === 'object' ? String(item.userId || item.id || '') : String(item || '');
        if (uid && !group.memberIds.includes(uid)) {
            throw new Error(`User "${uid}" is not a member of group "${group.name}".`);
        }
    }

    const result = createDemoSplitBill({
        authenticatedUid: String(creatorId),
        creatorId: String(creatorId),
        title: `[${group.name}] ${sanitizeText(title, 70)}`,
        totalAmount,
        splitMode,
        participants: targetParticipants,
        includeCreator,
        conversationId: group.conversationId,
        postToChat: true
    });

    // Attach groupId metadata to the split bill
    result.splitBill.groupId = groupId;
    result.splitBill.groupName = group.name;
    result.splitBill.noSharedPoolDisclaimer =
        'Individual Demo Wallets Only — No shared pool of funds. Each member approves their own simulated RM transfer.';

    // Notify each pending member
    for (const p of result.splitBill.participants) {
        if (p.isCreator) continue;
        dispatchPhase4Notification({
            recipientId: p.userId,
            actorId: String(creatorId),
            category: 'paymentRequests',
            type: 'group_split_bill',
            dedupKey: `grp_split_${result.splitBill.id}_${p.userId}`,
            message: `[DEMO] ${result.splitBill.creatorName} split RM${result.splitBill.totalAmount.toFixed(2)} in "${group.name}" — Your share: RM${p.amountOwed.toFixed(2)}`,
            metadata: {
                groupId,
                splitBillId: result.splitBill.id,
                amount: p.amountOwed
            }
        });
    }

    return result;
}

/**
 * Pays a member's share of a group split bill.
 * - Requires explicit approval (`confirmed === true`).
 * - Atomically transfers simulated RM from `payerId`'s individual Demo Wallet to the creator's Demo Wallet.
 * - Awards the `helpful_friend` achievement badge.
 */
export async function payGroupDemoSplitShare({
    authenticatedUid,
    payerId,
    groupId,
    splitBillId,
    confirmed = true,
    idempotencyKey = null
} = {}) {
    if (!authenticatedUid || !payerId || String(authenticatedUid) !== String(payerId)) {
        throw new Error('Unauthorized: Authenticated UID must match payer ID.');
    }
    if (confirmed !== true) {
        throw new Error('Explicit user approval is required before paying a group split bill share.');
    }

    const group = getGroupDetails(groupId, payerId);
    const res = await payDemoSplitBillShare({
        authenticatedUid: String(payerId),
        payerId: String(payerId),
        splitBillId,
        idempotencyKey
    });

    // Award Helpful Friend gamification badge for settling group split bill
    awardGamificationAchievement(String(payerId), 'helpful_friend');

    dispatchPhase4Notification({
        recipientId: res.splitBill.creatorId,
        actorId: String(payerId),
        category: 'splitBillUpdates',
        type: 'group_split_paid',
        dedupKey: `grp_split_paid_${splitBillId}_${payerId}`,
        message: `[DEMO] A member paid their RM${res.transferResult.transferReference.amount.toFixed(2)} share in "${group.name}" (Remaining: RM${res.splitBill.outstandingAmount.toFixed(2)}).`,
        metadata: {
            groupId,
            splitBillId,
            outstandingAmount: res.splitBill.outstandingAmount
        }
    });

    return res;
}

/**
 * Requests simulated demo RM from one or more members of a group.
 */
export function createGroupDemoPaymentRequest({
    authenticatedUid,
    requesterId,
    groupId,
    targetMemberIds = [],
    amountPerMember,
    note = ''
} = {}) {
    if (!authenticatedUid || !requesterId || String(authenticatedUid) !== String(requesterId)) {
        throw new Error('Unauthorized: Authenticated UID must match requester ID.');
    }
    const group = getGroupDetails(groupId, requesterId);
    const recipients = (targetMemberIds.length > 0 ? targetMemberIds : group.memberIds).filter(
        (uid) => String(uid) !== String(requesterId)
    );
    if (recipients.length === 0) {
        throw new Error('Select at least one group member to request demo money from.');
    }

    const createdRequests = [];
    for (const rid of recipients) {
        if (!group.memberIds.includes(String(rid))) {
            throw new Error(`User "${rid}" is not a member of this group.`);
        }
        const { request } = createDemoPaymentRequest({
            authenticatedUid: String(requesterId),
            requesterId: String(requesterId),
            recipientId: String(rid),
            amount: amountPerMember,
            note: `[${group.name}] ${note || 'Group payment request'}`,
            conversationId: group.conversationId,
            postToChat: true
        });
        createdRequests.push(request);
    }

    return {
        groupId,
        requests: createdRequests,
        simulationLabel: DEMO_WALLET_BANNER_TEXT
    };
}

/**
 * Sends a payment reminder to unpaid members of a group split bill.
 */
export function sendGroupPaymentReminder({
    authenticatedUid,
    actorId,
    groupId,
    splitBillId
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized.');
    }
    const group = getGroupDetails(groupId, actorId);
    const bills = getUserDemoSplitBills(actorId);
    const bill = bills.find((b) => b.id === splitBillId);
    if (!bill) {
        throw new Error('Split bill not found.');
    }
    if (String(bill.creatorId) !== String(actorId) && !group.isViewerAdmin) {
        throw new Error('Only the bill creator or a group admin can send payment reminders.');
    }

    const pendingParticipants = bill.participants.filter((p) => p.status === 'pending');
    if (pendingParticipants.length === 0) {
        throw new Error('All group members have already paid their share.');
    }

    const remindedUserIds = [];
    for (const p of pendingParticipants) {
        dispatchPhase4Notification({
            recipientId: p.userId,
            actorId: String(actorId),
            category: 'splitBillUpdates',
            type: 'group_payment_reminder',
            dedupKey: `grp_remind_${splitBillId}_${p.userId}_${Date.now()}`,
            message: `[DEMO REMINDER] Friendly reminder for "${bill.title}" in ${group.name}: RM${p.amountOwed.toFixed(2)} pending.`,
            metadata: { groupId, splitBillId, amountOwed: p.amountOwed }
        });
        remindedUserIds.push(p.userId);
    }

    sendMessage({
        conversationId: group.conversationId,
        senderId: String(actorId),
        authenticatedUid: String(actorId),
        type: MESSAGE_TYPES.SYSTEM,
        text: `⏰ Demo Payment Reminder sent for "${bill.title}" (${pendingParticipants.length} pending, RM${bill.outstandingAmount.toFixed(2)} outstanding).`,
        systemEvent: 'payment_reminder'
    });

    return {
        splitBillId,
        remindedCount: remindedUserIds.length,
        remindedUserIds,
        outstandingAmount: bill.outstandingAmount
    };
}

export function getGroupSplitBills(groupId, viewerId) {
    const group = getGroupDetails(groupId, viewerId);
    const allBills = getUserDemoSplitBills(viewerId);
    return allBills.filter(
        (b) => b.groupId === groupId || b.conversationId === group.conversationId
    );
}

// ---------------------------------------------------------------------------
// 3. Group Savings Challenges (Declared Progress Only — No Funds Deducted)
// ---------------------------------------------------------------------------

function getAllChallengesMap() {
    return readP4Store(PHASE4_STORAGE_KEYS.SAVINGS_CHALLENGES, () => ({}));
}

function saveAllChallengesMap(map) {
    writeP4Store(PHASE4_STORAGE_KEYS.SAVINGS_CHALLENGES, map);
}

function computeChallengeMetrics(challenge) {
    const targetAmount = roundRM(challenge.targetAmount || 0);
    const participants = Array.isArray(challenge.participants) ? challenge.participants : [];
    const totalDeclaredContributions = roundRM(
        participants.reduce((sum, p) => sum + Number(p.declaredAmount || 0), 0)
    );
    const remainingAmount = roundRM(Math.max(0, targetAmount - totalDeclaredContributions));
    const rawPct = targetAmount > 0 ? (totalDeclaredContributions / targetAmount) * 100 : 0;
    const completionPercentage = Math.min(100, Math.round(rawPct * 10) / 10);

    let daysRemaining = 0;
    if (challenge.deadline) {
        const diffMs = new Date(challenge.deadline).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
        ...challenge,
        overallTarget: targetAmount,
        totalDeclaredContributions,
        remainingAmount,
        completionPercentage,
        daysRemaining,
        status: completionPercentage >= 100 ? 'completed' : challenge.status || 'active',
        isDeclaredOnly: true,
        verifiedBalanceDeducted: false,
        disclaimer: SAVINGS_CHALLENGE_DISCLAIMER
    };
}

/**
 * Creates a Group Savings Challenge.
 * - Strictly records declared savings progress only.
 * - Never deducts money from personal bank accounts or demo wallets.
 */
export function createGroupSavingsChallenge({
    authenticatedUid,
    creatorId,
    groupId = null,
    title,
    description = '',
    targetAmount,
    deadlineDays = 30,
    deadline = null,
    individualTargetAmount = null,
    participantIds = [],
    invitedFriendIds = []
} = {}) {
    if (!authenticatedUid || !creatorId || String(authenticatedUid) !== String(creatorId)) {
        throw new Error('Unauthorized: Authenticated UID must match creator ID.');
    }

    const cleanTitle = sanitizeText(title || '', 90);
    if (!cleanTitle || cleanTitle.length < 3) {
        throw new Error('Savings challenge title must be at least 3 characters.');
    }

    const amtCheck = validateRMAmount(targetAmount, { maxAmount: 1000000 });
    if (!amtCheck.valid) {
        throw new Error(amtCheck.error);
    }
    const cleanTarget = amtCheck.amount;

    // Combine creator + initial participants
    const allMemberIds = Array.from(
        new Set([String(creatorId), ...participantIds.map(String), ...invitedFriendIds.map(String)])
    ).filter(Boolean);

    const perPersonDefault = roundRM(
        individualTargetAmount ? Number(individualTargetAmount) : cleanTarget / Math.max(1, allMemberIds.length)
    );

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const deadlineIso =
        deadline || new Date(nowMs + Math.max(1, Number(deadlineDays || 30)) * 24 * 60 * 60 * 1000).toISOString();

    const participants = allMemberIds.map((uid) => {
        const prof = getPublicProfile(uid);
        return {
            userId: uid,
            displayName: prof?.displayName || 'Student',
            handle: prof?.username || prof?.handle || 'student',
            avatarId: prof?.avatarId || 'cat',
            individualTarget: perPersonDefault,
            declaredAmount: 0,
            progressPercentage: 0,
            updatesCount: 0,
            joinedAt: nowIso,
            lastUpdatedAt: null
        };
    });

    phase4Seq += 1;
    const challengeId = `schal_${nowMs}_${phase4Seq}`;
    const rawChallenge = {
        id: challengeId,
        groupId: groupId || null,
        creatorId: String(creatorId),
        title: cleanTitle,
        description: sanitizeText(description || 'Collective student savings challenge', 240),
        targetAmount: cleanTarget,
        individualTargetAmount: perPersonDefault,
        currency: 'RM',
        deadline: deadlineIso,
        participants,
        milestonesReached: [], // [25, 50, 75, 100]
        celebrations: [],
        status: 'active',
        isDeclaredOnly: true,
        verifiedBalanceDeducted: false,
        disclaimer: SAVINGS_CHALLENGE_DISCLAIMER,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const hydrated = computeChallengeMetrics(rawChallenge);
    const map = getAllChallengesMap();
    map[challengeId] = hydrated;
    saveAllChallengesMap(map);

    // Award "First Savings Challenge" badge to participants
    for (const uid of allMemberIds) {
        awardGamificationAchievement(uid, 'first_savings_challenge');
        addGamificationPoints(uid, 20, 'Joined savings challenge');
        if (uid !== String(creatorId)) {
            dispatchPhase4Notification({
                recipientId: uid,
                actorId: String(creatorId),
                category: 'challengeInvites',
                type: 'challenge_invitation',
                dedupKey: `chal_inv_${challengeId}_${uid}`,
                message: `You were invited to the Group Savings Challenge "${cleanTitle}" (Target: RM${cleanTarget.toFixed(2)}).`,
                metadata: { challengeId, targetAmount: cleanTarget }
            });
        }
    }

    if (db) {
        setDoc(doc(db, 'savingsChallenges', challengeId), hydrated).catch(() => {});
    }

    return hydrated;
}

export function inviteFriendsToSavingsChallenge({
    authenticatedUid,
    actorId,
    challengeId,
    friendIds = []
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized.');
    }
    const map = getAllChallengesMap();
    const challenge = map[challengeId];
    if (!challenge) throw new Error('Savings challenge not found.');

    const isParticipant = challenge.participants.some((p) => p.userId === String(actorId));
    if (!isParticipant) {
        throw new Error('Only challenge participants can invite friends.');
    }

    const nowIso = new Date().toISOString();
    for (const rawId of friendIds) {
        const fid = String(rawId || '');
        if (!fid || challenge.participants.some((p) => p.userId === fid)) continue;
        if (isBlockedBetween(actorId, fid)) continue;

        const prof = getPublicProfile(fid);
        challenge.participants.push({
            userId: fid,
            displayName: prof?.displayName || 'Student',
            handle: prof?.username || prof?.handle || 'student',
            avatarId: prof?.avatarId || 'cat',
            individualTarget: challenge.individualTargetAmount,
            declaredAmount: 0,
            progressPercentage: 0,
            updatesCount: 0,
            joinedAt: nowIso,
            lastUpdatedAt: null
        });

        awardGamificationAchievement(fid, 'first_savings_challenge');
        dispatchPhase4Notification({
            recipientId: fid,
            actorId: String(actorId),
            category: 'challengeInvites',
            type: 'challenge_invitation',
            dedupKey: `chal_inv_${challengeId}_${fid}`,
            message: `Invited to Group Savings Challenge "${challenge.title}" (Target: RM${challenge.targetAmount.toFixed(2)}).`,
            metadata: { challengeId }
        });
    }

    challenge.updatedAt = nowIso;
    const updated = computeChallengeMetrics(challenge);
    map[challengeId] = updated;
    saveAllChallengesMap(map);
    return updated;
}

/**
 * Updates a participant's voluntary declared savings contribution.
 * - Never deducts from real bank accounts or demo wallets.
 * - Tracks milestones (25%, 50%, 75%, 100%) and triggers milestone celebrations & notifications.
 */
export function updateSavingsChallengeProgress({
    authenticatedUid,
    userId,
    challengeId,
    amountToAdd = null,
    newDeclaredTotal = null,
    note = ''
} = {}) {
    if (!authenticatedUid || !userId || String(authenticatedUid) !== String(userId)) {
        throw new Error('Unauthorized: You can only update your own declared savings progress.');
    }

    const map = getAllChallengesMap();
    const challenge = map[challengeId];
    if (!challenge) {
        throw new Error('Savings challenge not found.');
    }

    const idx = challenge.participants.findIndex((p) => String(p.userId) === String(userId));
    if (idx === -1) {
        throw new Error('Access denied: You are not a participant in this savings challenge.');
    }

    const participant = challenge.participants[idx];
    let nextDeclared = participant.declaredAmount;

    if (newDeclaredTotal !== null && newDeclaredTotal !== undefined) {
        const num = Number(newDeclaredTotal);
        if (!Number.isFinite(num) || num < 0) {
            throw new Error('Declared savings amount must be RM0.00 or greater.');
        }
        nextDeclared = roundRM(num);
    } else if (amountToAdd !== null && amountToAdd !== undefined) {
        const v = validateRMAmount(amountToAdd, { maxAmount: 1000000 });
        if (!v.valid) throw new Error(v.error);
        nextDeclared = roundRM(participant.declaredAmount + v.amount);
    } else {
        throw new Error('Please provide amountToAdd or newDeclaredTotal.');
    }

    const nowIso = new Date().toISOString();
    const indTarget = Number(participant.individualTarget || challenge.individualTargetAmount || 1);
    const indPct = Math.min(100, Math.round((nextDeclared / Math.max(1, indTarget)) * 1000) / 10);

    challenge.participants[idx] = {
        ...participant,
        declaredAmount: nextDeclared,
        progressPercentage: indPct,
        updatesCount: Number(participant.updatesCount || 0) + 1,
        lastNote: sanitizeText(note || '', 120),
        lastUpdatedAt: nowIso
    };

    challenge.updatedAt = nowIso;
    const updated = computeChallengeMetrics(challenge);

    // Check milestones: 25%, 50%, 75%, 100%
    const MILESTONES = [25, 50, 75, 100];
    const newlyReached = [];
    for (const m of MILESTONES) {
        if (updated.completionPercentage >= m && !updated.milestonesReached.includes(m)) {
            updated.milestonesReached.push(m);
            newlyReached.push(m);
            updated.celebrations.push({
                milestonePct: m,
                triggeredBy: String(userId),
                triggeredByName: participant.displayName,
                message:
                    m === 100
                        ? `🎉 Challenge Completed! "${updated.title}" reached 100% (RM${updated.totalDeclaredContributions.toFixed(2)})!`
                        : `🌟 Milestone Reached! "${updated.title}" passed ${m}% of its RM${updated.overallTarget.toFixed(2)} target!`,
                reachedAt: nowIso
            });
        }
    }

    map[challengeId] = updated;
    saveAllChallengesMap(map);

    // Gamification rewards
    addGamificationPoints(String(userId), 15, 'Updated savings challenge progress');
    if (challenge.participants[idx].updatesCount >= 3) {
        awardGamificationAchievement(String(userId), 'consistent_saver');
        awardGamificationAchievement(String(userId), 'budget_master');
    }
    if (indPct >= 100 || updated.completionPercentage >= 100) {
        awardGamificationAchievement(String(userId), 'challenge_completed');
    }
    if (updated.completionPercentage >= 100) {
        for (const part of updated.participants) {
            awardGamificationAchievement(part.userId, 'challenge_completed');
        }
    }

    // Dispatch milestone notifications to all participants
    if (newlyReached.length > 0) {
        const highestMilestone = newlyReached[newlyReached.length - 1];
        for (const part of updated.participants) {
            if (part.userId === String(userId)) continue;
            dispatchPhase4Notification({
                recipientId: part.userId,
                actorId: String(userId),
                category: 'challengeMilestones',
                type: 'challenge_milestone',
                dedupKey: `chal_ms_${challengeId}_${highestMilestone}_${part.userId}`,
                message: `🎉 "${updated.title}" reached the ${highestMilestone}% milestone (RM${updated.totalDeclaredContributions.toFixed(2)} / RM${updated.overallTarget.toFixed(2)})!`,
                metadata: { challengeId, milestonePct: highestMilestone }
            });
        }
    }

    if (db) {
        setDoc(doc(db, 'savingsChallenges', challengeId), updated, { merge: true }).catch(() => {});
    }

    return {
        challenge: updated,
        newlyReachedMilestones: newlyReached
    };
}

export function getSavingsChallenge(challengeId, viewerId) {
    const map = getAllChallengesMap();
    const challenge = map[challengeId];
    if (!challenge) throw new Error('Savings challenge not found.');
    if (
        viewerId &&
        !challenge.participants.some((p) => String(p.userId) === String(viewerId))
    ) {
        throw new Error('Access denied: You are not a participant of this savings challenge.');
    }
    return computeChallengeMetrics(challenge);
}

export function getUserSavingsChallenges(userId) {
    if (!userId) return [];
    const map = getAllChallengesMap();
    return Object.values(map)
        .filter((c) => Array.isArray(c.participants) && c.participants.some((p) => String(p.userId) === String(userId)))
        .map((c) => computeChallengeMetrics(c))
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

// ---------------------------------------------------------------------------
// 4. Leaderboards & Achievements (Points & Habits Only — Never Wealth/Balances)
// ---------------------------------------------------------------------------

function getAllGamificationMap() {
    return readP4Store(PHASE4_STORAGE_KEYS.GAMIFICATION, () => ({}));
}

function saveAllGamificationMap(map) {
    writeP4Store(PHASE4_STORAGE_KEYS.GAMIFICATION, map);
}

export function ensureUserGamificationRecord(userId) {
    if (!userId) return null;
    const map = getAllGamificationMap();
    const prof = getPublicProfile(userId);
    if (!map[userId]) {
        const existingBadges = Array.isArray(prof?.achievements) ? [...prof.achievements] : ['early_adopter'];
        map[userId] = {
            userId: String(userId),
            points: existingBadges.length * 40,
            achievementIds: existingBadges,
            leaderboardOptIn: prof?.privacySettings?.showOnLeaderboards !== false,
            updatedAt: new Date().toISOString()
        };
        saveAllGamificationMap(map);
    }
    return { ...map[userId] };
}

export function awardGamificationAchievement(userId, achievementId) {
    if (!userId || !achievementId) return null;
    const map = getAllGamificationMap();
    const rec = map[userId] || ensureUserGamificationRecord(userId);
    const badgeMeta = PROFILE_ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!badgeMeta) return rec;

    if (!rec.achievementIds.includes(achievementId)) {
        rec.achievementIds.push(achievementId);
        rec.points = Number(rec.points || 0) + Number(badgeMeta.points || 50);
        rec.updatedAt = new Date().toISOString();
        map[userId] = rec;
        saveAllGamificationMap(map);
    }
    return { ...rec };
}

export function addGamificationPoints(userId, pointsDelta = 10) {
    if (!userId) return null;
    const map = getAllGamificationMap();
    const rec = map[userId] || ensureUserGamificationRecord(userId);
    rec.points = Math.max(0, Number(rec.points || 0) + Number(pointsDelta || 0));
    rec.updatedAt = new Date().toISOString();
    map[userId] = rec;
    saveAllGamificationMap(map);
    return { ...rec };
}

/**
 * Allows a user to opt in or opt out of public leaderboards.
 */
export function setLeaderboardOptIn(userId, optIn = true) {
    if (!userId) throw new Error('User ID is required.');
    const map = getAllGamificationMap();
    const rec = map[userId] || ensureUserGamificationRecord(userId);
    rec.leaderboardOptIn = Boolean(optIn);
    rec.updatedAt = new Date().toISOString();
    map[userId] = rec;
    saveAllGamificationMap(map);

    try {
        updateProfilePrivacySettings(userId, { showOnLeaderboards: Boolean(optIn) });
    } catch {
        // ignore if profile not yet initialized
    }

    return { ...rec };
}

/**
 * Computes privacy-safe social leaderboards:
 * - Categories: 'challenge_progress' | 'participation' | 'achievements'
 * - Strictly excludes users who opted out (`leaderboardOptIn === false` or `privacySettings.showOnLeaderboards === false`).
 * - NEVER exposes bank balances, demo wallet balances, net worth, or private transactions.
 */
export function getConnectLeaderboard({
    category = 'challenge_progress', // 'challenge_progress' | 'participation' | 'achievements'
    viewerId = null,
    candidateUserIds = []
} = {}) {
    const challengesMap = getAllChallengesMap();
    const allChallenges = Object.values(challengesMap).map(computeChallengeMetrics);
    const gamMap = getAllGamificationMap();

    const userSet = new Set(Object.keys(gamMap));
    for (const c of allChallenges) {
        for (const p of c.participants || []) {
            userSet.add(p.userId);
        }
    }
    for (const uid of candidateUserIds) {
        if (uid) userSet.add(String(uid));
    }

    const entries = [];
    for (const uid of userSet) {
        if (viewerId && isBlockedBetween(viewerId, uid)) continue;
        const prof = getPublicProfile(uid);
        const gam = ensureUserGamificationRecord(uid);

        const optedIn =
            gam.leaderboardOptIn !== false && prof?.privacySettings?.showOnLeaderboards !== false;
        if (!optedIn) {
            continue;
        }

        const userChallenges = allChallenges.filter((c) =>
            c.participants.some((p) => String(p.userId) === String(uid))
        );
        const participationCount = userChallenges.length;
        let avgProgressPct = 0;
        if (participationCount > 0) {
            const totalPct = userChallenges.reduce((sum, c) => {
                const p = c.participants.find((x) => String(x.userId) === String(uid));
                return sum + Number(p?.progressPercentage || 0);
            }, 0);
            avgProgressPct = Math.round((totalPct / participationCount) * 10) / 10;
        }

        const badgeList = (gam.achievementIds || [])
            .map((id) => PROFILE_ACHIEVEMENTS.find((a) => a.id === id))
            .filter(Boolean);

        // Strictly no balance, wealth, or private transaction fields!
        entries.push({
            userId: String(uid),
            displayName: prof?.displayName || 'Campus Student',
            username: prof?.username || prof?.handle || 'student',
            handle: prof?.handle || prof?.username || 'student',
            avatarId: prof?.avatarId || 'cat',
            university: prof?.university || 'KampusKash',
            points: Number(gam.points || 0),
            challengeParticipationCount: participationCount,
            challengeProgressPercentage: avgProgressPct,
            achievementCount: badgeList.length,
            achievements: badgeList
        });
    }

    entries.sort((a, b) => {
        if (category === 'participation') {
            if (b.challengeParticipationCount !== a.challengeParticipationCount) {
                return b.challengeParticipationCount - a.challengeParticipationCount;
            }
            return b.points - a.points;
        }
        if (category === 'achievements') {
            if (b.achievementCount !== a.achievementCount) {
                return b.achievementCount - a.achievementCount;
            }
            return b.points - a.points;
        }
        // Default: 'challenge_progress'
        if (b.challengeProgressPercentage !== a.challengeProgressPercentage) {
            return b.challengeProgressPercentage - a.challengeProgressPercentage;
        }
        return b.points - a.points;
    });

    return entries.map((item, idx) => ({
        rank: idx + 1,
        ...item
    }));
}

// ---------------------------------------------------------------------------
// 5 & 6. Student Communities & Moderation Controls
// ---------------------------------------------------------------------------

function getAllCommunitiesMap() {
    const map = readP4Store(PHASE4_STORAGE_KEYS.COMMUNITIES, () => null);
    if (map && Object.keys(map).length > 0) {
        return map;
    }
    const seeded = {};
    const nowIso = '2026-01-10T08:00:00.000Z';
    for (const item of DEFAULT_STUDENT_COMMUNITIES) {
        seeded[item.id] = {
            ...item,
            creatorId: 'system_campus_admin',
            adminIds: ['system_campus_admin'],
            memberIds: [],
            restrictedMembers: {}, // { [userId]: { type: 'mute' | 'ban', reason, updatedAt } }
            guidelines: COMMUNITY_GUIDELINES,
            postCount: 0,
            createdAt: nowIso,
            updatedAt: nowIso
        };
    }
    writeP4Store(PHASE4_STORAGE_KEYS.COMMUNITIES, seeded);
    return seeded;
}

function saveAllCommunitiesMap(map) {
    writeP4Store(PHASE4_STORAGE_KEYS.COMMUNITIES, map);
}

function getAllCommunityPostsList() {
    return readP4Store(PHASE4_STORAGE_KEYS.COMMUNITY_POSTS, () => []);
}

function saveAllCommunityPostsList(list) {
    writeP4Store(PHASE4_STORAGE_KEYS.COMMUNITY_POSTS, list);
}

function getAllCommunityCommentsList() {
    return readP4Store(PHASE4_STORAGE_KEYS.COMMUNITY_COMMENTS, () => []);
}

function saveAllCommunityCommentsList(list) {
    writeP4Store(PHASE4_STORAGE_KEYS.COMMUNITY_COMMENTS, list);
}

function getAllCommunityReportsList() {
    return readP4Store(PHASE4_STORAGE_KEYS.COMMUNITY_REPORTS, () => []);
}

function saveAllCommunityReportsList(list) {
    writeP4Store(PHASE4_STORAGE_KEYS.COMMUNITY_REPORTS, list);
}

/**
 * Sensitive Financial Information Guard for Public Communities:
 * Rejects posts/comments that attempt to expose 10-16 digit bank account / card numbers
 * or private OTP/TAC/PIN credentials.
 */
export function checkCommunityFinancialPrivacyGuard(text = '') {
    const raw = String(text || '');
    if (/\b\d{10,16}\b/.test(raw)) {
        return {
            safe: false,
            error: 'Safety Protection: Never share bank account numbers or card numbers in public student communities.'
        };
    }
    if (/\b(tac|otp|cvv|pin\s*code)\s*[:=-]?\s*\d{3,8}\b/i.test(raw)) {
        return {
            safe: false,
            error: 'Safety Protection: Never share private PIN, OTP, or TAC codes in public communities.'
        };
    }
    return { safe: true };
}

export function discoverCommunities({ searchQuery = '', category = '', viewerId = null } = {}) {
    const map = getAllCommunitiesMap();
    const q = String(searchQuery || '').trim().toLowerCase();
    const cat = String(category || '').trim().toLowerCase();

    return Object.values(map)
        .filter((c) => {
            if (cat && cat !== 'all' && String(c.category || '').toLowerCase() !== cat) {
                return false;
            }
            if (!q) return true;
            return (
                (c.name || '').toLowerCase().includes(q) ||
                (c.description || '').toLowerCase().includes(q) ||
                (c.category || '').toLowerCase().includes(q)
            );
        })
        .map((c) => ({
            ...c,
            memberCount: Array.isArray(c.memberIds) ? c.memberIds.length : 0,
            isJoined: viewerId ? Boolean(c.memberIds?.includes(String(viewerId))) : false,
            isAdmin: viewerId ? Boolean(c.adminIds?.includes(String(viewerId))) : false
        }));
}

export function createStudentCommunity({
    authenticatedUid,
    creatorId,
    name,
    category = 'Campus',
    icon = '🏛️',
    description = ''
} = {}) {
    if (!authenticatedUid || !creatorId || String(authenticatedUid) !== String(creatorId)) {
        throw new Error('Unauthorized.');
    }
    const cleanName = sanitizeText(name || '', 60);
    const cleanDesc = sanitizeText(description || '', 240);
    if (!cleanName || cleanName.length < 3) {
        throw new Error('Community name must be at least 3 characters.');
    }
    const mod = checkProfanityAndSpam(`${cleanName} ${cleanDesc}`);
    if (!mod.valid) throw new Error(mod.error);

    phase4Seq += 1;
    const nowIso = new Date().toISOString();
    const communityId = `comm_${Date.now()}_${phase4Seq}`;
    const record = {
        id: communityId,
        name: cleanName,
        category: sanitizeText(category || 'Campus', 30),
        icon: icon || '🏛️',
        description: cleanDesc,
        creatorId: String(creatorId),
        adminIds: [String(creatorId)],
        memberIds: [String(creatorId)],
        restrictedMembers: {},
        guidelines: COMMUNITY_GUIDELINES,
        postCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const map = getAllCommunitiesMap();
    map[communityId] = record;
    saveAllCommunitiesMap(map);
    return {
        ...record,
        memberCount: 1,
        isJoined: true,
        isAdmin: true
    };
}

export function joinCommunity({ authenticatedUid, userId, communityId } = {}) {
    if (!authenticatedUid || !userId || String(authenticatedUid) !== String(userId)) {
        throw new Error('Unauthorized: Authenticated UID must match user ID.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');

    const restriction = comm.restrictedMembers?.[String(userId)];
    if (restriction?.type === 'ban') {
        throw new Error('You are restricted from joining this community due to a policy violation.');
    }

    if (!comm.memberIds.includes(String(userId))) {
        comm.memberIds.push(String(userId));
        // If no user admin is assigned yet on a seeded community, allow the first joining user or explicit admin API
        comm.updatedAt = new Date().toISOString();
        map[communityId] = comm;
        saveAllCommunitiesMap(map);
    }

    return {
        ...comm,
        memberCount: comm.memberIds.length,
        isJoined: true,
        isAdmin: comm.adminIds.includes(String(userId))
    };
}

export function leaveCommunity({ authenticatedUid, userId, communityId } = {}) {
    if (!authenticatedUid || !userId || String(authenticatedUid) !== String(userId)) {
        throw new Error('Unauthorized: Authenticated UID must match user ID.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');

    comm.memberIds = (comm.memberIds || []).filter((id) => id !== String(userId));
    comm.updatedAt = new Date().toISOString();
    map[communityId] = comm;
    saveAllCommunitiesMap(map);

    return {
        ...comm,
        memberCount: comm.memberIds.length,
        isJoined: false,
        isAdmin: comm.adminIds.includes(String(userId))
    };
}

export function promoteCommunityAdmin({ communityId, targetUserId }) {
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');
    if (!comm.adminIds.includes(String(targetUserId))) {
        comm.adminIds.push(String(targetUserId));
    }
    if (!comm.memberIds.includes(String(targetUserId))) {
        comm.memberIds.push(String(targetUserId));
    }
    map[communityId] = comm;
    saveAllCommunitiesMap(map);
    return comm;
}

/**
 * Creates a basic text discussion post inside a joined Student Community.
 * - Enforces community membership, member restrictions (mute/ban), spam/rate limits,
 *   profanity filter, and sensitive financial data protection.
 */
export function createCommunityPost({
    authenticatedUid,
    authorId,
    communityId,
    title = '',
    content,
    tag = 'Discussion'
} = {}) {
    if (!authenticatedUid || !authorId || String(authenticatedUid) !== String(authorId)) {
        throw new Error('Unauthorized: Authenticated UID must match author ID.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');

    if (!comm.memberIds.includes(String(authorId))) {
        throw new Error('You must join this community before posting.');
    }

    const restriction = comm.restrictedMembers?.[String(authorId)];
    if (restriction && (restriction.type === 'mute' || restriction.type === 'ban')) {
        throw new Error(`Posting restricted: Your account is currently ${restriction.type}d in this community.`);
    }

    const rate = checkRateLimit('post', String(authorId));
    if (!rate.allowed) {
        throw new Error(rate.error);
    }

    const cleanTitle = sanitizeText(title || '', 100);
    const cleanContent = sanitizeText(content || '', 1200);
    if (!cleanContent || cleanContent.length < 2) {
        throw new Error('Post content cannot be empty.');
    }

    const mod = checkProfanityAndSpam(`${cleanTitle} ${cleanContent}`);
    if (!mod.valid) {
        throw new Error(mod.error);
    }

    const finGuard = checkCommunityFinancialPrivacyGuard(`${cleanTitle} ${cleanContent}`);
    if (!finGuard.safe) {
        throw new Error(finGuard.error);
    }

    const authorProf = getPublicProfile(authorId);
    phase4Seq += 1;
    const nowIso = new Date().toISOString();
    const postId = `cpost_${Date.now()}_${phase4Seq}`;

    const post = {
        id: postId,
        seq: phase4Seq,
        communityId,
        communityName: comm.name,
        authorId: String(authorId),
        authorName: authorProf?.displayName || 'Student',
        authorHandle: authorProf?.username || authorProf?.handle || 'student',
        authorAvatar: authorProf?.avatarId || 'cat',
        authorUniversity: authorProf?.university || 'KampusKash',
        title: cleanTitle,
        content: cleanContent,
        tag: sanitizeText(tag || 'Discussion', 30),
        reactions: {}, // { [userId]: '👍' }
        commentCount: 0,
        status: 'active', // 'active' | 'removed'
        removedBy: null,
        removalReason: null,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const posts = getAllCommunityPostsList();
    posts.unshift(post);
    saveAllCommunityPostsList(posts);

    comm.postCount = Number(comm.postCount || 0) + 1;
    comm.updatedAt = nowIso;
    map[communityId] = comm;
    saveAllCommunitiesMap(map);

    awardGamificationAchievement(String(authorId), 'helpful_friend');
    addGamificationPoints(String(authorId), 10, 'Posted in student community');

    return { ...post };
}

export function getCommunityPosts(
    communityId,
    { viewerId = null, page = 1, pageSize = 10 } = {}
) {
    const allPosts = getAllCommunityPostsList().filter((p) => {
        if (p.communityId !== communityId) return false;
        if (p.status !== 'active') return false;
        if (viewerId && isBlockedBetween(viewerId, p.authorId)) return false;
        return true;
    });

    const limit = Math.max(1, Number(pageSize) || 10);
    const currentPage = Math.max(1, Number(page) || 1);
    const sliceEnd = currentPage * limit;
    const items = allPosts.slice(0, sliceEnd);

    return {
        posts: items,
        totalCount: allPosts.length,
        hasMore: allPosts.length > sliceEnd,
        page: currentPage,
        pageSize: limit
    };
}

export function toggleCommunityPostReaction({
    authenticatedUid,
    userId,
    communityId,
    postId,
    emoji = '👍'
} = {}) {
    if (!authenticatedUid || !userId || String(authenticatedUid) !== String(userId)) {
        throw new Error('Unauthorized.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm || !comm.memberIds.includes(String(userId))) {
        throw new Error('Join the community to react to posts.');
    }

    const posts = getAllCommunityPostsList();
    const idx = posts.findIndex((p) => p.id === postId && p.communityId === communityId);
    if (idx === -1 || posts[idx].status !== 'active') {
        throw new Error('Community post not found.');
    }

    const post = posts[idx];
    if (!post.reactions) post.reactions = {};

    if (post.reactions[String(userId)] === emoji) {
        delete post.reactions[String(userId)];
    } else {
        post.reactions[String(userId)] = emoji;
        if (post.authorId !== String(userId)) {
            dispatchPhase4Notification({
                recipientId: post.authorId,
                actorId: String(userId),
                category: 'communityInteractions',
                type: 'community_reaction',
                dedupKey: `comm_react_${postId}_${userId}`,
                message: `reacted ${emoji} to your post in ${comm.name}.`,
                metadata: { communityId, postId }
            });
        }
    }

    post.updatedAt = new Date().toISOString();
    posts[idx] = post;
    saveAllCommunityPostsList(posts);
    return { ...post };
}

export function addCommunityComment({
    authenticatedUid,
    authorId,
    communityId,
    postId,
    content
} = {}) {
    if (!authenticatedUid || !authorId || String(authenticatedUid) !== String(authorId)) {
        throw new Error('Unauthorized: Authenticated UID must match author ID.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm || !comm.memberIds.includes(String(authorId))) {
        throw new Error('You must be a member of this community to comment.');
    }

    const restriction = comm.restrictedMembers?.[String(authorId)];
    if (restriction && (restriction.type === 'mute' || restriction.type === 'ban')) {
        throw new Error(`Commenting restricted: Your account is currently ${restriction.type}d in this community.`);
    }

    const rate = checkRateLimit('comment', String(authorId));
    if (!rate.allowed) {
        throw new Error(rate.error);
    }

    const cleanContent = sanitizeText(content || '', 600);
    if (!cleanContent) {
        throw new Error('Comment cannot be empty.');
    }

    const mod = checkProfanityAndSpam(cleanContent);
    if (!mod.valid) throw new Error(mod.error);

    const finGuard = checkCommunityFinancialPrivacyGuard(cleanContent);
    if (!finGuard.safe) throw new Error(finGuard.error);

    const posts = getAllCommunityPostsList();
    const postIdx = posts.findIndex((p) => p.id === postId && p.communityId === communityId);
    if (postIdx === -1 || posts[postIdx].status !== 'active') {
        throw new Error('Post not found.');
    }

    const authorProf = getPublicProfile(authorId);
    phase4Seq += 1;
    const nowIso = new Date().toISOString();
    const commentId = `ccom_${Date.now()}_${phase4Seq}`;

    const comment = {
        id: commentId,
        seq: phase4Seq,
        communityId,
        postId,
        authorId: String(authorId),
        authorName: authorProf?.displayName || 'Student',
        authorHandle: authorProf?.username || authorProf?.handle || 'student',
        authorAvatar: authorProf?.avatarId || 'cat',
        content: cleanContent,
        status: 'active', // 'active' | 'removed'
        removedBy: null,
        createdAt: nowIso
    };

    const comments = getAllCommunityCommentsList();
    comments.push(comment);
    saveAllCommunityCommentsList(comments);

    posts[postIdx].commentCount = Number(posts[postIdx].commentCount || 0) + 1;
    posts[postIdx].updatedAt = nowIso;
    saveAllCommunityPostsList(posts);

    if (posts[postIdx].authorId !== String(authorId)) {
        dispatchPhase4Notification({
            recipientId: posts[postIdx].authorId,
            actorId: String(authorId),
            category: 'communityInteractions',
            type: 'community_comment',
            dedupKey: `comm_cmt_${commentId}`,
            message: `commented on your post in ${comm.name}: "${sanitizeText(cleanContent, 50)}"`,
            metadata: { communityId, postId, commentId }
        });
    }

    return { ...comment };
}

export function getCommunityComments(
    postId,
    { viewerId = null, page = 1, pageSize = 15 } = {}
) {
    const allComments = getAllCommunityCommentsList().filter((c) => {
        if (c.postId !== postId) return false;
        if (c.status !== 'active') return false;
        if (viewerId && isBlockedBetween(viewerId, c.authorId)) return false;
        return true;
    });

    const limit = Math.max(1, Number(pageSize) || 15);
    const currentPage = Math.max(1, Number(page) || 1);
    const sliceEnd = currentPage * limit;

    return {
        comments: allComments.slice(0, sliceEnd),
        totalCount: allComments.length,
        hasMore: allComments.length > sliceEnd,
        page: currentPage,
        pageSize: limit
    };
}

/**
 * Reports an inappropriate community post or comment.
 */
export function reportCommunityContent({
    authenticatedUid,
    reporterId,
    communityId,
    targetType = 'post', // 'post' | 'comment'
    targetId,
    reason = 'Inappropriate or spam content'
} = {}) {
    if (!authenticatedUid || !reporterId || String(authenticatedUid) !== String(reporterId)) {
        throw new Error('Unauthorized.');
    }
    if (!targetId || !['post', 'comment'].includes(targetType)) {
        throw new Error('Valid targetType ("post" or "comment") and targetId are required.');
    }

    const rate = checkRateLimit('report', String(reporterId));
    if (!rate.allowed) {
        throw new Error(rate.error);
    }

    phase4Seq += 1;
    const reportRecord = {
        id: `crep_${Date.now()}_${phase4Seq}`,
        communityId,
        reporterId: String(reporterId),
        targetType,
        targetId,
        reason: sanitizeText(reason || 'Community guideline violation', 200),
        status: 'open', // 'open' | 'resolved'
        createdAt: new Date().toISOString()
    };

    const reports = getAllCommunityReportsList();
    reports.unshift(reportRecord);
    saveAllCommunityReportsList(reports);
    return reportRecord;
}

export function getCommunityReports(communityId, adminId) {
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');
    if (!comm.adminIds.includes(String(adminId))) {
        throw new Error('Permission denied: Only community administrators can view reports.');
    }
    return getAllCommunityReportsList().filter((r) => r.communityId === communityId);
}

/**
 * Removes or restores a community post or comment.
 * Enforces Community Administrator privilege (or author self-removal).
 */
export function moderateCommunityContent({
    authenticatedUid,
    moderatorId,
    communityId,
    targetType = 'post', // 'post' | 'comment'
    targetId,
    action = 'remove', // 'remove' | 'restore'
    reason = 'Violates community guidelines'
} = {}) {
    if (!authenticatedUid || !moderatorId || String(authenticatedUid) !== String(moderatorId)) {
        throw new Error('Unauthorized.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');

    const isAdmin = comm.adminIds.includes(String(moderatorId));

    if (targetType === 'post') {
        const posts = getAllCommunityPostsList();
        const idx = posts.findIndex((p) => p.id === targetId && p.communityId === communityId);
        if (idx === -1) throw new Error('Post not found.');
        const isAuthor = String(posts[idx].authorId) === String(moderatorId);
        if (!isAdmin && !isAuthor) {
            throw new Error('Permission denied: Only community administrators or the post author can remove this post.');
        }
        posts[idx].status = action === 'restore' ? 'active' : 'removed';
        posts[idx].removedBy = String(moderatorId);
        posts[idx].removalReason = sanitizeText(reason, 160);
        posts[idx].updatedAt = new Date().toISOString();
        saveAllCommunityPostsList(posts);
        return { ...posts[idx] };
    }

    if (targetType === 'comment') {
        const comments = getAllCommunityCommentsList();
        const idx = comments.findIndex((c) => c.id === targetId && c.communityId === communityId);
        if (idx === -1) throw new Error('Comment not found.');
        const isAuthor = String(comments[idx].authorId) === String(moderatorId);
        if (!isAdmin && !isAuthor) {
            throw new Error('Permission denied: Only community administrators or the comment author can remove this comment.');
        }
        comments[idx].status = action === 'restore' ? 'active' : 'removed';
        comments[idx].removedBy = String(moderatorId);
        comments[idx].removalReason = sanitizeText(reason, 160);
        saveAllCommunityCommentsList(comments);
        return { ...comments[idx] };
    }

    throw new Error('Unsupported targetType for moderation.');
}

/**
 * Restricts (mutes or bans) or unrestricts a member in a Student Community.
 * Requires Community Administrator role.
 */
export function setCommunityMemberRestriction({
    authenticatedUid,
    adminId,
    communityId,
    targetUserId,
    restriction = 'mute', // 'mute' | 'ban' | 'unrestrict'
    reason = 'Repeated spam or guideline violation'
} = {}) {
    if (!authenticatedUid || !adminId || String(authenticatedUid) !== String(adminId)) {
        throw new Error('Unauthorized.');
    }
    const map = getAllCommunitiesMap();
    const comm = map[communityId];
    if (!comm) throw new Error('Community not found.');
    if (!comm.adminIds.includes(String(adminId))) {
        throw new Error('Permission denied: Only community administrators can restrict members.');
    }

    if (!comm.restrictedMembers) comm.restrictedMembers = {};

    if (restriction === 'unrestrict') {
        delete comm.restrictedMembers[String(targetUserId)];
    } else {
        comm.restrictedMembers[String(targetUserId)] = {
            type: restriction,
            reason: sanitizeText(reason, 140),
            restrictedBy: String(adminId),
            updatedAt: new Date().toISOString()
        };
        if (restriction === 'ban') {
            comm.memberIds = (comm.memberIds || []).filter((id) => id !== String(targetUserId));
        }
    }

    comm.updatedAt = new Date().toISOString();
    map[communityId] = comm;
    saveAllCommunitiesMap(map);
    return comm;
}

