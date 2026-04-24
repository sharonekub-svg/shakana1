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
          borderRadius: Math.round(size * 0.3),
          shadowRadius: size * 0.45,
        },
        style,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.5 }]}>ש</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.acc,
    shadowOpacity: 0.33,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  glyph: {
    fontFamily: fontFamily.display,
    color: colors.white,
    lineHeight: undefined,
  },
});
