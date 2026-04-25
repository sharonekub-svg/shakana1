import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { trackInviteSent, useGenerateInvite } from '@/api/invites';
import { buildAppInviteUrl, buildInviteUrl } from '@/lib/deeplinks';
import { useUiStore } from '@/stores/uiStore';

export default function InviteSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const gen = useGenerateInvite();
  const pushToast = useUiStore((s) => s.pushToast);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    gen.mutateAsync(String(id)).then((r) => setToken(r.token)).catch((e) => {
      pushToast(e instanceof Error ? e.message : 'לא ניתן להפיק קישור', 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const universal = token ? buildInviteUrl(token) : '';
  const appLink = token ? buildAppInviteUrl(token) : '';

  const onShare = async () => {
    if (!token || !id) return;
    try {
      await Share.share({
        message: `הצטרפו אליי להזמנה קבוצתית ב-שכנה: ${universal}`,
      });
      trackInviteSent(String(id));
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'שיתוף נכשל', 'error');
    }
  };

  const onCopy = async () => {
    if (!universal) return;
    await Clipboard.setStringAsync(universal);
    pushToast('הקישור הועתק', 'success');
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>הזמנת שכנים</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ gap: 16 }}>
        <Text style={styles.lead}>שלח את הקישור לשכנים שלך — הם יצטרפו להזמנה ויחלקו את העלות.</Text>

        <Pressable onPress={onCopy} style={styles.linkCard} accessibilityRole="button">
          {gen.isPending || !token ? (
            <ActivityIndicator color={colors.acc} />
          ) : (
            <Text style={styles.link} numberOfLines={1}>
              {universal}
            </Text>
          )}
          <Text style={styles.tap}>הקש להעתקה</Text>
        </Pressable>

        <Text style={styles.deepNote}>לפתיחה ישירה באפליקציה: {appLink}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 10 }}>
        <PrimaryBtn label="שתף קישור" onPress={onShare} disabled={!token} />
        <SecondaryBtn label="סיום" onPress={() => router.back()} />
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.tx },
  lead: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu, lineHeight: 24 },
  linkCard: {
    backgroundColor: colors.white,
    borderColor: colors.br,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    gap: 6,
    alignItems: 'center',
  },
  link: { fontFamily: fontFamily.bodySemi, color: colors.tx, fontSize: 14 },
  tap: { fontFamily: fontFamily.body, color: colors.mu, fontSize: 12 },
  deepNote: { fontFamily: fontFamily.body, color: colors.mu, fontSize: 11 },
});
