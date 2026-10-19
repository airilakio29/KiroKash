import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_ICONS } from '../services/accountService';
import {
  PlusCircle,
  Trash2,
  Edit3,
  Landmark
} from 'lucide-react';

export default function AccountsView({ onOpenAddAccount, onEditAccount }) {
  const { accounts, deleteAccount, totalAccountBalance } = useFinance();

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
        <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Landmark size={40} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No Accounts Yet
          </h4>
          <p style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Add your first account to start tracking balances across Savings, Current, E-wallet, and Cash.
          </p>
          <button onClick={onOpenAddAccount} className="btn btn-primary">
            + Add Your First Account
          </button>
        </div>
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
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#FBBF24',
                            fontWeight: 700
                          }}>
                            Sample
                          </span>
                        )}
                      </div>
                      {account.institution && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {account.institution}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      onClick={() => onEditAccount(account)}
                      className="btn btn-secondary btn-icon"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                      title="Edit Account"
                      aria-label={`Edit ${account.accountName}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${account.accountName}"? Transactions linked to this account will become unassigned.`)) {
                          deleteAccount(account.accountId);
                        }
                      }}
                      className="btn btn-danger btn-icon"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                      title="Delete Account"
                      aria-label={`Delete ${account.accountName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Current Balance
                  </div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: account.balance >= 0 ? 'var(--text-main)' : 'var(--expense)'
                  }}>
                    RM {Number(account.balance).toFixed(2)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span className="badge" style={{
                    background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                    color: 'var(--primary)',
                    fontSize: '0.72rem'
                  }}>
                    {typeInfo ? typeInfo.label : 'Account'}
                  </span>
                  <span>Source: Manual</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
