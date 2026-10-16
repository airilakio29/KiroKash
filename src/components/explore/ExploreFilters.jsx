import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, RotateCcw, MapPin, Navigation } from 'lucide-react';
import { LOCATION_PRESETS } from '../../config/mapConfig.js';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'Cafe', label: 'Cafes & Brews' },
  { id: 'Study Cafe', label: 'Study Cafes' },
  { id: 'Restaurant', label: 'Restaurants & Dining' },
  { id: 'Bakery', label: 'Bakeries & Pastries' },
  { id: 'Dessert', label: 'Desserts & Ice' },
  { id: 'Fast Food', label: 'Fast Food' },
  { id: 'Groceries', label: 'Convenience & Supermarkets' },
  { id: 'Halal Friendly', label: 'Halal Friendly' }
];

const BUDGET_PRESETS = [
  { id: 'all', label: 'Any Budget' },
  { id: 'under10', label: '< RM 10 (Student Saver)' },
  { id: '10to20', label: 'RM 10 - 20 (Standard)' },
  { id: 'over20', label: '> RM 20 (Treat Day)' }
];

export default function ExploreFilters({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  budgetPreset,
  onBudgetPresetChange,
  hasVoucher,
  onHasVoucherToggle,
  studyFriendly,
  onStudyFriendlyToggle,
  sortBy,
  onSortByChange,
  onResetFilters,
  totalResults,
  currentLocation = LOCATION_PRESETS[0],
  onLocationChange,
  onUseCurrentLocation,
  isLocating = false
}) {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Check if any non-default filter is applied
  const isFiltered =
    Boolean(searchQuery.trim()) ||
    category !== 'all' ||
    budgetPreset !== 'all' ||
    hasVoucher ||
    studyFriendly ||
    sortBy !== 'rating' ||
    currentLocation?.id !== LOCATION_PRESETS[0].id;

  return (
    <div className="explore-filters-card card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Top Search & Location Bar */}
      <div className="explore-filters-top-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Search Box */}
        <div className="explore-search-box" style={{ flex: '1 1 280px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search cafe, bakery, restaurant, street (Old Town, Greentown...)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search merchants"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Location Switcher */}
        <div className="explore-location-switcher" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div className="filter-location-select-wrap" style={{ position: 'relative' }}>
            <MapPin size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-light)', pointerEvents: 'none' }} />
            <select
              className="form-control"
              style={{ paddingLeft: '2rem', minWidth: '190px', height: '42px', fontSize: '0.85rem' }}
              value={currentLocation?.id || 'custom'}
              onChange={(e) => {
                const found = LOCATION_PRESETS.find((p) => p.id === e.target.value);
                if (found && onLocationChange) {
                  onLocationChange(found);
                }
              }}
              aria-label="Select search location"
            >
              {LOCATION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  📍 {p.name}
                </option>
              ))}
              {currentLocation?.id === 'custom' && (
                <option value="custom">📍 Custom / Current Location</option>
              )}
            </select>
          </div>

          {/* GPS Quick Geolocation Button */}
          {onUseCurrentLocation && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '42px', padding: '0 0.85rem' }}
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              title="Use your real device location via browser GPS"
            >
              <Navigation size={14} className={isLocating ? 'spin' : ''} />
              <span className="hide-mobile">{isLocating ? 'Locating...' : 'GPS'}</span>
            </button>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          className="btn btn-secondary mobile-filter-toggle"
          onClick={() => setIsMobilePanelOpen((prev) => !prev)}
          aria-expanded={isMobilePanelOpen}
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {isMobilePanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Main Filter Controls (Desktop visible, mobile collapsible) */}
      <div className={`explore-filters-body ${isMobilePanelOpen ? 'mobile-visible' : ''}`}>
        <div className="filters-grid-row">
          {/* Category Dropdown */}
          <div className="filter-item">
            <label className="filter-label" htmlFor="explore-category-select">
              Category
            </label>
            <select
              id="explore-category-select"
              className="form-control filter-select"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Presets */}
          <div className="filter-item">
            <label className="filter-label" htmlFor="explore-budget-select">
              Budget Range
            </label>
            <select
              id="explore-budget-select"
              className="form-control filter-select"
              value={budgetPreset}
              onChange={(e) => onBudgetPresetChange(e.target.value)}
            >
              {BUDGET_PRESETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-item">
            <label className="filter-label" htmlFor="explore-sort-select">
              Sort By
            </label>
            <select
              id="explore-sort-select"
              className="form-control filter-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
            >
              <option value="rating">Top Rated (★)</option>
              <option value="nearest">Nearest to Location</option>
              <option value="cheapest">Cheapest Listed (Min RM)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Toggle Chips & Results Count */}
        <div className="filters-chips-row">
          <div className="filter-chips-group">
            <button
              type="button"
              className={`filter-chip ${hasVoucher ? 'active' : ''}`}
              onClick={onHasVoucherToggle}
              aria-pressed={hasVoucher}
            >
              🎟️ Verified Partner Deals
            </button>

            <button
              type="button"
              className={`filter-chip ${studyFriendly ? 'active' : ''}`}
              onClick={onStudyFriendlyToggle}
              aria-pressed={studyFriendly}
            >
              💻 Study Friendly (WiFi + Desks)
            </button>
          </div>

          <div className="filter-summary-actions">
            <span className="results-count-text">
              Showing <strong>{totalResults}</strong> {totalResults === 1 ? 'venue' : 'venues'}
            </span>

            {isFiltered && (
              <button
                type="button"
                className="btn btn-secondary btn-sm reset-filters-btn"
                onClick={onResetFilters}
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
