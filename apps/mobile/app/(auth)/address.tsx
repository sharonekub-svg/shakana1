import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn } from '@/components/primitives/Button';
import { BackBtn } from '@/components/primitives/BackBtn';
import { StepDots } from '@/components/primitives/StepDots';
import { AutoField } from '@/components/primitives/AutoField';
import { NumField } from '@/components/primitives/NumField';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { matchCities } from '@/lib/israeliCities';
import { searchStreets } from '@/lib/streetSearch';
import { useAuthStore } from '@/stores/authStore';
import { useUpsertProfile } from '@/api/profile';
import { useUiStore } from '@/stores/uiStore';
import { consumePendingInvite } from '@/lib/deeplinks';

export default function Address() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const upsert = useUpsertProfile();
  const pushToast = useUiStore((s) => s.pushToast);

  const [city, setCity] = useState('');
  const [cityLocked, setCityLocked] = useState(false);
  const [street, setStreet] = useState('');
  const [streetSuggs, setStreetSuggs] = useState<string[]>([]);
  const [streetLoad, setStreetLoad] = useState(false);
  const [building, setBuilding] = useState('');
  const [apt, setApt] = useState('');
  const [floor, setFloor] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const citySuggs = matchCities(city);

  const selectCity = (c: string) => {
    setCity(c);
    setCityLocked(true);
    setStreet('');
    setStreetSuggs([]);
  };

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
          const res = await searchStreets(q, cityLocked ? city : '', ac.signal);
          setStreetSuggs(res);
        } catch {
          setStreetSuggs([]);
        } finally {
          setStreetLoad(false);
        }
      }, 400);
    },
    [city, cityLocked],
  );

  useEffect(() => () => debounceRef.current && clearTimeout(debounceRef.current), []);

  const onStreetChange = (v: string) => {
    setStreet(v);
    runStreetSearch(v);
  };

  const valid =
    city.trim().length > 0 &&
    street.trim().length > 0 &&
    building.trim().length > 0 &&
    apt.trim().length > 0;

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
      // If a deep-link invite was stashed pre-login, consume it now.
      const pending = await consumePendingInvite();
      if (pending) {
        router.replace(`/join/${pending}`);
      } else {
        router.replace('/(auth)/success');
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'שגיאה בשמירת הכתובת', 'error');
    }
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <StepDots total={4} current={2} />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.title}>כתובת הבניין שלך</Text>
        <Text style={styles.subtitle}>כדי לחבר אותך עם השכנים הנכונים</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
        {!cityLocked ? (
          <AutoField
            label="עיר"
            value={city}
            onChange={(v) => {
              setCity(v);
              setCityLocked(false);
            }}
            onSelect={selectCity}
            placeholder="חפש עיר..."
            suggestions={citySuggs}
            autoFocus
          />
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>עיר</Text>
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
                <Text style={styles.cityChange}>שנה</Text>
              </Pressable>
            </View>
          </View>
        )}

        <AutoField
          label="רחוב"
          value={street}
          onChange={onStreetChange}
          onSelect={(v) => {
            setStreet(v);
            setStreetSuggs([]);
          }}
          placeholder={cityLocked ? `חפש רחוב ב${city}...` : 'בחר עיר תחילה'}
          suggestions={streetSuggs}
          loading={streetLoad}
          disabled={!cityLocked}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumField label="בניין" value={building} onChange={setBuilding} placeholder="22" />
          <NumField label="דירה" value={apt} onChange={setApt} placeholder="4" />
          <NumField label="קומה" value={floor} onChange={setFloor} placeholder="2" />
        </View>

        <View style={styles.privacy}>
          <Text style={styles.privacyText}>
            🔒 כתובתך משמשת לאימות בלבד ואינה נחשפת לשכנים ללא אישורך.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <PrimaryBtn
          label="סיים הרשמה"
          onPress={submit}
          disabled={!valid}
          loading={upsert.isPending}
        />
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.tx,
    marginBottom: 6,
  },
  subtitle: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu },
  fieldLabel: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.bodyMedium },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,124,89,0.09)',
    borderColor: 'rgba(74,124,89,0.27)',
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  cityChipText: {
    flex: 1,
    fontSize: 16,
    color: colors.tx,
    fontFamily: fontFamily.bodyMedium,
  },
  cityChange: {
    fontSize: 13,
    color: colors.mu,
    paddingHorizontal: 6,
    fontFamily: fontFamily.bodyMedium,
  },
  privacy: {
    backgroundColor: colors.accLight,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  privacyText: {
    fontSize: 13,
    color: colors.acc,
    lineHeight: 20,
    fontFamily: fontFamily.body,
  },
});
