import { Stack } from 'expo-router';
import { AuthProvider } from '../src/features/auth/context/AuthContext';
import { CallProvider } from '../src/features/calls/CallContext';
import { ThemeProvider } from '../src/features/theme/ThemeContext';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { ServerGate } from '../src/components/ServerGate';
import { NotificationsManager } from '../src/features/notifications/NotificationsManager';
import { InAppNotificationBanner } from '../src/features/notifications/InAppNotificationBanner';
import { AnnouncementModal } from '../src/features/announcements/AnnouncementModal';
import { RestrictionBanner } from '../src/features/moderation/RestrictionBanner';

export default function RootLayout() {
  return (
    <>
      <ServerGate>
        <AuthProvider>
          <ThemeProvider>
            <CallProvider>
              <NotificationsManager />
              <Stack screenOptions={{ headerShown: false }} />
              <InAppNotificationBanner />
              <RestrictionBanner />
              <AnnouncementModal />
            </CallProvider>
          </ThemeProvider>
        </AuthProvider>
      </ServerGate>
      <OfflineBanner />
    </>
  );
}
