import { useEffect, useState, useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { formatMoney } from '@/utils/money';
import {
  FREE_SHIPPING_GOAL,
  type DemoBrandId,
  type DemoProduct,
  demoStores,
} from '@/demo/catalog';
import {
  getGoalProgress,
  getGroupSavings,
  getDemoOrderStats,
  getOrderTotal,
  getPersonalSavings,
  getRemainingToGoal,
  getSharedDeliveryFee,
  getParticipantSuccessCount,
  type DemoPulse,
  type DemoOrder,
  type OrderStatus,
} from '@/stores/demoCommerceStore';

const glassWebStyle = Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)' } as any) : null;

export function DemoPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <View style={styles.page}>
      <View style={[styles.shell, wide && styles.wideShell]}>{children}</View>
    </View>
  );
}

export function DemoButton({
  label,
  onPress,
  disabled,
  tone = 'dark',
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'dark' | 'light' | 'accent' | 'danger';
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'light' && styles.lightButton,
        tone === 'accent' && styles.accentButton,
        tone === 'danger' && styles.dangerButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
        styles.buttonText,
        tone === 'light' && styles.lightButtonText,
        tone === 'accent' && styles.accentButtonText,
        tone === 'danger' && styles.dangerButtonText,
          disabled && styles.disabledButtonText,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return <View style={[styles.card, glassWebStyle, padded && styles.cardPad, style]}>{children}</View>;
}

export function SectionTitle({ title, kicker }: { title: string; kicker?: string }) {
  return (
    <View style={styles.sectionTitle}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.h2}>{title}</Text>
    </View>
  );
}

export function BrandPill({ brand }: { brand: DemoBrandId }) {
  const store = demoStores[brand];
  return (
    <View style={styles.brandPill}>
      <Text style={styles.brandPillText}>{store.logoText}</Text>
    </View>
  );
}

export function ProductImage({ product, imageUri }: { product: DemoProduct; imageUri?: string }) {
  return (
    <Image
      source={{ uri: imageUri ?? product.image }}
      style={styles.productImage}
      resizeMode="cover"
      accessibilityLabel={product.name}
    />
  );
}

export function ProgressBar({ progress, accent = colors.acc }: { progress: number; accent?: string }) {
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${Math.max(4, Math.min(100, progress))}%`, backgroundColor: accent }]} />
    </View>
  );
}

export function TimerRing({
  remainingMs,
  totalMs,
  label = 'left',
}: {
  remainingMs: number;
  totalMs: number;
  label?: string;
}) {
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, remainingMs / totalMs));
  const strokeDashoffset = circumference * (1 - pct);
  const tone = remainingMs > 5 * 60 * 1000 ? colors.acc : remainingMs > 2 * 60 * 1000 ? colors.gold : colors.err;
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000)
    .toString()
    .padStart(2, '0');

  return (
    <View style={styles.timerWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8DED2"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tone}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.timerCenter} pointerEvents="none">
        <Text style={styles.timerValue}>{mins}:{secs}</Text>
        <Text style={styles.timerLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function SelfUpdatingTimerRing({
  closesAt,
  createdAt,
  label = 'left',
  onTimerEnd,
}: {
  closesAt: number;
  createdAt: number;
  label?: string;
  onTimerEnd?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const totalMs = Math.max(60 * 1000, closesAt - createdAt);
  const remainingMs = Math.max(0, closesAt - now);
  const onTimerEndRef = useRef(onTimerEnd);
  const notifiedClosesAtRef = useRef<number | null>(null);

  onTimerEndRef.current = onTimerEnd;

  useEffect(() => {
    const interval = setInterval(() => {
      const nextNow = Date.now();
      setNow((current) => (current === nextNow ? current : nextNow));
      if (closesAt <= nextNow && notifiedClosesAtRef.current !== closesAt) {
        notifiedClosesAtRef.current = closesAt;
        onTimerEndRef.current?.();
      }
    }, 1000);
    if (closesAt <= Date.now() && notifiedClosesAtRef.current !== closesAt) {
      notifiedClosesAtRef.current = closesAt;
      setTimeout(() => onTimerEndRef.current?.(), 0);
    }
    return () => clearInterval(interval);
  }, [closesAt]);

  return <TimerRing remainingMs={remainingMs} totalMs={totalMs} label={label} />;
}

export function CelebrationBanner({ pulse }: { pulse: DemoPulse | null }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.82, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [anim, pulse?.id]);

  if (!pulse) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const isWin = pulse.message.toLowerCase().includes('free') || pulse.message.includes('חינם') || pulse.message.includes('חסכ') || pulse.message.toLowerCase().includes('unlock');
  return (
    <Animated.View style={[styles.celebration, isWin && styles.celebrationWin, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.celebrationSpark}>{isWin ? '+' : 'NEW'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.celebrationTitle}>{isWin ? 'חיסכון! ביחד הצלחנו' : 'עדכון חי'}</Text>
        <Text style={styles.celebrationBody}>{pulse.message}</Text>
      </View>
    </Animated.View>
  );
}

export function SavingsTracker({
  orders,
  activeParticipantId,
}: {
  orders: DemoOrder[];
  activeParticipantId: string;
}) {
  const { language } = useLocale();
  const stats = getDemoOrderStats(orders);
  const personalWins = getParticipantSuccessCount(orders, activeParticipantId);
  const yearlySavings = Math.round(stats.totalSavings);
  return (
    <Card style={styles.trackerCard}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.kicker}>{language === 'he' ? 'אמון וחיסכון' : 'Trust & savings'}</Text>
          <Text style={styles.h3}>
            {language === 'he'
              ? `חסכת ${formatMoney(yearlySavings, language)} השנה`
              : `You have saved ${formatMoney(yearlySavings, language)} this year`}
          </Text>
        </View>
        <View style={styles.badgeStack}>
          <View style={styles.socialBadge}>
            <Text style={styles.socialBadgeValue}>{personalWins}</Text>
            <Text style={styles.socialBadgeLabel}>{language === 'he' ? 'חסכונות מאומתים' : 'verified saves'}</Text>
          </View>
          <View style={[styles.socialBadge, styles.neutralBadge]}>
            <Text style={styles.socialBadgeValue}>{stats.totalParticipants || 1}</Text>
            <Text style={styles.socialBadgeLabel}>{language === 'he' ? 'שכנים מחוברים' : 'trusted neighbors'}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.muted}>
        {language === 'he'
          ? 'הזמנות WhatsApp, וריאנטים מדויקים ומצב פרטיות שומרים על זרימה מהירה בלי לחשוף פריטים פרטיים.'
          : 'WhatsApp invites, exact variants, and privacy mode keep the flow fast without exposing items you want to keep private.'}
      </Text>
    </Card>
  );
}

export function SavingsPanel({ order, compact = false }: { order: DemoOrder; compact?: boolean }) {
  const { language } = useLocale();
  const progress = getGoalProgress(order);
  const remaining = getRemainingToGoal(order);
  const personal = getPersonalSavings(order);
  const shared = getSharedDeliveryFee(order);
  const group = getGroupSavings(order);
  return (
    <Card style={compact ? styles.compactSavings : undefined}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.kicker}>{language === 'he' ? 'חיסכון קבוצתי' : 'Group savings'}</Text>
          <Text style={styles.savingsBig}>
            {language === 'he'
              ? `נחסכו ${formatMoney(Math.round(group), language)} בסך הכל`
              : `Saved ${formatMoney(Math.round(group), language)} total`}
          </Text>
        </View>
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>
            {language === 'he'
              ? `${formatMoney(Math.round(personal), language)} לכל משתתף`
              : `${formatMoney(Math.round(personal), language)} saved each`}
          </Text>
        </View>
      </View>
      <Text style={styles.muted}>
        {language === 'he'
          ? `החלק שלך במשלוח ירד מ-${formatMoney(25, language)} ל-${formatMoney(Number(shared.toFixed(0)), language)}.`
          : `Your delivery share dropped from ${formatMoney(25, language)} to ${formatMoney(Number(shared.toFixed(0)), language)}.`}
      </Text>
      <View style={styles.progressBlock}>
        <View style={styles.rowBetween}>
          <Text style={styles.muted}>{formatMoney(getOrderTotal(order), language)} / {formatMoney(FREE_SHIPPING_GOAL, language)}</Text>
          <Text style={styles.muted}>{progress}%</Text>
        </View>
        <ProgressBar progress={progress} />
        <Text style={styles.muted}>
          {remaining === 0
            ? language === 'he' ? 'משלוח חינם נפתח לקבוצה הזאת.' : 'Free shipping unlocked for this group.'
            : language === 'he'
              ? `נשארו רק ${formatMoney(remaining, language)} לפתיחת משלוח חינם.`
              : `Only ${formatMoney(remaining, language)} left to unlock free shipping.`}
        </Text>
      </View>
    </Card>
  );
}

export function StatusRail({ status }: { status: OrderStatus }) {
  const statuses: OrderStatus[] = ['collecting', 'accepted', 'packing', 'ready', 'shipped'];
  const currentIndex = statuses.indexOf(status);
  const labels: Record<OrderStatus, string> = {
    collecting: 'Collecting',
    accepted: 'Accepted',
    packing: 'Packing',
    ready: 'Ready',
    shipped: 'Shipped',
  };
  return (
    <View style={styles.statusRail}>
      {statuses.map((item, index) => {
        const completed = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <View key={item} style={[styles.statusItem, completed && styles.statusItemDone, isCurrent && styles.statusItemCurrent]}>
            <Text style={[styles.statusText, completed && styles.statusTextDone, isCurrent && styles.statusTextCurrent]}>
              {labels[item]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function EmptyNotice({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Text style={styles.h3}>{title}</Text>
      <Text style={styles.muted}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 18,
  },
  wideShell: {
    maxWidth: 1180,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 0,
    borderColor: colors.br,
    borderRadius: 22,
    ...shadow.card,
  },
  cardPad: {
    padding: 18,
  },
  button: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  lightButton: {
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
  },
  accentButton: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    ...shadow.cta,
  },
  dangerButton: {
    backgroundColor: colors.err,
    borderColor: colors.err,
  },
  disabledButton: {
    backgroundColor: colors.s2,
    borderColor: colors.br,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.82,
  },
  buttonText: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    textAlign: 'center',
  },
  lightButtonText: {
    color: colors.tx,
  },
  accentButtonText: {
    color: colors.white,
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: colors.mu2,
  },
  sectionTitle: {
    gap: 2,
  },
  kicker: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  h2: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
  },
  h3: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    marginBottom: 6,
  },
  muted: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    alignSelf: 'flex-start',
  },
  brandPillText: {
    color: colors.white,
    fontFamily: fontFamily.display,
    fontSize: 22,
  },
  productImage: {
    width: '100%',
    aspectRatio: 0.84,
    borderRadius: 18,
    backgroundColor: colors.s2,
  },
  progressOuter: {
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: colors.s2,
  },
  progressInner: {
    height: '100%',
    borderRadius: 99,
  },
  timerWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 16,
  },
  timerLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
  },
  celebration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    borderWidth: 0,
    borderColor: colors.br,
    backgroundColor: colors.limeSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.acc,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  celebrationWin: {
    backgroundColor: '#F0FAF4',
    borderColor: '#A8DDB5',
    shadowColor: '#2D9E6B',
  },
  celebrationSpark: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  celebrationTitle: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  celebrationBody: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
  },
  trackerCard: {
    gap: 10,
  },
  badgeStack: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  socialBadge: {
    minWidth: 94,
    borderRadius: 18,
    backgroundColor: colors.limeSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  neutralBadge: {
    backgroundColor: colors.s2,
  },
  socialBadgeValue: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 28,
  },
  socialBadgeLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
  },
  savingsBig: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 20,
  },
  savingsBadge: {
    borderRadius: 14,
    backgroundColor: colors.accLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savingsBadgeText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  progressBlock: {
    gap: 8,
    marginTop: 14,
  },
  compactSavings: {
    padding: 12,
  },
  statusRail: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
  },
  statusItem: {
    borderRadius: 999,
    backgroundColor: colors.s2,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusItemDone: {
    backgroundColor: colors.limeSoft,
  },
  statusItemCurrent: {
    backgroundColor: colors.ink,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.s3,
  },
  statusDotActive: {
    backgroundColor: colors.acc,
  },
  statusDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.s2,
    borderWidth: 2,
    borderColor: colors.acc,
  },
  statusText: {
    color: colors.mu2,
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
  },
  statusTextDone: {
    color: colors.acc,
  },
  statusTextCurrent: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
  },
});

export const demoStyles = styles;
