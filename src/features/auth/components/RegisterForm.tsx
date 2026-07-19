import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useRegister } from '../hooks/useRegister';

export const RegisterForm = () => {
  const router = useRouter();
  const { 
    username, setUsername, email, setEmail,
    password, setPassword, confirmPassword, setConfirmPassword,
    loading, error, success, handleRegister
  } = useRegister();

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Account Created!</Text>
          <Text style={styles.subtitle}>{success}</Text>
        </View>
        <Button title="Go to Login" onPress={() => router.replace('/auth/login')} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join VokiToki today</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input 
          label="Username" 
          placeholder="johndoe" 
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Input 
          label="Email Address" 
          placeholder="you@example.com" 
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <Input 
          label="Password" 
          placeholder="••••••••" 
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        <Input 
          label="Confirm Password" 
          placeholder="••••••••" 
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
        />

        <View style={styles.spacer} />

        <Text style={styles.termsText}>
          By creating an account, you agree to our{' '}
          <Link href="/settings/terms" style={styles.termsLink}>Terms of Service</Link>
          {' '}and{' '}
          <Link href="/settings/privacy-policy" style={styles.termsLink}>Privacy Policy</Link>.
        </Text>

        <Button title="Create Account" onPress={handleRegister} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/auth/login" style={styles.linkTextBold}>
            Sign In
          </Link>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#09090b' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#f4f4f5', textAlign: 'center' },
  subtitle: { color: '#a1a1aa', marginTop: 8, fontSize: 16, textAlign: 'center' },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 14 },
  spacer: { height: 16 },
  termsText: { color: '#a1a1aa', fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  termsLink: { color: '#60a5fa', fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: '#a1a1aa', fontSize: 14 },
  linkTextBold: { color: '#f4f4f5', fontWeight: 'bold', fontSize: 14 }
});
