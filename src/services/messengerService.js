import {
    db,
    collection,
    doc,
    setDoc,
    updateDoc,
    query,
    orderBy,
    limit as firestoreLimit,
    onSnapshot,
    storage,
    storageRef,
    uploadBytes,
    getDownloadURL,
    rtdb,
    rtdbRef,
    rtdbSet,
    rtdbOnValue,
    rtdbOnDisconnect
} from '../firebase.js';
import {
    MESSAGE_TYPES,
    MESSAGE_REACTIONS,
    MAX_CHAT_IMAGE_BYTES,
    ALLOWED_CHAT_IMAGE_TYPES,
    TYPING_INDICATOR_EXPIRY_MS,
    MESSAGES_PAGE_SIZE
} from '../config/appConstants.js';
import {
    sanitizeText,
    checkProfanityAndSpam,
    checkRateLimit,
    TEXT_LIMITS
} from '../utils/safetyUtils.js';
import {
    getPublicProfile,
    getPublicProfileForViewer,
    getFriendshipDocId,
    areFriends,
    isBlockedBetween,
    normalizePrivacySettings
} from './socialService.js';

const MESSENGER_STORAGE_KEYS = {
    CONVERSATIONS: 'kk_messenger_conversations_v1',
    MESSAGES: 'kk_messenger_messages_v1',
    ATTACHMENTS: 'kk_messenger_attachments_v1',
    PRESENCE: 'kk_messenger_presence_v1',
    TYPING: 'kk_messenger_typing_v1',
    NOTIFICATION_PREFS: 'kk_messenger_notif_prefs_v1',
    DISPATCHED_NOTIFICATIONS: 'kk_messenger_dispatched_notifs_v1'
};

// Forbidden raw binary keys that must NEVER be saved inside Firestore message documents
export const FORBIDDEN_MESSAGE_BINARY_KEYS = [
    'rawBytes',
    'blob',
    'fileBuffer',
    'arrayBuffer',
    'base64Data',
    'binaryData',
    'uint8Array'
];

export const DEFAULT_MESSAGING_NOTIFICATION_PREFS = {
    enabled: true,
    sound: true,
    showPreviewText: false, // Default false so lock-screen notifications do not leak private content
    fcmToken: null
};

const memoryMessengerStore = {
    [MESSENGER_STORAGE_KEYS.CONVERSATIONS]: null,
    [MESSENGER_STORAGE_KEYS.MESSAGES]: null,
    [MESSENGER_STORAGE_KEYS.ATTACHMENTS]: null,
    [MESSENGER_STORAGE_KEYS.PRESENCE]: null,
    [MESSENGER_STORAGE_KEYS.TYPING]: null,
    [MESSENGER_STORAGE_KEYS.NOTIFICATION_PREFS]: null,
    [MESSENGER_STORAGE_KEYS.DISPATCHED_NOTIFICATIONS]: null
};

// Active real-time in-memory subscribers per conversationId and global userId
const conversationListeners = new Map(); // conversationId -> Set<callback>
const userInboxListeners = new Map(); // userId -> Set<callback>
const typingDebounceMap = new Map(); // `${conversationId}_${userId}` -> timestamp
let messageSequenceCounter = 0;

function readStore(key, fallback) {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw !== null) return JSON.parse(raw);
        } catch {
            // ignore storage read error
        }
    }
    if (memoryMessengerStore[key] !== null && memoryMessengerStore[key] !== undefined) {
        return JSON.parse(JSON.stringify(memoryMessengerStore[key]));
    }
    return typeof fallback === 'function' ? fallback() : fallback;
}

function writeStore(key, value) {
    memoryMessengerStore[key] = JSON.parse(JSON.stringify(value));
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore storage write error
        }
    }
}

export function resetMessengerStateForTesting() {
    Object.keys(memoryMessengerStore).forEach((k) => {
        memoryMessengerStore[k] = null;
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.removeItem(k);
            } catch {
                // ignore
            }
        }
    });
    conversationListeners.clear();
    userInboxListeners.clear();
    typingDebounceMap.clear();
}

function getAllConversationsMap() {
    return readStore(MESSENGER_STORAGE_KEYS.CONVERSATIONS, () => ({}));
}

function saveAllConversationsMap(map) {
    writeStore(MESSENGER_STORAGE_KEYS.CONVERSATIONS, map);
}

function getAllMessagesByConversationMap() {
    return readStore(MESSENGER_STORAGE_KEYS.MESSAGES, () => ({}));
}

function saveAllMessagesByConversationMap(map) {
    writeStore(MESSENGER_STORAGE_KEYS.MESSAGES, map);
}

function getAttachmentsMap() {
    return readStore(MESSENGER_STORAGE_KEYS.ATTACHMENTS, () => ({}));
}

function saveAttachmentsMap(map) {
    writeStore(MESSENGER_STORAGE_KEYS.ATTACHMENTS, map);
}

function getPresenceMap() {
    return readStore(MESSENGER_STORAGE_KEYS.PRESENCE, () => ({}));
}

function savePresenceMap(map) {
    writeStore(MESSENGER_STORAGE_KEYS.PRESENCE, map);
}

function getTypingMap() {
    return readStore(MESSENGER_STORAGE_KEYS.TYPING, () => ({}));
}

function saveTypingMap(map) {
    writeStore(MESSENGER_STORAGE_KEYS.TYPING, map);
}

function notifyConversationSubscribers(conversationId) {
    const subs = conversationListeners.get(conversationId);
    if (subs && subs.size > 0) {
        for (const entry of subs) {
            try {
                entry.deliver();
            } catch {
                // ignore subscriber error
            }
        }
    }
    const convMap = getAllConversationsMap();
    const conv = convMap[conversationId];
    if (conv && Array.isArray(conv.participants)) {
        for (const uid of conv.participants) {
            notifyUserInboxSubscribers(uid);
        }
    }
}

function notifyUserInboxSubscribers(userId) {
    const subs = userInboxListeners.get(userId);
    if (subs && subs.size > 0) {
        for (const callback of subs) {
            try {
                callback(getUserConversations(userId));
            } catch {
                // ignore callback error
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 1. Conversation Management & Access Control
// ---------------------------------------------------------------------------

export function getDirectConversationId(userAId, userBId) {
    const friendshipDocId = getFriendshipDocId(userAId, userBId);
    if (!friendshipDocId) return '';
    return `conv_${friendshipDocId}`;
}

/**
 * Verifies that `viewerId` is an authenticated participant of `conversationId`.
 * Throws an access denied error if non-participant or unauthenticated.
 */
export function getConversationForParticipant(conversationId, viewerId) {
    if (!viewerId) {
        throw new Error('Authentication required to access conversations.');
    }
    if (!conversationId) {
        throw new Error('Conversation ID is required.');
    }
    const convMap = getAllConversationsMap();
    const conv = convMap[conversationId];
    if (!conv) {
        throw new Error('Conversation not found.');
    }
    if (!Array.isArray(conv.participants) || !conv.participants.includes(viewerId)) {
        throw new Error('Access denied: You are not a participant of this conversation.');
    }
    return conv;
}

/**
 * Starts or retrieves a 1-to-1 conversation between two friends.
 * Enforces that both users are mutual friends and neither has blocked the other.
 */
export function ensureDirectConversation(actorId, friendUserId) {
    if (!actorId || !friendUserId) {
        throw new Error('Both participant user IDs are required.');
    }
    if (actorId === friendUserId) {
        throw new Error('Cannot start a conversation with yourself.');
    }
    if (isBlockedBetween(actorId, friendUserId)) {
        throw new Error('Cannot start a conversation: user is blocked.');
    }
    if (!areFriends(actorId, friendUserId)) {
        throw new Error('You can only start a conversation with friends.');
    }

    const conversationId = getDirectConversationId(actorId, friendUserId);
    const convMap = getAllConversationsMap();
    if (convMap[conversationId]) {
        return convMap[conversationId];
    }

    const participants = [String(actorId), String(friendUserId)].sort();
    const nowIso = new Date().toISOString();
    const conversation = {
        id: conversationId,
        type: 'direct', // 'direct' | 'group' (future compatible)
        participants,
        unreadCounts: {
            [participants[0]]: 0,
            [participants[1]]: 0
        },
        lastMessage: null,
        lastMessageAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        metadata: {
            futureGroupCompatible: true,
            phase3PaymentReady: true,
            voiceMessagesReady: true,
            groupSavingsChallengeReady: true
        }
    };

    convMap[conversationId] = conversation;
    saveAllConversationsMap(convMap);

    if (db) {
        setDoc(doc(db, 'conversations', conversationId), conversation, { merge: true }).catch(() => {});
    }

    for (const uid of participants) {
        notifyUserInboxSubscribers(uid);
    }

    return conversation;
}

/**
 * Future-compatible schema helper for group conversations (Phase 4+ ready).
 */
export function createGroupConversationStructure({ creatorId, participantIds = [], title = '', groupId = null, avatarUrl = '' }) {
    if (!creatorId) throw new Error('Creator ID is required.');
    const uniqueParticipants = Array.from(new Set([creatorId, ...participantIds])).filter(Boolean);
    const nowIso = new Date().toISOString();
    const unreadCounts = {};
    uniqueParticipants.forEach((uid) => {
        unreadCounts[uid] = 0;
    });
    return {
        id: groupId ? `conv_group_${groupId}` : `conv_group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'group',
        groupId: groupId || null,
        title: sanitizeText(title || 'Campus Group', 80),
        avatarUrl: avatarUrl || 'cat',
        creatorId,
        adminIds: [creatorId],
        participants: uniqueParticipants,
        unreadCounts,
        lastMessage: null,
        lastMessageAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        metadata: {
            futureGroupCompatible: true,
            phase3PaymentReady: true,
            phase4GroupReady: true
        }
    };
}

export function upsertGroupConversationInMessenger(groupConversation) {
    if (!groupConversation || !groupConversation.id) {
        throw new Error('Valid group conversation object is required.');
    }
    const convMap = getAllConversationsMap();
    const existing = convMap[groupConversation.id];
    const merged = {
        ...(existing || {}),
        ...groupConversation,
        unreadCounts: {
            ...(existing?.unreadCounts || {}),
            ...(groupConversation.unreadCounts || {})
        },
        lastMessage: groupConversation.lastMessage !== undefined ? groupConversation.lastMessage : (existing?.lastMessage || null),
        lastMessageAt: groupConversation.lastMessageAt !== undefined ? groupConversation.lastMessageAt : (existing?.lastMessageAt || null),
        updatedAt: new Date().toISOString()
    };
    convMap[merged.id] = merged;
    saveAllConversationsMap(convMap);
    if (db) {
        setDoc(doc(db, 'conversations', merged.id), merged, { merge: true }).catch(() => {});
    }
    if (Array.isArray(merged.participants)) {
        for (const uid of merged.participants) {
            notifyUserInboxSubscribers(uid);
        }
    }
    return merged;
}

/**
 * Lists all conversations for `userId` hydrated with friend profile (or group metadata), online presence,
 * unread message indicator, typing status, and search filtering.
 */
export function getUserConversations(userId, { searchQuery = '', includeEmptyFriends = false } = {}) {
    if (!userId) return [];
    const convMap = getAllConversationsMap();
    const q = String(searchQuery || '').trim().toLowerCase();

    const list = Object.values(convMap)
        .filter((conv) => Array.isArray(conv.participants) && conv.participants.includes(userId))
        .map((conv) => {
            const unreadCount = Number(conv.unreadCounts?.[userId] || 0);
            let typingUsers = [];
            try {
                typingUsers = getActiveTypingUsers(conv.id, userId);
            } catch {
                typingUsers = [];
            }

            if (conv.type === 'group') {
                const otherParticipantId = conv.participants.find((p) => p !== userId) || userId;
                const friendProfile = {
                    id: conv.groupId || conv.id,
                    displayName: conv.title || 'Campus Group',
                    username: `${conv.participants.length} members`,
                    handle: 'group_chat',
                    avatarId: conv.avatarUrl || 'cat',
                    avatarUrl: conv.avatarUrl || '',
                    isGroup: true
                };
                return {
                    ...conv,
                    otherParticipantId,
                    friendProfile,
                    presence: { state: 'online', lastSeen: null },
                    unreadCount,
                    hasUnread: unreadCount > 0,
                    typingUsers,
                    isTyping: typingUsers.length > 0,
                    isBlocked: false,
                    canSendMessage: true
                };
            }

            const otherParticipantId = conv.participants.find((p) => p !== userId) || userId;
            const friendProfile = getPublicProfileForViewer(otherParticipantId, userId) || getPublicProfile(otherParticipantId) || {
                id: otherParticipantId,
                displayName: 'KampusKash User',
                username: 'campus_user',
                handle: 'campus_user',
                avatarUrl: ''
            };
            const blocked = isBlockedBetween(userId, otherParticipantId);
            const stillFriends = areFriends(userId, otherParticipantId);
            const presence = getUserPresenceForViewer(otherParticipantId, userId);

            return {
                ...conv,
                otherParticipantId,
                friendProfile,
                presence,
                unreadCount,
                hasUnread: unreadCount > 0,
                typingUsers,
                isTyping: typingUsers.length > 0,
                isBlocked: blocked,
                canSendMessage: !blocked && stillFriends
            };
        })
        .filter((item) => {
            if (!includeEmptyFriends && !item.lastMessage && !q) {
                return true;
            }
            if (!q) return true;
            const nameMatch = (item.friendProfile.displayName || '').toLowerCase().includes(q);
            const handleMatch = (item.friendProfile.username || item.friendProfile.handle || '').toLowerCase().includes(q);
            const previewMatch = (item.lastMessage?.previewText || '').toLowerCase().includes(q);
            return nameMatch || handleMatch || previewMatch;
        });

    list.sort((a, b) => {
        const timeA = a.lastMessageAt || a.updatedAt || a.createdAt || '';
        const timeB = b.lastMessageAt || b.updatedAt || b.createdAt || '';
        return timeB.localeCompare(timeA);
    });

    return list;
}

export function getTotalUnreadMessageCount(userId) {
    if (!userId) return 0;
    const conversations = getUserConversations(userId);
    return conversations.reduce((sum, conv) => sum + (conv.isBlocked ? 0 : Number(conv.unreadCount || 0)), 0);
}

export function subscribeToUserConversations(userId, callback) {
    if (!userId || typeof callback !== 'function') return () => {};
    if (!userInboxListeners.has(userId)) {
        userInboxListeners.set(userId, new Set());
    }
    const set = userInboxListeners.get(userId);
    set.add(callback);
    callback(getUserConversations(userId));

    return () => {
        set.delete(callback);
    };
}

// ---------------------------------------------------------------------------
// 2. Image Sharing & Firebase Storage Attachment Validation
// ---------------------------------------------------------------------------

/**
 * Validates an image file before upload.
 * Rejects unsupported file types and files > MAX_CHAT_IMAGE_BYTES (5 MB).
 */
export function validateChatImageFile(file) {
    if (!file || typeof file !== 'object') {
        return { valid: false, error: 'Please select an image file to upload.' };
    }
    const mimeType = String(file.type || file.mimeType || '').toLowerCase();
    if (!ALLOWED_CHAT_IMAGE_TYPES.includes(mimeType)) {
        return {
            valid: false,
            error: `Unsupported file type "${mimeType || 'unknown'}". Only JPEG, PNG, WEBP, and GIF images are allowed.`
        };
    }
    const sizeBytes = Number(file.size ?? file.sizeBytes ?? 0);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return { valid: false, error: 'Image file appears to be empty.' };
    }
    if (sizeBytes > MAX_CHAT_IMAGE_BYTES) {
        const maxMb = (MAX_CHAT_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
        return {
            valid: false,
            error: `Image file size exceeds the ${maxMb}MB limit.`
        };
    }
    return { valid: true, mimeType, sizeBytes };
}

/**
 * Uploads an image attachment for a conversation to Firebase Storage (or isolated storage map)
 * and returns a lightweight metadata reference. Never stores raw binary data inside Firestore docs.
 */
export async function uploadConversationImage({
    conversationId,
    senderId,
    file,
    previewUrl = null
}) {
    const conv = getConversationForParticipant(conversationId, senderId);
    const otherParticipantId = conv.participants.find((p) => p !== senderId);
    if (conv.type === 'direct' && otherParticipantId) {
        if (isBlockedBetween(senderId, otherParticipantId)) {
            throw new Error('Cannot upload image: user is blocked.');
        }
        if (!areFriends(senderId, otherParticipantId)) {
            throw new Error('Cannot upload image: you must be friends with the recipient.');
        }
    }

    const validation = validateChatImageFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const rawName = String(file.name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFileName = rawName.slice(0, 60) || 'image.jpg';
    const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `conversations/${conversationId}/attachments/${senderId}_${attachmentId}_${safeFileName}`;

    let downloadUrl = previewUrl || `https://storage.kampuskash.local/${storagePath}`;

    if (storage && typeof file.arrayBuffer === 'function') {
        try {
            const ref = storageRef(storage, storagePath);
            await uploadBytes(ref, file, {
                contentType: validation.mimeType,
                customMetadata: {
                    conversationId,
                    senderId
                }
            });
            downloadUrl = await getDownloadURL(ref);
        } catch {
            // Fallback to local storage bucket reference if Firebase Storage network is offline
        }
    }

    const attachmentRecord = {
        id: attachmentId,
        conversationId,
        senderId,
        storagePath,
        downloadUrl,
        fileName: safeFileName,
        mimeType: validation.mimeType,
        sizeBytes: validation.sizeBytes,
        createdAt: new Date().toISOString()
    };

    const attachmentsMap = getAttachmentsMap();
    attachmentsMap[storagePath] = attachmentRecord;
    saveAttachmentsMap(attachmentsMap);

    return {
        storagePath,
        downloadUrl,
        fileName: safeFileName,
        mimeType: validation.mimeType,
        sizeBytes: validation.sizeBytes
    };
}

/**
 * Verifies that `viewerId` is a conversation participant before allowing retrieval of an attachment.
 */
export function getAttachmentForParticipant(conversationId, storagePath, viewerId) {
    getConversationForParticipant(conversationId, viewerId);
    if (!storagePath || !String(storagePath).startsWith(`conversations/${conversationId}/attachments/`)) {
        throw new Error('Access denied: Attachment does not belong to this conversation.');
    }
    const attachmentsMap = getAttachmentsMap();
    const record = attachmentsMap[storagePath];
    if (!record) {
        throw new Error('Attachment not found.');
    }
    return record;
}

// ---------------------------------------------------------------------------
// 3. Location Sharing (Explicit Consent Only)
// ---------------------------------------------------------------------------

/**
 * Prepares and validates a location share payload.
 * Requires `consentGranted === true` so location is never shared without explicit user consent.
 */
export function prepareLocationSharePayload({
    lat,
    lng,
    label = '',
    accuracy = null,
    consentGranted = false
} = {}) {
    if (consentGranted !== true) {
        throw new Error('Explicit user location consent is required before sharing location.');
    }
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new Error('Invalid latitude coordinate.');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('Invalid longitude coordinate.');
    }

    const roundedLat = Number(latitude.toFixed(6));
    const roundedLng = Number(longitude.toFixed(6));
    const cleanLabel = sanitizeText(label || 'Pinned Campus Location', 120);

    return {
        lat: roundedLat,
        lng: roundedLng,
        label: cleanLabel,
        accuracy: Number.isFinite(Number(accuracy)) ? Math.round(Number(accuracy)) : null,
        consentGranted: true,
        sharedAt: new Date().toISOString(),
        googleMapsUrl: `https://www.google.com/maps?q=${roundedLat},${roundedLng}`,
        appleMapsUrl: `https://maps.apple.com/?ll=${roundedLat},${roundedLng}&q=${encodeURIComponent(cleanLabel)}`,
        osmUrl: `https://www.openstreetmap.org/?mlat=${roundedLat}&mlon=${roundedLng}#map=16/${roundedLat}/${roundedLng}`
    };
}

/**
 * Requests a single point-in-time location fix from the browser ONLY when explicitly triggered by the user.
 * Never uses watchPosition or background tracking.
 */
export function requestBrowserLocationWithConsent({
    userInitiated = false,
    label = '',
    geolocationImpl = null
} = {}) {
    return new Promise((resolve, reject) => {
        if (userInitiated !== true) {
            reject(new Error('Location access must be explicitly initiated by the user.'));
            return;
        }
        const geo = geolocationImpl || (typeof navigator !== 'undefined' ? navigator.geolocation : null);
        if (!geo || typeof geo.getCurrentPosition !== 'function') {
            reject(new Error('Geolocation is not supported by your browser or device.'));
            return;
        }
        geo.getCurrentPosition(
            (pos) => {
                try {
                    const payload = prepareLocationSharePayload({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        label: label || 'Current Location',
                        consentGranted: true
                    });
                    resolve(payload);
                } catch (err) {
                    reject(err);
                }
            },
            (err) => {
                const msg = err?.code === 1
                    ? 'Location permission was denied. You can grant permission in your browser settings to share your location.'
                    : 'Unable to retrieve your current location. Please try again.';
                reject(new Error(msg));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// ---------------------------------------------------------------------------
// 4. Real-Time Messaging, Pagination, Reactions, Replies & Deletion
// ---------------------------------------------------------------------------

function buildMessagePreviewText(type, text, location, paymentMetadata) {
    switch (type) {
        case MESSAGE_TYPES.IMAGE:
            return text ? `📷 ${text}` : '📷 Photo';
        case MESSAGE_TYPES.LOCATION:
            return `📍 ${location?.label || 'Shared location'}`;
        case MESSAGE_TYPES.SYSTEM:
            return text || 'System update';
        case MESSAGE_TYPES.PAYMENT:
            return `💸 Demo Payment (${paymentMetadata?.paymentType || 'transfer'})`;
        default:
            return sanitizeText(text, 90);
    }
}

/**
 * Sends a message in a conversation after validating:
 * - Sender authentication & UID ownership
 * - Participant membership
 * - Friendship status & block status
 * - Rate limits
 * - Message type & payload schema (preventing raw binary storage in Firestore)
 */
export function sendMessage({
    conversationId,
    senderId,
    authenticatedUid = null,
    type = MESSAGE_TYPES.TEXT,
    text = '',
    attachment = null,
    location = null,
    replyTo = null,
    paymentMetadata = null,
    systemEvent = null
} = {}) {
    if (!senderId) {
        throw new Error('Authentication required to send a message.');
    }
    if (authenticatedUid && senderId !== authenticatedUid) {
        throw new Error('Sender ID mismatch: unauthorized sender.');
    }

    const convMap = getAllConversationsMap();
    const conv = convMap[conversationId];
    if (!conv) {
        throw new Error('Conversation not found.');
    }
    if (!Array.isArray(conv.participants) || !conv.participants.includes(senderId)) {
        throw new Error('Access denied: You are not a participant of this conversation.');
    }

    const recipientIds = conv.participants.filter((uid) => uid !== senderId);
    if (conv.type === 'direct' && recipientIds.length > 0) {
        const recipientId = recipientIds[0];
        if (isBlockedBetween(senderId, recipientId)) {
            throw new Error('Cannot send message: user is blocked.');
        }
        if (!areFriends(senderId, recipientId)) {
            throw new Error('Cannot send message: you must be friends to message this user.');
        }
    }

    const validTypes = Object.values(MESSAGE_TYPES);
    if (!validTypes.includes(type)) {
        throw new Error(`Unsupported message type "${type}".`);
    }

    if (type !== MESSAGE_TYPES.SYSTEM) {
        const rateCheck = checkRateLimit('message', senderId);
        if (!rateCheck.allowed) {
            throw new Error(rateCheck.error);
        }
    }

    const cleanText = sanitizeText(text, TEXT_LIMITS.MESSAGE_MAX || 2000);
    if (cleanText) {
        const modCheck = checkProfanityAndSpam(cleanText);
        if (!modCheck.valid) {
            throw new Error(modCheck.error);
        }
    }

    let normalizedAttachment = null;
    let normalizedLocation = null;
    let normalizedPaymentMetadata = null;

    if (type === MESSAGE_TYPES.TEXT) {
        if (!cleanText) {
            throw new Error('Message text cannot be empty.');
        }
    } else if (type === MESSAGE_TYPES.IMAGE) {
        if (!attachment || typeof attachment !== 'object') {
            throw new Error('Image message requires an uploaded storage attachment reference.');
        }
        for (const forbiddenKey of FORBIDDEN_MESSAGE_BINARY_KEYS) {
            if ( forbiddenKey in attachment && attachment[forbiddenKey] !== undefined && attachment[forbiddenKey] !== null ) {
                throw new Error(`Binary field "${forbiddenKey}" is forbidden in Firestore message documents. Store files in Firebase Storage.`);
            }
        }
        const storagePath = String(attachment.storagePath || '');
        if (!storagePath.startsWith(`conversations/${conversationId}/attachments/`)) {
            throw new Error('Invalid attachment storage path for this conversation.');
        }
        const validation = validateChatImageFile({
            type: attachment.mimeType,
            size: attachment.sizeBytes
        });
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        normalizedAttachment = {
            storagePath,
            downloadUrl: String(attachment.downloadUrl || ''),
            fileName: sanitizeText(attachment.fileName || 'image.jpg', 80),
            mimeType: validation.mimeType,
            sizeBytes: validation.sizeBytes
        };
    } else if (type === MESSAGE_TYPES.LOCATION) {
        if (!location || typeof location !== 'object') {
            throw new Error('Location message requires location coordinates and consent.');
        }
        normalizedLocation = prepareLocationSharePayload(location);
    } else if (type === MESSAGE_TYPES.PAYMENT) {
        if (!paymentMetadata || paymentMetadata.schemaOnlyReservation !== true) {
            throw new Error('In-chat payment execution is reserved for KampusKash Connect Phase 3.');
        }
        normalizedPaymentMetadata = {
            cardTitle: sanitizeText(paymentMetadata.cardTitle || 'Demo Money Sent', 60),
            paymentType: paymentMetadata.paymentType || 'transfer', // 'transfer' | 'request' | 'split' | 'request_settlement' | 'split_bill_settlement'
            amountRM: Number(paymentMetadata.amountRM || 0),
            totalAmountRM: paymentMetadata.totalAmountRM ? Number(paymentMetadata.totalAmountRM) : null,
            currency: paymentMetadata.currency || 'RM',
            senderId: String(paymentMetadata.senderId || senderId),
            senderName: sanitizeText(paymentMetadata.senderName || 'Student', 60),
            senderHandle: sanitizeText(paymentMetadata.senderHandle || 'student', 40),
            recipientId: String(paymentMetadata.recipientId || ''),
            recipientName: sanitizeText(paymentMetadata.recipientName || 'Friend', 60),
            recipientHandle: sanitizeText(paymentMetadata.recipientHandle || 'friend', 40),
            status: sanitizeText(paymentMetadata.status || 'Completed', 30),
            referenceCode: sanitizeText(paymentMetadata.referenceCode || '', 40),
            transferRefId: paymentMetadata.transferRefId || null,
            requestId: paymentMetadata.requestId || null,
            splitBillId: paymentMetadata.splitBillId || null,
            title: sanitizeText(paymentMetadata.title || '', 80),
            note: sanitizeText(paymentMetadata.note || '', 140),
            simulationBanner: 'DEMO MODE — SIMULATED MONEY — NO REAL FUNDS',
            isDemoOnly: true,
            phase: 3
        };
    }

    let normalizedReplyTo = null;
    if (replyTo && typeof replyTo === 'object' && replyTo.messageId) {
        normalizedReplyTo = {
            messageId: String(replyTo.messageId),
            senderId: String(replyTo.senderId || ''),
            senderName: sanitizeText(replyTo.senderName || 'Friend', 60),
            previewText: sanitizeText(replyTo.previewText || '', 120),
            type: String(replyTo.type || MESSAGE_TYPES.TEXT)
        };
    }

    const nowIso = new Date().toISOString();
    messageSequenceCounter += 1;
    const seq = messageSequenceCounter;
    const messageId = `msg_${Date.now()}_${String(seq).padStart(6, '0')}_${Math.random().toString(36).slice(2, 6)}`;
    const message = {
        id: messageId,
        seq,
        conversationId,
        senderId,
        type,
        text: cleanText,
        attachment: normalizedAttachment,
        location: normalizedLocation,
        replyTo: normalizedReplyTo,
        paymentMetadata: normalizedPaymentMetadata,
        systemEvent: systemEvent ? sanitizeText(String(systemEvent), 80) : null,
        reactions: {},
        status: 'delivered', // 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
        sentAt: nowIso,
        deliveredTo: [senderId, ...recipientIds],
        readBy: [senderId],
        readAt: {
            [senderId]: nowIso
        },
        deleted: false,
        deletedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const allMessagesMap = getAllMessagesByConversationMap();
    const convMessages = Array.isArray(allMessagesMap[conversationId]) ? allMessagesMap[conversationId] : [];
    convMessages.push(message);
    allMessagesMap[conversationId] = convMessages;
    saveAllMessagesByConversationMap(allMessagesMap);

    const previewText = buildMessagePreviewText(type, cleanText, normalizedLocation, normalizedPaymentMetadata);
    conv.lastMessage = {
        id: message.id,
        senderId,
        type,
        previewText,
        status: message.status,
        createdAt: nowIso
    };
    conv.lastMessageAt = nowIso;
    conv.updatedAt = nowIso;
    if (!conv.unreadCounts || typeof conv.unreadCounts !== 'object') {
        conv.unreadCounts = {};
    }
    for (const rid of recipientIds) {
        conv.unreadCounts[rid] = Number(conv.unreadCounts[rid] || 0) + 1;
    }
    convMap[conversationId] = conv;
    saveAllConversationsMap(convMap);

    // Clear sender's typing indicator automatically upon sending
    setTypingIndicator(conversationId, senderId, false);

    if (db) {
        setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), message).catch(() => {});
        setDoc(doc(db, 'conversations', conversationId), conv, { merge: true }).catch(() => {});
    }

    // Dispatch privacy-safe notifications to recipients
    for (const rid of recipientIds) {
        dispatchMessageNotification({
            message,
            conversation: conv,
            recipientId: rid
        });
    }

    notifyConversationSubscribers(conversationId);
    return message;
}

/**
 * Loads messages for a conversation in chronological order using pagination
 * rather than downloading the entire conversation history at once.
 */
export function getConversationMessages(
    conversationId,
    viewerId,
    {
        limit = MESSAGES_PAGE_SIZE,
        beforeTimestamp = null,
        beforeMessageId = null
    } = {}
) {
    getConversationForParticipant(conversationId, viewerId);

    const pageSize = Math.max(1, Math.min(100, Number(limit) || MESSAGES_PAGE_SIZE));
    const allMessagesMap = getAllMessagesByConversationMap();
    const rawList = Array.isArray(allMessagesMap[conversationId]) ? [...allMessagesMap[conversationId]] : [];

    // Sort chronologically ascending (oldest -> newest)
    rawList.sort((a, b) => {
        const cmp = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
        if (cmp !== 0) return cmp;
        if (Number.isFinite(a.seq) && Number.isFinite(b.seq) && a.seq !== b.seq) {
            return a.seq - b.seq;
        }
        return String(a.id || '').localeCompare(String(b.id || ''));
    });

    let eligible = rawList;
    if (beforeMessageId) {
        const idx = eligible.findIndex((m) => m.id === beforeMessageId);
        if (idx > 0) {
            eligible = eligible.slice(0, idx);
        } else if (idx === 0) {
            eligible = [];
        }
    } else if (beforeTimestamp) {
        eligible = eligible.filter((m) => String(m.createdAt || '') < String(beforeTimestamp));
    }

    const totalEligible = eligible.length;
    const startIndex = Math.max(0, totalEligible - pageSize);
    const pageMessages = eligible.slice(startIndex);
    const hasMore = startIndex > 0;

    return {
        messages: pageMessages,
        totalCount: rawList.length,
        hasMore,
        oldestTimestamp: pageMessages.length > 0 ? pageMessages[0].createdAt : null,
        oldestMessageId: pageMessages.length > 0 ? pageMessages[0].id : null,
        pageSize
    };
}

/**
 * Subscribes to real-time updates for a conversation's paginated messages.
 * Enforces participant access before attaching listener.
 */
export function subscribeToConversationMessages(
    conversationId,
    viewerId,
    onUpdate,
    { pageSize = MESSAGES_PAGE_SIZE } = {}
) {
    getConversationForParticipant(conversationId, viewerId);
    if (typeof onUpdate !== 'function') return () => {};

    let currentLimit = Math.max(1, Number(pageSize) || MESSAGES_PAGE_SIZE);

    const deliver = () => {
        const payload = getConversationMessages(conversationId, viewerId, { limit: currentLimit });
        onUpdate(payload);
    };

    if (!conversationListeners.has(conversationId)) {
        conversationListeners.set(conversationId, new Set());
    }
    const subEntry = {
        viewerId,
        deliver,
        setPageSize: (nextLimit) => {
            currentLimit = Math.max(currentLimit, Number(nextLimit) || currentLimit);
            deliver();
        }
    };
    conversationListeners.get(conversationId).add(subEntry);

    // Also attach Firestore real-time listener when Firebase is configured
    let unsubscribeFirestore = null;
    if (db) {
        try {
            const messagesQuery = query(
                collection(db, 'conversations', conversationId, 'messages'),
                orderBy('createdAt', 'desc'),
                firestoreLimit(currentLimit)
            );
            unsubscribeFirestore = onSnapshot(
                messagesQuery,
                (snapshot) => {
                    if (!snapshot || snapshot.empty) return;
                    const allMessagesMap = getAllMessagesByConversationMap();
                    const existing = Array.isArray(allMessagesMap[conversationId])
                        ? [...allMessagesMap[conversationId]]
                        : [];
                    const byId = new Map(existing.map((m) => [m.id, m]));
                    let changed = false;
                    snapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        if (data && data.id) {
                            byId.set(data.id, data);
                            changed = true;
                        }
                    });
                    if (changed) {
                        allMessagesMap[conversationId] = Array.from(byId.values());
                        saveAllMessagesByConversationMap(allMessagesMap);
                        deliver();
                    }
                },
                () => {}
            );
        } catch {
            // ignore query setup error in offline/mock environments
        }
    }

    // Immediate initial delivery
    deliver();

    return () => {
        const subs = conversationListeners.get(conversationId);
        if (subs) {
            subs.delete(subEntry);
        }
        if (typeof unsubscribeFirestore === 'function') {
            unsubscribeFirestore();
        }
    };
}

/**
 * Marks all unread messages in `conversationId` as read by `readerId` and resets unread count.
 */
export function markConversationRead(conversationId, readerId) {
    const conv = getConversationForParticipant(conversationId, readerId);
    const allMessagesMap = getAllMessagesByConversationMap();
    const messages = Array.isArray(allMessagesMap[conversationId]) ? allMessagesMap[conversationId] : [];
    const nowIso = new Date().toISOString();
    let updatedAny = false;

    for (const msg of messages) {
        if (!Array.isArray(msg.readBy)) {
            msg.readBy = [msg.senderId];
        }
        if (!msg.readBy.includes(readerId)) {
            msg.readBy.push(readerId);
            if (!msg.readAt || typeof msg.readAt !== 'object') {
                msg.readAt = {};
            }
            msg.readAt[readerId] = nowIso;
            if (msg.senderId !== readerId) {
                msg.status = 'read';
            }
            msg.updatedAt = nowIso;
            updatedAny = true;

            if (db) {
                updateDoc(doc(db, 'conversations', conversationId, 'messages', msg.id), {
                    readBy: msg.readBy,
                    readAt: msg.readAt,
                    status: msg.status,
                    updatedAt: nowIso
                }).catch(() => {});
            }
        }
    }

    const convMap = getAllConversationsMap();
    const targetConv = convMap[conversationId] || conv;
    const prevUnread = Number(targetConv.unreadCounts?.[readerId] || 0);
    if (!targetConv.unreadCounts) targetConv.unreadCounts = {};
    targetConv.unreadCounts[readerId] = 0;

    if (targetConv.lastMessage && targetConv.lastMessage.senderId !== readerId) {
        targetConv.lastMessage.status = 'read';
    }

    if (updatedAny || prevUnread > 0) {
        allMessagesMap[conversationId] = messages;
        saveAllMessagesByConversationMap(allMessagesMap);
        convMap[conversationId] = targetConv;
        saveAllConversationsMap(convMap);

        if (db) {
            setDoc(doc(db, 'conversations', conversationId), targetConv, { merge: true }).catch(() => {});
        }
        notifyConversationSubscribers(conversationId);
    }

    return targetConv;
}

/**
 * Toggles an emoji reaction on a message.
 */
export function toggleMessageReaction({ conversationId, messageId, actorId, emoji }) {
    getConversationForParticipant(conversationId, actorId);
    if (!MESSAGE_REACTIONS.includes(emoji)) {
        throw new Error('Unsupported reaction emoji.');
    }

    const allMessagesMap = getAllMessagesByConversationMap();
    const messages = Array.isArray(allMessagesMap[conversationId]) ? allMessagesMap[conversationId] : [];
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) {
        throw new Error('Message not found.');
    }
    if (msg.deleted) {
        throw new Error('Cannot react to a deleted message.');
    }

    if (!msg.reactions || typeof msg.reactions !== 'object') {
        msg.reactions = {};
    }
    if (msg.reactions[actorId] === emoji) {
        delete msg.reactions[actorId];
    } else {
        msg.reactions[actorId] = emoji;
    }
    msg.updatedAt = new Date().toISOString();

    allMessagesMap[conversationId] = messages;
    saveAllMessagesByConversationMap(allMessagesMap);

    if (db) {
        updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
            reactions: msg.reactions,
            updatedAt: msg.updatedAt
        }).catch(() => {});
    }

    notifyConversationSubscribers(conversationId);
    return msg;
}

/**
 * Deletes a message. Enforces that users can ONLY delete their own messages.
 */
export function deleteMessage({ conversationId, messageId, actorId }) {
    const conv = getConversationForParticipant(conversationId, actorId);
    const allMessagesMap = getAllMessagesByConversationMap();
    const messages = Array.isArray(allMessagesMap[conversationId]) ? allMessagesMap[conversationId] : [];
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) {
        throw new Error('Message not found.');
    }
    if (msg.senderId !== actorId) {
        throw new Error('Permission denied: You can only delete your own messages.');
    }

    const nowIso = new Date().toISOString();
    msg.deleted = true;
    msg.deletedAt = nowIso;
    msg.text = 'This message was deleted';
    msg.attachment = null;
    msg.location = null;
    msg.reactions = {};
    msg.updatedAt = nowIso;

    allMessagesMap[conversationId] = messages;
    saveAllMessagesByConversationMap(allMessagesMap);

    const convMap = getAllConversationsMap();
    const targetConv = convMap[conversationId] || conv;
    if (targetConv.lastMessage && targetConv.lastMessage.id === messageId) {
        targetConv.lastMessage.previewText = '🚫 This message was deleted';
        targetConv.updatedAt = nowIso;
        convMap[conversationId] = targetConv;
        saveAllConversationsMap(convMap);
    }

    if (db) {
        updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
            deleted: true,
            deletedAt: nowIso,
            text: 'This message was deleted',
            attachment: null,
            location: null,
            reactions: {},
            updatedAt: nowIso
        }).catch(() => {});
    }

    notifyConversationSubscribers(conversationId);
    return msg;
}

// ---------------------------------------------------------------------------
// 5. Online Status, Presence & Typing Indicators
// ---------------------------------------------------------------------------

/**
 * Updates a user's presence state ('online' | 'offline') and last-seen timestamp.
 * Important: Does NOT mark the user offline simply because the browser tab is in the background.
 */
export function setUserPresence(userId, state = 'online', { isBackgroundTab = false } = {}) {
    if (!userId) return null;

    const presenceMap = getPresenceMap();
    const existing = presenceMap[userId] || { state: 'offline', lastSeen: null };
    const nowIso = new Date().toISOString();

    // Do not mark a user offline simply because the app is in the background
    const effectiveState = isBackgroundTab && state === 'offline'
        ? (existing.state || 'online')
        : (state === 'online' ? 'online' : 'offline');

    const record = {
        userId,
        state: effectiveState,
        lastSeen: nowIso,
        updatedAt: nowIso
    };

    presenceMap[userId] = record;
    savePresenceMap(presenceMap);

    if (rtdb) {
        try {
            const statusRef = rtdbRef(rtdb, `status/${userId}`);
            const disconnectPayload = {
                userId,
                state: 'offline',
                lastSeen: nowIso
            };
            const onlinePayload = {
                userId,
                state: effectiveState,
                lastSeen: nowIso
            };
            const onDisc = rtdbOnDisconnect(statusRef);
            if (onDisc && typeof onDisc.set === 'function') {
                onDisc.set(disconnectPayload).catch(() => {});
            }
            rtdbSet(statusRef, onlinePayload).catch(() => {});
        } catch {
            // ignore RTDB offline error
        }
    }

    if (db) {
        setDoc(doc(db, 'userPresence', userId), record, { merge: true }).catch(() => {});
    }

    return record;
}

/**
 * Retrieves `targetUserId`'s online status and last-seen timestamp as visible to `viewerId`,
 * strictly respecting block status and `privacySettings.showOnlineStatus` / `showLastSeen`.
 */
export function getUserPresenceForViewer(targetUserId, viewerId = null) {
    if (!targetUserId) {
        return { state: 'offline', lastSeen: null, hiddenByPrivacy: true };
    }
    if (viewerId && isBlockedBetween(targetUserId, viewerId)) {
        return { state: 'offline', lastSeen: null, hiddenByPrivacy: true };
    }

    const profile = getPublicProfile(targetUserId);
    const privacy = normalizePrivacySettings(profile?.privacySettings);

    const presenceMap = getPresenceMap();
    const rawPresence = presenceMap[targetUserId] || {
        state: profile?.isPitchDemo ? 'online' : 'offline',
        lastSeen: profile?.updatedAt || null
    };

    const isSelf = viewerId && targetUserId === viewerId;
    const showOnline = isSelf || privacy.showOnlineStatus !== false;
    const showLastSeen = isSelf || privacy.showLastSeen !== false;

    return {
        userId: targetUserId,
        state: showOnline ? (rawPresence.state || 'offline') : 'offline',
        lastSeen: showLastSeen ? (rawPresence.lastSeen || null) : null,
        onlineHidden: !showOnline,
        lastSeenHidden: !showLastSeen,
        hiddenByPrivacy: !showOnline && !showLastSeen
    };
}

/**
 * Sets or clears a lightweight typing indicator with automatic expiration (`TYPING_INDICATOR_EXPIRY_MS` = 4000ms)
 * and debounce protection to avoid excessive writes.
 */
export function setTypingIndicator(conversationId, userId, isTyping = true, { nowMs = Date.now(), force = false } = {}) {
    if (!conversationId || !userId) return null;
    getConversationForParticipant(conversationId, userId);

    const debounceKey = `${conversationId}_${userId}`;
    const lastWriteMs = typingDebounceMap.get(debounceKey) || 0;
    if (isTyping && !force && nowMs - lastWriteMs < 600) {
        // Debounce rapid keystrokes while still refreshing local expiry
        const typingMap = getTypingMap();
        if (typingMap[conversationId]?.[userId]) {
            typingMap[conversationId][userId].expiresAt = nowMs + TYPING_INDICATOR_EXPIRY_MS;
            saveTypingMap(typingMap);
            return typingMap[conversationId][userId];
        }
    }
    typingDebounceMap.set(debounceKey, nowMs);

    const typingMap = getTypingMap();
    if (!typingMap[conversationId] || typeof typingMap[conversationId] !== 'object') {
        typingMap[conversationId] = {};
    }

    if (!isTyping) {
        delete typingMap[conversationId][userId];
        saveTypingMap(typingMap);
        if (rtdb) {
            try {
                rtdbSet(rtdbRef(rtdb, `typing/${conversationId}/${userId}`), null).catch(() => {});
            } catch {
                // ignore
            }
        }
        notifyConversationSubscribers(conversationId);
        return null;
    }

    const entry = {
        userId,
        conversationId,
        isTyping: true,
        startedAt: nowMs,
        expiresAt: nowMs + TYPING_INDICATOR_EXPIRY_MS
    };
    typingMap[conversationId][userId] = entry;
    saveTypingMap(typingMap);

    if (rtdb) {
        try {
            const ref = rtdbRef(rtdb, `typing/${conversationId}/${userId}`);
            const onDisc = rtdbOnDisconnect(ref);
            if (onDisc && typeof onDisc.remove === 'function') {
                onDisc.remove().catch(() => {});
            }
            rtdbSet(ref, entry).catch(() => {});
        } catch {
            // ignore
        }
    }

    notifyConversationSubscribers(conversationId);
    return entry;
}

/**
 * Returns active typing users in `conversationId` (excluding `viewerId`),
 * automatically pruning indicators that have expired past `TYPING_INDICATOR_EXPIRY_MS`.
 */
export function getActiveTypingUsers(conversationId, viewerId, nowMs = Date.now()) {
    getConversationForParticipant(conversationId, viewerId);
    const typingMap = getTypingMap();
    const convTyping = typingMap[conversationId];
    if (!convTyping || typeof convTyping !== 'object') return [];

    const active = [];
    let pruned = false;

    for (const [uid, entry] of Object.entries(convTyping)) {
        if (!entry || !entry.isTyping || Number(entry.expiresAt || 0) <= nowMs) {
            delete convTyping[uid];
            pruned = true;
            continue;
        }
        if (uid !== viewerId && !isBlockedBetween(viewerId, uid)) {
            const profile = getPublicProfile(uid);
            active.push({
                userId: uid,
                displayName: profile?.displayName || 'Friend',
                username: profile?.username || profile?.handle || 'friend',
                expiresAt: entry.expiresAt
            });
        }
    }

    if (pruned) {
        saveTypingMap(typingMap);
    }

    return active;
}

// ---------------------------------------------------------------------------
// 6. Notifications (Firebase Cloud Messaging & Privacy-Safe Push)
// ---------------------------------------------------------------------------

export function getMessagingNotificationPrefs(userId) {
    if (!userId) return { ...DEFAULT_MESSAGING_NOTIFICATION_PREFS };
    const map = readStore(MESSENGER_STORAGE_KEYS.NOTIFICATION_PREFS, () => ({}));
    const saved = map[userId] || {};
    return {
        enabled: saved.enabled !== undefined ? Boolean(saved.enabled) : true,
        sound: saved.sound !== undefined ? Boolean(saved.sound) : true,
        showPreviewText: saved.showPreviewText !== undefined ? Boolean(saved.showPreviewText) : false,
        fcmToken: saved.fcmToken || null
    };
}

export function updateMessagingNotificationPrefs(userId, patch = {}) {
    if (!userId) throw new Error('User ID is required to update notification preferences.');
    const map = readStore(MESSENGER_STORAGE_KEYS.NOTIFICATION_PREFS, () => ({}));
    const current = getMessagingNotificationPrefs(userId);
    const next = {
        enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
        sound: patch.sound !== undefined ? Boolean(patch.sound) : current.sound,
        showPreviewText: patch.showPreviewText !== undefined ? Boolean(patch.showPreviewText) : current.showPreviewText,
        fcmToken: patch.fcmToken !== undefined ? patch.fcmToken : current.fcmToken,
        updatedAt: new Date().toISOString()
    };
    map[userId] = next;
    writeStore(MESSENGER_STORAGE_KEYS.NOTIFICATION_PREFS, map);
    return next;
}

export async function requestMessagingNotificationPermission(userId) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return { permission: 'unsupported', enabled: false };
    }
    let permission = window.Notification.permission;
    if (permission === 'default') {
        try {
            permission = await window.Notification.requestPermission();
        } catch {
            permission = 'denied';
        }
    }
    const granted = permission === 'granted';
    if (userId) {
        updateMessagingNotificationPrefs(userId, { enabled: granted });
    }
    return { permission, enabled: granted };
}

/**
 * Dispatches a deduplicated, lock-screen-privacy-safe notification for a new message.
 * - Never sends duplicate notifications for the same `message.id` and `recipientId`.
 * - Respects `prefs.enabled` and block state.
 * - Hides private message content on lock-screen (`lockScreenBody`) unless `prefs.showPreviewText === true`.
 */
export function dispatchMessageNotification({ message, conversation, recipientId }) {
    if (!message || !recipientId || message.senderId === recipientId) {
        return { dispatched: false, reason: 'self_or_invalid' };
    }
    if (isBlockedBetween(message.senderId, recipientId)) {
        return { dispatched: false, reason: 'blocked' };
    }

    const prefs = getMessagingNotificationPrefs(recipientId);
    if (!prefs.enabled) {
        return { dispatched: false, reason: 'disabled_by_user' };
    }

    const dedupKey = `msg_notif_${recipientId}_${message.id}`;
    const dispatchedMap = readStore(MESSENGER_STORAGE_KEYS.DISPATCHED_NOTIFICATIONS, () => ({}));
    if (dispatchedMap[dedupKey]) {
        return { dispatched: false, reason: 'duplicate', notification: dispatchedMap[dedupKey] };
    }

    const senderProfile = getPublicProfile(message.senderId);
    const senderName = senderProfile?.displayName || 'A friend';
    const senderHandle = senderProfile?.username || senderProfile?.handle || 'friend';
    const rawPreview = buildMessagePreviewText(
        message.type,
        message.text,
        message.location,
        message.paymentMetadata
    );

    // Lock-screen safe body: hides private message content unless user explicitly enabled `showPreviewText`
    const lockScreenBody = prefs.showPreviewText
        ? `${senderName}: ${rawPreview}`
        : `New message from ${senderName} (@${senderHandle})`;

    const notificationRecord = {
        id: dedupKey,
        messageId: message.id,
        conversationId: conversation?.id || message.conversationId,
        recipientId,
        senderId: message.senderId,
        senderName,
        senderHandle,
        title: 'KampusKash Connect',
        lockScreenBody,
        inAppPreview: `${senderName}: ${rawPreview}`,
        previewExposedOnLockScreen: Boolean(prefs.showPreviewText),
        sound: Boolean(prefs.sound),
        createdAt: new Date().toISOString()
    };

    dispatchedMap[dedupKey] = notificationRecord;
    writeStore(MESSENGER_STORAGE_KEYS.DISPATCHED_NOTIFICATIONS, dispatchedMap);

    return {
        dispatched: true,
        notification: notificationRecord
    };
}

export function getDispatchedMessageNotifications(recipientId) {
    if (!recipientId) return [];
    const dispatchedMap = readStore(MESSENGER_STORAGE_KEYS.DISPATCHED_NOTIFICATIONS, () => ({}));
    return Object.values(dispatchedMap)
        .filter((n) => n.recipientId === recipientId)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

// Force reference to rtdbOnValue so tree-shakers keep RTDB bindings available
export const _rtdbBindingsReady = Boolean(rtdbOnValue);
