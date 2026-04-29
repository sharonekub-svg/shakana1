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
      pushToast(e instanceof Error ? e.message : 'Could not create invite link.', 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const universal = token ? buildInviteUrl(token) : '';
  const appLink = token ? buildAppInviteUrl(token) : '';

  const onShare = async () => {
    if (!token || !id) return;
    try {
      await Share.share({
        message: `${appLink}\n${universal}\n\nOpen Shakana to join the order and see the full details.`,
      });
      trackInviteSent(String(id));
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Sharing failed.', 'error');
    }
  };

  const onCopy = async () => {
    if (!universal) return;
    await Clipboard.setStringAsync(universal);
    pushToast('Invite link copied.', 'success');
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Invite neighbors</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ gap: 16 }}>
        <Text style={styles.lead}>
          Send this link to another account. After they sign in and finish their address, they will join the same order,
          see the full cart, and add their own product before the timer closes.
        </Text>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>How the share flow works</Text>
          <Text style={styles.step}>1. Copy or share this invite link.</Text>
          <Text style={styles.step}>2. Your friend opens it and logs in with their own account.</Text>
          <Text style={styles.step}>3. Shakana joins them to this exact order.</Text>
          <Text style={styles.step}>4. Payment is skipped for the demo, so they can immediately add a product to the cart.</Text>
        </View>

        <Pressable onPress={onCopy} style={styles.linkCard} accessibilityRole="button">
          {gen.isPending || !token ? (
            <ActivityIndicator color={colors.acc} />
          ) : (
            <Text style={styles.link} numberOfLines={1}>
              {universal}
            </Text>
          )}
          <Text style={styles.tap}>Tap to copy</Text>
        </Pressable>

        <Text style={styles.deepNote}>Direct app link: {appLink || 'creating...'}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 10 }}>
        <PrimaryBtn label="Share link with a friend" onPress={onShare} disabled={!token} />
        <SecondaryBtn label="Back to order" onPress={() => router.back()} />
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
  stepsCard: {
    gap: 8,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.br,
  },
  stepsTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  step: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mu,
  },
});
