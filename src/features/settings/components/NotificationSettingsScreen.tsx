import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../../auth/context/AuthContext';
import { settingsApi } from '../api';
import { chatApi } from '../../chat/api';
import { ChatListItem } from '../../chat/types';
import { getNotificationsEnabled, setNotificationsEnabled } from '../../../utils/storage';
import { SettingsHeader, FeedbackToast, Feedback, SectionLabel, Card, ToggleRow } from './ui';

interface MutedChatRow {
  chatId: string;
  mutedUntil: string;
  name: string;
  avatar?: string;
  isGroup: boolean;
}

const FOREVER_THRESHOLD_MS = 50 * 365 * 24 * 3600 * 1000;

function formatMutedUntil(mutedUntil: string): string {
  const until = new Date(mutedUntil);
  if (until.getTime() - Date.now() > FOREVER_THRESHOLD_MS) {
    return 'Muted until you turn it off';
  }
  return `Muted until ${until.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })}`;
}

export function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuthContext();
  const [rows, setRows] = useState<MutedChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmutingId, setUnmutingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    getNotificationsEnabled().then(setNotifEnabled);
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotifEnabled(value);
    await setNotificationsEnabled(value);
    setFeedback({
      type: 'success',
      message: value ? 'Notifications enabled' : 'Notifications turned off',
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mutedRes, chats] = await Promise.all([
          settingsApi.getMutedChats(),
          chatApi.getChats().catch(() => [] as ChatListItem[]),
        ]);
        const chatById = new Map(chats.map(c => [c._id, c]));
        const mapped = (mutedRes.mutedChats || []).map(entry => {
          const chat = chatById.get(entry.chatId);
          let name = 'Conversation';
          let avatar: string | undefined;
          let isGroup = false;
          if (chat) {
            isGroup = !!chat.isGroupChat;
            if (isGroup) {
              name = chat.name || 'Group chat';
              avatar = chat.avatar;
            } else {
              const other = chat.participants.find(p => p._id !== user?._id);
              name = other?.username || 'Conversation';
              avatar = other?.avatar;
            }
          }
          return { chatId: entry.chatId, mutedUntil: entry.mutedUntil, name, avatar, isGroup };
        });
        setRows(mapped);
      } catch {
        setFeedback({ type: 'error', message: 'Failed to load muted chats' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?._id]);

  const handleUnmute = async (row: MutedChatRow) => {
    try {
      setUnmutingId(row.chatId);
      await settingsApi.unmuteChat(row.chatId);
      setRows(prev => prev.filter(r => r.chatId !== row.chatId));
      setFeedback({ type: 'success', message: `Unmuted ${row.name}` });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to unmute chat' });
    } finally {
      setUnmutingId(null);
    }
  };

  const renderItem = ({ item }: { item: MutedChatRow }) => (
    <View style={[styles.chatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
          <Feather name={item.isGroup ? 'users' : 'user'} size={18} color={colors.warning} />
        </View>
      )}
      <View style={styles.chatInfo}>
        <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.mutedRow}>
          <Feather name="volume-x" size={11} color={colors.warning} />
          <Text style={[styles.mutedUntil, { color: colors.textTertiary }]} numberOfLines={1}>
            {formatMutedUntil(item.mutedUntil)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unmuteButton, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
        onPress={() => handleUnmute(item)}
        disabled={unmutingId === item.chatId}
      >
        {unmutingId === item.chatId ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={[styles.unmuteText, { color: colors.textPrimary }]}>Unmute</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Notifications" />
      <FeedbackToast feedback={feedback} onHide={() => setFeedback(null)} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.chatId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <SectionLabel>Alerts</SectionLabel>
              <Card style={{ marginBottom: 22 }}>
                <ToggleRow
                  icon={notifEnabled ? 'bell' : 'bell-off'}
                  tint="#f59e0b"
                  title="Notifications"
                  subtitle={notifEnabled
                    ? 'You will be alerted about new messages and incoming calls on this device'
                    : 'Turned off — this device will stay silent for messages and calls'}
                  value={notifEnabled}
                  onValueChange={toggleNotifications}
                />
              </Card>
              <SectionLabel>Muted Chats Manager</SectionLabel>
              <Text style={[styles.headerHint, { color: colors.textTertiary }]}>
                Muted conversations won't alert you about new messages. Mute a chat by
                long-pressing it in your chat list.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="bell" size={30} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No muted conversations
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                All your chats will notify you about new messages
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingBottom: 48 },
  headerBlock: { marginBottom: 6 },
  headerHint: { fontSize: 12, lineHeight: 17, marginBottom: 14, marginLeft: 6 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '700' },
  mutedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  mutedUntil: { fontSize: 12, fontWeight: '600', flex: 1 },
  unmuteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 76,
    alignItems: 'center',
  },
  unmuteText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 90, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySubtitle: { fontSize: 13, marginTop: 5, textAlign: 'center' },
});
