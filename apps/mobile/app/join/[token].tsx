import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useClaimInvite } from '@/api/invites';
import { useAuthStore } from '@/stores/authStore';
import { stashPendingInvite } from '@/lib/deeplinks';
import { useUiStore } from '@/stores/uiStore';
import { readSharedDemoOrderSnapshot, useDemoCommerceStore } from '@/stores/demoCommerceStore';

export default function JoinByToken() {
  const { token, demo } = useLocalSearchParams<{ token: string; demo?: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const claim = useClaimInvite();
  const pushToast = useUiStore((s) => s.pushToast);
  const restoreSharedOrder = useDemoCommerceStore((s) => s.restoreSharedOrder);
  const snapshotDemoOrder = useMemo(() => readSharedDemoOrderSnapshot(demo), [demo]);
  const [remoteDemoOrder, setRemoteDemoOrder] = useState<typeof snapshotDemoOrder | undefined>(undefined);
  const demoOrder = remoteDemoOrder ?? snapshotDemoOrder ?? null;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/demo-order-sync?code=${encodeURIComponent(String(token))}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { orders?: unknown[] } | null) => {
        if (cancelled) return;
        const order = payload?.orders?.[0]
          ? readSharedDemoOrderSnapshot(encodeURIComponent(JSON.stringify({ v: 1, order: payload.orders[0] })))
          : null;
        setRemoteDemoOrder(order);
      })
      .catch(() => setRemoteDemoOrder(null));
    return () => {
      cancelled = true;
    };
  }, [snapshotDemoOrder, token]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      if (demoOrder) {
        restoreSharedOrder(demoOrder);
        await stashPendingInvite(String(token));
        router.replace(session ? (`/user?join=${String(token)}` as any) : '/login');
        return;
      }
      if (!snapshotDemoOrder && remoteDemoOrder === undefined) return;
      if (!session) {
        await stashPendingInvite(String(token));
        router.replace('/login');
        return;
      }
      try {
        const res = await claim.mutateAsync(String(token));
        router.replace(`/order/${res.orderId}`);
      } catch (e) {
        pushToast(e instanceof Error ? e.message : 'This invite link is no longer valid.', 'error');
        router.replace('/(tabs)/orders');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoOrder, remoteDemoOrder, restoreSharedOrder, token, session, router, claim, pushToast]);

  return (
    <ScreenBase style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator color={colors.acc} />
      <Text style={styles.text}>Joining the order...</Text>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu },
});
