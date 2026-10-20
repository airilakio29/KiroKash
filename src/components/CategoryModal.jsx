import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { X, Loader2 } from 'lucide-react';

export default function CategoryModal({ isOpen, onClose }) {
  const { addCategory } = useFinance();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [color, setColor] = useState('#10B981');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const colorOptions = [
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', 
    '#F59E0B', '#EF4444', '#14B8A6', '#6366F1'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Please enter a category name');
      return;
    }

    setIsSubmitting(true);
    try {
      addCategory({
        name: name.trim(),
        type,
        color,
        icon: 'Tag'
      });
      showSuccess(`Category "${name.trim()}" created successfully`);
      setName('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create category');
      showError(err?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cat-modal-title">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 id="cat-modal-title" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Add Custom Category
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
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setType('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setType('income')}
            >
              Income
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              placeholder="e.g. Subscriptions, Gaming, Lab Supplies"
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Color Theme</label>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              {colorOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '3px solid var(--text-main)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)'
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
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
                  <Loader2 size={16} className="spin-icon" /> Creating...
                </>
              ) : (
                'Add Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
