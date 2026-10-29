import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_ICONS,
  KAMPUSKASH_ACCOUNT_ID,
  KAMPUSKASH_ACCOUNT_TYPE
} from '../services/accountService';
import {
  DEMO_WALLET_BADGE_TEXT,
  DEMO_TOPUP_SOURCES,
  WALLET_DAILY_LIMIT
} from '../config/appConstants';
import { getUserWalletHistory } from '../services/walletService';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { AccountsSkeleton } from '../components/Skeleton';
import {
  PlusCircle,
  Trash2,
  Edit3,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  QrCode,
  X,
  CheckCircle2,
  ShieldAlert,
  Send,
  Check,
  XCircle,
  Lock
} from 'lucide-react';

export default function AccountsView({ onOpenAddAccount, onEditAccount }) {
  const { accounts, deleteAccount, totalAccountBalance, isLoading } = useFinance();
  const { showSuccess } = useToast();
  const {
    wallet,
    walletRequests = [],
    performAddMoneyFromAccount,
    performTopUp,
    performRespondToRequest,
    toggleAutoSyncTracker,
    openScanPaySheet,
    setActiveReceiptModal
  } = useSocialWallet() || {};

  const [deleteTarget, setDeleteTarget] = useState(null);

  // "Add money" modal state for KampusKash account
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('20');
  const [selectedOwnAccountId, setSelectedOwnAccountId] = useState('');
  const [externalSourceId, setExternalSourceId] = useState(DEMO_TOPUP_SOURCES[0]?.id || 'fpx_maybank');
  const [addMoneyError, setAddMoneyError] = useState('');
  const [addMoneyReceipt, setAddMoneyReceipt] = useState(null);
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  // "KampusKash History & Requests" modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'sent' | 'received' | 'topup' | 'requests'
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [requestPin, setRequestPin] = useState('');
  const [requestError, setRequestError] = useState('');

  // Other user accounts (excluding KampusKash) that can fund "Add money"
  const otherAccounts = useMemo(
    () =>
      (accounts || []).filter(
        (a) =>
          a.accountId !== KAMPUSKASH_ACCOUNT_ID &&
          a.accountType !== KAMPUSKASH_ACCOUNT_TYPE &&
          !a.isKampusKash
      ),
    [accounts]
  );

  const filteredHistory = useMemo(() => {
    if (!wallet?.userId) return [];
    return getUserWalletHistory(wallet.userId, historyFilter);
  }, [wallet?.userId, wallet?.balance, walletRequests, historyFilter, isHistoryOpen]);

  const pendingIncomingRequests = useMemo(
    () =>
      (walletRequests || []).filter(
        (r) => r.payerId === wallet?.userId && r.status === 'pending'
      ),
    [walletRequests, wallet?.userId]
  );

  const handleOpenAddMoney = (e) => {
    if (e) e.stopPropagation();
    setAddMoneyError('');
    setAddMoneyReceipt(null);
    setAddMoneyAmount('20');
    if (otherAccounts.length > 0) {
      setSelectedOwnAccountId(otherAccounts[0].accountId);
    } else {
      setSelectedOwnAccountId('external_fpx');
    }
    setIsAddMoneyOpen(true);
  };

  const handleConfirmAddMoney = async (e) => {
    e.preventDefault();
    setAddMoneyError('');
    const numAmt = Number(addMoneyAmount);
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      setAddMoneyError('Please enter an amount greater than RM0.00.');
      return;
    }
    if (numAmt > WALLET_DAILY_LIMIT) {
      setAddMoneyError(`Maximum single transfer is RM${WALLET_DAILY_LIMIT.toFixed(2)}.`);
      return;
    }

    setIsAddingMoney(true);
    try {
      if (selectedOwnAccountId && selectedOwnAccountId !== 'external_fpx') {
        const sourceAcc = otherAccounts.find((a) => a.accountId === selectedOwnAccountId);
        if (!sourceAcc) {
          setAddMoneyError('Please select a valid source account.');
          setIsAddingMoney(false);
          return;
        }
        const res = await performAddMoneyFromAccount({
          fromAccount: sourceAcc,
          amount: numAmt
        });
        setAddMoneyReceipt(res.receipt);
        showSuccess(
          `Moved RM ${numAmt.toFixed(2)} from ${sourceAcc.accountName} into KampusKash (Demo).`
        );
      } else {
        const res = await performTopUp({
          amount: numAmt,
          sourceId: externalSourceId
        });
        setAddMoneyReceipt(res.receipt);
        showSuccess(`Added RM ${numAmt.toFixed(2)} demo money into KampusKash.`);
      }
    } catch (err) {
      setAddMoneyError(err?.message || 'Unable to add money.');
    } finally {
      setIsAddingMoney(false);
    }
  };

  const handleConfirmAcceptRequest = async (e) => {
    e.preventDefault();
    if (!acceptingRequest) return;
    setRequestError('');
    try {
      await performRespondToRequest({
        requestId: acceptingRequest.id,
        action: 'accept',
        pin: requestPin
      });
      setAcceptingRequest(null);
      setRequestPin('');
      showSuccess(`Paid RM ${Number(acceptingRequest.amount).toFixed(2)} to @${acceptingRequest.requesterHandle}.`);
    } catch (err) {
      setRequestError(err?.message || 'Failed to settle request.');
    }
  };

  const handleDeclineRequest = async (reqItem) => {
    try {
      await performRespondToRequest({
        requestId: reqItem.id,
        action: 'decline'
      });
      showSuccess(`Declined request from @${reqItem.requesterHandle}.`);
    } catch {
      // ignore
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteAccount(deleteTarget.accountId);
    showSuccess(`Deleted account "${deleteTarget.accountName}". Transactions unassigned.`);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <AccountsSkeleton />;
  }

  return (
    <div className="view-fade-in">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700 }}>
              My Accounts
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage your KampusKash account, bank accounts, e-wallets, and cash reserves.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {openScanPaySheet && (
              <button
                type="button"
                onClick={() => openScanPaySheet('scan')}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <QrCode size={16} /> Scan / Pay
              </button>
            )}
            <button data-tour="accounts-add-btn" onClick={onOpenAddAccount} className="btn btn-primary">
              <PlusCircle size={16} /> + Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Total Balance Summary */}
      {accounts.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.25rem'
            }}
          >
            Total Account Balance
          </div>
          <div
            style={{
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '2rem',
              fontWeight: 800,
              color: totalAccountBalance >= 0 ? 'var(--text-main)' : 'var(--expense)'
            }}
          >
            RM {totalAccountBalance.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No Accounts Linked Yet"
          description="Keep tabs on your bank accounts, MAE, Touch 'n Go, or physical cash in one place."
          actionText="+ Add Your First Account"
          onAction={onOpenAddAccount}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.25rem'
          }}
        >
          {accounts.map((account) => {
            const isKampusKash =
              account.accountId === KAMPUSKASH_ACCOUNT_ID ||
              account.accountType === KAMPUSKASH_ACCOUNT_TYPE ||
              account.isKampusKash === true;
            const typeInfo = ACCOUNT_TYPES.find((t) => t.value === account.accountType);
            const icon = ACCOUNT_TYPE_ICONS[account.accountType] || '📋';

            return (
              <div
                key={account.accountId}
                className="card"
                onClick={isKampusKash ? () => setIsHistoryOpen(true) : undefined}
                style={{
                  position: 'relative',
                  cursor: isKampusKash ? 'pointer' : 'default',
                  border: isKampusKash
                    ? '1.5px solid color-mix(in srgb, var(--primary) 55%, var(--border-light))'
                    : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* Card Header: spacious layout so long titles stay within 1-2 lines and badges sit below the name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.9rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {isKampusKash ? (
                        <img
                          src="/kiro-logo.png"
                          alt="KampusKash"
                          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                        />
                      ) : (
                        icon
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          lineHeight: 1.25,
                          color: 'var(--text-main)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word'
                        }}
                        title={account.accountName}
                      >
                        {account.accountName}
                      </div>

                      {/* Subtitle + Demo / Sample Tag placed cleanly on its own row below the title */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                          marginTop: '0.28rem'
                        }}
                      >
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {isKampusKash
                            ? 'KampusKash Pay'
                            : account.institution || typeInfo?.label || 'Account'}
                        </span>

                        {(isKampusKash || account.isDemo) && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '0.1rem 0.42rem',
                              borderRadius: '4px',
                              background: isKampusKash
                                ? 'color-mix(in srgb, var(--primary) 18%, transparent)'
                                : 'rgba(245, 158, 11, 0.2)',
                              color: isKampusKash ? 'var(--primary)' : '#FBBF24',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              flexShrink: 0
                            }}
                          >
                            {isKampusKash ? 'Demo' : 'Sample'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Action Cluster: never overlaps title */}
                  <div
                    style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isKampusKash ? (
                      <button
                        type="button"
                        onClick={() => setIsHistoryOpen(true)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.74rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Open KampusKash transaction history"
                      >
                        <History size={13} />
                        <span>History</span>
                        {pendingIncomingRequests.length > 0 && (
                          <span
                            style={{
                              background: 'var(--expense)',
                              color: '#fff',
                              borderRadius: '999px',
                              padding: '0 0.35rem',
                              fontSize: '0.65rem',
                              fontWeight: 800
                            }}
                          >
                            {pendingIncomingRequests.length}
                          </span>
                        )}
                      </button>
                    ) : (
                      <>
                        {onEditAccount && (
                          <button
                            onClick={() => onEditAccount(account)}
                            className="btn btn-secondary btn-icon"
                            style={{ width: '30px', height: '30px' }}
                            title="Edit Account"
                            aria-label={`Edit ${account.accountName}`}
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(account)}
                          className="btn btn-danger btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="Delete Account"
                          aria-label={`Delete ${account.accountName}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Balance Row */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balance</span>
                  <span
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: account.balance >= 0 ? 'var(--text-main)' : 'var(--expense)'
                    }}
                  >
                    RM {Number(account.balance).toFixed(2)}
                  </span>
                </div>

                {/* KampusKash Account Card Actions: "Add money" & "Scan / Pay" */}
                {isKampusKash && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: '0.85rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px dashed var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleOpenAddMoney}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.45rem 0.65rem'
                      }}
                    >
                      <PlusCircle size={14} />
                      <span>Add money</span>
                    </button>

                    {openScanPaySheet && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openScanPaySheet('transfer')}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.45rem 0.65rem'
                        }}
                      >
                        <Send size={13} />
                        <span>Transfer</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          MODAL 1: "ADD MONEY" INTO KAMPUSKASH ACCOUNT (From Own Account)
         ============================================================ */}
      {isAddMoneyOpen && (
        <div
          className="community-modal-backdrop"
          onClick={() => setIsAddMoneyOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add money to KampusKash account"
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '1.35rem',
              borderRadius: 'var(--radius-lg, 16px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: 'var(--warning)',
                    marginBottom: '0.2rem'
                  }}
                >
                  <ShieldAlert size={12} /> {DEMO_WALLET_BADGE_TEXT}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Add Money to KampusKash
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMoneyOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {addMoneyReceipt ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <CheckCircle2 size={42} style={{ color: 'var(--income)', margin: '0 auto' }} />
                <h4 style={{ margin: 0, fontSize: '1.05rem' }}>
                  RM {Number(addMoneyReceipt.amount).toFixed(2)} Added to KampusKash!
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {addMoneyReceipt.note} • Ref: <code>{addMoneyReceipt.referenceCode}</code>
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsAddMoneyOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmAddMoney} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Simulate moving money from one of your other accounts into your KampusKash account (updates both balances).
                </p>

                {addMoneyError && (
                  <div
                    role="alert"
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--expense-bg)',
                      color: 'var(--expense)',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                  >
                    {addMoneyError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="add-money-source-select"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}
                  >
                    Transfer From Account
                  </label>
                  <select
                    id="add-money-source-select"
                    value={selectedOwnAccountId}
                    onChange={(e) => setSelectedOwnAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    {otherAccounts.map((acc) => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.accountName} ({acc.institution || acc.accountType}) — RM {Number(acc.balance).toFixed(2)}
                      </option>
                    ))}
                    <option value="external_fpx">
                      Simulated FPX / Instant Demo Top-Up
                    </option>
                  </select>
                </div>

                {selectedOwnAccountId === 'external_fpx' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Simulated Bank / E-Wallet Source
                    </label>
                    <select
                      value={externalSourceId}
                      onChange={(e) => setExternalSourceId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {DEMO_TOPUP_SOURCES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="add-money-amount-input"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}
                  >
                    Amount (RM)
                  </label>
                  <input
                    id="add-money-amount-input"
                    type="number"
                    step="0.50"
                    min="1"
                    max={WALLET_DAILY_LIMIT}
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.1rem',
                      fontWeight: 800
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    {[10, 20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAddMoneyAmount(String(amt))}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-card-subtle)',
                          color: 'var(--text-main)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        +RM{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsAddMoneyOpen(false)}
                    disabled={isAddingMoney}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isAddingMoney}
                  >
                    {isAddingMoney ? 'Moving...' : 'Add Money'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: KAMPUSKASH ACCOUNT HISTORY, REQUESTS & SETTINGS
         ============================================================ */}
      {isHistoryOpen && (
        <div
          className="community-modal-backdrop"
          onClick={() => setIsHistoryOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="KampusKash Account History"
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '86vh',
              overflowY: 'auto',
              padding: '1.35rem',
              borderRadius: 'var(--radius-lg, 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src="/kiro-logo.png" alt="KampusKash" style={{ width: '32px', height: '32px' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                    KampusKash Account History
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--warning)', fontWeight: 700 }}>
                    {DEMO_WALLET_BADGE_TEXT}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Balance & Tracker Auto-Sync Setting */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>KampusKash Balance</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  RM {Number(wallet?.balance ?? 100).toFixed(2)}
                </div>
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-main)'
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(wallet?.autoSyncTracker ?? true)}
                  onChange={(e) => toggleAutoSyncTracker && toggleAutoSyncTracker(e.target.checked)}
                />
                <span>Sync transfers to Tracker ("Transfer" category)</span>
              </label>
            </div>

            {/* Incoming Pending Money Requests */}
            {pendingIncomingRequests.length > 0 && (
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Incoming Money Requests ({pendingIncomingRequests.length})
                </div>
                {pendingIncomingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                        @{req.requesterHandle} requested RM {Number(req.amount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.note}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setAcceptingRequest(req);
                          setRequestPin('');
                          setRequestError('');
                        }}
                      >
                        <Check size={13} /> Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeclineRequest(req)}
                      >
                        <XCircle size={13} /> Decline
                      </button>
                    </div>
                  </div>
                ))}

                {acceptingRequest && (
                  <form
                    onSubmit={handleConfirmAcceptRequest}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      <Lock size={13} /> Enter 4-digit PIN to pay RM {Number(acceptingRequest.amount).toFixed(2)} to @{acceptingRequest.requesterHandle}:
                    </div>
                    {requestError && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--expense)', fontWeight: 600 }}>
                        {requestError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="4-digit PIN"
                        value={requestPin}
                        onChange={(e) => setRequestPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-card-subtle)',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-mono)',
                          width: '120px'
                        }}
                        required
                      />
                      <button type="submit" className="btn btn-primary btn-sm">
                        Confirm Pay
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setAcceptingRequest(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* History Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'sent', label: 'Sent' },
                { id: 'received', label: 'Received' },
                { id: 'topup', label: 'Added Money' },
                { id: 'requests', label: 'Requests' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHistoryFilter(f.id)}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: '999px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: historyFilter === f.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                    background: historyFilter === f.id ? 'var(--primary)' : 'var(--bg-card-subtle)',
                    color: historyFilter === f.id ? '#fff' : 'var(--text-main)'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ledger & Request Entries */}
            {filteredHistory.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No KampusKash transactions in this filter yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredHistory.map((item) => {
                  const isOut = item.direction === 'sent' || item.direction === 'outgoing_request';
                  return (
                    <div
                      key={item.id}
                      onClick={() => item.entryKind === 'ledger' && setActiveReceiptModal && setActiveReceiptModal(item)}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: '10px',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: item.entryKind === 'ledger' ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isOut ? 'var(--expense-bg)' : 'var(--income-bg)',
                            color: isOut ? 'var(--expense)' : 'var(--income)',
                            flexShrink: 0
                          }}
                        >
                          {isOut ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {item.type === 'topup'
                              ? item.sourceName || 'Added Money'
                              : isOut
                              ? `To @${item.receiverHandle || item.payerHandle}`
                              : `From @${item.senderHandle || item.requesterHandle}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.note} • {new Date(item.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            fontFamily: 'var(--font-mono)',
                            color: isOut ? 'var(--expense)' : 'var(--income)'
                          }}
                        >
                          {isOut ? '-' : '+'}RM {Number(item.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Styled Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Account"
        message={`Are you sure you want to delete "${deleteTarget?.accountName}"? Transactions linked to this account will become unassigned, but will not be lost.`}
        confirmText="Delete Account"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
