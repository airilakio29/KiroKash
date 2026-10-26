import React from 'react';
import { Search, X, ArrowUpDown, SlidersHorizontal, MapPin } from 'lucide-react';
import { CAMPUS_OPTIONS, COMMUNITY_TAGS } from '../../services/communityService';
import TagIcon from './TagIcon';

const BUDGET_PRESETS = [
  { label: 'Semua', value: null },
  { label: '≤ RM 5', value: 5 },
  { label: '≤ RM 10', value: 10 },
  { label: '≤ RM 15', value: 15 }
];

export default function CommunityFilters({
  campus,
  onCampusChange,
  searchQuery,
  onSearchChange,
  maxPrice,
  onMaxPriceChange,
  selectedTags = [],
  onToggleTag,
  sortBy,
  onSortChange,
  totalCount = 0
}) {
  const hasActiveFilters = campus !== 'all' || searchQuery.trim() !== '' || maxPrice !== null || selectedTags.length > 0;

  const handleClearAll = () => {
    onCampusChange('all');
    onSearchChange('');
    onMaxPriceChange(null);
    selectedTags.forEach(tag => onToggleTag(tag));
  };

  return (
    <div className="community-filters-card">
      {/* Row 1: Unified Search & Filter Command Bar */}
      <div className="community-filters-top">
        <div className="community-search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="community-search-input"
            placeholder="Cari kedai, nama makanan, ulasan..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="community-search-clear-btn"
              onClick={() => onSearchChange('')}
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
              onChange={(e) => onCampusChange(e.target.value)}
              aria-label="Pilih Kampus"
            >
              {CAMPUS_OPTIONS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
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
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Susunan ulasan"
            >
              <option value="newest">Terkini</option>
              <option value="top">Paling Popular</option>
              <option value="cheapest">Paling Murah</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Budget Segmented Control + Micro-Icon Tags */}
      <div className="community-controls-subrow">
        {/* Sleek Segmented Budget Control */}
        <div className="budget-segmented-control" role="group" aria-label="Tapisan Bajet">
          {BUDGET_PRESETS.map((p) => {
            const isActive = maxPrice === p.value;
            return (
              <button
                key={p.label}
                type="button"
                className={`budget-segment-btn ${isActive ? 'active' : ''}`}
                onClick={() => onMaxPriceChange(p.value)}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="filter-divider-dot" aria-hidden="true" />

        {/* Micro-Icon Tags (No clumsy scrollbar) */}
        <div className="community-tags-scroll-row no-scrollbar">
          {COMMUNITY_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={`community-tag-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggleTag(tag.id)}
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
        <span>Menjumpai <strong>{totalCount}</strong> port makan bajet</span>
        {campus !== 'all' && (
          <span className="campus-badge-active">
            {CAMPUS_OPTIONS.find(c => c.id === campus)?.label.split('(')[0].trim() || campus}
          </span>
        )}
      </div>
    </div>
  );
}
