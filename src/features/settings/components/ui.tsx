import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Animated, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../../theme/ThemeContext';

export type Feedback = { type: 'success' | 'error'; message: string } | null;

/* ------------------------------------------------------------------ */
/* Screen scaffold                                                     */
/* ------------------------------------------------------------------ */

export function SettingsHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={[headerStyles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[headerStyles.backButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={headerStyles.titleWrap}>
        <Text style={[headerStyles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[headerStyles.subtitle, { color: colors.textTertiary }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 11, marginTop: 1, fontWeight: '600' },
});

/* ------------------------------------------------------------------ */
/* Sections & rows                                                     */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[sectionStyles.label, { color: color || colors.textSecondary }]}>{children}</Text>
  );
}

export function Card({ children, danger, style }: PropsWithChildren<{ danger?: boolean; style?: any }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        sectionStyles.card,
        {
          backgroundColor: danger ? colors.dangerSoft : colors.surface,
          borderColor: danger ? 'rgba(239, 68, 68, 0.25)' : colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[sectionStyles.divider, { backgroundColor: colors.border }]} />;
}

interface IconChipProps {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
}

export function IconChip({ icon, tint }: IconChipProps) {
  return (
    <View style={[sectionStyles.iconChip, { backgroundColor: `${tint}22` }]}>
      <Feather name={icon} size={17} color={tint} />
    </View>
  );
}

interface RowProps {
  icon: keyof typeof Feather.glyphMap;
  tint?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function Row({ icon, tint, title, subtitle, onPress, right, chevron, danger, disabled }: RowProps) {
  const { colors } = useTheme();
  const effectiveTint = danger ? colors.danger : (tint || colors.accent);
  const content = (
    <View style={[sectionStyles.row, disabled && { opacity: 0.5 }]}>
      <IconChip icon={icon} tint={effectiveTint} />
      <View style={sectionStyles.rowTextWrap}>
        <Text style={[sectionStyles.rowTitle, { color: danger ? colors.danger : colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[sectionStyles.rowSubtitle, { color: colors.textTertiary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron && <Feather name="chevron-right" size={19} color={colors.textTertiary} />}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.65}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

interface ToggleRowProps extends Omit<RowProps, 'right' | 'chevron' | 'onPress'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ToggleRow({ value, onValueChange, disabled, ...rowProps }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <Row
      {...rowProps}
      disabled={disabled}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: colors.borderStrong, true: colors.accent }}
          thumbColor="#ffffff"
        />
      }
    />
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 6,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: { height: 1, marginLeft: 62 },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});

/* ------------------------------------------------------------------ */
/* Feedback toast                                                      */
/* ------------------------------------------------------------------ */

export function FeedbackToast({ feedback, onHide }: { feedback: Feedback; onHide: () => void }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!feedback) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onHide());
    }, 3200);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  const tint = isSuccess ? colors.success : colors.danger;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        toastStyles.toast,
        {
          opacity,
          backgroundColor: colors.surface,
          borderColor: `${tint}55`,
          shadowColor: tint,
        },
      ]}
    >
      <Feather name={isSuccess ? 'check-circle' : 'alert-triangle'} size={16} color={tint} />
      <Text style={[toastStyles.toastText, { color: colors.textPrimary }]} numberOfLines={2}>
        {feedback.message}
      </Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 100,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  toastText: { flex: 1, fontSize: 13, fontWeight: '700' },
});
