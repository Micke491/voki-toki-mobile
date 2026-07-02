// src/features/auth/components/LoginForm.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useLogin } from '../hooks/useLogin';

export const LoginForm = () => {
  const { 
    email, setEmail, password, setPassword, loading, error, handleLogin,
    requires2FA, twoFaCode, setTwoFaCode, handleVerify2FA, cancel2FA
  } = useLogin();

  if (requires2FA) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>2FA Verification</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to your email.</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input 
          label="Verification Code" 
          placeholder="000000" 
          value={twoFaCode}
          onChangeText={setTwoFaCode}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          style={styles.codeInput}
        />
        
        <Button title="Verify Code" onPress={handleVerify2FA} loading={loading} />
        <Button title="Cancel" type="secondary" onPress={cancel2FA} disabled={loading} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to VokiToki</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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

      <View style={styles.forgotPasswordContainer}>
        <Link href="/auth/forgot-password" style={styles.linkText}>
          Forgot password?
        </Link>
      </View>

      <Button title="Sign In" onPress={handleLogin} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>New here? </Text>
        <Link href="/auth/register" style={styles.linkTextBold}>
          Create an account
        </Link>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#09090b',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f4f4f5',
  },
  subtitle: {
    color: '#a1a1aa',
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: 4,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#f4f4f5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  codeInput: {
    backgroundColor: '#18181b', 
    color: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: 'bold',
  }
});