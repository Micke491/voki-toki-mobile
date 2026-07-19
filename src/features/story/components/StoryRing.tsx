import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Same colors as the web StoryRing: unviewed stories get the Instagram-style
// yellow-400 -> red-500 -> purple-600 gradient (bg-gradient-to-tr), viewed
// stories get the chat border gray, no story means no ring at all.
export const STORY_GRADIENT = ['#facc15', '#ef4444', '#9333ea'] as const;
export const STORY_VIEWED_RING = '#27272a';
const RING_GAP_BG = '#09090b';
const AVATAR_BG = '#18181b';

const SIZE_PRESETS = { sm: 40, md: 64, lg: 96 } as const;

interface StoryRingProps {
  avatarUrl?: string;
  username: string;
  hasStory?: boolean;
  hasUnviewedStory: boolean;
  size?: keyof typeof SIZE_PRESETS | number;
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const StoryRing = ({
  avatarUrl,
  username,
  hasStory = false,
  hasUnviewedStory,
  size = 'md',
  onPress,
  label,
  disabled,
  accessibilityLabel,
}: StoryRingProps) => {
  const outer = typeof size === 'number' ? size : SIZE_PRESETS[size];
  const ringWidth = outer >= 96 ? 3 : 2;
  const gapWidth = outer >= 96 ? 3 : 2;
  const inset = hasStory ? ringWidth + gapWidth : 0;
  const avatarSize = outer - inset * 2;

  const avatar = (
    <View style={[styles.avatarClip, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={[styles.avatarLetter, { fontSize: Math.max(12, avatarSize * 0.34) }]}>
            {(username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );

  const ringStyle = { width: outer, height: outer, borderRadius: outer / 2 };
  const gapStyle = {
    width: outer - ringWidth * 2,
    height: outer - ringWidth * 2,
    borderRadius: (outer - ringWidth * 2) / 2,
  };

  const content = !hasStory ? (
    <View style={[styles.center, ringStyle]}>{avatar}</View>
  ) : hasUnviewedStory ? (
    <LinearGradient
      colors={STORY_GRADIENT}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={[styles.center, ringStyle]}
    >
      <View style={[styles.center, styles.gap, gapStyle]}>{avatar}</View>
    </LinearGradient>
  ) : (
    <View style={[styles.center, ringStyle, { backgroundColor: STORY_VIEWED_RING }]}>
      <View style={[styles.center, styles.gap, gapStyle]}>{avatar}</View>
    </View>
  );

  return (
    <View style={styles.column}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled || !onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
      {label != null && label !== '' && (
        <Text style={[styles.label, { maxWidth: outer + 12 }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gap: {
    backgroundColor: RING_GAP_BG,
  },
  avatarClip: {
    overflow: 'hidden',
    backgroundColor: AVATAR_BG,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#2563eb',
    fontWeight: '700',
  },
  label: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
});
