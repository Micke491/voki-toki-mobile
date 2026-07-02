import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useForgotPassword } from '../hooks/useForgotPassword';

export const ForgotPasswordForm = () => {
  const router = useRouter();
  const { email, setEmail, loading, success, error, handleSubmit } = useForgotPassword();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recover Access</Text>
        <Text style={styles.subtitle}>Enter your email to reset your password</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {success ? (
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successText}>If an account exists for {email}, you'll receive a link shortly.</Text>
          <Button title="Back to Sign In" onPress={() => router.replace('/auth/login')} />
        </View>
      ) : (
        <>
          <Input 
            label="Email Address" 
            placeholder="you@example.com" 
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.spacer} />
          <Button title="Send Recovery Link" onPress={handleSubmit} loading={loading} />

          <View style={styles.footer}>
            <Link href="/auth/login" style={styles.linkTextBold}>
              Nevermind, I remembered
            </Link>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#09090b' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#f4f4f5' },
  subtitle: { color: '#a1a1aa', marginTop: 8, fontSize: 16, textAlign: 'center' },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 14 },
  successContainer: { marginTop: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#f4f4f5', textAlign: 'center', marginBottom: 8 },
  successText: { color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  spacer: { height: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  linkTextBold: { color: '#f4f4f5', fontWeight: 'bold', fontSize: 14 }
});