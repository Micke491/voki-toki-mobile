import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { settingsApi } from '../api';
import { profileApi } from '../../profile/api';
import { TwoFactorModal } from './TwoFactorModal';

export function SettingsScreen() {
  const router = useRouter();
  const { user, updateUser, signOut } = useAuthContext();
  const [loading, setLoading] = useState(false);
  
  const [twoFaModalVisible, setTwoFaModalVisible] = useState(false);
  const [isEnabling2Fa, setIsEnabling2Fa] = useState(true);

  const handleToggle = async (key: string, currentValue: boolean | undefined) => {
    if (!user) return;
    try {
      setLoading(true);
      const newValue = !currentValue;
      const res = await settingsApi.updatePreferences({ [key]: newValue });
      updateUser(res.user);
    } catch (err) {
      console.error('Failed to update preference:', err);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAToggle = () => {
    setIsEnabling2Fa(!user?.twoFactorEnabled);
    setTwoFaModalVisible(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await profileApi.deleteAccount();
              signOut();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Feather name="eye" size={20} color="#71717a" />
                <Text style={styles.rowText}>Read Receipts</Text>
              </View>
              <Switch 
                value={user?.readReceipts ?? true} 
                onValueChange={() => handleToggle('readReceipts', user?.readReceipts)}
                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                disabled={loading}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Feather name="shield" size={20} color="#71717a" />
                <Text style={styles.rowText}>Two-Factor Authentication</Text>
              </View>
              <Switch 
                value={user?.twoFactorEnabled ?? false} 
                onValueChange={handle2FAToggle}
                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                disabled={loading}
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/sessions')}>
              <View style={styles.rowLeft}>
                <Feather name="monitor" size={20} color="#71717a" />
                <Text style={styles.rowText}>Active Sessions</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#71717a" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Feather name="image" size={20} color="#71717a" />
                <Text style={styles.rowText}>Auto-play GIFs</Text>
              </View>
              <Switch 
                value={(user as any)?.autoPlayGifs ?? true} 
                onValueChange={() => handleToggle('autoPlayGifs', (user as any)?.autoPlayGifs)}
                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                disabled={loading}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Feather name="volume-2" size={20} color="#71717a" />
                <Text style={styles.rowText}>Auto-play Voice Messages</Text>
              </View>
              <Switch 
                value={(user as any)?.autoPlayVoice ?? false} 
                onValueChange={() => handleToggle('autoPlayVoice', (user as any)?.autoPlayVoice)}
                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                disabled={loading}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleDanger}>Danger Zone</Text>
          <View style={[styles.card, styles.cardDanger]}>
            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
              <View style={styles.rowLeft}>
                <Feather name="trash-2" size={20} color="#ef4444" />
                <Text style={styles.rowTextDanger}>Delete Account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TwoFactorModal
        visible={twoFaModalVisible}
        onClose={() => setTwoFaModalVisible(false)}
        isEnabling={isEnabling2Fa}
        onSuccess={() => setTwoFaModalVisible(false)}
      />
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
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 8,
  },
  sectionTitleDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fca5a5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#f4f4f5',
  },
  rowTextDanger: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginLeft: 48,
  }
});
