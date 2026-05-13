import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandPill, Card, DemoButton, DemoPage, SectionTitle } from '@/components/demo/DemoPrimitives';
import { useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const DEMO_STEPS = [
  {
    title: 'Founder opens one store order',
    body: 'Choose Amazon, Zara, or H&M, set the timer, add the delivery address, then create the group order.',
  },
  {
    title: 'Friends join from the invite link',
    body: 'A friend logs in, lands in the same shared cart, and can add products only from the locked store catalog.',
  },
  {
    title: 'Timer closes the cart',
    body: 'When the timer ends, users can still track the cart but cannot add new items.',
  },
  {
    title: 'Merchant fulfills by store',
    body: 'Agent M selects Amazon, Zara, or H&M, sees only that store queue, then accepts, packs, readies, and ships.',
  },
];

export default function HowItWorksScreen() {
  const router = useRouter();
  const resetDemo = useDemoCommerceStore((state) => state.resetDemo);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage wide>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.logo}>shakana</Text>
            <Text style={styles.title}>Founder demo script</Text>
            <Text style={styles.subtitle}>Run this exact flow before a meeting so the app feels calm, clear, and real.</Text>
          </View>
          <View style={styles.actions}>
            <DemoButton label="User app" onPress={() => router.push('/user')} tone="accent" style={styles.actionBtn} />
            <DemoButton label="Merchant" onPress={() => router.push('/store')} tone="light" style={styles.actionBtn} />
            <DemoButton label="Login" onPress={() => router.push('/login')} tone="light" style={styles.actionBtn} />
          </View>
        </View>

        <Card style={styles.resetCard}>
          <View style={styles.resetCopy}>
            <Text style={styles.resetTitle}>Before presenting</Text>
            <Text style={styles.muted}>Reset the demo, open a fresh Amazon order, share the link, join as another account, then process it in Merchant.</Text>
          </View>
          <DemoButton
            label="Reset demo state"
            onPress={() => {
              resetDemo();
              router.replace('/login');
            }}
            tone="danger"
            style={styles.resetButton}
          />
        </Card>

        <SectionTitle title="End-to-end flow" kicker="What investors should see" />
        <View style={styles.stepGrid}>
          {DEMO_STEPS.map((step, index) => (
            <Card key={step.title} style={styles.stepCard}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.muted}>{step.body}</Text>
            </Card>
          ))}
        </View>

        <SectionTitle title="Store scope" kicker="Merchant preview" />
        <Card style={styles.storeCard}>
          <View style={styles.brandRow}>
            <BrandPill brand="amazon" />
            <BrandPill brand="zara" />
            <BrandPill brand="hm" />
          </View>
          <Text style={styles.stepTitle}>Each merchant sees only their selected store queue.</Text>
          <Text style={styles.muted}>
            Amazon orders stay in Amazon, Zara orders stay in Zara, and H&M orders stay in H&M. The order detail keeps the exact item photos, variants, master picking list, user breakdown, timer, and status actions.
          </Text>
        </Card>
      </DemoPage>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  logo: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 36,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 620,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 40,
  },
  resetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  resetCopy: {
    flex: 1,
    minWidth: 240,
  },
  resetTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  resetButton: {
    flexBasis: 180,
    minHeight: 44,
  },
  stepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepCard: {
    flexGrow: 1,
    flexBasis: 230,
    gap: 8,
  },
  stepNumber: {
    color: colors.acc,
    fontFamily: fontFamily.display,
    fontSize: 28,
  },
  stepTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    lineHeight: 23,
  },
  storeCard: {
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  muted: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
