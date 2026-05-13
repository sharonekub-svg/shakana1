import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { Field } from '@/components/primitives/Field';
import { PrimaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { useUserOrders } from '@/api/orders';
import { useUpsertProfile } from '@/api/profile';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { usePaymentSettingsStore } from '@/stores/paymentSettingsStore';
import { useSignOut } from '@/api/auth';
import { resetAnalytics } from '@/lib/posthog';
import { useUiStore } from '@/stores/uiStore';

export default function AccountTab() {
  const router = useRouter();
  const { language, setLanguage } = useLocale();
  const signOut = useSignOut();
  const user = useAuthStore((s) => s.user);
  const resetAuth = useAuthStore((s) => s.reset);
  const setProfile = useAuthStore((s) => s.setProfile);
  const profile = useAuthStore((s) => s.profile);
  const pushToast = useUiStore((s) => s.pushToast);
  const upsertProfile = useUpsertProfile();
  const notificationSettings = useNotificationSettingsStore((s) => s.settings);
  const notificationsHydrated = useNotificationSettingsStore((s) => s.hydrated);
  const loadNotifications = useNotificationSettingsStore((s) => s.load);
  const paymentSettings = usePaymentSettingsStore((s) => s.settings);
  const paymentsHydrated = usePaymentSettingsStore((s) => s.hydrated);
  const loadPayments = usePaymentSettingsStore((s) => s.load);
  const { data: orders = [] } = useUserOrders(user?.id);
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  const isHebrew = language === 'he';
  const openOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length;
  const enabledPaymentCount = Object.values(paymentSettings).filter(
    (method) => method.enabled && method.link.trim().length > 0,
  ).length;
  const enabledNotifications = Object.values(notificationSettings).filter(Boolean).length;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const address = [
    profile?.street,
    profile?.building,
    profile?.apt ? `${isHebrew ? 'דירה' : 'Apt'} ${profile.apt}` : null,
    profile?.city,
  ]
    .filter(Boolean)
    .join(', ');

  const copy = {
    profileTitle: isHebrew ? 'פרופיל' : 'Profile',
    ready: isHebrew ? 'הפרופיל מוכן' : 'Profile ready',
    name: fullName || (isHebrew ? 'לקוח Shakana' : 'Shakana customer'),
    account: isHebrew ? 'חשבון' : 'Account',
    profileBody: isHebrew
      ? 'כאן מסדרים שפה, כתובת, תשלומים והתראות לפני שמתחילים הזמנה.'
      : 'Keep language, address, payments, and notifications ready before checkout.',
    address: address || (isHebrew ? 'כתובת עדיין לא נוספה' : 'Address not added yet'),
    phone: profile?.phone || (isHebrew ? 'טלפון עדיין לא נוסף' : 'Phone not added yet'),
    phoneLabel: isHebrew ? 'טלפון' : 'Phone',
    openOrders: isHebrew ? 'הזמנות פתוחות' : 'Open orders',
    details: isHebrew ? 'הגדרות חשבון' : 'Account settings',
    deliveryAddress: isHebrew ? 'כתובת משלוח' : 'Delivery address',
    language: isHebrew ? 'שפה' : 'Language',
    languageBody: isHebrew ? 'בחר עברית או אנגלית לכל האפליקציה.' : 'Choose English or Hebrew for the app.',
    payments: isHebrew ? 'תשלומים' : 'Payments',
    notifications: isHebrew ? 'התראות' : 'Notifications',
    paymentReady: isHebrew ? `${enabledPaymentCount} אפשרויות תשלום מוכנות` : `${enabledPaymentCount} payment options ready`,
    notificationsReady: isHebrew ? `${enabledNotifications} התראות פעילות` : `${enabledNotifications} notification toggles on`,
  };

  const editCopy = {
    editDetails: isHebrew ? 'עריכת פרטים' : 'Edit details',
    editDetailsBody: isHebrew
      ? 'אפשר לעדכן שם וטלפון כאן. כתובת היא אופציונלית ומשמשת רק להתראות שכנים בבניין.'
      : 'Update name and phone here. Address is optional and only used for building neighbor alerts.',
    firstName: isHebrew ? 'שם פרטי' : 'First name',
    lastName: isHebrew ? 'שם משפחה' : 'Last name',
    phoneInput: isHebrew ? 'טלפון' : 'Phone',
    saveDetails: isHebrew ? 'שמור פרטים' : 'Save details',
    savingDetails: isHebrew ? 'שומר...' : 'Saving...',
    detailsSaved: isHebrew ? 'הפרטים נשמרו' : 'Details saved',
    detailsError: isHebrew ? 'לא הצלחנו לשמור את הפרטים' : 'Could not save details',
    addressButton: isHebrew ? 'הוסף / שנה כתובת' : 'Add / change address',
  };

  const quickLinks = [
    {
      href: '/profile/payment',
      icon: '₪',
      title: isHebrew ? 'תשלומים' : 'Payments',
      body: copy.paymentReady,
    },
    {
      href: '/profile/alerts',
      icon: '🔔',
      title: isHebrew ? 'התראות' : 'Alerts',
      body: copy.notificationsReady,
    },
    {
      href: '/profile/privacy',
      icon: '🔒',
      title: isHebrew ? 'פרטיות' : 'Privacy',
      body: isHebrew ? 'איך אנחנו משתמשים בפרטי החשבון והכתובת' : 'How account and address data is handled',
    },
    {
      href: '/profile/terms',
      icon: '📄',
      title: isHebrew ? 'תנאים' : 'Terms',
      body: isHebrew ? 'הכללים להזמנות משותפות באפליקציה' : 'Rules for shared orders',
    },
  ] as const;

  const stats = [
    { label: copy.openOrders, value: String(openOrders) },
    { label: copy.payments, value: String(enabledPaymentCount) },
    { label: copy.notifications, value: String(enabledNotifications) },
  ];

  useEffect(() => {
    if (!notificationsHydrated) void loadNotifications();
    if (!paymentsHydrated) void loadPayments();
  }, [loadNotifications, loadPayments, notificationsHydrated, paymentsHydrated]);

  useEffect(() => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.first_name, profile?.last_name, profile?.phone]);

  const onSaveDetails = async () => {
    if (!user?.id) return;
    const nextProfile = {
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      city: profile?.city ?? '',
      street: profile?.street ?? '',
      building: profile?.building ?? '',
      apt: profile?.apt ?? '',
      floor: profile?.floor ?? null,
    };
    try {
      await upsertProfile.mutateAsync(nextProfile);
      setProfile(nextProfile);
      pushToast(editCopy.detailsSaved, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : editCopy.detailsError, 'error');
    }
  };

  const onSignOut = async () => {
    try {
      await signOut.mutateAsync();
      resetAnalytics();
      resetAuth();
      pushToast(isHebrew ? 'התנתקת מהחשבון' : 'Signed out', 'success');
      router.replace('/(auth)/welcome');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : isHebrew ? 'לא הצלחנו להתנתק' : 'Could not sign out', 'error');
    }
  };

  return (
    <ScreenBase padded={false}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>

        {/* App bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.kicker}>SHAKANA</Text>
            <Text style={styles.title}>{copy.profileTitle}</Text>
          </View>
          <View style={styles.langToggle}>
            <Pressable
              style={[styles.langPill, language === 'he' && styles.langPillActive]}
              onPress={() => void setLanguage('he')}
            >
              <Text style={[styles.langPillText, language === 'he' && styles.langPillTextActive]}>עברית</Text>
            </Pressable>
            <Pressable
              style={[styles.langPill, language === 'en' && styles.langPillActive]}
              onPress={() => void setLanguage('en')}
            >
              <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>EN</Text>
            </Pressable>
          </View>
        </View>

        {/* Identity card */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{copy.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityName} numberOfLines={1}>{copy.name}</Text>
            {address ? <Text style={styles.identityMeta} numberOfLines={1}>{address}</Text> : null}
            {profile?.phone ? <Text style={styles.identityMeta} numberOfLines={1}>{profile.phone}</Text> : null}
          </View>
        </View>

        {/* Dark stats strip */}
        <View style={styles.statsStrip}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[styles.statCell, i < stats.length - 1 && styles.statCellBorder]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Address card */}
        <Pressable
          style={({ pressed }) => [styles.listCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(auth)/address')}
        >
          <View style={styles.rowBadge}>
            <Text style={styles.rowBadgeIcon}>📍</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowSectionLabel}>{copy.deliveryAddress}</Text>
            <Text style={styles.rowBodyText} numberOfLines={1}>{copy.address}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Edit details card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{editCopy.editDetails}</Text>
          <Text style={styles.cardBody}>{editCopy.editDetailsBody}</Text>
          <View style={styles.editRow}>
            <View style={{ flex: 1 }}>
              <Field label={editCopy.firstName} value={firstName} onChange={setFirstName} placeholder="Shakana" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={editCopy.lastName} value={lastName} onChange={setLastName} placeholder="User" />
            </View>
          </View>
          <Field label={editCopy.phoneInput} value={phone} onChange={setPhone} placeholder="050..." keyboardType="phone-pad" />
          <PrimaryBtn
            label={upsertProfile.isPending ? editCopy.savingDetails : editCopy.saveDetails}
            onPress={onSaveDetails}
            loading={upsertProfile.isPending}
            disabled={!user?.id}
          />
          <Pressable
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/(auth)/address')}
          >
            <Text style={styles.ghostBtnText}>{editCopy.addressButton}</Text>
          </Pressable>
        </View>

        {/* Quick links */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{copy.details}</Text>
          {quickLinks.map((item, index) => (
            <Pressable
              key={item.href}
              style={({ pressed }) => [
                styles.linkRow,
                index < quickLinks.length - 1 && styles.linkRowBorder,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => router.push(item.href)}
            >
              <View style={styles.rowBadge}>
                <Text style={styles.rowBadgeIcon}>{item.icon}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.linkLabel}>{item.title}</Text>
                <Text style={styles.rowBodyText} numberOfLines={1}>{item.body}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Sign out — prominent full-width dark button */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.85 }]}
          onPress={onSignOut}
          disabled={signOut.isPending}
          accessibilityRole="button"
        >
          <Text style={styles.signOutBtnText}>
            {signOut.isPending ? (isHebrew ? 'מתנתקים...' : 'Signing out…') : isHebrew ? 'התנתק' : 'Sign out'}
          </Text>
        </Pressable>

        {/* Delete account */}
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
          onPress={() => router.push('/profile/delete')}
          accessibilityRole="button"
        >
          <Text style={styles.deleteBtnText}>{isHebrew ? 'מחיקת חשבון' : 'Delete account'}</Text>
        </Pressable>

      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 4,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: '#C5654B',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    fontStyle: 'italic',
    color: '#1E1812',
    lineHeight: 34,
  },
  langToggle: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#EFE6D6',
    borderRadius: radii.pill,
    padding: 3,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  langPillActive: {
    backgroundColor: '#1E1812',
  },
  langPillText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: '#6A5E50',
  },
  langPillTextActive: {
    color: '#FAF6EF',
  },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    padding: 16,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#E3D6BE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    fontStyle: 'italic',
    color: '#1E1812',
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  identityName: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    fontStyle: 'italic',
    color: '#1E1812',
    lineHeight: 26,
  },
  identityMeta: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#6A5E50',
    lineHeight: 18,
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#1E1812',
    borderRadius: 20,
    paddingVertical: 18,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statCellBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    fontStyle: 'italic',
    color: '#FAF6EF',
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(250,246,239,0.55)',
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#A89B89',
    textTransform: 'uppercase',
  },
  cardBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#6A5E50',
    marginTop: -4,
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ghostBtn: {
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE6D6',
  },
  ghostBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.acc,
  },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    padding: 14,
  },

  rowBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFE6D6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBadgeIcon: {
    fontSize: 16,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowSectionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#A89B89',
    textTransform: 'uppercase',
  },
  rowBodyText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#6A5E50',
    lineHeight: 18,
  },
  chevron: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: '#A89B89',
    lineHeight: 24,
    flexShrink: 0,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  linkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,24,18,0.07)',
  },
  linkLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: '#1E1812',
  },

  signOutBtn: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: '#1E1812',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  signOutBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    letterSpacing: 0.4,
    color: '#FAF6EF',
  },

  deleteBtn: {
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#C84D3A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  deleteBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: '#C84D3A',
  },
});
