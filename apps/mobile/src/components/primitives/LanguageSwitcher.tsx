import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocale, type Language } from '@/i18n/locale';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const OPTIONS: Array<{ language: Language; label: string }> = [
  { language: 'he', label: 'עברית' },
  { language: 'en', label: 'English' },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLocale();

  return (
    <View style={styles.wrap}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{t('language.label')}</Text>
        <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
      </View>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const active = option.language === language;
          return (
            <Pressable
              key={option.language}
              onPress={() => setLanguage(option.language)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
  },
  textBlock: {
    gap: 3,
  },
  label: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.tx,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.tx,
    borderColor: colors.tx,
  },
  pillText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.tx,
  },
  pillTextActive: {
    color: colors.white,
  },
});
