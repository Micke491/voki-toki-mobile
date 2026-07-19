import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'vokitoki_auth_token';
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