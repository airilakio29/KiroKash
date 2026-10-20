import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_ICONS } from '../services/accountService';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { AccountsSkeleton } from '../components/Skeleton';
import {
  PlusCircle,
  Trash2,
  Edit3,
  Landmark
} from 'lucide-react';

export default function AccountsView({ onOpenAddAccount, onEditAccount }) {
  const { accounts, deleteAccount, totalAccountBalance, isLoading } = useFinance();
  const { showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700 }}>
              My Accounts
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage your bank accounts, e-wallets, and cash reserves.
            </p>
          </div>

          <button data-tour="accounts-add-btn" onClick={onOpenAddAccount} className="btn btn-primary">
            <PlusCircle size={16} /> + Add Account
          </button>
        </div>
      </div>

      {/* Total Balance Summary */}
      {accounts.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Total Account Balance
          </div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: '2rem',
            fontWeight: 800,
            color: totalAccountBalance >= 0 ? 'var(--text-main)' : 'var(--expense)'
          }}>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '1.25rem'
        }}>
          {accounts.map(account => {
            const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.accountType);
            const icon = ACCOUNT_TYPE_ICONS[account.accountType] || '📋';

            return (
              <div key={account.accountId} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {account.accountName}
                        </span>
                        {account.isDemo && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '3px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#FBBF24',
                            fontWeight: 700
                          }}>
                            Sample
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {account.institution || typeInfo?.label || 'Account'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
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
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balance</span>
                  <span style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: account.balance >= 0 ? 'var(--text-main)' : 'var(--expense)'
                  }}>
                    RM {Number(account.balance).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
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
