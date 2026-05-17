import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type Href, useRouter } from 'expo-router';

import { useLocale } from '@/i18n/locale';
import { colors, radii } from '@/theme/tokens';

type BackBtnProps = {
  onPress?: () => void;
  fallback?: Href;
  variant?: 'card' | 'ghost';
};

export function BackBtn({ onPress, fallback = '/(tabs)/building', variant = 'card' }: BackBtnProps) {
  const router = useRouter();
  const { language } = useLocale();
  const isHe = language === 'he';

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={isHe ? 'חזור' : 'Back'}
      hitSlop={8}
      style={({ pressed }) => [variant === 'card' ? styles.btn : styles.ghost, pressed && { opacity: 0.7 }]}
    >
      <View style={{ transform: [{ scaleX: isHe ? -1 : 1 }] }}>
        <Svg width={10} height={17} viewBox="0 0 10 17" fill="none">
          <Path
            d="M8 2L2 8.5 8 15"
            stroke={colors.tx}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderColor: colors.brBr,
    borderWidth: 1.5,
    backgroundColor: colors.s1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
