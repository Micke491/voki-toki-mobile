import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { settingsApi, BlockedUser } from '../api';
import { SettingsHeader, FeedbackToast, Feedback } from './ui';

export function BlockedUsersScreen() {
  const { colors } = useTheme();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        const res = await settingsApi.getBlockedUsers();
        setBlockedUsers(res.blockedUsers || []);
      } catch {
        setFeedback({ type: 'error', message: 'Failed to load blocked users' });
      } finally {
        setLoading(false);
      }
    };
    fetchBlocked();
  }, []);

  const handleUnblock = (target: BlockedUser) => {
    Alert.alert('Unblock User', `Unblock @${target.username}? They will be able to message you again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          try {
            setUnblockingId(target._id);
            await settingsApi.unblockUser(target._id);
            setBlockedUsers(prev => prev.filter(u => u._id !== target._id));
            setFeedback({ type: 'success', message: `Unblocked @${target.username}` });
          } catch {
            setFeedback({ type: 'error', message: 'Failed to unblock user' });
          } finally {
            setUnblockingId(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarLetter, { color: colors.accent }]}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name || item.username}
        </Text>
        <Text style={[styles.handle, { color: colors.textTertiary }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
        onPress={() => handleUnblock(item)}
        disabled={unblockingId === item._id}
      >
        {unblockingId === item._id ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={[styles.unblockText, { color: colors.textPrimary }]}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Blocked Users" />
      <FeedbackToast feedback={feedback} onHide={() => setFeedback(null)} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="user-check" size={30} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No blocked users</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                People you block will show up here
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
  userCard: {
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
  avatarLetter: { fontSize: 18, fontWeight: '800' },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '700' },
  handle: { fontSize: 12, marginTop: 1, fontWeight: '600' },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 76,
    alignItems: 'center',
  },
  unblockText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 110, paddingHorizontal: 40 },
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
