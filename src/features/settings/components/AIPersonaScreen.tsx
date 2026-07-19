import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { settingsApi } from '../api';
import { BotPersona } from '../../../types';
import { SettingsHeader, FeedbackToast, Feedback } from './ui';

interface PersonaOption {
  id: BotPersona;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  gradient: [string, string];
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'default',
    label: 'Friendly Assistant',
    description: 'Helpful, clear, and concise. Great for general questions and everyday tasks.',
    icon: 'user',
    gradient: ['#6366f1', '#9333ea'],
  },
  {
    id: 'coding',
    label: 'Expert Engineer',
    description: 'Speaks in code. Best practices, clean solutions, and technical depth.',
    icon: 'code',
    gradient: ['#06b6d4', '#2563eb'],
  },
  {
    id: 'coach',
    label: 'Life Coach',
    description: 'Motivating, goal-oriented, and uplifting. Push yourself further.',
    icon: 'award',
    gradient: ['#f59e0b', '#ea580c'],
  },
  {
    id: 'sarcastic',
    label: 'Sarcastic Wit',
    description: 'Playfully mocking but always helpful. Banter included at no extra charge.',
    icon: 'zap',
    gradient: ['#ec4899', '#e11d48'],
  },
];

export function AIPersonaScreen() {
  const { user, updateUser } = useAuthContext();
  const { colors } = useTheme();
  const currentPersona: BotPersona = user?.botPersona || 'default';
  const [selected, setSelected] = useState<BotPersona>(currentPersona);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleSave = async () => {
    if (saving || selected === currentPersona) return;
    try {
      setSaving(true);
      const res = await settingsApi.updatePreferences({ botPersona: selected });
      updateUser(res.user);
      setFeedback({ type: 'success', message: 'AI persona updated!' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update AI persona.' });
    } finally {
      setSaving(false);
    }
  };

  const dirty = selected !== currentPersona;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="AI Assistant" />
      <FeedbackToast feedback={feedback} onHide={() => setFeedback(null)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <LinearGradient
            colors={['#2563eb', '#9333ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.introIcon}
          >
            <Feather name="cpu" size={22} color="#fff" />
          </LinearGradient>
          <View style={styles.introTextWrap}>
            <Text style={[styles.introTitle, { color: colors.textPrimary }]}>Choose a personality</Text>
            <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
              How your AI companion talks to you
            </Text>
          </View>
        </View>

        {PERSONAS.map(persona => {
          const isSelected = selected === persona.id;
          return (
            <TouchableOpacity
              key={persona.id}
              onPress={() => setSelected(persona.id)}
              activeOpacity={0.75}
              style={[
                styles.personaCard,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: isSelected ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <LinearGradient
                colors={persona.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.personaIcon}
              >
                <Feather name={persona.icon} size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.personaTextWrap}>
                <Text style={[styles.personaLabel, { color: colors.textPrimary }]}>{persona.label}</Text>
                <Text style={[styles.personaDescription, { color: colors.textSecondary }]}>
                  {persona.description}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Feather name="check" size={13} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={[styles.noteBox, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}44` }]}>
          <Feather name="star" size={15} color={colors.accent} style={{ marginTop: 1 }} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Your selected persona applies to all new and existing AI chats. You can change it at any time.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !dirty}
          activeOpacity={0.85}
          style={{ opacity: saving || !dirty ? 0.5 : 1 }}
        >
          <LinearGradient
            colors={['#2563eb', '#9333ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="check-circle" size={17} color="#fff" />
            )}
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Persona'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextWrap: { flex: 1 },
  introTitle: { fontSize: 19, fontWeight: '800' },
  introSubtitle: { fontSize: 13, marginTop: 2 },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 12,
  },
  personaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaTextWrap: { flex: 1 },
  personaLabel: { fontSize: 15, fontWeight: '800' },
  personaDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 18,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: 18,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
