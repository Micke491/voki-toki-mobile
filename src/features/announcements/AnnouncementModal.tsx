import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Announcement } from '../../types';
import { useAuthContext } from '../auth/context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { announcementsApi } from './api';

const POLL_INTERVAL = 60_000;

export const AnnouncementModal = () => {
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [dismissing, setDismissing] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setQueue(await announcementsApi.list());
    } catch {
      // Server asleep or offline — the next poll will pick these up.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setQueue([]);
      return;
    }

    fetchAnnouncements();

    const interval = setInterval(fetchAnnouncements, POLL_INTERVAL);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchAnnouncements();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [user, fetchAnnouncements]);

  const current = queue[0];

  const dismiss = async () => {
    if (!current) return;
    setDismissing(true);
    try {
      await announcementsApi.dismiss(current._id);
    } catch {
      // Already read or unreachable — drop it locally either way.
    } finally {
      setQueue((q) => q.slice(1));
      setDismissing(false);
    }
  };

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name="volume-2" size={18} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                {current.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                Announcement from the Vokitoki team
              </Text>
            </View>
          </View>

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{current.body}</Text>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.remaining, { color: colors.textTertiary }]}>
              {queue.length > 1 ? `${queue.length - 1} more to read` : ''}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={dismiss}
              disabled={dismissing}
            >
              {dismissing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Got it</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  bodyScroll: {
    maxHeight: 320,
  },
  bodyContent: {
    padding: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  remaining: {
    fontSize: 11,
    flex: 1,
  },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
