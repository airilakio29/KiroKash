import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { filterTransactions } from '../services/transactionService';
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
  X
} from 'lucide-react';

export default function TransactionsView({ onOpenAddTransaction, onEditTransaction }) {
  const { transactions, categories, accounts, deleteTransaction, exportToPDF } = useFinance();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Build a category name map for search
  const categoryNameMap = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Filtering with service layer
  const filtered = useMemo(() => filterTransactions(transactions, {
    search: searchTerm,
    type: selectedType,
    categoryId: selectedCategory,
    accountId: selectedAccount,
    dateFrom,
    dateTo,
    _categoryNameMap: categoryNameMap
  }), [transactions, searchTerm, selectedType, selectedCategory, selectedAccount, dateFrom, dateTo, categoryNameMap]);

  const hasActiveFilters = selectedCategory || selectedType !== 'all' || selectedAccount || dateFrom || dateTo;

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedType('all');
    setSelectedAccount('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  return (
    <div className="view-fade-in">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {/* Header Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.25rem', fontWeight: 700 }}>
              Transaction Records
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filtered.length} of {transactions.length} entries
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => exportToPDF(user)} className="btn btn-secondary" aria-label="Export PDF">
              <FileText size={16} /> Export PDF
            </button>
            <button data-tour="transactions-add-btn" onClick={onOpenAddTransaction} className="btn btn-primary">
              <PlusCircle size={16} /> + Add Transaction
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: showFilters ? '0.85rem' : '0',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 'min(100%, 150px)' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search title, note, or category..."
              className="form-control"
              style={{ paddingLeft: '2.5rem', height: '40px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search transactions"
            />
          </div>

          {/* Type Quick Filter */}
          <select
            className="form-control"
            style={{ height: '40px', width: 'auto', minWidth: '120px', flex: '0 1 auto' }}
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters || hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '40px', padding: '0 0.85rem' }}
            aria-label="Toggle filters"
          >
            <Filter size={16} />
            {hasActiveFilters && <span style={{ fontSize: '0.75rem' }}>Active</span>}
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-secondary" style={{ height: '40px', padding: '0 0.65rem' }} aria-label="Clear filters">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem'
          }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
              <select
                className="form-control"
                style={{ height: '38px' }}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Account</label>
              <select
                className="form-control"
                style={{ height: '38px' }}
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
              >
                <option value="">All Accounts</option>
                <option value="__unassigned">Unassigned / Legacy</option>
                {accounts.map(a => (
                  <option key={a.accountId} value={a.accountId}>{a.accountName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
              <input
                type="date"
                className="form-control"
                style={{ height: '38px' }}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
              <input
                type="date"
                className="form-control"
                style={{ height: '38px' }}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Transaction List */}
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No transactions found.</p>
            <span style={{ fontSize: '0.85rem' }}>
              {hasActiveFilters || searchTerm
                ? 'Try clearing your search query or filters.'
                : 'Click "+ Add Transaction" to log your first income or expense.'}
            </span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-container desktop-table">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title & Notes</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount (RM)</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const acc = accounts.find(a => a.accountId === t.accountId);
                    const isIncome = t.type === 'income';
                    return (
                      <tr key={t.id}>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {t.date}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{t.title}</span>
                            {t.isDemo && (
                              <span style={{
                                fontSize: '0.62rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '3px',
                                background: 'rgba(167, 139, 250, 0.2)',
                                color: '#C084FC',
                                fontWeight: 700
                              }}>
                                Sample
                              </span>
                            )}
                            {t.isRecurring && (
                              <span className="badge badge-recurring" title="Recurring Monthly">
                                <Repeat size={12} /> Recurring
                              </span>
                            )}
                          </div>
                          {t.note && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
                              {t.note}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: `${cat ? cat.color : '#94A3B8'}20`,
                              color: cat ? cat.color : '#475569'
                            }}
                          >
                            {cat ? cat.name : 'Uncategorized'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {acc ? acc.accountName : (t.accountId ? 'Deleted' : '—')}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
                            {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {t.type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: isIncome ? 'var(--income)' : 'var(--expense)' }}>
                          {isIncome ? '+' : '-'} RM {Number(t.amount).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => onEditTransaction(t)}
                              className="btn btn-secondary btn-icon"
                              style={{ width: '32px', height: '32px' }}
                              title="Edit"
                              aria-label={`Edit ${t.title}`}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete transaction "${t.title}"?`)) {
                                  deleteTransaction(t.id);
                                }
                              }}
                              className="btn btn-danger btn-icon"
                              style={{ width: '32px', height: '32px' }}
                              title="Delete"
                              aria-label={`Delete ${t.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="mobile-tx-list">
              {filtered.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const acc = accounts.find(a => a.accountId === t.accountId);
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span>{t.title}</span>
                        {t.isDemo && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            background: 'rgba(167, 139, 250, 0.2)',
                            color: '#C084FC',
                            fontWeight: 700
                          }}>
                            Sample
                          </span>
                        )}
                        {t.isRecurring && <Repeat size={12} color="var(--primary)" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {t.date} · {cat ? cat.name : 'Uncategorized'}
                        {acc ? ` · ${acc.accountName}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: isIncome ? 'var(--income)' : 'var(--expense)', fontSize: '0.95rem' }}>
                        {isIncome ? '+' : '-'}RM {Number(t.amount).toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onEditTransaction(t)}
                          className="btn btn-secondary btn-icon mobile-action-btn"
                          aria-label={`Edit ${t.title}`}
                          title="Edit transaction"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${t.title}"?`)) deleteTransaction(t.id);
                          }}
                          className="btn btn-danger btn-icon mobile-action-btn"
                          aria-label={`Delete ${t.title}`}
                          title="Delete transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .desktop-table { display: block; }
        .mobile-tx-list { display: none; }
        @media (max-width: 768px) {
          .desktop-table { display: none; }
          .mobile-tx-list { display: block; }
          .mobile-action-btn {
            min-width: 44px !important;
            min-height: 44px !important;
          }
        }
      `}</style>
    </div>
  );
}
