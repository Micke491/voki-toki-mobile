import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'vokitoki_auth_token';
const TRUSTED_DEVICE_TOKEN_KEY = 'vokitoki_trusted_device_token';

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