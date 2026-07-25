import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { InAppNotification, subscribeInApp } from './inAppEvents';

const VISIBLE_MS = 4000;
const HIDDEN_OFFSET = -160;

const TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export function InAppNotificationBanner() {
  const { colors } = useTheme();
  const [notification, setNotification] = useState<InAppNotification | null>(null);
  const slide = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeInApp(next => setNotification(next)), []);

  useEffect(() => {
    if (!notification) return;

    slide.setValue(HIDDEN_OFFSET);
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    hideTimer.current = setTimeout(() => {
      Animated.timing(slide, {
        toValue: HIDDEN_OFFSET,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setNotification(null));
    }, VISIBLE_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [notification, slide]);

  if (!notification) return null;

  const open = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const { chatId, data } = notification;
    setNotification(null);

    if (data.type === 'request') {
      router.push('/tabs?tab=requests');
      return;
    }
    if (chatId) router.push(`/chat/${chatId}`);
  };

  const isCall = notification.data.type === 'missed_call';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingTop: TOP_INSET + 8, transform: [{ translateY: slide }] },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={open}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.icon}>
          <Feather name={isCall ? 'phone-missed' : 'message-circle'} size={17} color="#6366F1" />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.body, { color: colors.textTertiary }]} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, marginTop: 2 },
});
