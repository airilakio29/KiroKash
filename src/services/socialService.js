import {
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    onSnapshot
} from '../firebase.js';
import {
    sanitizeText,
    normalizeHandle,
    checkProfanityAndSpam,
    checkRateLimit
} from '../utils/safetyUtils.js';
import { PITCH_DEMO_USERS, generatePitchFollows } from '../demo/pitchSeedData.js';

const STORAGE_KEYS = {
    PROFILES: 'kk_social_public_profiles_v1',
    FOLLOWS: 'kk_social_follows_v1',
    SAVES: 'kk_social_spot_saves_v1',
    BLOCKS: 'kk_social_blocks_v1',
    REPORTS: 'kk_social_reports_v1',
    NOTIFICATIONS: 'kk_social_notifications_v1',
    PITCH_MODE_ACTIVE: 'kk_pitch_mode_loaded_v1'
};

// Forbidden financial keys that MUST NEVER be stored or returned on a public profile
const FORBIDDEN_FINANCIAL_KEYS = [
    'balance',
    'walletBalance',
    'budgets',
    'transactions',
    'walletHistory',
    'ledger',
    'accounts',
    'savingsGoals',
    'allowance',
    'income',
    'expenses',
    'netWorth',
    'pin',
    'pinHash'
];

// In-memory fallback for Node.js test environments where localStorage may not exist
const memoryStore = {
    [STORAGE_KEYS.PROFILES]: null,
    [STORAGE_KEYS.FOLLOWS]: null,
    [STORAGE_KEYS.SAVES]: null,
    [STORAGE_KEYS.BLOCKS]: null,
    [STORAGE_KEYS.REPORTS]: null,
    [STORAGE_KEYS.NOTIFICATIONS]: null,
    [STORAGE_KEYS.PITCH_MODE_ACTIVE]: false
};

function readStore(key, fallback) {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw !== null) return JSON.parse(raw);
        } catch {
            // ignore storage read error
        }
    }
    if (memoryStore[key] !== null && memoryStore[key] !== undefined) {
        return JSON.parse(JSON.stringify(memoryStore[key]));
    }
    return typeof fallback === 'function' ? fallback() : fallback;
}

function writeStore(key, value) {
    memoryStore[key] = JSON.parse(JSON.stringify(value));
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore quota errors
        }
    }
}

/**
 * Strips any financial fields from a public profile object to guarantee privacy.
 */
export function stripFinancialFieldsFromProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const clean = { ...profile };
    for (const key of FORBIDDEN_FINANCIAL_KEYS) {
        delete clean[key];
    }
    return {
        id: String(clean.id || clean.uid || ''),
        displayName: sanitizeText(clean.displayName || clean.name || 'Student', 50),
        handle: normalizeHandle(clean.handle || clean.username || clean.displayName || clean.name || 'student'),
        bio: sanitizeText(clean.bio || '', 160),
        university: sanitizeText(clean.university || 'Malaysia Campus', 80),
        avatarId: clean.avatarId || 'cat',
        photoURL: clean.photoURL || null,
        postCount: typeof clean.postCount === 'number' ? Math.max(0, clean.postCount) : 0,
        followerCount: typeof clean.followerCount === 'number' ? Math.max(0, clean.followerCount) : 0,
        followingCount: typeof clean.followingCount === 'number' ? Math.max(0, clean.followingCount) : 0,
        isPitchDemo: Boolean(clean.isPitchDemo),
        updatedAt: clean.updatedAt || new Date().toISOString()
    };
}

function getInitialProfilesMap() {
    const map = {};
    for (const demoUser of PITCH_DEMO_USERS) {
        map[demoUser.id] = stripFinancialFieldsFromProfile({
            ...demoUser,
            postCount: 3,
            followerCount: 2,
            followingCount: 2
        });
    }
    return map;
}

export function getAllPublicProfilesMap() {
    const map = readStore(STORAGE_KEYS.PROFILES, getInitialProfilesMap);
    // Ensure demo profiles exist so usernames resolve cleanly
    let mutated = false;
    for (const demoUser of PITCH_DEMO_USERS) {
        if (!map[demoUser.id]) {
            map[demoUser.id] = stripFinancialFieldsFromProfile(demoUser);
            mutated = true;
        }
    }
    if (mutated) {
        writeStore(STORAGE_KEYS.PROFILES, map);
    }
    return map;
}

function recomputeFollowCounts(profilesMap, followsList) {
    const counts = {};
    for (const id of Object.keys(profilesMap)) {
        counts[id] = { followers: 0, following: 0 };
    }
    for (const f of followsList) {
        if (!counts[f.followerId]) counts[f.followerId] = { followers: 0, following: 0 };
        if (!counts[f.followingId]) counts[f.followingId] = { followers: 0, following: 0 };
        counts[f.followerId].following += 1;
        counts[f.followingId].followers += 1;
    }
    for (const [id, profile] of Object.entries(profilesMap)) {
        profile.followerCount = counts[id]?.followers || 0;
        profile.followingCount = counts[id]?.following || 0;
    }
}

export function ensurePublicProfileForUser(user, extra = {}) {
    if (!user || !user.id) return null;
    const profiles = getAllPublicProfilesMap();
    const existing = profiles[user.id] || {};
    const desiredHandle = normalizeHandle(
        extra.handle || user.handle || existing.handle || user.name || user.email?.split('@')[0] || `student_${String(user.id).slice(0, 5)}`
    );

    const merged = stripFinancialFieldsFromProfile({
        ...existing,
        id: user.id,
        displayName: extra.displayName || user.name || existing.displayName || 'Student',
        handle: desiredHandle,
        bio: extra.bio !== undefined ? extra.bio : (existing.bio || 'Saving smart on campus with KampusKash.'),
        university: extra.university || user.university || existing.university || 'Universiti Malaya (UM)',
        avatarId: extra.avatarId || user.avatarId || existing.avatarId || 'cat',
        photoURL: extra.photoURL !== undefined ? extra.photoURL : (user.photoURL || existing.photoURL || null),
        isPitchDemo: Boolean(user.isPitchDemo || existing.isPitchDemo)
    });

    profiles[user.id] = merged;
    const follows = getFollowsList();
    recomputeFollowCounts(profiles, follows);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    if (db && !user.isDemo && !user.isPitchDemo) {
        setDoc(doc(db, 'publicProfiles', user.id), merged, { merge: true }).catch(() => {});
    }
    return profiles[user.id];
}

export function isHandleAvailable(handle, currentUserId = null) {
    const normalized = normalizeHandle(handle);
    if (!normalized || normalized.length < 3) return false;
    const profiles = getAllPublicProfilesMap();
    for (const profile of Object.values(profiles)) {
        if (profile.handle === normalized && profile.id !== currentUserId) {
            return false;
        }
    }
    return true;
}

export async function updatePublicSocialProfile(userId, updates = {}) {
    if (!userId) throw new Error('User ID is required.');
    const profiles = getAllPublicProfilesMap();
    const current = profiles[userId] || { id: userId, displayName: 'Student', handle: `student_${String(userId).slice(0, 5)}` };

    if (updates.handle !== undefined) {
        const cleanHandle = normalizeHandle(updates.handle);
        if (cleanHandle.length < 3) {
            throw new Error('Username handle must be at least 3 characters.');
        }
        if (!isHandleAvailable(cleanHandle, userId)) {
            throw new Error(`@${cleanHandle} is already taken. Please choose another username.`);
        }
        updates.handle = cleanHandle;
    }

    if (updates.displayName !== undefined) {
        const safety = checkProfanityAndSpam(updates.displayName);
        if (!safety.valid) throw new Error(safety.reason);
    }

    if (updates.bio !== undefined) {
        const safety = checkProfanityAndSpam(updates.bio);
        if (!safety.valid) throw new Error(safety.reason);
    }

    const updated = stripFinancialFieldsFromProfile({
        ...current,
        ...updates,
        id: userId,
        updatedAt: new Date().toISOString()
    });

    profiles[userId] = updated;
    const follows = getFollowsList();
    recomputeFollowCounts(profiles, follows);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    if (db && !updated.isPitchDemo) {
        try {
            await setDoc(doc(db, 'publicProfiles', userId), updated, { merge: true });
        } catch {
            // fallback to local store if offline
        }
    }

    return profiles[userId];
}

export function getPublicProfile(userIdOrHandle) {
    if (!userIdOrHandle) return null;
    const profiles = getAllPublicProfilesMap();
    const follows = getFollowsList();
    recomputeFollowCounts(profiles, follows);

    if (profiles[userIdOrHandle]) {
        return stripFinancialFieldsFromProfile(profiles[userIdOrHandle]);
    }
    const cleanHandle = normalizeHandle(String(userIdOrHandle));
    const match = Object.values(profiles).find(
        (p) => p.handle === cleanHandle || p.displayName.toLowerCase() === String(userIdOrHandle).toLowerCase()
    );
    return match ? stripFinancialFieldsFromProfile(match) : null;
}

/**
 * Asynchronously fetches a public profile from Firestore if missing from local memory.
 * Enables real users across separate devices/browsers to view each other's profiles instantly.
 */
export async function fetchPublicProfileFromFirestore(userIdOrHandle) {
    if (!userIdOrHandle) return null;
    const local = getPublicProfile(userIdOrHandle);
    if (local) return local;
    if (!db) return null;

    try {
        const docRef = doc(db, 'publicProfiles', String(userIdOrHandle));
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const clean = stripFinancialFieldsFromProfile(snap.data());
            const profiles = getAllPublicProfilesMap();
            profiles[clean.id] = clean;
            writeStore(STORAGE_KEYS.PROFILES, profiles);
            return clean;
        }

        const cleanHandle = normalizeHandle(String(userIdOrHandle));
        const q = query(collection(db, 'publicProfiles'), where('handle', '==', cleanHandle));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
            const clean = stripFinancialFieldsFromProfile(querySnap.docs[0].data());
            const profiles = getAllPublicProfilesMap();
            profiles[clean.id] = clean;
            writeStore(STORAGE_KEYS.PROFILES, profiles);
            return clean;
        }
    } catch {
        // offline or permission fallback
    }
    return null;
}

/**
 * Synchronizes all public student profiles from Firestore into memory.
 */
export async function syncPublicProfilesFromFirestore() {
    if (!db) return getAllPublicProfilesMap();
    try {
        const snap = await getDocs(collection(db, 'publicProfiles'));
        const profiles = getAllPublicProfilesMap();
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.id) {
                profiles[data.id] = stripFinancialFieldsFromProfile({ ...profiles[data.id], ...data });
            }
        });
        writeStore(STORAGE_KEYS.PROFILES, profiles);
        return profiles;
    } catch {
        return getAllPublicProfilesMap();
    }
}

export function searchPublicProfiles(searchQuery = '', { excludeUserId = null, blockedUserIds = [] } = {}) {
    const profiles = getAllPublicProfilesMap();
    const follows = getFollowsList();
    recomputeFollowCounts(profiles, follows);

    const blockedSet = new Set(blockedUserIds || []);
    const q = String(searchQuery || '').trim().toLowerCase().replace(/^@/, '');

    return Object.values(profiles)
        .filter((p) => {
            if (!p || !p.id) return false;
            if (excludeUserId && p.id === excludeUserId) return false;
            if (blockedSet.has(p.id)) return false;
            if (!q) return true;
            return (
                (p.handle || '').toLowerCase().includes(q) ||
                (p.displayName || '').toLowerCase().includes(q) ||
                (p.university || '').toLowerCase().includes(q)
            );
        })
        .map(stripFinancialFieldsFromProfile);
}

// ---------------------------------------------------------------------------
// Follows (Explore & Following graph)
// ---------------------------------------------------------------------------

export function getFollowsList() {
    return readStore(STORAGE_KEYS.FOLLOWS, () => generatePitchFollows());
}

export function getFollowingIds(followerId) {
    if (!followerId) return [];
    const follows = getFollowsList();
    return follows
        .filter((f) => f.followerId === followerId)
        .map((f) => f.followingId);
}

export function getFollowerIds(userId) {
    if (!userId) return [];
    const follows = getFollowsList();
    return follows
        .filter((f) => f.followingId === userId)
        .map((f) => f.followerId);
}

export function getFollowersProfiles(userId) {
    const ids = getFollowerIds(userId);
    return ids.map((id) => getPublicProfile(id)).filter(Boolean);
}

export function getFollowingProfiles(userId) {
    const ids = getFollowingIds(userId);
    return ids.map((id) => getPublicProfile(id)).filter(Boolean);
}

export function isFollowingUser(followerId, followingId) {
    if (!followerId || !followingId) return false;
    const follows = getFollowsList();
    return follows.some((f) => f.followerId === followerId && f.followingId === followingId);
}

export async function followUser(followerUser, targetUserId) {
    const followerId = typeof followerUser === 'object' ? followerUser.id : followerUser;
    if (!followerId || !targetUserId) {
        throw new Error('Both follower and target user are required.');
    }
    if (followerId === targetUserId) {
        throw new Error('You cannot follow yourself.');
    }

    const blocked = getBlockedUserIds(followerId);
    if (blocked.includes(targetUserId)) {
        throw new Error('Cannot follow a blocked user.');
    }

    const follows = getFollowsList();
    const exists = follows.some((f) => f.followerId === followerId && f.followingId === targetUserId);
    if (exists) return { followed: true, alreadyFollowing: true };

    const followDocId = `${followerId}_${targetUserId}`;
    const entry = {
        id: followDocId,
        followerId,
        followingId: targetUserId,
        createdAt: new Date().toISOString()
    };
    follows.push(entry);
    writeStore(STORAGE_KEYS.FOLLOWS, follows);

    const profiles = getAllPublicProfilesMap();
    recomputeFollowCounts(profiles, follows);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    const followerProfile = getPublicProfile(followerId) || {
        id: followerId,
        displayName: typeof followerUser === 'object' ? (followerUser.name || followerUser.displayName || 'Student') : 'Student',
        handle: typeof followerUser === 'object' ? (followerUser.handle || 'student') : 'student'
    };

    createNotification({
        recipientId: targetUserId,
        type: 'follow',
        actorId: followerId,
        actorName: followerProfile.displayName,
        actorHandle: followerProfile.handle,
        message: `@${followerProfile.handle} started following you`
    });

    if (db) {
        setDoc(doc(db, 'follows', followDocId), entry).catch(() => {});
    }

    return { followed: true };
}

export async function unfollowUser(followerUser, targetUserId) {
    const followerId = typeof followerUser === 'object' ? followerUser.id : followerUser;
    if (!followerId || !targetUserId) return { followed: false };

    const follows = getFollowsList().filter(
        (f) => !(f.followerId === followerId && f.followingId === targetUserId)
    );
    writeStore(STORAGE_KEYS.FOLLOWS, follows);

    const profiles = getAllPublicProfilesMap();
    recomputeFollowCounts(profiles, follows);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    if (db) {
        deleteDoc(doc(db, 'follows', `${followerId}_${targetUserId}`)).catch(() => {});
    }

    return { followed: false };
}

// ---------------------------------------------------------------------------
// Saved Spots (Bookmarks - Private to Owner)
// ---------------------------------------------------------------------------

function getSavesMap() {
    return readStore(STORAGE_KEYS.SAVES, {});
}

export function getSavedSpotIds(userId) {
    if (!userId) return [];
    const saves = getSavesMap();
    return Array.isArray(saves[userId]) ? saves[userId] : [];
}

export async function toggleSaveSpot(userId, spotId) {
    if (!userId || !spotId) throw new Error('Sign in required to save spots.');
    const saves = getSavesMap();
    const list = new Set(Array.isArray(saves[userId]) ? saves[userId] : []);
    let saved = false;
    if (list.has(spotId)) {
        list.delete(spotId);
        saved = false;
    } else {
        list.add(spotId);
        saved = true;
    }
    saves[userId] = Array.from(list);
    writeStore(STORAGE_KEYS.SAVES, saves);

    if (db) {
        const docId = `${userId}_${spotId}`;
        if (saved) {
            setDoc(doc(db, 'spotSaves', docId), {
                userId,
                spotId,
                createdAt: new Date().toISOString()
            }).catch(() => {});
        } else {
            deleteDoc(doc(db, 'spotSaves', docId)).catch(() => {});
        }
    }

    return { saved, savedSpotIds: saves[userId] };
}

// ---------------------------------------------------------------------------
// Block & Report Users / Content
// ---------------------------------------------------------------------------

function getBlocksMap() {
    return readStore(STORAGE_KEYS.BLOCKS, {});
}

export function getBlockedUserIds(userId) {
    if (!userId) return [];
    const blocks = getBlocksMap();
    return Array.isArray(blocks[userId]) ? blocks[userId] : [];
}

export async function blockUser(actorId, targetUserId) {
    if (!actorId || !targetUserId) throw new Error('Invalid block request.');
    if (actorId === targetUserId) throw new Error('You cannot block yourself.');

    const blocks = getBlocksMap();
    const set = new Set(Array.isArray(blocks[actorId]) ? blocks[actorId] : []);
    set.add(targetUserId);
    blocks[actorId] = Array.from(set);
    writeStore(STORAGE_KEYS.BLOCKS, blocks);

    // Also unfollow in both directions
    await unfollowUser(actorId, targetUserId);
    await unfollowUser(targetUserId, actorId);

    if (db) {
        setDoc(doc(db, 'blocks', `${actorId}_${targetUserId}`), {
            blockerId: actorId,
            blockedId: targetUserId,
            createdAt: new Date().toISOString()
        }).catch(() => {});
    }

    return { blocked: true, blockedUserIds: blocks[actorId] };
}

export async function unblockUser(actorId, targetUserId) {
    if (!actorId || !targetUserId) return { blocked: false, blockedUserIds: [] };
    const blocks = getBlocksMap();
    const set = new Set(Array.isArray(blocks[actorId]) ? blocks[actorId] : []);
    set.delete(targetUserId);
    blocks[actorId] = Array.from(set);
    writeStore(STORAGE_KEYS.BLOCKS, blocks);

    if (db) {
        deleteDoc(doc(db, 'blocks', `${actorId}_${targetUserId}`)).catch(() => {});
    }

    return { blocked: false, blockedUserIds: blocks[actorId] };
}

export async function reportUserOrContent({ reporterId, targetUserId = null, targetPostId = null, reason = '', details = '' }) {
    if (!reporterId) throw new Error('Sign in required to submit a report.');
    const rate = checkRateLimit('report', reporterId);
    if (!rate.allowed) throw new Error(rate.reason);

    const cleanReason = sanitizeText(reason || 'Inappropriate content', 120);
    const cleanDetails = sanitizeText(details || '', 300);

    const reports = readStore(STORAGE_KEYS.REPORTS, []);
    const reportEntry = {
        id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        reporterId,
        targetUserId,
        targetPostId,
        reason: cleanReason,
        details: cleanDetails,
        createdAt: new Date().toISOString()
    };
    reports.unshift(reportEntry);
    writeStore(STORAGE_KEYS.REPORTS, reports);

    if (db) {
        addDoc(collection(db, 'communityReports'), reportEntry).catch(() => {});
    }

    return reportEntry;
}

// ---------------------------------------------------------------------------
// Notifications (Followers, Likes, Comments, Money Received, Money Requested)
// ---------------------------------------------------------------------------

export function getAllNotifications() {
    return readStore(STORAGE_KEYS.NOTIFICATIONS, []);
}

export function getUserNotifications(userId) {
    if (!userId) return [];
    const blocked = new Set(getBlockedUserIds(userId));
    return getAllNotifications()
        .filter((n) => n.recipientId === userId && !blocked.has(n.actorId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadNotificationCount(userId) {
    return getUserNotifications(userId).filter((n) => !n.read).length;
}

/**
 * Subscribes to live incoming notifications from Firestore.
 */
export function subscribeToUserNotifications(userId, onUpdate) {
    if (!db || !userId) return () => {};
    const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
    return onSnapshot(
        q,
        (snap) => {
            const list = [];
            snap.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            if (onUpdate && list.length > 0) onUpdate(list);
        },
        () => {}
    );
}

export function createNotification({
    recipientId,
    type,
    actorId,
    actorName = 'Student',
    actorHandle = 'student',
    spotId = null,
    spotTitle = null,
    amount = null,
    requestId = null,
    receiptId = null,
    message = '',
    isPitchDemo = false
}) {
    if (!recipientId || recipientId === actorId) return null;
    const all = getAllNotifications();
    const item = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        recipientId,
        type, // 'follow' | 'like' | 'comment' | 'wallet_received' | 'wallet_request' | 'wallet_request_declined'
        actorId,
        actorName: sanitizeText(actorName, 50),
        actorHandle: normalizeHandle(actorHandle),
        spotId,
        spotTitle: spotTitle ? sanitizeText(spotTitle, 90) : null,
        amount: amount !== null && amount !== undefined ? Number(amount) : null,
        requestId,
        receiptId,
        message: sanitizeText(message, 200),
        read: false,
        isPitchDemo: Boolean(isPitchDemo),
        createdAt: new Date().toISOString()
    };
    all.unshift(item);
    writeStore(STORAGE_KEYS.NOTIFICATIONS, all.slice(0, 250));

    if (db && !isPitchDemo) {
        setDoc(doc(db, 'notifications', item.id), item).catch(() => {});
    }

    return item;
}

export function markNotificationRead(userId, notificationId) {
    const all = getAllNotifications();
    let updated = false;
    for (const n of all) {
        if (n.id === notificationId && n.recipientId === userId) {
            n.read = true;
            updated = true;
        }
    }
    if (updated) {
        writeStore(STORAGE_KEYS.NOTIFICATIONS, all);
        if (db) {
            updateDoc(doc(db, 'notifications', notificationId), { read: true }).catch(() => {});
        }
    }
    return getUserNotifications(userId);
}

export function markAllNotificationsRead(userId) {
    const all = getAllNotifications();
    for (const n of all) {
        if (n.recipientId === userId) {
            n.read = true;
        }
    }
    writeStore(STORAGE_KEYS.NOTIFICATIONS, all);
    return getUserNotifications(userId);
}

// ---------------------------------------------------------------------------
// Pitch Mode Seeding & Reset for Social Graph
// ---------------------------------------------------------------------------

export function seedPitchSocialData(seedNotifications = []) {
    const profiles = {};
    for (const demoUser of PITCH_DEMO_USERS) {
        profiles[demoUser.id] = stripFinancialFieldsFromProfile({
            ...demoUser,
            postCount: 3,
            isPitchDemo: true
        });
    }
    const follows = generatePitchFollows();
    recomputeFollowCounts(profiles, follows);

    writeStore(STORAGE_KEYS.PROFILES, profiles);
    writeStore(STORAGE_KEYS.FOLLOWS, follows);
    if (Array.isArray(seedNotifications) && seedNotifications.length > 0) {
        const existingNonDemo = getAllNotifications().filter((n) => !n.isPitchDemo);
        writeStore(STORAGE_KEYS.NOTIFICATIONS, [...seedNotifications, ...existingNonDemo]);
    }
    writeStore(STORAGE_KEYS.PITCH_MODE_ACTIVE, true);
    return { profiles, follows };
}

export function resetPitchSocialData() {
    const profiles = getAllPublicProfilesMap();
    for (const [id, p] of Object.entries(profiles)) {
        if (p.isPitchDemo) {
            delete profiles[id];
        }
    }
    const follows = getFollowsList().filter((f) => !f.isPitchDemo);
    const notifications = getAllNotifications().filter((n) => !n.isPitchDemo);

    writeStore(STORAGE_KEYS.PROFILES, profiles);
    writeStore(STORAGE_KEYS.FOLLOWS, follows);
    writeStore(STORAGE_KEYS.NOTIFICATIONS, notifications);
    writeStore(STORAGE_KEYS.PITCH_MODE_ACTIVE, false);
}

export function isPitchModeLoaded() {
    return Boolean(readStore(STORAGE_KEYS.PITCH_MODE_ACTIVE, false));
}
