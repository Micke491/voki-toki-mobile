import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RegisterForm } from '../../src/features/auth/components/RegisterForm';

export default function RegisterScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RegisterForm />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
