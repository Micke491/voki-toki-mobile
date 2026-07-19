import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, SettingsHeader } from './ui';

const FAQS = [
  {
    question: 'How do I start a voice or video call?',
    answer: 'Open any chat conversation and look for the phone or video camera icons in the top right corner of the chat header. Tap one to initiate a call.',
  },
  {
    question: 'How does the AI Assistant work?',
    answer: "VokiToki features an integrated AI. Open 'AI Assistant' to chat with it. You can change its personality (Friendly, Coding, Coach, or Sarcastic) in Settings > AI Assistant.",
  },
  {
    question: 'How do I enable Two-Factor Authentication (2FA)?',
    answer: "Go to Settings > Privacy & Security and tap 'Two-Step Verification (2FA)'. We will send a code to your registered email to verify and enable the feature.",
  },
  {
    question: 'How long do stories last?',
    answer: 'Stories automatically expire and are deleted 24 hours after they are posted.',
  },
  {
    question: 'How do I block someone?',
    answer: "Open a chat with the user, use the conversation menu, and select 'Block User'. You can manage blocked users in Settings > Privacy & Security.",
  },
];

export function HelpSupportScreen() {
  const { colors } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Help & Support" subtitle="Frequently asked questions and guides" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Feather name="life-buoy" size={25} color="#10b981" />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>How can we help?</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Find quick answers about VokiToki.</Text>
          </View>
        </Card>

        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <Card key={faq.question} style={styles.faqCard}>
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={() => setOpenIndex(isOpen ? null : index)}
                  style={styles.questionRow}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Text style={[styles.question, { color: colors.textPrimary }]}>{faq.question}</Text>
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={isOpen ? '#10b981' : colors.textTertiary} />
                </TouchableOpacity>
                {isOpen ? (
                  <Text style={[styles.answer, { color: colors.textSecondary, borderTopColor: colors.border }]}>{faq.answer}</Text>
                ) : null}
              </Card>
            );
          })}
        </View>

        <View style={[styles.supportCard, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}45` }]}>
          <Text style={[styles.supportTitle, { color: colors.textPrimary }]}>Still need help?</Text>
          <Text style={[styles.supportBody, { color: colors.textSecondary }]}>Check the project repository or open an issue.</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Linking.openURL('https://github.com/Micke491/chat-app')}
            style={[styles.repositoryButton, { backgroundColor: colors.accent }]}
            accessibilityRole="link"
          >
            <Feather name="github" size={16} color="#fff" />
            <Text style={styles.repositoryButtonText}>Visit Repository</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 22 },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 19, fontWeight: '800' },
  heroSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  faqList: { gap: 12 },
  faqCard: { padding: 0 },
  questionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  question: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  answer: { borderTopWidth: 1, padding: 16, paddingTop: 14, fontSize: 13, lineHeight: 21 },
  supportCard: { alignItems: 'center', marginTop: 26, padding: 22, borderRadius: 20, borderWidth: 1 },
  supportTitle: { fontSize: 16, fontWeight: '800' },
  supportBody: { fontSize: 13, textAlign: 'center', marginTop: 5, marginBottom: 16 },
  repositoryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  repositoryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
