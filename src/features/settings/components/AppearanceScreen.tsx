import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { settingsApi } from '../api';
import { WALLPAPER_PRESETS } from '../../chat/utils/wallpaperPresets';
import {
  SettingsHeader, SectionLabel, Card, ToggleRow, Divider, FeedbackToast, Feedback,
} from './ui';

export function AppearanceScreen() {
  const { user, updateUser } = useAuthContext();
  const { colors, mode } = useTheme();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  const wallpaper = user?.defaultWallpaper || '';
  const autoPlayGifs = user?.autoPlayGifs ?? true;
  const autoPlayVoice = user?.autoPlayVoice ?? true;

  const savePreference = async (field: string, value: string | boolean, successMessage?: string) => {
    if (!user) return;
    try {
      setSaving(true);
      const res = await settingsApi.updatePreferences({ [field]: value } as any);
      updateUser(res.user);
      setFeedback({ type: 'success', message: successMessage || 'Preference saved' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to sync preference' });
    } finally {
      setSaving(false);
    }
  };

  const ThemeCard = ({ value, label, icon }: {
    value: 'light' | 'dark';
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }) => {
    const isSelected = mode === value;
    return (
      <TouchableOpacity
        style={[
          styles.themeCard,
          {
            borderColor: isSelected ? colors.accent : colors.border,
            backgroundColor: isSelected ? colors.accentSoft : colors.surface,
          },
        ]}
        onPress={() => savePreference('theme', value, `${label} enabled`)}
        disabled={saving}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.themePreview,
            value === 'dark'
              ? { backgroundColor: '#09090b', borderColor: '#27272a' }
              : { backgroundColor: '#fafafa', borderColor: '#e4e4e7' },
          ]}
        >
          <View style={[styles.themePreviewBubbleLeft, { backgroundColor: value === 'dark' ? '#27272a' : '#e4e4e7' }]} />
          <View style={styles.themePreviewBubbleRight} />
        </View>
        <View style={styles.themeLabelRow}>
          <Feather name={icon} size={15} color={isSelected ? colors.accent : colors.textTertiary} />
          <Text
            style={[
              styles.themeLabel,
              { color: isSelected ? colors.accent : colors.textSecondary },
            ]}
          >
            {label}
          </Text>
        </View>
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={11} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const WallpaperTile = ({
    name, gradientColors, value,
  }: {
    name: string;
    gradientColors: [string, string, ...string[]] | null;
    value: string;
  }) => {
    const isSelected = wallpaper === value;
    return (
      <TouchableOpacity
        style={[
          styles.wallpaperTile,
          { borderColor: isSelected ? colors.accent : colors.border },
        ]}
        onPress={() => savePreference(
          'defaultWallpaper', value, value ? `Wallpaper set: ${name}` : 'Wallpaper reset to default'
        )}
        disabled={saving}
        activeOpacity={0.8}
      >
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
        )}
        {/* chat bubble mockup */}
        {gradientColors ? (
          <View style={styles.bubbleMockup}>
            <View style={[styles.mockBubble, styles.mockBubbleLeft, { width: '62%' }]} />
            <View style={[styles.mockBubble, styles.mockBubbleLeft, { width: '42%' }]} />
            <View style={[styles.mockBubble, styles.mockBubbleRight, { width: '52%' }]} />
            <View style={[styles.mockBubble, styles.mockBubbleRight, { width: '34%' }]} />
          </View>
        ) : (
          <View style={styles.noneWrap}>
            <Feather name="x" size={18} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.wallpaperLabelWrap}>
          <Text style={styles.wallpaperLabel} numberOfLines={1}>{name}</Text>
        </View>
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={11} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Appearance" />
      <FeedbackToast feedback={feedback} onHide={() => setFeedback(null)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <SectionLabel>Theme</SectionLabel>
          <View style={styles.themeRow}>
            <ThemeCard value="light" label="Light Mode" icon="sun" />
            <ThemeCard value="dark" label="Dark Mode" icon="moon" />
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Your theme syncs with your account and the web app. On mobile it currently
            applies to the settings screens; more screens are coming.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionLabel>Default Chat Wallpaper</SectionLabel>
          <Text style={[styles.hint, { color: colors.textTertiary, marginBottom: 12 }]}>
            Choose a default background for your chat conversations
          </Text>
          <View style={styles.wallpaperGrid}>
            <WallpaperTile name="Default" gradientColors={null} value="" />
            {WALLPAPER_PRESETS.map(preset => (
              <WallpaperTile
                key={preset.name}
                name={preset.name}
                gradientColors={preset.colors}
                value={preset.value}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Media Autoplay</SectionLabel>
          <Card>
            <ToggleRow
              icon="film"
              tint="#06b6d4"
              title="Autoplay GIFs"
              subtitle="GIFs in chats and Giphy search start moving immediately"
              value={autoPlayGifs}
              onValueChange={v => savePreference('autoPlayGifs', v, v ? 'GIF autoplay on' : 'GIF autoplay off')}
              disabled={saving}
            />
            <Divider />
            <ToggleRow
              icon="volume-2"
              tint="#8b5cf6"
              title="Autoplay Consecutive Voice Notes"
              subtitle="The next voice note plays automatically when the previous one finishes"
              value={autoPlayVoice}
              onValueChange={v => savePreference('autoPlayVoice', v, v ? 'Voice autoplay on' : 'Voice autoplay off')}
              disabled={saving}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const TILE_ASPECT = 3 / 4;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 28 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 10, marginLeft: 6 },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 74,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 6,
  },
  themePreviewBubbleLeft: {
    alignSelf: 'flex-start',
    width: '62%',
    height: 9,
    borderRadius: 5,
  },
  themePreviewBubbleRight: {
    alignSelf: 'flex-end',
    width: '48%',
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  themeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  themeLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallpaperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wallpaperTile: {
    width: '31%',
    aspectRatio: TILE_ASPECT,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  bubbleMockup: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  mockBubble: { height: 7, borderRadius: 4 },
  mockBubbleLeft: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)' },
  mockBubbleRight: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.24)' },
  noneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wallpaperLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  wallpaperLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
