import { useState, useEffect, useCallback } from 'react';
import { profileApi } from '../api';
import { ProfileData } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await profileApi.getMyProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refresh: fetchProfile };
}
