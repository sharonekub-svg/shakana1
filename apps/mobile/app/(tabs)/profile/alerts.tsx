import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';

function ToggleRow({
  label,
  desc,
  value,
  onToggle,
}: {
  label: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardSoft }]}
      accessibilityRole="button"
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <Text style={[styles.switchLabel, value && styles.switchLabelOn]}>{value ? 'ON' : 'OFF'}</Text>
      </View>
    </Pressable>
  );
}

export default function AlertsSettings() {
  const router = useRouter();
  const { t } = useLocale();
  const settings = useNotificationSettingsStore((s) => s.settings);
  const hydrated = useNotificationSettingsStore((s) => s.hydrated);
  const load = useNotificationSettingsStore((s) => s.load);
  const setSetting = useNotificationSettingsStore((s) => s.setSetting);

  useEffect(() => {
    if (!hydrated) {
      void load();
    }
  }, [hydrated, load]);

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View>
          <Text style={styles.kicker}>SHAKANA</Text>
          <Text style={styles.title}>{t('profile.alertsTitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {!hydrated ? (
          <ActivityIndicator color={colors.acc} />
        ) : (
          <>
            <ToggleRow
              label={t('profile.alertOrderUpdates')}
              desc={t('profile.alertOrderUpdatesDesc')}
              value={settings.orderUpdates}
              onToggle={() => void setSetting('orderUpdates', !settings.orderUpdates)}
            />
            <ToggleRow
              label={t('profile.alertPaymentReminders')}
              desc={t('profile.alertPaymentRemindersDesc')}
              value={settings.paymentReminders}
              onToggle={() => void setSetting('paymentReminders', !settings.paymentReminders)}
            />
            <ToggleRow
              label={t('profile.alertProductAlerts')}
              desc={t('profile.alertProductAlertsDesc')}
              value={settings.productAlerts}
              onToggle={() => void setSetting('productAlerts', !settings.productAlerts)}
            />
          </>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.br,
  },
  rowTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  rowDesc: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  switch: {
    width: 58,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.tx,
    borderColor: colors.tx,
  },
  switchLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.tx,
  },
  switchLabelOn: {
    color: colors.white,
  },
});
