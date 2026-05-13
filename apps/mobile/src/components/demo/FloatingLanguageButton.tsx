import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useLocale } from '@/i18n/locale';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

export function FloatingLanguageButton({ visible }: { visible: boolean }) {
  const { language, setLanguage } = useLocale();
  if (!visible) return null;

  const nextLanguage = language === 'he' ? 'en' : 'he';
  const label = language === 'he' ? 'English' : 'עברית';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={language === 'he' ? 'Switch to English' : 'החלפה לעברית'}
      onPress={() => void setLanguage(nextLanguage)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.kicker}>{language === 'he' ? 'שפה' : 'Language'}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: Platform.OS === 'web' ? 16 : 14,
    bottom: Platform.OS === 'web' ? 90 : 86,
    zIndex: 52,
    minWidth: 104,
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.glass,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  kicker: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  label: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
});
