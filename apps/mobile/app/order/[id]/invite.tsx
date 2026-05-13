import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
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

function WhatsAppIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FAF6EF">
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </Svg>
  );
}

function CopyIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FAF6EF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={9} width={13} height={13} rx={2} />
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#A89B89" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
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
        headline: 'הזמן\nשכנים',
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
        shareWhatsApp: 'שתף בוואטסאפ',
        shareButton: 'שתף קישור עם חבר',
        back: 'חזרה להזמנה',
        oneLinkTitle: 'זה הקישור היחיד ששולחים',
        oneLinkBody: 'החבר פותח, מתחבר עם החשבון שלו, ונכנס לאותה הזמנה עם אותו סל.',
        myOrder: 'ההזמנה שלי',
        seeYourSavings: 'ראה את החיסכון שלך',
        howItWorks: 'איך זה עובד',
        inviteLink: 'קישור הזמנה',
      }
    : {
        createError: 'Could not create invite link.',
        shareError: 'Sharing failed.',
        copied: 'Invite link copied.',
        title: 'Invite neighbors',
        headline: 'Invite your\nneighbors',
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
        shareWhatsApp: 'Share on WhatsApp',
        shareButton: 'Share link with a friend',
        back: 'Back to order',
        oneLinkTitle: 'This is the one link to send',
        oneLinkBody: 'Your friend opens it, signs in with their own account, and lands inside the same shared order.',
        myOrder: 'my order',
        seeYourSavings: 'See your savings',
        howItWorks: 'How it works',
        inviteLink: 'Invite link',
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
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.headline}>{copy.headline}</Text>
        <Text style={styles.lead}>{copy.lead}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={styles.sectionLabel}>{copy.inviteLink}</Text>
        <View style={styles.qrCard}>
          <View style={styles.qrPlaceholder}>
            <View style={styles.qrInner}>
              {gen.isPending || !token ? (
                <ActivityIndicator color={colors.acc} />
              ) : (
                <>
                  <View style={styles.qrCornerTL} />
                  <View style={styles.qrCornerTR} />
                  <View style={styles.qrCornerBL} />
                  <View style={styles.qrDot} />
                </>
              )}
            </View>
          </View>

          <View style={styles.linkRow}>
            {gen.isPending || !token ? (
              <Text style={styles.linkText} numberOfLines={1}>{copy.creating}</Text>
            ) : (
              <Text style={styles.linkText} numberOfLines={1}>{universal}</Text>
            )}
            <Pressable
              onPress={onCopy}
              style={styles.copyBtn}
              accessibilityRole="button"
              accessibilityLabel={copy.tapCopy}
            >
              <CopyIcon />
              <Text style={styles.copyBtnText}>{isHebrew ? 'העתק' : 'Copy'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{copy.howItWorks}</Text>
        <View style={styles.stepsCard}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
            <Text style={styles.stepText}>{isHebrew ? 'מעתיקים או משתפים את קישור ההזמנה' : 'Copy or share the invite link'}</Text>
            <ChevronRight />
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
            <Text style={styles.stepText}>{isHebrew ? 'החבר נכנס עם החשבון שלו' : 'Friend signs in with their account'}</Text>
            <ChevronRight />
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
            <Text style={styles.stepText}>{isHebrew ? 'Shakana מצרפת אותו להזמנה' : 'Shakana joins them to the order'}</Text>
            <ChevronRight />
          </View>
        </View>

        {appLink ? (
          <Text style={styles.deepNote}>{copy.directLink}: {appLink}</Text>
        ) : null}
      </View>

      <View style={{ flex: 1, minHeight: 20 }} />

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onShare}
          disabled={!token}
          style={[styles.whatsappBtn, !token && { opacity: 0.5 }]}
          accessibilityRole="button"
        >
          <WhatsAppIcon />
          <Text style={styles.whatsappBtnText}>{copy.shareWhatsApp}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(`/order/${id}/created` as any)}
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostBtnText}>{copy.seeYourSavings}</Text>
        </Pressable>
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroSection: {
    marginBottom: 28,
    gap: 10,
  },
  headline: {
    fontFamily: fontFamily.display,
    fontSize: 38,
    color: '#1E1812',
    fontStyle: 'italic',
    lineHeight: 44,
  },
  lead: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: '#6A5E50',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: '#A89B89',
    marginBottom: 2,
  },
  qrCard: {
    backgroundColor: '#FAF6EF',
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(30,24,18,0.10)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE6D6',
  },
  qrInner: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#1E1812',
    borderTopLeftRadius: 4,
  },
  qrCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1E1812',
    borderTopRightRadius: 4,
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#1E1812',
    borderBottomLeftRadius: 4,
  },
  qrDot: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#1E1812',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  linkText: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: '#6A5E50',
    letterSpacing: 0.2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C5654B',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: '#FAF6EF',
  },
  stepsCard: {
    backgroundColor: '#FAF6EF',
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    padding: 16,
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,24,18,0.07)',
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFE6D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: '#1E1812',
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#6A5E50',
    lineHeight: 19,
  },
  deepNote: {
    fontFamily: fontFamily.body,
    color: '#A89B89',
    fontSize: 11,
    lineHeight: 16,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1F8A5B',
    height: 52,
    borderRadius: 999,
    width: '100%',
  },
  whatsappBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: '#FAF6EF',
  },
  ghostBtn: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    backgroundColor: 'transparent',
  },
  ghostBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: '#1E1812',
  },
});
