import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { profileApi } from '../../profile/api';
import { SettingsHeader, FeedbackToast, Feedback } from './ui';

export function DangerZoneScreen() {
  const { signOut } = useAuthContext();
  const { colors } = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const canDelete = confirmText === 'DELETE' && !deleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      setDeleting(true);
      await profileApi.deleteAccount();
      await signOut();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to delete account.' });
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Danger Zone" />
      <FeedbackToast feedback={feedback} onHide={() => setFeedback(null)} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.warningCard, { backgroundColor: colors.dangerSoft, borderColor: 'rgba(239,68,68,0.3)' }]}>
          <View style={styles.warningHeader}>
            <View style={styles.warningIcon}>
              <Feather name="alert-triangle" size={26} color="#ef4444" />
            </View>
            <View style={styles.warningTitleWrap}>
              <Text style={[styles.warningTitle, { color: colors.textPrimary }]}>Delete Account</Text>
              <Text style={styles.warningBadge}>THIS CANNOT BE UNDONE</Text>
            </View>
          </View>

          <Text style={[styles.warningBody, { color: colors.textSecondary }]}>
            You are about to permanently delete your account. All of your data, messages,
            chats, stories, and personalized settings will be completely removed.
          </Text>

          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>
            Type <Text style={styles.deleteWord}>DELETE</Text> to confirm:
          </Text>
          <TextInput
            style={[
              styles.confirmInput,
              {
                backgroundColor: colors.input,
                borderColor: confirmText === 'DELETE' ? '#ef4444' : 'rgba(239,68,68,0.35)',
                color: colors.textPrimary,
              },
            ]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE here"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
          />

          <TouchableOpacity
            style={[styles.deleteButton, { opacity: canDelete ? 1 : 0.45 }]}
            onPress={handleDelete}
            disabled={!canDelete}
            activeOpacity={0.85}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="trash-2" size={17} color="#fff" />
            )}
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting…' : 'Delete Forever'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  warningCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  warningIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitleWrap: { flex: 1 },
  warningTitle: { fontSize: 20, fontWeight: '900' },
  warningBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 1.4,
    marginTop: 3,
  },
  warningBody: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  confirmLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  deleteWord: { color: '#ef4444', fontWeight: '900' },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    borderRadius: 16,
  },
  deleteButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
