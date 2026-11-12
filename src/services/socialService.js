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
    validateUsernameFormat,
    isLooksLikeUidOrHash,
    checkProfanityAndSpam,
    checkRateLimit
} from '../utils/safetyUtils.js';
import {
    PITCH_DEMO_USERS,
    generatePitchFollows,
    generatePitchFriendships,
    generatePitchFriendRequests
} from '../demo/pitchSeedData.js';

const STORAGE_KEYS = {
    PROFILES: 'kk_social_public_profiles_v1',
    HANDLES: 'kk_social_user_handles_v1',
    FOLLOWS: 'kk_social_follows_v1',
    FRIENDSHIPS: 'kk_social_friendships_v1',
    FRIEND_REQUESTS: 'kk_social_friend_requests_v1',
    SAVES: 'kk_social_spot_saves_v1',
    BLOCKS: 'kk_social_blocks_v1',
    REPORTS: 'kk_social_reports_v1',
    NOTIFICATIONS: 'kk_social_notifications_v1',
    PITCH_MODE_ACTIVE: 'kk_pitch_mode_loaded_v1'
};

// Forbidden financial & private keys that MUST NEVER be stored or returned on a public profile
export const FORBIDDEN_FINANCIAL_KEYS = [
    'balance',
    'walletBalance',
    'budgets',
    'monthlyBudget',
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
    'pinHash',
    'walletPin',
    'email',
    'password',
    'phoneNumber'
];

export const DEFAULT_PRIVACY_SETTINGS = {
    profileVisibility: 'public', // 'public' | 'friends'
    allowFriendRequests: true,
    allowDiscovery: true,
    showOnlineStatus: true,
    showLastSeen: true
};

// In-memory fallback for Node.js test environments where localStorage may not exist
const memoryStore = {
    [STORAGE_KEYS.PROFILES]: null,
    [STORAGE_KEYS.HANDLES]: null,
    [STORAGE_KEYS.FOLLOWS]: null,
    [STORAGE_KEYS.FRIENDSHIPS]: null,
    [STORAGE_KEYS.FRIEND_REQUESTS]: null,
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

export function normalizePrivacySettings(raw = {}) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
        profileVisibility: src.profileVisibility === 'friends' ? 'friends' : 'public',
        allowFriendRequests: src.allowFriendRequests !== undefined ? Boolean(src.allowFriendRequests) : true,
        allowDiscovery: src.allowDiscovery !== undefined ? Boolean(src.allowDiscovery) : true,
        showOnlineStatus: src.showOnlineStatus !== undefined ? Boolean(src.showOnlineStatus) : true,
        showLastSeen: src.showLastSeen !== undefined ? Boolean(src.showLastSeen) : true
    };
}

/**
 * Strips any financial or private fields (including email) from a public profile object
 * to guarantee strict financial and personal privacy.
 */
export function stripFinancialFieldsFromProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const clean = { ...profile };
    for (const key of FORBIDDEN_FINANCIAL_KEYS) {
        delete clean[key];
    }

    const uid = String(clean.id || clean.uid || '');
    const rawDisplayName = clean.displayName || clean.username || clean.name || 'Student';
    const safeDisplayName = isLooksLikeUidOrHash(rawDisplayName) || rawDisplayName === uid
        ? 'Student'
        : sanitizeText(rawDisplayName, 50) || 'Student';

    const rawHandleCandidate = clean.handle || clean.handleLower || clean.username || safeDisplayName;
    const normalizedHandle = normalizeHandle(rawHandleCandidate, safeDisplayName, uid);

    const achievements = Array.isArray(clean.achievements)
        ? clean.achievements
            .map((a) => (typeof a === 'string' ? sanitizeText(a, 40) : sanitizeText(a?.id || '', 40)))
            .filter(Boolean)
            .slice(0, 8)
        : [];

    return {
        id: uid,
        displayName: safeDisplayName,
        handle: normalizedHandle,
        handleLower: normalizedHandle.toLowerCase(),
        bio: sanitizeText(clean.bio || '', 160),
        university: sanitizeText(clean.university || 'Malaysia Campus', 80),
        course: sanitizeText(clean.course || clean.programme || '', 80),
        joinedAt: clean.joinedAt || clean.createdAt || '2026-01-15T08:00:00.000Z',
        avatarId: clean.avatarId || clean.avatar || 'cat',
        photoURL: clean.photoURL || null,
        achievements,
        privacySettings: normalizePrivacySettings(clean.privacySettings),
        postCount: typeof clean.postCount === 'number' ? Math.max(0, clean.postCount) : 0,
        followerCount: typeof clean.followerCount === 'number' ? Math.max(0, clean.followerCount) : 0,
        followingCount: typeof clean.followingCount === 'number' ? Math.max(0, clean.followingCount) : 0,
        friendsCount: typeof clean.friendsCount === 'number' ? Math.max(0, clean.friendsCount) : 0,
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
            followingCount: 2,
            friendsCount: 2
        });
    }
    return map;
}

function getHandlesMap() {
    const profiles = readStore(STORAGE_KEYS.PROFILES, getInitialProfilesMap);
    const storedHandles = readStore(STORAGE_KEYS.HANDLES, {});
    const merged = { ...storedHandles };
    for (const profile of Object.values(profiles)) {
        if (profile?.id && profile?.handle) {
            merged[profile.handle.toLowerCase()] = profile.id;
        }
    }
    return merged;
}

function saveHandlesMap(handlesMap) {
    writeStore(STORAGE_KEYS.HANDLES, handlesMap);
}

export function getAllPublicProfilesMap() {
    const map = readStore(STORAGE_KEYS.PROFILES, getInitialProfilesMap);
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

function recomputeFriendCounts(profilesMap, friendshipsList) {
    const counts = {};
    for (const id of Object.keys(profilesMap)) {
        counts[id] = 0;
    }
    for (const f of friendshipsList) {
        const users = Array.isArray(f.users) ? f.users : [f.userA, f.userB].filter(Boolean);
        if (users.length === 2) {
            const [uA, uB] = users;
            if (!isBlockedBetween(uA, uB)) {
                counts[uA] = (counts[uA] || 0) + 1;
                counts[uB] = (counts[uB] || 0) + 1;
            }
        }
    }
    for (const [id, profile] of Object.entries(profilesMap)) {
        profile.friendsCount = counts[id] || 0;
    }
}

function recomputeAllSocialCounts(profilesMap) {
    const follows = getFollowsList();
    const friendships = getFriendshipsList();
    recomputeFollowCounts(profilesMap, follows);
    recomputeFriendCounts(profilesMap, friendships);
}

/**
 * Checks whether a username handle is available (case-insensitive) across KampusKash.
 */
export function isHandleAvailable(handle, currentUserId = null) {
    const check = validateUsernameFormat(handle, currentUserId);
    if (!check.valid) return false;
    const normalized = check.normalized.toLowerCase();

    const profiles = getAllPublicProfilesMap();
    for (const profile of Object.values(profiles)) {
        if ((profile.handle || '').toLowerCase() === normalized && profile.id !== currentUserId) {
            return false;
        }
    }
    const handlesMap = getHandlesMap();
    if (handlesMap[normalized] && handlesMap[normalized] !== currentUserId) {
        return false;
    }
    return true;
}

/**
 * Generates a guaranteed-unique, non-UID handle for a user when initializing their profile.
 */
function resolveUniqueInitialHandle(baseHandle, userId, profilesMap) {
    let candidate = normalizeHandle(baseHandle, 'student', userId);
    if (isHandleAvailable(candidate, userId)) {
        return candidate;
    }
    for (let i = 2; i <= 99; i++) {
        const suffixed = `${candidate.slice(0, 20)}_${i}`;
        const taken = Object.values(profilesMap).some(
            (p) => (p.handle || '').toLowerCase() === suffixed.toLowerCase() && p.id !== userId
        );
        if (!taken) return suffixed;
    }
    return `${candidate.slice(0, 18)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function ensurePublicProfileForUser(user, extra = {}) {
    if (!user || !user.id) return null;
    const profiles = getAllPublicProfilesMap();
    const existing = profiles[user.id] || {};

    const cleanName = extra.displayName || user.displayName || user.name || user.username || existing.displayName || 'Student';
    const safeName = isLooksLikeUidOrHash(cleanName) || cleanName === user.id ? 'Student' : cleanName;

    const rawHandle =
        extra.handle ||
        user.handle ||
        existing.handle ||
        safeName ||
        (user.email ? user.email.split('@')[0] : 'student');

    const uniqueHandle = resolveUniqueInitialHandle(rawHandle, user.id, profiles);

    const merged = stripFinancialFieldsFromProfile({
        ...existing,
        id: user.id,
        displayName: safeName,
        handle: uniqueHandle,
        bio: extra.bio !== undefined ? extra.bio : (user.bio !== undefined ? user.bio : (existing.bio || 'Saving smart on campus with KampusKash.')),
        university: extra.university || user.university || existing.university || 'Universiti Malaya (UM)',
        course: extra.course !== undefined ? extra.course : (user.course || existing.course || ''),
        joinedAt: existing.joinedAt || user.joinedAt || user.createdAt || new Date().toISOString(),
        avatarId: extra.avatarId || user.avatarId || user.avatar || existing.avatarId || 'cat',
        photoURL: extra.photoURL !== undefined ? extra.photoURL : (user.photoURL || existing.photoURL || null),
        achievements: extra.achievements || user.achievements || existing.achievements || ['early_adopter'],
        privacySettings: normalizePrivacySettings(extra.privacySettings || user.privacySettings || existing.privacySettings),
        isPitchDemo: Boolean(user.isPitchDemo || existing.isPitchDemo)
    });

    profiles[user.id] = merged;
    recomputeAllSocialCounts(profiles);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    const handlesMap = getHandlesMap();
    handlesMap[merged.handle.toLowerCase()] = user.id;
    saveHandlesMap(handlesMap);

    if (db && !user.isDemo && !user.isDemoUser && !user.isPitchDemo) {
        setDoc(doc(db, 'publicProfiles', user.id), merged, { merge: true }).catch(() => {});
        setDoc(doc(db, 'userHandles', merged.handle.toLowerCase()), {
            handle: merged.handle.toLowerCase(),
            userId: user.id,
            updatedAt: merged.updatedAt
        }, { merge: true }).catch(() => {});
    }
    return profiles[user.id];
}

export async function updatePublicSocialProfile(userId, updates = {}) {
    if (!userId) throw new Error('User ID is required.');
    const profiles = getAllPublicProfilesMap();
    const current = profiles[userId] || {
        id: userId,
        displayName: 'Student',
        handle: resolveUniqueInitialHandle('student', userId, profiles),
        joinedAt: new Date().toISOString(),
        privacySettings: { ...DEFAULT_PRIVACY_SETTINGS }
    };

    const previousHandle = (current.handle || '').toLowerCase();

    if (updates.handle !== undefined) {
        const formatCheck = validateUsernameFormat(updates.handle, userId);
        if (!formatCheck.valid) {
            throw new Error(formatCheck.error);
        }
        const cleanHandle = formatCheck.normalized.toLowerCase();
        if (!isHandleAvailable(cleanHandle, userId)) {
            throw new Error(`@${cleanHandle} is already taken. Please choose another username.`);
        }
        if (db && !current.isPitchDemo && cleanHandle !== previousHandle) {
            try {
                const handleDoc = await getDoc(doc(db, 'userHandles', cleanHandle));
                if (handleDoc.exists() && handleDoc.data()?.userId !== userId) {
                    throw new Error(`@${cleanHandle} is already taken. Please choose another username.`);
                }
            } catch (err) {
                if (err?.message?.includes('already taken')) throw err;
            }
        }
        updates.handle = cleanHandle;
    }

    if (updates.displayName !== undefined) {
        if (isLooksLikeUidOrHash(updates.displayName) || updates.displayName === userId) {
            throw new Error('Display name cannot be a technical account ID.');
        }
        const safety = checkProfanityAndSpam(updates.displayName);
        if (!safety.valid) throw new Error(safety.reason);
    }

    if (updates.bio !== undefined) {
        const safety = checkProfanityAndSpam(updates.bio);
        if (!safety.valid) throw new Error(safety.reason);
    }

    if (updates.course !== undefined) {
        const safety = checkProfanityAndSpam(updates.course);
        if (!safety.valid) throw new Error(safety.reason);
    }

    const mergedPrivacy = updates.privacySettings
        ? normalizePrivacySettings({ ...current.privacySettings, ...updates.privacySettings })
        : normalizePrivacySettings(current.privacySettings);

    const updated = stripFinancialFieldsFromProfile({
        ...current,
        ...updates,
        privacySettings: mergedPrivacy,
        id: userId,
        updatedAt: new Date().toISOString()
    });

    profiles[userId] = updated;
    recomputeAllSocialCounts(profiles);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    const handlesMap = getHandlesMap();
    if (previousHandle && previousHandle !== updated.handle.toLowerCase() && handlesMap[previousHandle] === userId) {
        delete handlesMap[previousHandle];
    }
    handlesMap[updated.handle.toLowerCase()] = userId;
    saveHandlesMap(handlesMap);

    if (db && !updated.isPitchDemo) {
        try {
            await setDoc(doc(db, 'publicProfiles', userId), updated, { merge: true });
            if (previousHandle && previousHandle !== updated.handle.toLowerCase()) {
                await deleteDoc(doc(db, 'userHandles', previousHandle)).catch(() => {});
            }
            await setDoc(doc(db, 'userHandles', updated.handle.toLowerCase()), {
                handle: updated.handle.toLowerCase(),
                userId,
                updatedAt: updated.updatedAt
            }, { merge: true });
        } catch {
            // fallback to local store if offline
        }
    }

    return profiles[userId];
}

export async function changeUsername(userId, newHandle) {
    return updatePublicSocialProfile(userId, { handle: newHandle });
}

export async function updateProfilePrivacySettings(userId, privacyUpdates = {}) {
    if (!userId) throw new Error('User ID is required.');
    return updatePublicSocialProfile(userId, { privacySettings: privacyUpdates });
}

export function getPublicProfile(userIdOrHandle) {
    if (!userIdOrHandle) return null;
    const profiles = getAllPublicProfilesMap();
    recomputeAllSocialCounts(profiles);

    if (profiles[userIdOrHandle]) {
        return stripFinancialFieldsFromProfile(profiles[userIdOrHandle]);
    }
    const queryStr = String(userIdOrHandle).trim().replace(/^@+/, '').toLowerCase();
    const match = Object.values(profiles).find(
        (p) =>
            (p.handle || '').toLowerCase() === queryStr ||
            (p.displayName || '').toLowerCase() === queryStr
    );
    return match ? stripFinancialFieldsFromProfile(match) : null;
}

/**
 * Returns a public profile tailored to a specific viewer, enforcing block rules and
 * friends-only privacy visibility settings while never exposing financial data.
 */
export function getPublicProfileForViewer(userIdOrHandle, viewerId = null) {
    const profile = getPublicProfile(userIdOrHandle);
    if (!profile) return null;

    if (viewerId && viewerId !== profile.id) {
        if (isBlockedBetween(viewerId, profile.id)) {
            const blockedByViewer = getBlockedUserIds(viewerId).includes(profile.id);
            return {
                id: profile.id,
                displayName: profile.displayName,
                handle: profile.handle,
                handleLower: profile.handleLower,
                university: profile.university,
                avatarId: profile.avatarId,
                photoURL: profile.photoURL,
                isBlockedView: true,
                blockedByViewer,
                blockedByTarget: !blockedByViewer,
                friendsCount: 0,
                followerCount: 0,
                followingCount: 0,
                postCount: 0
            };
        }

        const visibility = profile.privacySettings?.profileVisibility || 'public';
        const isFriend = areFriends(viewerId, profile.id);
        if (visibility === 'friends' && !isFriend) {
            return {
                id: profile.id,
                displayName: profile.displayName,
                handle: profile.handle,
                handleLower: profile.handleLower,
                university: profile.university,
                course: '',
                bio: '',
                joinedAt: profile.joinedAt,
                avatarId: profile.avatarId,
                photoURL: profile.photoURL,
                achievements: [],
                privacySettings: profile.privacySettings,
                friendsCount: profile.friendsCount,
                followerCount: profile.followerCount,
                followingCount: profile.followingCount,
                postCount: profile.postCount,
                isRestrictedView: true
            };
        }
    }

    return profile;
}

/**
 * Asynchronously fetches a public profile from Firestore if missing from local memory.
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

        const cleanHandle = normalizeHandle(String(userIdOrHandle)).toLowerCase();
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
        recomputeAllSocialCounts(profiles);
        writeStore(STORAGE_KEYS.PROFILES, profiles);
        return profiles;
    } catch {
        return getAllPublicProfilesMap();
    }
}

/**
 * Searches discoverable KampusKash users by @username, display name, university, or course.
 * Never exposes email addresses or financial information, and respects block & discovery settings.
 */
export function searchPublicProfiles(
    searchQuery = '',
    {
        excludeUserId = null,
        viewerId = null,
        blockedUserIds = [],
        university = '',
        page = 1,
        pageSize = 25,
        includePagination = false
    } = {}
) {
    const profiles = getAllPublicProfilesMap();
    recomputeAllSocialCounts(profiles);

    const activeViewerId = viewerId || excludeUserId;
    const blockedSet = new Set(blockedUserIds || []);
    const safeQuery = sanitizeText(String(searchQuery || ''), 60)
        .toLowerCase()
        .replace(/^@+/, '');
    const uniFilter = sanitizeText(String(university || ''), 80).toLowerCase();

    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 25));

    const matched = Object.values(profiles)
        .filter((p) => {
            if (!p || !p.id) return false;
            if (excludeUserId && p.id === excludeUserId) return false;
            if (activeViewerId && p.id === activeViewerId) return false;
            if (blockedSet.has(p.id)) return false;
            if (activeViewerId && isBlockedBetween(activeViewerId, p.id)) return false;

            // Respect allowDiscovery setting unless already friends with activeViewerId
            const allowDiscovery = p.privacySettings?.allowDiscovery !== false;
            if (!allowDiscovery && (!activeViewerId || !areFriends(activeViewerId, p.id))) {
                return false;
            }

            if (uniFilter && !(p.university || '').toLowerCase().includes(uniFilter)) {
                return false;
            }

            if (!safeQuery) return true;
            return (
                (p.handle || '').toLowerCase().includes(safeQuery) ||
                (p.displayName || '').toLowerCase().includes(safeQuery) ||
                (p.university || '').toLowerCase().includes(safeQuery) ||
                (p.course || '').toLowerCase().includes(safeQuery)
            );
        })
        .map(stripFinancialFieldsFromProfile)
        .sort((a, b) => {
            if (safeQuery) {
                const aExact = a.handle === safeQuery || a.displayName.toLowerCase() === safeQuery ? 1 : 0;
                const bExact = b.handle === safeQuery || b.displayName.toLowerCase() === safeQuery ? 1 : 0;
                if (aExact !== bExact) return bExact - aExact;
                const aStarts = a.handle.startsWith(safeQuery) || a.displayName.toLowerCase().startsWith(safeQuery) ? 1 : 0;
                const bStarts = b.handle.startsWith(safeQuery) || b.displayName.toLowerCase().startsWith(safeQuery) ? 1 : 0;
                if (aStarts !== bStarts) return bStarts - aStarts;
            }
            return a.displayName.localeCompare(b.displayName);
        });

    const totalCount = matched.length;
    const startIdx = (safePage - 1) * safePageSize;
    const paginated = matched.slice(startIdx, startIdx + safePageSize);

    if (includePagination) {
        return {
            results: paginated,
            page: safePage,
            pageSize: safePageSize,
            totalCount,
            hasMore: startIdx + safePageSize < totalCount
        };
    }
    return paginated;
}

/**
 * Suggests relevant campus peers to connect with based on mutual friends and university.
 */
export function getFriendSuggestions(viewerId, { limit = 8 } = {}) {
    if (!viewerId) return [];
    const viewerProfile = getPublicProfile(viewerId);
    const allDiscoverable = searchPublicProfiles('', {
        viewerId,
        excludeUserId: viewerId,
        pageSize: 50
    });

    const suggestions = allDiscoverable
        .filter((candidate) => {
            const rel = getFriendshipStatus(viewerId, candidate.id);
            return rel.status === 'none' && candidate.privacySettings?.allowFriendRequests !== false;
        })
        .map((candidate) => {
            const mutuals = getMutualFriends(viewerId, candidate.id);
            const sameUni =
                viewerProfile?.university &&
                candidate.university &&
                viewerProfile.university.toLowerCase() === candidate.university.toLowerCase();
            return {
                ...candidate,
                mutualFriendsCount: mutuals.length,
                mutualFriendsPreview: mutuals.slice(0, 3),
                sameUniversity: Boolean(sameUni)
            };
        })
        .sort((a, b) => {
            if (b.mutualFriendsCount !== a.mutualFriendsCount) {
                return b.mutualFriendsCount - a.mutualFriendsCount;
            }
            if (Number(b.sameUniversity) !== Number(a.sameUniversity)) {
                return Number(b.sameUniversity) - Number(a.sameUniversity);
            }
            return (b.friendsCount || 0) - (a.friendsCount || 0);
        });

    return suggestions.slice(0, Math.max(1, Number(limit) || 8));
}

// ---------------------------------------------------------------------------
// KampusKash Connect — Friend Requests & Mutual Friendships
// ---------------------------------------------------------------------------

export function getFriendshipDocId(userAId, userBId) {
    return [String(userAId), String(userBId)].sort().join('_');
}

export function getFriendshipsList() {
    return readStore(STORAGE_KEYS.FRIENDSHIPS, () => generatePitchFriendships());
}

export function getFriendRequestsList() {
    return readStore(STORAGE_KEYS.FRIEND_REQUESTS, () => generatePitchFriendRequests());
}

export function getFriendIds(userId) {
    if (!userId) return [];
    const friendships = getFriendshipsList();
    const ids = [];
    for (const f of friendships) {
        const users = Array.isArray(f.users) ? f.users : [f.userA, f.userB].filter(Boolean);
        if (users.includes(userId)) {
            const otherId = users[0] === userId ? users[1] : users[0];
            if (otherId && !isBlockedBetween(userId, otherId)) {
                ids.push(otherId);
            }
        }
    }
    return Array.from(new Set(ids));
}

export function areFriends(userAId, userBId) {
    if (!userAId || !userBId || userAId === userBId) return false;
    if (isBlockedBetween(userAId, userBId)) return false;
    const friendshipId = getFriendshipDocId(userAId, userBId);
    const friendships = getFriendshipsList();
    return friendships.some(
        (f) =>
            f.id === friendshipId ||
            (Array.isArray(f.users) && f.users.includes(userAId) && f.users.includes(userBId))
    );
}

export function getFriendsList(
    userId,
    { searchQuery = '', page = 1, pageSize = 50, includePagination = false } = {}
) {
    if (!userId) {
        return includePagination
            ? { results: [], page: 1, pageSize, totalCount: 0, hasMore: false }
            : [];
    }
    const friendIds = getFriendIds(userId);
    const safeQuery = sanitizeText(String(searchQuery || ''), 60)
        .toLowerCase()
        .replace(/^@+/, '');

    const profiles = friendIds
        .map((id) => getPublicProfile(id))
        .filter((p) => {
            if (!p) return false;
            if (!safeQuery) return true;
            return (
                (p.handle || '').toLowerCase().includes(safeQuery) ||
                (p.displayName || '').toLowerCase().includes(safeQuery) ||
                (p.university || '').toLowerCase().includes(safeQuery) ||
                (p.course || '').toLowerCase().includes(safeQuery)
            );
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 50));
    const totalCount = profiles.length;
    const startIdx = (safePage - 1) * safePageSize;
    const sliced = profiles.slice(startIdx, startIdx + safePageSize);

    if (includePagination) {
        return {
            results: sliced,
            page: safePage,
            pageSize: safePageSize,
            totalCount,
            hasMore: startIdx + safePageSize < totalCount
        };
    }
    return sliced;
}

export function getMutualFriends(userAId, userBId) {
    if (!userAId || !userBId || userAId === userBId) return [];
    const friendsA = new Set(getFriendIds(userAId));
    const friendsB = getFriendIds(userBId);
    const mutualIds = friendsB.filter((id) => friendsA.has(id));
    return mutualIds.map((id) => getPublicProfile(id)).filter(Boolean);
}

export function getIncomingFriendRequests(userId) {
    if (!userId) return [];
    return getFriendRequestsList()
        .filter(
            (r) =>
                r.receiverId === userId &&
                r.status === 'pending' &&
                !isBlockedBetween(userId, r.senderId)
        )
        .map((r) => ({
            ...r,
            senderProfile: getPublicProfile(r.senderId)
        }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function getOutgoingFriendRequests(userId) {
    if (!userId) return [];
    return getFriendRequestsList()
        .filter(
            (r) =>
                r.senderId === userId &&
                r.status === 'pending' &&
                !isBlockedBetween(userId, r.receiverId)
        )
        .map((r) => ({
            ...r,
            receiverProfile: getPublicProfile(r.receiverId)
        }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function getFriendshipStatus(viewerId, targetUserId) {
    if (!viewerId || !targetUserId) {
        return {
            status: 'none',
            requestId: null,
            direction: null,
            friendshipId: null,
            isBlocked: false,
            blockedByViewer: false,
            blockedByTarget: false,
            canSendRequest: false
        };
    }
    if (viewerId === targetUserId) {
        return {
            status: 'self',
            requestId: null,
            direction: null,
            friendshipId: null,
            isBlocked: false,
            blockedByViewer: false,
            blockedByTarget: false,
            canSendRequest: false
        };
    }

    const blockedByViewer = getBlockedUserIds(viewerId).includes(targetUserId);
    const blockedByTarget = getBlockedUserIds(targetUserId).includes(viewerId);
    if (blockedByViewer || blockedByTarget) {
        return {
            status: 'blocked',
            requestId: null,
            direction: null,
            friendshipId: null,
            isBlocked: true,
            blockedByViewer,
            blockedByTarget,
            canSendRequest: false
        };
    }

    if (areFriends(viewerId, targetUserId)) {
        return {
            status: 'friends',
            requestId: null,
            direction: 'mutual',
            friendshipId: getFriendshipDocId(viewerId, targetUserId),
            isBlocked: false,
            blockedByViewer: false,
            blockedByTarget: false,
            canSendRequest: false
        };
    }

    const requests = getFriendRequestsList();
    const outgoing = requests.find(
        (r) => r.senderId === viewerId && r.receiverId === targetUserId && r.status === 'pending'
    );
    if (outgoing) {
        return {
            status: 'outgoing_pending',
            requestId: outgoing.id,
            direction: 'outgoing',
            friendshipId: null,
            isBlocked: false,
            blockedByViewer: false,
            blockedByTarget: false,
            canSendRequest: false
        };
    }

    const incoming = requests.find(
        (r) => r.senderId === targetUserId && r.receiverId === viewerId && r.status === 'pending'
    );
    if (incoming) {
        return {
            status: 'incoming_pending',
            requestId: incoming.id,
            direction: 'incoming',
            friendshipId: null,
            isBlocked: false,
            blockedByViewer: false,
            blockedByTarget: false,
            canSendRequest: false
        };
    }

    const targetProfile = getPublicProfile(targetUserId);
    const allowRequests = targetProfile?.privacySettings?.allowFriendRequests !== false;

    return {
        status: 'none',
        requestId: null,
        direction: null,
        friendshipId: null,
        isBlocked: false,
        blockedByViewer: false,
        blockedByTarget: false,
        canSendRequest: allowRequests
    };
}

export async function sendFriendRequest(senderUser, receiverId, { note = '' } = {}) {
    const senderId = typeof senderUser === 'object' ? senderUser?.id : senderUser;
    if (!senderId || !receiverId) {
        throw new Error('Both sender and recipient user IDs are required.');
    }
    if (senderId === receiverId) {
        throw new Error('You cannot send a friend request to yourself.');
    }

    const rate = checkRateLimit('friend_request', senderId);
    if (!rate.allowed) {
        throw new Error(rate.reason);
    }

    if (isBlockedBetween(senderId, receiverId)) {
        throw new Error('Cannot send a friend request to this user.');
    }

    if (areFriends(senderId, receiverId)) {
        throw new Error('You are already friends with this user.');
    }

    const requests = getFriendRequestsList();
    const existingOutgoing = requests.find(
        (r) => r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending'
    );
    if (existingOutgoing) {
        throw new Error('A friend request is already pending for this user.');
    }

    const existingIncoming = requests.find(
        (r) => r.senderId === receiverId && r.receiverId === senderId && r.status === 'pending'
    );
    if (existingIncoming) {
        throw new Error('This user has already sent you a friend request. Please accept their request instead.');
    }

    const receiverProfile = getPublicProfile(receiverId);
    if (receiverProfile?.privacySettings?.allowFriendRequests === false) {
        throw new Error('This user has restricted incoming friend requests.');
    }

    const senderProfile =
        getPublicProfile(senderId) ||
        ensurePublicProfileForUser(
            typeof senderUser === 'object'
                ? senderUser
                : { id: senderId, name: 'Student' }
        );

    const cleanNote = sanitizeText(note || '', 140);
    if (cleanNote) {
        const safety = checkProfanityAndSpam(cleanNote);
        if (!safety.valid) throw new Error(safety.reason);
    }

    const now = new Date().toISOString();
    const requestId = `${senderId}_${receiverId}`;
    const newRequest = {
        id: requestId,
        senderId,
        receiverId,
        senderName: senderProfile?.displayName || 'Student',
        senderHandle: senderProfile?.handle || 'student',
        senderAvatar: senderProfile?.avatarId || 'cat',
        receiverName: receiverProfile?.displayName || 'Student',
        receiverHandle: receiverProfile?.handle || 'student',
        receiverAvatar: receiverProfile?.avatarId || 'cat',
        note: cleanNote,
        status: 'pending',
        createdAt: now,
        updatedAt: now
    };

    const filtered = requests.filter((r) => r.id !== requestId);
    filtered.unshift(newRequest);
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, filtered);

    createNotification({
        recipientId: receiverId,
        type: 'friend_request',
        actorId: senderId,
        actorName: newRequest.senderName,
        actorHandle: newRequest.senderHandle,
        requestId: newRequest.id,
        message: `${newRequest.senderName} (@${newRequest.senderHandle}) sent you a friend request`
    });

    if (db) {
        setDoc(doc(db, 'friendRequests', requestId), newRequest).catch(() => {});
    }

    return newRequest;
}

export async function acceptFriendRequest(actorUser, requestIdOrSenderId) {
    const actorId = typeof actorUser === 'object' ? actorUser?.id : actorUser;
    if (!actorId || !requestIdOrSenderId) {
        throw new Error('Recipient user and friend request identifier are required.');
    }

    const requests = getFriendRequestsList();
    let req = requests.find(
        (r) =>
            r.id === requestIdOrSenderId ||
            (r.senderId === requestIdOrSenderId && r.receiverId === actorId && r.status === 'pending')
    );
    if (!req) {
        req = requests.find(
            (r) => r.senderId === requestIdOrSenderId && r.receiverId === actorId
        );
    }

    if (!req) {
        throw new Error('Friend request not found.');
    }
    if (req.receiverId !== actorId) {
        throw new Error('Only the recipient can accept this friend request.');
    }
    if (req.status !== 'pending') {
        throw new Error(`Friend request has already been ${req.status}.`);
    }
    if (isBlockedBetween(req.senderId, req.receiverId)) {
        throw new Error('Cannot accept a friend request from a blocked user.');
    }
    if (areFriends(req.senderId, req.receiverId)) {
        req.status = 'accepted';
        req.updatedAt = new Date().toISOString();
        writeStore(STORAGE_KEYS.FRIEND_REQUESTS, requests);
        throw new Error('You are already friends with this user.');
    }

    const now = new Date().toISOString();
    req.status = 'accepted';
    req.updatedAt = now;

    // Also close any reverse pending request if one existed
    for (const r of requests) {
        if (r.senderId === req.receiverId && r.receiverId === req.senderId && r.status === 'pending') {
            r.status = 'accepted';
            r.updatedAt = now;
        }
    }
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, requests);

    const [userA, userB] = [req.senderId, req.receiverId].sort();
    const friendshipId = getFriendshipDocId(userA, userB);
    const friendships = getFriendshipsList();
    let friendship = friendships.find((f) => f.id === friendshipId);

    if (!friendship) {
        friendship = {
            id: friendshipId,
            users: [userA, userB],
            userA,
            userB,
            // Phase 2 future compatibility hooks (messaging, media, demo transfers, group splits)
            conversationId: `conv_${friendshipId}`,
            capabilities: {
                messaging: true,
                mediaSharing: true,
                demoTransfers: true,
                groupSplit: true
            },
            createdAt: now,
            updatedAt: now
        };
        friendships.unshift(friendship);
        writeStore(STORAGE_KEYS.FRIENDSHIPS, friendships);
    }

    const profiles = getAllPublicProfilesMap();
    recomputeAllSocialCounts(profiles);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    const acceptorProfile = getPublicProfile(actorId);
    createNotification({
        recipientId: req.senderId,
        type: 'friend_accept',
        actorId,
        actorName: acceptorProfile?.displayName || req.receiverName || 'Student',
        actorHandle: acceptorProfile?.handle || req.receiverHandle || 'student',
        requestId: req.id,
        message: `${acceptorProfile?.displayName || 'Student'} (@${acceptorProfile?.handle || 'student'}) accepted your friend request`
    });

    if (db) {
        setDoc(doc(db, 'friendRequests', req.id), req, { merge: true }).catch(() => {});
        setDoc(doc(db, 'friendships', friendshipId), friendship, { merge: true }).catch(() => {});
    }

    return { accepted: true, request: req, friendship };
}

export async function rejectFriendRequest(actorUser, requestIdOrSenderId) {
    const actorId = typeof actorUser === 'object' ? actorUser?.id : actorUser;
    if (!actorId || !requestIdOrSenderId) {
        throw new Error('Recipient user and friend request identifier are required.');
    }

    const requests = getFriendRequestsList();
    const req =
        requests.find(
            (r) =>
                r.id === requestIdOrSenderId ||
                (r.senderId === requestIdOrSenderId && r.receiverId === actorId && r.status === 'pending')
        ) ||
        requests.find((r) => r.senderId === requestIdOrSenderId && r.receiverId === actorId);

    if (!req) {
        throw new Error('Friend request not found.');
    }
    if (req.receiverId !== actorId) {
        throw new Error('Only the recipient can reject this friend request.');
    }
    if (req.status !== 'pending') {
        throw new Error(`Friend request has already been ${req.status}.`);
    }

    req.status = 'rejected';
    req.updatedAt = new Date().toISOString();
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, requests);

    if (db) {
        setDoc(doc(db, 'friendRequests', req.id), req, { merge: true }).catch(() => {});
    }

    return { rejected: true, request: req };
}

export async function cancelFriendRequest(actorUser, requestIdOrReceiverId) {
    const actorId = typeof actorUser === 'object' ? actorUser?.id : actorUser;
    if (!actorId || !requestIdOrReceiverId) {
        throw new Error('Sender user and friend request identifier are required.');
    }

    const requests = getFriendRequestsList();
    const req =
        requests.find(
            (r) =>
                r.id === requestIdOrReceiverId ||
                (r.senderId === actorId && r.receiverId === requestIdOrReceiverId && r.status === 'pending')
        ) ||
        requests.find((r) => r.senderId === actorId && r.receiverId === requestIdOrReceiverId);

    if (!req) {
        throw new Error('Friend request not found.');
    }
    if (req.senderId !== actorId) {
        throw new Error('Only the sender can cancel an outgoing friend request.');
    }
    if (req.status !== 'pending') {
        throw new Error(`Cannot cancel a friend request that is already ${req.status}.`);
    }

    req.status = 'cancelled';
    req.updatedAt = new Date().toISOString();
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, requests);

    if (db) {
        setDoc(doc(db, 'friendRequests', req.id), req, { merge: true }).catch(() => {});
    }

    return { cancelled: true, request: req };
}

export async function removeFriend(actorUser, friendUserId) {
    const actorId = typeof actorUser === 'object' ? actorUser?.id : actorUser;
    if (!actorId || !friendUserId) {
        throw new Error('Both user IDs are required to remove a friend.');
    }
    if (actorId === friendUserId) {
        throw new Error('Invalid friend removal request.');
    }

    const friendshipId = getFriendshipDocId(actorId, friendUserId);
    const friendships = getFriendshipsList();
    const existed = friendships.some(
        (f) =>
            f.id === friendshipId ||
            (Array.isArray(f.users) && f.users.includes(actorId) && f.users.includes(friendUserId))
    );

    if (!existed) {
        return { removed: false, friendshipId };
    }

    const remaining = friendships.filter(
        (f) =>
            f.id !== friendshipId &&
            !(Array.isArray(f.users) && f.users.includes(actorId) && f.users.includes(friendUserId))
    );
    writeStore(STORAGE_KEYS.FRIENDSHIPS, remaining);

    // Mark any prior requests between the pair as removed so they can re-request later if desired
    const requests = getFriendRequestsList().map((r) => {
        const isPair =
            (r.senderId === actorId && r.receiverId === friendUserId) ||
            (r.senderId === friendUserId && r.receiverId === actorId);
        if (isPair && (r.status === 'accepted' || r.status === 'pending')) {
            return { ...r, status: 'removed', updatedAt: new Date().toISOString() };
        }
        return r;
    });
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, requests);

    const profiles = getAllPublicProfilesMap();
    recomputeAllSocialCounts(profiles);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

    if (db) {
        deleteDoc(doc(db, 'friendships', friendshipId)).catch(() => {});
    }

    return { removed: true, friendshipId };
}

/**
 * Real-time Firestore listener for incoming & outgoing friend requests for a user.
 */
export function subscribeToUserFriendRequests(userId, onUpdate) {
    if (!db || !userId) return () => {};
    const qIncoming = query(collection(db, 'friendRequests'), where('receiverId', '==', userId));
    const qOutgoing = query(collection(db, 'friendRequests'), where('senderId', '==', userId));

    const mergeAndNotify = (snapDocs) => {
        const list = getFriendRequestsList();
        const byId = new Map(list.map((r) => [r.id, r]));
        snapDocs.forEach((d) => {
            const data = d.data();
            if (data) byId.set(d.id, { id: d.id, ...data });
        });
        const merged = Array.from(byId.values());
        writeStore(STORAGE_KEYS.FRIEND_REQUESTS, merged);
        if (onUpdate) {
            onUpdate({
                incoming: getIncomingFriendRequests(userId),
                outgoing: getOutgoingFriendRequests(userId)
            });
        }
    };

    const unsubIn = onSnapshot(qIncoming, (snap) => mergeAndNotify(snap.docs), () => {});
    const unsubOut = onSnapshot(qOutgoing, (snap) => mergeAndNotify(snap.docs), () => {});
    return () => {
        unsubIn();
        unsubOut();
    };
}

/**
 * Real-time Firestore listener for mutual friendships of a user.
 */
export function subscribeToUserFriendships(userId, onUpdate) {
    if (!db || !userId) return () => {};
    const q = query(collection(db, 'friendships'), where('users', 'array-contains', userId));
    return onSnapshot(
        q,
        (snap) => {
            const list = getFriendshipsList();
            const byId = new Map(list.map((f) => [f.id, f]));
            snap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data) byId.set(docSnap.id, { id: docSnap.id, ...data });
            });
            const merged = Array.from(byId.values());
            writeStore(STORAGE_KEYS.FRIENDSHIPS, merged);
            const profiles = getAllPublicProfilesMap();
            recomputeAllSocialCounts(profiles);
            writeStore(STORAGE_KEYS.PROFILES, profiles);
            if (onUpdate) onUpdate(getFriendsList(userId));
        },
        () => {}
    );
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
        .filter((f) => f.followerId === followerId && !isBlockedBetween(followerId, f.followingId))
        .map((f) => f.followingId);
}

export function getFollowerIds(userId) {
    if (!userId) return [];
    const follows = getFollowsList();
    return follows
        .filter((f) => f.followingId === userId && !isBlockedBetween(userId, f.followerId))
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
    if (isBlockedBetween(followerId, followingId)) return false;
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

    if (isBlockedBetween(followerId, targetUserId)) {
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
    recomputeAllSocialCounts(profiles);
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
    recomputeAllSocialCounts(profiles);
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

export function getBlockedByUserIds(userId) {
    if (!userId) return [];
    const blocks = getBlocksMap();
    const blockers = [];
    for (const [blockerId, list] of Object.entries(blocks)) {
        if (blockerId !== userId && Array.isArray(list) && list.includes(userId)) {
            blockers.push(blockerId);
        }
    }
    return blockers;
}

export function isBlockedBetween(userAId, userBId) {
    if (!userAId || !userBId || userAId === userBId) return false;
    const blocks = getBlocksMap();
    const aBlockedB = Array.isArray(blocks[userAId]) && blocks[userAId].includes(userBId);
    const bBlockedA = Array.isArray(blocks[userBId]) && blocks[userBId].includes(userAId);
    return Boolean(aBlockedB || bBlockedA);
}

export async function blockUser(actorId, targetUserId) {
    if (!actorId || !targetUserId) throw new Error('Invalid block request.');
    if (actorId === targetUserId) throw new Error('You cannot block yourself.');

    const blocks = getBlocksMap();
    const set = new Set(Array.isArray(blocks[actorId]) ? blocks[actorId] : []);
    set.add(targetUserId);
    blocks[actorId] = Array.from(set);
    writeStore(STORAGE_KEYS.BLOCKS, blocks);

    // 1. Unfollow in both directions
    await unfollowUser(actorId, targetUserId);
    await unfollowUser(targetUserId, actorId);

    // 2. Remove any mutual friendship between the two users
    await removeFriend(actorId, targetUserId);

    // 3. Cancel any pending friend requests in either direction
    const requests = getFriendRequestsList().map((r) => {
        const isPair =
            (r.senderId === actorId && r.receiverId === targetUserId) ||
            (r.senderId === targetUserId && r.receiverId === actorId);
        if (isPair && r.status === 'pending') {
            return { ...r, status: 'cancelled', updatedAt: new Date().toISOString() };
        }
        return r;
    });
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, requests);

    const profiles = getAllPublicProfilesMap();
    recomputeAllSocialCounts(profiles);
    writeStore(STORAGE_KEYS.PROFILES, profiles);

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
// Notifications (Followers, Friend Requests, Likes, Comments, Wallet)
// ---------------------------------------------------------------------------

export function getAllNotifications() {
    return readStore(STORAGE_KEYS.NOTIFICATIONS, []);
}

export function getUserNotifications(userId) {
    if (!userId) return [];
    return getAllNotifications()
        .filter((n) => n.recipientId === userId && !isBlockedBetween(userId, n.actorId))
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
    if (isBlockedBetween(recipientId, actorId)) return null;
    const all = getAllNotifications();
    const item = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        recipientId,
        type, // 'follow' | 'friend_request' | 'friend_accept' | 'like' | 'comment' | 'wallet_received' | 'wallet_request' | 'wallet_request_declined'
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
    const friendships = generatePitchFriendships();
    const friendRequests = generatePitchFriendRequests();
    recomputeFollowCounts(profiles, follows);
    recomputeFriendCounts(profiles, friendships);

    writeStore(STORAGE_KEYS.PROFILES, profiles);
    writeStore(STORAGE_KEYS.FOLLOWS, follows);
    writeStore(STORAGE_KEYS.FRIENDSHIPS, friendships);
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, friendRequests);
    if (Array.isArray(seedNotifications) && seedNotifications.length > 0) {
        const existingNonDemo = getAllNotifications().filter((n) => !n.isPitchDemo);
        writeStore(STORAGE_KEYS.NOTIFICATIONS, [...seedNotifications, ...existingNonDemo]);
    }
    writeStore(STORAGE_KEYS.PITCH_MODE_ACTIVE, true);
    return { profiles, follows, friendships, friendRequests };
}

export function resetPitchSocialData() {
    const profiles = getAllPublicProfilesMap();
    for (const [id, p] of Object.entries(profiles)) {
        if (p.isPitchDemo) {
            delete profiles[id];
        }
    }
    const follows = getFollowsList().filter((f) => !f.isPitchDemo);
    const friendships = getFriendshipsList().filter((f) => !f.isPitchDemo);
    const friendRequests = getFriendRequestsList().filter((r) => !r.isPitchDemo);
    const notifications = getAllNotifications().filter((n) => !n.isPitchDemo);

    writeStore(STORAGE_KEYS.PROFILES, profiles);
    writeStore(STORAGE_KEYS.FOLLOWS, follows);
    writeStore(STORAGE_KEYS.FRIENDSHIPS, friendships);
    writeStore(STORAGE_KEYS.FRIEND_REQUESTS, friendRequests);
    writeStore(STORAGE_KEYS.NOTIFICATIONS, notifications);
    writeStore(STORAGE_KEYS.PITCH_MODE_ACTIVE, false);
}

export function isPitchModeLoaded() {
    return Boolean(readStore(STORAGE_KEYS.PITCH_MODE_ACTIVE, false));
}
