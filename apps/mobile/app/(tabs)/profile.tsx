import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  value?: string;
  code: string;
  danger?: boolean;
  onPress?: () => void;
};

function Row({ label, value, code, danger, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardSoft }]}
      accessibilityRole="button"
    >
      <View style={[styles.codeWrap, danger && { backgroundColor: colors.err }]}>
        <Text style={[styles.codeText, danger && { color: colors.white }]}>{code}</Text>
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.err }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {!danger ? (
        <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
          <Path d="M5 10L1 6l4-4" stroke={colors.mu2} strokeWidth={2} strokeLinecap="square" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

export default function ProfileTab() {
  const { t } = useLocale();
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
      pushToast(e instanceof Error ? e.message : t('common.signOutFailed'), 'error');
    }
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 18, gap: 16 }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>SHAKANA</Text>
              <Text style={styles.title}>{t('tabs.profile.title')}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'SK'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{profile ? `${profile.first_name} ${profile.last_name}` : t('common.signedOut')}</Text>
              {profile ? (
                <>
                  <Text style={styles.cardLine}>
                    {profile.street} {profile.building}, {t('auth.address.apartment')} {profile.apt}
                  </Text>
                  <Text style={styles.cardLine}>{profile.city}</Text>
                </>
              ) : null}
            </View>
          </View>

          <LanguageSwitcher />

          <Text style={styles.section}>{t('common.account')}</Text>
          <View style={styles.group}>
            <Row code="ADR" label={t('common.savedAddress')} value={profile ? `${profile.street} ${profile.building}` : ''} />
            <Row code="TEL" label={t('common.phoneNumber')} value={profile?.phone ? `+972 ${profile.phone}` : ''} />
            <Row code="PAY" label={t('common.paymentMethod')} value={t('common.add')} />
            <Row code="ALR" label={t('common.alerts')} />
          </View>

          <Text style={styles.section}>{t('common.policy')}</Text>
          <View style={styles.group}>
            <Row code="DOC" label={t('common.terms')} onPress={() => Linking.openURL('https://shakana.app/legal/terms')} />
            <Row code="LCK" label={t('common.privacy')} onPress={() => Linking.openURL('https://shakana.app/legal/privacy')} />
            <Row code="MAIL" label={t('common.support')} value="support@shakana.app" onPress={() => Linking.openURL('mailto:support@shakana.app')} />
            <Row code="OUT" label={t('common.signOut')} danger onPress={handleLogout} />
          </View>

          <View style={styles.group}>
            <Row code="DEL" label={t('common.deleteAccount')} danger onPress={handleLogout} />
          </View>

          <Text style={styles.version}>{t('tabs.profile.version')}</Text>
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
  codeWrap: {
    width: 42,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.br,
  },
  codeText: { fontSize: 10, letterSpacing: 1, color: colors.tx, fontFamily: fontFamily.bodyBold },
  rowLabel: { flex: 1, fontSize: 15, color: colors.tx, fontFamily: fontFamily.body },
  rowValue: { fontSize: 14, color: colors.mu, fontFamily: fontFamily.body },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.mu,
    fontFamily: fontFamily.body,
    marginTop: 4,
  },
});
