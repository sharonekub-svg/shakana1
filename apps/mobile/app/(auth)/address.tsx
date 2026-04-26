import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn } from '@/components/primitives/Button';
import { BackBtn } from '@/components/primitives/BackBtn';
import { StepDots } from '@/components/primitives/StepDots';
import { AutoField } from '@/components/primitives/AutoField';
import { NumField } from '@/components/primitives/NumField';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useUpsertProfile } from '@/api/profile';
import { useUiStore } from '@/stores/uiStore';
import { consumePendingInvite } from '@/lib/deeplinks';
import { useLocale } from '@/i18n/locale';
import { searchCities, searchStreets } from '@/lib/locationAutocomplete';

export default function Address() {
  const router = useRouter();
  const { t, language } = useLocale();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const upsert = useUpsertProfile();
  const pushToast = useUiStore((s) => s.pushToast);

  const [city, setCity] = useState('');
  const [cityLocked, setCityLocked] = useState(false);
  const [street, setStreet] = useState('');
  const [citySuggs, setCitySuggs] = useState<string[]>([]);
  const [streetSuggs, setStreetSuggs] = useState<string[]>([]);
  const [cityLoad, setCityLoad] = useState(false);
  const [streetLoad, setStreetLoad] = useState(false);
  const [building, setBuilding] = useState('');
  const [apt, setApt] = useState('');
  const [floor, setFloor] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectCity = (c: string) => {
    setCity(c);
    setCityLocked(true);
    setStreet('');
    setStreetSuggs([]);
  };

  const commitBestCity = () => {
    if (citySuggs.length > 0) {
      selectCity(citySuggs[0]);
    }
  };

  const runCitySearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setCitySuggs([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setCityLoad(true);
      try {
        const res = await searchCities(q, language, ac.signal);
        setCitySuggs(res);
      } catch {
        setCitySuggs([]);
      } finally {
        setCityLoad(false);
      }
    }, 250);
  }, [language]);

  const runStreetSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.trim().length < 2) {
        setStreetSuggs([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setStreetLoad(true);
        try {
          const res = await searchStreets(q, cityLocked ? city : '', language, ac.signal);
          setStreetSuggs(res);
        } catch {
          setStreetSuggs([]);
        } finally {
          setStreetLoad(false);
        }
      }, 350);
    },
    [city, cityLocked, language],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (cityLocked) return;
    runCitySearch(city);
  }, [city, cityLocked, runCitySearch]);

  const onStreetChange = (v: string) => {
    setStreet(v);
    runStreetSearch(v);
  };

  const valid = city.trim().length > 0 && street.trim().length > 0 && building.trim().length > 0 && apt.trim().length > 0;

  const submit = async () => {
    if (!valid || !profile) return;
    const updated = {
      ...profile,
      city: city.trim(),
      street: street.trim(),
      building: building.trim(),
      apt: apt.trim(),
      floor: floor.trim() || null,
    };
    try {
      await upsert.mutateAsync(updated);
      setProfile(updated);
      const pending = await consumePendingInvite();
      if (pending) {
        router.replace(`/join/${pending}`);
      } else {
        router.replace('/(auth)/success');
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : t('auth.address.saveError'), 'error');
    }
  };

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <StepDots total={4} current={2} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>SHAKANA</Text>
        <Text style={styles.title}>{t('auth.address.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.address.subtitle')}</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
        {!cityLocked ? (
          <AutoField
            label={t('auth.address.city')}
            value={city}
            onChange={(v) => {
              setCity(v);
              setCityLocked(false);
            }}
            onSelect={selectCity}
            onSubmitEditing={commitBestCity}
            placeholder={t('auth.address.citySearch')}
            suggestions={citySuggs}
            loading={cityLoad}
            autoFocus
          />
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>{t('auth.address.city')}</Text>
            <View style={styles.cityChip}>
              <Text style={styles.cityChipText}>{city}</Text>
              <Pressable
                onPress={() => {
                  setCityLocked(false);
                  setStreet('');
                  setStreetSuggs([]);
                }}
                hitSlop={8}
              >
                <Text style={styles.cityChange}>{t('common.change')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <AutoField
          label={t('auth.address.street')}
          value={street}
          onChange={onStreetChange}
          onSelect={(v) => {
            setStreet(v);
            setStreetSuggs([]);
          }}
          onSubmitEditing={() => {
            if (streetSuggs.length > 0) setStreet(streetSuggs[0]);
          }}
          placeholder={cityLocked ? t('auth.address.streetSearch', { city }) : t('auth.address.cityFirst')}
          suggestions={streetSuggs}
          loading={streetLoad}
          disabled={!cityLocked}
        />

        <View style={styles.row}>
          <NumField label={t('auth.address.building')} value={building} onChange={setBuilding} placeholder="22" />
          <NumField label={t('auth.address.apartment')} value={apt} onChange={setApt} placeholder="4" />
          <NumField label={t('auth.address.floor')} value={floor} onChange={setFloor} placeholder="2" />
        </View>

        <View style={styles.privacy}>
          <Text style={styles.privacyText}>
            {t('auth.address.privacy')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryBtn label={t('common.save')} onPress={submit} disabled={!valid} loading={upsert.isPending} />
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 20,
    paddingBottom: 36,
    gap: 22,
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
  subtitle: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu, lineHeight: 24 },
  fieldLabel: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.bodyBold },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.br,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 54,
    ...shadow.card,
  },
  cityChipText: {
    flex: 1,
    fontSize: 16,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
  },
  cityChange: {
    fontSize: 13,
    color: colors.acc,
    paddingHorizontal: 6,
    fontFamily: fontFamily.bodyBold,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  privacy: {
    backgroundColor: colors.accLight,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  privacyText: {
    fontSize: 13,
    color: colors.acc,
    lineHeight: 20,
    fontFamily: fontFamily.body,
  },
  footer: {
    paddingTop: 16,
  },
});
