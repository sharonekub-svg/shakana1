import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BrandPill, Card, DemoButton, DemoPage, SectionTitle, demoStyles } from '@/components/demo/DemoPrimitives';
import { demoStores, type DemoBrandId } from '@/demo/catalog';
import { type DemoParticipant, initDemoCommerceSync, useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { useAuthStore } from '@/stores/authStore';
import { searchCities, searchStreets } from '@/lib/locationAutocomplete';
import { useLocale } from '@/i18n/locale';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const ADDRESS_SUGGESTIONS = [
  'Rothschild Boulevard 12, Tel Aviv',
  'Dizengoff Street 88, Tel Aviv',
  'Herzl Street 21, Ramat Gan',
  'Jabotinsky Street 42, Petah Tikva',
  'Weizmann Street 17, Givatayim',
  'Ben Gurion Street 9, Herzliya',
  'King George Street 30, Jerusalem',
  'HaNassi Boulevard 45, Haifa',
];

function normalizeTimerMinutes(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(720, Math.round(parsed)));
}

function hasAddressNumber(value: string) {
  return /\d+[\u0590-\u05FFA-Za-z]?/.test(value);
}

function isCompleteDeliveryAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 8 && hasAddressNumber(trimmed) && trimmed.includes(',');
}

function addressValidationMessage(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Required: enter street + house number + city before opening the cart.';
  if (!hasAddressNumber(trimmed)) return 'House number is required. Example: Herzl 12, Petah Tikva.';
  if (!trimmed.includes(',')) return 'Add the city after the street and house number. Example: Herzl 12, Petah Tikva.';
  return 'Required: valid timer, one store, and full address with house number before opening the cart.';
}

function splitAddressQuery(value: string) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      street: parts.slice(0, -1).join(', '),
      city: parts[parts.length - 1] ?? '',
      hasCityPart: true,
    };
  }
  return {
    street: value.trim(),
    city: value.trim(),
    hasCityPart: false,
  };
}

function getFallbackAddressSuggestions(value: string) {
  const query = value.trim().toLowerCase();
  if (query.length < 2) return [];
  return ADDRESS_SUGGESTIONS.filter((address) => address.toLowerCase().includes(query)).slice(0, 5);
}

function uniqueAddressSuggestions(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim().toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export default function NewOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ brand?: string }>();
  const { language } = useLocale();
  const session = useAuthStore((state) => state.session);
  const demoMode = useDemoCommerceStore((state) => state.demoMode);
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const createNewOrder = useDemoCommerceStore((state) => state.createNewOrder);
  const updateDeliveryAddress = useDemoCommerceStore((state) => state.updateDeliveryAddress);
  const selectBrand = useDemoCommerceStore((state) => state.selectBrand);

  const initialBrand = params.brand === 'hm' || params.brand === 'zara' || params.brand === 'amazon' ? params.brand : null;
  const [setupBrand, setSetupBrand] = useState<DemoBrandId | null>(initialBrand);
  const [customTimer, setCustomTimer] = useState('45');
  const [setupDeliveryAddress, setSetupDeliveryAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('user');
  }, [demoMode, setDemoRole]);

  useEffect(() => {
    if (initialBrand) setSetupBrand(initialBrand);
  }, [initialBrand]);

  const accountParticipant: DemoParticipant = useMemo(() => {
    const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
    const fullName =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata?.name === 'string' && metadata.name.trim()) ||
      (session?.user ? 'Signed-in member' : 'Sharone');
    return {
      id: session?.user.id ?? 'user-a',
      name: fullName,
      joinedAt: Date.now(),
    };
  }, [session?.user.id, session?.user.user_metadata]);

  const customTimerMinutes = normalizeTimerMinutes(customTimer);
  const setupReady = !!setupBrand && !!customTimerMinutes && isCompleteDeliveryAddress(setupDeliveryAddress);

  useEffect(() => {
    const value = setupDeliveryAddress.trim();
    const fallback = getFallbackAddressSuggestions(value);
    if (value.length < 2) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => {
      setAddressLoading(true);
      const query = splitAddressQuery(value);
      Promise.all([
        searchCities(query.city, language, controller.signal),
        query.street.length >= 2
          ? searchStreets(query.street, query.hasCityPart ? query.city : '', language, controller.signal)
          : Promise.resolve([]),
      ])
        .then(([cities, streets]) => {
          if (controller.signal.aborted) return;
          const bestCities = cities.slice(0, 4);
          const streetCitySuggestions = streets.flatMap((street) => {
            if (street.includes(',')) return [street];
            const cityPool = query.hasCityPart ? bestCities : bestCities.slice(0, 2);
            return cityPool.length > 0 ? cityPool.map((city) => `${street}, ${city}`) : [];
          });
          const cityOnlySuggestions = bestCities.map((city) =>
            query.hasCityPart && query.street ? `${query.street}, ${city}` : city,
          );
          setAddressSuggestions(uniqueAddressSuggestions([...streetCitySuggestions, ...cityOnlySuggestions, ...fallback]).slice(0, 6));
        })
        .catch(() => {
          if (!controller.signal.aborted) setAddressSuggestions(fallback);
        })
        .finally(() => {
          if (!controller.signal.aborted) setAddressLoading(false);
        });
    }, 220);

    return () => {
      controller.abort();
      globalThis.clearTimeout(timer);
    };
  }, [setupDeliveryAddress, language]);

  const createOrder = () => {
    if (!setupReady || !setupBrand || !customTimerMinutes) return;
    const orderId = createNewOrder(setupBrand, accountParticipant, customTimerMinutes);
    updateDeliveryAddress(orderId, setupDeliveryAddress.trim());
    selectBrand(setupBrand);
    router.replace('/user');
  };

  return (
    <DemoPage>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>shakana</Text>
          <Text style={styles.title}>New group order</Text>
          <Text style={styles.subtitle}>Choose one store, set the timer, and add the exact delivery address before opening the cart.</Text>
        </View>
        <View style={styles.headerActions}>
          <DemoButton label="Back home" onPress={() => router.replace('/user')} tone="light" style={styles.smallBtn} />
          <DemoButton label="Profile" onPress={() => router.push('/profile')} tone="light" style={styles.smallBtn} />
        </View>
      </View>

      <Card style={styles.setupCard}>
        <Text style={styles.setupTitle}>Set up the order first</Text>
        <Text style={styles.muted}>The order is not created yet. It opens only after timer, store, and exact address are ready.</Text>
        <View style={styles.setupSteps}>
          <View style={[styles.setupStep, !!customTimerMinutes && styles.setupStepDone]}>
            <Text style={styles.setupStepNumber}>1</Text>
            <Text style={styles.setupStepText}>Timer</Text>
          </View>
          <View style={[styles.setupStep, !!setupBrand && styles.setupStepDone]}>
            <Text style={styles.setupStepNumber}>2</Text>
            <Text style={styles.setupStepText}>Store</Text>
          </View>
          <View style={[styles.setupStep, isCompleteDeliveryAddress(setupDeliveryAddress) && styles.setupStepDone]}>
            <Text style={styles.setupStepNumber}>3</Text>
            <Text style={styles.setupStepText}>Street + number + city</Text>
          </View>
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionTitle title="1. Timer" kicker="Founder control" />
          <View style={styles.timerRow}>
            {['30', '45', '60'].map((minutes) => (
              <DemoButton
                key={minutes}
                label={`${minutes} min`}
                onPress={() => setCustomTimer(minutes)}
                tone={customTimer === minutes ? 'accent' : 'light'}
                style={styles.timerBtn}
              />
            ))}
          </View>
          <View style={styles.customTimerBox}>
            <TextInput
              value={customTimer}
              onChangeText={setCustomTimer}
              keyboardType="number-pad"
              placeholder="45"
              style={styles.customTimerInput}
            />
            <Text style={styles.timerText}>minutes</Text>
          </View>
          {customTimer.trim() && !customTimerMinutes ? (
            <Text style={styles.validationText}>Enter a timer from 1 to 720 minutes.</Text>
          ) : null}
        </Card>

        <Card style={styles.panel}>
          <SectionTitle title="2. Store" kicker="Locked catalog" />
          <View style={styles.storeGrid}>
            {(['hm', 'zara', 'amazon'] as DemoBrandId[]).map((brandId) => {
              const store = demoStores[brandId];
              return (
                <Pressable
                  key={brandId}
                  accessibilityRole="button"
                  onPress={() => setSetupBrand(brandId)}
                  style={({ pressed }) => [
                    styles.storeChoice,
                    setupBrand === brandId && styles.storeChoiceSelected,
                    pressed && demoStyles.pressed,
                  ]}
                >
                  <ImageBackground source={{ uri: store.heroImage }} resizeMode="cover" style={styles.storeImage}>
                    <BrandPill brand={brandId} />
                  </ImageBackground>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.muted}>{store.tagline}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.panel}>
          <SectionTitle title="3. Delivery address" kicker="Required before launch" />
          <View style={styles.addressRequirementBox}>
            <Text style={styles.addressRequirementTitle}>House number required</Text>
            <Text style={styles.addressRequirementText}>
              Type the full address in this format: street + house number, city. Example: Herzl 12, Petah Tikva.
            </Text>
          </View>
          <TextInput
            value={setupDeliveryAddress}
            onChangeText={setSetupDeliveryAddress}
            placeholder="Street + house number, city"
            style={[
              styles.addressInput,
              setupDeliveryAddress.trim().length > 0 && !isCompleteDeliveryAddress(setupDeliveryAddress) && styles.addressInputMissing,
            ]}
            accessibilityLabel="New order delivery address"
            autoComplete="street-address"
            autoCorrect={false}
          />
          {addressLoading ? (
            <View style={styles.addressLoadingRow}>
              <ActivityIndicator size="small" color={colors.acc} />
              <Text style={styles.addressLoadingText}>Looking for matching streets and cities</Text>
            </View>
          ) : null}
          {addressSuggestions.length > 0 ? (
            <View style={styles.addressSuggestionList}>
              {addressSuggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  accessibilityRole="button"
                  onPress={() => setSetupDeliveryAddress(suggestion)}
                  style={({ pressed }) => [styles.addressSuggestion, pressed && demoStyles.pressed]}
                >
                  <Text style={styles.addressSuggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      </View>

      <Card style={styles.launchCard}>
        <View style={styles.launchCopy}>
          <Text style={styles.launchTitle}>{setupReady ? 'Ready to open the group cart' : 'Finish setup to open the cart'}</Text>
          <Text style={styles.muted}>{setupReady ? 'After opening, friends can join and add products only from this store.' : addressValidationMessage(setupDeliveryAddress)}</Text>
        </View>
        <DemoButton
          label={setupReady ? 'Create order' : 'Add timer, store, street number, and city'}
          onPress={createOrder}
          disabled={!setupReady}
          tone="accent"
          style={styles.launchBtn}
        />
      </Card>
    </DemoPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  logo: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 38, lineHeight: 42 },
  subtitle: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22, maxWidth: 620 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallBtn: { minHeight: 40, minWidth: 120 },
  setupCard: { gap: 12 },
  setupTitle: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 24 },
  muted: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
  setupSteps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  setupStep: {
    flexGrow: 1,
    flexBasis: 160,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setupStepDone: { borderColor: colors.acc, backgroundColor: colors.goldLight },
  setupStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.tx,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    lineHeight: 24,
    textAlign: 'center',
  },
  setupStepText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  panel: { flexGrow: 1, flexBasis: 310, gap: 12 },
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerBtn: { flexGrow: 1, flexBasis: 88, minHeight: 42 },
  customTimerBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customTimerInput: {
    width: 86,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  timerText: { fontFamily: fontFamily.bodyBold, color: colors.tx, fontSize: 16 },
  validationText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  storeChoice: {
    flexGrow: 1,
    flexBasis: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    padding: 8,
    gap: 8,
  },
  storeChoiceSelected: { borderColor: colors.tx, borderWidth: 2, backgroundColor: colors.s2 },
  storeImage: { minHeight: 104, overflow: 'hidden', borderRadius: 8, padding: 10, alignItems: 'flex-end' },
  storeName: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 22 },
  addressRequirementBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.acc,
    backgroundColor: colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  addressRequirementTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  addressRequirementText: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 12, lineHeight: 17 },
  addressInput: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  addressInputMissing: { borderColor: colors.acc, backgroundColor: colors.goldLight },
  addressSuggestionList: { gap: 6 },
  addressLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressLoadingText: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 12 },
  addressSuggestion: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressSuggestionText: { color: colors.tx, fontFamily: fontFamily.bodySemi, fontSize: 13 },
  launchCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  launchCopy: { flexGrow: 1, flexBasis: 260 },
  launchTitle: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 24 },
  launchBtn: { flexGrow: 1, flexBasis: 260, minHeight: 52 },
});
