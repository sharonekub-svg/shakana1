import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useLocale } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { useUserOrders } from '@/api/orders';
import { useSignOut } from '@/api/auth';
import { resetAnalytics } from '@/lib/posthog';
import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

type QuickLink = {
  href: string;
  en: string;
  he: string;
  danger?: boolean;
};

const QUICK_LINKS: QuickLink[] = [
  { href: '/profile/payment', en: 'Payments', he: 'תשלומים' },
  { href: '/profile/alerts', en: 'Alerts', he: 'התראות' },
  { href: '/profile/privacy', en: 'Privacy', he: 'פרטיות' },
  { href: '/profile/terms', en: 'Terms', he: 'תנאים' },
  { href: '/profile/delete', en: 'Delete account', he: 'מחיקת חשבון', danger: true },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLocale();
  const isHebrew = language === 'he';
  const signOut = useSignOut();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const resetAuth = useAuthStore((s) => s.reset);
  const { data: orders = [] } = useUserOrders(session?.user.id);

  const fullName = useMemo(
    () => [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim(),
    [profile?.first_name, profile?.last_name],
  );

  const email = session?.user.email ?? (isHebrew ? '׳׳™׳ ׳׳×׳•׳‘׳× ׳“׳•׳׳¨׳׳' : 'No email yet');
  const openOrders = orders.filter((order) => !['completed', 'cancelled', 'Shipped'].includes(order.status)).length;

  const copy = isHebrew
    ? {
        title: '׳₪׳¨׳•׳₪׳™׳',
        subtitle: '׳›׳׳ ׳׳©׳˜׳™׳ ׳©׳₪׳”, ׳”׳×׳¨׳׳•׳×, ׳•׳”׳”׳–׳׳ ׳•׳× ׳©׳׳ ׳‘׳’׳¨׳¡׳” ׳׳—׳× ׳ ׳§׳™׳™׳”.',
        ready: '׳₪׳¨׳•׳₪׳™׳ ׳׳•׳›׳',
        guest: '׳׳×׳” ׳׳ ׳׳•׳’׳“׳¨ ׳›׳‘׳¨ ׳‘׳׳©׳×׳׳©. ׳׳₪׳©׳¨ ׳׳”׳×׳—׳‘׳¨ ׳׳•׳׳™ ׳׳“׳£ ׳”׳׳¨׳™׳›׳”.',
        guestCta: '׳”׳×׳—׳‘׳¨׳•׳× ׳׳׳×׳׳©׳׳',
        account: '׳—׳©׳‘׳•׳',
        nameLabel: '׳©׳',
        emailLabel: '׳“׳•׳׳¨׳׳',
        openOrdersLabel: '׳”׳–׳׳ ׳•׳× ׳₪׳×׳•׳—׳•׳×',
        languageTitle: '׳©׳₪׳”',
        languageBody: '׳׳₪׳©׳¨ ׳׳¢׳‘׳¨ ׳‘׳™׳ ׳¢׳‘׳¨׳™׳× ׳׳׳ ׳’׳׳™׳× ׳‘׳׳¡׳ ׳׳—׳“.',
        settingsTitle: '׳’׳“׳¨׳•׳× ׳׳—׳©׳‘׳',
        signOut: '׳×׳¤׳§׳™׳“ ׳Ÿ׳—׳¬׳™׳¨׳”',
      }
    : {
        title: 'Profile',
        subtitle: 'Keep language, notifications, and account details in one calm place.',
        ready: 'Profile ready',
        guest: 'You are not signed in yet. Continue from the login screen to save your details.',
        guestCta: 'Go to login',
        account: 'Account',
        nameLabel: 'Name',
        emailLabel: 'Email',
        openOrdersLabel: 'Open orders',
        languageTitle: 'Language',
        languageBody: 'Switch between Hebrew and English whenever you need it.',
        settingsTitle: 'Account settings',
        signOut: 'Sign out',
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
        <View style={styles.shell}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>SHAKANA</Text>
              <Text style={styles.title}>{copy.title}</Text>
            </View>
            <View style={styles.topRight}>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{copy.ready}</Text>
              </View>
              <LanguageSwitcher />
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(fullName || email).charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>{copy.account}</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {fullName || (isHebrew ? '׳׳•׳¨׳— ׳׳—׳™׳“' : 'Guest user')}
              </Text>
              <Text style={styles.heroBody}>{copy.subtitle}</Text>
            </View>
          </View>

          {!session ? (
            <View style={styles.guestCard}>
              <Text style={styles.sectionTitle}>{copy.guest}</Text>
              <SecondaryBtn label={copy.guestCta} onPress={() => router.push('/login')} />
            </View>
          ) : null}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{copy.nameLabel}</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {fullName || (isHebrew ? '׳׳ ׳¢׳•׳“׳׳' : 'Not set')}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{copy.emailLabel}</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{copy.openOrdersLabel}</Text>
              <Text style={styles.summaryValue}>{String(openOrders)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{copy.languageTitle}</Text>
              <Text style={styles.summaryValue}>{language.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{copy.languageTitle}</Text>
            <Text style={styles.sectionBody}>{copy.languageBody}</Text>
            <LanguageSwitcher />
            <View style={styles.languageRow}>
              <Pressable onPress={() => void setLanguage('he')} style={[styles.languageGhost, isHebrew && styles.languageGhostActive]}>
                <Text style={[styles.languageGhostText, isHebrew && styles.languageGhostTextActive]}>{isHebrew ? 'עברית' : 'Hebrew'}</Text>
              </Pressable>
              <Pressable onPress={() => void setLanguage('en')} style={[styles.languageGhost, !isHebrew && styles.languageGhostActive]}>
                <Text style={[styles.languageGhostText, !isHebrew && styles.languageGhostTextActive]}>English</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{copy.settingsTitle}</Text>
            <View style={styles.linkGrid}>
              {QUICK_LINKS.map((item) => (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href)}
                  style={({ pressed }) => [styles.linkCard, pressed && { transform: [{ scale: 0.99 }] }]}
                >
                  <Text style={[styles.linkLabel, item.danger && styles.linkLabelDanger]}>
                    {isHebrew ? item.he : item.en}
                  </Text>
                  <Text style={styles.linkArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {session ? (
            <PrimaryBtn label={copy.signOut} onPress={onSignOut} />
          ) : null}
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  shell: {
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  brand: {
    color: colors.gold,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 4,
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 38,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.goldLight,
  },
  statusText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.acc,
    fontFamily: fontFamily.display,
    fontSize: 24,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroKicker: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroName: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 20,
  },
  heroBody: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  guestCard: {
    gap: 12,
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  sectionTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  sectionBody: {
    marginTop: 6,
    marginBottom: 12,
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '48%',
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    gap: 6,
    ...shadow.card,
  },
  summaryLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  languageGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.bg,
  },
  languageGhostActive: {
    backgroundColor: colors.tx,
    borderColor: colors.tx,
  },
  languageGhostText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  languageGhostTextActive: {
    color: colors.white,
  },
  linkGrid: {
    gap: 10,
  },
  linkCard: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.br,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkLabel: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
  },
  linkLabelDanger: {
    color: colors.err,
  },
  linkArrow: {
    color: colors.mu,
    fontFamily: fontFamily.display,
    fontSize: 20,
  },
});
