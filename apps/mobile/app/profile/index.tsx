import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { type Href, useRouter } from 'expo-router';

import { useGoogleSignIn, useSignOut } from '@/api/auth';
import { ScreenBase } from '@/components/primitives/ScreenBase';
import { stashPendingInvite } from '@/lib/deeplinks';
import { resetAnalytics } from '@/lib/posthog';
import { useLocale } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import {
  getDemoOrderStats,
  getParticipantSuccessCount,
  getVisibleOrdersForParticipant,
  useDemoCommerceStore,
} from '@/stores/demoCommerceStore';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { usePaymentSettingsStore, type PaymentMethodKey } from '@/stores/paymentSettingsStore';
import { fontFamily } from '@/theme/fonts';
import { colors, radii, shadow } from '@/theme/tokens';

const PAYMENT_METHODS: Array<{ key: PaymentMethodKey; label: string; placeholder: string; icon: string }> = [
  { key: 'bit', label: 'Bit', placeholder: '050... or Bit link', icon: 'BT' },
  { key: 'paybox', label: 'PayBox', placeholder: 'PayBox link', icon: 'PB' },
  { key: 'paypal', label: 'PayPal', placeholder: 'paypal.me/name or email', icon: 'PP' },
  { key: 'cash', label: 'Cash / other', placeholder: 'Cash on pickup, bank transfer...', icon: 'CA' },
];

const HELP_LINKS: Array<{ href: Href; label: string; note: string; icon: string }> = [
  { href: '/profile/security', label: 'Auth & security', note: 'Login, reset, OAuth, rate limits', icon: 'SC' },
  { href: '/profile/support', label: 'Contact support', note: 'Support email', icon: 'SP' },
  { href: '/profile/bug-report', label: 'Bug report', note: 'Send a reproducible issue', icon: 'BR' },
  { href: '/profile/privacy', label: 'Privacy Policy', note: 'Data, orders, and account use', icon: 'PR' },
  { href: '/profile/terms', label: 'Terms & Conditions', note: 'Rules for using Shakana', icon: 'TC' },
  { href: '/profile/cookies', label: 'Cookie Consent', note: 'EU GDPR consent controls', icon: 'CK' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const signOut = useSignOut();
  const googleSignIn = useGoogleSignIn();
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

  const accountParticipantId = session?.user.id ?? activeParticipantId;
  const visibleDemoOrders = useMemo(
    () => getVisibleOrdersForParticipant(demoOrders, accountParticipantId),
    [accountParticipantId, demoOrders],
  );
  const stats = getDemoOrderStats(visibleDemoOrders);
  const personalSaves = getParticipantSuccessCount(visibleDemoOrders, accountParticipantId);
  const readyPayments = Object.values(paymentSettings).filter((method) => method.enabled && method.link.trim()).length;
  const openOrders = visibleDemoOrders.filter((order) => order.status !== 'shipped').length;
  const latestOrder = visibleDemoOrders[0] ?? null;
  const savingsThisYear = Math.round(stats.totalSavings);
  const initial = displayName.charAt(0).toUpperCase() || 'S';
  const copy = isHebrew
    ? {
        title: 'הפרופיל שלי',
        subtitle: 'הזמנות, תשלומים, התראות ותמיכה במקום אחד ברור.',
        guestEmail: 'התחברו כדי לשייך הזמנות לחשבון שלכם',
        verified: 'משתמש מאומת',
        guestMode: 'מצב אורח',
        signOut: 'התנתקות',
        signIn: 'כניסה',
        signingOut: 'מתנתק...',
        opening: 'פותח...',
        startHere: 'התחילו כאן',
        mainActions: 'פעולות ראשיות',
        openMeta: 'פתוחות',
        newOrder: 'הזמנה חדשה',
        newOrderBody: 'חנות, טיימר וכתובת.',
        myOrders: 'ההזמנות שלי',
        myOrdersBody: 'סלים פתוחים והיסטוריה.',
        copyInvite: 'העתקת קישור',
        copyInviteBody: 'שתפו את ההזמנה האחרונה.',
        storeView: 'תצוגת חנות',
        storeViewBody: 'דשבורד סוחר.',
        joinTitle: 'הצטרפות להזמנה',
        joinBody: 'הכניסו את הקוד מוואטסאפ. קישורי הזמנה עדיין נפתחים ישירות.',
        join: 'הצטרף',
        enterCode: 'הכניסו קודם קוד בן 4 ספרות.',
        createFirst: 'צרו הזמנה קודם, ואז העתיקו את הקישור.',
        inviteCopied: 'קישור הזמנה הועתק',
        open: 'פתוחות',
        completed: 'הושלמו',
        mySaves: 'חסכתי',
        savedYear: 'חיסכון השנה',
        wallets: 'ארנקים',
        savingsTracker: 'מעקב חיסכון אישי',
        savingsBody: 'הזמנות קבוצתיות שהושלמו מעדכנות את המספר הזה אוטומטית.',
        notifications: 'התראות',
        notificationsBody: 'כל התראה מסומנת בבירור כדי לדעת מה משנים.',
        orderUpdates: 'עדכוני הזמנה',
        orderUpdatesBody: 'אריזה, מוכנה, נשלחה ושינויי חנות.',
        paymentReminders: 'תזכורות תשלום',
        paymentRemindersBody: 'תזכורת למשתתפים לפני שהטיימר נסגר.',
        buildingOrders: 'הזמנות בבניין',
        buildingOrdersBody: 'התראות כשמישהו בבניין פותח הזמנה.',
        walletTitle: 'ארנקים ותשלום',
        walletBody: 'בחרו איך אנשים יוכלו לשלם לכם.',
        helpTitle: 'עזרה, משפטי ואבטחה',
        helpBody: 'תמיכה, אבטחה ועמודים משפטיים במקום מסודר.',
        deleteAccount: 'מחיקת חשבון',
        resetDemo: 'איפוס דמו למשקיעים',
        demoReset: 'הדמו אופס. אפשר להתחיל זרימה חדשה.',
        on: 'פעיל',
        off: 'כבוי',
      }
    : {
        title: 'My profile',
        subtitle: 'Orders, payments, alerts, and support in one simple account hub.',
        guestEmail: 'Sign in to attach orders to your account',
        verified: 'Verified member',
        guestMode: 'Guest mode',
        signOut: 'Sign out',
        signIn: 'Sign in',
        signingOut: 'Signing out...',
        opening: 'Opening...',
        startHere: 'Start here',
        mainActions: 'Main actions',
        openMeta: 'open',
        newOrder: 'New order',
        newOrderBody: 'Store, timer, address.',
        myOrders: 'My orders',
        myOrdersBody: 'Open carts and history.',
        copyInvite: 'Copy invite',
        copyInviteBody: 'Share latest cart link.',
        storeView: 'Store view',
        storeViewBody: 'Merchant dashboard.',
        joinTitle: 'Join an order',
        joinBody: 'Enter the WhatsApp code. Invite links still open directly.',
        join: 'Join',
        enterCode: 'Enter a 4-digit invite code first.',
        createFirst: 'Create an order first, then copy its invite.',
        inviteCopied: 'Invite copied',
        open: 'Open',
        completed: 'Completed',
        mySaves: 'My saves',
        savedYear: 'Saved this year',
        wallets: 'Wallets',
        savingsTracker: 'Personal savings tracker',
        savingsBody: 'Your completed group orders feed this number automatically.',
        notifications: 'Notifications',
        notificationsBody: 'Each alert has a clear badge so users know what they are changing.',
        orderUpdates: 'Order updates',
        orderUpdatesBody: 'Packing, ready, shipped, and merchant changes.',
        paymentReminders: 'Payment reminders',
        paymentRemindersBody: 'Remind participants before the timer closes.',
        buildingOrders: 'Building orders',
        buildingOrdersBody: 'Alerts when someone in your building opens an order.',
        walletTitle: 'Wallets & payment',
        walletBody: 'Choose which payment methods people can use with you.',
        helpTitle: 'Help, legal & security',
        helpBody: 'Support and legal pages are grouped together and easy to scan.',
        deleteAccount: 'Delete account',
        resetDemo: 'Reset investor demo',
        demoReset: 'Demo reset. You can start a fresh investor flow.',
        on: 'ON',
        off: 'OFF',
      };
  const email = session?.user.email ?? copy.guestEmail;

  const savePulse = (message: string) => {
    setSavedPulse(message);
    globalThis.setTimeout(() => setSavedPulse(''), 1800);
  };

  const joinByCode = async () => {
    const code = joinCode.replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) {
      savePulse(copy.enterCode);
      return;
    }
    if (!session) {
      await stashPendingInvite(code);
      router.push('/login');
      return;
    }
    router.push(`/user?join=${code}` as Href);
  };

  const copyLatestInvite = async () => {
    if (!latestOrder) {
      savePulse(copy.createFirst);
      return;
    }
    await Clipboard.setStringAsync(`https://shakana1.vercel.app/join/${latestOrder.inviteCode}`);
    savePulse(`${copy.inviteCopied} ${latestOrder.inviteCode}`);
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

  return (
    <ScreenBase padded={false}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>SHAKANA</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{email}</Text>
            <Text style={styles.verifiedBadge}>{session ? copy.verified : copy.guestMode}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={session ? onSignOut : () => googleSignIn.mutate()}
            disabled={signOut.isPending || googleSignIn.isPending}
            style={({ pressed }) => [styles.authPill, pressed && styles.pressed]}
          >
            <Text style={styles.authPillText}>
              {signOut.isPending ? copy.signingOut : googleSignIn.isPending ? copy.opening : session ? copy.signOut : copy.signIn}
            </Text>
          </Pressable>
        </View>

        {savedPulse ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{savedPulse}</Text>
          </View>
        ) : null}

        <View style={styles.actionHub}>
          <View style={styles.hubHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>{copy.startHere}</Text>
              <Text style={styles.hubTitle}>{copy.mainActions}</Text>
            </View>
            <Text style={styles.hubMeta}>{openOrders} {copy.openMeta}</Text>
          </View>
          <View style={styles.quickGrid}>
            <QuickAction title={copy.newOrder} body={copy.newOrderBody} badge="NO" primary onPress={() => router.push('/new-order' as Href)} />
            <QuickAction title={copy.myOrders} body={copy.myOrdersBody} badge="MO" onPress={() => router.push('/user')} />
            <QuickAction title={copy.copyInvite} body={copy.copyInviteBody} badge="SH" onPress={copyLatestInvite} />
            <QuickAction title={copy.storeView} body={copy.storeViewBody} badge="ST" onPress={() => router.push('/store')} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader icon="JO" title={copy.joinTitle} body={copy.joinBody} />
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
            <Pressable accessibilityRole="button" onPress={joinByCode} style={({ pressed }) => [styles.joinButton, pressed && styles.pressed]}>
              <Text style={styles.joinButtonText}>{copy.join}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Stat icon="OP" label={copy.open} value={String(openOrders)} />
          <Stat icon="CP" label={copy.completed} value={String(stats.shippedOrders)} />
          <Stat icon="SV" label={copy.mySaves} value={String(personalSaves)} />
          <Stat icon="IL" label={copy.savedYear} value={`ILS ${savingsThisYear}`} />
          <Stat icon="WL" label={copy.wallets} value={String(readyPayments)} />
        </View>

        <View style={styles.savingsHero}>
          <IconBadge label="IL" large />
          <View style={{ flex: 1 }}>
            <Text style={styles.savingsHeroValue}>ILS {savingsThisYear}</Text>
            <Text style={styles.savingsHeroTitle}>{copy.savingsTracker}</Text>
            <Text style={styles.sectionBody}>{copy.savingsBody}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader icon="AL" title={copy.notifications} body={copy.notificationsBody} />
          <ToggleRow icon="OU" label={copy.orderUpdates} desc={copy.orderUpdatesBody} value={notificationSettings.orderUpdates} onPress={() => void setNotification('orderUpdates', !notificationSettings.orderUpdates)} onLabel={copy.on} offLabel={copy.off} />
          <ToggleRow icon="PR" label={copy.paymentReminders} desc={copy.paymentRemindersBody} value={notificationSettings.paymentReminders} onPress={() => void setNotification('paymentReminders', !notificationSettings.paymentReminders)} onLabel={copy.on} offLabel={copy.off} />
          <ToggleRow icon="BO" label={copy.buildingOrders} desc={copy.buildingOrdersBody} value={notificationSettings.buildingOrderAlerts} onPress={() => void setNotification('buildingOrderAlerts', !notificationSettings.buildingOrderAlerts)} onLabel={copy.on} offLabel={copy.off} />
        </View>

        <View style={styles.section}>
          <SectionHeader icon="WL" title={copy.walletTitle} body={copy.walletBody} />
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
                    <IconBadge label={method.icon} />
                    <Text style={styles.paymentTitle}>{method.label}</Text>
                    <View style={[styles.switch, setting.enabled && styles.switchOn]}>
                      <Text style={[styles.switchText, setting.enabled && styles.switchTextOn]}>{setting.enabled ? copy.on : copy.off}</Text>
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
          <SectionHeader icon="HL" title={copy.helpTitle} body={copy.helpBody} />
          <View style={styles.linkList}>
            {HELP_LINKS.map((item) => (
              <Pressable key={String(item.href)} accessibilityRole="button" onPress={() => router.push(item.href)} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
                <IconBadge label={item.icon} />
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
            <Text style={styles.deleteText}>{copy.deleteAccount}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetDemo();
            savePulse(copy.demoReset);
          }}
          style={styles.resetButton}
        >
          <Text style={styles.resetText}>{copy.resetDemo}</Text>
        </Pressable>
      </ScrollView>
    </ScreenBase>
  );
}

function IconBadge({ label, small = false, large = false }: { label: string; small?: boolean; large?: boolean }) {
  return (
    <View style={[styles.iconBadge, small && styles.iconBadgeSmall, large && styles.iconBadgeLarge]}>
      <Text style={[styles.iconBadgeText, small && styles.iconBadgeTextSmall, large && styles.iconBadgeTextLarge]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.sectionHeader}>
      <IconBadge label={icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionBody}>{body}</Text>
      </View>
    </View>
  );
}

function QuickAction({ title, body, badge, primary, onPress }: { title: string; body: string; badge: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickCard, primary && styles.quickCardPrimary, pressed && styles.pressed]}>
      <View style={styles.quickTop}>
        <View style={[styles.quickBadge, primary && styles.quickBadgePrimary]}>
          <Text style={[styles.quickBadgeText, primary && styles.quickBadgeTextPrimary]}>{badge}</Text>
        </View>
        <Text style={[styles.quickArrow, primary && styles.quickArrowPrimary]}>{'>'}</Text>
      </View>
      <View>
        <Text style={[styles.quickTitle, primary && styles.quickTitlePrimary]}>{title}</Text>
        <Text style={[styles.quickBody, primary && styles.quickBodyPrimary]}>{body}</Text>
      </View>
    </Pressable>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <IconBadge label={icon} small />
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  value,
  onPress,
  onLabel,
  offLabel,
}: {
  icon: string;
  label: string;
  desc: string;
  value: boolean;
  onPress: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={onPress} style={styles.toggleRow}>
      <IconBadge label={icon} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <Text style={[styles.switchText, value && styles.switchTextOn]}>{value ? onLabel : offLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 104, gap: 14 },
  header: { gap: 5, paddingTop: 4 },
  brand: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 36, lineHeight: 40 },
  subtitle: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, maxWidth: 520 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  avatarText: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 24 },
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
    minHeight: 42,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.acc,
    flexShrink: 0,
  },
  authPillText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  toast: {
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  toastText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  actionHub: {
    gap: 12,
    padding: 15,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  hubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  sectionEyebrow: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  hubTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 18 },
  hubMeta: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 132,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    justifyContent: 'space-between',
  },
  quickCardPrimary: { backgroundColor: colors.acc, borderColor: colors.acc },
  quickTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickBadge: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
  },
  quickBadgePrimary: { backgroundColor: 'rgba(250,246,239,0.18)', borderColor: 'rgba(250,246,239,0.32)' },
  quickBadgeText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  quickBadgeTextPrimary: { color: colors.white },
  quickArrow: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 18 },
  quickArrowPrimary: { color: colors.white },
  quickTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 16 },
  quickTitlePrimary: { color: colors.white },
  quickBody: { marginTop: 5, color: colors.mu, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  quickBodyPrimary: { color: 'rgba(250,246,239,0.82)' },
  section: {
    gap: 12,
    padding: 15,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sectionTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 17 },
  sectionBody: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20 },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  iconBadgeSmall: { width: 34, height: 34, borderRadius: 12 },
  iconBadgeLarge: { width: 58, height: 58, borderRadius: 20 },
  iconBadgeText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  iconBadgeTextSmall: { fontSize: 10 },
  iconBadgeTextLarge: { fontSize: 15 },
  joinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  joinInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  joinButton: {
    minHeight: 52,
    minWidth: 96,
    borderRadius: radii.lg,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  joinButtonText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 78,
    borderRadius: radii.lg,
    padding: 12,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  statValue: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 21, lineHeight: 24 },
  statLabel: { marginTop: 3, color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  savingsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  savingsHeroValue: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 34, lineHeight: 38 },
  savingsHeroTitle: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 13, textTransform: 'uppercase' },
  paymentList: { gap: 10 },
  paymentCard: {
    gap: 10,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.s2,
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
    backgroundColor: colors.s1,
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
    backgroundColor: colors.s2,
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
  switchOn: { backgroundColor: colors.acc, borderColor: colors.acc },
  switchText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 11 },
  switchTextOn: { color: colors.white },
  linkList: { gap: 8 },
  linkRow: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  linkNote: { marginTop: 2, color: colors.mu, fontFamily: fontFamily.body, fontSize: 12 },
  linkArrow: { color: colors.mu, fontFamily: fontFamily.display, fontSize: 24, lineHeight: 26 },
  deleteButton: {
    minHeight: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.err,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s1,
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
