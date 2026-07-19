import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { profileApi } from '../api';
import {
  GENDER_PRESETS,
  GenderPreset,
  LinkErrors,
  LocationSuggestion,
  UpdateProfilePayload,
} from '../types';
import { User, UserLink } from '../../../types';
import { useAuthContext } from '../../auth/context/AuthContext';
import {
  formatGeocodedLocation,
  formatLocationSuggestion,
} from '../utils/location';

const BIO_MAX_LENGTH = 200;
const NAME_MAX_LENGTH = 80;
const GENDER_MAX_LENGTH = 50;
const LOCATION_SEARCH_DELAY_MS = 450;
const LOCATION_BLUR_DELAY_MS = 250;
const LOCATION_TIMEOUT_MS = 10_000;
const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

interface EditableProfileSnapshot {
  name: string;
  username: string;
  bio: string;
  location: string;
  gender: string;
  links: UserLink[];
}

const normalizeUsername = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);

const isGenderPreset = (value: string): value is GenderPreset =>
  GENDER_PRESETS.includes(value.toLowerCase() as GenderPreset);

const getSnapshot = (user: User | null): EditableProfileSnapshot => {
  const gender = user?.gender || '';

  return {
    name: user?.name || '',
    username: normalizeUsername(user?.username || ''),
    bio: user?.bio || '',
    location: user?.location || '',
    gender,
    links: (user?.links || []).map((link) => ({ ...link })),
  };
};

const getCustomGender = (gender: string) =>
  gender && !isGenderPreset(gender) ? gender : '';

const isOnline = async () => {
  const network = await NetInfo.fetch();
  return network.isConnected !== false && network.isInternetReachable !== false;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Location request timed out. Please try again.')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const isValidWebUrl = (value: string) => {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(normalized);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
};

const validateLinks = (links: UserLink[]): LinkErrors => {
  return links.reduce<LinkErrors>((errors, link, index) => {
    const label = link.label.trim();
    const url = link.url.trim();

    if (!label && !url) return errors;

    const linkError: LinkErrors[number] = {};
    if (!url) {
      linkError.url = 'Add a URL or remove this link.';
    } else if (!isValidWebUrl(url)) {
      linkError.url = 'Enter a valid website URL.';
    }

    if (linkError.label || linkError.url) errors[index] = linkError;
    return errors;
  }, {});
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const error = err as {
    message?: string;
    response?: { data?: { error?: string } };
  };
  return error.response?.data?.error || error.message || fallback;
};

export function useEditProfile(initialUser: User | null) {
  const { user: authUser, updateUser } = useAuthContext();
  const initialSnapshot = getSnapshot(initialUser);

  const [baseline, setBaseline] = useState(initialSnapshot);
  const [name, setName] = useState(initialSnapshot.name);
  const [username, setUsernameValue] = useState(initialSnapshot.username);
  const [bio, setBio] = useState(initialSnapshot.bio);
  const [location, setLocationValue] = useState(initialSnapshot.location);
  const [locationQuery, setLocationQueryValue] = useState(initialSnapshot.location);
  const [gender, setGenderValue] = useState(initialSnapshot.gender);
  const [customGender, setCustomGenderValue] = useState(
    getCustomGender(initialSnapshot.gender)
  );
  const [links, setLinks] = useState<UserLink[]>(initialSnapshot.links);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const locationRef = useRef(initialSnapshot.location);
  const locationQueryRef = useRef(initialSnapshot.location);
  const locationSearchRequestRef = useRef(0);
  const locationBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const initialUserIdRef = useRef(initialUser?._id || null);

  const syncFromUser = useCallback((user: User | null, preserveAvatar = false) => {
    const next = getSnapshot(user);
    const nextCustomGender = getCustomGender(next.gender);

    setBaseline(next);
    setName(next.name);
    setUsernameValue(next.username);
    setBio(next.bio);
    setLocationValue(next.location);
    setLocationQueryValue(next.location);
    setGenderValue(next.gender);
    setCustomGenderValue(nextCustomGender);
    setLinks(next.links);
    if (!preserveAvatar) setAvatarAsset(null);
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setSearchingLocation(false);
    locationRef.current = next.location;
    locationQueryRef.current = next.location;
    locationSearchRequestRef.current += 1;
  }, []);

  useEffect(() => {
    const nextUserId = initialUser?._id || null;
    if (nextUserId === initialUserIdRef.current) return;
    initialUserIdRef.current = nextUserId;
    syncFromUser(initialUser);
  }, [initialUser?._id, syncFromUser]);

  useEffect(() => {
    return () => {
      locationSearchRequestRef.current += 1;
      if (locationBlurTimerRef.current) {
        clearTimeout(locationBlurTimerRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const setUsername = useCallback((value: string) => {
    setUsernameValue(normalizeUsername(value));
  }, []);

  const selectedGenderPreset = useMemo<GenderPreset | null>(() => {
    const normalized = gender.toLowerCase();
    return GENDER_PRESETS.find((preset) => preset === normalized) || null;
  }, [gender]);

  const setGender = useCallback((value: string) => {
    const preset = GENDER_PRESETS.find(
      (option) => option === value.toLowerCase()
    );

    if (preset) {
      setGenderValue(preset);
      setCustomGenderValue('');
      return;
    }

    setGenderValue(value);
    setCustomGenderValue(value);
  }, []);

  const setCustomGender = useCallback((value: string) => {
    setGender(value);
  }, [setGender]);

  const selectGender = useCallback((value: GenderPreset) => {
    setGenderValue(value);
    setCustomGenderValue('');
  }, []);

  const clearGender = useCallback(() => {
    setGenderValue('');
    setCustomGenderValue('');
  }, []);

  const invalidateLocationSearch = useCallback(() => {
    locationSearchRequestRef.current += 1;
    setSearchingLocation(false);
  }, []);

  const setLocation = useCallback((value: string) => {
    invalidateLocationSearch();
    locationRef.current = value;
    locationQueryRef.current = value;
    setLocationValue(value);
    setLocationQueryValue(value);
    setLocationSuggestions([]);
    setShowSuggestions(false);
  }, [invalidateLocationSearch]);

  const setLocationQuery = useCallback((value: string) => {
    locationSearchRequestRef.current += 1;
    locationQueryRef.current = value;
    setLocationQueryValue(value);
    setSearchingLocation(false);
    setShowSuggestions(true);
  }, []);

  useEffect(() => {
    const requestId = ++locationSearchRequestRef.current;
    const query = locationQuery.trim();

    if (!query || query.length < 3 || query === location) {
      setLocationSuggestions([]);
      setSearchingLocation(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingLocation(true);

      try {
        if (!(await isOnline())) {
          if (requestId === locationSearchRequestRef.current) {
            setLocationSuggestions([]);
          }
          return;
        }

        const suggestions = await profileApi.searchLocations(query);
        if (requestId === locationSearchRequestRef.current) {
          setLocationSuggestions(suggestions);
        }
      } catch {
        if (requestId === locationSearchRequestRef.current) {
          setLocationSuggestions([]);
        }
      } finally {
        if (requestId === locationSearchRequestRef.current) {
          setSearchingLocation(false);
        }
      }
    }, LOCATION_SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [location, locationQuery]);

  const handleSelectSuggestion = useCallback((suggestion: LocationSuggestion) => {
    if (locationBlurTimerRef.current) {
      clearTimeout(locationBlurTimerRef.current);
      locationBlurTimerRef.current = null;
    }

    const formatted = formatLocationSuggestion(suggestion);
    if (!formatted) return;
    setLocation(formatted);
  }, [setLocation]);

  const handleLocationBlur = useCallback(() => {
    if (locationBlurTimerRef.current) {
      clearTimeout(locationBlurTimerRef.current);
    }

    locationBlurTimerRef.current = setTimeout(() => {
      const query = locationQueryRef.current;

      if (query.trim() === '') {
        setLocation('');
      } else if (query !== locationRef.current) {
        locationQueryRef.current = locationRef.current;
        setLocationQueryValue(locationRef.current);
        invalidateLocationSearch();
        setLocationSuggestions([]);
        setShowSuggestions(false);
      } else {
        setShowSuggestions(false);
      }

      locationBlurTimerRef.current = null;
    }, LOCATION_BLUR_DELAY_MS);
  }, [invalidateLocationSearch, setLocation]);

  const handleLocateMe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsLocating(true);

    try {
      if (!(await isOnline())) {
        throw new Error('Offline: Cannot fetch your location without an internet connection.');
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission is required to find your location.');
      }

      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        LOCATION_TIMEOUT_MS
      );
      const geocodedLocation = await profileApi.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      const formatted = formatGeocodedLocation(geocodedLocation);

      if (!formatted) {
        throw new Error('Could not fetch address details.');
      }

      setLocation(formatted);
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not fetch address details.'));
      return false;
    } finally {
      setIsLocating(false);
    }
  }, [setLocation]);

  const addLink = useCallback(() => {
    setLinks((current) => [...current, { label: '', url: '' }]);
  }, []);

  const updateLink = useCallback((
    index: number,
    field: 'label' | 'url',
    value: string
  ) => {
    setLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index ? { ...link, [field]: value } : link
    )));
  }, []);

  const removeLink = useCallback((index: number) => {
    setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
  }, []);

  const usernameError = useMemo(() => {
    if (USERNAME_REGEX.test(username)) return null;
    return 'Usernames must be 3-20 characters and contain lowercase letters, numbers, or underscores.';
  }, [username]);

  const nameError = useMemo(() => {
    if (name.length > NAME_MAX_LENGTH) {
      return `Display name must be ${NAME_MAX_LENGTH} characters or fewer.`;
    }
    if (baseline.name.trim() && !name.trim()) {
      return 'Removing an existing display name is not supported yet.';
    }
    if (name && !name.trim()) {
      return 'Enter a display name or leave the field empty.';
    }
    return null;
  }, [baseline.name, name]);

  const bioError = useMemo(() => {
    if (bio.length > BIO_MAX_LENGTH) {
      return `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
    }
    if (baseline.bio.trim() && !bio.trim()) {
      return 'Removing an existing bio is not supported yet.';
    }
    if (bio && !bio.trim()) {
      return 'Enter a bio or leave the field empty.';
    }
    return null;
  }, [baseline.bio, bio]);

  const locationError = useMemo(() => {
    const query = locationQuery.trim();
    if (!query || query === location) return null;
    return 'Choose a location from the results, or clear the field.';
  }, [location, locationQuery]);

  const genderError = useMemo(() => {
    if (gender.length > GENDER_MAX_LENGTH) {
      return `Gender must be ${GENDER_MAX_LENGTH} characters or fewer.`;
    }
    if (gender && !gender.trim()) {
      return 'Enter a gender or clear the field.';
    }
    return null;
  }, [gender]);

  const linkErrors = useMemo(() => validateLinks(links), [links]);
  const hasLinkErrors = Object.keys(linkErrors).length > 0;

  const isDirty = useMemo(() => {
    return Boolean(avatarAsset)
      || name !== baseline.name
      || username !== baseline.username
      || bio !== baseline.bio
      || gender !== baseline.gender
      || locationQuery !== baseline.location
      || JSON.stringify(links) !== JSON.stringify(baseline.links);
  }, [avatarAsset, baseline, bio, gender, links, locationQuery, name, username]);

  const canSave = isDirty
    && !saving
    && !nameError
    && !usernameError
    && !bioError
    && !genderError
    && !locationError
    && !hasLinkErrors;

  const pickAvatar = useCallback(async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    const asset = !result.canceled ? result.assets[0] : undefined;
    if (!asset) return;

    if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE) {
      setError('Profile pictures must be 10MB or smaller.');
      return;
    }

    setAvatarAsset(asset);
  }, []);

  const save = async (): Promise<boolean> => {
    if (savingRef.current) return false;
    setError(null);

    if (usernameError) {
      setError(usernameError);
      return false;
    }
    if (nameError) {
      setError(nameError);
      return false;
    }
    if (bioError) {
      setError(bioError);
      return false;
    }
    if (genderError) {
      setError(genderError);
      return false;
    }
    if (locationError) {
      setError(locationError);
      return false;
    }
    if (hasLinkErrors) {
      setError('Please fix the invalid profile links before saving.');
      return false;
    }
    if (!isDirty) return true;

    savingRef.current = true;
    setSaving(true);
    let profileChangesSaved = false;

    try {
      if (!(await isOnline())) {
        setError('Offline: Cannot update profile settings without an internet connection.');
        return false;
      }

      const validLinks = links
        .filter((link) => link.label.trim() || link.url.trim())
        .map((link) => ({
          label: link.label.trim(),
          url: link.url.trim(),
        }));
      const finalLocation = locationQuery.trim() === '' ? '' : location;
      const payload: UpdateProfilePayload = {
        username,
        name: name.trim(),
        bio: bio.trim(),
        location: finalLocation,
        gender: gender.trim().slice(0, GENDER_MAX_LENGTH),
        links: validLinks,
      };

      // Validate and persist textual profile changes first. The avatar upload
      // endpoint writes immediately, so doing it second prevents a duplicate
      // username (or another PATCH failure) from leaving a changed server
      // avatar with stale local state.
      const result = await profileApi.updateMyProfile(payload);
      const baseUser = authUser || initialUser;
      let mergedUser: User = baseUser
        ? { ...baseUser, ...result.user }
        : result.user;

      // Commit the successful textual PATCH immediately. If the photo upload
      // then fails, only the selected photo remains dirty and retryable.
      updateUser(mergedUser);
      syncFromUser(mergedUser, Boolean(avatarAsset));
      profileChangesSaved = true;

      if (avatarAsset) {
        const fallbackName = avatarAsset.uri.split('/').pop() || 'avatar.jpg';
        const fileName = avatarAsset.fileName || fallbackName;
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeType = avatarAsset.mimeType
          || (extension === 'png' ? 'image/png' : 'image/jpeg');

        const uploadResult = await profileApi.uploadProfilePicture(
          avatarAsset.uri,
          fileName,
          mimeType,
          setUploadProgress
        );
        mergedUser = { ...mergedUser, avatar: uploadResult.url };

        // Upload already persists the URL. This best-effort PATCH keeps the
        // web socket profile-updated broadcast behavior without turning a
        // successful upload into a false failure if confirmation is lost.
        try {
          const avatarResult = await profileApi.updateMyProfile({ avatar: uploadResult.url });
          mergedUser = { ...mergedUser, ...avatarResult.user, avatar: uploadResult.url };
        } catch (err) {
          if ((err as { response?: { status?: number } }).response?.status === 401) {
            throw err;
          }
          // The upload endpoint has already saved the avatar.
        }

        updateUser(mergedUser);
        syncFromUser(mergedUser);
      }
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save profile');
      setError(
        profileChangesSaved && avatarAsset
          ? `Your profile details were saved, but the photo upload failed. ${message}`
          : message
      );
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return {
    name,
    setName,
    nameError,
    username,
    setUsername,
    usernameError,
    bio,
    setBio,
    bioError,
    gender,
    setGender,
    genderError,
    genderPresets: GENDER_PRESETS,
    selectedGenderPreset,
    customGender,
    setCustomGender,
    selectGender,
    clearGender,
    location,
    setLocation,
    locationQuery,
    setLocationQuery,
    locationError,
    locationSuggestions,
    searchingLocation,
    isLocating,
    showSuggestions,
    setShowSuggestions,
    handleSelectSuggestion,
    handleLocationBlur,
    handleLocateMe,
    links,
    addLink,
    updateLink,
    removeLink,
    linkErrors,
    avatarUri: avatarAsset?.uri || null,
    pickAvatar,
    saving,
    uploadProgress,
    error,
    clearError,
    isDirty,
    canSave,
    save,
  };
}
