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
          borderRadius: Math.min(radii.xxl, size * 0.14),
        },
        style,
      ]}
    >
      <Text style={[styles.wordmark, { fontSize: size * 0.18, letterSpacing: -size * 0.01 }]}>
        shakana
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: '#9ECAF2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 13, 26, 0.08)',
    ...shadow.card,
  },
  wordmark: {
    fontFamily: fontFamily.body,
    color: '#031A36',
    includeFontPadding: false,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
});
