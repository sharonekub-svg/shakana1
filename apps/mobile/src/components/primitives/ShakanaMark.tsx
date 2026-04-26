import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

export function ShakanaMark({ size = 88, style }: { size?: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radii.pill,
        },
        style,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.28 }]}>S</Text>
      <View style={[styles.accent, { width: size * 0.22, height: size * 0.22 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  accent: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: colors.pink,
  },
  glyph: {
    fontFamily: fontFamily.display,
    color: colors.white,
    letterSpacing: 0,
    lineHeight: undefined,
  },
});
