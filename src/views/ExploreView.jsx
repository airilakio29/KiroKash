import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { calculateBudgetStatus } from '../services/budgetService';
import {
  getExplorePlaces,
  getVouchers,
  getSavedVoucherIds,
  toggleSaveVoucherId,
  filterAndSortCafes
} from '../services/exploreService';
import ExploreSummaryCards from '../components/explore/ExploreSummaryCards';
import ExploreFilters from '../components/explore/ExploreFilters';
import CafeCard from '../components/explore/CafeCard';
import CafeDetailsModal from '../components/explore/CafeDetailsModal';
import VouchersSection from '../components/explore/VouchersSection';
import MapView from '../components/explore/MapView';
import { USE_STATIC_MAP, DEFAULT_LOCATION } from '../config/mapConfig';
import { MapPin, Sparkles, CheckCircle2, RotateCcw, AlertTriangle, Coffee } from 'lucide-react';

// Lazy load Map component to preserve initial page load performance
const ExploreMap = lazy(() => import('../components/explore/ExploreMap'));

function MapLoadingSkeleton() {
  return (
    <div className="explore-map-skeleton">
      <div className="skeleton-spinner"></div>
      <div className="skeleton-text">Loading OpenStreetMap tiles and venues...</div>
    </div>
  );
}

export default function ExploreView({ onOpenAddTransaction, onNavigateToBudgets, onNavigateToCommunity }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { budgets, categories, transactions } = useFinance();

  // Active Search Location
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION);
  const [isLocating, setIsLocating] = useState(false);

  // Async data states
  const [cafes, setCafes] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [savedVoucherIds, setSavedVoucherIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Selection & Modal States
  const [selectedCafeId, setSelectedCafeId] = useState(null);
  const [detailsModalCafe, setDetailsModalCafe] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [budgetPreset, setBudgetPreset] = useState('all');
  const [hasVoucher, setHasVoucher] = useState(false);
  const [studyFriendly, setStudyFriendly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Fetch real OSM merchants and partner vouchers for active location
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const [loadedCafes, loadedVouchers] = await Promise.all([
          getExplorePlaces({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          }),
          getVouchers()
        ]);
        if (isMounted) {
          setCafes(loadedCafes);
          setVouchers(loadedVouchers);
          if (userId) {
            setSavedVoucherIds(getSavedVoucherIds(userId));
          }
        }
      } catch (err) {
        if (isMounted) {
          setFetchError('Unable to load nearby places. Please try again.');
          console.error('Explore load error', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId, currentLocation, retryCount]);

  const handleRetryLoad = () => {
    setRetryCount((c) => c + 1);
  };

  // GPS Device Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCurrentLocation({
          id: 'custom',
          name: 'My Device Location',
          area: 'Nearby',
          latitude,
          longitude,
          zoom: 15
        });
        showToast('Updated location to your current GPS coordinates 📍');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error', err);
        showToast('Could not access device location. Using default location.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Food Budget Calculation (Requirement 4 & 7.1)
  const foodCategory = useMemo(() => {
    return categories.find((c) =>
      c.name.toLowerCase().includes('food') ||
      c.name.toLowerCase().includes('dining') ||
      c.id === 'cat-6'
    );
  }, [categories]);

  const foodBudget = useMemo(() => {
    if (!foodCategory) return null;
    return budgets.find((b) => b.categoryId === foodCategory.id);
  }, [budgets, foodCategory]);

  const foodBudgetStatus = useMemo(() => {
    if (!foodBudget) {
      return { hasBudget: false, spent: 0, limit: 0, remaining: 0 };
    }
    const status = calculateBudgetStatus(foodBudget, transactions);
    return {
      ...status,
      hasBudget: true
    };
  }, [foodBudget, transactions]);

  // Filtered & Sorted Venues
  const filteredCafes = useMemo(() => {
    return filterAndSortCafes(
      cafes,
      {
        searchQuery,
        category,
        budgetPreset,
        hasVoucher,
        studyFriendly,
        sortBy,
        userLat: currentLocation.latitude,
        userLng: currentLocation.longitude
      },
      vouchers
    );
  }, [cafes, vouchers, searchQuery, category, budgetPreset, hasVoucher, studyFriendly, sortBy, currentLocation]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setBudgetPreset('all');
    setHasVoucher(false);
    setStudyFriendly(false);
    setSortBy('rating');
    setCurrentLocation(DEFAULT_LOCATION);
  };

  // Toggle Save Voucher (Requirement 6.3 & 7)
  const handleToggleSaveVoucher = async (voucherId) => {
    if (!userId) {
      showToast('Please sign in to save vouchers to your wallet.');
      return;
    }
    const updated = await toggleSaveVoucherId(userId, voucherId);
    setSavedVoucherIds(updated);
    if (updated.includes(voucherId)) {
      showToast('Voucher saved to your wallet! ★');
    } else {
      showToast('Voucher removed from saved.');
    }
  };

  // Copy Promo Code Handler (Requirement 6.2)
  const handleCopyCode = async (code) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const el = document.createElement('textarea');
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedCode(code);
      showToast(`Promo code "${code}" copied to clipboard! 📋`);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      showToast(`Code is: ${code}`);
    }
  };

  // Add to Expenses Flow (Requirement 4 & 7.2)
  const handleAddToExpenses = (cafe) => {
    if (!onOpenAddTransaction) return;

    const typicalAmount = cafe.typicalAmount || cafe.minBudget || 10;
    const expenseCatId = foodCategory
      ? foodCategory.id
      : categories.find((c) => c.type === 'expense')?.id || '';

    onOpenAddTransaction({
      title: cafe.name,
      amount: typicalAmount,
      categoryId: expenseCatId,
      type: 'expense',
      note: `Visited ${cafe.name} (${cafe.area || 'Ipoh'})`
    });
  };

  return (
    <div className="explore-page-wrapper view-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="explore-floating-toast" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <h2 className="explore-main-title" style={{ margin: 0 }}>
            Explore {currentLocation?.area || 'Nearby'}
          </h2>
          <span
            className="explore-sample-badge"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
            title="Live places powered by OpenStreetMap & Overpass API"
          >
            📍 Live Map
          </span>
        </div>
      </div>

      {/* Top Summary Cards or Loading Skeleton (never flash 0 Places / 0 Deals while loading) */}
      {isLoading ? (
        <div
          aria-label="Loading explore summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}
        >
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="card"
              style={{ height: '78px', opacity: 0.65, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.45rem' }}
            >
              <div style={{ width: '55%', height: '12px', borderRadius: '6px', background: 'var(--border-light)' }} />
              <div style={{ width: '40%', height: '20px', borderRadius: '6px', background: 'var(--border-light)' }} />
            </div>
          ))}
        </div>
      ) : (
        <ExploreSummaryCards cafes={cafes} vouchers={vouchers} />
      )}

      {/* Filters & Location Controls */}
      <ExploreFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        budgetPreset={budgetPreset}
        onBudgetPresetChange={setBudgetPreset}
        hasVoucher={hasVoucher}
        onHasVoucherToggle={() => setHasVoucher((prev) => !prev)}
        studyFriendly={studyFriendly}
        onStudyFriendlyToggle={() => setStudyFriendly((prev) => !prev)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onResetFilters={handleResetFilters}
        totalResults={filteredCafes.length}
        currentLocation={currentLocation}
        onLocationChange={setCurrentLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLocating={isLocating}
      />

      {/* Main Split Area: Interactive Map on one side, Scrollable Venue List on the other */}
      <div className="explore-split-layout">
        {/* Map Column */}
        <div className="explore-map-column">
          <div className="card map-wrapper-card">
            <div className="map-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={17} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Interactive OpenStreetMap
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {filteredCafes.length} markers showing
              </span>
            </div>

            {USE_STATIC_MAP ? (
              <MapView
                cafes={filteredCafes}
                selectedCafeId={selectedCafeId}
                onSelectCafe={(cafeId) => setSelectedCafeId(cafeId)}
                onOpenDetailsModal={(cafe) => setDetailsModalCafe(cafe)}
              />
            ) : (
              <Suspense fallback={<MapLoadingSkeleton />}>
                <ExploreMap
                  cafes={filteredCafes}
                  selectedCafeId={selectedCafeId}
                  onSelectCafe={(cafeId) => setSelectedCafeId(cafeId)}
                  onOpenDetailsModal={(cafe) => setDetailsModalCafe(cafe)}
                  onAddToExpenses={handleAddToExpenses}
                  currentLocation={currentLocation}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Venue List Column */}
        <div className="explore-list-column">
          <div className="card cafe-list-card">
            <div className="cafe-list-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Coffee size={17} color="var(--primary-light)" />
                <span>Nearby Food & Dining</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {filteredCafes.length} results
              </span>
            </div>

            {/* List Body with Scroll */}
            <div className="cafe-list-scrollable">
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.9rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-card-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ width: '65%', height: '14px', borderRadius: '6px', background: 'var(--border-light)' }} />
                      <div style={{ width: '45%', height: '11px', borderRadius: '6px', background: 'var(--border-light)' }} />
                      <div style={{ width: '80%', height: '11px', borderRadius: '6px', background: 'var(--border-light)' }} />
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="explore-empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <AlertTriangle size={30} color="var(--expense)" style={{ marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: '0 0 0.35rem' }}>Couldn&apos;t load nearby places</h4>
                  <p style={{ margin: '0 0 0.85rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>{fetchError}</p>
                  <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: '44px' }} onClick={handleRetryLoad}>
                    <RotateCcw size={14} /> Retry
                  </button>
                </div>
              ) : filteredCafes.length === 0 ? (
                <div className="explore-empty-state">
                  <Coffee size={36} color="var(--primary-light)" style={{ opacity: 0.45, marginBottom: '0.5rem' }} />
                  <h4>No places found</h4>
                  <p>
                    {cafes.length === 0
                      ? 'Could not find places for this area right now.'
                      : 'No places match your current filters.'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {cafes.length === 0 ? (
                      <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: '44px' }} onClick={handleRetryLoad}>
                        <RotateCcw size={14} /> Retry
                      </button>
                    ) : (
                      <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: '44px' }} onClick={handleResetFilters}>
                        <RotateCcw size={14} /> Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredCafes.map((cafe) => (
                  <CafeCard
                    key={cafe.id}
                    cafe={cafe}
                    isSelected={cafe.id === selectedCafeId}
                    onSelect={(id) => setSelectedCafeId(id)}
                    onOpenDetails={(c) => setDetailsModalCafe(c)}
                    onAddToExpenses={handleAddToExpenses}
                    vouchers={vouchers}
                    foodBudgetStatus={foodBudgetStatus}
                    onNavigateToBudgets={onNavigateToBudgets}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vouchers and Deals Section Below the Map (Requirement 7) */}
      <VouchersSection
        vouchers={vouchers}
        savedVoucherIds={savedVoucherIds}
        onCopyCode={handleCopyCode}
        onToggleSave={handleToggleSaveVoucher}
        onSelectCafe={(cafeId) => {
          setSelectedCafeId(cafeId);
          const scrollTarget = document.querySelector('.main-wrapper') || window;
          scrollTarget.scrollTo({ top: 380, behavior: 'smooth' });
        }}
        copiedCode={copiedCode}
      />

      {/* Cafe Details Modal */}
      <CafeDetailsModal
        cafe={detailsModalCafe}
        isOpen={Boolean(detailsModalCafe)}
        onClose={() => setDetailsModalCafe(null)}
        vouchers={vouchers}
        foodBudgetStatus={foodBudgetStatus}
        onAddToExpenses={handleAddToExpenses}
        onLocateOnMap={(cafeId) => {
          setSelectedCafeId(cafeId);
          const scrollTarget = document.querySelector('.main-wrapper') || window;
          scrollTarget.scrollTo({ top: 380, behavior: 'smooth' });
        }}
        onCopyVoucherCode={handleCopyCode}
        onSaveVoucher={handleToggleSaveVoucher}
        isVoucherSaved={(vId) => savedVoucherIds.includes(vId)}
        onNavigateToBudgets={onNavigateToBudgets}
      />
    </div>
  );
}
