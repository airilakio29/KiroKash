import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';
import { KAMPUSKASH_ACCOUNT_ID } from '../services/accountService';
import {
    ensurePublicProfileForUser,
    getPublicProfile,
    updatePublicSocialProfile,
    searchPublicProfiles,
    getFollowingIds,
    getFollowerIds,
    getFollowersProfiles,
    getFollowingProfiles,
    isFollowingUser,
    followUser,
    unfollowUser,
    getSavedSpotIds,
    toggleSaveSpot,
    getBlockedUserIds,
    blockUser,
    unblockUser,
    reportUserOrContent,
    getUserNotifications,
    getUnreadNotificationCount,
    subscribeToUserNotifications,
    syncPublicProfilesFromFirestore,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead,
    seedPitchSocialData,
    resetPitchSocialData,
    isPitchModeLoaded
} from '../services/socialService';
import {
    ensureUserWallet,
    subscribeToUserWallet,
    subscribeToUserWalletRequests,
    setWalletPin,
    verifyWalletPin,
    setWalletTrackerAutoSync,
    getDailyTransferredTotal,
    topUpWallet,
    addMoneyFromOwnAccount,
    transferMoney,
    requestMoney,
    respondToMoneyRequest,
    getUserWalletHistory,
    getUserWalletRequests,
    getRecentRecipients,
    getWalletReceipt,
    encodeWalletQrPayload,
    parseWalletQrPayload,
    hasSeenWalletFirstUseNotice,
    markWalletFirstUseNoticeSeen,
    seedPitchWalletState,
    resetPitchWalletState
} from '../services/walletService';
import {
    PITCH_DEMO_USERS,
    generatePitchSpots,
    generatePitchWalletData
} from '../demo/pitchSeedData';

const SocialWalletContext = createContext();

export const PITCH_SPOTS_STORAGE_KEY = 'kk_pitch_demo_spots_v1';

export function getStoredPitchSpots() {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = window.localStorage.getItem(PITCH_SPOTS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveStoredPitchSpots(spots) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(PITCH_SPOTS_STORAGE_KEY, JSON.stringify(spots));
    } catch {
        // ignore quota errors
    }
}

export function SocialWalletProvider({ children, onNavigateTab }) {
    const { user, updateUserProfile, switchPitchAccount } = useAuth();
    const {
        updateAccount,
        recordWalletTransferInTracker,
        reloadFinanceFromStorage
    } = useFinance() || {};
    const userId = user?.id;

    const [publicProfile, setPublicProfile] = useState(null);
    const [followingIds, setFollowingIds] = useState([]);
    const [followerIds, setFollowerIds] = useState([]);
    const [savedSpotIds, setSavedSpotIds] = useState([]);
    const [blockedUserIds, setBlockedUserIds] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [wallet, setWallet] = useState(null);
    const [dailyTransferred, setDailyTransferred] = useState(0);
    const [walletHistory, setWalletHistory] = useState([]);
    const [walletRequests, setWalletRequests] = useState([]);
    const [firstUseNoticeSeen, setFirstUseNoticeSeen] = useState(false);

    const [pitchModeLoaded, setPitchModeLoaded] = useState(() => isPitchModeLoaded());
    const [pitchSpotsVersion, setPitchSpotsVersion] = useState(0);

    // Global modal states: Public Profile, Receipt Modal, and the full-screen Scan / Pay Sheet
    const [selectedPublicProfileId, setSelectedPublicProfileId] = useState(null);
    const [activeReceiptModal, setActiveReceiptModal] = useState(null);
    const [prefilledWalletAction, setPrefilledWalletAction] = useState(null);
    const [isScanPayOpen, setIsScanPayOpen] = useState(false);
    const [scanPayInitialTab, setScanPayInitialTab] = useState('scan'); // 'scan' | 'myqr' | 'transfer'

    const openScanPaySheet = useCallback((tab = 'scan', prefill = null) => {
        setScanPayInitialTab(tab || 'scan');
        if (prefill) {
            setPrefilledWalletAction({
                ...prefill,
                timestamp: Date.now()
            });
        }
        setIsScanPayOpen(true);
    }, []);

    const closeScanPaySheet = useCallback(() => {
        setIsScanPayOpen(false);
    }, []);

    const refreshSocialAndWalletState = useCallback((targetUser = user) => {
        if (!targetUser || !targetUser.id) {
            setPublicProfile(null);
            setFollowingIds([]);
            setFollowerIds([]);
            setSavedSpotIds([]);
            setBlockedUserIds([]);
            setNotifications([]);
            setUnreadCount(0);
            setWallet(null);
            setDailyTransferred(0);
            setWalletHistory([]);
            setWalletRequests([]);
            return;
        }

        const uid = targetUser.id;
        const prof = ensurePublicProfileForUser({
            id: uid,
            name: targetUser.username || targetUser.name || targetUser.displayName || 'Student',
            handle: targetUser.handle,
            university: targetUser.university,
            bio: targetUser.bio,
            avatarId: targetUser.avatarId || targetUser.avatar || 'cat',
            photoURL: targetUser.photoURL,
            isPitchDemo: targetUser.isPitchDemo
        });
        setPublicProfile(prof);

        setFollowingIds(getFollowingIds(uid));
        setFollowerIds(getFollowerIds(uid));
        setSavedSpotIds(getSavedSpotIds(uid));
        setBlockedUserIds(getBlockedUserIds(uid));

        const notifs = getUserNotifications(uid);
        setNotifications(notifs);
        setUnreadCount(getUnreadNotificationCount(uid));

        const w = ensureUserWallet({
            id: uid,
            name: prof?.displayName || targetUser.username || 'Student',
            handle: prof?.handle || targetUser.handle,
            isPitchDemo: targetUser.isPitchDemo
        });
        setWallet(w);
        setDailyTransferred(getDailyTransferredTotal(uid));
        setWalletHistory(getUserWalletHistory(uid, 'all'));
        setWalletRequests(getUserWalletRequests(uid));
        setFirstUseNoticeSeen(hasSeenWalletFirstUseNotice(uid));
        setPitchModeLoaded(isPitchModeLoaded());
    }, [user]);

    useEffect(() => {
        refreshSocialAndWalletState(user);
    }, [user, refreshSocialAndWalletState]);

    // Live real-time Firestore listeners for real users across separate devices/browsers
    useEffect(() => {
        if (!userId || user?.isPitchDemo) return;

        syncPublicProfilesFromFirestore().catch(() => {});

        const unsubWallet = subscribeToUserWallet(userId, (liveWallet) => {
            if (liveWallet) {
                setWallet(liveWallet);
                if (updateAccount) {
                    updateAccount(KAMPUSKASH_ACCOUNT_ID, { balance: liveWallet.balance });
                }
            }
        });

        const unsubNotifs = subscribeToUserNotifications(userId, (liveNotifs) => {
            if (Array.isArray(liveNotifs) && liveNotifs.length > 0) {
                setNotifications(liveNotifs);
                setUnreadCount(liveNotifs.filter((n) => !n.read).length);
            }
        });

        const unsubRequests = subscribeToUserWalletRequests(userId, (liveReqs) => {
            if (Array.isArray(liveReqs) && liveReqs.length > 0) {
                setWalletRequests(liveReqs);
            }
        });

        return () => {
            if (unsubWallet) unsubWallet();
            if (unsubNotifs) unsubNotifs();
            if (unsubRequests) unsubRequests();
        };
    }, [userId, user?.isPitchDemo, updateAccount]);

    // Social actions
    const follow = useCallback(async (targetUserId) => {
        if (!user) throw new Error('Sign in required.');
        const res = await followUser(
            { id: user.id, name: publicProfile?.displayName || user.username, handle: publicProfile?.handle },
            targetUserId
        );
        refreshSocialAndWalletState(user);
        return res;
    }, [user, publicProfile, refreshSocialAndWalletState]);

    const unfollow = useCallback(async (targetUserId) => {
        if (!user) return;
        const res = await unfollowUser(user.id, targetUserId);
        refreshSocialAndWalletState(user);
        return res;
    }, [user, refreshSocialAndWalletState]);

    const toggleSave = useCallback(async (spotId) => {
        if (!user) throw new Error('Sign in required to bookmark spots.');
        const res = await toggleSaveSpot(user.id, spotId);
        setSavedSpotIds(res.savedSpotIds);
        return res.saved;
    }, [user]);

    const block = useCallback(async (targetUserId) => {
        if (!user) throw new Error('Sign in required.');
        const res = await blockUser(user.id, targetUserId);
        refreshSocialAndWalletState(user);
        return res;
    }, [user, refreshSocialAndWalletState]);

    const unblock = useCallback(async (targetUserId) => {
        if (!user) return;
        const res = await unblockUser(user.id, targetUserId);
        refreshSocialAndWalletState(user);
        return res;
    }, [user, refreshSocialAndWalletState]);

    const report = useCallback(async (payload) => {
        if (!user) throw new Error('Sign in required.');
        return await reportUserOrContent({
            ...payload,
            reporterId: user.id
        });
    }, [user]);

    const updateSocialProfile = useCallback(async (updates) => {
        if (!user?.id) throw new Error('Sign in required.');
        const updated = await updatePublicSocialProfile(user.id, updates);
        setPublicProfile(updated);
        updateUserProfile({
            username: updated.displayName,
            displayName: updated.displayName,
            handle: updated.handle,
            bio: updated.bio,
            university: updated.university,
            avatar: updated.avatarId,
            avatarId: updated.avatarId
        });
        return updated;
    }, [user, updateUserProfile]);

    const notifySocialInteraction = useCallback((payload) => {
        createNotification(payload);
        if (user?.id) {
            setNotifications(getUserNotifications(user.id));
            setUnreadCount(getUnreadNotificationCount(user.id));
        }
    }, [user]);

    const markNotifRead = useCallback((notifId) => {
        if (!user?.id) return;
        const updated = markNotificationRead(user.id, notifId);
        setNotifications(updated);
        setUnreadCount(getUnreadNotificationCount(user.id));
    }, [user]);

    const markAllNotifsRead = useCallback(() => {
        if (!user?.id) return;
        const updated = markAllNotificationsRead(user.id);
        setNotifications(updated);
        setUnreadCount(0);
    }, [user]);

    // Wallet & KampusKash Account actions
    const dismissFirstUseNotice = useCallback(() => {
        if (!user?.id) return;
        markWalletFirstUseNoticeSeen(user.id);
        setFirstUseNoticeSeen(true);
    }, [user]);

    const setupPin = useCallback((pin) => {
        if (!user?.id) throw new Error('Sign in required.');
        const updated = setWalletPin(user.id, pin);
        setWallet(updated);
        return updated;
    }, [user]);

    const checkPin = useCallback((pin) => {
        if (!user?.id) return false;
        return verifyWalletPin(user.id, pin);
    }, [user]);

    const toggleAutoSyncTracker = useCallback((enabled) => {
        if (!user?.id) return null;
        const updated = setWalletTrackerAutoSync(user.id, enabled);
        setWallet(updated);
        return updated;
    }, [user]);

    const performAddMoneyFromAccount = useCallback(async ({ fromAccount, amount, idempotencyKey }) => {
        if (!user?.id) throw new Error('Sign in required.');
        const res = await addMoneyFromOwnAccount({
            userId: user.id,
            fromAccount,
            amount,
            idempotencyKey
        });
        if (updateAccount) {
            updateAccount(fromAccount.accountId, { balance: res.sourceAccountBalanceAfter });
            updateAccount(KAMPUSKASH_ACCOUNT_ID, { balance: res.kampusKashBalanceAfter });
        }
        refreshSocialAndWalletState(user);
        if (reloadFinanceFromStorage) {
            reloadFinanceFromStorage(user.id);
        }
        return res;
    }, [user, updateAccount, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    const performTopUp = useCallback(async ({ amount, sourceId, fromAccount, idempotencyKey }) => {
        if (!user?.id) throw new Error('Sign in required.');
        if (fromAccount && fromAccount.accountId) {
            return performAddMoneyFromAccount({ fromAccount, amount, idempotencyKey });
        }
        const res = await topUpWallet({
            userId: user.id,
            amount,
            sourceId,
            idempotencyKey
        });
        if (updateAccount && res.wallet) {
            updateAccount(KAMPUSKASH_ACCOUNT_ID, { balance: res.wallet.balance });
        }
        refreshSocialAndWalletState(user);
        if (reloadFinanceFromStorage) {
            reloadFinanceFromStorage(user.id);
        }
        return res;
    }, [user, performAddMoneyFromAccount, updateAccount, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    const performTransfer = useCallback(async ({ receiver, amount, note, pin, sourceAccount = null, idempotencyKey }) => {
        if (!user?.id) throw new Error('Sign in required.');
        const res = await transferMoney({
            sender: {
                id: user.id,
                name: publicProfile?.displayName || user.username,
                handle: publicProfile?.handle || user.handle
            },
            receiver,
            amount,
            note,
            pin,
            sourceAccount,
            idempotencyKey
        });

        if (updateAccount) {
            if (res.sourceAccountId && res.sourceAccountId !== KAMPUSKASH_ACCOUNT_ID) {
                updateAccount(res.sourceAccountId, { balance: res.sourceAccountBalanceAfter });
            } else if (res.senderWallet) {
                updateAccount(KAMPUSKASH_ACCOUNT_ID, { balance: res.senderWallet.balance });
            }
        }

        if (res.trackerSync && res.trackerSync.senderAutoSync && res.trackerSync.senderExpenseTx && recordWalletTransferInTracker) {
            recordWalletTransferInTracker(res.trackerSync.senderExpenseTx);
        }

        refreshSocialAndWalletState(user);
        if (reloadFinanceFromStorage) {
            reloadFinanceFromStorage(user.id);
        }
        return res;
    }, [user, publicProfile, updateAccount, recordWalletTransferInTracker, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    const performRequestMoney = useCallback(async ({ payer, amount, note, isSplitBill = false, originalTotalAmount = null }) => {
        if (!user?.id) throw new Error('Sign in required.');
        const req = await requestMoney({
            requester: {
                id: user.id,
                name: publicProfile?.displayName || user.username,
                handle: publicProfile?.handle || user.handle
            },
            payer,
            amount,
            note,
            isSplitBill,
            originalTotalAmount
        });
        refreshSocialAndWalletState(user);
        return req;
    }, [user, publicProfile, refreshSocialAndWalletState]);

    const performRespondToRequest = useCallback(async ({ requestId, action, pin = '', sourceAccount = null, idempotencyKey = null }) => {
        if (!user?.id) throw new Error('Sign in required.');
        const res = await respondToMoneyRequest({
            requestId,
            actor: {
                id: user.id,
                name: publicProfile?.displayName || user.username,
                handle: publicProfile?.handle || user.handle
            },
            action,
            pin,
            sourceAccount,
            idempotencyKey
        });

        if (action === 'accept' && res.transferResult) {
            if (updateAccount && res.transferResult.senderWallet) {
                updateAccount(KAMPUSKASH_ACCOUNT_ID, { balance: res.transferResult.senderWallet.balance });
            }
            if (
                res.transferResult.trackerSync?.senderAutoSync &&
                res.transferResult.trackerSync?.senderExpenseTx &&
                recordWalletTransferInTracker
            ) {
                recordWalletTransferInTracker(res.transferResult.trackerSync.senderExpenseTx);
            }
        }

        refreshSocialAndWalletState(user);
        if (reloadFinanceFromStorage) {
            reloadFinanceFromStorage(user.id);
        }
        return res;
    }, [user, publicProfile, updateAccount, recordWalletTransferInTracker, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    // Friend moment shortcuts (from PublicProfileModal or anywhere -> opens ScanPaySheet on Transfer tab!)
    const startSendMoneyToUser = useCallback((targetProfile, { mode = 'send' } = {}) => {
        setSelectedPublicProfileId(null);
        setPrefilledWalletAction({
            mode, // 'send' | 'request' | 'split'
            recipient: targetProfile,
            timestamp: Date.now()
        });
        setScanPayInitialTab('transfer');
        setIsScanPayOpen(true);
    }, []);

    const openWalletReceiptById = useCallback((receiptId) => {
        const receipt = getWalletReceipt(receiptId);
        if (receipt) {
            setActiveReceiptModal(receipt);
        } else if (typeof onNavigateTab === 'function') {
            onNavigateTab('accounts');
        }
    }, [onNavigateTab]);

    // Pitch Mode Seeding & Reset
    const loadPitchDemoData = useCallback(() => {
        const walletData = generatePitchWalletData();
        seedPitchSocialData(walletData.notifications);
        seedPitchWalletState({
            wallets: walletData.wallets,
            ledger: walletData.ledger,
            requests: walletData.requests
        });

        const spots = generatePitchSpots();
        saveStoredPitchSpots(spots);
        setPitchModeLoaded(true);
        setPitchSpotsVersion((v) => v + 1);

        if (user?.id) {
            followUser(user, 'demo_user_aiman').catch(() => {});
            followUser(user, 'demo_user_sarah').catch(() => {});
            followUser(user, 'demo_user_mei').catch(() => {});
        }

        refreshSocialAndWalletState(user);
        if (user?.id && reloadFinanceFromStorage) {
            reloadFinanceFromStorage(user.id);
        }
        return {
            usersCount: PITCH_DEMO_USERS.length,
            spotsCount: spots.length,
            ledgerCount: walletData.ledger.length
        };
    }, [user, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    const resetPitchDemoData = useCallback(() => {
        resetPitchSocialData();
        resetPitchWalletState();
        saveStoredPitchSpots([]);
        setPitchModeLoaded(false);
        setPitchSpotsVersion((v) => v + 1);
        refreshSocialAndWalletState(user);
        if (user?.id && reloadFinanceFromStorage) {
            reloadFinanceFromStorage(user.id);
        }
    }, [user, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    const switchPitchDemoAccount = useCallback((demoUserId) => {
        if (!isPitchModeLoaded()) {
            loadPitchDemoData();
        }
        const switched = switchPitchAccount(demoUserId);
        if (switched) {
            refreshSocialAndWalletState(switched);
            if (reloadFinanceFromStorage) {
                reloadFinanceFromStorage(switched.id);
            }
        }
        return switched;
    }, [loadPitchDemoData, switchPitchAccount, refreshSocialAndWalletState, reloadFinanceFromStorage]);

    const value = useMemo(() => ({
        publicProfile,
        followingIds,
        followerIds,
        followersProfiles: userId ? getFollowersProfiles(userId) : [],
        followingProfiles: userId ? getFollowingProfiles(userId) : [],
        recentRecipients: userId ? getRecentRecipients(userId) : [],
        isFollowing: (targetId) => isFollowingUser(userId, targetId),
        savedSpotIds,
        blockedUserIds,
        notifications,
        unreadCount,
        wallet,
        dailyTransferred,
        walletHistory,
        walletRequests,
        firstUseNoticeSeen,
        pitchModeLoaded,
        pitchSpotsVersion,
        pitchDemoUsers: PITCH_DEMO_USERS,
        // Modal & Sheet triggers
        selectedPublicProfileId,
        setSelectedPublicProfileId,
        activeReceiptModal,
        setActiveReceiptModal,
        prefilledWalletAction,
        setPrefilledWalletAction,
        isScanPayOpen,
        setIsScanPayOpen,
        scanPayInitialTab,
        setScanPayInitialTab,
        openScanPaySheet,
        closeScanPaySheet,
        // Actions
        follow,
        unfollow,
        toggleSave,
        block,
        unblock,
        report,
        updateSocialProfile,
        notifySocialInteraction,
        markNotifRead,
        markAllNotifsRead,
        dismissFirstUseNotice,
        setupPin,
        checkPin,
        toggleAutoSyncTracker,
        performAddMoneyFromAccount,
        performTopUp,
        performTransfer,
        performRequestMoney,
        performRespondToRequest,
        startSendMoneyToUser,
        openWalletReceiptById,
        loadPitchDemoData,
        resetPitchDemoData,
        switchPitchDemoAccount,
        refreshSocialAndWalletState,
        // Helpers
        getPublicProfile,
        searchPublicProfiles,
        encodeWalletQrPayload,
        parseWalletQrPayload
    }), [
        publicProfile,
        followingIds,
        followerIds,
        userId,
        savedSpotIds,
        blockedUserIds,
        notifications,
        unreadCount,
        wallet,
        dailyTransferred,
        walletHistory,
        walletRequests,
        firstUseNoticeSeen,
        pitchModeLoaded,
        pitchSpotsVersion,
        selectedPublicProfileId,
        activeReceiptModal,
        prefilledWalletAction,
        isScanPayOpen,
        scanPayInitialTab,
        openScanPaySheet,
        closeScanPaySheet,
        follow,
        unfollow,
        toggleSave,
        block,
        unblock,
        report,
        updateSocialProfile,
        notifySocialInteraction,
        markNotifRead,
        markAllNotifsRead,
        dismissFirstUseNotice,
        setupPin,
        checkPin,
        toggleAutoSyncTracker,
        performAddMoneyFromAccount,
        performTopUp,
        performTransfer,
        performRequestMoney,
        performRespondToRequest,
        startSendMoneyToUser,
        openWalletReceiptById,
        loadPitchDemoData,
        resetPitchDemoData,
        switchPitchDemoAccount,
        refreshSocialAndWalletState
    ]);

    return (
        <SocialWalletContext.Provider value={value}>
            {children}
        </SocialWalletContext.Provider>
    );
}

export const useSocialWallet = () => useContext(SocialWalletContext);
