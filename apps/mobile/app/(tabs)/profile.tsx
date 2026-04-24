import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';
import { useSignOut } from '@/api/auth';
import { useUiStore } from '@/stores/uiStore';
import { resetAnalytics } from '@/lib/posthog';

type RowProps = {
  icon: string;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
};

function Row({ icon, label, value, danger, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.s1 }]}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, danger && { backgroundColor: '#ffe5e5' }]}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.err }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {!danger ? (
        <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
          <Path d="M5 10L1 6l4-4" stroke={colors.mu2} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

export default function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const reset = useAuthStore((s) => s.reset);
  const { data: profile } = useProfile(user?.id);
  const signOut = useSignOut();
  const pushToast = useUiStore((s) => s.pushToast);

  const initials =
    (profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '');

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      resetAnalytics();
      reset();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'שגיאה בהתנתקות', 'error');
    }
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <ScrollView contentContainerStyle={{ paddingTop: 6, paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 18 }}>
          <Text style={styles.title}>פרופיל</Text>

          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'שכ'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {profile ? `${profile.first_name} ${profile.last_name}` : 'שלום'}
              </Text>
              {profile ? (
                <>
                  <Text style={styles.cardLine}>
                    {profile.street} {profile.building}, דירה {profile.apt}
                  </Text>
                  <Text style={styles.cardLine}>{profile.city}</Text>
                </>
              ) : null}
            </View>
          </View>

          <Text style={styles.section}>חשבון</Text>
          <View style={styles.group}>
            <Row icon="🏠" label="פרטי מגורים" value={profile ? `${profile.street} ${profile.building}` : ''} />
            <Row icon="📱" label="מספר טלפון" value={profile?.phone ? `+972 ${profile.phone}` : ''} />
            <Row icon="💳" label="שיטות תשלום" value="הוסף" />
            <Row icon="🔔" label="התראות" />
          </View>

          <Text style={styles.section}>פרטיות</Text>
          <View style={styles.group}>
            <Row icon="📄" label="תנאי שימוש" onPress={() => Linking.openURL('https://shakana.app/legal/terms')} />
            <Row icon="🔒" label="מדיניות פרטיות" onPress={() => Linking.openURL('https://shakana.app/legal/privacy')} />
            <Row icon="📬" label="צור קשר" value="support@shakana.app" onPress={() => Linking.openURL('mailto:support@shakana.app')} />
            <Row icon="🗑️" label="מחק חשבון" danger onPress={handleLogout} />
          </View>

          <View style={styles.group}>
            <Row icon="🚪" label="התנתק" danger onPress={handleLogout} />
          </View>

          <Text style={styles.version}>גרסה 1.0.0 · שכנה © 2026</Text>
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fontFamily.display, fontSize: 24, color: colors.tx, marginBottom: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderColor: colors.br,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    shadowColor: '#1e1c18',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontFamily: fontFamily.bodySemi, color: colors.white },
  name: { fontSize: 19, color: colors.tx, fontFamily: fontFamily.bodySemi },
  cardLine: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.body, marginTop: 2 },
  section: {
    fontSize: 11,
    fontFamily: fontFamily.bodySemi,
    color: colors.mu,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  group: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderColor: colors.br,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomColor: colors.br,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.tx, fontFamily: fontFamily.body },
  rowValue: { fontSize: 14, color: colors.mu, fontFamily: fontFamily.body },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.mu,
    fontFamily: fontFamily.body,
    marginTop: 4,
  },
});
