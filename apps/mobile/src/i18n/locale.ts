import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Language = 'he' | 'en';

const STORAGE_KEY = 'shakana.language';

const messages = {
  he: {
    common: {
      continue: 'המשך',
      save: 'שמור',
      change: 'שנה',
      or: 'או',
      search: 'חיפוש',
      viewAll: 'הצג הכל',
      recommended: 'מומלץ',
      open: 'פתח',
      ready: 'מוכן',
      setup: 'הגדרה',
      newOrder: 'הזמנה חדשה',
      createOrder: 'צור הזמנה',
      sendCode: 'שלח קוד',
      verifyCode: 'אמת קוד',
      resend: 'שליחה מחדש',
      account: 'חשבון',
      policy: 'מדיניות',
      support: 'תמיכה',
      signOut: 'התנתק',
      deleteAccount: 'מחק חשבון',
      savedAddress: 'כתובת שמורה',
      phoneNumber: 'מספר טלפון',
      paymentMethod: 'אמצעי תשלום',
      alerts: 'התראות',
      terms: 'תנאי שימוש',
      privacy: 'מדיניות פרטיות',
      language: 'שפה',
      hebrew: 'עברית',
      english: 'English',
      featuredStores: 'חנויות מובילות',
      recentOrders: 'הזמנות אחרונות',
      noActiveOrders: 'אין עדיין הזמנות פעילות.',
      noActiveOrdersBody: 'התחל סל משותף והעבר הכול לזרימה אחת מסודרת.',
    },
    landing: {
      brand: 'SHAKANA',
      title: 'קניות יחד, בלי בלאגן.',
      subtitle: 'יוצרים סל, מזמינים שכנים, ומחזיקים את כל ההזמנה במקום אחד.',
      privateSignIn: 'התחברות פרטית',
      introBody: 'אפשר להמשיך עם Google או עם מספר טלפון כדי להיכנס ללוח ההזמנות.',
      google: 'המשך עם Google',
      phone: 'המשך עם טלפון',
      legal: 'בהמשך אתה מסכים ל־',
    },
    tabs: {
      home: {
        title: 'בית',
        promoted: 'מומלץ',
        heroTitle: 'קניות מסביב לשעון',
        heroSigned: 'ברוך הבא{first}.\nהלוח שלך מוכן להזמנה הבאה.',
        heroGuest: 'פותחים סל חדש, מזמינים שכנים, וממשיכים קדימה.',
        createOrder: 'צור הזמנה',
        searchPlaceholder: 'חפש מוצרים, חנויות או הזמנות',
        featured: 'חנויות מובילות',
        recent: 'הזמנות אחרונות',
        viewAll: 'הצג הכל',
        statusReady: 'מוכן',
        statusSetup: 'הגדרה',
        openOrders: 'הזמנות פתוחות',
        completed: 'הושלמו',
        profile: 'פרופיל',
        noOrdersTitle: 'אין עדיין הזמנות פעילות.',
        noOrdersBody: 'התחל סל משותף והעבר את כולם לזרימה נקייה אחת.',
      },
      orders: {
        title: 'הזמנות',
        subtitle: 'כאן רואים את כל הסלים וההזמנות שלך.',
        newOrder: 'הזמנה חדשה',
        noOrdersTitle: 'אין עדיין הזמנות פעילות.',
        noOrdersBody: 'צור סל משותף והתחל להזמין יחד.',
      },
      profile: {
        title: 'פרופיל',
        version: 'גרסה 1.0.0 · 2026',
      },
    },
    auth: {
      welcome: {
        title: 'קניות, אבל מסודר יותר.',
        subtitle: 'צור סל, הזמן שכנים, ושמור כל הזמנה בזרימה אחת ברורה.',
        cardTitle: 'התחברות פרטית',
        cardBody: 'אפשר להמשיך עם Google או עם מספר טלפון כדי להגיע ללוח ההזמנות המשותף.',
      },
      phone: {
        title: 'מה מספר הטלפון שלך?',
        subtitle: 'נשלח אליך קוד חד־פעמי כדי להיכנס ללוח.',
        footer: 'ללא עומס, ללא רעש. רק התחברות נקייה.',
      },
      name: {
        title: 'איך לקרוא לך?',
        subtitle: 'בחר את השם שתרצה לראות על לוח ההזמנות המשותף.',
      },
      address: {
        title: 'לאן ההזמנות יגיעו?',
        subtitle: 'הוסף את הכתובת שבה יישתפו את ההזמנות כברירת מחדל.',
        city: 'עיר',
        street: 'רחוב',
        building: 'בניין',
        apartment: 'דירה',
        floor: 'קומה',
        privacy: 'הכתובת נשמרת רק לחשבון שלך ולהזמנות המשותפות. אנחנו לא מציגים אותה לציבור.',
      },
      otp: {
        title: 'הזן את הקוד',
        subtitle: 'שלחנו אותו אל {phone}. הקלד אותו כדי להמשיך.',
        needAnother: 'צריך קוד נוסף?',
        codeSent: 'הקוד נשלח.',
      },
      success: {
        title: 'ברוך הבא{first}.',
        subtitle: 'הפרופיל שלך מוכן ללוח.',
        routing: 'מעבירים אותך לבית.',
      },
    },
    order: {
      new: {
        title: 'הזמנה חדשה',
        urlLabel: 'קישור למוצר',
        titleLabel: 'שם המוצר',
        priceLabel: 'מחיר (₪)',
        participantsLabel: 'מספר משתתפים',
        submit: 'צור הזמנה והזמן שכנים',
        error: 'שגיאה ביצירת ההזמנה',
      },
    },
    language: {
      he: 'עברית',
      en: 'English',
      label: 'שפה',
      subtitle: 'בחר איך האפליקציה תוצג.',
    },
  },
  en: {
    common: {
      continue: 'Continue',
      save: 'Save',
      change: 'Change',
      or: 'or',
      search: 'Search',
      viewAll: 'View all',
      recommended: 'Recommended',
      open: 'Open',
      ready: 'Ready',
      setup: 'Setup',
      newOrder: 'New order',
      createOrder: 'Create order',
      sendCode: 'Send code',
      verifyCode: 'Verify code',
      resend: 'Resend',
      and: 'and',
      account: 'Account',
      add: 'Add',
      signedOut: 'Signed out',
      signOutFailed: 'Sign out failed',
      policy: 'Policy',
      support: 'Support',
      signOut: 'Sign out',
      deleteAccount: 'Delete account',
      savedAddress: 'Saved address',
      phoneNumber: 'Phone number',
      paymentMethod: 'Payment method',
      alerts: 'Alerts',
      terms: 'Terms',
      privacy: 'Privacy Policy',
      language: 'Language',
      hebrew: 'עברית',
      english: 'English',
      featuredStores: 'Featured stores',
      recentOrders: 'Recent orders',
      noActiveOrders: 'No active orders yet.',
      noActiveOrdersBody: 'Start a shared basket and keep everything in one clean flow.',
    },
    landing: {
      brand: 'SHAKANA',
      title: 'Shopping, but cleaner.',
      subtitle: 'Create a basket, invite neighbors, and keep every order in one place.',
      privateSignIn: 'Private sign-in',
      introBody: 'Continue with Google or your phone number to reach the order board.',
      google: 'Continue with Google',
      phone: 'Continue with phone',
      legal: 'By continuing you agree to the ',
    },
    tabs: {
      home: {
        title: 'Home',
        promoted: 'Featured',
        heroTitle: 'Round-the-clock shopping',
        heroSigned: 'Welcome back{first}.\nYour board is ready for the next order.',
        heroGuest: 'Open a new basket, invite neighbors, and keep the flow moving.',
        createOrder: 'Create order',
        searchPlaceholder: 'Search products, stores, or orders',
        featured: 'Featured stores',
        recent: 'Recent orders',
        viewAll: 'View all',
        statusReady: 'Ready',
        statusSetup: 'Setup',
        openOrders: 'Open orders',
        completed: 'Completed',
        profile: 'Profile',
        noOrdersTitle: 'No active orders yet.',
        noOrdersBody: 'Start a shared basket and bring everyone into one clean flow.',
      },
      orders: {
        title: 'Orders',
        subtitle: 'See all of your baskets and orders here.',
        newOrder: 'New order',
        noOrdersTitle: 'No active orders yet.',
        noOrdersBody: 'Create a shared basket and start ordering together.',
        seats: 'seats',
      },
      profile: {
        title: 'Profile',
        version: 'Version 1.0.0 · 2026',
      },
    },
    auth: {
      welcome: {
        title: 'Shopping, but more organized.',
        subtitle: 'Create a basket, invite neighbors, and keep every order in one clear flow.',
        cardTitle: 'Private sign-in',
        cardBody: 'Continue with Google or your phone number to reach the shared order board.',
      },
      phone: {
        title: 'What is your phone number?',
        subtitle: 'We will send you a one-time code to get into the board.',
        footer: 'No clutter, no noise. Just a clean sign-in.',
        placeholder: '050-000-0000',
        sendError: 'Could not send the code.',
      },
      name: {
        title: 'What should we call you?',
        subtitle: 'Use the name you want to see on the shared order board.',
        first: 'First name',
        last: 'Last name',
      },
      address: {
        title: 'Where should orders arrive?',
        subtitle: 'Add the address that your shared baskets should use by default.',
        city: 'City',
        street: 'Street',
        building: 'Building',
        apartment: 'Apartment',
        floor: 'Floor',
        cityFirst: 'Choose a city first',
        streetSearch: 'Search streets in {city}...',
        saveError: 'Could not save your address.',
        privacy: 'Your address is only used for your account and shared orders. We never make it public.',
      },
      otp: {
        title: 'Enter the code',
        subtitle: 'We sent it to {phone}. Type it below to continue.',
        needAnother: 'Need another code?',
        codeSent: 'Code sent.',
        verifyError: 'Code failed.',
        resendError: 'Could not resend code.',
      },
      success: {
        title: 'Welcome back{first}.',
        subtitle: 'Your profile is ready for the board.',
        routing: 'Routing to home.',
      },
    },
    order: {
      new: {
        title: 'New order',
        urlLabel: 'Product link',
        titleLabel: 'Product name',
        priceLabel: 'Price (₪)',
        participantsLabel: 'Number of participants',
        submit: 'Create order and invite neighbors',
        error: 'Could not create the order',
      },
    },
    language: {
      he: 'עברית',
      en: 'English',
      label: 'Language',
      subtitle: 'Choose how the app should appear.',
    },
  },
} as const;

type MessageTree = typeof messages.he;
type KeyPath = string;

type LocaleState = {
  language: Language;
  hydrated: boolean;
  setLanguage: (language: Language) => Promise<void>;
  setHydrated: (hydrated: boolean) => void;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  language: 'he',
  hydrated: false,
  setLanguage: async (language: Language) => {
    await persistLanguage(language);
    set({ language });
    await applyLanguageDirection(language);
  },
  setHydrated: (hydrated) => set({ hydrated }),
}));

export async function loadStoredLanguage(): Promise<Language> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'en' ? 'en' : 'he';
  } catch {
    return 'he';
  }
}

export async function persistLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage errors; the app still works for this session.
  }
}

export async function applyLanguageDirection(language: Language): Promise<void> {
  const shouldBeRtl = language === 'he';
  const current = I18nManager.isRTL;

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldBeRtl);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.documentElement.dir = shouldBeRtl ? 'rtl' : 'ltr';
  }

  if (Platform.OS !== 'web' && current !== shouldBeRtl) {
    try {
      await Updates.reloadAsync();
    } catch {
      // Expo Go / dev can skip the reload.
    }
  }
}

export function t(language: Language, key: KeyPath, vars: Record<string, string | number> = {}): string {
  const resolve = (lang: Language) => {
    const dict = messages[lang] as unknown as Record<string, unknown>;
    return key.split('.').reduce<unknown>((acc, segment) => {
      if (!acc || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[segment];
    }, dict);
  };

  const raw = resolve(language);
  const fallback = typeof raw === 'string' ? raw : resolve('en');
  const template = typeof fallback === 'string' ? fallback : key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

export function isRtl(language: Language): boolean {
  return language === 'he';
}

export function useLocale() {
  const language = useLocaleStore((s) => s.language);
  const setLanguage = useLocaleStore((s) => s.setLanguage);
  return {
    language,
    setLanguage,
    isRtl: isRtl(language),
    t: (key: KeyPath, vars?: Record<string, string | number>) => t(language, key, vars),
  };
}
