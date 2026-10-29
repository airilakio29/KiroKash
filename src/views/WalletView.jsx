import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  ShieldAlert,
  PlusCircle,
  Send,
  HandCoins,
  Split,
  QrCode,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Copy,
  Check,
  Search,
  Sparkles,
  WifiOff,
  FileText,
  X,
  RefreshCw,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import {
  DEMO_WALLET,
  DEMO_WALLET_BADGE_TEXT,
  WALLET_MAX_PER_TRANSFER,
  WALLET_DAILY_LIMIT,
  DEMO_TOPUP_SOURCES
} from '../config/appConstants';
import { getUserWalletHistory } from '../services/walletService';
import { getAvatarSvg } from '../components/Avatars';
import { formatRelativeTime } from '../components/community/ThreadCard';

export default function WalletView() {
  const { user } = useAuth();
  const {
    publicProfile,
    wallet,
    dailyTransferred,
    walletRequests,
    followingProfiles,
    blockedUserIds,
    firstUseNoticeSeen,
    dismissFirstUseNotice,
    setupPin,
    toggleAutoSyncTracker,
    performTopUp,
    performTransfer,
    performRequestMoney,
    performRespondToRequest,
    searchPublicProfiles,
    encodeWalletQrPayload,
    parseWalletQrPayload,
    setActiveReceiptModal,
    prefilledWalletAction,
    setPrefilledWalletAction,
    setSelectedPublicProfileId,
    pitchModeLoaded,
    loadPitchDemoData,
    switchPitchDemoAccount,
    pitchDemoUsers
  } = useSocialWallet();

  // Offline detection
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // History filter
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'sent' | 'received' | 'topup' | 'requests'

  // Active flow modal: null | 'topup' | 'send' | 'request' | 'qr' | 'pin' | 'accept_request'
  const [activeModal, setActiveModal] = useState(null);

  // Top Up state
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [topUpSource, setTopUpSource] = useState(DEMO_TOPUP_SOURCES[0].id);

  // Send / Request Money state
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [sendStep, setSendStep] = useState('form'); // 'form' | 'confirm' | 'pin'
  const [pinInput, setPinInput] = useState('');
  const [newPinSetup, setNewPinSetup] = useState('');
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState('');

  // Request / Split Bill state
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitTotalBill, setSplitTotalBill] = useState('');
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  // Accept incoming request state
  const [pendingRequestToAccept, setPendingRequestToAccept] = useState(null);

  // QR / Paste Code state
  const [qrTab, setQrTab] = useState('my_qr'); // 'my_qr' | 'paste_code'
  const [pastedCode, setPastedCode] = useState('');
  const [qrCopied, setQrCopied] = useState(false);

  // PIN setup modal state
  const [pinSetupValue, setPinSetupValue] = useState('');
  const [pinSetupMsg, setPinSetupMsg] = useState('');

  // Shared error / loading state
  const [flowError, setFlowError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle prefilled wallet action from PublicProfileModal ("Send Money" or "Split with a Friend")
  useEffect(() => {
    if (prefilledWalletAction && prefilledWalletAction.recipient) {
      const { mode, recipient } = prefilledWalletAction;
      setSelectedRecipient(recipient);
      setRecipientQuery(`@${recipient.handle}`);
      setFlowError('');
      if (mode === 'split') {
        setIsSplitMode(true);
        setSplitTotalBill('24.00');
        setTransferAmount('12.00');
        setTransferNote('50/50 split bill');
        setActiveModal('request');
      } else if (mode === 'request') {
        setIsSplitMode(false);
        setTransferAmount('');
        setTransferNote('');
        setActiveModal('request');
      } else {
        setSendStep('form');
        setTransferAmount('');
        setTransferNote('');
        setActiveModal('send');
      }
      setPrefilledWalletAction(null);
    }
  }, [prefilledWalletAction, setPrefilledWalletAction]);

  const filteredHistory = useMemo(() => {
    if (!user?.id) return [];
    return getUserWalletHistory(user.id, historyFilter);
  }, [user?.id, historyFilter, wallet, walletRequests]);

  const candidateRecipients = useMemo(() => {
    return searchPublicProfiles(recipientQuery, {
      excludeUserId: user?.id,
      blockedUserIds
    }).slice(0, 6);
  }, [recipientQuery, user?.id, blockedUserIds, searchPublicProfiles]);

  const incomingPendingRequests = useMemo(() => {
    if (!user?.id) return [];
    return walletRequests.filter((r) => r.payerId === user.id && r.status === 'pending');
  }, [walletRequests, user?.id]);

  const myQrCodeString = useMemo(() => {
    if (!user) return '';
    return encodeWalletQrPayload({
      id: user.id,
      name: publicProfile?.displayName || user.username,
      handle: publicProfile?.handle || user.handle
    });
  }, [user, publicProfile, encodeWalletQrPayload]);

  if (!DEMO_WALLET) {
    return (
      <div className="wallet-view">
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>KampusKash Wallet is currently disabled via feature flag.</h2>
        </div>
      </div>
    );
  }

  const balance = Number(wallet?.balance || 0);
  const remainingDailyLimit = Math.max(0, WALLET_DAILY_LIMIT - Number(dailyTransferred || 0));

  const openModalClean = (modalName) => {
    setFlowError('');
    setRequestSuccessMsg('');
    setPinInput('');
    setNewPinSetup('');
    if (modalName === 'send') {
      setSendStep('form');
      setActiveIdempotencyKey(`idem_send_${user?.id}_${Date.now()}`);
    }
    setActiveModal(modalName);
  };

  // Top Up Handler
  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    setFlowError('');
    setIsProcessing(true);
    try {
      const res = await performTopUp({
        amount: Number(topUpAmount),
        sourceId: topUpSource
      });
      setActiveModal(null);
      setActiveReceiptModal(res.receipt);
    } catch (err) {
      setFlowError(err?.message || 'Top-up failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send Money Step 1 -> Review Confirmation Sheet
  const handleProceedToConfirmSend = (e) => {
    e.preventDefault();
    setFlowError('');

    let target = selectedRecipient;
    if (!target && recipientQuery.trim()) {
      const matches = searchPublicProfiles(recipientQuery.trim(), {
        excludeUserId: user?.id,
        blockedUserIds
      });
      if (matches.length > 0) target = matches[0];
    }

    if (!target) {
      setFlowError('Please select a valid student @username to send money to.');
      return;
    }
    if (target.id === user?.id) {
      setFlowError('You cannot send money to yourself.');
      return;
    }

    const amt = Number(transferAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFlowError('Please enter an amount greater than RM0.00.');
      return;
    }
    if (amt > WALLET_MAX_PER_TRANSFER) {
      setFlowError(`Maximum per transfer is RM${WALLET_MAX_PER_TRANSFER.toFixed(2)}.`);
      return;
    }
    if (amt > balance) {
      setFlowError(`Insufficient demo wallet balance (Available: RM${balance.toFixed(2)}).`);
      return;
    }
    if (dailyTransferred + amt > WALLET_DAILY_LIMIT) {
      setFlowError(`Exceeds daily limit of RM${WALLET_DAILY_LIMIT.toFixed(2)} (Remaining today: RM${remainingDailyLimit.toFixed(2)}).`);
      return;
    }

    setSelectedRecipient(target);
    setActiveIdempotencyKey(`idem_tx_${user?.id}_${target.id}_${Date.now()}`);
    setSendStep('confirm');
  };

  // Send Money Step 3 -> Execute Atomic Transfer with PIN
  const handleExecuteSendTransfer = async (e) => {
    e.preventDefault();
    setFlowError('');
    setIsProcessing(true);

    try {
      let pinToUse = pinInput.trim();
      if (!wallet?.pinSet) {
        if (!/^\d{4}$/.test(newPinSetup.trim())) {
          throw new Error('Please set a 4-digit numeric demo PIN first.');
        }
        setupPin(newPinSetup.trim());
        pinToUse = newPinSetup.trim();
      }

      const res = await performTransfer({
        receiver: selectedRecipient,
        amount: Number(transferAmount),
        note: transferNote.trim() || 'Campus wallet transfer',
        pin: pinToUse,
        idempotencyKey: activeIdempotencyKey
      });

      setActiveModal(null);
      setTransferAmount('');
      setTransferNote('');
      setPinInput('');
      setActiveReceiptModal(res.receipt);
    } catch (err) {
      setFlowError(err?.message || 'Transfer could not be completed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Request Money / Split Bill Handler
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setFlowError('');
    setRequestSuccessMsg('');

    let target = selectedRecipient;
    if (!target && recipientQuery.trim()) {
      const matches = searchPublicProfiles(recipientQuery.trim(), {
        excludeUserId: user?.id,
        blockedUserIds
      });
      if (matches.length > 0) target = matches[0];
    }

    if (!target) {
      setFlowError('Please choose a friend or enter their @username.');
      return;
    }

    setIsProcessing(true);
    try {
      const totalAmt = isSplitMode ? Number(splitTotalBill) : null;
      const reqAmt = isSplitMode ? Number((Number(splitTotalBill) / 2).toFixed(2)) : Number(transferAmount);

      const req = await performRequestMoney({
        payer: target,
        amount: reqAmt,
        note:
          transferNote.trim() ||
          (isSplitMode ? `50/50 Split Bill (Total RM${Number(splitTotalBill).toFixed(2)})` : 'Campus money request'),
        isSplitBill: isSplitMode,
        originalTotalAmount: totalAmt
      });

      setRequestSuccessMsg(
        `Request for RM${Number(req.amount).toFixed(2)} sent to @${target.handle}!`
      );
      setTimeout(() => {
        setActiveModal(null);
        setRequestSuccessMsg('');
        setTransferAmount('');
        setTransferNote('');
      }, 1400);
    } catch (err) {
      setFlowError(err?.message || 'Could not send request.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Accept or Decline Incoming Money Request
  const handleDeclineRequest = async (reqItem) => {
    try {
      await performRespondToRequest({
        requestId: reqItem.id,
        action: 'decline'
      });
    } catch (err) {
      setFlowError(err?.message || 'Failed to decline request.');
    }
  };

  const handleConfirmAcceptRequest = async (e) => {
    e.preventDefault();
    if (!pendingRequestToAccept) return;
    setFlowError('');
    setIsProcessing(true);

    try {
      let pinToUse = pinInput.trim();
      if (!wallet?.pinSet) {
        if (!/^\d{4}$/.test(newPinSetup.trim())) {
          throw new Error('Please set a 4-digit numeric demo PIN first.');
        }
        setupPin(newPinSetup.trim());
        pinToUse = newPinSetup.trim();
      }

      const res = await performRespondToRequest({
        requestId: pendingRequestToAccept.id,
        action: 'accept',
        pin: pinToUse,
        idempotencyKey: `idem_accept_${pendingRequestToAccept.id}`
      });

      setActiveModal(null);
      setPendingRequestToAccept(null);
      setPinInput('');
      if (res.transferResult?.receipt) {
        setActiveReceiptModal(res.transferResult.receipt);
      }
    } catch (err) {
      setFlowError(err?.message || 'Failed to accept request.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Paste QR Code Handler
  const handlePasteCodeContinue = (e) => {
    e.preventDefault();
    setFlowError('');
    const parsed = parseWalletQrPayload(pastedCode);
    if (!parsed.valid) {
      setFlowError(parsed.error);
      return;
    }
    setSelectedRecipient(parsed.recipient);
    setRecipientQuery(`@${parsed.recipient.handle}`);
    setSendStep('form');
    setActiveModal('send');
  };

  // PIN Setup Modal Handler
  const handleSavePinModal = (e) => {
    e.preventDefault();
    setFlowError('');
    try {
      setupPin(pinSetupValue.trim());
      setPinSetupMsg('4-digit demo PIN saved! (Try 1234 or your custom PIN when sending money)');
      setTimeout(() => {
        setActiveModal(null);
        setPinSetupMsg('');
        setPinSetupValue('');
      }, 1200);
    } catch (err) {
      setFlowError(err?.message || 'PIN must be 4 digits.');
    }
  };

  return (
    <div className="wallet-view">
      {/* Persistent DEMO MODE Header Banner */}
      <div className="wallet-persistent-demo-bar" role="status">
        <div className="wallet-demo-badge">
          <ShieldAlert size={14} />
          <span>{DEMO_WALLET_BADGE_TEXT}</span>
        </div>
        <span className="wallet-demo-bar-text">
          Pitch Simulation Environment — All balances, top-ups, and student transfers use virtual demo credits only.
        </span>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div className="spot-offline-banner" role="status">
          <WifiOff size={16} />
          <span>You are offline. Viewing cached wallet balance and ledger — live cloud sync will resume when online.</span>
        </div>
      )}

      {/* First-Use Simulation Notice */}
      {!firstUseNoticeSeen && (
        <div className="wallet-first-use-notice card">
          <div className="first-use-notice-content">
            <Sparkles size={20} className="first-use-icon" />
            <div>
              <h3>Welcome to Your KampusKash Demo Wallet!</h3>
              <p>
                Every student starts with <strong>RM100.00 in free demo credit</strong>. Test peer-to-peer campus transfers,
                50/50 bill splits, QR code payments, and automatic Finance Tracker budget syncing. No real money is ever used.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={dismissFirstUseNotice}
          >
            Got it
          </button>
        </div>
      )}

      {/* Main Wallet Balance & Quick Actions Grid */}
      <div className="wallet-hero-grid">
        <section className="wallet-balance-card card">
          <div className="wallet-balance-top">
            <div>
              <span className="wallet-balance-label">KampusKash Demo Balance</span>
              <h1 className="wallet-balance-amount">RM {balance.toFixed(2)}</h1>
              <span className="wallet-handle-sub">
                @{publicProfile?.handle || user?.handle || 'student'} • {publicProfile?.displayName || user?.username}
              </span>
            </div>
            <span className="wallet-demo-badge">
              <ShieldAlert size={13} />
              <span>{DEMO_WALLET_BADGE_TEXT}</span>
            </span>
          </div>

          {/* Action Buttons Row */}
          <div className="wallet-actions-grid">
            <button
              type="button"
              className="wallet-action-tile primary"
              onClick={() => openModalClean('send')}
            >
              <Send size={18} />
              <span>Send Money</span>
            </button>

            <button
              type="button"
              className="wallet-action-tile"
              onClick={() => openModalClean('topup')}
            >
              <PlusCircle size={18} />
              <span>Top Up</span>
            </button>

            <button
              type="button"
              className="wallet-action-tile"
              onClick={() => {
                setIsSplitMode(false);
                openModalClean('request');
              }}
            >
              <HandCoins size={18} />
              <span>Request</span>
            </button>

            <button
              type="button"
              className="wallet-action-tile"
              onClick={() => {
                setIsSplitMode(true);
                setSplitTotalBill('24.00');
                openModalClean('request');
              }}
            >
              <Split size={18} />
              <span>Split Bill</span>
            </button>

            <button
              type="button"
              className="wallet-action-tile"
              onClick={() => {
                setQrTab('my_qr');
                openModalClean('qr');
              }}
            >
              <QrCode size={18} />
              <span>QR / Code</span>
            </button>
          </div>
        </section>

        {/* Limits, PIN & Finance Tracker Sync Card */}
        <section className="wallet-controls-card card">
          <div className="wallet-limits-header">
            <h3>Safety Limits &amp; Tracker Sync</h3>
            <button
              type="button"
              className="wallet-pin-pill-btn"
              onClick={() => openModalClean('pin')}
            >
              <Lock size={13} />
              <span>{wallet?.pinSet ? 'Change Demo PIN (Default: 1234)' : 'Set 4-Digit Demo PIN'}</span>
            </button>
          </div>

          <div className="wallet-limit-bar-box">
            <div className="wallet-limit-labels">
              <span>Daily Transfer Limit (RM{WALLET_DAILY_LIMIT.toFixed(0)}/day)</span>
              <strong>RM{Number(dailyTransferred || 0).toFixed(2)} used • RM{remainingDailyLimit.toFixed(2)} left</strong>
            </div>
            <div className="wallet-limit-progress-track">
              <div
                className="wallet-limit-progress-fill"
                style={{
                  width: `${Math.min(100, (Number(dailyTransferred || 0) / WALLET_DAILY_LIMIT) * 100)}%`
                }}
              />
            </div>
            <span className="wallet-limit-caption">
              Max per transfer: <strong>RM{WALLET_MAX_PER_TRANSFER.toFixed(2)}</strong> • Negative balances blocked • Atomic ledger
            </span>
          </div>

          <div className="wallet-tracker-sync-box">
            <label className="wallet-sync-toggle-label">
              <input
                type="checkbox"
                checked={Boolean(wallet?.autoSyncTracker ?? true)}
                onChange={(e) => toggleAutoSyncTracker(e.target.checked)}
              />
              <div>
                <strong>Auto-sync transfers to Finance Tracker</strong>
                <p>
                  Automatically logs an expense for the sender and an income for the receiver under
                  the <em>&ldquo;Wallet transfer&rdquo;</em> category with a link to the wallet receipt.
                </p>
              </div>
            </label>
          </div>

          {/* Pitch Mode Quick Account Switcher Shortcut */}
          <div className="wallet-pitch-switcher-bar">
            <div className="pitch-switcher-title">
              <Sparkles size={14} />
              <span>Pitch Mode Live Demo Accounts:</span>
            </div>
            <div className="pitch-switcher-buttons">
              <button
                type="button"
                className={`pitch-acc-btn ${user?.id === 'demo_user_aiman' ? 'active' : ''}`}
                onClick={() => switchPitchDemoAccount('demo_user_aiman')}
              >
                Switch to @aiman_utp
              </button>
              <button
                type="button"
                className={`pitch-acc-btn ${user?.id === 'demo_user_sarah' ? 'active' : ''}`}
                onClick={() => switchPitchDemoAccount('demo_user_sarah')}
              >
                Switch to @sarah_um
              </button>
              {!pitchModeLoaded && (
                <button
                  type="button"
                  className="pitch-acc-btn outline"
                  onClick={loadPitchDemoData}
                >
                  <RefreshCw size={12} /> Seed Pitch Data
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Incoming Money Requests Alert Section */}
      {incomingPendingRequests.length > 0 && (
        <section className="wallet-incoming-requests-card card">
          <div className="incoming-req-header">
            <HandCoins size={18} />
            <h3>Incoming Money &amp; Split Requests ({incomingPendingRequests.length})</h3>
          </div>
          <div className="incoming-req-list">
            {incomingPendingRequests.map((reqItem) => (
              <div key={reqItem.id} className="incoming-req-row">
                <div className="incoming-req-info">
                  <strong>
                    @{reqItem.requesterHandle} ({reqItem.requesterName}) requested{' '}
                    <span className="req-amount-highlight">RM{Number(reqItem.amount).toFixed(2)}</span>
                  </strong>
                  <p>
                    {reqItem.isSplitBill && <span className="split-badge-inline">50/50 Split</span>}
                    {reqItem.note} • {formatRelativeTime(reqItem.createdAt)}
                  </p>
                </div>
                <div className="incoming-req-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDeclineRequest(reqItem)}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setPendingRequestToAccept(reqItem);
                      openModalClean('accept_request');
                    }}
                  >
                    Accept &amp; Pay RM{Number(reqItem.amount).toFixed(2)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends Quick Send Strip */}
      {followingProfiles.length > 0 && (
        <section className="wallet-friends-strip card">
          <div className="friends-strip-label">
            <Users size={15} />
            <span>Quick Send or Split with Friends You Follow:</span>
          </div>
          <div className="friends-strip-avatars">
            {followingProfiles.slice(0, 8).map((friend) => (
              <div key={friend.id} className="friend-quick-pill">
                <button
                  type="button"
                  className="friend-quick-send-btn"
                  onClick={() => {
                    setSelectedRecipient(friend);
                    setRecipientQuery(`@${friend.handle}`);
                    openModalClean('send');
                  }}
                  title={`Send money to @${friend.handle}`}
                >
                  <div className="friend-mini-avatar">{getAvatarSvg(friend.avatarId || 'cat')}</div>
                  <span>@{friend.handle}</span>
                </button>
                <button
                  type="button"
                  className="friend-profile-link-btn"
                  onClick={() => setSelectedPublicProfileId(friend.id)}
                  title="View public profile"
                >
                  Profile
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transaction History & Ledger Section */}
      <section className="wallet-history-section card">
        <div className="wallet-history-header">
          <div>
            <h2>Wallet Activity &amp; Append-Only Ledger</h2>
            <p className="wallet-history-sub">
              Tap any completed transaction to view its official KampusKash receipt.
            </p>
          </div>

          <div className="wallet-history-filter-tabs" role="tablist">
            {[
              { id: 'all', label: 'All' },
              { id: 'sent', label: 'Sent' },
              { id: 'received', label: 'Received' },
              { id: 'topup', label: 'Top Up' },
              { id: 'requests', label: 'Requests' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={historyFilter === tab.id}
                className={`wallet-filter-btn ${historyFilter === tab.id ? 'active' : ''}`}
                onClick={() => setHistoryFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="community-empty-state">
            <Wallet size={38} className="empty-icon" />
            <h3>No wallet transactions in this filter yet</h3>
            <p>Try topping up your demo balance or sending a campus transfer to a friend!</p>
          </div>
        ) : (
          <div className="wallet-ledger-list">
            {filteredHistory.map((item) => {
              if (item.entryKind === 'request') {
                const isIncoming = item.payerId === user?.id;
                return (
                  <div key={item.id} className="wallet-ledger-row request-row">
                    <div className="ledger-icon-box request">
                      <HandCoins size={17} />
                    </div>
                    <div className="ledger-main-info">
                      <div className="ledger-title-line">
                        <strong>
                          {isIncoming
                            ? `Request from @${item.requesterHandle}`
                            : `Requested from @${item.payerHandle}`}
                        </strong>
                        {item.isSplitBill && <span className="split-badge-inline">50/50 Split</span>}
                        <span className={`ledger-status-pill ${item.status}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="ledger-note-line">{item.note}</p>
                      <span className="ledger-time-line">
                        <Clock size={11} /> {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <div className="ledger-amount-col">
                      <strong className="ledger-amount neutral">
                        RM{Number(item.amount).toFixed(2)}
                      </strong>
                      {isIncoming && item.status === 'pending' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setPendingRequestToAccept(item);
                            openModalClean('accept_request');
                          }}
                        >
                          Accept &amp; Pay
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const isTopUp = item.direction === 'topup';
              const isSent = item.direction === 'sent';
              return (
                <div
                  key={item.id}
                  className="wallet-ledger-row clickable"
                  onClick={() => setActiveReceiptModal(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveReceiptModal(item);
                    }
                  }}
                >
                  <div className={`ledger-icon-box ${item.direction}`}>
                    {isTopUp ? (
                      <PlusCircle size={17} />
                    ) : isSent ? (
                      <ArrowUpRight size={17} />
                    ) : (
                      <ArrowDownLeft size={17} />
                    )}
                  </div>
                  <div className="ledger-main-info">
                    <div className="ledger-title-line">
                      <strong>
                        {isTopUp
                          ? item.sourceName || 'Simulated Top Up'
                          : isSent
                          ? `Sent to @${item.receiverHandle} (${item.receiverName})`
                          : `Received from @${item.senderHandle} (${item.senderName})`}
                      </strong>
                      <span className={`ledger-status-pill ${item.status || 'completed'}`}>
                        {item.status || 'completed'}
                      </span>
                    </div>
                    <p className="ledger-note-line">{item.note}</p>
                    <span className="ledger-time-line">
                      <Clock size={11} /> {formatRelativeTime(item.createdAt)} • Ref: {item.referenceCode || item.id}
                    </span>
                  </div>
                  <div className="ledger-amount-col">
                    <strong className={`ledger-amount ${isSent ? 'negative' : 'positive'}`}>
                      {isSent ? '-' : '+'}RM{Number(item.amount).toFixed(2)}
                    </strong>
                    <span className="ledger-receipt-hint">
                      <FileText size={11} /> Receipt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* MODAL 1: SIMULATED TOP UP                                             */}
      {/* ===================================================================== */}
      {activeModal === 'topup' && (
        <div className="community-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="community-modal-content wallet-flow-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="community-modal-header">
              <div>
                <span className="wallet-demo-badge">
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h2>Simulated Wallet Top Up</h2>
              </div>
              <button
                type="button"
                className="community-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="community-create-form">
              {flowError && (
                <div className="community-form-errors">
                  <AlertCircle size={16} />
                  <span>{flowError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Quick Top-Up Amount (RM)</label>
                <div className="wallet-quick-amount-chips">
                  {['10', '20', '50', '100', '200'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`wallet-amt-chip ${topUpAmount === amt ? 'active' : ''}`}
                      onClick={() => setTopUpAmount(amt)}
                    >
                      RM{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={WALLET_DAILY_LIMIT}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Select Simulated Bank / E-Wallet Source</label>
                <div className="wallet-source-list">
                  {DEMO_TOPUP_SOURCES.map((src) => (
                    <label
                      key={src.id}
                      className={`wallet-source-option ${topUpSource === src.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="topupSource"
                        value={src.id}
                        checked={topUpSource === src.id}
                        onChange={() => setTopUpSource(src.id)}
                      />
                      <div>
                        <strong>{src.label}</strong>
                        <span>{src.type === 'bank' ? 'Simulated FPX Instant Transfer' : 'Simulated E-Wallet Reload'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="community-modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                  <PlusCircle size={16} />
                  <span>{isProcessing ? 'Processing...' : `Simulate Top Up RM${Number(topUpAmount || 0).toFixed(2)}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SEND MONEY (Form -> Confirmation Sheet -> 4-Digit PIN)       */}
      {/* ===================================================================== */}
      {activeModal === 'send' && (
        <div className="community-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="community-modal-content wallet-flow-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="community-modal-header">
              <div>
                <span className="wallet-demo-badge">
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h2>
                  {sendStep === 'form'
                    ? 'Send Demo Money'
                    : sendStep === 'confirm'
                    ? 'Review & Confirm Transfer'
                    : 'Enter 4-Digit Demo PIN'}
                </h2>
              </div>
              <button
                type="button"
                className="community-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            {sendStep === 'form' && (
              <form onSubmit={handleProceedToConfirmSend} className="community-create-form">
                {flowError && (
                  <div className="community-form-errors">
                    <AlertCircle size={16} />
                    <span>{flowError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Search Recipient (@username or Name) *</label>
                  <div className="community-search-box">
                    <Search size={16} className="community-search-icon" />
                    <input
                      type="text"
                      className="community-search-input"
                      placeholder="Type @sarah_um, @aiman_utp, or choose below..."
                      value={recipientQuery}
                      onChange={(e) => {
                        setRecipientQuery(e.target.value);
                        setSelectedRecipient(null);
                      }}
                      required
                    />
                  </div>

                  {/* Recipient Suggestions */}
                  <div className="wallet-recipient-suggestions">
                    {candidateRecipients.map((cand) => {
                      const isPicked = selectedRecipient?.id === cand.id;
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          className={`recipient-suggestion-pill ${isPicked ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedRecipient(cand);
                            setRecipientQuery(`@${cand.handle}`);
                          }}
                        >
                          <div className="friend-mini-avatar">{getAvatarSvg(cand.avatarId || 'cat')}</div>
                          <div>
                            <strong>{cand.displayName}</strong>
                            <span>@{cand.handle}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Amount (RM) * <small>(Max RM{WALLET_MAX_PER_TRANSFER})</small></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.10"
                      max={WALLET_MAX_PER_TRANSFER}
                      placeholder="12.50"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Nasi Ayam lunch split"
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                </div>

                <div className="community-modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Review Transfer
                  </button>
                </div>
              </form>
            )}

            {sendStep === 'confirm' && selectedRecipient && (
              <div className="community-create-form">
                {flowError && (
                  <div className="community-form-errors">
                    <AlertCircle size={16} />
                    <span>{flowError}</span>
                  </div>
                )}

                <div className="wallet-confirm-sheet">
                  <div className="confirm-sheet-recipient">
                    <div className="public-profile-avatar-lg">
                      {getAvatarSvg(selectedRecipient.avatarId || 'cat')}
                    </div>
                    <div>
                      <span>Sending to</span>
                      <h3>{selectedRecipient.displayName}</h3>
                      <strong>@{selectedRecipient.handle}</strong>
                    </div>
                  </div>

                  <div className="wallet-receipt-details-card">
                    <div className="receipt-detail-row">
                      <span>Transfer Amount</span>
                      <strong>RM{Number(transferAmount).toFixed(2)}</strong>
                    </div>
                    <div className="receipt-detail-row">
                      <span>Balance After Transfer</span>
                      <strong>RM{(balance - Number(transferAmount)).toFixed(2)}</strong>
                    </div>
                    <div className="receipt-detail-row">
                      <span>Note</span>
                      <strong>{transferNote.trim() || 'Campus wallet transfer'}</strong>
                    </div>
                    <div className="receipt-detail-row">
                      <span>Finance Tracker Sync</span>
                      <strong>{wallet?.autoSyncTracker ? 'Auto-logs under "Wallet transfer"' : 'Off'}</strong>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleExecuteSendTransfer} className="wallet-pin-confirm-box">
                  {!wallet?.pinSet ? (
                    <div className="form-group">
                      <label>Create Your 4-Digit Demo PIN (First Use) *</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="e.g. 1234"
                        value={newPinSetup}
                        onChange={(e) => setNewPinSetup(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Enter 4-Digit Demo PIN to Authorize (Demo accounts use 1234) *</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                      />
                    </div>
                  )}

                  <div className="community-modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setSendStep('form')}
                      disabled={isProcessing}
                    >
                      Back
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                      <Send size={16} />
                      <span>{isProcessing ? 'Sending...' : `Confirm & Send RM${Number(transferAmount).toFixed(2)}`}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: REQUEST MONEY & SPLIT WITH A FRIEND                          */}
      {/* ===================================================================== */}
      {activeModal === 'request' && (
        <div className="community-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="community-modal-content wallet-flow-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="community-modal-header">
              <div>
                <span className="wallet-demo-badge">
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h2>{isSplitMode ? 'Split Bill with a Friend (50/50)' : 'Request Demo Money'}</h2>
              </div>
              <button
                type="button"
                className="community-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="community-create-form">
              <div className="spot-feed-tabs" style={{ marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className={`spot-feed-tab-btn ${!isSplitMode ? 'active' : ''}`}
                  onClick={() => setIsSplitMode(false)}
                >
                  <HandCoins size={14} /> Standard Request
                </button>
                <button
                  type="button"
                  className={`spot-feed-tab-btn ${isSplitMode ? 'active' : ''}`}
                  onClick={() => setIsSplitMode(true)}
                >
                  <Split size={14} /> Split with a Friend (50%)
                </button>
              </div>

              {flowError && (
                <div className="community-form-errors">
                  <AlertCircle size={16} />
                  <span>{flowError}</span>
                </div>
              )}

              {requestSuccessMsg && (
                <div className="report-success-msg">
                  <CheckCircle2 size={16} />
                  <span>{requestSuccessMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label>Friend&apos;s @username *</label>
                <input
                  type="text"
                  placeholder="Type @sarah_um, @aiman_utp, or pick below..."
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setSelectedRecipient(null);
                  }}
                  required
                />
                <div className="wallet-recipient-suggestions">
                  {candidateRecipients.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      className={`recipient-suggestion-pill ${selectedRecipient?.id === cand.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedRecipient(cand);
                        setRecipientQuery(`@${cand.handle}`);
                      }}
                    >
                      <div className="friend-mini-avatar">{getAvatarSvg(cand.avatarId || 'cat')}</div>
                      <div>
                        <strong>{cand.displayName}</strong>
                        <span>@{cand.handle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {isSplitMode ? (
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Total Bill Amount (RM) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.20"
                      max={WALLET_MAX_PER_TRANSFER * 2}
                      value={splitTotalBill}
                      onChange={(e) => setSplitTotalBill(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Friend&apos;s 50% Share (Auto-calculated)</label>
                    <input
                      type="text"
                      readOnly
                      value={`RM ${(Number(splitTotalBill || 0) / 2).toFixed(2)}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Amount to Request (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    max={WALLET_MAX_PER_TRANSFER}
                    placeholder="10.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>What is this for?</label>
                <input
                  type="text"
                  placeholder="e.g., GrabCar share from LRT Universiti"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="community-modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                  <HandCoins size={16} />
                  <span>
                    {isSplitMode
                      ? `Send 50/50 Split Request (RM${(Number(splitTotalBill || 0) / 2).toFixed(2)})`
                      : 'Send Request'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: PERSONAL WALLET QR CODE & PASTE CODE                         */}
      {/* ===================================================================== */}
      {activeModal === 'qr' && (
        <div className="community-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="community-modal-content wallet-flow-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="community-modal-header">
              <div>
                <span className="wallet-demo-badge">
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h2>KampusKash QR &amp; Quick Code</h2>
              </div>
              <button
                type="button"
                className="community-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="community-create-form">
              <div className="spot-feed-tabs">
                <button
                  type="button"
                  className={`spot-feed-tab-btn ${qrTab === 'my_qr' ? 'active' : ''}`}
                  onClick={() => setQrTab('my_qr')}
                >
                  <QrCode size={14} /> My Wallet QR Code
                </button>
                <button
                  type="button"
                  className={`spot-feed-tab-btn ${qrTab === 'paste_code' ? 'active' : ''}`}
                  onClick={() => setQrTab('paste_code')}
                >
                  <Send size={14} /> Paste Code to Pay
                </button>
              </div>

              {qrTab === 'my_qr' ? (
                <div className="wallet-qr-display-box">
                  {/* Deterministic stylized QR SVG */}
                  <div className="wallet-qr-svg-frame">
                    <svg viewBox="0 0 120 120" width="160" height="160" aria-label="Personal Wallet QR Code">
                      <rect width="120" height="120" rx="10" fill="#FFFFFF" />
                      <rect x="10" y="10" width="30" height="30" rx="4" fill="none" stroke="#0F172A" strokeWidth="6" />
                      <rect x="19" y="19" width="12" height="12" fill="#0F172A" />
                      <rect x="80" y="10" width="30" height="30" rx="4" fill="none" stroke="#0F172A" strokeWidth="6" />
                      <rect x="89" y="19" width="12" height="12" fill="#0F172A" />
                      <rect x="10" y="80" width="30" height="30" rx="4" fill="none" stroke="#0F172A" strokeWidth="6" />
                      <rect x="19" y="89" width="12" height="12" fill="#0F172A" />
                      <rect x="48" y="14" width="8" height="8" fill="#0F172A" />
                      <rect x="62" y="22" width="8" height="16" fill="#0F172A" />
                      <rect x="48" y="48" width="24" height="24" rx="4" fill="#10B981" />
                      <rect x="14" y="48" width="16" height="8" fill="#0F172A" />
                      <rect x="34" y="60" width="8" height="12" fill="#0F172A" />
                      <rect x="80" y="48" width="12" height="8" fill="#0F172A" />
                      <rect x="96" y="56" width="12" height="16" fill="#0F172A" />
                      <rect x="48" y="82" width="12" height="12" fill="#0F172A" />
                      <rect x="68" y="92" width="16" height="16" fill="#0F172A" />
                      <rect x="92" y="80" width="16" height="10" fill="#0F172A" />
                    </svg>
                  </div>
                  <h3>@{publicProfile?.handle || user?.handle || 'student'}</h3>
                  <p>Share your payment code below so friends can paste it to pay you instantly:</p>
                  <div className="wallet-qr-code-pill">
                    <code>{myQrCodeString}</code>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        if (navigator?.clipboard) {
                          navigator.clipboard.writeText(myQrCodeString).catch(() => {});
                          setQrCopied(true);
                          setTimeout(() => setQrCopied(false), 1800);
                        }
                      }}
                    >
                      {qrCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{qrCopied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasteCodeContinue} className="wallet-paste-code-form">
                  {flowError && (
                    <div className="community-form-errors">
                      <AlertCircle size={16} />
                      <span>{flowError}</span>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Paste Friend&apos;s KampusKash Code or @username *</label>
                    <input
                      type="text"
                      placeholder="e.g. KKPAY:demo_user_sarah:sarah_um:Sarah%20Lim or @sarah_um"
                      value={pastedCode}
                      onChange={(e) => setPastedCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="wallet-quick-paste-examples">
                    <span>Demo codes to try:</span>
                    {pitchDemoUsers.slice(0, 3).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="wallet-amt-chip"
                        onClick={() =>
                          setPastedCode(`KKPAY:${u.id}:${u.handle}:${encodeURIComponent(u.displayName)}`)
                        }
                      >
                        @{u.handle}
                      </button>
                    ))}
                  </div>
                  <div className="community-modal-footer">
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      Continue to Payment
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: ACCEPT INCOMING MONEY REQUEST                                */}
      {/* ===================================================================== */}
      {activeModal === 'accept_request' && pendingRequestToAccept && (
        <div className="community-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="community-modal-content wallet-flow-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="community-modal-header">
              <div>
                <span className="wallet-demo-badge">
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h2>Accept &amp; Pay Money Request</h2>
              </div>
              <button
                type="button"
                className="community-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmAcceptRequest} className="community-create-form">
              {flowError && (
                <div className="community-form-errors">
                  <AlertCircle size={16} />
                  <span>{flowError}</span>
                </div>
              )}

              <div className="wallet-receipt-details-card">
                <div className="receipt-detail-row">
                  <span>Pay To</span>
                  <strong>@{pendingRequestToAccept.requesterHandle} ({pendingRequestToAccept.requesterName})</strong>
                </div>
                <div className="receipt-detail-row">
                  <span>Amount</span>
                  <strong>RM{Number(pendingRequestToAccept.amount).toFixed(2)}</strong>
                </div>
                <div className="receipt-detail-row">
                  <span>Note</span>
                  <strong>{pendingRequestToAccept.note}</strong>
                </div>
              </div>

              {!wallet?.pinSet ? (
                <div className="form-group">
                  <label>Set Your 4-Digit Demo PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={newPinSetup}
                    onChange={(e) => setNewPinSetup(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Enter 4-Digit Demo PIN to Pay (Demo accounts use 1234) *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                  />
                </div>
              )}

              <div className="community-modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                  <CheckCircle2 size={16} />
                  <span>{isProcessing ? 'Paying...' : `Pay RM${Number(pendingRequestToAccept.amount).toFixed(2)}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: SET / CHANGE 4-DIGIT DEMO PIN                                */}
      {/* ===================================================================== */}
      {activeModal === 'pin' && (
        <div className="community-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="community-modal-content wallet-flow-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="community-modal-header">
              <div>
                <span className="wallet-demo-badge">
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h2>Set 4-Digit Demo Wallet PIN</h2>
              </div>
              <button
                type="button"
                className="community-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePinModal} className="community-create-form">
              {flowError && (
                <div className="community-form-errors">
                  <AlertCircle size={16} />
                  <span>{flowError}</span>
                </div>
              )}
              {pinSetupMsg && (
                <div className="report-success-msg">
                  <CheckCircle2 size={16} />
                  <span>{pinSetupMsg}</span>
                </div>
              )}
              <div className="form-group">
                <label>New 4-Digit Numeric PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={pinSetupValue}
                  onChange={(e) => setPinSetupValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  Used to confirm simulated transfers in KampusKash Demo Wallet.
                </small>
              </div>
              <div className="community-modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Demo PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

