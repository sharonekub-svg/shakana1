import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { useUserOrders } from '@/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { usePaymentSettingsStore } from '@/stores/paymentSettingsStore';
import { useSignOut } from '@/api/auth';
import { resetAnalytics } from '@/lib/posthog';
import { useUiStore } from '@/stores/uiStore';

const ECO_BG = '#E8F0E0';
const ECO_GREEN = '#4A7C59';

function IconOrders() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconAddress() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
        fill={colors.mu}
      />
    </Svg>
  );
}

function IconPayments() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10h18M7 15h1m4 0h1M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconNotifications() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconLanguage() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5h12M9 3v2m-3.232 13.232l2.122-4.243m0 0L12 8.5l3.11 5.489m-9.342 2.243h6.464M21 3l-6 18"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconGear() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        stroke={colors.tx}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={colors.tx}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBug() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2l1.5 1.5M16 2l-1.5 1.5M12 4a4 4 0 00-4 4v5a4 4 0 008 0V8a4 4 0 00-4-4zM8 8H4m16 0h-4M8 13H4m16 0h-4M9 19l-2 2m8-2l2 2"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconFAQ() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
        stroke={colors.mu}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBell() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        stroke={colors.tx}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LeafIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C6.477 22 2 17.523 2 12 2 6.477 6.477 2 12 2c5.523 0 10 4.477 10 10-3 4-7 6-10 6zm0 0c-2 0-4-2-4-5 0-3.5 4-7 4-7s4 3.5 4 7c0 3-2 5-4 5z"
        fill={ECO_GREEN}
        opacity={0.85}
      />
    </Svg>
  );
}

function formatMemberSince(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const month = d.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const year = d.getFullYear();
  return `member since ${month} ${year}`;
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onPress: () => void;
};

function Row({ icon, label, subtitle, onPress }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function AccountTab() {
  const router = useRouter();
  const { language } = useLocale();
  const signOut = useSignOut();
  const user = useAuthStore((s) => s.user);
  const resetAuth = useAuthStore((s) => s.reset);
  const profile = useAuthStore((s) => s.profile);
  const pushToast = useUiStore((s) => s.pushToast);
  const notificationsHydrated = useNotificationSettingsStore((s) => s.hydrated);
  const loadNotifications = useNotificationSettingsStore((s) => s.load);
  const paymentsHydrated = usePaymentSettingsStore((s) => s.hydrated);
  const loadPayments = usePaymentSettingsStore((s) => s.load);
  const { data: orders = [] } = useUserOrders(user?.id);

  const isHebrew = language === 'he';

  useEffect(() => {
    if (!notificationsHydrated) void loadNotifications();
    if (!paymentsHydrated) void loadPayments();
  }, [loadNotifications, loadPayments, notificationsHydrated, paymentsHydrated]);

  const firstName = profile?.first_name ?? '';
  const lastName = profile?.last_name ?? '';
  const fullName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    (isHebrew ? 'לקוח Shakana' : 'Shakana user');

  const initials =
    ((firstName.charAt(0) ?? '') + (lastName.charAt(0) ?? '')).toUpperCase() ||
    fullName.charAt(0).toUpperCase();

  const addressLine = [
    profile?.street,
    profile?.building,
    profile?.apt ? `· ${profile.apt}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const memberSince = formatMemberSince(user?.created_at);

  const orderCount = orders.length || 23;
  const savedAmount = 842;
  const neighborCount = 46;
  const ecoDeliveries = orders.length || 18;

  const activeOrders = orders.filter(
    (o) => !['completed', 'cancelled'].includes(o.status),
  ).length;

  const onSignOut = async () => {
    try {
      await signOut.mutateAsync();
      resetAnalytics();
      resetAuth();
      pushToast(isHebrew ? 'התנתקת מהחשבון' : 'Signed out', 'success');
      router.replace('/(auth)/welcome');
    } catch (error) {
      pushToast(
        error instanceof Error
          ? error.message
          : isHebrew
          ? 'לא הצלחנו להתנתק'
          : 'Could not sign out',
        'error',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBarIcon} hitSlop={8}>
          <IconGear />
        </Pressable>
        <Text style={styles.topBarTitle}>
          {isHebrew ? 'פרופיל' : 'Profile'}
        </Text>
        <Pressable style={styles.topBarIcon} hitSlop={8}>
          <IconBell />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          {addressLine ? (
            <Text style={styles.profileAddress}>{addressLine}</Text>
          ) : null}
          {memberSince ? (
            <Text style={styles.profileMember}>{memberSince}</Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{orderCount}</Text>
            <Text style={styles.statLabel}>
              {isHebrew ? 'הזמנות' : 'ORDERS'}
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statNumber}>₪{savedAmount}</Text>
            <Text style={styles.statLabel}>
              {isHebrew ? 'חסכת' : 'SAVED'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{neighborCount}</Text>
            <Text style={styles.statLabel}>
              {isHebrew ? 'שכנים' : 'NEIGHBORS'}
            </Text>
          </View>
        </View>

        <View style={styles.ecoCard}>
          <LeafIcon />
          <Text style={styles.ecoText}>
            {isHebrew
              ? `חסכת ${ecoDeliveries} משלוחים השנה · 7.4 ק"ג CO₂ · משאית אחת פחות ברחוב שלך`
              : `You spared ${ecoDeliveries} deliveries this year · 7.4 kg CO₂ · one truck on your street`}
          </Text>
        </View>

        <Text style={styles.sectionHeader}>
          {isHebrew ? 'חשבון' : 'ACCOUNT'}
        </Text>

        <View style={styles.listCard}>
          <Row
            icon={<IconOrders />}
            label={isHebrew ? 'הזמנות' : 'Orders'}
            subtitle={
              isHebrew
                ? `${orderCount} לכל החיים · ${activeOrders} פעילות`
                : `${orderCount} lifetime · ${activeOrders} active`
            }
            onPress={() => router.push('/(tabs)/orders')}
          />
          <View style={styles.divider} />
          <Row
            icon={<IconAddress />}
            label={isHebrew ? 'כתובות' : 'Addresses'}
            subtitle={
              addressLine
                ? isHebrew
                  ? `${addressLine} · עוד 1`
                  : `${addressLine} · 1 more`
                : isHebrew
                ? 'כתובת לא הוגדרה'
                : 'No address set'
            }
            onPress={() => router.push('/(auth)/address')}
          />
          <View style={styles.divider} />
          <Row
            icon={<IconPayments />}
            label={isHebrew ? 'תשלומים' : 'Payments'}
            subtitle={isHebrew ? 'Apple Pay · Visa 4421' : 'Apple Pay · Visa 4421'}
            onPress={() => router.push('/profile/payment')}
          />
          <View style={styles.divider} />
          <Row
            icon={<IconNotifications />}
            label={isHebrew ? 'התראות' : 'Notifications'}
            subtitle={
              isHebrew ? 'הזמנות, טיפות, שכנים' : 'orders, drops, neighbors'
            }
            onPress={() => router.push('/profile/alerts')}
          />
        </View>

        <Text style={styles.sectionHeader}>
          {isHebrew ? 'העדפות' : 'PREFERENCES'}
        </Text>

        <View style={styles.listCard}>
          <Row
            icon={<IconLanguage />}
            label={isHebrew ? 'שפה' : 'Language'}
            subtitle={language === 'he' ? 'עברית' : 'English'}
            onPress={() => {}}
          />
        </View>

        <Text style={styles.sectionHeader}>
          {isHebrew ? 'תמיכה' : 'SUPPORT'}
        </Text>

        <View style={styles.listCard}>
          <Row
            icon={<IconFAQ />}
            label={isHebrew ? 'שאלות נפוצות' : 'FAQ'}
            subtitle={isHebrew ? 'תשובות לכל השאלות הנפוצות' : 'Answers to common questions'}
            onPress={() => router.push('/profile/faq')}
          />
          <Row
            icon={<IconBug />}
            label={isHebrew ? 'רוצה לדווח על בעיה?' : 'Wanna report a bug?'}
            subtitle={isHebrew ? 'אנחנו קוראים הכל ומגיבים' : 'We read everything and respond'}
            onPress={() => router.push('/profile/bug-report')}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
          onPress={onSignOut}
          disabled={signOut.isPending}
        >
          <Text style={styles.signOutText}>
            {signOut.isPending
              ? isHebrew
                ? 'מתנתקים...'
                : 'Signing out...'
              : isHebrew
              ? 'התנתק'
              : 'Sign out'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBarIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    color: colors.tx,
    letterSpacing: 0.2,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
    gap: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mu2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 26,
    color: colors.s1,
    letterSpacing: 1,
  },
  profileName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: colors.tx,
    textAlign: 'center',
  },
  profileAddress: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    textAlign: 'center',
  },
  profileMember: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu2,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    overflow: 'hidden',
    ...shadow.glass,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 4,
  },
  statCardMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.br,
  },
  statNumber: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: colors.tx,
  },
  statLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    color: colors.mu2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  ecoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: ECO_BG,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  ecoText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: ECO_GREEN,
  },
  sectionHeader: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.mu2,
    textTransform: 'uppercase',
    marginBottom: -4,
    marginTop: 4,
  },
  listCard: {
    backgroundColor: colors.s1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    overflow: 'hidden',
    ...shadow.glass,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: colors.bg,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  rowSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu2,
  },
  chevron: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 20,
    color: colors.mu2,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.br,
    marginLeft: 56,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  signOutText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.err,
    textAlign: 'center',
  },
});
