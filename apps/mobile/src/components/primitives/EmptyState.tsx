import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  cta?: string;
  onCta?: () => void;
};

export function EmptyState({ icon, title, subtitle, cta, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconHolder}>
        <Text style={styles.icon}>{icon}</Text>
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
  iconHolder: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.s1,
    borderColor: colors.br,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 32 },
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
    borderRadius: radii.pill,
    backgroundColor: colors.acc,
    shadowColor: colors.acc,
    shadowOpacity: 0.27,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaText: {
    fontFamily: fontFamily.bodySemi,
    color: colors.white,
    fontSize: 15,
  },
});
