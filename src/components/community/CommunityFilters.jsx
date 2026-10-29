import React from 'react';
import {
  Search,
  X,
  ArrowUpDown,
  MapPin,
  Compass,
  Users,
  Bookmark,
  Navigation
} from 'lucide-react';
import { CAMPUS_OPTIONS, COMMUNITY_TAGS } from '../../services/communityService';
import { SPOT_CATEGORIES, SPOT_BUDGET_TAGS } from '../../config/appConstants';
import TagIcon from './TagIcon';

const BUDGET_SEGMENT_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'under-rm5', label: '≤ RM 5' },
  { id: 'rm5-15', label: 'RM 5–15' },
  { id: 'rm15-30', label: 'RM 15–30' },
  { id: 'rm30-plus', label: 'RM 30+' }
];

export default function CommunityFilters({
  feedTab = 'explore',
  onFeedTabChange,
  category = 'all',
  onCategoryChange,
  budgetTag = 'all',
  onBudgetTagChange,
  campus = 'all',
  onCampusChange,
  searchQuery = '',
  onSearchChange,
  maxPrice = null,
  onMaxPriceChange,
  selectedTags = [],
  onToggleTag,
  sortBy = 'newest',
  onSortChange,
  locationStatus = 'idle',
  locationMessage = '',
  followingCount = 0,
  savedCount = 0,
  onResetFilters,
  totalCount = 0
}) {
  const hasActiveFilters =
    campus !== 'all' ||
    category !== 'all' ||
    budgetTag !== 'all' ||
    searchQuery.trim() !== '' ||
    maxPrice !== null ||
    selectedTags.length > 0;

  const handleClearAll = () => {
    if (onResetFilters) {
      onResetFilters();
      return;
    }
    if (onCampusChange) onCampusChange('all');
    if (onCategoryChange) onCategoryChange('all');
    if (onBudgetTagChange) onBudgetTagChange('all');
    if (onSearchChange) onSearchChange('');
    if (onMaxPriceChange) onMaxPriceChange(null);
    selectedTags.forEach((tag) => onToggleTag && onToggleTag(tag));
  };

  const activeCampusObj = CAMPUS_OPTIONS.find((c) => c.id === campus);
  const activeCategoryObj = SPOT_CATEGORIES.find((c) => c.id === category);

  return (
    <div className="community-filters-card">
      {/* Row 1: Unified Search & Filter Command Bar (6c4f2e9 style + Explore/Following segmented switch) */}
      <div className="community-filters-top">
        {onFeedTabChange && (
          <div className="budget-segmented-control" role="tablist" aria-label="Suapan Spot Jimat">
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'explore'}
              className={`budget-segment-btn ${feedTab === 'explore' ? 'active' : ''}`}
              onClick={() => onFeedTabChange('explore')}
            >
              <Compass size={12} style={{ marginRight: 4, verticalAlign: '-1px' }} />
              Explore
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'following'}
              className={`budget-segment-btn ${feedTab === 'following' ? 'active' : ''}`}
              onClick={() => onFeedTabChange('following')}
            >
              <Users size={12} style={{ marginRight: 4, verticalAlign: '-1px' }} />
              Following{followingCount > 0 ? ` (${followingCount})` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'saved'}
              className={`budget-segment-btn ${feedTab === 'saved' ? 'active' : ''}`}
              onClick={() => onFeedTabChange('saved')}
            >
              <Bookmark size={12} style={{ marginRight: 4, verticalAlign: '-1px' }} />
              Disimpan{savedCount > 0 ? ` (${savedCount})` : ''}
            </button>
          </div>
        )}

        <div className="community-search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="community-search-input"
            placeholder="Cari kedai, spot jimat, kategori, @username..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="community-search-clear-btn"
              onClick={() => onSearchChange && onSearchChange('')}
              aria-label="Kosongkan carian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="community-dropdowns-group">
          {/* Campus Selector */}
          <div className="community-select-wrapper">
            <MapPin size={14} className="select-icon" />
            <select
              id="campus-select"
              className="community-select campus-select"
              value={campus}
              onChange={(e) => onCampusChange && onCampusChange(e.target.value)}
              aria-label="Pilih Kampus"
            >
              {CAMPUS_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="community-select-wrapper">
            <ArrowUpDown size={14} className="select-icon" />
            <select
              id="sort-select"
              className="community-select sort-select"
              value={sortBy}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              aria-label="Susunan ulasan"
            >
              <option value="trending">Trending Minggu Ini</option>
              <option value="newest">Terkini</option>
              <option value="nearest">
                {locationStatus === 'requesting' ? 'Mencari Lokasi...' : 'Terdekat (Nearest)'}
              </option>
              <option value="top">Paling Popular</option>
              <option value="cheapest">Paling Murah</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Broader Categories in old .community-tag-chip style + Budget Segmented Control */}
      <div className="community-controls-subrow">
        {/* Budget Segmented Control */}
        <div className="budget-segmented-control" role="group" aria-label="Tapisan Bajet">
          {BUDGET_SEGMENT_OPTIONS.map((b) => {
            const isActive = budgetTag === b.id;
            return (
              <button
                key={b.id}
                type="button"
                className={`budget-segment-btn ${isActive ? 'active' : ''}`}
                onClick={() => onBudgetTagChange && onBudgetTagChange(b.id)}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        <div className="filter-divider-dot" aria-hidden="true" />

        {/* 6 Broader Categories in the exact old .community-tag-chip filter style */}
        <div className="community-tags-scroll-row no-scrollbar" role="group" aria-label="Kategori Spot Jimat">
          <button
            type="button"
            className={`community-tag-chip ${category === 'all' ? 'selected' : ''}`}
            onClick={() => onCategoryChange && onCategoryChange('all')}
          >
            <TagIcon iconName="Sparkles" size={12} className="tag-chip-icon" />
            <span className="tag-chip-label">Semua Kategori</span>
          </button>
          {SPOT_CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`community-tag-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onCategoryChange && onCategoryChange(isSelected ? 'all' : cat.id)}
                title={cat.description}
              >
                <TagIcon tagId={cat.id} iconName={cat.iconName} size={12} className="tag-chip-icon" />
                <span className="tag-chip-label">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2b: Micro-Icon Feature Tags (Halal, Diskaun Pelajar, Buka Lewat, Wi-Fi, etc.) */}
      <div className="community-controls-subrow">
        <div className="community-tags-scroll-row no-scrollbar">
          {COMMUNITY_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={`community-tag-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggleTag && onToggleTag(tag.id)}
              >
                <TagIcon tagId={tag.id} iconName={tag.iconName} size={12} className="tag-chip-icon" />
                <span className="tag-chip-label">{tag.label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="community-reset-filters-btn"
            onClick={handleClearAll}
          >
            Reset
          </button>
        )}
      </div>

      {/* Row 3: Subtle Results Bar */}
      <div className="community-results-count-bar">
        <span>
          Menjumpai <strong>{totalCount}</strong> spot jimat pelajar
          {locationMessage ? ` • ${locationMessage}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {activeCategoryObj && (
            <span className="active-campus-badge">{activeCategoryObj.label}</span>
          )}
          {campus !== 'all' && activeCampusObj && (
            <span className="active-campus-badge">
              {activeCampusObj.label.split('(')[0].trim()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
