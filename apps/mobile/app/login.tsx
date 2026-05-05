import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, DemoButton, DemoPage, SectionTitle } from '@/components/demo/DemoPrimitives';
import { detectDemoBrand } from '@/demo/catalog';
import { initDemoCommerceSync, useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { fontFamily } from '@/theme/fonts';

export default function DemoLoginScreen() {
  const router = useRouter();
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const [linkInput, setLinkInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    initDemoCommerceSync();
  }, []);

  const continueAsUser = () => {
    setDemoRole('user');
    router.replace('/user');
  };

  const continueAsStore = () => {
    setDemoRole('store');
    router.replace('/store');
  };

  const quickJoin = () => {
    const detected = detectDemoBrand(`${linkInput} ${codeInput}`);
    if (codeInput.trim().length === 4) {
      router.replace(`/user?join=${codeInput.trim()}`);
      return;
    }
    if (detected) {
      setDemoRole('user');
      router.replace('/user');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage>
        <View style={styles.hero}>
          <Text style={styles.logo}>shakana</Text>
          <Text style={styles.title}>Investor demo control room</Text>
          <Text style={styles.subtitle}>
            A two-sided group shopping flow for fashion retailers, built as a live demo.
          </Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.quickJoinCard}>
            <SectionTitle title="Quick join" kicker="Zero-friction entry" />
            <Text style={styles.helper}>
              Paste a brand link or enter the 4-digit invite code. The demo will jump straight to the shared order.
            </Text>
            <View style={styles.joinInputs}>
              <TextInput
                value={linkInput}
                onChangeText={setLinkInput}
                placeholder="Paste store or product link"
                placeholderTextColor="#8B6F56"
                style={styles.input}
              />
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="4-digit code"
                placeholderTextColor="#8B6F56"
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
              />
            </View>
            <DemoButton label="Quick join" onPress={quickJoin} tone="accent" />
          </Card>

          <Card style={styles.loginCard}>
            <SectionTitle title="User side" kicker="Demo login" />
            <View style={styles.credentials}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>user@shakana.demo</Text>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.value}>demo123</Text>
            </View>
            <DemoButton label="Continue as User" onPress={continueAsUser} tone="accent" />
          </Card>

          <Card style={styles.loginCard}>
            <SectionTitle title="Store / Agent M" kicker="Merchant login" />
            <View style={styles.credentials}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>store@shakana.demo</Text>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.value}>demo123</Text>
            </View>
            <DemoButton label="Continue as Store / Agent M" onPress={continueAsStore} />
          </Card>
        </View>
      </DemoPage>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8F4EE',
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    minHeight: 260,
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    color: '#A65F3C',
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#171412',
    fontFamily: fontFamily.display,
    fontSize: 44,
    maxWidth: 760,
  },
  subtitle: {
    color: '#6D6258',
    fontFamily: fontFamily.body,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 660,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickJoinCard: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 14,
  },
  helper: {
    color: '#6D6258',
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
  },
  joinInputs: {
    gap: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DED2C5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#171412',
    fontFamily: fontFamily.bodySemi,
    backgroundColor: '#FFFFFF',
  },
  loginCard: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 18,
  },
  credentials: {
    gap: 6,
    paddingVertical: 4,
  },
  label: {
    color: '#8B6F56',
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  value: {
    color: '#171412',
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    marginBottom: 6,
  },
});
