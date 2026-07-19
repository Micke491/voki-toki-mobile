import { Stack } from 'expo-router';
import { AuthProvider } from '../src/features/auth/context/AuthContext';
import { CallProvider } from '../src/features/calls/CallContext';
import { ThemeProvider } from '../src/features/theme/ThemeContext';
import { OfflineBanner } from '../src/components/OfflineBanner';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CallProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <OfflineBanner />
        </CallProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
