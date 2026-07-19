import { useState, useEffect, useCallback, useRef } from 'react';
import { profileApi } from '../api';
import { ProfileData } from '../types';
import { useAuthContext } from '../../auth/context/AuthContext';

export function useProfile() {
  const { user, updateUser } = useAuthContext();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authUserRef = useRef(user);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  authUserRef.current = user;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const requestedUserId = authUserRef.current?._id;

    try {
      setError(null);
      setLoading(true);
      const data = await profileApi.getMyProfile();
      if (
        !mountedRef.current
        || requestId !== requestIdRef.current
        || !requestedUserId
        || authUserRef.current?._id !== requestedUserId
        || data.user?._id !== requestedUserId
      ) {
        return;
      }
      setProfile(data);
      if (data.user) {
        const syncedUser = authUserRef.current
          ? { ...authUserRef.current, ...data.user }
          : data.user;
        authUserRef.current = syncedUser;
        updateUser(syncedUser);
      }
    } catch (err: any) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refresh: fetchProfile };
}
