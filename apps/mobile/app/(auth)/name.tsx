import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn } from '@/components/primitives/Button';
import { BackBtn } from '@/components/primitives/BackBtn';
import { StepDots } from '@/components/primitives/StepDots';
import { Field } from '@/components/primitives/Field';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/i18n/locale';

export default function Name() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const user = useAuthStore((s) => s.user);
  const { t } = useLocale();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const valid = first.trim().length >= 2 && last.trim().length >= 2;

  const next = () => {
    if (!valid || !user) return;
    setProfile({
      id: user.id,
      first_name: first.trim(),
      last_name: last.trim(),
      phone: user.phone ?? '',
      city: '',
      street: '',
      building: '',
      apt: '',
      floor: null,
    });
    router.push('/(auth)/address');
  };

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <StepDots total={4} current={1} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>SHAKANA</Text>
        <Text style={styles.title}>{t('auth.name.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.name.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <Field
          label={t('auth.name.first')}
          value={first}
          onChange={setFirst}
          placeholder="Mika"
          autoFocus
          ltr
        />
        <Field label={t('auth.name.last')} value={last} onChange={setLast} placeholder="Cohen" ltr />
      </View>

      <View style={styles.spacer} />

      <PrimaryBtn label={t('common.continue')} onPress={next} disabled={!valid} />
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 20,
    paddingBottom: 36,
    gap: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hero: {
    gap: 10,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: colors.tx,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.mu,
    lineHeight: 24,
  },
  form: {
    gap: 14,
  },
  spacer: { flex: 1 },
});
