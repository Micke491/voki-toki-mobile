import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthContext } from '../auth/context/AuthContext';
import { authApi } from '../auth/api';
import { subscribeRestriction } from './restrictionEvents';

function formatRemaining(until: Date): string {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return 'a moment';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function activeUntil(raw?: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return parsed.getTime() > Date.now() ? parsed : null;
}

export const RestrictionBanner = () => {
  const { user } = useAuthContext();
  const [until, setUntil] = useState<Date | null>(activeUntil(user?.timeoutUntil));
  const slideAnim = useRef(new Animated.Value(-140)).current;

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.getCurrentUser();
      setUntil(activeUntil(data.user?.timeoutUntil));
    } catch {
      // Offline or cold server: keep whatever we last knew.
    }
  }, []);

  useEffect(() => {
    setUntil(activeUntil(user?.timeoutUntil));
  }, [user?.timeoutUntil]);

  useEffect(() => {
    if (!user) {
      setUntil(null);
      return;
    }

    const unsubscribe = subscribeRestriction((event) => {
      if (event.timeoutUntil) setUntil(activeUntil(event.timeoutUntil));
      else refresh();
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, [user, refresh]);

  useEffect(() => {
    if (!until) return;
    const timer = setTimeout(
      () => setUntil(null),
      Math.max(until.getTime() - Date.now(), 0) + 1000
    );
    return () => clearTimeout(timer);
  }, [until]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: until ? 0 : -140,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [until, slideAnim]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <Feather name="slash" size={16} color="#fff" />
      <Text style={styles.text}>
        {until
          ? `Restricted for ${formatRemaining(until)} — you cannot send messages or post stories.`
          : ''}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    paddingTop: 40,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9998,
    elevation: 9,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
