import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import {
  useAdminOrders,
  useAdminUsers,
  useAdminCancelOrder,
  useAdminBanUser,
  type AdminOrder,
  type AdminUser,
} from '@/api/admin';
import { useUiStore } from '@/stores/uiStore';

type Tab = 'orders' | 'users';

const STATUS_FILTERS = ['all', 'open', 'paying', 'escrow', 'delivered', 'completed', 'cancelled'] as const;

function formatAgorot(n: number): string {
  return `₪${(n / 100).toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'cancelled' ? colors.err :
    status === 'completed' ? '#0A7E3E' :
    status === 'escrow' || status === 'paying' ? colors.hot :
    colors.mu;
  return (
    <View style={[styles.badge, { borderColor: tone }]}>
      <Text style={[styles.badgeText, { color: tone }]}>{status}</Text>
    </View>
  );
}

function OrderRow({ order, onCancel }: { order: AdminOrder; onCancel: (id: string) => void }) {
  const canCancel = ['draft', 'open', 'paying', 'escrow'].includes(order.status);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {order.product_title ?? '(no title)'}
        </Text>
        <Text style={styles.rowMeta}>
          {order.store_label ?? '—'} · {formatAgorot(order.product_price_agorot)} · {formatDate(order.created_at)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <StatusBadge status={order.status} />
        {canCancel ? (
          <Pressable onPress={() => onCancel(order.id)} style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function UserRow({ user, onBanToggle }: { user: AdminUser; onBanToggle: (u: AdminUser) => void }) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '(no name)';
  const isBanned = !!user.banned_at;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {name} {user.is_admin ? <Text style={styles.adminTag}> ADMIN</Text> : null}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {user.phone || '—'} · {user.city || '—'} · joined {formatDate(user.created_at)}
        </Text>
      </View>
      {user.is_admin ? null : (
        <Pressable
          onPress={() => onBanToggle(user)}
          style={isBanned ? styles.primaryBtn : styles.dangerBtn}
        >
          <Text style={isBanned ? styles.primaryBtnText : styles.dangerBtnText}>
            {isBanned ? 'Unban' : 'Ban'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [onlyBanned, setOnlyBanned] = useState(false);
  const pushToast = useUiStore((s) => s.pushToast);

  const ordersQuery = useAdminOrders({
    q: search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: 0,
  });
  const usersQuery = useAdminUsers({ q: search, banned: onlyBanned, page: 0 });

  const cancelMut = useAdminCancelOrder();
  const banMut = useAdminBanUser();

  function handleCancel(orderId: string) {
    cancelMut.mutate(
      { orderId, reason: 'admin_cancel' },
      {
        onSuccess: () => pushToast('Order cancelled', 'success'),
        onError: (e) => pushToast(e instanceof Error ? e.message : 'Failed', 'error'),
      },
    );
  }

  function handleBanToggle(user: AdminUser) {
    banMut.mutate(
      { userId: user.id, banned: !user.banned_at },
      {
        onSuccess: () =>
          pushToast(user.banned_at ? 'User unbanned' : 'User banned', 'success'),
        onError: (e) => pushToast(e instanceof Error ? e.message : 'Failed', 'error'),
      },
    );
  }

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SHAKANA</Text>
          <Text style={styles.title}>Admin</Text>
          <Text style={styles.subtitle}>
            {tab === 'orders'
              ? `${ordersQuery.data?.total ?? 0} orders`
              : `${usersQuery.data?.total ?? 0} users`}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('orders')}
          style={[styles.tab, tab === 'orders' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>Orders</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('users')}
          style={[styles.tab, tab === 'users' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={tab === 'orders' ? 'Search product title…' : 'Search name or phone…'}
        placeholderTextColor={colors.mu2}
        style={styles.search}
      />

      {tab === 'orders' ? (
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setOnlyBanned(false)}
            style={[styles.chip, !onlyBanned && styles.chipActive]}
          >
            <Text style={[styles.chipText, !onlyBanned && styles.chipTextActive]}>All</Text>
          </Pressable>
          <Pressable
            onPress={() => setOnlyBanned(true)}
            style={[styles.chip, onlyBanned && styles.chipActive]}
          >
            <Text style={[styles.chipText, onlyBanned && styles.chipTextActive]}>Banned only</Text>
          </Pressable>
        </View>
      )}

      {tab === 'orders' ? (
        ordersQuery.isLoading ? (
          <ActivityIndicator color={colors.mu} style={{ marginTop: 24 }} />
        ) : ordersQuery.error ? (
          <Text style={styles.error}>{(ordersQuery.error as Error).message}</Text>
        ) : (
          <FlatList
            data={ordersQuery.data?.orders ?? []}
            keyExtractor={(o) => o.id}
            renderItem={({ item }) => <OrderRow order={item} onCancel={handleCancel} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Text style={styles.empty}>No orders match.</Text>}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : usersQuery.isLoading ? (
        <ActivityIndicator color={colors.mu} style={{ marginTop: 24 }} />
      ) : usersQuery.error ? (
        <Text style={styles.error}>{(usersQuery.error as Error).message}</Text>
      ) : (
        <FlatList
          data={usersQuery.data?.users ?? []}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => <UserRow user={item} onBanToggle={handleBanToggle} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<Text style={styles.empty}>No users match.</Text>}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 20, paddingBottom: 36, gap: 18, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, marginBottom: 6 },
  title: { fontFamily: fontFamily.display, fontSize: 28, color: colors.tx, lineHeight: 34 },
  subtitle: { marginTop: 6, fontFamily: fontFamily.body, fontSize: 13, color: colors.mu },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.tx, borderColor: colors.tx },
  tabText: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.mu },
  tabTextActive: { color: colors.white },
  search: {
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.tx,
    backgroundColor: colors.s1,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
  },
  chipActive: { backgroundColor: colors.tx, borderColor: colors.tx },
  chipText: { fontFamily: fontFamily.bodyBold, fontSize: 11, color: colors.mu, textTransform: 'uppercase', letterSpacing: 0.6 },
  chipTextActive: { color: colors.white },
  list: { gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: radii.lg,
    backgroundColor: colors.s1,
    padding: 14,
    ...shadow.card,
  },
  rowTitle: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.tx },
  rowMeta: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu },
  adminTag: { fontFamily: fontFamily.bodyBold, fontSize: 10, color: colors.hot, letterSpacing: 1 },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  dangerBtn: {
    backgroundColor: colors.err,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  dangerBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.white },
  primaryBtn: {
    backgroundColor: colors.tx,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  primaryBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.white },
  empty: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, textAlign: 'center', marginTop: 24 },
  error: { fontFamily: fontFamily.body, fontSize: 13, color: colors.err, textAlign: 'center', marginTop: 24 },
});
