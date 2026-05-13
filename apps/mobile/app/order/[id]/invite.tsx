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
import { useOrder } from '@/api/orders';
import { buildAppInviteUrl, buildInviteUrl } from '@/lib/deeplinks';
import { useUiStore } from '@/stores/uiStore';
import { useLocale } from '@/i18n/locale';
import { formatAgorotMoney } from '@/utils/money';

function decodeTitle(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

export default function InviteSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const copy = isHebrew
    ? {
        createError: 'לא הצלחנו ליצור קישור הזמנה.',
        shareError: 'השיתוף נכשל.',
        copied: 'קישור ההזמנה הועתק.',
        title: 'הזמן שכנים',
        lead:
          'שלח את הקישור לחשבון אחר. אחרי התחברות והשלמת כתובת, החבר יצטרף לאותה הזמנה, יראה את הסל המלא ויוכל להוסיף מוצר לפני שהטיימר נסגר.',
        stepsTitle: 'איך השיתוף עובד',
        step1: '1. מעתיקים או משתפים את קישור ההזמנה.',
        step2: '2. החבר פותח את הקישור ומתחבר עם החשבון שלו.',
        step3: '3. Shakana מצרפת אותו להזמנה המדויקת הזאת.',
        step4: '4. התשלום בדמו מדומה, ורק אחרי תשלום הפריטים נכנסים לסל הקבוצתי.',
        tapCopy: 'לחץ להעתקה',
        directLink: 'קישור ישיר לאפליקציה',
        creating: 'יוצר...',
        shareButton: 'שתף קישור עם חבר',
        back: 'חזרה להזמנה',
        oneLinkTitle: 'זה הקישור היחיד ששולחים',
        oneLinkBody: 'החבר פותח, מתחבר עם החשבון שלו, ונכנס לאותה הזמנה עם אותו סל.',
        myOrder: 'ההזמנה שלי',
      }
    : {
        createError: 'Could not create invite link.',
        shareError: 'Sharing failed.',
        copied: 'Invite link copied.',
        title: 'Invite neighbors',
        lead:
          'Send this link to another account. After they sign in and finish their address, they will join the same order, see the full cart, and add their own product before the timer closes.',
        stepsTitle: 'How the share flow works',
        step1: '1. Copy or share this invite link.',
        step2: '2. Your friend opens it and logs in with their own account.',
        step3: '3. Shakana joins them to this exact order.',
        step4: '4. Payment is simulated in the demo; paid items then enter the group cart.',
        tapCopy: 'Tap to copy',
        directLink: 'Direct app link',
        creating: 'creating...',
        shareButton: 'Share link with a friend',
        back: 'Back to order',
        oneLinkTitle: 'This is the one link to send',
        oneLinkBody: 'Your friend opens it, signs in with their own account, and lands inside the same shared order.',
        myOrder: 'my order',
      };
  const gen = useGenerateInvite();
  const { data } = useOrder(id);
  const pushToast = useUiStore((s) => s.pushToast);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    gen.mutateAsync(String(id)).then((r) => setToken(r.token)).catch((e) => {
      pushToast(e instanceof Error ? e.message : copy.createError, 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const universal = token ? buildInviteUrl(token) : '';
  const appLink = token ? buildAppInviteUrl(token) : '';
  const order = data?.order;
  const participantCount = Math.max(1, data?.participants.length ?? 1);
  const deliveryFee = order?.estimated_shipping_agorot ?? 0;
  const freeShippingGap = order
    ? Math.max(0, (order.free_shipping_threshold_agorot ?? 0) - order.product_price_agorot * participantCount)
    : 0;
  const productTitle = decodeTitle(order?.product_title) ?? copy.myOrder;

  const shareParts: string[] = isHebrew ? ['פתחתי הזמנה קבוצתית ב-Shakana'] : ['I opened a group order on Shakana'];
  if (productTitle !== copy.myOrder) shareParts.push(isHebrew ? `מוצר: ${productTitle}` : `Product: ${productTitle}`);
  if (order?.store_label && order.store_label !== 'Manual store') {
    shareParts.push(isHebrew ? `חנות: ${order.store_label}` : `Store: ${order.store_label}`);
  }
  const closesAt = order?.closes_at ? new Date(order.closes_at) : null;
  if (closesAt && closesAt > new Date()) {
    const msLeft = closesAt.getTime() - Date.now();
    const hLeft = Math.floor(msLeft / 3600000);
    const mLeft = Math.floor((msLeft % 3600000) / 60000);
    const timeStr = isHebrew
      ? hLeft > 0 ? `${hLeft} שעות ו-${mLeft} דקות` : `${mLeft} דקות`
      : hLeft > 0 ? `${hLeft}h ${mLeft}m` : `${mLeft}m`;
    shareParts.push(isHebrew ? `נסגר בעוד: ${timeStr}` : `Closes in: ${timeStr}`);
  }
  if (deliveryFee > 0) {
    shareParts.push(
      isHebrew
        ? `דמי משלוח נוכחיים לאדם: ${formatAgorotMoney(Math.ceil(deliveryFee / participantCount), language)}`
        : `Current delivery per person: ${formatAgorotMoney(Math.ceil(deliveryFee / participantCount), language)}`,
    );
  }
  if (freeShippingGap > 0) {
    shareParts.push(
      isHebrew
        ? `חסר למשלוח חינם: ${formatAgorotMoney(freeShippingGap, language)}`
        : `Missing for free shipping: ${formatAgorotMoney(freeShippingGap, language)}`,
    );
  }
  if (participantCount > 1) shareParts.push(isHebrew ? `הצטרפו: ${participantCount} שכנים` : `Joined: ${participantCount} neighbors`);
  const smartShareMessage = shareParts.join('\n');

  const onShare = async () => {
    if (!token || !id) return;
    try {
      await Share.share({ message: `${smartShareMessage}\n\n${universal}` });
      trackInviteSent(String(id));
    } catch (e) {
      pushToast(e instanceof Error ? e.message : copy.shareError, 'error');
    }
  };

  const onCopy = async () => {
    if (!universal) return;
    await Clipboard.setStringAsync(universal);
    pushToast(copy.copied, 'success');
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ gap: 16 }}>
        <Text style={styles.lead}>{copy.lead}</Text>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>{copy.stepsTitle}</Text>
          <Text style={styles.step}>{copy.step1}</Text>
          <Text style={styles.step}>{copy.step2}</Text>
          <Text style={styles.step}>{copy.step3}</Text>
          <Text style={styles.step}>{copy.step4}</Text>
        </View>

        <Pressable onPress={onCopy} style={styles.linkCard} accessibilityRole="button">
          <Text style={styles.oneLinkTitle}>{copy.oneLinkTitle}</Text>
          <Text style={styles.oneLinkBody}>{copy.oneLinkBody}</Text>
          {gen.isPending || !token ? (
            <ActivityIndicator color={colors.acc} />
          ) : (
            <Text style={styles.link} numberOfLines={1}>
              {universal}
            </Text>
          )}
          <Text style={styles.tap}>{copy.tapCopy}</Text>
        </Pressable>

        <Text style={styles.deepNote}>{copy.directLink}: {appLink || copy.creating}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 10 }}>
        <PrimaryBtn label={copy.shareButton} onPress={onShare} disabled={!token} />
        <SecondaryBtn label={copy.back} onPress={() => router.back()} />
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
    backgroundColor: colors.navy,
    borderColor: colors.acc,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  oneLinkTitle: { fontFamily: fontFamily.display, color: colors.white, fontSize: 20, textAlign: 'center' },
  oneLinkBody: { fontFamily: fontFamily.body, color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  link: { fontFamily: fontFamily.bodySemi, color: colors.white, fontSize: 14 },
  tap: { fontFamily: fontFamily.bodyBold, color: '#CFF4DB', fontSize: 12 },
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
    lineHeight: 20,
    color: colors.mu,
  },
});
