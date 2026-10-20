import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { X, Repeat, Loader2 } from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, initialData = null }) {
  const { categories, accounts, addTransaction, updateTransaction } = useFinance();
  const { showSuccess, showError } = useToast();

  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'expense');
      setTitle(initialData.title || '');
      setAmount(initialData.amount != null ? String(initialData.amount) : '');
      setCategoryId(initialData.categoryId || '');
      setAccountId(initialData.accountId || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setIsRecurring(Boolean(initialData.isRecurring));
      setNote(initialData.note || '');
    } else {
      setType('expense');
      setTitle('');
      setAmount('');
      setCategoryId('');
      setAccountId('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setNote('');
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    setError('');

    if (!title.trim()) {
      setError('Please enter a transaction title');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || isNaN(numAmount) || !isFinite(numAmount)) {
      setError('Please enter a valid amount greater than RM 0');
      return;
    }
    const selectedCatId = categoryId || (filteredCategories[0] ? filteredCategories[0].id : '');
    if (!selectedCatId) {
      setError('Please select a category');
      return;
    }
    if (!date) {
      setError('Please select a date');
      return;
    }

    const payload = {
      type,
      title: title.trim(),
      amount: numAmount,
      categoryId: selectedCatId,
      accountId: accountId || null,
      date,
      source: 'manual',
      isRecurring,
      note: note.trim()
    };

    setIsSubmitting(true);

    try {
      if (initialData && initialData.id) {
        updateTransaction(initialData.id, payload);
        showSuccess(`Transaction "${payload.title}" updated successfully`);
      } else {
        addTransaction(payload);
        showSuccess(`Transaction "${payload.title}" added successfully`);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save transaction');
      showError(err?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="tx-modal-title">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 id="tx-modal-title" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {initialData && initialData.id ? 'Edit Transaction' : 'Add New Transaction'}
          </h3>
          <button onClick={onClose} className="btn btn-secondary btn-icon" aria-label="Close" type="button">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--expense-bg)',
            color: 'var(--expense)',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Income / Expense Toggle */}
          <div data-tour="transaction-type" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => {
                setType('expense');
                setCategoryId('');
              }}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => {
                setType('income');
                setCategoryId('');
              }}
            >
              Income
            </button>
          </div>

          {/* Amount Input with RM prefix */}
          <div className="form-group">
            <label className="form-label">Amount (RM)</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontWeight: 700,
                color: 'var(--primary)'
              }}>
                RM
              </span>
              <input
                data-tour="transaction-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-control"
                style={{ paddingLeft: '3.2rem', fontSize: '1.1rem', fontWeight: 700 }}
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Title Input */}
          <div className="form-group">
            <label className="form-label">Title / Description</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Cafeteria Lunch, PTPTN Loan"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Category Dropdown */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              data-tour="transaction-category"
              className="form-control"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">Select Category...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Dropdown */}
          <div className="form-group">
            <label className="form-label">Account (Optional)</label>
            <select
              data-tour="transaction-account"
              className="form-control"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
            >
              <option value="">No Account (Unassigned)</option>
              {accounts.map(acc => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.accountName}{acc.institution ? ` — ${acc.institution}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              required
              className="form-control"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Note Input */}
          <div className="form-group">
            <label className="form-label">Optional Note</label>
            <input
              type="text"
              className="form-control"
              placeholder="Add details, receipt reference..."
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Recurring Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="isRecurring" style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Repeat size={14} color="var(--primary)" /> Recurring monthly expense / income
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              data-tour="transaction-save"
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
                initialData ? 'Save Changes' : 'Add Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
