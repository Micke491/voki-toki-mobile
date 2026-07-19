import type {
  GeocodedLocation,
  LocationSuggestion,
  LocationSuggestionAddress,
} from '../types';

const clean = (value?: string | null) => value?.trim() || '';

export function formatLocationAddress(
  address: LocationSuggestionAddress | null = {},
  fallback?: string | null
): string {
  const safeAddress = address || {};
  const city = clean(safeAddress.city)
    || clean(safeAddress.town)
    || clean(safeAddress.village)
    || clean(safeAddress.municipality)
    || clean(safeAddress.city_district);
  const country = clean(safeAddress.country);

  if (city && country) return `${city}, ${country}`;
  return city || country || clean(fallback);
}

export function formatLocationSuggestion(suggestion: LocationSuggestion): string {
  return formatLocationAddress(
    suggestion.address,
    suggestion.display_name
  );
}

export function formatGeocodedLocation(location: GeocodedLocation): string {
  return formatLocationAddress(location.address, location.display_name);
}
