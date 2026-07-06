import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useProfile } from '../hooks/useProfile';

export function ProfileScreen() {
  const { user, signOut } = useAuthContext();
  const { profile, loading, refresh } = useProfile();
  const router = useRouter();

  // Combine auth user and profile user
  const displayUser = profile?.user || user;

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const joinDate = displayUser?.createdAt 
    ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#2563eb" />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconButton}>
            <Feather name="settings" size={24} color="#f4f4f5" />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => router.push('/profile/edit')} style={styles.avatarContainer}>
            {displayUser?.avatar ? (
              <Image source={{ uri: displayUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(displayUser?.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{displayUser?.name || displayUser?.username}</Text>
          <Text style={styles.username}>@{displayUser?.username}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {displayUser?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{displayUser.bio}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            {displayUser?.location && (
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={20} color="#71717a" />
                <Text style={styles.detailText}>{displayUser.location}</Text>
              </View>
            )}
            {displayUser?.gender && (
              <View style={styles.detailRow}>
                <Feather name="user" size={20} color="#71717a" />
                <Text style={styles.detailText}>{displayUser.gender}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Feather name="calendar" size={20} color="#71717a" />
              <Text style={styles.detailText}>Joined {joinDate}</Text>
            </View>
          </View>
        </View>

        {displayUser?.links && displayUser.links.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Links</Text>
            <View style={styles.detailsCard}>
              {displayUser.links.map((link, index) => (
                <View key={index} style={styles.detailRow}>
                  <Feather name="link" size={20} color="#71717a" />
                  <View>
                    <Text style={styles.linkTitle}>{link.label}</Text>
                    <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => router.push('/profile/edit')}
          activeOpacity={0.8}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f4f4f5',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#27272a',
    borderRadius: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#18181b',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#a1a1aa',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f4f4f5',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    color: '#d4d4d8',
    fontSize: 16,
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  detailText: {
    color: '#d4d4d8',
    fontSize: 16,
  },
  linkTitle: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  linkUrl: {
    color: '#3b82f6',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
