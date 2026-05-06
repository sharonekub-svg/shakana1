import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { env } from '@/lib/env';

const HIDDEN_PREFIXES = ['/auth-callback', '/login', '/welcome', '/profile/delete'];

export function FloatingNewOrderButton() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!env.enableDemo) {
      setVisible(false);
      return;
    }
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setVisible((current) => (current === true ? current : true));
      return;
    }

    const update = () => {
      const pathname = window.location.pathname;
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
      const nextVisible = !hidden && scrollTop > 220;
      setVisible((current) => (current === nextVisible ? current : nextVisible));
    };

    update();
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('popstate', update);
    };
  }, []);

  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New Order"
      onPress={() => router.push('/user?new=1')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.kicker}>Start cart</Text>
      <Text style={styles.label}>New Order</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    zIndex: 50,
    minWidth: 168,
    minHeight: 66,
    borderRadius: radii.pill,
    paddingHorizontal: 22,
    paddingVertical: 10,
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.acc,
    ...shadow.cta,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  kicker: {
    color: 'rgba(43, 33, 24, 0.72)',
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  label: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 23,
    lineHeight: 27,
  },
});
