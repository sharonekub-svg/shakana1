import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, shadow } from '@/theme/tokens';

const logo = require('../../../assets/icon.png');

export function ShakanaMark({ size = 88, style }: { size?: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Math.min(radii.xxl, size * 0.22),
        },
        style,
      ]}
    >
      <Image source={logo} style={styles.logo as ImageStyle} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: '#9ECAF2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.tx,
    ...shadow.card,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
