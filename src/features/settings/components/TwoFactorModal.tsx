import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { settingsApi } from '../api';
import { useAuthContext } from '../../auth/context/AuthContext';

interface TwoFactorModalProps {
  visible: boolean;
  onClose: () => void;
  isEnabling: boolean;
  onSuccess: () => void;
}

export function TwoFactorModal({ visible, onClose, isEnabling, onSuccess }: TwoFactorModalProps) {
  const { user, updateUser } = useAuthContext();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setStep('request');
      setCode('');
      setPassword('');
      setError(null);
    }
  }, [visible]);

  const handleRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      await settingsApi.requestEnable2FA();
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);
      if (isEnabling) {
        await settingsApi.confirmEnable2FA(code);
        if (user) updateUser({ ...user, twoFactorEnabled: true });
      } else {
        await settingsApi.disable2FA(password);
        if (user) updateUser({ ...user, twoFactorEnabled: false });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || (isEnabling ? 'Invalid code' : 'Invalid password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEnabling ? 'Enable Two-Factor Auth' : 'Disable Two-Factor Auth'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#71717a" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isEnabling && step === 'request' && (
            <View>
              <Text style={styles.description}>
                Two-factor authentication adds an extra layer of security to your account. We will send a 6-digit code to your email.
              </Text>
              <Button title="Send Code" onPress={handleRequest} loading={loading} />
            </View>
          )}

          {isEnabling && step === 'verify' && (
            <View>
              <Text style={styles.description}>
                Enter the 6-digit code sent to your email to confirm.
              </Text>
              <Input
                label="Verification Code"
                placeholder="000000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                style={styles.codeInput}
              />
              <Button title="Confirm" onPress={handleVerify} loading={loading} />
            </View>
          )}

          {!isEnabling && (
            <View>
              <Text style={styles.description}>
                Please enter your password to disable Two-Factor Authentication.
              </Text>
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                isPassword
              />
              <Button title="Disable 2FA" onPress={handleVerify} loading={loading} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  closeBtn: {
    padding: 8,
  },
  description: {
    color: '#a1a1aa',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  codeInput: {
    backgroundColor: '#09090b',
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
