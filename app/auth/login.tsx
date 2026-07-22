import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm } from '../../src/features/auth/components/LoginForm';

export default function LoginScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LoginForm />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
