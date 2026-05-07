import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { type Href, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { useAuthStore } from '@/stores/authStore';
import { useSignOut } from '@/api/auth';
import { resetAnalytics } from '@/lib/posthog';
import { stashPendingInvite } from '@/lib/deeplinks';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { usePaymentSettingsStore, type PaymentMethodKey } from '@/stores/paymentSettingsStore';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import {
  getDemoOrderStats,
  getParticipantSuccessCount,
  useDemoCommerceStore,
} from '@/stores/demoCommerceStore';

const PAYMENT_METHODS: Array<{ key: PaymentMethodKey; label: string; placeholder: string }> = [
  { key: 'bit', label: 'Bit', placeholder: '050... or Bit link' },
  { key: 'paybox', label: 'PayBox', placeholder: 'PayBox link' },
  { key: 'paypal', label: 'PayPal', placeholder: 'paypal.me/name or email' },
  { key: 'cash', label: 'Cash / other', placeholder: 'Cash on pickup, bank transfer...' },
];

const LEGAL_LINKS: Array<{ href: Href; label: string; note: string }> = [
  { href: '/profile/privacy', label: 'Privacy Policy', note: 'Data, orders, and account use' },
  { href: '/profile/terms', label: 'Terms & Conditions', note: 'Rules for using Shakana' },
  { href: '/profile/cookies', label: 'Cookie Consent', note: 'EU GDPR consent controls' },
  { href: '/profile/security', label: 'Auth & security', note: 'Login, reset, OAuth, rate limits' },
  { href: '/profile/support', label: 'Contact support', note: 'Support email' },
  { href: '/profile/bug-report', label: 'Bug report', note: 'Send a reproducible issue' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const signOut = useSignOut();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const resetAuth = useAuthStore((s) => s.reset);
  const demoOrders = useDemoCommerceStore((s) => s.orders);
  const activeParticipantId = useDemoCommerceStore((s) => s.activeParticipantId);
  const resetDemo = useDemoCommerceStore((s) => s.resetDemo);
  const paymentSettings = usePaymentSettingsStore((s) => s.settings);
  const paymentHydrated = usePaymentSettingsStore((s) => s.hydrated);
  const loadPayments = usePaymentSettingsStore((s) => s.load);
  const setPaymentMethod = usePaymentSettingsStore((s) => s.setMethod);
  const notificationSettings = useNotificationSettingsStore((s) => s.settings);
  const notificationHydrated = useNotificationSettingsStore((s) => s.hydrated);
  const loadNotifications = useNotificationSettingsStore((s) => s.load);
  const setNotification = useNotificationSettingsStore((s) => s.setSetting);
  const [joinCode, setJoinCode] = useState('');
  const [savedPulse, setSavedPulse] = useState('');

  useEffect(() => {
    if (!paymentHydrated) void loadPayments();
    if (!notificationHydrated) void loadNotifications();
  }, [loadNotifications, loadPayments, notificationHydrated, paymentHydrated]);

  const displayName = useMemo(() => {
    const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
    const authName =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata?.name === 'string' && metadata.name.trim());
    return profileName || authName || (session ? 'Shakana member' : 'Guest');
  }, [profile, session]);

  const stats = getDemoOrderStats(demoOrders);
  const personalSaves = getParticipantSuccessCount(demoOrders, activeParticipantId);
  const readyPayments = Object.values(paymentSettings).filter(
    (method) => method.enabled && method.link.trim().length > 0,
  ).length;
  const openOrders = demoOrders.filter((order) => order.status !== 'shipped').length;
  const latestOrder = demoOrders[0] ?? null;
  const savingsThisYear = Math.round(stats.totalSavings);
  const verifiedBadge = session ? 'Verified member' : 'Guest mode';
  const initial = displayName.charAt(0).toUpperCase() || 'S';
  const email = session?.user.email ?? 'Sign in to attach orders to your account';

  const joinByCode = async () => {
    const code = joinCode.replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) {
      setSavedPulse('Enter a 4-digit invite code first.');
      return;
    }
    if (!session) {
      await stashPendingInvite(code);
      router.push('/login');
      return;
    }
    router.push(`/user?join=${code}` as Href);
  };

  const onSignOut = async () => {
    try {
      await signOut.mutateAsync();
    } finally {
      resetAnalytics();
      resetAuth();
      router.replace('/login');
    }
  };

  const savePulse = (message: string) => {
    setSavedPulse(message);
    globalThis.setTimeout(() => setSavedPulse(''), 1800);
  };

  const copyLatestInvite = async () => {
    if (!latestOrder) {
      savePulse('Create an order first, then copy its invite.');
      return;
    }
    await Clipboard.setStringAsync(`https://shakana1.vercel.app/join/${latestOrder.inviteCode}`);
    savePulse(`Invite ${latestOrder.inviteCode} copied`);
  };

  return (
    <ScreenBase padded={false}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>SHAKANA</Text>
            <Text style={styles.title}>{isHebrew ? 'Profile' : 'Profile'}</Text>
            <Text style={styles.subtitle}>
              Account, wallet settings, joins, legal, and support in one clean place.
            </Text>
          </View>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{email}</Text>
            <Text style={styles.verifiedBadge}>{verifiedBadge}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={session ? onSignOut : () => router.push('/login')}
            style={styles.authPill}
          >
            <Text style={styles.authPillText}>{session ? 'Sign out' : 'Sign in'}</Text>
          </Pressable>
        </View>

        {savedPulse ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{savedPulse}</Text>
          </View>
        ) : null}

        <View style={styles.quickGrid}>
          <QuickAction title="New Order" body="Choose Amazon, H&M, or Zara and open a new cart." badge="+" primary onPress={() => router.push('/user?new=1' as Href)} />
          <QuickAction title="Open orders" body="Live carts you are tracking now." badge={String(openOrders)} onPress={() => router.push('/user')} />
          <QuickAction title="Store mode" body="Merchant dashboard for active orders." badge="M" onPress={() => router.push('/store')} />
          <QuickAction title="Copy invite" body="Copy the latest short WhatsApp link." badge="Go" onPress={copyLatestInvite} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join an order</Text>
          <Text style={styles.sectionBody}>Paste the 4-digit code from WhatsApp. Invite links still open directly.</Text>
          <View style={styles.joinRow}>
            <TextInput
              value={joinCode}
              onChangeText={(value) => setJoinCode(value.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="4821"
              placeholderTextColor={colors.mu2}
              style={styles.joinInput}
              accessibilityLabel="Join code"
            />
            <Pressable
              accessibilityRole="button"
              onPress={joinByCode}
              style={({ pressed }) => [styles.joinButton, pressed && styles.pressed]}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="Open" value={String(openOrders)} />
          <Stat label="Completed" value={String(stats.shippedOrders)} />
          <Stat label="My saves" value={String(personalSaves)} />
          <Stat label="Saved this year" value={`₪${savingsThisYear}`} />
          <Stat label="Wallets" value={String(readyPayments)} />
        </View>

        <View style={styles.savingsHero}>
          <Text style={styles.savingsHeroValue}>₪{savingsThisYear}</Text>
          <Text style={styles.savingsHeroTitle}>Personal savings tracker</Text>
          <Text style={styles.sectionBody}>
            Your completed group orders feed this total. It gives returning users a clear reason to keep using Shakana.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallets & payment</Text>
          <Text style={styles.sectionBody}>Turn on the methods people can use to pay you before joining a shared order.</Text>
          <View style={styles.paymentList}>
            {PAYMENT_METHODS.map((method) => {
              const setting = paymentSettings[method.key];
              return (
                <View key={method.key} style={styles.paymentCard}>
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityState={{ checked: setting.enabled }}
                    onPress={() => {
                      void setPaymentMethod(method.key, { enabled: !setting.enabled });
                      savePulse(`${method.label} ${setting.enabled ? 'turned off' : 'turned on'}`);
                    }}
                    style={styles.paymentTop}
                  >
                    <Text style={styles.paymentTitle}>{method.label}</Text>
                    <View style={[styles.switch, setting.enabled && styles.switchOn]}>
                      <Text style={[styles.switchText, setting.enabled && styles.switchTextOn]}>{setting.enabled ? 'ON' : 'OFF'}</Text>
                    </View>
                  </Pressable>
                  {setting.enabled ? (
                    <TextInput
                      value={setting.link}
                      onChangeText={(value) => void setPaymentMethod(method.key, { link: value })}
                      onBlur={() => savePulse(`${method.label} saved`)}
                      placeholder={method.placeholder}
                      placeholderTextColor={colors.mu2}
                      autoCapitalize="none"
                      style={styles.walletInput}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <ToggleRow
            label="Order updates"
            desc="Status changes, packing, ready, and shipped."
            value={notificationSettings.orderUpdates}
            onPress={() => void setNotification('orderUpdates', !notificationSettings.orderUpdates)}
          />
          <ToggleRow
            label="Payment reminders"
            desc="Remind participants before the timer closes."
            value={notificationSettings.paymentReminders}
            onPress={() => void setNotification('paymentReminders', !notificationSettings.paymentReminders)}
          />
          <ToggleRow
            label="Building orders"
            desc="Optional alerts when someone in your building opens an order."
            value={notificationSettings.buildingOrderAlerts}
            onPress={() => void setNotification('buildingOrderAlerts', !notificationSettings.buildingOrderAlerts)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal, security & support</Text>
          <View style={styles.linkList}>
            {LEGAL_LINKS.map((item) => (
              <Pressable
                key={String(item.href)}
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkText}>{item.label}</Text>
                  <Text style={styles.linkNote}>{item.note}</Text>
                </View>
                <Text style={styles.linkArrow}>{'>'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {session ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/profile/delete')} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetDemo();
            savePulse('Demo reset. You can start a fresh investor flow.');
          }}
          style={styles.resetButton}
        >
          <Text style={styles.resetText}>Reset investor demo</Text>
        </Pressable>
      </ScrollView>
    </ScreenBase>
  );
}

function QuickAction({
  title,
  body,
  badge,
  primary,
  onPress,
}: {
  title: string;
  body: string;
  badge: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        primary && styles.quickCardPrimary,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.quickBadge, primary && styles.quickBadgePrimary]}>
        <Text style={styles.quickBadgeText}>{badge}</Text>
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickBody}>{body}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onPress,
}: {
  label: string;
  desc: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={onPress} style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <Text style={[styles.switchText, value && styles.switchTextOn]}>{value ? 'ON' : 'OFF'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 104, gap: 14 },
  header: { gap: 8 },
  headerCopy: { flex: 1, gap: 4 },
  brand: { color: colors.gold, fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 34, lineHeight: 38 },
  subtitle: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  avatarText: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 23 },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 18 },
  email: { marginTop: 3, color: colors.mu, fontFamily: fontFamily.body, fontSize: 13 },
  verifiedBadge: {
    marginTop: 7,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.goldLight,
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  authPill: {
    minHeight: 40,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    flexShrink: 0,
  },
  authPillText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  toast: {
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  toastText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    flexGrow: 1,
    flexBasis: 148,
    minHeight: 144,
    borderRadius: radii.xl,
    padding: 15,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  quickCardPrimary: { backgroundColor: colors.gold, borderColor: colors.acc },
  quickBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.br,
  },
  quickBadgePrimary: { backgroundColor: 'rgba(255,255,255,0.34)', borderColor: 'rgba(255,255,255,0.38)' },
  quickBadgeText: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 19 },
  quickTitle: { marginTop: 10, color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 17 },
  quickBody: { marginTop: 5, color: colors.mu, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19 },
  section: {
    gap: 12,
    padding: 15,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  sectionTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 17 },
  sectionBody: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20 },
  joinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  joinInput: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.bg,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  joinButton: {
    minHeight: 50,
    minWidth: 92,
    borderRadius: radii.lg,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  joinButtonText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  statCard: {
    flexGrow: 1,
    flexBasis: 118,
    minHeight: 78,
    borderRadius: radii.lg,
    padding: 12,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    justifyContent: 'center',
    ...shadow.card,
  },
  statValue: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 22, lineHeight: 25 },
  statLabel: {
    marginTop: 5,
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  savingsHero: {
    gap: 5,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  savingsHeroValue: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 38,
  },
  savingsHeroTitle: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  paymentList: { gap: 10 },
  paymentCard: {
    gap: 10,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.br,
  },
  paymentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentTitle: { flex: 1, color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  walletInput: {
    minHeight: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.body,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.br,
  },
  toggleTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  toggleDesc: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18 },
  switch: {
    width: 58,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.tx, borderColor: colors.tx },
  switchText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 11 },
  switchTextOn: { color: colors.white },
  linkList: { gap: 8 },
  linkRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.br,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  linkText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  linkNote: { marginTop: 2, color: colors.mu, fontFamily: fontFamily.body, fontSize: 12 },
  linkArrow: { color: colors.mu, fontFamily: fontFamily.display, fontSize: 24, lineHeight: 26 },
  deleteButton: {
    minHeight: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.err,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  deleteText: { color: colors.err, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  resetButton: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
  },
  resetText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
});
