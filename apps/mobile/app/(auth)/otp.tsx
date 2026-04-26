import { useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn, TextBtn } from '@/components/primitives/Button';
import { BackBtn } from '@/components/primitives/BackBtn';
import { StepDots } from '@/components/primitives/StepDots';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useSendOtp, useVerifyOtp } from '@/api/auth';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

const LEN = 6;

export default function Otp() {
  const { phone: phoneE164, display } = useLocalSearchParams<{ phone: string; display: string }>();
  const router = useRouter();
  const verify = useVerifyOtp();
  const resend = useSendOtp();
  const pushToast = useUiStore((s) => s.pushToast);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: LEN }, () => ''));
  const refs = useMemo(() => Array.from({ length: LEN }, () => ({ current: null as TextInput | null })), []);
  const [resent, setResent] = useState(false);

  const full = digits.every((d) => d.length === 1);
  const code = digits.join('');

  const update = (i: number, v: string) => {
    const ch = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < LEN - 1) refs[i + 1]?.current?.focus();
  };

  const onKey = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1]?.current?.focus();
  };

  const submit = async () => {
    if (!full || verify.isPending) return;
    try {
      const session = await verify.mutateAsync({ phone: String(phoneE164), token: code });
      setSession(session);
      setHydrated(true);
      router.replace('/(auth)/name');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Code failed.', 'error');
      setDigits(Array.from({ length: LEN }, () => ''));
      refs[0]?.current?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await resend.mutateAsync(String(display ?? phoneE164 ?? ''));
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Could not resend code.', 'error');
    }
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <StepDots total={4} current={0} />
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={styles.title}>Enter code</Text>
        <Text style={styles.subtitle}>Sent to {display ?? phoneE164}</Text>
      </View>

      <View style={styles.codeRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              refs[i]!.current = r;
            }}
            value={d}
            onChangeText={(v) => update(i, v)}
            onKeyPress={(e) => onKey(i, e)}
            keyboardType="number-pad"
            maxLength={1}
            autoFocus={i === 0}
            selectionColor={colors.acc}
            style={[
              styles.box,
              {
                borderColor: d ? colors.acc : colors.brBr,
                backgroundColor: d ? colors.white : colors.s1,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.resendBlock}>
        <Text style={styles.resendPrompt}>Need another code?</Text>
        {resent ? (
          <Text style={styles.resentOk}>Code sent.</Text>
        ) : (
          <TextBtn label="Resend" onPress={handleResend} />
        )}
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryBtn label="Verify code" onPress={submit} disabled={!full} loading={verify.isPending} />
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
  codeRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
    writingDirection: 'ltr',
  },
  box: {
    width: 46,
    height: 58,
    borderWidth: 1.5,
    borderRadius: radii.md,
    textAlign: 'center',
    fontSize: 24,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
  },
  resendBlock: { alignItems: 'center', gap: 4 },
  resendPrompt: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.body },
  resentOk: { fontSize: 13, color: colors.grn, fontFamily: fontFamily.bodySemi },
});
