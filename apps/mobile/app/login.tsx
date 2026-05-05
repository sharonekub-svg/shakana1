import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDemoStore } from '@/demo/store';

const USER_EMAIL = 'user@shakana.demo';
const STORE_EMAIL = 'store@shakana.demo';
const PW = 'demo123';

export default function LoginScreen() {
  const router = useRouter();
  const setRole = useDemoStore((s) => s.setRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function loginAs(role: 'user' | 'store') {
    setRole(role);
    setErr(null);
    router.replace(role === 'user' ? '/user' : '/store');
  }

  function tryLogin() {
    setErr(null);
    if (password !== PW) return setErr('Wrong password. Try demo123');
    if (email === USER_EMAIL) return loginAs('user');
    if (email === STORE_EMAIL) return loginAs('store');
    setErr('Use user@shakana.demo or store@shakana.demo');
  }

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.card}>
        <Text style={s.brand}>shakana</Text>
        <Text style={s.title}>Investor Demo Login</Text>
        <Text style={s.sub}>Pick a role to enter the two-sided flow.</Text>

        <View style={s.quick}>
          <Pressable onPress={() => loginAs('user')} style={[s.btn, s.btnPrimary]}>
            <Text style={s.btnPrimaryText}>Continue as User</Text>
          </Pressable>
          <Pressable onPress={() => loginAs('store')} style={[s.btn, s.btnDark]}>
            <Text style={s.btnDarkText}>Continue as Store / Agent M</Text>
          </Pressable>
        </View>

        <View style={s.divider}><View style={s.line} /><Text style={s.dividerTxt}>or login manually</Text><View style={s.line} /></View>

        <Text style={s.lbl}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="user@shakana.demo" style={s.input} />
        <Text style={s.lbl}>Password</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="demo123" style={s.input} />
        {err ? <Text style={s.err}>{err}</Text> : null}
        <Pressable onPress={tryLogin} style={[s.btn, s.btnPrimary]}>
          <Text style={s.btnPrimaryText}>Sign in</Text>
        </Pressable>

        <View style={s.hintBox}>
          <Text style={s.hintTitle}>Demo credentials</Text>
          <Text style={s.hint}>User: user@shakana.demo / demo123</Text>
          <Text style={s.hint}>Store: store@shakana.demo / demo123</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { minHeight: '100%', backgroundColor: '#F6F4EE', padding: 24, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 28, padding: 28, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, gap: 10 },
  brand: { fontSize: 28, fontWeight: '900', letterSpacing: -1, color: '#171717' },
  title: { fontSize: 22, fontWeight: '800', color: '#171717', marginTop: 4 },
  sub: { fontSize: 14, color: '#707070', marginBottom: 8 },
  quick: { gap: 10, marginVertical: 8 },
  btn: { paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#C8B086' },
  btnPrimaryText: { color: '#171717', fontWeight: '800', fontSize: 15 },
  btnDark: { backgroundColor: '#171717' },
  btnDarkText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E1D8' },
  dividerTxt: { fontSize: 12, color: '#A5A19A' },
  lbl: { fontSize: 13, fontWeight: '600', color: '#171717', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E1D8', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, backgroundColor: '#FAFAF7' },
  err: { color: '#C0392B', fontSize: 13, marginTop: 4 },
  hintBox: { marginTop: 14, padding: 12, backgroundColor: '#FAF8F2', borderRadius: 14, borderWidth: 1, borderColor: '#EDE7D8' },
  hintTitle: { fontSize: 12, fontWeight: '800', color: '#171717', marginBottom: 4 },
  hint: { fontSize: 12, color: '#707070' },
});
