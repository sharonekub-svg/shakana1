import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

type Props = {
  badge: string;
  title: string;
  subtitle: string;
  cta?: string;
  onCta?: () => void;
};

export function EmptyState({ badge, title, subtitle, cta, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badgeHolder}>
        <Text style={styles.badge}>{badge}</Text>
      </View>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {cta ? (
        <Pressable
          onPress={onCta}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.ctaText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 32,
    gap: 16,
  },
  badgeHolder: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.s1,
    borderColor: colors.br,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 14,
    letterSpacing: 2,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    marginTop: 4,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: radii.md,
    backgroundColor: colors.acc,
    borderWidth: 1,
    borderColor: colors.tx,
  },
  ctaText: {
    fontFamily: fontFamily.bodySemi,
    color: colors.white,
    fontSize: 15,
  },
});
