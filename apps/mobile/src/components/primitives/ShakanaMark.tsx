import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

export function ShakanaMark({ size = 88, style }: { size?: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
        },
        style,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.3 }]}>SK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.tx,
  },
  glyph: {
    fontFamily: fontFamily.display,
    color: colors.white,
    letterSpacing: 1,
    lineHeight: undefined,
  },
});
