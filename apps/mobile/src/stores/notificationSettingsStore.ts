import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'shakana.notificationSettings';

export type NotificationSettings = {
  orderUpdates: boolean;
  paymentReminders: boolean;
  productAlerts: boolean;
};

type NotificationSettingsState = {
  settings: NotificationSettings;
  hydrated: boolean;
  load: () => Promise<void>;
  setSetting: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => Promise<void>;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  orderUpdates: true,
  paymentReminders: true,
  productAlerts: false,
};

async function persist(settings: NotificationSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Keep the in-memory settings if storage is unavailable.
  }
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ settings: DEFAULT_SETTINGS, hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
      set({
        settings: {
          orderUpdates: parsed.orderUpdates ?? DEFAULT_SETTINGS.orderUpdates,
          paymentReminders: parsed.paymentReminders ?? DEFAULT_SETTINGS.paymentReminders,
          productAlerts: parsed.productAlerts ?? DEFAULT_SETTINGS.productAlerts,
        },
        hydrated: true,
      });
    } catch {
      set({ settings: DEFAULT_SETTINGS, hydrated: true });
    }
  },
  setSetting: async (key, value) => {
    const next = { ...get().settings, [key]: value };
    set({ settings: next });
    await persist(next);
  },
}));
