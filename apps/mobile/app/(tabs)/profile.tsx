import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';
import { useSignOut } from '@/api/auth';
import { useUiStore } from '@/stores/uiStore';
import { resetAnalytics } from '@/lib/posthog';
import { useLocale } from '@/i18n/locale';

type RowProps = {
  label: string;
  description?: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
};

function Row({ label, description, value, danger, onPress }: RowProps) {
  const content = (
    <>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.rowLabel, danger && { color: colors.err }]}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress && !danger ? (
        <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
          <Path d="M5 10L1 6l4-4" stroke={colors.mu2} strokeWidth={2} strokeLinecap="square" />
        </Svg>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardSoft }]}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const user = useAuthStore((s) => s.user);
  const reset = useAuthStore((s) => s.reset);
  const { data: profile } = useProfile(user?.id);
  const signOut = useSignOut();
  const pushToast = useUiStore((s) => s.pushToast);

  const initials = (profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '');

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      resetAnalytics();
      reset();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : isHebrew ? 'לא הצלחתי להתנתק.' : 'Sign out failed.', 'error');
    }
  };

  const handleSupport = async () => {
    try {
      await Linking.openURL('mailto:support@shakana.app');
    } catch {
      pushToast(isHebrew ? 'לא הצלחתי לפתוח את אפליקציית המייל.' : 'Could not open your email app.', 'error');
    }
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 18, gap: 16 }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>SHAKANA</Text>
              <Text style={styles.title}>{isHebrew ? 'פרופיל' : 'Profile'}</Text>
              <Text style={styles.subtitle}>
                {isHebrew
                  ? 'כאן תמצא הגדרות שמפעילות את החשבון שלך, ומסכי מידע שלא משנים כלום.'
                  : 'This page mixes account settings with read-only info pages. Only the settings change your account.'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'SK'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{profile ? `${profile.first_name} ${profile.last_name}` : isHebrew ? 'לא מחובר' : 'Signed out'}</Text>
              {profile ? (
                <>
                  <Text style={styles.cardLine}>
                    {profile.street} {profile.building}, {isHebrew ? 'דירה' : 'Apt'} {profile.apt}
                  </Text>
                  <Text style={styles.cardLine}>{profile.city}</Text>
                </>
              ) : null}
            </View>
          </View>

          <LanguageSwitcher />

          <Text style={styles.section}>{isHebrew ? 'חשבון' : 'Account'}</Text>
          <View style={styles.group}>
            <Row
              label={isHebrew ? 'כתובת שמורה' : 'Saved address'}
              description={isHebrew ? 'משמשת למשלוחים בלבד' : 'Used for deliveries'}
              value={profile ? `${profile.street} ${profile.building}` : ''}
            />
            <Row
              label={isHebrew ? 'מספר טלפון' : 'Phone number'}
              description={isHebrew ? 'משמש לכניסה ולעדכונים' : 'Used for sign-in and order updates'}
              value={profile?.phone ? `+972 ${profile.phone}` : ''}
            />
            <Row
              label={isHebrew ? 'תשלום' : 'Payment'}
              description={isHebrew ? 'פותח את מסך ההסבר על תשלום' : 'Opens the payment explanation page'}
              value={isHebrew ? 'לצפייה' : 'Open'}
              onPress={() => router.push('/(tabs)/profile/payment')}
            />
            <Row
              label={isHebrew ? 'התראות' : 'Alerts'}
              description={isHebrew ? 'הפעלה וכיבוי של התראות לחשבון הזה' : 'Toggle notifications for this account'}
              value={isHebrew ? 'לצפייה' : 'Open'}
              onPress={() => router.push('/(tabs)/profile/alerts')}
            />
          </View>

          <Text style={styles.section}>{isHebrew ? 'מידע' : 'Info'}</Text>
          <View style={styles.group}>
            <Row
              label={isHebrew ? 'תנאי שימוש' : 'Terms of use'}
              description={isHebrew ? 'מסך מידע בלבד, לא משנה את החשבון' : 'Read only. This does not change your account.'}
              value={isHebrew ? 'לקריאה' : 'Read'}
              onPress={() => router.push('/(tabs)/profile/terms')}
            />
            <Row
              label={isHebrew ? 'מדיניות פרטיות' : 'Privacy policy'}
              description={isHebrew ? 'מסך מידע בלבד, לא משנה את החשבון' : 'Read only. This does not change your account.'}
              value={isHebrew ? 'לקריאה' : 'Read'}
              onPress={() => router.push('/(tabs)/profile/privacy')}
            />
            <Row
              label={isHebrew ? 'תמיכה' : 'Support'}
              description={isHebrew ? 'פותח מייל לתמיכה' : 'Opens email support'}
              value="support@shakana.app"
              onPress={handleSupport}
            />
            <Row
              label={isHebrew ? 'התנתקות' : 'Sign out'}
              description={isHebrew ? 'יוציא אותך מהחשבון' : 'Logs you out of this account'}
              danger
              onPress={handleLogout}
            />
          </View>

          <Text style={styles.section}>{isHebrew ? 'אזור מסוכן' : 'Danger zone'}</Text>
          <View style={styles.group}>
            <Row
              label={isHebrew ? 'מחיקת חשבון' : 'Delete account'}
              description={isHebrew ? 'מוחק את החשבון והמידע הקשור אליו' : 'Permanently deletes this account and related data'}
              danger
              onPress={() => router.push('/(tabs)/profile/delete')}
            />
          </View>

          <Text style={styles.version}>{isHebrew ? 'גרסה 1.0.0 · 2026' : 'Version 1.0.0 · 2026'}</Text>
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
    marginBottom: 4,
  },
  title: { fontFamily: fontFamily.display, fontSize: 26, color: colors.tx },
  subtitle: {
    marginTop: 8,
    maxWidth: 330,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 18,
    borderColor: colors.br,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadow.card,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.br,
  },
  avatarText: { fontSize: 20, fontFamily: fontFamily.display, color: colors.white },
  name: { fontSize: 18, color: colors.tx, fontFamily: fontFamily.bodyBold },
  cardLine: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.body, marginTop: 1, lineHeight: 20 },
  section: {
    fontSize: 11,
    fontFamily: fontFamily.bodyBold,
    color: colors.mu,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  group: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderColor: colors.br,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomColor: colors.br,
    borderBottomWidth: 1,
    minHeight: 54,
  },
  rowLabel: { fontSize: 15, color: colors.tx, fontFamily: fontFamily.body },
  rowDescription: { fontSize: 12, color: colors.mu, fontFamily: fontFamily.body, lineHeight: 18 },
  rowValue: { fontSize: 14, color: colors.mu2, fontFamily: fontFamily.body },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.mu,
    fontFamily: fontFamily.body,
    marginTop: 4,
  },
});
