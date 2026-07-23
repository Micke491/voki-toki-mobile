import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { getToken, removeToken, getTrustedDeviceToken } from '../utils/storage';
import { router } from 'expo-router';

// A human-friendly device label sent on login so Active Sessions shows e.g.
// "iPhone 15 Pro (iOS 17.2)" instead of a raw axios/OkHttp User-Agent.
const buildDeviceName = (): string => {
  const model = Device.modelName || Device.deviceName || 'Mobile Device';
  const os = [Device.osName, Device.osVersion].filter(Boolean).join(' ');
  return os ? `${model} (${os})` : model;
};

export const DEVICE_NAME = buildDeviceName();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8081/api';
  return 'http://localhost:8081/api';
}

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Lets a 2FA-enabled account skip the email code on this device (server-checked
  // only on /auth/login), so it's safe to attach whenever we have one.
  // Sent on every request; the server only reads it when creating a session
  // (login / 2FA verify), so Active Sessions shows a friendly device name.
  config.headers['X-Device-Name'] = DEVICE_NAME;
  if (config.url?.includes('/auth/login')) {
    const trustedDeviceToken = await getTrustedDeviceToken();
    if (trustedDeviceToken) {
      config.headers['X-Trusted-Device-Token'] = trustedDeviceToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
      router.replace('/auth/login');
    }
    return Promise.reject(error);
  }
);