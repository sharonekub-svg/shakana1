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

export default function Name() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const user = useAuthStore((s) => s.user);
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
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <StepDots total={4} current={1} />
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={styles.title}>מה שמך?</Text>
        <Text style={styles.subtitle}>שמך יוצג לשכניך בבניין</Text>
      </View>

      <View style={{ gap: 14 }}>
        <Field
          label="שם פרטי"
          value={first}
          onChange={setFirst}
          placeholder="לדוגמה: מיכל"
          autoFocus
        />
        <Field label="שם משפחה" value={last} onChange={setLast} placeholder="לדוגמה: כהן" />
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryBtn label="המשך" onPress={next} disabled={!valid} />
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
    marginBottom: 8,
  },
  subtitle: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu },
});
