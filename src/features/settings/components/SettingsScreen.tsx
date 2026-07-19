import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { SettingsHeader, SectionLabel, Card, Row, Divider } from './ui';

const PERSONA_LABELS: Record<string, string> = {
  default: 'Friendly Assistant',
  coding: 'Expert Engineer',
  coach: 'Life Coach',
  sarcastic: 'Sarcastic Wit',
};

export function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const { colors, mode } = useTheme();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const avatarLetter = (user?.username || 'U').charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Settings" subtitle="Manage your preferences and account" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/profile/edit')}>
          <LinearGradient
            colors={['#2563eb', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileAvatarRing}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                  <Text style={styles.profileAvatarLetter}>{avatarLetter}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name || user?.username || 'You'}
              </Text>
              <Text style={styles.profileHandle} numberOfLines={1}>@{user?.username}</Text>
              <View style={styles.profileEditPill}>
                <Feather name="edit-3" size={11} color="#fff" />
                <Text style={styles.profileEditText}>Edit profile</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Account */}
        <View style={styles.section}>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <Row
              icon="user"
              tint="#3b82f6"
              title="Profile Information"
              subtitle="Avatar, name, username, bio, gender, location, links"
              onPress={() => router.push('/profile/edit')}
              chevron
            />
          </Card>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <SectionLabel>Preferences</SectionLabel>
          <Card>
            <Row
              icon="shield"
              tint="#10b981"
              title="Privacy & Security"
              subtitle="Read receipts, blocked users, 2FA, sessions"
              onPress={() => router.push('/settings/privacy')}
              chevron
            />
            <Divider />
            <Row
              icon="bell"
              tint="#f59e0b"
              title="Notifications"
              subtitle="Muted conversations"
              onPress={() => router.push('/settings/notifications')}
              chevron
            />
            <Divider />
            <Row
              icon="droplet"
              tint="#8b5cf6"
              title="Appearance"
              subtitle={`${mode === 'dark' ? 'Dark' : 'Light'} theme, chat wallpaper, media autoplay`}
              onPress={() => router.push('/settings/appearance')}
              chevron
            />
            <Divider />
            <Row
              icon="cpu"
              tint="#ec4899"
              title="AI Assistant"
              subtitle={`Persona: ${PERSONA_LABELS[user?.botPersona || 'default']}`}
              onPress={() => router.push('/settings/ai')}
              chevron
            />
          </Card>
        </View>

        {/* Session */}
        <View style={styles.section}>
          <SectionLabel>Session</SectionLabel>
          <Card>
            <Row
              icon="log-out"
              tint={colors.textSecondary}
              title="Sign Out"
              subtitle="Sign out on this device only"
              onPress={handleSignOut}
            />
          </Card>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <SectionLabel color={colors.danger}>Danger Zone</SectionLabel>
          <Card danger>
            <Row
              icon="trash-2"
              title="Delete Account"
              subtitle="Permanently remove all your data, messages, and chats"
              onPress={() => router.push('/settings/danger')}
              chevron
              danger
            />
          </Card>
        </View>

        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Vokitoki · Settings sync with the web app
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    marginBottom: 26,
  },
  profileAvatarRing: {
    padding: 3,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  profileAvatar: { width: 58, height: 58, borderRadius: 29 },
  profileAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarLetter: { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profileHandle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1, fontWeight: '600' },
  profileEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 7,
  },
  profileEditText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  section: { marginBottom: 24 },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
});
