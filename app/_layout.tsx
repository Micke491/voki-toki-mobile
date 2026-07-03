import { Stack } from 'expo-router';
import { AuthProvider } from '../src/features/auth/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="tabs" />
        <Stack.Screen name="chat/[chatId]" />
      </Stack>
    </AuthProvider>
  );
}
