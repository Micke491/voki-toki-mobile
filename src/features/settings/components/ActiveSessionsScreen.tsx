import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { settingsApi } from '../api';

export function ActiveSessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getActiveSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    Alert.alert('Revoke Session', 'Are you sure you want to log out this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await settingsApi.revokeSession(id);
            setSessions(prev => prev.filter(s => s._id !== id));
          } catch (err) {
            Alert.alert('Error', 'Failed to revoke session');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isCurrent = item.isCurrent;
    const date = new Date(item.lastActive).toLocaleString();

    return (
      <View style={[styles.sessionCard, isCurrent && styles.currentCard]}>
        <View style={styles.iconContainer}>
          <Feather name={item.device?.toLowerCase().includes('mobile') ? 'smartphone' : 'monitor'} size={24} color={isCurrent ? '#3b82f6' : '#71717a'} />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.deviceRow}>
            <Text style={[styles.deviceText, isCurrent && styles.currentDeviceText]}>
              {item.device || 'Unknown Device'}
            </Text>
            {isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>}
          </View>
          <Text style={styles.ipText}>{item.ip || 'Unknown IP'}</Text>
          <Text style={styles.dateText}>Last active: {date}</Text>
        </View>
        {!isCurrent && (
          <TouchableOpacity onPress={() => handleRevoke(item._id)} style={styles.revokeBtn}>
            <Feather name="trash-2" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active sessions found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  iconButton: {
    padding: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  currentCard: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  iconContainer: {
    marginRight: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  deviceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f4f4f5',
  },
  currentDeviceText: {
    color: '#3b82f6',
  },
  currentBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  ipText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 4,
  },
  dateText: {
    color: '#71717a',
    fontSize: 12,
  },
  revokeBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  emptyText: {
    color: '#71717a',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
