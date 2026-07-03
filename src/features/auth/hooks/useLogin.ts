import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '../api';
import { useAuthContext } from '../context/AuthContext';

export const useLogin = () => {
  const router = useRouter();
  const { signIn } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      
      if (data.requires_2fa) {
        setRequires2FA(true);
        setTempToken(data.temp_token || '');
        return;
      }
      
      await signIn(data.token, data.user);
      router.replace('/tabs');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await authApi.verify2FA({
        temp_token: tempToken,
        code: twoFaCode,
        rememberDevice: true,
        rememberMe: true,
      });

      await signIn(data.token, data.user);
      router.replace('/tabs');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const cancel2FA = () => {
    setRequires2FA(false);
    setTempToken('');
    setTwoFaCode('');
    setError(null);
  };

  return { 
    email, setEmail, password, setPassword, loading, error, handleLogin,
    requires2FA, twoFaCode, setTwoFaCode, handleVerify2FA, cancel2FA
  };
};