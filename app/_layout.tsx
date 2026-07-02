import { Slot } from 'expo-router';
import { AuthProvider } from '../src/features/auth/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}