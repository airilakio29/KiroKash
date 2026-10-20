import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { validateBudget } from '../services/budgetService';
import { X, Loader2 } from 'lucide-react';

export default function BudgetModal({ isOpen, onClose, initialData = null }) {
  const { categories, budgets, upsertBudget } = useFinance();
  const { showSuccess, showError } = useToast();

  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.categoryId || '');
      setLimit(initialData.monthlyLimit !== undefined ? String(initialData.monthlyLimit) : '');
    } else {
      setCategoryId('');
      setLimit('');
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validateBudget({ categoryId, monthlyLimit: limit });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      upsertBudget(categoryId, Number(limit));
      const cat = categories.find(c => c.id === categoryId);
      showSuccess(`Budget limit of RM ${Number(limit).toFixed(2)} set for ${cat?.name || 'Category'}`);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save budget');
      showError(err?.message || 'Failed to save budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 id="budget-modal-title" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {initialData ? 'Edit Category Budget' : 'Set Monthly Budget Limit'}
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
            <label className="form-label" htmlFor="budget-category">Expense Category</label>
            <select
              id="budget-category"
              className="form-control"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={Boolean(initialData)}
            >
              <option value="">Select Category...</option>
              {expenseCategories.map(cat => {
                const existing = budgets.find(b => b.categoryId === cat.id);
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {existing && (!initialData || initialData.categoryId !== cat.id) ? `(Current: RM ${existing.monthlyLimit})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="budget-limit">Monthly Limit (RM)</label>
            <input
              id="budget-limit"
              type="number"
              step="10"
              min="1"
              required
              className="form-control"
              placeholder="e.g. 300"
              value={limit}
              onChange={e => setLimit(e.target.value)}
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
                initialData ? 'Update Budget' : 'Set Budget'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
