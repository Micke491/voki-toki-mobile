import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ForgotPasswordForm } from '../../src/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ForgotPasswordForm />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
