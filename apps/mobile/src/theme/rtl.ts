import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';

let ensured = false;

/**
 * Force-enable RTL on first run. Required for mixed-direction layouts
 * because Hebrew is the only locale Shakana ships. If RTL isn't active,
 * we enable it and reload once so the UI lays out from the right.
 */
export async function ensureRtl(): Promise<void> {
  if (ensured) return;
  ensured = true;

  if (I18nManager.isRTL) return;

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);

  if (Platform.OS !== 'web') {
    try {
      await Updates.reloadAsync();
    } catch {
      // Dev / Expo Go — reload not available; RTL will apply on next cold start.
    }
  }
}
