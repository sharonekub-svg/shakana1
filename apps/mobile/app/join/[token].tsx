import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useClaimInvite } from '@/api/invites';
import { useAuthStore } from '@/stores/authStore';
import { stashPendingInvite } from '@/lib/deeplinks';
import { useUiStore } from '@/stores/uiStore';

export default function JoinByToken() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const claim = useClaimInvite();
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    (async () => {
      if (!token) return;
      if (!session) {
        await stashPendingInvite(String(token));
        router.replace('/(auth)/welcome');
        return;
      }
      try {
        const res = await claim.mutateAsync(String(token));
        router.replace(`/order/${res.orderId}`);
      } catch (e) {
        pushToast(e instanceof Error ? e.message : 'הקישור אינו תקף יותר', 'error');
        router.replace('/(tabs)/orders');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, session]);

  return (
    <ScreenBase style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator color={colors.acc} />
      <Text style={styles.text}>מצרף אותך להזמנה…</Text>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu },
});
