import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getStoredValue(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  }

  const available = await SecureStore.isAvailableAsync().catch(() => false);
  return available ? SecureStore.getItemAsync(key) : null;
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }

  const available = await SecureStore.isAvailableAsync().catch(() => false);
  if (!available) return;
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function removeStoredValue(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }

  const available = await SecureStore.isAvailableAsync().catch(() => false);
  if (!available) return;
  await SecureStore.deleteItemAsync(key);
}

/**
 * Supabase auth storage adapter.
 * Mobile uses encrypted secure storage; web uses localStorage so the same browser remembers the session.
 */
export const secureAuthStorage = {
  getItem: getStoredValue,
  setItem: setStoredValue,
  removeItem: removeStoredValue,
};
