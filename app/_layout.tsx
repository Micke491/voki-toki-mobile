import { Stack } from 'expo-router';
import { AuthProvider } from '../src/features/auth/context/AuthContext';
import { CallProvider } from '../src/features/calls/CallContext';
import { ThemeProvider } from '../src/features/theme/ThemeContext';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { ServerGate } from '../src/components/ServerGate';
import { NotificationsManager } from '../src/features/notifications/NotificationsManager';

export default function RootLayout() {
  return (
    <>
      <ServerGate>
        <AuthProvider>
          <ThemeProvider>
            <CallProvider>
              <NotificationsManager />
              <Stack screenOptions={{ headerShown: false }} />
            </CallProvider>
          </ThemeProvider>
        </AuthProvider>
      </ServerGate>
      <OfflineBanner />
    </>
  );
}
