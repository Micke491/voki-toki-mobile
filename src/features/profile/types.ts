import { User, UserLink } from '../../types';
import { Story } from '../story/types';

export const GENDER_PRESETS = ['male', 'female', 'prefer not to say'] as const;

export type GenderPreset = (typeof GENDER_PRESETS)[number];

export interface LocationSuggestionAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  country?: string;
}

export interface GeocodedLocation {
  display_name?: string | null;
  address?: LocationSuggestionAddress | null;
  lat?: string;
  lon?: string;
}

export interface LocationSuggestion extends GeocodedLocation {
  place_id: number | string;
}

export type ReverseGeocodeResult = GeocodedLocation;

export interface LinkValidationError {
  label?: string;
  url?: string;
}

export type LinkErrors = Partial<Record<number, LinkValidationError>>;

export interface ProfileData {
  user: User;
  stories: Story[];
}

export interface UpdateProfilePayload {
  username?: string;
  name?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  gender?: string;
  links?: UserLink[];
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface UploadProfilePictureResponse {
  url: string;
  message: string;
}
