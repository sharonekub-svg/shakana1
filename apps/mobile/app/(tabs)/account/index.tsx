import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';

const quickLinks = [
  { href: '/profile/payment', labelKey: 'paymentTitle' },
  { href: '/profile/alerts', labelKey: 'alertsTitle' },
  { href: '/profile/privacy', labelKey: 'privacyTitle' },
  { href: '/profile/terms', labelKey: 'termsTitle' },
  { href: '/profile/delete', labelKey: 'deleteTitle' },
] as const;

export default function AccountTab() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>SHAKANA</Text>
        <Text style={styles.title}>{t('tabs.profile.title')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('account')}</Text>
        <Text style={styles.cardBody}>
          {t('savedAddress')} {t('and')} {t('phoneNumber')}. {t('paymentMethod')} {t('alerts')}. 
        </Text>
      </View>

      <View style={styles.links}>
        {quickLinks.map((item) => (
          <Pressable
            key={item.labelKey}
            style={styles.link}
            onPress={() => router.push(item.href)}
          >
            <Text style={styles.linkLabel}>{t(`profile.${item.labelKey}` as never)}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    gap: 4,
  },
  brand: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.acc,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.tx,
  },
  card: {
    gap: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  cardTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  cardBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.mu,
  },
  links: {
    gap: 10,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  linkLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  linkArrow: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.mu,
  },
});
