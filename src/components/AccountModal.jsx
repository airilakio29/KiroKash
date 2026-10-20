import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { ACCOUNT_TYPES, validateAccount } from '../services/accountService';
import { X, Loader2 } from 'lucide-react';

export default function AccountModal({ isOpen, onClose, initialData = null }) {
  const { addAccount, updateAccount } = useFinance();
  const { showSuccess, showError } = useToast();

  const [accountName, setAccountName] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountType, setAccountType] = useState('savings');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setAccountName(initialData.accountName || '');
      setInstitution(initialData.institution || '');
      setAccountType(initialData.accountType || 'savings');
      setBalance(initialData.balance != null ? String(initialData.balance) : '');
    } else {
      setAccountName('');
      setInstitution('');
      setAccountType('savings');
      setBalance('');
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');

    const accountData = {
      accountName: accountName.trim(),
      institution: institution.trim(),
      accountType,
      balance: Number(balance) || 0
    };

    const validationError = validateAccount(accountData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialData) {
        updateAccount(initialData.accountId, accountData);
        showSuccess(`Account "${accountData.accountName}" updated`);
      } else {
        addAccount(accountData);
        showSuccess(`Account "${accountData.accountName}" added successfully`);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save account');
      showError(err?.message || 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 id="account-modal-title" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {initialData ? 'Edit Account' : 'Add New Account / eWallet'}
          </h3>
          <button onClick={onClose} className="btn btn-secondary btn-icon" aria-label="Close modal" type="button">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--expense-bg)', color: 'var(--expense)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="account-name">Account Name</label>
            <input
              id="account-name"
              type="text"
              required
              className="form-control"
              placeholder="e.g. Maybank Savings, Touch 'n Go, Cash"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="account-institution">Bank / Provider (Optional)</label>
            <input
              id="account-institution"
              type="text"
              className="form-control"
              placeholder="e.g. Maybank, CIMB, TNG Digital"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="account-type">Account Type</label>
            <select
              id="account-type"
              className="form-control"
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
            >
              {ACCOUNT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="account-balance">Initial Balance (RM)</label>
            <input
              id="account-balance"
              type="number"
              step="0.01"
              required
              className="form-control"
              placeholder="0.00"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" /> Saving...
                </>
              ) : (
                initialData ? 'Save Changes' : 'Add Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
