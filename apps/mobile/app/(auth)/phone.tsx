import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn } from '@/components/primitives/Button';
import { BackBtn } from '@/components/primitives/BackBtn';
import { StepDots } from '@/components/primitives/StepDots';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useSendOtp } from '@/api/auth';
import { formatPhoneIL, phoneDigitsOnly } from '@/utils/format';
import { useUiStore } from '@/stores/uiStore';

export default function Phone() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const sendOtp = useSendOtp();
  const pushToast = useUiStore((s) => s.pushToast);
  const digits = phoneDigitsOnly(phone);
  const valid = digits.length >= 9;

  const submit = async () => {
    if (!valid || sendOtp.isPending) return;
    try {
      const { phone: e164 } = await sendOtp.mutateAsync(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone: e164, display: phone } });
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'שגיאה בשליחת הקוד', 'error');
    }
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <StepDots total={4} current={0} />
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={styles.title}>מה מספר הטלפון שלך?</Text>
        <Text style={styles.subtitle}>נשלח לך קוד אימות חד-פעמי</Text>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.countryBox}>
          <Text style={styles.country}>🇮🇱 +972</Text>
        </View>
        <TextInput
          value={phone}
          onChangeText={(v) => setPhone(formatPhoneIL(v))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="050-000-0000"
          placeholderTextColor={colors.mu}
          keyboardType="phone-pad"
          inputMode="tel"
          autoFocus
          maxLength={12}
          autoCorrect={false}
          autoComplete="tel"
          textContentType="telephoneNumber"
          style={[
            styles.input,
            { borderColor: focused ? colors.acc : colors.brBr },
          ]}
          onSubmitEditing={submit}
        />
      </View>

      <View style={styles.spacer} />

      <PrimaryBtn
        label="שלח קוד אימות"
        onPress={submit}
        disabled={!valid}
        loading={sendOtp.isPending}
      />
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
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  countryBox: {
    backgroundColor: colors.s1,
    borderColor: colors.brBr,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  country: { fontSize: 15, color: colors.tx, fontFamily: fontFamily.bodySemi },
  input: {
    flex: 1,
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 20,
    color: colors.tx,
    fontFamily: fontFamily.body,
    textAlign: 'left',
    writingDirection: 'ltr',
    minHeight: 52,
  },
  spacer: { flex: 1 },
});
