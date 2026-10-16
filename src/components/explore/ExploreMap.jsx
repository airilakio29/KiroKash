import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  TILE_LAYER_URL,
  TILE_ATTRIBUTION,
  DEFAULT_LOCATION
} from '../../config/mapConfig.js';

// Fix standard Leaflet bundler image loading issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category-based icon SVG paths for custom marker
function getCategoryIconSvg(category = '') {
  const cat = category.toLowerCase();
  if (cat.includes('coffee') || cat === 'cafe') {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;
  }
  if (cat.includes('study')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>`;
  }
  if (cat.includes('bakery')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 4 3 3-9 9-3-3 9-9Z"/><path d="m6 14-3 3 4 4 3-3-4-4Z"/><path d="M14 6l4 4"/></svg>`;
  }
  if (cat.includes('dessert') || cat.includes('ice')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2h8V6a4 4 0 0 0-4-4Z"/><path d="M4 8h16l-2 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L4 8Z"/></svg>`;
  }
  if (cat.includes('fast food') || cat.includes('burger')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z"/><path d="M4 14h16v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-3Z"/></svg>`;
  }
  if (cat.includes('supermarket') || cat.includes('convenience') || cat.includes('grocer')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
  }
  if (cat.includes('restaurant')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/></svg>`;
  }
  // Default map marker icon
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
}

export default function ExploreMap({
  cafes = [],
  selectedCafeId = null,
  onSelectCafe,
  onOpenDetailsModal,
  onAddToExpenses,
  currentLocation = DEFAULT_LOCATION
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const onSelectCafeRef = useRef(onSelectCafe);
  const onOpenDetailsModalRef = useRef(onOpenDetailsModal);
  const onAddToExpensesRef = useRef(onAddToExpenses);

  useEffect(() => {
    onSelectCafeRef.current = onSelectCafe;
    onOpenDetailsModalRef.current = onOpenDetailsModal;
    onAddToExpensesRef.current = onAddToExpenses;
  }, [onSelectCafe, onOpenDetailsModal, onAddToExpenses]);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = currentLocation?.latitude || DEFAULT_LOCATION.latitude;
    const initialLng = currentLocation?.longitude || DEFAULT_LOCATION.longitude;
    const initialZoom = currentLocation?.zoom || 13;

    // Center on selected location
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true
    });

    // Dark CARTO Matter Tiles with OpenStreetMap attribution
    L.tileLayer(TILE_LAYER_URL, {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION
    }).addTo(map);

    // Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map center when currentLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) return;

    map.flyTo(
      [currentLocation.latitude, currentLocation.longitude],
      currentLocation.zoom || 14,
      { duration: 1.0, easeLinearity: 0.25 }
    );
  }, [currentLocation]);

  // Update Markers when `cafes` change or `selectedCafeId` changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    cafes.forEach((cafe) => {
      if (cafe.latitude == null || cafe.longitude == null) return;

      const isSelected = cafe.id === selectedCafeId;
      const isPartner = Boolean(cafe.isPartner);
      const iconSvg = getCategoryIconSvg(cafe.category);

      // Determine label text: Price if known, else Partner / Category
      let pinLabel = '';
      if (cafe.minBudget != null) {
        pinLabel = `RM ${cafe.minBudget}`;
      } else if (isPartner) {
        pinLabel = '★ Partner';
      } else {
        pinLabel = cafe.category || 'OSM';
      }

      // Create Custom Styled HTML Pin
      const customDivIcon = L.divIcon({
        className: 'custom-cafe-marker-wrapper',
        html: `
          <div class="custom-cafe-marker ${isSelected ? 'marker-selected' : ''} ${isPartner ? 'marker-partner' : ''}" style="--accent-color: ${cafe.accentColor || '#A78BFA'}">
            <div class="marker-pulse"></div>
            <div class="marker-pin ${isPartner ? 'pin-partner-glow' : ''}">
              <span class="marker-icon">${iconSvg}</span>
              <span class="marker-price">${pinLabel}</span>
            </div>
            <div class="marker-tip"></div>
          </div>
        `,
        iconSize: [48, 50],
        iconAnchor: [24, 48],
        popupAnchor: [0, -44]
      });

      const marker = L.marker([cafe.latitude, cafe.longitude], {
        icon: customDivIcon,
        title: cafe.name
      }).addTo(map);

      // Interactive Leaflet Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'explore-map-popup-inner';
      
      const partnerBadgeHtml = isPartner
        ? `<span class="popup-partner-badge">★ Verified Partner</span>`
        : `<span class="popup-osm-badge">📍 OpenStreetMap</span>`;

      const budgetHtml = cafe.minBudget != null
        ? `<strong>RM ${cafe.minBudget} - ${cafe.maxBudget}</strong>`
        : `<span style="opacity: 0.75; font-size: 0.78rem;">Not listed</span>`;

      const ratingHtml = cafe.rating != null
        ? `★ ${cafe.rating.toFixed(1)} <span class="rating-count">(${cafe.reviewCount || 0})</span>`
        : `<span style="opacity: 0.75; font-size: 0.78rem;">Unrated</span>`;

      popupContent.innerHTML = `
        <div class="popup-header">
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.2rem; flex-wrap: wrap;">
              <span class="popup-area-badge">${cafe.area || 'Ipoh'}</span>
              ${partnerBadgeHtml}
            </div>
            <div class="popup-title">${cafe.name}</div>
          </div>
        </div>
        <div class="popup-desc">${cafe.shortDescription || cafe.category}</div>
        <div class="popup-meta">
          <div class="popup-budget">
            <span class="meta-label">Budget:</span>
            ${budgetHtml}
          </div>
          <div class="popup-rating">
            ${ratingHtml}
          </div>
        </div>
        <div class="popup-actions" style="display: flex; gap: 0.4rem; margin-top: 0.65rem;">
          <button type="button" class="btn btn-secondary btn-sm popup-details-btn" data-cafe-id="${cafe.id}" style="flex: 1; font-size: 0.75rem; padding: 0.3rem 0.5rem;">
            Details →
          </button>
          <button type="button" class="btn btn-primary btn-sm popup-expense-btn" data-cafe-id="${cafe.id}" style="flex: 1; font-size: 0.75rem; padding: 0.3rem 0.5rem;">
            + Expense
          </button>
        </div>
      `;

      // Attach button event listeners
      const detailsBtn = popupContent.querySelector('.popup-details-btn');
      if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onOpenDetailsModalRef.current) {
            onOpenDetailsModalRef.current(cafe);
          }
        });
      }

      const expenseBtn = popupContent.querySelector('.popup-expense-btn');
      if (expenseBtn) {
        expenseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onAddToExpensesRef.current) {
            onAddToExpensesRef.current(cafe);
          }
        });
      }

      marker.bindPopup(popupContent, {
        className: 'explore-leaflet-popup',
        maxWidth: 300,
        minWidth: 240
      });

      marker.on('click', () => {
        if (onSelectCafeRef.current) {
          onSelectCafeRef.current(cafe.id);
        }
      });

      markersRef.current[cafe.id] = marker;
    });

    // If there is an active selected cafe, fly to it and open popup
    if (selectedCafeId && markersRef.current[selectedCafeId]) {
      const selectedMarker = markersRef.current[selectedCafeId];
      const selectedCafe = cafes.find((c) => c.id === selectedCafeId);
      if (selectedCafe && selectedCafe.latitude != null && selectedCafe.longitude != null) {
        map.flyTo([selectedCafe.latitude, selectedCafe.longitude], 15, {
          duration: 0.8,
          easeLinearity: 0.25
        });
        selectedMarker.openPopup();
      }
    }
  }, [cafes, selectedCafeId]);

  const handleResetCenter = () => {
    if (!mapInstanceRef.current) return;
    const centerLat = currentLocation?.latitude || DEFAULT_LOCATION.latitude;
    const centerLng = currentLocation?.longitude || DEFAULT_LOCATION.longitude;
    const centerZoom = currentLocation?.zoom || 14;

    mapInstanceRef.current.flyTo([centerLat, centerLng], centerZoom, {
      duration: 0.8
    });
  };

  return (
    <div className="explore-map-container">
      <div
        ref={mapContainerRef}
        className="explore-map-element"
        tabIndex={0}
        aria-label="Interactive OpenStreetMap of real nearby student merchants"
      />

      {/* Map Overlay Controls */}
      <div className="map-overlay-controls">
        <button
          type="button"
          onClick={handleResetCenter}
          className="map-control-pill-btn"
          title={`Center map on ${currentLocation?.name || 'current area'}`}
        >
          <span>🎯 {currentLocation?.name || 'Center'}</span>
        </button>
        <span className="map-tiles-badge" title="Live map powered by OpenStreetMap & CartoDB Dark Matter">
          OpenStreetMap
        </span>
      </div>
    </div>
  );
}
