import React, { useState, useMemo } from 'react';
import {
    Send,
    HandCoins,
    Split,
    PlusCircle,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    Clock,
    XCircle,
    ShieldAlert,
    Sparkles,
    Users,
    Calendar,
    X,
    Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocialWallet } from '../../context/SocialWalletContext';
import {
    DEMO_WALLET_BANNER_TEXT,
    getDemoWalletHistory
} from '../../services/demoWalletService';

export default function DemoP2PWalletPanel({ onOpenChatWithFriend }) {
    const { user } = useAuth();
    const {
        friendsList = [],
        demoP2PWallet,
        demoP2PRequests = [],
        demoP2PSplitBills = [],
        topUpSocialDemoWallet,
        sendSocialDemoMoney,
        requestSocialDemoMoney,
        respondSocialDemoRequest,
        createSocialDemoSplitBill,
        paySocialDemoSplitBill
    } = useSocialWallet() || {};

    const userId = user?.id;

    // Active workflow modal: null | 'send' | 'request' | 'split' | 'topup'
    const [activeModal, setActiveModal] = useState(null);
    const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'incoming' | 'outgoing' | 'topup' | 'pending_requests' | 'split_bills'
    const [selectedTxDetail, setSelectedTxDetail] = useState(null);
    const [bannerNotice, setBannerNotice] = useState(null);

    // Send Money states (Step 1: Form -> Step 2: Review & Confirm -> Step 3: Success Receipt)
    const [sendStep, setSendStep] = useState('form'); // 'form' | 'confirm' | 'success'
    const [sendRecipientId, setSendRecipientId] = useState('');
    const [sendAmount, setSendAmount] = useState('25.00');
    const [sendNote, setSendNote] = useState('');
    const [sendPostToChat, setSendPostToChat] = useState(true);
    const [sendBusy, setSendBusy] = useState(false);
    const [sendError, setSendError] = useState('');
    const [completedTransferResult, setCompletedTransferResult] = useState(null);

    // Request Money states
    const [reqRecipientId, setReqRecipientId] = useState('');
    const [reqAmount, setReqAmount] = useState('15.00');
    const [reqNote, setReqNote] = useState('');
    const [reqBusy, setReqBusy] = useState(false);
    const [reqError, setReqError] = useState('');

    // Split Bill states
    const [splitTitle, setSplitTitle] = useState('Dinner at Campus Cafe');
    const [splitTotal, setSplitTotal] = useState('90.00');
    const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'custom'
    const [selectedSplitFriendIds, setSelectedSplitFriendIds] = useState([]);
    const [customSplitAmounts, setCustomSplitAmounts] = useState({});
    const [splitBusy, setSplitBusy] = useState(false);
    const [splitError, setSplitError] = useState('');

    // Top-up states
    const [topUpAmount, setTopUpAmount] = useState('50.00');
    const [topUpNote, setTopUpNote] = useState('Replenish Demo Balance');
    const [topUpBusy, setTopUpBusy] = useState(false);
    const [topUpError, setTopUpError] = useState('');

    const showNotice = (text, type = 'success') => {
        setBannerNotice({ text, type });
        setTimeout(() => {
            setBannerNotice((prev) => (prev?.text === text ? null : prev));
        }, 3800);
    };

    const filteredTransactions = useMemo(() => {
        if (!userId) return [];
        if (historyFilter === 'pending_requests' || historyFilter === 'split_bills') {
            return [];
        }
        return getDemoWalletHistory(userId, { filter: historyFilter });
    }, [userId, historyFilter, demoP2PWallet?.balance, demoP2PWallet?.updatedAt]);

    const selectedSendFriend = useMemo(
        () => friendsList.find((f) => f.id === sendRecipientId) || null,
        [friendsList, sendRecipientId]
    );

    const openSendModal = () => {
        setSendStep('form');
        setSendRecipientId(friendsList[0]?.id || '');
        setSendAmount('25.00');
        setSendNote('');
        setSendError('');
        setCompletedTransferResult(null);
        setActiveModal('send');
    };

    const openRequestModal = () => {
        setReqRecipientId(friendsList[0]?.id || '');
        setReqAmount('15.00');
        setReqNote('');
        setReqError('');
        setActiveModal('request');
    };

    const openSplitModal = () => {
        setSplitTitle('Dinner at Campus Cafe');
        setSplitTotal('90.00');
        setSplitMode('equal');
        const initialFriends = friendsList.slice(0, 2).map((f) => f.id);
        setSelectedSplitFriendIds(initialFriends);
        setCustomSplitAmounts({});
        setSplitError('');
        setActiveModal('split');
    };

    const handleProceedToConfirmSend = (e) => {
        e.preventDefault();
        setSendError('');
        if (!sendRecipientId) {
            setSendError('Please choose a friend to send demo money to.');
            return;
        }
        const num = Number(sendAmount);
        if (!Number.isFinite(num) || num <= 0) {
            setSendError('Please enter a valid RM amount greater than 0.');
            return;
        }
        if (num > Number(demoP2PWallet?.balance || 0)) {
            setSendError(
                `Insufficient demo balance (Available: RM${Number(demoP2PWallet?.balance || 0).toFixed(2)}).`
            );
            return;
        }
        setSendStep('confirm');
    };

    const handleExecuteConfirmedSend = async () => {
        setSendBusy(true);
        setSendError('');
        try {
            const res = await sendSocialDemoMoney({
                recipientId: sendRecipientId,
                amount: sendAmount,
                note: sendNote || 'Campus Demo Transfer',
                confirmed: true,
                postToChat: sendPostToChat
            });
            setCompletedTransferResult(res);
            setSendStep('success');
            showNotice(`Sent RM${Number(sendAmount).toFixed(2)} (Demo) to ${selectedSendFriend?.displayName || 'friend'}!`);
        } catch (err) {
            setSendError(err.message || 'Transfer failed.');
        } finally {
            setSendBusy(false);
        }
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        setReqBusy(true);
        setReqError('');
        try {
            await requestSocialDemoMoney({
                recipientId: reqRecipientId,
                amount: reqAmount,
                note: reqNote || 'Demo Money Request',
                postToChat: true
            });
            setActiveModal(null);
            setHistoryFilter('pending_requests');
            showNotice('Demo payment request sent to friend & posted in chat.');
        } catch (err) {
            setReqError(err.message || 'Could not send request.');
        } finally {
            setReqBusy(false);
        }
    };

    const handleRespondRequest = async (requestId, action) => {
        try {
            await respondSocialDemoRequest({ requestId, action });
            showNotice(
                action === 'accept'
                    ? 'Payment request accepted & demo funds transferred!'
                    : `Payment request ${action === 'decline' ? 'declined' : 'cancelled'}.`
            );
        } catch (err) {
            showNotice(err.message || 'Action failed.', 'error');
        }
    };

    const handleToggleSplitFriend = (fid) => {
        setSelectedSplitFriendIds((prev) =>
            prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
        );
    };

    const handleCreateSplitBill = async (e) => {
        e.preventDefault();
        setSplitBusy(true);
        setSplitError('');
        try {
            let participantsPayload = selectedSplitFriendIds;
            if (splitMode === 'custom') {
                const creatorCustomAmt = customSplitAmounts[userId] || 0;
                participantsPayload = [
                    { userId, amount: creatorCustomAmt },
                    ...selectedSplitFriendIds.map((fid) => ({
                        userId: fid,
                        amount: customSplitAmounts[fid] || 0
                    }))
                ];
            }
            await createSocialDemoSplitBill({
                title: splitTitle,
                totalAmount: splitTotal,
                splitMode,
                participants: participantsPayload,
                includeCreator: true,
                postToChat: true
            });
            setActiveModal(null);
            setHistoryFilter('split_bills');
            showNotice('Demo split bill created & shared with friends!');
        } catch (err) {
            setSplitError(err.message || 'Failed to create split bill.');
        } finally {
            setSplitBusy(false);
        }
    };

    const handlePaySplitShare = async (splitBillId) => {
        try {
            await paySocialDemoSplitBill({ splitBillId });
            showNotice('Your split bill share has been paid in Demo RM!');
        } catch (err) {
            showNotice(err.message || 'Could not pay split bill share.', 'error');
        }
    };

    const handleTopUpSubmit = async (e) => {
        e.preventDefault();
        setTopUpBusy(true);
        setTopUpError('');
        try {
            await topUpSocialDemoWallet({
                amount: topUpAmount,
                note: topUpNote
            });
            setActiveModal(null);
            showNotice(`Added RM${Number(topUpAmount).toFixed(2)} simulated demo funds!`);
        } catch (err) {
            setTopUpError(err.message || 'Top-up failed.');
        } finally {
            setTopUpBusy(false);
        }
    };

    const walletBalance = Number(demoP2PWallet?.balance ?? 100);
    const totalReceived = Number(demoP2PWallet?.totalReceived ?? 0);
    const totalSent = Number(demoP2PWallet?.totalSent ?? 0);
    const createdDateStr = demoP2PWallet?.createdAt
        ? new Date(demoP2PWallet.createdAt).toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
          })
        : 'Today';

    return (
        <section
            aria-label="KampusKash Demo Wallet"
            style={{
                marginTop: 22,
                borderRadius: 22,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden'
            }}
        >
            {/* MANDATORY SIMULATION DISCLAIMER BANNER */}
            <div
                style={{
                    padding: '10px 18px',
                    background: 'var(--gradient-primary)',
                    color: 'var(--text-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldAlert size={16} />
                    <span>{DEMO_WALLET_BANNER_TEXT}</span>
                </div>
                <span style={{ fontWeight: 600, opacity: 0.92 }}>
                    Isolated Social P2P Ledger • Real Tracker &amp; Bank Balances Untouched
                </span>
            </div>

            {bannerNotice && (
                <div
                    style={{
                        margin: '14px 20px 0',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background:
                            bannerNotice.type === 'error'
                                ? 'rgba(239,68,68,0.14)'
                                : 'var(--accent-glow)',
                        color:
                            bannerNotice.type === 'error'
                                ? 'var(--accent-red)'
                                : 'var(--accent-primary)',
                        fontWeight: 700,
                        fontSize: '0.84rem'
                    }}
                >
                    {bannerNotice.text}
                </div>
            )}

            {/* Wallet Balance & Metrics Header */}
            <div style={{ padding: '20px 22px' }}>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        marginBottom: 18
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                color: 'var(--accent-primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: 4
                            }}
                        >
                            <Sparkles size={14} />
                            <span>KampusKash Demo Wallet (Connect P2P)</span>
                        </div>
                        <div
                            style={{
                                fontSize: '2rem',
                                fontWeight: 900,
                                color: 'var(--text-primary)',
                                lineHeight: 1.1
                            }}
                        >
                            RM {walletBalance.toFixed(2)}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                marginTop: 6,
                                fontSize: '0.76rem',
                                color: 'var(--text-muted)'
                            }}
                        >
                            <span>Currency: RM (Simulated)</span>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={12} /> Wallet since {createdDateStr}
                            </span>
                        </div>
                    </div>

                    {/* Total Received & Total Sent Summary Pills */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div
                            style={{
                                padding: '10px 14px',
                                borderRadius: 14,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                minWidth: 135
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: '0.73rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600
                                }}
                            >
                                <ArrowDownLeft size={14} style={{ color: 'var(--accent-green)' }} />
                                <span>Total Received</span>
                            </div>
                            <div
                                style={{
                                    fontSize: '1.05rem',
                                    fontWeight: 800,
                                    color: 'var(--accent-green)',
                                    marginTop: 2
                                }}
                            >
                                RM {totalReceived.toFixed(2)}
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '10px 14px',
                                borderRadius: 14,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                minWidth: 135
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: '0.73rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600
                                }}
                            >
                                <ArrowUpRight size={14} style={{ color: 'var(--accent-primary)' }} />
                                <span>Total Sent</span>
                            </div>
                            <div
                                style={{
                                    fontSize: '1.05rem',
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                    marginTop: 2
                                }}
                            >
                                RM {totalSent.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Demo Wallet Action Buttons */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 10,
                        marginBottom: 22
                    }}
                >
                    <button
                        type="button"
                        onClick={openSendModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: 'none',
                            background: 'var(--gradient-primary)',
                            color: 'var(--text-on-primary)',
                            fontWeight: 800,
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-glow)'
                        }}
                    >
                        <Send size={16} />
                        <span>Send Money</span>
                    </button>

                    <button
                        type="button"
                        onClick={openRequestModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            cursor: 'pointer'
                        }}
                    >
                        <HandCoins size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>Request Money</span>
                    </button>

                    <button
                        type="button"
                        onClick={openSplitModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Split size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>Split Bill</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setTopUpAmount('50.00');
                            setTopUpError('');
                            setActiveModal('topup');
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            cursor: 'pointer'
                        }}
                    >
                        <PlusCircle size={16} style={{ color: 'var(--accent-green)' }} />
                        <span>Add Demo Funds</span>
                    </button>
                </div>

                {/* Separated Demo Transaction History & Filter Tabs */}
                <div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginBottom: 12
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Demo Wallet Transaction History
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'incoming', label: 'Incoming' },
                                { id: 'outgoing', label: 'Outgoing' },
                                { id: 'topup', label: 'Top-Ups' },
                                {
                                    id: 'pending_requests',
                                    label: `Requests (${demoP2PRequests.filter((r) => r.status === 'pending').length})`
                                },
                                { id: 'split_bills', label: `Split Bills (${demoP2PSplitBills.length})` }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setHistoryFilter(tab.id)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 999,
                                        border:
                                            historyFilter === tab.id
                                                ? '1px solid var(--accent-primary)'
                                                : '1px solid var(--border-primary)',
                                        background:
                                            historyFilter === tab.id
                                                ? 'var(--accent-glow)'
                                                : 'var(--bg-secondary)',
                                        color:
                                            historyFilter === tab.id
                                                ? 'var(--accent-primary)'
                                                : 'var(--text-secondary)',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pending Requests View */}
                    {historyFilter === 'pending_requests' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {demoP2PRequests.length === 0 ? (
                                <div
                                    style={{
                                        padding: 20,
                                        textAlign: 'center',
                                        borderRadius: 14,
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.84rem'
                                    }}
                                >
                                    No demo payment requests yet.
                                </div>
                            ) : (
                                demoP2PRequests.map((req) => {
                                    const isIncoming = String(req.recipientId) === String(userId);
                                    return (
                                        <div
                                            key={req.id}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: 14,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: 10
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                                    {isIncoming
                                                        ? `${req.requesterName} (@${req.requesterHandle}) requested RM ${Number(req.amount).toFixed(2)}`
                                                        : `Requested RM ${Number(req.amount).toFixed(2)} from ${req.recipientName} (@${req.recipientHandle})`}
                                                </div>
                                                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {req.note} • Ref: {req.referenceCode} • Status:{' '}
                                                    <strong style={{ textTransform: 'capitalize' }}>{req.status}</strong>
                                                </div>
                                            </div>
                                            {req.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {isIncoming ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRespondRequest(req.id, 'accept')}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 9,
                                                                    border: 'none',
                                                                    background: 'var(--accent-green)',
                                                                    color: '#ffffff',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.78rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Accept &amp; Pay
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRespondRequest(req.id, 'decline')}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 9,
                                                                    border: '1px solid var(--border-primary)',
                                                                    background: 'var(--bg-card)',
                                                                    color: 'var(--accent-red)',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.78rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Decline
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondRequest(req.id, 'cancel')}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: 9,
                                                                border: '1px solid var(--border-primary)',
                                                                background: 'var(--bg-card)',
                                                                color: 'var(--text-secondary)',
                                                                fontWeight: 700,
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Cancel Request
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Split Bills View */}
                    {historyFilter === 'split_bills' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {demoP2PSplitBills.length === 0 ? (
                                <div
                                    style={{
                                        padding: 20,
                                        textAlign: 'center',
                                        borderRadius: 14,
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.84rem'
                                    }}
                                >
                                    No demo split bills created yet.
                                </div>
                            ) : (
                                demoP2PSplitBills.map((bill) => {
                                    const myEntry = bill.participants?.find((p) => String(p.userId) === String(userId));
                                    return (
                                        <div
                                            key={bill.id}
                                            style={{
                                                padding: '14px 16px',
                                                borderRadius: 14,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                    marginBottom: 8
                                                }}
                                            >
                                                <div>
                                                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                                        {bill.title}
                                                    </span>
                                                    <span
                                                        style={{
                                                            marginLeft: 8,
                                                            padding: '2px 8px',
                                                            borderRadius: 999,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            background: 'var(--accent-glow)',
                                                            color: 'var(--accent-primary)'
                                                        }}
                                                    >
                                                        DEMO • {bill.splitMode.toUpperCase()} SPLIT
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    Total: RM {Number(bill.totalAmount).toFixed(2)} • Outstanding: RM{' '}
                                                    {Number(bill.outstandingAmount).toFixed(2)}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                                {(bill.participants || []).map((part) => (
                                                    <div
                                                        key={part.userId}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: 10,
                                                            background: 'var(--bg-card)',
                                                            border: '1px solid var(--border-primary)',
                                                            fontSize: '0.76rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6
                                                        }}
                                                    >
                                                        <span>
                                                            {part.displayName}: RM {Number(part.amountOwed).toFixed(2)}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontWeight: 800,
                                                                color:
                                                                    part.status === 'paid'
                                                                        ? 'var(--accent-green)'
                                                                        : 'var(--accent-primary)'
                                                            }}
                                                        >
                                                            ({part.status === 'paid' ? '✓ Paid' : 'Pending'})
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {myEntry && myEntry.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePaySplitShare(bill.id)}
                                                    style={{
                                                        padding: '7px 14px',
                                                        borderRadius: 10,
                                                        border: 'none',
                                                        background: 'var(--gradient-primary)',
                                                        color: '#ffffff',
                                                        fontWeight: 700,
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Pay My Share (RM {Number(myEntry.amountOwed).toFixed(2)} Demo)
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Completed Ledger Transactions List */}
                    {historyFilter !== 'pending_requests' && historyFilter !== 'split_bills' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {filteredTransactions.length === 0 ? (
                                <div
                                    style={{
                                        padding: 20,
                                        textAlign: 'center',
                                        borderRadius: 14,
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.84rem'
                                    }}
                                >
                                    No demo transactions match this filter.
                                </div>
                            ) : (
                                filteredTransactions.slice(0, 15).map((tx) => {
                                    const isOutgoing = tx.direction === 'outgoing';
                                    return (
                                        <button
                                            key={tx.id}
                                            type="button"
                                            onClick={() => setSelectedTxDetail(tx)}
                                            style={{
                                                width: '100%',
                                                padding: '11px 14px',
                                                borderRadius: 14,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 10,
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 10,
                                                        background: isOutgoing
                                                            ? 'var(--accent-glow)'
                                                            : 'rgba(16,185,129,0.14)',
                                                        color: isOutgoing
                                                            ? 'var(--accent-primary)'
                                                            : 'var(--accent-green)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {isOutgoing ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            fontSize: '0.86rem',
                                                            color: 'var(--text-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6
                                                        }}
                                                    >
                                                        <span>
                                                            {tx.direction === 'topup'
                                                                ? tx.counterpartyName
                                                                : isOutgoing
                                                                ? `Sent to ${tx.recipientName}`
                                                                : `Received from ${tx.senderName}`}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '0.66rem',
                                                                padding: '1px 6px',
                                                                borderRadius: 999,
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border-primary)',
                                                                color: 'var(--accent-primary)',
                                                                fontWeight: 800
                                                            }}
                                                        >
                                                            DEMO
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {tx.note} • {tx.referenceCode}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 800,
                                                        fontSize: '0.9rem',
                                                        color: isOutgoing ? 'var(--text-primary)' : 'var(--accent-green)'
                                                    }}
                                                >
                                                    {isOutgoing ? '-' : '+'}RM {Number(tx.amount).toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {tx.createdAt
                                                        ? new Date(tx.createdAt).toLocaleTimeString([], {
                                                              hour: '2-digit',
                                                              minute: '2-digit'
                                                          })
                                                        : ''}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL A: SEND DEMO MONEY (FORM -> REVIEW & CONFIRM -> SUCCESS RECEIPT) */}
            {activeModal === 'send' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1250,
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
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}
                        >
                            {DEMO_WALLET_BANNER_TEXT}
                        </div>

                        {sendStep === 'form' && (
                            <form onSubmit={handleProceedToConfirmSend}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                        Send Demo Money to Friend
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal(null)}
                                        style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                                    Select KampusKash Friend
                                </label>
                                <select
                                    value={sendRecipientId}
                                    onChange={(e) => setSendRecipientId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 11,
                                        border: '1px solid var(--border-primary)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        marginBottom: 12
                                    }}
                                >
                                    <option value="">-- Choose a friend --</option>
                                    {friendsList.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.displayName} (@{f.username || f.handle})
                                        </option>
                                    ))}
                                </select>

                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                                    Amount (Simulated RM)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max="200"
                                    value={sendAmount}
                                    onChange={(e) => setSendAmount(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 11,
                                        border: '1px solid var(--border-primary)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        marginBottom: 12,
                                        boxSizing: 'border-box'
                                    }}
                                />

                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                                    Optional Note
                                </label>
                                <input
                                    type="text"
                                    value={sendNote}
                                    onChange={(e) => setSendNote(e.target.value)}
                                    placeholder="e.g. Nasi lemak & kopi"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 11,
                                        border: '1px solid var(--border-primary)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        marginBottom: 12,
                                        boxSizing: 'border-box'
                                    }}
                                />

                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', marginBottom: 12 }}>
                                    <input
                                        type="checkbox"
                                        checked={sendPostToChat}
                                        onChange={(e) => setSendPostToChat(e.target.checked)}
                                    />
                                    <span>Also post Demo Payment Card inside our Messenger chat</span>
                                </label>

                                {sendError && (
                                    <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: 10 }}>
                                        {sendError}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal(null)}
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: 10,
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
                                            padding: '9px 16px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: 'var(--gradient-primary)',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Review Transfer
                                    </button>
                                </div>
                            </form>
                        )}

                        {sendStep === 'confirm' && (
                            <div>
                                <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                    Confirm Demo Transfer
                                </h3>
                                <div
                                    style={{
                                        padding: 14,
                                        borderRadius: 12,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        marginBottom: 14,
                                        fontSize: '0.86rem'
                                    }}
                                >
                                    <div style={{ marginBottom: 6 }}>
                                        <strong>Recipient:</strong> {selectedSendFriend?.displayName} (@
                                        {selectedSendFriend?.username || selectedSendFriend?.handle})
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                        <strong>Amount:</strong> RM {Number(sendAmount).toFixed(2)} (Simulated Demo RM)
                                    </div>
                                    <div>
                                        <strong>Note:</strong> {sendNote || 'Campus Demo Transfer'}
                                    </div>
                                </div>

                                {sendError && (
                                    <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: 10 }}>
                                        {sendError}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setSendStep('form')}
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: 10,
                                            border: '1px solid var(--border-primary)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={sendBusy}
                                        onClick={handleExecuteConfirmedSend}
                                        style={{
                                            padding: '9px 16px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: 'var(--gradient-primary)',
                                            color: '#ffffff',
                                            fontWeight: 800,
                                            cursor: sendBusy ? 'wait' : 'pointer'
                                        }}
                                    >
                                        {sendBusy ? 'Processing...' : 'Confirm & Send Demo RM'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {sendStep === 'success' && completedTransferResult && (
                            <div style={{ textAlign: 'center' }}>
                                <CheckCircle2
                                    size={44}
                                    style={{ color: 'var(--accent-green)', marginBottom: 8 }}
                                />
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                    Demo Transfer Completed
                                </h3>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-primary)', margin: '6px 0' }}>
                                    RM {Number(completedTransferResult.transferReference.amount).toFixed(2)}
                                </div>
                                <div
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        textAlign: 'left',
                                        fontSize: '0.82rem',
                                        marginBottom: 14
                                    }}
                                >
                                    <div>
                                        <strong>Recipient:</strong>{' '}
                                        {completedTransferResult.transferReference.recipientName} (@
                                        {completedTransferResult.transferReference.recipientHandle})
                                    </div>
                                    <div>
                                        <strong>Reference:</strong> {completedTransferResult.referenceCode}
                                    </div>
                                    <div>
                                        <strong>Date &amp; Time:</strong>{' '}
                                        {new Date(completedTransferResult.transferReference.createdAt).toLocaleString()}
                                    </div>
                                    <div>
                                        <strong>Status:</strong> Completed (Simulated Demo Transaction)
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                                    {onOpenChatWithFriend && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const rid = completedTransferResult.transferReference.recipientId;
                                                setActiveModal(null);
                                                onOpenChatWithFriend(rid);
                                            }}
                                            style={{
                                                padding: '9px 14px',
                                                borderRadius: 10,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View in Chat
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal(null)}
                                        style={{
                                            padding: '9px 18px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: 'var(--gradient-primary)',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL B: REQUEST DEMO MONEY */}
            {activeModal === 'request' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1250,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <form
                        onSubmit={handleCreateRequest}
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
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}
                        >
                            {DEMO_WALLET_BANNER_TEXT}
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            Request Demo Money from Friend
                        </h3>
                        <select
                            value={reqRecipientId}
                            onChange={(e) => setReqRecipientId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 12
                            }}
                        >
                            <option value="">-- Choose a friend --</option>
                            {friendsList.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.displayName} (@{f.username || f.handle})
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="200"
                            value={reqAmount}
                            onChange={(e) => setReqAmount(e.target.value)}
                            placeholder="Amount in RM"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 12,
                                boxSizing: 'border-box'
                            }}
                        />
                        <input
                            type="text"
                            value={reqNote}
                            onChange={(e) => setReqNote(e.target.value)}
                            placeholder="Note (e.g. Badminton court booking)"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 12,
                                boxSizing: 'border-box'
                            }}
                        />
                        {reqError && (
                            <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: 10 }}>
                                {reqError}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                style={{
                                    padding: '9px 14px',
                                    borderRadius: 10,
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
                                disabled={reqBusy}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'var(--gradient-primary)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Send Request
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL C: SPLIT BILL (EQUAL OR CUSTOM MULTI-FRIEND SPLIT) */}
            {activeModal === 'split' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1250,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <form
                        onSubmit={handleCreateSplitBill}
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
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}
                        >
                            {DEMO_WALLET_BANNER_TEXT}
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            Split a Bill with Friends (Demo RM)
                        </h3>

                        <input
                            type="text"
                            value={splitTitle}
                            onChange={(e) => setSplitTitle(e.target.value)}
                            placeholder="Bill title (e.g. Dinner at Kolej)"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 10,
                                boxSizing: 'border-box'
                            }}
                        />

                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={splitTotal}
                            onChange={(e) => setSplitTotal(e.target.value)}
                            placeholder="Total Bill Amount (RM)"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 10,
                                boxSizing: 'border-box'
                            }}
                        />

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            {['equal', 'custom'].map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setSplitMode(m)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        borderRadius: 10,
                                        border:
                                            splitMode === m
                                                ? '1px solid var(--accent-primary)'
                                                : '1px solid var(--border-primary)',
                                        background:
                                            splitMode === m ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                                        color: splitMode === m ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {m === 'equal' ? 'Divide Equally' : 'Custom Amounts'}
                                </button>
                            ))}
                        </div>

                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                            Select Friends to Split With:
                        </div>
                        <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 12 }}>
                            {friendsList.map((f) => {
                                const checked = selectedSplitFriendIds.includes(f.id);
                                return (
                                    <div
                                        key={f.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            borderRadius: 8,
                                            marginBottom: 4,
                                            background: 'var(--bg-secondary)'
                                        }}
                                    >
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => handleToggleSplitFriend(f.id)}
                                            />
                                            <span>
                                                {f.displayName} (@{f.username || f.handle})
                                            </span>
                                        </label>
                                        {checked && splitMode === 'custom' && (
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="RM"
                                                value={customSplitAmounts[f.id] || ''}
                                                onChange={(e) =>
                                                    setCustomSplitAmounts((prev) => ({
                                                        ...prev,
                                                        [f.id]: e.target.value
                                                    }))
                                                }
                                                style={{
                                                    width: 80,
                                                    padding: '4px 6px',
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-primary)',
                                                    background: 'var(--bg-input)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {splitMode === 'custom' && (
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                    Your Own Share (RM):
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={customSplitAmounts[userId] || ''}
                                    onChange={(e) =>
                                        setCustomSplitAmounts((prev) => ({
                                            ...prev,
                                            [userId]: e.target.value
                                        }))
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        borderRadius: 9,
                                        border: '1px solid var(--border-primary)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        marginTop: 4,
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}

                        {splitError && (
                            <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: 10 }}>
                                {splitError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                style={{
                                    padding: '9px 14px',
                                    borderRadius: 10,
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
                                disabled={splitBusy}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'var(--gradient-primary)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Create Split Bill
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL D: ADD DEMO FUNDS (SIMULATED TOP-UP) */}
            {activeModal === 'topup' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1250,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <form
                        onSubmit={handleTopUpSubmit}
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
                        <div
                            style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}
                        >
                            {DEMO_WALLET_BANNER_TEXT}
                        </div>
                        <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            Simulated Demo Top-Up
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                            Replenish your simulated Demo Wallet balance for testing social P2P transfers. No real bank or payment gateway is connected.
                        </p>
                        <input
                            type="number"
                            step="0.01"
                            min="1"
                            max="500"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 11,
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                marginBottom: 12,
                                boxSizing: 'border-box'
                            }}
                        />
                        {topUpError && (
                            <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: 10 }}>
                                {topUpError}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                style={{
                                    padding: '9px 14px',
                                    borderRadius: 10,
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
                                disabled={topUpBusy}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'var(--gradient-primary)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Add Simulated RM
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL E: TRANSACTION DETAILS INSPECTION */}
            {selectedTxDetail && (
                <div
                    onClick={() => setSelectedTxDetail(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 1250,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
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
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}
                        >
                            {DEMO_WALLET_BANNER_TEXT}
                        </div>
                        <h3 style={{ margin: '0 0 10px', fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                            Demo Transaction Receipt
                        </h3>
                        <div
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                fontSize: '0.84rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                marginBottom: 14
                            }}
                        >
                            <div>
                                <strong>Amount:</strong> RM {Number(selectedTxDetail.amount).toFixed(2)} (Simulated)
                            </div>
                            <div>
                                <strong>Direction:</strong> {selectedTxDetail.direction}
                            </div>
                            <div>
                                <strong>From:</strong> {selectedTxDetail.senderName}
                            </div>
                            <div>
                                <strong>To:</strong> {selectedTxDetail.recipientName}
                            </div>
                            <div>
                                <strong>Reference:</strong> {selectedTxDetail.referenceCode}
                            </div>
                            <div>
                                <strong>Status:</strong> {selectedTxDetail.status}
                            </div>
                            <div>
                                <strong>Date:</strong> {new Date(selectedTxDetail.createdAt).toLocaleString()}
                            </div>
                            <div>
                                <strong>Note:</strong> {selectedTxDetail.note}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedTxDetail(null)}
                            style={{
                                width: '100%',
                                padding: '9px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: 'var(--gradient-primary)',
                                color: '#ffffff',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

