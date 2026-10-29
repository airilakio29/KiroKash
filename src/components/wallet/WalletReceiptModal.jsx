import React from 'react';
import {
  X,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Copy,
  Check
} from 'lucide-react';
import { DEMO_WALLET_BADGE_TEXT } from '../../config/appConstants';

export default function WalletReceiptModal({ receipt, currentUserId, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!receipt) return null;

  const isTopUp = receipt.type === 'topup';
  const isSender = !isTopUp && receipt.senderId === currentUserId;
  const amountStr = `RM${Number(receipt.amount || 0).toFixed(2)}`;

  const handleCopyRef = () => {
    if (navigator?.clipboard && receipt.referenceCode) {
      navigator.clipboard.writeText(receipt.referenceCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div
        className="community-modal-content wallet-receipt-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="KampusKash Demo Wallet Receipt"
      >
        <div className="community-modal-header">
          <span className="wallet-demo-badge">
            <ShieldAlert size={13} />
            <span>{DEMO_WALLET_BADGE_TEXT}</span>
          </span>
          <button
            type="button"
            className="community-modal-close"
            onClick={onClose}
            aria-label="Close receipt"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wallet-receipt-body">
          <div className="wallet-receipt-status-icon">
            <CheckCircle2 size={44} />
          </div>
          <div className="wallet-receipt-type-pill">
            {isTopUp ? (
              <>
                <PlusCircle size={13} /> Simulated Top Up Completed
              </>
            ) : isSender ? (
              <>
                <ArrowUpRight size={13} /> Transfer Sent
              </>
            ) : (
              <>
                <ArrowDownLeft size={13} /> Transfer Received
              </>
            )}
          </div>

          <h2 className="wallet-receipt-amount">
            {isSender ? `-${amountStr}` : `+${amountStr}`}
          </h2>

          <p className="wallet-receipt-note">{receipt.note || 'Campus wallet transaction'}</p>

          <div className="wallet-receipt-details-card">
            <div className="receipt-detail-row">
              <span>Status</span>
              <strong className="receipt-status-completed">
                {String(receipt.status || 'completed').toUpperCase()} (SIMULATED)
              </strong>
            </div>

            <div className="receipt-detail-row">
              <span>From</span>
              <strong>
                {receipt.senderName}
                {receipt.senderHandle && !isTopUp ? ` (@${receipt.senderHandle})` : ''}
              </strong>
            </div>

            <div className="receipt-detail-row">
              <span>To</span>
              <strong>
                {receipt.receiverName}
                {receipt.receiverHandle ? ` (@${receipt.receiverHandle})` : ''}
              </strong>
            </div>

            <div className="receipt-detail-row">
              <span>Date &amp; Time</span>
              <strong>
                {receipt.createdAt
                  ? new Date(receipt.createdAt).toLocaleString('en-MY', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : 'Just now'}
              </strong>
            </div>

            <div className="receipt-detail-row">
              <span>Reference Code</span>
              <button
                type="button"
                className="receipt-ref-copy-btn"
                onClick={handleCopyRef}
                title="Copy reference code"
              >
                <code>{receipt.referenceCode || receipt.id}</code>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            <div className="receipt-detail-row">
              <span>Idempotency Key</span>
              <code className="receipt-idem-code">{receipt.idempotencyKey || 'verified'}</code>
            </div>
          </div>

          <div className="wallet-receipt-simulation-disclaimer">
            Simulated transaction for KampusKash demonstration only. No real money or bank account was debited.
          </div>
        </div>

        <div className="community-modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

