import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { useUserOrders } from '@/api/orders';
import { useAuthStore } from '@/stores/authStore';

const quickLinks = [
  { href: '/profile/payment', title: 'Payment', body: 'Checkout and saved payment settings', danger: false },
  { href: '/profile/alerts', title: 'Alerts', body: 'Order updates and reminders', danger: false },
  { href: '/profile/privacy', title: 'Privacy', body: 'How account data is handled', danger: false },
  { href: '/profile/terms', title: 'Terms', body: 'Rules for shared orders', danger: false },
  { href: '/profile/delete', title: 'Delete account', body: 'Remove your profile safely', danger: true },
] as const;

export default function AccountTab() {
  const router = useRouter();
  const { language } = useLocale();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { data: orders = [] } = useUserOrders(user?.id);
  const openOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const address = [profile?.street, profile?.building, profile?.apt ? `Apt ${profile.apt}` : null, profile?.city]
    .filter(Boolean)
    .join(', ');
  const isHebrew = language === 'he';
  const copy = {
    profileTitle: isHebrew ? 'Profile' : 'Profile',
    ready: isHebrew ? 'Profile ready' : 'Profile ready',
    name: fullName || 'Shakana customer',
    account: isHebrew ? 'Account' : 'Account',
    profileBody: isHebrew ? 'Keep your account organized before checkout.' : 'Keep your account organized before checkout.',
    address: address || (isHebrew ? 'Address not added yet' : 'Address not added yet'),
    phone: profile?.phone || (isHebrew ? 'Phone not added yet' : 'Phone not added yet'),
    openOrders: isHebrew ? 'Open orders' : 'Open orders',
    details: isHebrew ? 'Details' : 'Details',
    deliveryAddress: isHebrew ? 'Delivery address' : 'Delivery address',
  };

  return (
    <ScreenBase padded={false}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SHAKANA</Text>
            <Text style={styles.title}>{copy.profileTitle}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{copy.ready}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{copy.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroKicker}>{copy.account}</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {copy.name}
            </Text>
            <Text style={styles.heroBody}>{copy.profileBody}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Phone</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {copy.phone}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{copy.openOrders}</Text>
            <Text style={styles.statValue}>{openOrders}</Text>
          </View>
        </View>

        <View style={styles.addressCard}>
          <Text style={styles.sectionTitle}>{copy.deliveryAddress}</Text>
          <Text style={styles.addressText}>{copy.address}</Text>
        </View>

        <View style={styles.links}>
          <Text style={styles.sectionTitle}>{copy.details}</Text>
          {quickLinks.map((item) => (
            <Pressable
              key={item.href}
              style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              onPress={() => router.push(item.href)}
            >
              <View style={styles.linkCopy}>
                <Text style={[styles.linkLabel, item.danger && styles.dangerText]}>{item.title}</Text>
                <Text style={styles.linkBody}>{item.body}</Text>
              </View>
              <Text style={styles.linkArrow}>{'>'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.acc,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
  },
  statusText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.acc,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  avatarText: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.white,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  heroName: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  heroBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mu,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 84,
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
  },
  statLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  addressCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  sectionTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  addressText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
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
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  linkPressed: {
    backgroundColor: colors.cardSoft,
  },
  linkCopy: {
    flex: 1,
    gap: 3,
    paddingRight: 10,
  },
  linkLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  linkBody: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mu,
  },
  linkArrow: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    color: colors.mu,
  },
  dangerText: {
    color: colors.err,
  },
});
