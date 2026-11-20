import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocialWallet } from '../context/SocialWalletContext';
import { filterTransactions } from '../services/transactionService';
import { formatRM } from '../utils/formatCurrency';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { TransactionsSkeleton } from '../components/Skeleton';
import {
  Search,
  PlusCircle,
  FileText,
  Trash2,
  Edit3,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  ReceiptText,
  Wallet
} from 'lucide-react';

function getDateGroupLabel(dateStr) {
  if (!dateStr) return 'Other';
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const parsed = new Date(`${dateStr}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: parsed.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
  return dateStr;
}

export default function TransactionsView({ onOpenAddTransaction, onEditTransaction }) {
  const { transactions, categories, accounts, deleteTransaction, exportToPDF, isLoading } = useFinance();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const { openWalletReceiptById } = useSocialWallet();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const categoryNameMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const filtered = useMemo(
    () =>
      filterTransactions(transactions, {
        search: searchTerm,
        type: selectedType,
        categoryId: selectedCategory,
        accountId: selectedAccount,
        dateFrom,
        dateTo,
        _categoryNameMap: categoryNameMap
      }),
    [transactions, searchTerm, selectedType, selectedCategory, selectedAccount, dateFrom, dateTo, categoryNameMap]
  );

  // Group filtered transactions by date ("Today", "Yesterday", formatted date)
  const groupedTransactions = useMemo(() => {
    const groups = [];
    const map = new Map();
    for (const tx of filtered) {
      const key = tx.date || 'Other';
      if (!map.has(key)) {
        const group = { dateKey: key, label: getDateGroupLabel(key), items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).items.push(tx);
    }
    return groups;
  }, [filtered]);

  const hasActiveFilters = Boolean(selectedCategory || selectedType !== 'all' || selectedAccount || dateFrom || dateTo);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedType('all');
    setSelectedAccount('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteTransaction(deleteTarget.id);
    showSuccess(`Deleted transaction "${deleteTarget.title}"`);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="view-fade-in">
      {/* Compact Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          Transactions
        </h2>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => exportToPDF(user)}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: '44px' }}
            aria-label="Export PDF"
          >
            <FileText size={15} /> PDF
          </button>
          <button
            type="button"
            data-tour="transactions-add-btn"
            onClick={onOpenAddTransaction}
            className="btn btn-primary btn-sm"
            style={{ minHeight: '44px' }}
          >
            <PlusCircle size={15} /> Add
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="card" style={{ padding: '0.85rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search transactions..."
              className="form-control"
              style={{ paddingLeft: '2.25rem', minHeight: '44px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`btn btn-sm ${hasActiveFilters || showFilters ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Filter size={14} />
            <span>Filter{hasActiveFilters ? ' •' : ''}</span>
          </button>

          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm" style={{ minHeight: '44px' }}>
              Clear
            </button>
          )}
        </div>

        {/* Type Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }}>
          {['all', 'expense', 'income'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`btn btn-sm ${selectedType === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: 1,
                minHeight: '38px',
                textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.65rem',
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-light)'
            }}
          >
            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>Category</label>
              <select
                className="form-control"
                style={{ minHeight: '40px' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>Account</label>
              <select
                className="form-control"
                style={{ minHeight: '40px' }}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>{a.accountName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>From</label>
              <input
                type="date"
                className="form-control"
                style={{ minHeight: '40px' }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>To</label>
              <input
                type="date"
                className="form-control"
                style={{ minHeight: '40px' }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouped Transaction List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={hasActiveFilters || searchTerm ? 'No matching transactions' : 'No transactions yet'}
          description={
            hasActiveFilters || searchTerm
              ? 'Try adjusting or clearing your filters.'
              : 'Add your first income or expense.'
          }
          actionText="Add Transaction"
          onAction={onOpenAddTransaction}
          secondaryActionText={hasActiveFilters || searchTerm ? 'Clear Filters' : null}
          onSecondaryAction={clearFilters}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupedTransactions.map((group) => (
            <section key={group.dateKey}>
              <h3
                style={{
                  margin: '0 0 0.45rem 0.2rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-muted)'
                }}
              >
                {group.label}
              </h3>

              <div className="card" style={{ padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {group.items.map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const isIncome = t.type === 'income';
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.65rem 0.7rem',
                        borderRadius: 'var(--radius-md, 10px)',
                        minHeight: '56px'
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isIncome ? 'var(--income-bg)' : 'var(--expense-bg)',
                          color: isIncome ? 'var(--income)' : 'var(--expense)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isIncome ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                      </div>

                      {/* Name + Subline (Date · Category) */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {t.title}
                            </span>
                            {t.isRecurring && <Repeat size={12} color="var(--primary)" style={{ flexShrink: 0 }} title="Recurring" />}
                          </div>

                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              color: isIncome ? 'var(--income)' : 'var(--expense)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            {isIncome ? '+' : '-'}{formatRM(t.amount)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.date} · {cat ? cat.name : t.category || 'Other'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                            {t.walletReceiptId && openWalletReceiptById && (
                              <button
                                type="button"
                                onClick={() => openWalletReceiptById(t.walletReceiptId)}
                                className="btn btn-secondary btn-icon"
                                style={{ width: '32px', height: '32px' }}
                                title="View Receipt"
                                aria-label="View Wallet Receipt"
                              >
                                <Wallet size={13} />
                              </button>
                            )}
                            {onEditTransaction && (
                              <button
                                type="button"
                                onClick={() => onEditTransaction(t)}
                                className="btn btn-secondary btn-icon"
                                style={{ width: '32px', height: '32px' }}
                                title="Edit"
                                aria-label={`Edit ${t.title}`}
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(t)}
                              className="btn btn-danger btn-icon"
                              style={{ width: '32px', height: '32px' }}
                              title="Delete"
                              aria-label={`Delete ${t.title}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteTarget?.title || 'this transaction'}"?`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
