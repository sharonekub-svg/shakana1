import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useUserOrders } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { useLocale } from '@/i18n/locale';

export default function PaymentSettings() {
  const router = useRouter();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { data: orders = [] } = useUserOrders(user?.id);
  const pendingOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const nextOrder = pendingOrders[0] ?? null;

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View>
          <Text style={styles.kicker}>SHAKANA</Text>
          <Text style={styles.title}>{t('profile.paymentTitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.paymentHead')}</Text>
        <Text style={styles.cardBody}>{t('profile.paymentBody')}</Text>
        <Text style={styles.cardNote}>{t('profile.paymentSecurity')}</Text>
      </View>

      {nextOrder ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.paymentNextOrder')}</Text>
          <Text style={styles.cardBody}>{nextOrder.product_title ?? nextOrder.product_url}</Text>
          <Text style={styles.cardNote}>
            {formatAgorot(nextOrder.product_price_agorot)} • {nextOrder.max_participants} {t('tabs.orders.seats')}
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push(`/order/${nextOrder.id}/pay`)}>
            <Text style={styles.secondaryBtnText}>{t('profile.paymentContinue')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.paymentNoOrder')}</Text>
          <Text style={styles.cardBody}>{t('profile.paymentNoOrderBody')}</Text>
        </View>
      )}

      <PrimaryBtn label={t('common.newOrder')} onPress={() => router.push('/order/new')} />
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 20,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
  },
  card: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: 28,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  cardTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  cardBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.mu,
  },
  cardNote: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mu2,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.tx,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
});
