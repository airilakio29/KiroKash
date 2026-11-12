import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    MessageSquare,
    Search,
    Send,
    Image as ImageIcon,
    MapPin,
    Smile,
    Reply,
    Copy,
    Trash2,
    ArrowLeft,
    Check,
    CheckCheck,
    MoreVertical,
    ShieldOff,
    Flag,
    Bell,
    Eye,
    X,
    ExternalLink,
    Plus,
    Loader2,
    Sparkles,
    ChevronUp,
    UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import UserAvatar from '../components/UserAvatar';
import { getAvatarSvg } from '../components/Avatars';
import {
    MESSAGES_SECTION_NAME,
    MESSAGES_SECTION_SUBTITLE,
    MESSAGE_TYPES,
    MESSAGE_REACTIONS,
    MESSAGES_PAGE_SIZE
} from '../config/appConstants';
import {
    ensureDirectConversation,
    getUserConversations,
    subscribeToConversationMessages,
    sendMessage,
    markConversationRead,
    toggleMessageReaction,
    deleteMessage,
    validateChatImageFile,
    uploadConversationImage,
    prepareLocationSharePayload,
    requestBrowserLocationWithConsent,
    setTypingIndicator,
    getActiveTypingUsers,
    getUserPresenceForViewer,
    getMessagingNotificationPrefs,
    updateMessagingNotificationPrefs,
    requestMessagingNotificationPermission
} from '../services/messengerService';

const CAMPUS_QUICK_LOCATIONS = [
    { label: 'UM Central Library (Perpustakaan Utama)', lat: 3.1209, lng: 101.6538 },
    { label: 'Kolej Kediaman Cafeteria Hub', lat: 3.1245, lng: 101.6512 },
    { label: 'Student Union Study Lounge', lat: 3.1198, lng: 101.6564 }
];

function renderAvatar(profile, size = 44, showOnlineDot = false, isOnline = false) {
    const avatarId = profile?.avatarId || profile?.avatar || 'cat';
    const isCustomOrPreset =
        typeof avatarId === 'string' &&
        (avatarId.startsWith('preset-') || avatarId.startsWith('data:') || avatarId.startsWith('http'));

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            {isCustomOrPreset ? (
                <UserAvatar avatar={avatarId} name={profile?.displayName || 'Student'} size={size} />
            ) : (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                        border: '2px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {getAvatarSvg(avatarId)}
                </div>
            )}
            {showOnlineDot && (
                <span
                    title={isOnline ? 'Online' : 'Offline'}
                    style={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: Math.max(10, Math.round(size * 0.26)),
                        height: Math.max(10, Math.round(size * 0.26)),
                        borderRadius: '50%',
                        background: isOnline ? 'var(--accent-green)' : 'var(--text-muted)',
                        border: '2px solid var(--bg-card)'
                    }}
                />
            )}
        </div>
    );
}

function formatMessageTime(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function formatConversationTimestamp(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        if (sameDay) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

function formatLastSeen(iso) {
    if (!iso) return 'Offline';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return 'Offline';
        return `Last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
        return 'Offline';
    }
}

export default function MessagesView() {
    const { user } = useAuth();
    const {
        publicProfile,
        friendsList = [],
        conversations: contextConversations = [],
        activeConversationId,
        setActiveConversationId,
        setSelectedPublicProfileId,
        updatePrivacySettings,
        block,
        unblock,
        report,
        refreshSocialAndWalletState
    } = useSocialWallet() || {};

    const userId = user?.id;

    // Responsive mobile detection + visualViewport keyboard adjustment
    const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 860 : false));
    const [viewportOffsetBottom, setViewportOffsetBottom] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const onResize = () => {
            setIsMobileView(window.innerWidth < 860);
        };
        window.addEventListener('resize', onResize);

        const vv = window.visualViewport;
        const onViewportResize = () => {
            if (!vv) return;
            const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            setViewportOffsetBottom(keyboardHeight);
        };
        if (vv) {
            vv.addEventListener('resize', onViewportResize);
            vv.addEventListener('scroll', onViewportResize);
        }

        return () => {
            window.removeEventListener('resize', onResize);
            if (vv) {
                vv.removeEventListener('resize', onViewportResize);
                vv.removeEventListener('scroll', onViewportResize);
            }
        };
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState([]);
    const [pageLimit, setPageLimit] = useState(MESSAGES_PAGE_SIZE);
    const [messagePageState, setMessagePageState] = useState({
        messages: [],
        totalCount: 0,
        hasMore: false,
        oldestTimestamp: null
    });
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Composer & interaction states
    const [composerText, setComposerText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState(null);
    const [copiedMsgId, setCopiedMsgId] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);

    // Modals: Image Preview before sending, Lightbox, Location Share with explicit consent, New Chat, Settings, Report
    const [pendingImageModal, setPendingImageModal] = useState(null); // { file, previewUrl, caption, uploading, error }
    const [lightboxImage, setLightboxImage] = useState(null); // { url, caption, fileName }
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locationDraft, setLocationDraft] = useState(null); // { lat, lng, label, accuracy, consentGranted }
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [newChatModalOpen, setNewChatModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('Spam or unwanted messages');

    // Notification & Presence privacy state
    const [notifPrefs, setNotifPrefs] = useState(() => getMessagingNotificationPrefs(userId));
    const [showOnlineStatus, setShowOnlineStatus] = useState(
        publicProfile?.privacySettings?.showOnlineStatus !== false
    );
    const [showLastSeen, setShowLastSeen] = useState(
        publicProfile?.privacySettings?.showLastSeen !== false
    );

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const composerInputRef = useRef(null);
    const typingStopTimerRef = useRef(null);

    const showToast = useCallback((msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => {
            setToastMessage((prev) => (prev?.text === msg ? null : prev));
        }, 3400);
    }, []);

    // Refresh local conversation list whenever searchQuery or contextConversations change
    const refreshConversationList = useCallback(() => {
        if (!userId) return;
        const list = getUserConversations(userId, { searchQuery, includeEmptyFriends: true });
        setConversations(list);
    }, [userId, searchQuery]);

    useEffect(() => {
        refreshConversationList();
    }, [refreshConversationList, contextConversations]);

    // Auto-select first conversation on desktop if none selected
    useEffect(() => {
        if (!isMobileView && !activeConversationId && conversations.length > 0) {
            setActiveConversationId(conversations[0].id);
        }
    }, [isMobileView, activeConversationId, conversations, setActiveConversationId]);

    const selectedConversation = useMemo(() => {
        if (!activeConversationId) return null;
        return conversations.find((c) => c.id === activeConversationId) || null;
    }, [conversations, activeConversationId]);

    // Subscribe to messages for the active conversation
    useEffect(() => {
        if (!userId || !activeConversationId) {
            setMessagePageState({ messages: [], totalCount: 0, hasMore: false, oldestTimestamp: null });
            return undefined;
        }
        setIsLoadingMessages(true);
        let unsub = null;
        try {
            unsub = subscribeToConversationMessages(
                activeConversationId,
                userId,
                (pageData) => {
                    setMessagePageState(pageData);
                    setIsLoadingMessages(false);
                    try {
                        markConversationRead(activeConversationId, userId);
                        refreshConversationList();
                    } catch {
                        // ignore read mark error
                    }
                },
                { pageSize: pageLimit }
            );
        } catch (err) {
            setIsLoadingMessages(false);
            showToast(err.message || 'Unable to load conversation.', 'error');
        }

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [userId, activeConversationId, pageLimit, refreshConversationList, showToast]);

    // Poll typing indicator expiry every 1.2s for active conversation so expired indicators disappear smoothly
    useEffect(() => {
        if (!userId || !activeConversationId) {
            setTypingUsers([]);
            return undefined;
        }
        const updateTyping = () => {
            try {
                const active = getActiveTypingUsers(activeConversationId, userId);
                setTypingUsers(active);
            } catch {
                setTypingUsers([]);
            }
        };
        updateTyping();
        const timer = setInterval(updateTyping, 1200);
        return () => clearInterval(timer);
    }, [userId, activeConversationId, messagePageState]);

    // Scroll to bottom when new message arrives
    useEffect(() => {
        if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messagePageState.messages.length, activeConversationId]);

    const handleSelectConversation = (convId) => {
        setPageLimit(MESSAGES_PAGE_SIZE);
        setReplyingTo(null);
        setActiveReactionPickerMsgId(null);
        setHeaderMenuOpen(false);
        setActiveConversationId(convId);
        if (userId && convId) {
            try {
                markConversationRead(convId, userId);
                refreshConversationList();
            } catch {
                // ignore
            }
        }
    };

    const handleStartChatWithFriend = (friendId) => {
        if (!userId || !friendId) return;
        try {
            const conv = ensureDirectConversation(userId, friendId);
            setNewChatModalOpen(false);
            refreshConversationList();
            handleSelectConversation(conv.id);
        } catch (err) {
            showToast(err.message || 'Could not start conversation.', 'error');
        }
    };

    const handleComposerChange = (e) => {
        const val = e.target.value;
        setComposerText(val);
        if (!activeConversationId || !userId) return;

        try {
            if (val.trim().length > 0) {
                setTypingIndicator(activeConversationId, userId, true);
                if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
                typingStopTimerRef.current = setTimeout(() => {
                    try {
                        setTypingIndicator(activeConversationId, userId, false);
                    } catch {
                        // ignore
                    }
                }, 3200);
            } else {
                setTypingIndicator(activeConversationId, userId, false);
            }
        } catch {
            // ignore typing indicator error
        }
    };

    const handleSendTextMessage = (e) => {
        if (e) e.preventDefault();
        if (!userId || !activeConversationId) return;
        const trimmed = composerText.trim();
        if (!trimmed) return;

        try {
            sendMessage({
                conversationId: activeConversationId,
                senderId: userId,
                authenticatedUid: userId,
                type: MESSAGE_TYPES.TEXT,
                text: trimmed,
                replyTo: replyingTo
                    ? {
                          messageId: replyingTo.id,
                          senderId: replyingTo.senderId,
                          senderName:
                              replyingTo.senderId === userId
                                  ? 'You'
                                  : selectedConversation?.friendProfile?.displayName || 'Friend',
                          previewText: replyingTo.text || 'Attachment',
                          type: replyingTo.type
                      }
                    : null
            });
            setComposerText('');
            setReplyingTo(null);
            refreshConversationList();
        } catch (err) {
            showToast(err.message || 'Failed to send message.', 'error');
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (e.target) e.target.value = '';
        if (!file) return;

        const check = validateChatImageFile(file);
        if (!check.valid) {
            showToast(check.error, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setPendingImageModal({
                file,
                previewUrl: String(reader.result || ''),
                caption: '',
                uploading: false,
                error: ''
            });
        };
        reader.onerror = () => {
            showToast('Failed to read selected image file.', 'error');
        };
        reader.readAsDataURL(file);
    };

    const handleConfirmSendImage = async () => {
        if (!pendingImageModal || !activeConversationId || !userId) return;
        setPendingImageModal((prev) => ({ ...prev, uploading: true, error: '' }));

        try {
            const uploaded = await uploadConversationImage({
                conversationId: activeConversationId,
                senderId: userId,
                file: pendingImageModal.file,
                previewUrl: pendingImageModal.previewUrl
            });

            sendMessage({
                conversationId: activeConversationId,
                senderId: userId,
                authenticatedUid: userId,
                type: MESSAGE_TYPES.IMAGE,
                text: pendingImageModal.caption.trim(),
                attachment: uploaded,
                replyTo: replyingTo
                    ? {
                          messageId: replyingTo.id,
                          senderId: replyingTo.senderId,
                          senderName:
                              replyingTo.senderId === userId
                                  ? 'You'
                                  : selectedConversation?.friendProfile?.displayName || 'Friend',
                          previewText: replyingTo.text || '📷 Photo',
                          type: replyingTo.type
                      }
                    : null
            });

            setPendingImageModal(null);
            setReplyingTo(null);
            refreshConversationList();
            showToast('Image sent.');
        } catch (err) {
            setPendingImageModal((prev) =>
                prev ? { ...prev, uploading: false, error: err.message || 'Failed to upload image.' } : null
            );
        }
    };

    const handleOpenLocationModal = () => {
        setLocationError('');
        setLocationDraft(null);
        setLocationModalOpen(true);
    };

    const handleRequestBrowserGpsLocation = async () => {
        setLocationLoading(true);
        setLocationError('');
        try {
            const payload = await requestBrowserLocationWithConsent({
                userInitiated: true,
                label: 'Current GPS Location'
            });
            setLocationDraft(payload);
        } catch (err) {
            setLocationError(err.message || 'Could not retrieve GPS location.');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSelectQuickCampusPin = (pin) => {
        setLocationError('');
        try {
            const payload = prepareLocationSharePayload({
                lat: pin.lat,
                lng: pin.lng,
                label: pin.label,
                consentGranted: true
            });
            setLocationDraft(payload);
        } catch (err) {
            setLocationError(err.message);
        }
    };

    const handleConfirmSendLocation = () => {
        if (!locationDraft || !activeConversationId || !userId) return;
        try {
            sendMessage({
                conversationId: activeConversationId,
                senderId: userId,
                authenticatedUid: userId,
                type: MESSAGE_TYPES.LOCATION,
                text: locationDraft.label || 'Shared Location',
                location: {
                    ...locationDraft,
                    consentGranted: true
                },
                replyTo: replyingTo
                    ? {
                          messageId: replyingTo.id,
                          senderId: replyingTo.senderId,
                          senderName:
                              replyingTo.senderId === userId
                                  ? 'You'
                                  : selectedConversation?.friendProfile?.displayName || 'Friend',
                          previewText: replyingTo.text || '📍 Location',
                          type: replyingTo.type
                      }
                    : null
            });
            setLocationModalOpen(false);
            setLocationDraft(null);
            setReplyingTo(null);
            refreshConversationList();
            showToast('Location shared.');
        } catch (err) {
            setLocationError(err.message || 'Failed to share location.');
        }
    };

    const handleToggleReaction = (messageId, emoji) => {
        if (!userId || !activeConversationId) return;
        try {
            toggleMessageReaction({
                conversationId: activeConversationId,
                messageId,
                actorId: userId,
                emoji
            });
            setActiveReactionPickerMsgId(null);
        } catch (err) {
            showToast(err.message || 'Could not add reaction.', 'error');
        }
    };

    const handleDeleteOwnMessage = (messageId) => {
        if (!userId || !activeConversationId) return;
        try {
            deleteMessage({
                conversationId: activeConversationId,
                messageId,
                actorId: userId
            });
            refreshConversationList();
            showToast('Message deleted.');
        } catch (err) {
            showToast(err.message || 'Could not delete message.', 'error');
        }
    };

    const handleCopyMessageText = async (msg) => {
        const textToCopy = msg.text || msg.location?.googleMapsUrl || '';
        if (!textToCopy) return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(textToCopy);
            }
            setCopiedMsgId(msg.id);
            setTimeout(() => setCopiedMsgId(null), 1800);
            showToast('Copied to clipboard.');
        } catch {
            showToast('Copied message text.');
        }
    };

    const handleBlockOrUnblockPartner = () => {
        if (!selectedConversation) return;
        const targetId = selectedConversation.otherParticipantId;
        try {
            if (selectedConversation.isBlocked) {
                unblock(targetId);
                showToast(`Unblocked ${selectedConversation.friendProfile?.displayName}.`);
            } else {
                block(targetId);
                showToast(`Blocked ${selectedConversation.friendProfile?.displayName}.`);
            }
            setHeaderMenuOpen(false);
            refreshConversationList();
            if (refreshSocialAndWalletState) refreshSocialAndWalletState(user);
        } catch (err) {
            showToast(err.message || 'Action failed.', 'error');
        }
    };

    const handleReportPartner = (e) => {
        e.preventDefault();
        if (!selectedConversation) return;
        try {
            report({
                targetType: 'user',
                targetId: selectedConversation.otherParticipantId,
                reason: reportReason
            });
            setReportModalOpen(false);
            setHeaderMenuOpen(false);
            showToast('Report submitted. Thank you for keeping KampusKash safe.');
        } catch (err) {
            showToast(err.message || 'Could not submit report.', 'error');
        }
    };

    const handleSavePrivacyAndNotifSettings = async () => {
        if (!userId) return;
        try {
            updateMessagingNotificationPrefs(userId, notifPrefs);
            if (updatePrivacySettings) {
                await updatePrivacySettings({
                    ...publicProfile?.privacySettings,
                    showOnlineStatus,
                    showLastSeen
                });
            }
            setSettingsModalOpen(false);
            refreshConversationList();
            showToast('Messenger privacy & notification preferences saved.');
        } catch (err) {
            showToast(err.message || 'Failed to save preferences.', 'error');
        }
    };

    const showConversationListPane = !isMobileView || !selectedConversation;
    const showChatPane = !isMobileView || Boolean(selectedConversation);

    const partnerPresence = selectedConversation
        ? getUserPresenceForViewer(selectedConversation.otherParticipantId, userId)
        : null;

    return (
        <div
            style={{
                maxWidth: 1200,
                margin: '0 auto',
                paddingBottom: isMobileView ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : 24
            }}
        >
            {/* Toast Alert */}
            {toastMessage && (
                <div
                    role="status"
                    style={{
                        position: 'fixed',
                        top: 20,
                        right: 20,
                        zIndex: 1300,
                        padding: '12px 18px',
                        borderRadius: 12,
                        background: toastMessage.type === 'error' ? 'var(--accent-red)' : 'var(--accent-primary)',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Top Header Banner (hidden on mobile when inside an open full-screen conversation) */}
            {(!isMobileView || !selectedConversation) && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 16,
                        padding: '16px 20px',
                        borderRadius: 18,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-card)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                boxShadow: 'var(--shadow-glow)'
                            }}
                        >
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {MESSAGES_SECTION_NAME}
                            </h1>
                            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {MESSAGES_SECTION_SUBTITLE}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => setSettingsModalOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 13px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Bell size={15} />
                            <span>Privacy & Alerts</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewChatModalOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 14px',
                                borderRadius: 11,
                                border: 'none',
                                background: 'var(--gradient-primary)',
                                color: '#ffffff',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-glow)'
                            }}
                        >
                            <Plus size={16} />
                            <span>New Chat</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Messenger Split Container */}
            <div
                style={{
                    display: 'flex',
                    height: isMobileView
                        ? `calc(100dvh - ${148 + viewportOffsetBottom}px)`
                        : 'calc(100vh - 210px)',
                    minHeight: isMobileView ? 420 : 560,
                    maxHeight: 820,
                    borderRadius: 20,
                    overflow: 'hidden',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    boxShadow: 'var(--shadow-card)'
                }}
            >
                {/* LEFT PANE: CONVERSATION LIST */}
                {showConversationListPane && (
                    <div
                        style={{
                            width: isMobileView ? '100%' : 340,
                            flexShrink: 0,
                            borderRight: isMobileView ? 'none' : '1px solid var(--border-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-card)'
                        }}
                    >
                        {/* Search Conversations Bar */}
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-primary)' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '9px 12px',
                                    borderRadius: 12,
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-primary)'
                                }}
                            >
                                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search conversations or @username..."
                                    aria-label="Search conversations"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.86rem',
                                        width: '100%',
                                        outline: 'none'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            padding: 2
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Conversations Scroll List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                            {conversations.length === 0 ? (
                                <div
                                    style={{
                                        padding: '42px 20px',
                                        textAlign: 'center',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    <MessageSquare
                                        size={36}
                                        style={{ color: 'var(--accent-primary)', marginBottom: 10, opacity: 0.8 }}
                                    />
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                        No conversations yet
                                    </div>
                                    <p style={{ fontSize: '0.82rem', margin: '6px 0 14px' }}>
                                        Start a real-time chat with any of your KampusKash Connect friends.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setNewChatModalOpen(true)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Start a Conversation
                                    </button>
                                </div>
                            ) : (
                                conversations.map((conv) => {
                                    const isSelected = conv.id === activeConversationId;
                                    const friend = conv.friendProfile || {};
                                    const isOnline = conv.presence?.state === 'online';
                                    const unread = Number(conv.unreadCount || 0);
                                    const lastPreview = conv.isTyping
                                        ? 'Typing...'
                                        : conv.lastMessage?.previewText || 'Say hello 👋';

                                    return (
                                        <button
                                            key={conv.id}
                                            type="button"
                                            onClick={() => handleSelectConversation(conv.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '11px 12px',
                                                marginBottom: 4,
                                                borderRadius: 14,
                                                border: isSelected
                                                    ? '1px solid var(--accent-primary)'
                                                    : '1px solid transparent',
                                                background: isSelected
                                                    ? 'var(--accent-glow)'
                                                    : unread > 0
                                                    ? 'var(--bg-secondary)'
                                                    : 'transparent',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {renderAvatar(friend, 46, true, isOnline)}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 6
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontWeight: unread > 0 ? 800 : 700,
                                                            fontSize: '0.9rem',
                                                            color: 'var(--text-primary)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {friend.displayName || 'Student'}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            color: unread > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                            fontWeight: unread > 0 ? 700 : 500,
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {formatConversationTimestamp(conv.lastMessageAt || conv.updatedAt)}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-muted)',
                                                        marginBottom: 2
                                                    }}
                                                >
                                                    @{friend.username || friend.handle || 'student'}
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 8
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            color: conv.isTyping
                                                                ? 'var(--accent-primary)'
                                                                : unread > 0
                                                                ? 'var(--text-primary)'
                                                                : 'var(--text-secondary)',
                                                            fontWeight: unread > 0 || conv.isTyping ? 700 : 400,
                                                            fontStyle: conv.isTyping ? 'italic' : 'normal',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {lastPreview}
                                                    </span>
                                                    {unread > 0 && (
                                                        <span
                                                            style={{
                                                                minWidth: 20,
                                                                height: 20,
                                                                padding: '0 6px',
                                                                borderRadius: 999,
                                                                background: 'var(--accent-primary)',
                                                                color: '#ffffff',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 800,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* RIGHT PANE: SELECTED CONVERSATION CHAT */}
                {showChatPane && (
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-primary)',
                            minWidth: 0
                        }}
                    >
                        {!selectedConversation ? (
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 32,
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 20,
                                        background: 'var(--accent-glow)',
                                        color: 'var(--accent-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 14
                                    }}
                                >
                                    <Sparkles size={30} />
                                </div>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                    Select a conversation
                                </h2>
                                <p style={{ maxWidth: 360, fontSize: '0.85rem', margin: '0 0 16px' }}>
                                    Choose a friend from the left panel to send messages, share photos, or pin campus study locations in real time.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setNewChatModalOpen(true)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: 'var(--gradient-primary)',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '0.86rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Start New Chat
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Conversation Top Bar */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        borderBottom: '1px solid var(--border-primary)',
                                        flexShrink: 0
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        {isMobileView && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveConversationId(null)}
                                                aria-label="Back to conversations"
                                                style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: 10,
                                                    border: '1px solid var(--border-primary)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                        )}

                                        <div
                                            onClick={() =>
                                                setSelectedPublicProfileId &&
                                                setSelectedPublicProfileId(selectedConversation.otherParticipantId)
                                            }
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                cursor: 'pointer',
                                                minWidth: 0
                                            }}
                                        >
                                            {renderAvatar(
                                                selectedConversation.friendProfile,
                                                42,
                                                true,
                                                partnerPresence?.state === 'online'
                                            )}
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 800,
                                                        fontSize: '0.95rem',
                                                        color: 'var(--text-primary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {selectedConversation.friendProfile?.displayName || 'Friend'}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.76rem',
                                                        color:
                                                            typingUsers.length > 0
                                                                ? 'var(--accent-primary)'
                                                                : partnerPresence?.state === 'online'
                                                                ? 'var(--accent-green)'
                                                                : 'var(--text-muted)',
                                                        fontWeight: typingUsers.length > 0 ? 700 : 500
                                                    }}
                                                >
                                                    {typingUsers.length > 0
                                                        ? 'Typing...'
                                                        : partnerPresence?.state === 'online'
                                                        ? '● Online'
                                                        : partnerPresence?.lastSeen
                                                        ? formatLastSeen(partnerPresence.lastSeen)
                                                        : `@${selectedConversation.friendProfile?.username || 'student'}`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Header Actions Menu */}
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedPublicProfileId &&
                                                setSelectedPublicProfileId(selectedConversation.otherParticipantId)
                                            }
                                            style={{
                                                padding: '7px 12px',
                                                borderRadius: 10,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Profile
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setHeaderMenuOpen((v) => !v)}
                                            aria-label="Conversation options"
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <MoreVertical size={17} />
                                        </button>

                                        {headerMenuOpen && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 42,
                                                    right: 0,
                                                    width: 200,
                                                    borderRadius: 14,
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border-primary)',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    padding: 6,
                                                    zIndex: 50
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={handleBlockOrUnblockPartner}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '9px 10px',
                                                        borderRadius: 9,
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: 'var(--accent-red)',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <ShieldOff size={15} />
                                                    <span>
                                                        {selectedConversation.isBlocked ? 'Unblock User' : 'Block User'}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setHeaderMenuOpen(false);
                                                        setReportModalOpen(true);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '9px 10px',
                                                        borderRadius: 9,
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <Flag size={15} />
                                                    <span>Report Conversation</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Messages History Scroll Area */}
                                <div
                                    style={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10
                                    }}
                                >
                                    {/* Pagination: Load Older Messages */}
                                    {messagePageState.hasMore && (
                                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                            <button
                                                type="button"
                                                onClick={() => setPageLimit((prev) => prev + MESSAGES_PAGE_SIZE)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 14px',
                                                    borderRadius: 999,
                                                    border: '1px solid var(--border-primary)',
                                                    background: 'var(--bg-card)',
                                                    color: 'var(--accent-primary)',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <ChevronUp size={14} />
                                                <span>Load older messages</span>
                                            </button>
                                        </div>
                                    )}

                                    {isLoadingMessages ? (
                                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                            Loading messages...
                                        </div>
                                    ) : messagePageState.messages.length === 0 ? (
                                        <div
                                            style={{
                                                margin: 'auto',
                                                padding: '28px 20px',
                                                textAlign: 'center',
                                                maxWidth: 320,
                                                borderRadius: 16,
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-primary)'
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                                Connected with {selectedConversation.friendProfile?.displayName}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                Messages are private between conversation participants. Say hi below!
                                            </div>
                                        </div>
                                    ) : (
                                        messagePageState.messages.map((msg) => {
                                            const isMine = msg.senderId === userId;
                                            const isReadByPartner =
                                                Array.isArray(msg.readBy) &&
                                                msg.readBy.includes(selectedConversation.otherParticipantId);
                                            const reactionEntries = Object.entries(msg.reactions || {});

                                            return (
                                                <div
                                                    key={msg.id}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: isMine ? 'flex-end' : 'flex-start',
                                                        maxWidth: '100%'
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            maxWidth: isMobileView ? '84%' : '68%',
                                                            borderRadius: isMine
                                                                ? '18px 18px 4px 18px'
                                                                : '18px 18px 18px 4px',
                                                            padding: '10px 14px',
                                                            background: msg.deleted
                                                                ? 'var(--bg-secondary)'
                                                                : isMine
                                                                ? 'var(--gradient-primary)'
                                                                : 'var(--bg-card)',
                                                            color: msg.deleted
                                                                ? 'var(--text-muted)'
                                                                : isMine
                                                                ? '#ffffff'
                                                                : 'var(--text-primary)',
                                                            border: isMine
                                                                ? 'none'
                                                                : '1px solid var(--border-primary)',
                                                            boxShadow: 'var(--shadow-sm)',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {/* Reply Quote Header */}
                                                        {msg.replyTo && !msg.deleted && (
                                                            <div
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    marginBottom: 8,
                                                                    borderRadius: 10,
                                                                    background: isMine
                                                                        ? 'rgba(0,0,0,0.18)'
                                                                        : 'var(--bg-secondary)',
                                                                    borderLeft: '3px solid var(--accent-secondary)',
                                                                    fontSize: '0.75rem'
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: 700 }}>
                                                                    {msg.replyTo.senderName || 'Reply'}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        opacity: 0.9,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {msg.replyTo.previewText}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Image Message Attachment */}
                                                        {!msg.deleted &&
                                                            msg.type === MESSAGE_TYPES.IMAGE &&
                                                            msg.attachment && (
                                                                <div style={{ marginBottom: msg.text ? 8 : 4 }}>
                                                                    <img
                                                                        src={msg.attachment.downloadUrl}
                                                                        alt={msg.attachment.fileName || 'Shared photo'}
                                                                        onClick={() =>
                                                                            setLightboxImage({
                                                                                url: msg.attachment.downloadUrl,
                                                                                caption: msg.text,
                                                                                fileName: msg.attachment.fileName
                                                                            })
                                                                        }
                                                                        style={{
                                                                            maxWidth: '100%',
                                                                            maxHeight: 250,
                                                                            borderRadius: 12,
                                                                            display: 'block',
                                                                            cursor: 'zoom-in',
                                                                            objectFit: 'cover'
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                        {/* Location Message Card */}
                                                        {!msg.deleted &&
                                                            msg.type === MESSAGE_TYPES.LOCATION &&
                                                            msg.location && (
                                                                <div
                                                                    style={{
                                                                        padding: 10,
                                                                        borderRadius: 12,
                                                                        background: isMine
                                                                            ? 'rgba(0,0,0,0.2)'
                                                                            : 'var(--bg-secondary)',
                                                                        marginBottom: 4
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 6,
                                                                            fontWeight: 700,
                                                                            fontSize: '0.85rem',
                                                                            marginBottom: 4
                                                                        }}
                                                                    >
                                                                        <MapPin size={16} />
                                                                        <span>{msg.location.label || 'Pinned Location'}</span>
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: '0.74rem',
                                                                            opacity: 0.88,
                                                                            marginBottom: 8
                                                                        }}
                                                                    >
                                                                        {msg.location.lat}, {msg.location.lng}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                        <a
                                                                            href={msg.location.googleMapsUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: 4,
                                                                                padding: '5px 9px',
                                                                                borderRadius: 8,
                                                                                background: 'var(--bg-card)',
                                                                                color: 'var(--text-primary)',
                                                                                fontSize: '0.73rem',
                                                                                fontWeight: 700,
                                                                                textDecoration: 'none'
                                                                            }}
                                                                        >
                                                                            <span>Google Maps</span>
                                                                            <ExternalLink size={12} />
                                                                        </a>
                                                                        <a
                                                                            href={msg.location.appleMapsUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: 4,
                                                                                padding: '5px 9px',
                                                                                borderRadius: 8,
                                                                                background: 'var(--bg-card)',
                                                                                color: 'var(--text-primary)',
                                                                                fontSize: '0.73rem',
                                                                                fontWeight: 700,
                                                                                textDecoration: 'none'
                                                                            }}
                                                                        >
                                                                            <span>Apple Maps</span>
                                                                            <ExternalLink size={12} />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* Text Body */}
                                                        {(msg.text || msg.deleted) && (
                                                            <div
                                                                style={{
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: 1.45,
                                                                    wordBreak: 'break-word',
                                                                    fontStyle: msg.deleted ? 'italic' : 'normal'
                                                                }}
                                                            >
                                                                {msg.deleted ? '🚫 This message was deleted' : msg.text}
                                                            </div>
                                                        )}

                                                        {/* Timestamp & Read Receipt Footer */}
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'flex-end',
                                                                gap: 5,
                                                                marginTop: 4,
                                                                fontSize: '0.68rem',
                                                                opacity: 0.85
                                                            }}
                                                        >
                                                            <span>{formatMessageTime(msg.createdAt)}</span>
                                                            {isMine && !msg.deleted && (
                                                                <span
                                                                    title={
                                                                        isReadByPartner
                                                                            ? 'Seen'
                                                                            : `Status: ${msg.status || 'sent'}`
                                                                    }
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 2,
                                                                        fontWeight: 700
                                                                    }}
                                                                >
                                                                    {isReadByPartner ? (
                                                                        <>
                                                                            <CheckCheck size={13} />
                                                                            <span>Seen</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Check size={13} />
                                                                            <span>Delivered</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Active Emoji Reactions Pill */}
                                                    {reactionEntries.length > 0 && !msg.deleted && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 4,
                                                                marginTop: 3,
                                                                padding: '2px 8px',
                                                                borderRadius: 999,
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border-primary)',
                                                                fontSize: '0.76rem'
                                                            }}
                                                        >
                                                            {reactionEntries.map(([uid, emoji]) => (
                                                                <span key={uid} title={uid === userId ? 'You' : 'Friend'}>
                                                                    {emoji}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Message Action Controls (Reply, React, Copy, Delete own) */}
                                                    {!msg.deleted && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                marginTop: 4
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setActiveReactionPickerMsgId((prev) =>
                                                                        prev === msg.id ? null : msg.id
                                                                    )
                                                                }
                                                                title="React"
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    padding: 2,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <Smile size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReplyingTo(msg);
                                                                    composerInputRef.current?.focus();
                                                                }}
                                                                title="Reply"
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    padding: 2,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <Reply size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyMessageText(msg)}
                                                                title="Copy text"
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color:
                                                                        copiedMsgId === msg.id
                                                                            ? 'var(--accent-green)'
                                                                            : 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    padding: 2,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            {isMine && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteOwnMessage(msg.id)}
                                                                    title="Delete your message"
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        color: 'var(--text-muted)',
                                                                        cursor: 'pointer',
                                                                        padding: 2,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Reaction Emoji Picker Popover */}
                                                    {activeReactionPickerMsgId === msg.id && !msg.deleted && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 6,
                                                                marginTop: 4,
                                                                padding: '6px 10px',
                                                                borderRadius: 999,
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border-primary)',
                                                                boxShadow: 'var(--shadow-card)'
                                                            }}
                                                        >
                                                            {MESSAGE_REACTIONS.map((emoji) => (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        fontSize: '1.05rem',
                                                                        cursor: 'pointer',
                                                                        padding: '2px 4px'
                                                                    }}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* Live Typing Indicator Bubble */}
                                    {typingUsers.length > 0 && (
                                        <div
                                            style={{
                                                alignSelf: 'flex-start',
                                                padding: '8px 14px',
                                                borderRadius: 16,
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-primary)',
                                                color: 'var(--accent-primary)',
                                                fontSize: '0.78rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            {typingUsers[0].displayName} is typing...
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Reply Banner above Composer */}
                                {replyingTo && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            padding: '8px 16px',
                                            background: 'var(--bg-secondary)',
                                            borderTop: '1px solid var(--border-primary)',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                                Replying to{' '}
                                                {replyingTo.senderId === userId
                                                    ? 'yourself'
                                                    : selectedConversation.friendProfile?.displayName}
                                                :{' '}
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {replyingTo.text || 'Attachment'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(null)}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                )}

                                {/* Composer Input Bar (or Blocked Banner) */}
                                {selectedConversation.isBlocked ? (
                                    <div
                                        style={{
                                            padding: '14px 16px',
                                            background: 'var(--bg-card)',
                                            borderTop: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
                                    >
                                        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                            Messaging is disabled because this user is blocked.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleBlockOrUnblockPartner}
                                            style={{
                                                padding: '7px 12px',
                                                borderRadius: 9,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Unblock
                                        </button>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={handleSendTextMessage}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '12px 14px',
                                            background: 'var(--bg-card)',
                                            borderTop: '1px solid var(--border-primary)',
                                            flexShrink: 0
                                        }}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />

                                        {/* Image Upload Button */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Share photo"
                                            aria-label="Share photo"
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 12,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <ImageIcon size={18} />
                                        </button>

                                        {/* Voluntary Location Share Button */}
                                        <button
                                            type="button"
                                            onClick={handleOpenLocationModal}
                                            title="Share location"
                                            aria-label="Share location"
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 12,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <MapPin size={18} />
                                        </button>

                                        {/* Text Input */}
                                        <input
                                            ref={composerInputRef}
                                            type="text"
                                            value={composerText}
                                            onChange={handleComposerChange}
                                            onFocus={() => {
                                                setTimeout(() => {
                                                    messagesEndRef.current?.scrollIntoView({
                                                        behavior: 'smooth',
                                                        block: 'end'
                                                    });
                                                }, 200);
                                            }}
                                            placeholder={`Message ${selectedConversation.friendProfile?.displayName || 'friend'}...`}
                                            maxLength={2000}
                                            style={{
                                                flex: 1,
                                                padding: '11px 14px',
                                                borderRadius: 14,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                outline: 'none',
                                                minWidth: 0
                                            }}
                                        />

                                        {/* Send Button */}
                                        <button
                                            type="submit"
                                            disabled={!composerText.trim()}
                                            aria-label="Send message"
                                            style={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 13,
                                                border: 'none',
                                                background: composerText.trim()
                                                    ? 'var(--gradient-primary)'
                                                    : 'var(--bg-secondary)',
                                                color: composerText.trim() ? '#ffffff' : 'var(--text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: composerText.trim() ? 'pointer' : 'not-allowed',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL 1: IMAGE PREVIEW BEFORE SENDING */}
            {pendingImageModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 440,
                            borderRadius: 20,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            padding: 20,
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 14
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                                Preview Image Before Sending
                            </h3>
                            <button
                                type="button"
                                onClick={() => setPendingImageModal(null)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div
                            style={{
                                borderRadius: 14,
                                overflow: 'hidden',
                                background: 'var(--bg-secondary)',
                                marginBottom: 12,
                                textAlign: 'center'
                            }}
                        >
                            <img
                                src={pendingImageModal.previewUrl}
                                alt="Upload preview"
                                style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain' }}
                            />
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                            {pendingImageModal.file.name} • {(pendingImageModal.file.size / 1024).toFixed(1)} KB
                        </div>

                        <input
                            type="text"
                            value={pendingImageModal.caption}
                            onChange={(e) =>
                                setPendingImageModal((prev) => ({ ...prev, caption: e.target.value }))
                            }
                            placeholder="Add an optional caption..."
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontSize: '0.86rem',
                                marginBottom: 12,
                                boxSizing: 'border-box'
                            }}
                        />

                        {pendingImageModal.error && (
                            <div
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: 9,
                                    background: 'rgba(239,68,68,0.12)',
                                    color: 'var(--accent-red)',
                                    fontSize: '0.8rem',
                                    marginBottom: 12
                                }}
                            >
                                {pendingImageModal.error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setPendingImageModal(null)}
                                style={{
                                    padding: '9px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={pendingImageModal.uploading}
                                onClick={handleConfirmSendImage}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '9px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'var(--gradient-primary)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: pendingImageModal.uploading ? 'wait' : 'pointer'
                                }}
                            >
                                {pendingImageModal.uploading && <Loader2 size={15} className="spin" />}
                                <span>{pendingImageModal.uploading ? 'Uploading...' : 'Send Photo'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: ENLARGED IMAGE LIGHTBOX */}
            {lightboxImage && (
                <div
                    onClick={() => setLightboxImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 1250,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20
                    }}
                >
                    <img
                        src={lightboxImage.url}
                        alt={lightboxImage.fileName || 'Enlarged chat photo'}
                        style={{
                            maxWidth: '92vw',
                            maxHeight: '80vh',
                            borderRadius: 14,
                            objectFit: 'contain'
                        }}
                    />
                    {lightboxImage.caption && (
                        <div style={{ color: '#ffffff', marginTop: 12, fontSize: '0.92rem', fontWeight: 600 }}>
                            {lightboxImage.caption}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL 3: LOCATION SHARING WITH EXPLICIT CONSENT & PREVIEW */}
            {locationModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 460,
                            borderRadius: 20,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            padding: 20,
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 10
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                                Share Location (Explicit Consent)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setLocationModalOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                            KampusKash never tracks your location in the background. Choose to share a one-time GPS pin or a campus landmark below, then review the preview before sending.
                        </p>

                        <button
                            type="button"
                            onClick={handleRequestBrowserGpsLocation}
                            disabled={locationLoading}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 12,
                                border: '1px solid var(--accent-primary)',
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                cursor: 'pointer',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                        >
                            <MapPin size={16} />
                            <span>
                                {locationLoading
                                    ? 'Requesting GPS permission...'
                                    : 'Use My Current GPS Location'}
                            </span>
                        </button>

                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                            Or pick a Campus Landmark:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                            {CAMPUS_QUICK_LOCATIONS.map((pin) => (
                                <button
                                    key={pin.label}
                                    type="button"
                                    onClick={() => handleSelectQuickCampusPin(pin)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border-primary)',
                                        background:
                                            locationDraft?.label === pin.label
                                                ? 'var(--accent-glow)'
                                                : 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textAlign: 'left',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📍 {pin.label}
                                </button>
                            ))}
                        </div>

                        {locationError && (
                            <div
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: 9,
                                    background: 'rgba(239,68,68,0.12)',
                                    color: 'var(--accent-red)',
                                    fontSize: '0.8rem',
                                    marginBottom: 12
                                }}
                            >
                                {locationError}
                            </div>
                        )}

                        {locationDraft && (
                            <div
                                style={{
                                    padding: 12,
                                    borderRadius: 12,
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    marginBottom: 14
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                                    Preview: {locationDraft.label}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                    Coordinates: {locationDraft.lat}, {locationDraft.lng}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setLocationModalOpen(false)}
                                style={{
                                    padding: '9px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!locationDraft}
                                onClick={handleConfirmSendLocation}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: locationDraft ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                                    color: locationDraft ? '#ffffff' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    cursor: locationDraft ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Confirm & Share Location
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: NEW CHAT FRIEND SELECTOR */}
            {newChatModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 420,
                            borderRadius: 20,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            padding: 20,
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 12
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                                Start Conversation with a Friend
                            </h3>
                            <button
                                type="button"
                                onClick={() => setNewChatModalOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {friendsList.length === 0 ? (
                            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                You do not have any mutual friends yet. Add friends in KampusKash Connect to start chatting!
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                                {friendsList.map((friend) => (
                                    <button
                                        key={friend.id}
                                        type="button"
                                        onClick={() => handleStartChatWithFriend(friend.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                            padding: '10px 12px',
                                            borderRadius: 12,
                                            border: '1px solid var(--border-primary)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {renderAvatar(friend, 38)}
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                                    {friend.displayName}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    @{friend.username || friend.handle}
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                                color: 'var(--accent-primary)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            <UserCheck size={14} />
                                            <span>Message</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 5: PRIVACY & NOTIFICATION PREFERENCES */}
            {settingsModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 440,
                            borderRadius: 20,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            padding: 20,
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 14
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                                Messenger Privacy & Notifications
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSettingsModalOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <span>
                                    <Eye size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                    Show my Online Status to friends
                                </span>
                                <input
                                    type="checkbox"
                                    checked={showOnlineStatus}
                                    onChange={(e) => setShowOnlineStatus(e.target.checked)}
                                />
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <span>Show my Last Seen timestamp</span>
                                <input
                                    type="checkbox"
                                    checked={showLastSeen}
                                    onChange={(e) => setShowLastSeen(e.target.checked)}
                                />
                            </label>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-primary)', width: '100%' }} />

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <span>Enable Message Notifications</span>
                                <input
                                    type="checkbox"
                                    checked={notifPrefs.enabled}
                                    onChange={(e) =>
                                        setNotifPrefs((prev) => ({ ...prev, enabled: e.target.checked }))
                                    }
                                />
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <span>Show message preview text on lock screen</span>
                                <input
                                    type="checkbox"
                                    checked={notifPrefs.showPreviewText}
                                    onChange={(e) =>
                                        setNotifPrefs((prev) => ({ ...prev, showPreviewText: e.target.checked }))
                                    }
                                />
                            </label>

                            <button
                                type="button"
                                onClick={async () => {
                                    const res = await requestMessagingNotificationPermission(userId);
                                    showToast(`Browser notification permission: ${res.permission}`);
                                }}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Request Browser Push Permission
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setSettingsModalOpen(false)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePrivacyAndNotifSettings}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'var(--gradient-primary)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 6: REPORT CONVERSATION */}
            {reportModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <form
                        onSubmit={handleReportPartner}
                        style={{
                            width: '100%',
                            maxWidth: 400,
                            borderRadius: 20,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            padding: 20,
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 10px', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            Report Conversation
                        </h3>
                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: 10,
                                borderRadius: 10,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 12,
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setReportModalOpen(false)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 9,
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 9,
                                    border: 'none',
                                    background: 'var(--accent-red)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
