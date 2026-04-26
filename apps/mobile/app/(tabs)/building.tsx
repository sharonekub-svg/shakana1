import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';
import { useUserOrders } from '@/api/orders';

function DashboardMark() {
  return (
    <View style={styles.markShell}>
      <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
        <Rect x="2" y="2" width="30" height="30" stroke={colors.tx} strokeWidth={1.5} />
        <Line x1="9" y1="9" x2="25" y2="9" stroke={colors.acc} strokeWidth={1.5} />
        <Line x1="9" y1="25" x2="25" y2="25" stroke={colors.acc} strokeWidth={1.5} />
        <Line x1="17" y1="5" x2="17" y2="29" stroke={colors.tx} strokeWidth={1.2} />
        <Circle cx="17" cy="17" r="4.2" stroke={colors.tx} strokeWidth={1.5} />
        <Path d="M12 17h10" stroke={colors.tx} strokeWidth={1.5} strokeLinecap="square" />
      </Svg>
    </View>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

function DashboardOrder({
  title,
  meta,
  onPress,
}: {
  title: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orderRow, pressed && { backgroundColor: colors.s1 }]}
    >
      <View style={styles.orderRail}>
        <Text style={styles.orderRailText}>ORD</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.orderTitle}>
          {title}
        </Text>
        <Text style={styles.orderMeta}>{meta}</Text>
      </View>
      <Text style={styles.orderAction}>OPEN</Text>
    </Pressable>
  );
}

export default function BuildingTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user?.id);
  const { data: orders = [] } = useUserOrders(user?.id);

  const first = profile?.first_name ?? '';
  const profileReady =
    !!profile &&
    profile.first_name.trim().length > 0 &&
    profile.last_name.trim().length > 0 &&
    profile.city.trim().length > 0 &&
    profile.street.trim().length > 0 &&
    profile.building.trim().length > 0 &&
    profile.apt.trim().length > 0;
  const activeOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length;
  const completedOrders = orders.filter((order) => order.status === 'completed').length;
  const recentOrders = orders.slice(0, 3);
  const addressLine = profile ? `${profile.street} ${profile.building}` : 'Address not set';
  const localityLine = profile
    ? `${profile.city}${profile.floor ? ` | Floor ${profile.floor}` : ''} | Apt ${profile.apt}`
    : 'Complete your profile to unlock orders';

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.shell}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <DashboardMark />
              <View>
                <Text style={styles.brandTag}>SHAKANA CONTROL</Text>
                <Text style={styles.brandTitle}>Operations Board</Text>
              </View>
            </View>
            <Pressable style={styles.quickLink} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.quickLinkText}>PROFILE</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>STATUS</Text>
              <Text style={styles.heroTitle}>Hello{first ? `, ${first}` : ''}.</Text>
              <Text style={styles.heroBody}>
                {profileReady
                  ? 'Your profile is complete and the board is ready for new orders.'
                  : 'Finish your profile to move from setup into active ordering.'}
              </Text>
            </View>
            <View style={styles.heroPanel}>
              <Text style={styles.heroPanelLabel}>LOCATION</Text>
              <Text style={styles.heroPanelValue}>{addressLine}</Text>
              <Text style={styles.heroPanelMeta}>{localityLine}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="OPEN" value={String(activeOrders)} note="Orders still in motion" />
            <StatCard label="DONE" value={String(completedOrders)} note="Closed deliveries" />
            <StatCard label="PROFILE" value={profileReady ? 'READY' : 'SETUP'} note="Onboarding state" />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>Recent Orders</Text>
                <Text style={styles.panelSub}>The three latest entries on your board.</Text>
              </View>
              <Pressable style={styles.panelButton} onPress={() => router.push('/order/new')}>
                <Text style={styles.panelButtonText}>NEW ORDER</Text>
              </Pressable>
            </View>

            {recentOrders.length > 0 ? (
              <View style={{ gap: 10 }}>
                {recentOrders.map((order) => (
                  <DashboardOrder
                    key={order.id}
                    title={order.product_title ?? order.product_url}
                    meta={`${order.status.toUpperCase()} | ${order.max_participants} seats`}
                    onPress={() => router.push(`/order/${order.id}`)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyLabel}>NO ACTIVE ORDERS</Text>
                <Text style={styles.emptyTitle}>Create the first shared basket.</Text>
                <Text style={styles.emptyBody}>
                  Add a product link and invite neighbors when you are ready.
                </Text>
                <Pressable style={styles.emptyButton} onPress={() => router.push('/order/new')}>
                  <Text style={styles.emptyButtonText}>CREATE ORDER</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  shell: {
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  markShell: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
  },
  brandTag: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.mu,
  },
  brandTitle: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.tx,
    lineHeight: 28,
  },
  quickLink: {
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
  },
  quickLinkText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.tx,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
  },
  heroKicker: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.mu,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: colors.tx,
    lineHeight: 34,
  },
  heroBody: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    lineHeight: 22,
    maxWidth: 280,
  },
  heroPanel: {
    width: 150,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
  },
  heroPanelLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.mu,
    marginBottom: 8,
  },
  heroPanelValue: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.tx,
    lineHeight: 20,
  },
  heroPanelMeta: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  statLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.mu,
    marginBottom: 12,
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.tx,
    lineHeight: 28,
  },
  statNote: {
    marginTop: 10,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    lineHeight: 18,
  },
  panel: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  panelSub: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
  },
  panelButton: {
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.tx,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.tx,
  },
  panelButtonText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.3,
    color: colors.white,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
  },
  orderRail: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.tx,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  orderRailText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.3,
    color: colors.tx,
  },
  orderTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.tx,
  },
  orderMeta: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
  },
  orderAction: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.3,
    color: colors.acc,
  },
  emptyPanel: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
    gap: 10,
  },
  emptyLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.mu,
  },
  emptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
    lineHeight: 26,
  },
  emptyBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    lineHeight: 20,
    maxWidth: 320,
  },
  emptyButton: {
    height: 42,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.tx,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  emptyButtonText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.tx,
  },
});
