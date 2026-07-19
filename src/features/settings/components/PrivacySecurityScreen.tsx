import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { settingsApi } from '../api';
import { TwoFactorModal } from './TwoFactorModal';
import {
  SettingsHeader, SectionLabel, Card, Row, ToggleRow, Divider, FeedbackToast, Feedback,
} from './ui';

export function PrivacySecurityScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthContext();
  const { colors } = useTheme();

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [savingReceipts, setSavingReceipts] = useState(false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [twoFaModalVisible, setTwoFaModalVisible] = useState(false);
  const [isEnabling2Fa, setIsEnabling2Fa] = useState(true);

  const readReceipts = user?.readReceipts ?? true;
  const twoFactorEnabled = user?.twoFactorEnabled ?? false;

  const toggleReadReceipts = async (value: boolean) => {
    if (!user) return;
    try {
      setSavingReceipts(true);
      const res = await settingsApi.updatePreferences({ readReceipts: value });
      updateUser(res.user);
      setFeedback({ type: 'success', message: value ? 'Read receipts enabled' : 'Read receipts disabled' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save preference.' });
    } finally {
      setSavingReceipts(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email || requestingPassword) return;
    try {
      setRequestingPassword(true);
      await settingsApi.requestPasswordReset(user.email);
      setFeedback({ type: 'success', message: 'Password reset link sent to your email.' });
    } catch {
      setFeedback({ type: 'error', message: 'Could not send request. Try again.' });
    } finally {
      setRequestingPassword(false);
    }
  };

  const handle2FAPress = () => {
    setIsEnabling2Fa(!twoFactorEnabled);
    setTwoFaModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Privacy & Security" />
      <FeedbackToast feedback={feedback} onHide={() => setFeedback(null)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <SectionLabel>Privacy</SectionLabel>
          <Card>
            <ToggleRow
              icon={readReceipts ? 'eye' : 'eye-off'}
              tint="#10b981"
              title="Read Receipts"
              subtitle="If turned off, you won't send read receipts — and you won't see them from other people either."
              value={readReceipts}
              onValueChange={toggleReadReceipts}
              disabled={savingReceipts}
            />
            <Divider />
            <Row
              icon="user-x"
              tint="#f43f5e"
              title="Blocked Users"
              subtitle="Manage contacts you have blocked from messaging you"
              onPress={() => router.push('/settings/blocked')}
              chevron
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel>Security</SectionLabel>
          <Card>
            <Row
              icon="lock"
              tint="#3b82f6"
              title="Account Password"
              subtitle={requestingPassword
                ? 'Sending reset link…'
                : 'Request a password change via your registered email'}
              onPress={handlePasswordReset}
              disabled={requestingPassword}
              chevron
            />
            <Divider />
            <Row
              icon="smartphone"
              tint={twoFactorEnabled ? '#22c55e' : '#8b5cf6'}
              title="Two-Step Verification (2FA)"
              subtitle={twoFactorEnabled
                ? 'Enabled — an email code is required to log in. Tap to disable.'
                : 'Add an extra layer of security requiring an email code to log in'}
              onPress={handle2FAPress}
              chevron
            />
            <Divider />
            <Row
              icon="monitor"
              tint="#06b6d4"
              title="Active Sessions & Devices"
              subtitle="Review logged-in devices and revoke access"
              onPress={() => router.push('/settings/sessions')}
              chevron
            />
          </Card>
        </View>
      </ScrollView>

      <TwoFactorModal
        visible={twoFaModalVisible}
        onClose={() => setTwoFaModalVisible(false)}
        isEnabling={isEnabling2Fa}
        onSuccess={() => {
          setTwoFaModalVisible(false);
          setFeedback({
            type: 'success',
            message: isEnabling2Fa ? '2FA enabled successfully' : '2FA disabled successfully',
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 24 },
});
