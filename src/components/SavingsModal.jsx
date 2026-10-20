import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { validateSavingsGoal } from '../services/savingsService';
import { X, Loader2 } from 'lucide-react';

export default function SavingsModal({ isOpen, onClose, mode = 'create', goalId = null, initialData = null }) {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, depositToSavingsGoal } = useFinance();
  const { showSuccess, showError } = useToast();

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGoal = goalId ? savingsGoals.find(g => g.id === goalId) : initialData;

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && selectedGoal) {
      setTitle(selectedGoal.title || '');
      setTargetAmount(selectedGoal.targetAmount !== undefined ? String(selectedGoal.targetAmount) : '');
      setCurrentAmount(selectedGoal.currentAmount !== undefined ? String(selectedGoal.currentAmount) : '');
      setTargetDate(selectedGoal.targetDate || '');
    } else if (mode === 'create') {
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setTargetDate(new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);
    } else if (mode === 'deposit') {
      setDepositAmount('');
    }
    setError('');
    setIsSubmitting(false);
  }, [isOpen, mode, selectedGoal]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (mode === 'deposit') {
      const dep = Number(depositAmount);
      if (!depositAmount || isNaN(dep) || dep <= 0) {
        setError('Please enter a valid deposit amount greater than RM 0');
        return;
      }
      setIsSubmitting(true);
      try {
        depositToSavingsGoal(goalId || selectedGoal?.id, dep);
        showSuccess(`Deposited RM ${dep.toFixed(2)} to ${selectedGoal?.title || 'Goal'}`);
        onClose();
      } catch (err) {
        setError(err?.message || 'Failed to deposit to savings goal');
        showError(err?.message || 'Failed to deposit to savings goal');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'edit') {
      const goalPayload = {
        title: title.trim(),
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate: targetDate || ''
      };
      const validationError = validateSavingsGoal(goalPayload);
      if (validationError) {
        setError(validationError);
        return;
      }
      setIsSubmitting(true);
      try {
        updateSavingsGoal(goalId || selectedGoal?.id, goalPayload);
        showSuccess(`Savings goal "${goalPayload.title}" updated`);
        onClose();
      } catch (err) {
        setError(err?.message || 'Failed to update goal');
        showError(err?.message || 'Failed to update goal');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Create mode validation
    const newGoalPayload = {
      title: title.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount || 0),
      targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
    };

    const validationError = validateSavingsGoal(newGoalPayload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      addSavingsGoal(newGoalPayload);
      showSuccess(`Created savings goal "${newGoalPayload.title}"! 🎯`);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create goal');
      showError(err?.message || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="savings-modal-title">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 id="savings-modal-title" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {mode === 'deposit' ? `Deposit to "${selectedGoal?.title}"` : mode === 'edit' ? 'Edit Savings Goal' : 'Create New Savings Goal'}
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
          {mode === 'deposit' ? (
            <div className="form-group">
              <label className="form-label" htmlFor="deposit-amount">Deposit Amount (RM)</label>
              <input
                id="deposit-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-control"
                placeholder="0.00"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="savings-title">Goal Name</label>
                <input
                  id="savings-title"
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. M2 MacBook Air, Semester 3 Tuition"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="savings-target">Target Amount (RM)</label>
                <input
                  id="savings-target"
                  type="number"
                  step="10"
                  min="1"
                  required
                  className="form-control"
                  placeholder="e.g. 4000"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="savings-initial">Currently Saved (RM)</label>
                <input
                  id="savings-initial"
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={currentAmount}
                  onChange={e => setCurrentAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="savings-target-date">Target Date (Optional)</label>
                <input
                  id="savings-target-date"
                  type="date"
                  className="form-control"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                />
              </div>
            </>
          )}

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
                mode === 'deposit' ? 'Confirm Deposit' : mode === 'edit' ? 'Update Goal' : 'Create Goal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
