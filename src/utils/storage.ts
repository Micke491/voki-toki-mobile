import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'vokitoki_auth_token';
const TRUSTED_DEVICE_TOKEN_KEY = 'vokitoki_trusted_device_token';
const NOTIFICATIONS_KEY = 'vokitoki_notifications_enabled';

/** Device-level master switch for message/call alerts (defaults to on). */
export const getNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return value !== 'false';
  } catch {
    return true;
  }
};

export const setNotificationsEnabled = async (enabled: boolean) => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving notification preference', error);
  }
};

export const saveToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token', error);
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token', error);
  }
};

/**
 * Long-lived per-device token that lets a 2FA-enabled account skip the email
 * code on future logins from this device (server: X-Trusted-Device-Token).
 * Persists across sign-out — trust is tied to the device, not the session.
 */
export const saveTrustedDeviceToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(TRUSTED_DEVICE_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving trusted device token', error);
  }
};

export const getTrustedDeviceToken = async () => {
  try {
    return await SecureStore.getItemAsync(TRUSTED_DEVICE_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting trusted device token', error);
    return null;
  }
};