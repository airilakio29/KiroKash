import React, { useEffect, useRef } from 'react';
import { Star, Wifi, BookOpen, Ticket, AlertCircle, CheckCircle2, ArrowRight, PlusCircle, ExternalLink, Sparkles } from 'lucide-react';

export default function CafeCard({
  cafe,
  isSelected,
  onSelect,
  onOpenDetails,
  onAddToExpenses,
  vouchers = [],
  foodBudgetStatus = null,
  onNavigateToBudgets
}) {
  const cardRef = useRef(null);

  // Auto scroll card into view when selected from the map
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [isSelected]);

  const cafeVouchers = vouchers.filter((v) => v.cafeId === cafe.id && v.status !== 'expired');
  const hasVoucher = cafeVouchers.length > 0;
  const isPartner = Boolean(cafe.isPartner);

  // Evaluate budget status
  const remainingFood = foodBudgetStatus?.hasBudget ? foodBudgetStatus.remaining : null;
  const isBudgetSet = foodBudgetStatus?.hasBudget;
  const hasBudgetListed = cafe.minBudget != null;

  const budgetFits = isBudgetSet && hasBudgetListed && remainingFood >= (cafe.maxBudget || cafe.minBudget);
  const budgetTight = isBudgetSet && hasBudgetListed && remainingFood >= cafe.minBudget && remainingFood < (cafe.maxBudget || cafe.minBudget);

  return (
    <div
      ref={cardRef}
      className={`cafe-card ${isSelected ? 'selected' : ''} ${isPartner ? 'card-partner' : ''}`}
      onClick={() => onSelect(cafe.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(cafe.id);
        }
      }}
      aria-label={`${cafe.name} in ${cafe.area}`}
    >
      {/* Top Card Row */}
      <div className="cafe-card-header">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span className="cafe-area-tag">{cafe.area || 'Ipoh'}</span>
            <span className="cafe-category-tag">{cafe.category}</span>
            {isPartner ? (
              <span
                className="cafe-partner-tag"
                style={{
                  background: 'rgba(234, 179, 8, 0.18)',
                  color: '#FACC15',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  fontSize: '0.68rem',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <Sparkles size={11} /> Verified Partner
              </span>
            ) : (
              <span
                className="cafe-osm-tag"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.68rem',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '10px',
                  fontWeight: 600
                }}
              >
                📍 OpenStreetMap
              </span>
            )}
            {hasVoucher && (
              <span className="cafe-voucher-tag">
                <Ticket size={12} /> {cafeVouchers[0].discountValue}
              </span>
            )}
          </div>
          <h4 className="cafe-name">{cafe.name}</h4>
        </div>

        {/* Rating: Display only when obtained from trustworthy source */}
        {cafe.rating != null ? (
          <div className="cafe-rating-badge">
            <Star size={13} fill="#FBBF24" color="#FBBF24" />
            <span>{cafe.rating.toFixed(1)}</span>
          </div>
        ) : (
          <div
            className="cafe-rating-badge"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 600
            }}
            title="Real community venue verified via OpenStreetMap"
          >
            <span>OSM Verified</span>
          </div>
        )}
      </div>

      <p className="cafe-description">{cafe.shortDescription}</p>

      {/* Meta Bar: Budget & Features */}
      <div className="cafe-meta-bar">
        <div className="cafe-budget-badge">
          <span className="budget-label">Budget:</span>
          {hasBudgetListed ? (
            <strong>RM {cafe.minBudget} - RM {cafe.maxBudget}</strong>
          ) : (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Not listed
            </span>
          )}
        </div>

        <div className="cafe-amenities">
          {cafe.hasWifi && (
            <span className="amenity-chip" title="Fast WiFi Available">
              <Wifi size={13} /> WiFi
            </span>
          )}
          {cafe.hasStudySeating && (
            <span className="amenity-chip" title="Study Desks & Power Plugs">
              <BookOpen size={13} /> Study
            </span>
          )}
          {cafe.distanceKm != null && (
            <span className="amenity-chip" title="Distance from active location">
              📍 {cafe.distanceKm} km
            </span>
          )}
        </div>
      </div>

      {/* Budget Affordability Hint (Preserving Requirement 4 & 7.1) */}
      <div className="cafe-budget-hint-row">
        {isBudgetSet ? (
          !hasBudgetListed ? (
            <div className="budget-hint-chip no-budget">
              <span>Budget not listed • RM {remainingFood.toFixed(0)} left in Food budget</span>
            </div>
          ) : budgetFits ? (
            <div className="budget-hint-chip fits">
              <CheckCircle2 size={13} />
              <span>Fits your budget (RM {remainingFood.toFixed(0)} left in Food)</span>
            </div>
          ) : budgetTight ? (
            <div className="budget-hint-chip tight">
              <AlertCircle size={13} />
              <span>Tight budget • Fits min spend (RM {remainingFood.toFixed(0)} left)</span>
            </div>
          ) : (
            <div className="budget-hint-chip over">
              <AlertCircle size={13} />
              <span>Over your budget (Only RM {remainingFood.toFixed(0)} left in Food)</span>
            </div>
          )
        ) : (
          <div className="budget-hint-chip no-budget">
            <span>No Food budget set •</span>
            <button
              type="button"
              className="budget-prompt-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateToBudgets) onNavigateToBudgets();
              }}
            >
              Set in Budgets <ExternalLink size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="cafe-card-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(cafe);
          }}
          aria-label={`View full details of ${cafe.name}`}
        >
          View Details <ArrowRight size={13} />
        </button>

        <button
          type="button"
          className="btn btn-primary btn-sm add-expense-quick-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddToExpenses(cafe);
          }}
          title={`Log expense at ${cafe.name}`}
          aria-label={`Add ${cafe.name} to expenses`}
        >
          <PlusCircle size={14} />
          <span>Add to expenses</span>
        </button>
      </div>
    </div>
  );
}
