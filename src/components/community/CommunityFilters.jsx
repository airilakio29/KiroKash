import React from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Flame,
  Clock,
  Navigation,
  X,
  Compass,
  Users,
  Bookmark,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { CAMPUS_AREAS } from '../../services/communityService';
import { SPOT_CATEGORIES, SPOT_BUDGET_TAGS } from '../../config/appConstants';
import TagIcon from './TagIcon';

export default function CommunityFilters({
  feedTab = 'explore',
  onFeedTabChange,
  category = 'all',
  onCategoryChange,
  budgetTag = 'all',
  onBudgetTagChange,
  studentPriceOnly = false,
  onStudentPriceOnlyChange,
  searchQuery = '',
  onSearchChange,
  campusArea = 'All Campuses',
  onCampusChange,
  selectedTags = [],
  onToggleTag,
  sortBy = 'trending',
  onSortChange,
  locationStatus = 'idle', // 'idle' | 'requesting' | 'granted' | 'denied'
  locationMessage = '',
  followingCount = 0,
  savedCount = 0,
  onResetFilters,
  totalCount = 0
}) {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    category !== 'all' ||
    budgetTag !== 'all' ||
    studentPriceOnly ||
    campusArea !== 'All Campuses' ||
    selectedTags.length > 0;

  return (
    <div className="community-filters-panel card">
      {/* Row 1: Feed Tabs (Explore / Following / Saved) + Sort Controls */}
      <div className="spot-feed-tabs-row">
        <div className="spot-feed-tabs" role="tablist" aria-label="Spot Jimat feed tabs">
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === 'explore'}
            className={`spot-feed-tab-btn ${feedTab === 'explore' ? 'active' : ''}`}
            onClick={() => onFeedTabChange && onFeedTabChange('explore')}
          >
            <Compass size={15} />
            <span>Explore</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === 'following'}
            className={`spot-feed-tab-btn ${feedTab === 'following' ? 'active' : ''}`}
            onClick={() => onFeedTabChange && onFeedTabChange('following')}
          >
            <Users size={15} />
            <span>Following</span>
            {followingCount > 0 && <span className="spot-tab-pill">{followingCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === 'saved'}
            className={`spot-feed-tab-btn ${feedTab === 'saved' ? 'active' : ''}`}
            onClick={() => onFeedTabChange && onFeedTabChange('saved')}
          >
            <Bookmark size={15} />
            <span>Saved</span>
            {savedCount > 0 && <span className="spot-tab-pill">{savedCount}</span>}
          </button>
        </div>

        <div className="community-sort-tabs" role="group" aria-label="Sort spots">
          <button
            type="button"
            className={`community-sort-btn ${sortBy === 'trending' || sortBy === 'helpful' ? 'active' : ''}`}
            onClick={() => onSortChange('trending')}
          >
            <Flame size={14} />
            <span>Trending this week</span>
          </button>
          <button
            type="button"
            className={`community-sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => onSortChange('newest')}
          >
            <Clock size={14} />
            <span>Newest</span>
          </button>
          <button
            type="button"
            className={`community-sort-btn ${sortBy === 'nearest' ? 'active' : ''}`}
            onClick={() => onSortChange('nearest')}
          >
            <Navigation size={14} />
            <span>{locationStatus === 'requesting' ? 'Locating...' : 'Nearest'}</span>
          </button>
        </div>
      </div>

      {/* Geolocation fallback or status notice */}
      {locationMessage && (
        <div className={`spot-location-banner ${locationStatus === 'denied' ? 'warning' : 'info'}`}>
          <AlertCircle size={15} />
          <span>{locationMessage}</span>
        </div>
      )}

      {/* Row 2: Category Filter Chip Row */}
      <div className="spot-category-chips-row" role="group" aria-label="Spot categories">
        <button
          type="button"
          className={`spot-category-chip ${category === 'all' ? 'active' : ''}`}
          onClick={() => onCategoryChange && onCategoryChange('all')}
        >
          <TagIcon iconName="Sparkles" size={14} />
          <span>All Spots</span>
        </button>
        {SPOT_CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`spot-category-chip ${isActive ? 'active' : ''}`}
              onClick={() => onCategoryChange && onCategoryChange(cat.id)}
              title={cat.description}
            >
              <TagIcon iconName={cat.icon} size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Row 3: Search + Campus Area Selector */}
      <div className="community-filters-top">
        <div className="community-search-box">
          <Search size={17} className="community-search-icon" />
          <input
            type="text"
            className="community-search-input"
            placeholder="Search spots, places, tips, @username, or campus area..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search student spots"
          />
          {searchQuery && (
            <button
              type="button"
              className="community-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="community-controls-row">
          <div className="community-campus-select-wrap">
            <MapPin size={15} className="community-select-icon" />
            <select
              className="community-campus-select"
              value={campusArea}
              onChange={(e) => onCampusChange(e.target.value)}
              aria-label="Filter by campus area"
            >
              {CAMPUS_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 4: Budget Filter & Student Price Toggle */}
      <div className="community-tags-filter-row">
        <div className="community-tags-label">
          <SlidersHorizontal size={13} />
          <span>Budget:</span>
        </div>
        <div className="community-tags-scroll">
          <button
            type="button"
            className={`community-filter-chip ${budgetTag === 'all' ? 'selected' : ''}`}
            onClick={() => onBudgetTagChange && onBudgetTagChange('all')}
          >
            <span>All Budgets</span>
          </button>
          {SPOT_BUDGET_TAGS.map((b) => {
            const isSelected = budgetTag === b.id;
            return (
              <button
                key={b.id}
                type="button"
                className={`community-filter-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onBudgetTagChange && onBudgetTagChange(isSelected ? 'all' : b.id)}
              >
                <span>{b.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            className={`community-filter-chip student-price-chip ${studentPriceOnly ? 'selected' : ''}`}
            onClick={() => onStudentPriceOnlyChange && onStudentPriceOnlyChange(!studentPriceOnly)}
          >
            <GraduationCap size={13} />
            <span>Student Price Only</span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="community-reset-btn"
            onClick={onResetFilters}
          >
            <X size={13} />
            <span>Clear filters ({totalCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
