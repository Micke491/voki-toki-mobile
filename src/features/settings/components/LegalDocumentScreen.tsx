import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, SettingsHeader } from './ui';

type DocumentType = 'terms' | 'privacy' | 'moderation';
type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] };
type Document = { title: string; updated: string; icon: keyof typeof Feather.glyphMap; tint: string; notice?: string; sections: LegalSection[] };

const DOCUMENTS: Record<DocumentType, Document> = {
  terms: {
    title: 'Terms of Service', updated: 'Last updated: July 19, 2026', icon: 'file-text', tint: '#3b82f6',
    notice: 'Before launch, add the operator’s legal name, address, support email, governing law, and dispute process. This template is not legal advice.',
    sections: [
      { title: '1. Acceptance of Terms', paragraphs: ['By creating an account or using VokiToki, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.'] },
      { title: '2. Eligibility and Account Security', paragraphs: ['You must provide accurate account information and keep your credentials confidential. Do not use VokiToki if you are below the minimum age required by the laws that apply to you.'] },
      { title: '3. Acceptable Use', paragraphs: ['You must not use VokiToki to:'], bullets: ['Harass, threaten, abuse, impersonate, exploit, or harm others.', 'Send spam, unauthorized advertising, or illegal, infringing, or harmful material.', 'Evade a restriction or interfere with the security or operation of the service.'] },
      { title: '4. Moderation and Enforcement', paragraphs: ['We may investigate reports and remove content, limit features, mute, suspend, or permanently terminate an account that violates these Terms or creates a safety or security risk. We may act immediately for serious violations. Where appropriate, we will explain the action and provide a way to contact us about it.'] },
      { title: '5. Your Content', paragraphs: ['You keep ownership of content you submit. You give VokiToki the limited permission needed to host, process, transmit, display, and store that content to operate and improve the service, enforce these Terms, and keep users safe.'] },
      { title: '6. Availability and Changes', paragraphs: ['We may change, suspend, or discontinue features when reasonably necessary. We may update these Terms and will announce material changes through the service or another reasonable channel.'] },
      { title: '7. Disclaimers and Liability', paragraphs: ['VokiToki is provided on an “as available” basis. To the extent permitted by law, we do not guarantee uninterrupted, error-free, or completely secure service. Nothing in these Terms limits rights that cannot legally be limited.'] },
    ],
  },
  privacy: {
    title: 'Privacy Policy', updated: 'Last updated: July 19, 2026', icon: 'shield', tint: '#6366f1',
    notice: 'Before launch, replace the legal-entity and privacy-contact placeholders, confirm every provider and retention practice, and obtain legal review for your launch jurisdictions.',
    sections: [
      { title: '1. Who We Are and Contact', paragraphs: ['VokiToki is operated by [INSERT LEGAL NAME AND ADDRESS]. For privacy requests, contact [INSERT PRIVACY CONTACT EMAIL]. Replace these placeholders before publishing.'] },
      { title: '2. Information We Collect', paragraphs: ['We collect account and profile information such as username, email address, password hash, display name, bio, avatar, links, location and gender if you choose to provide them. We also process messages, media, stories, reactions, read receipts, device/session information, notification tokens, reports, and service logs needed to operate and secure VokiToki.'] },
      { title: '3. How We Use Information', paragraphs: ['We use information to provide messaging, profiles, stories, calls, notifications, account security, support, moderation, abuse prevention, and service improvement. The legal basis depends on the use: performance of our contract with you, consent where required, compliance with legal obligations, and our legitimate interests in security, fraud prevention, and keeping the service safe.'] },
      { title: '4. Service Providers and Sharing', paragraphs: ['We use MongoDB for application data, Cloudinary for media storage, Firebase Cloud Messaging for notifications, Brevo for transactional email, Google STUN/TURN services where configured for call connectivity, Giphy for GIF search, and Google Gemini for the optional AI Assistant. We may also disclose information when required by law or to protect users, the public, or our rights.'] },
      { title: '5. AI Assistant', paragraphs: ['When you use the optional AI Assistant, your prompts and any files you choose to send to it are transmitted to Google Gemini to generate a response. Do not send sensitive information to the AI Assistant unless you understand and accept this processing. AI responses may be inaccurate.'] },
      { title: '6. Calls and Location', paragraphs: ['Voice and video calls use WebRTC and are designed to connect participants directly where possible. Call setup signaling passes through our service and connectivity may use STUN or TURN services. We do not intentionally record call audio or video. If you choose to add location to your profile, the app requests location permission and uses it for that profile feature.'] },
      { title: '7. Retention and Account Deletion', paragraphs: ['We retain personal data only for as long as needed for the purposes described here. When you delete an account, the account record is deleted; messages or media already delivered to other users may remain in their conversations, and limited information may be retained where necessary for security, abuse investigations, backups, legal obligations, or legal claims.'] },
      { title: '8. Your Rights', paragraphs: ['Depending on where you live, you may request access, correction, deletion, restriction, objection, or portability of your personal data, and may withdraw consent where processing relies on consent. Contact us using the privacy email above.'] },
      { title: '9. International Transfers and Security', paragraphs: ['Our providers may process information in countries other than yours. We use reasonable technical and organizational safeguards, including access controls and password hashing, but no online service can guarantee absolute security.'] },
      { title: '10. Children, Changes, and Complaints', paragraphs: ['VokiToki is not intended for users below the minimum age required by applicable law. We may update this Policy and will update the date above. You may also have the right to complain to your local data-protection authority.'] },
    ],
  },
  moderation: {
    title: 'Moderation Policy', updated: 'Last updated: July 19, 2026', icon: 'flag', tint: '#f59e0b',
    notice: 'Before launch, replace [INSERT MODERATION CONTACT EMAIL] with a monitored support address.',
    sections: [
      { title: '1. Reporting', paragraphs: ['Users can report accounts, messages, stories, and groups in the app. Reports may include the selected category and details supplied by the reporter.'] },
      { title: '2. Review and Outcomes', paragraphs: ['We review reports in a timely, diligent, non-arbitrary, and objective manner. We may take no action, remove content, warn a user, limit features, mute, temporarily suspend, or permanently ban an account. Serious safety or security issues may result in immediate action.'] },
      { title: '3. Reasons and Appeals', paragraphs: ['Where appropriate, we will tell an affected user what action was taken and why. To request a review, contact [INSERT MODERATION CONTACT EMAIL] with the account username and relevant details.'] },
      { title: '4. Evidence and False Reports', paragraphs: ['We may keep limited report and moderation records for safety, fraud prevention, and legal claims, then delete or anonymize them when no longer needed. Knowingly false or abusive reports may lead to restrictions.'] },
    ],
  },
};

export function LegalDocumentScreen({ type }: { type: DocumentType }) {
  const { colors } = useTheme();
  const document = DOCUMENTS[type];
  return <View style={[styles.container, { backgroundColor: colors.background }]}><SettingsHeader title={document.title} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.heroCard}><View style={[styles.iconWrap, { backgroundColor: `${document.tint}20`, borderColor: `${document.tint}45` }]}><Feather name={document.icon} size={24} color={document.tint} /></View><View style={styles.heroText}><Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{document.title}</Text><Text style={[styles.updated, { color: colors.textTertiary }]}>{document.updated}</Text></View></Card>
      {document.sections.map((section) => <View key={section.title} style={styles.section}><Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>{section.paragraphs.map((paragraph) => <Text key={paragraph} style={[styles.body, { color: colors.textSecondary }]}>{paragraph}</Text>)}{section.bullets?.map((bullet) => <View key={bullet} style={styles.bulletRow}><Text style={[styles.bullet, { color: document.tint }]}>•</Text><Text style={[styles.bulletText, { color: colors.textSecondary }]}>{bullet}</Text></View>)}</View>)}
      {document.notice ? <View style={[styles.notice, { backgroundColor: 'rgba(245, 158, 11, 0.10)', borderColor: 'rgba(245, 158, 11, 0.28)' }]}><Text style={[styles.noticeTitle, { color: '#fbbf24' }]}>Action required before launch</Text><Text style={[styles.noticeText, { color: colors.textSecondary }]}>{document.notice}</Text></View> : null}
    </ScrollView></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 20, paddingBottom: 48 }, heroCard: { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 28 }, iconWrap: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 14 }, heroText: { flex: 1 }, heroTitle: { fontSize: 20, fontWeight: '800' }, updated: { fontSize: 12, fontWeight: '600', marginTop: 3 }, section: { marginBottom: 26, paddingHorizontal: 4 }, sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 9 }, body: { fontSize: 14, lineHeight: 22 }, bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingRight: 8 }, bullet: { width: 20, fontSize: 18, lineHeight: 21, fontWeight: '800' }, bulletText: { flex: 1, fontSize: 14, lineHeight: 21 }, notice: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 2 }, noticeTitle: { fontSize: 14, fontWeight: '800', marginBottom: 5 }, noticeText: { fontSize: 13, lineHeight: 19 },
});
