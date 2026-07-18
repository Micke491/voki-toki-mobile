import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { chatApi } from '../api';
import { UserProfile } from '../types';
import { getAvatarColor } from '../utils/format';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

function formatJoinDate(createdAt?: string): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export const UserProfileModal = ({ isOpen, onClose, userId }: UserProfileModalProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatApi.getUserProfile(id);
      setProfile(data);
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile(userId);
    } else if (!isOpen) {
      setProfile(null);
      setError(null);
    }
  }, [isOpen, userId]);

  // Only mount the native Modal window while actually open — nesting a
  // permanently-mounted Modal inside ChatSidebar's own Modal crashes on Android.
  if (!isOpen) return null;

  const openLink = (url: string) => {
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => {});
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          {/* Header banner */}
          <View style={styles.banner}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(userId || 'x') }]}>
                <Text style={styles.avatarText}>{profile?.username?.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.stateText}>Loading profile...</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => userId && fetchProfile(userId)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : profile ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.name}>{profile.name || profile.username}</Text>
              <Text style={styles.username}>@{profile.username}</Text>

              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              <View style={styles.infoList}>
                {profile.location ? (
                  <View style={styles.infoRow}>
                    <Feather name="map-pin" size={16} color="#71717a" />
                    <Text style={styles.infoText}>{profile.location}</Text>
                  </View>
                ) : null}

                {profile.links?.map((link, index) => (
                  <TouchableOpacity key={index} style={styles.infoRow} onPress={() => openLink(link.url)}>
                    <Feather name="link" size={16} color="#3b82f6" />
                    <Text style={[styles.infoText, styles.linkText]} numberOfLines={1}>
                      {link.label || link.url}
                    </Text>
                  </TouchableOpacity>
                ))}

                {profile.createdAt ? (
                  <View style={styles.infoRow}>
                    <Feather name="calendar" size={16} color="#71717a" />
                    <Text style={styles.infoText}>Joined {formatJoinDate(profile.createdAt)}</Text>
                  </View>
                ) : null}
              </View>

              {profile.activeStoriesCount && profile.activeStoriesCount > 0 ? (
                <View style={styles.storiesRow}>
                  <Text style={styles.storiesText}>
                    {profile.activeStoriesCount} active highlight{profile.activeStoriesCount > 1 ? 's' : ''}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#09090b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  banner: {
    height: 96,
    backgroundColor: '#2563eb',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -48,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
    minHeight: 160,
  },
  stateText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  name: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: 'bold',
  },
  username: {
    color: '#71717a',
    fontSize: 14,
    marginTop: 2,
  },
  bio: {
    color: '#d4d4d8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  infoList: {
    alignSelf: 'stretch',
    marginTop: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#a1a1aa',
    fontSize: 14,
    flexShrink: 1,
  },
  linkText: {
    color: '#3b82f6',
  },
  storiesRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  storiesText: {
    color: '#71717a',
    fontSize: 13,
  },
});
