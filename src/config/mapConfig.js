/**
 * Map & OpenStreetMap Configuration for KiroKash Explore
 * 
 * Centralized, configurable settings for Leaflet tiles, Overpass API mirrors,
 * search locations, and caching thresholds.
 */

// Toggle for live interactive Leaflet / OpenStreetMap map vs static fallback
export const USE_STATIC_MAP = false;

// OpenStreetMap-compatible Tile Layer (Dark theme without API keys)
export const TILE_LAYER_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const TILE_LAYER_FALLBACK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

// Configurable Overpass API endpoints for real merchant discovery
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// Default search radius: ~5 kilometers
export const DEFAULT_SEARCH_RADIUS_METERS = 5000;

// Client cache TTL for Overpass responses: 1 hour in ms
export const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;

// Pre-configured student hubs and campus location presets
export const LOCATION_PRESETS = [
  {
    id: 'ipoh-center',
    name: 'Ipoh Old Town & Center',
    area: 'Old Town',
    latitude: 4.5975,
    longitude: 101.0901,
    zoom: 14,
    description: 'Heritage cafes, colonial shophouses, and central study spots'
  },
  {
    id: 'ipoh-greentown',
    name: 'Greentown Business & Campus',
    area: 'Greentown',
    latitude: 4.5988,
    longitude: 101.0935,
    zoom: 14,
    description: 'Commercial eateries, dessert cafes, and modern bistros'
  },
  {
    id: 'ipoh-canning',
    name: 'Canning Garden & Stadium',
    area: 'Canning Garden',
    latitude: 4.6050,
    longitude: 101.1150,
    zoom: 14,
    description: 'Artisan bakeries, gelato houses, and cozy neighborhood nooks'
  },
  {
    id: 'ipoh-meru',
    name: 'Meru Raya Student Hub',
    area: 'Meru Raya',
    latitude: 4.6642,
    longitude: 101.0745,
    zoom: 13,
    description: 'Bus terminal dining, fast food, and spacious student workspaces'
  },
  {
    id: 'perak-utp',
    name: 'UTP / Seri Iskandar / Tronoh',
    area: 'Seri Iskandar',
    latitude: 4.3857,
    longitude: 100.9786,
    zoom: 13,
    description: 'Campus convenience stores, student restaurants, and local mamaks'
  }
];

export const DEFAULT_LOCATION = LOCATION_PRESETS[0];
