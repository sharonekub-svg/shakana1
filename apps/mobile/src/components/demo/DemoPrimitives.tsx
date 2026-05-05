import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import {
  FREE_SHIPPING_GOAL,
  type DemoBrandId,
  type DemoProduct,
  demoStores,
} from '@/demo/catalog';
import {
  getGoalProgress,
  getGroupSavings,
  getOrderTotal,
  getPersonalSavings,
  getRemainingToGoal,
  getSharedDeliveryFee,
  type DemoOrder,
  type OrderStatus,
} from '@/stores/demoCommerceStore';

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
  return <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
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
    <View style={[styles.brandPill, { borderColor: store.accent }]}>
      <Text style={[styles.brandPillText, { color: store.accent }]}>{store.logoText}</Text>
    </View>
  );
}

export function ProductImage({ product }: { product: DemoProduct }) {
  return (
    <Image
      source={{ uri: product.image }}
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

export function SavingsPanel({ order, compact = false }: { order: DemoOrder; compact?: boolean }) {
  const progress = getGoalProgress(order);
  const remaining = getRemainingToGoal(order);
  const personal = getPersonalSavings(order);
  const shared = getSharedDeliveryFee(order);
  const group = getGroupSavings(order);
  return (
    <Card style={compact ? styles.compactSavings : undefined}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.kicker}>Group savings</Text>
          <Text style={styles.savingsBig}>Saved ₪{Math.round(group)} total</Text>
        </View>
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>₪{Math.round(personal)} saved each</Text>
        </View>
      </View>
      <Text style={styles.muted}>
        Your delivery share dropped from ₪25 to ₪{shared.toFixed(0)}.
      </Text>
      <View style={styles.progressBlock}>
        <View style={styles.rowBetween}>
          <Text style={styles.muted}>₪{getOrderTotal(order)} / ₪{FREE_SHIPPING_GOAL}</Text>
          <Text style={styles.muted}>{progress}%</Text>
        </View>
        <ProgressBar progress={progress} />
        <Text style={styles.muted}>
          {remaining === 0
            ? 'Free shipping unlocked for this group.'
            : `Only ₪${remaining} left to unlock free shipping.`}
        </Text>
      </View>
    </Card>
  );
}

export function StatusRail({ status }: { status: OrderStatus }) {
  const statuses: OrderStatus[] = ['Collecting', 'Accepted', 'Packing', 'Ready', 'Shipped'];
  const currentIndex = statuses.indexOf(status);
  return (
    <View style={styles.statusRail}>
      {statuses.map((item, index) => {
        const active = index <= currentIndex;
        return (
          <View key={item} style={styles.statusItem}>
            <View style={[styles.statusDot, active && styles.statusDotActive]} />
            <Text style={[styles.statusText, active && styles.statusTextActive]}>{item}</Text>
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
    backgroundColor: '#F8F4EE',
    alignItems: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 1180,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 16,
  },
  wideShell: {
    maxWidth: 1320,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(70,55,40,0.12)',
    borderRadius: 8,
    ...shadow.card,
  },
  cardPad: {
    padding: 16,
  },
  button: {
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171412',
  },
  lightButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(23,20,18,0.14)',
  },
  accentButton: {
    backgroundColor: '#A65F3C',
  },
  dangerButton: {
    backgroundColor: '#C0392B',
  },
  disabledButton: {
    backgroundColor: '#D9D2C8',
    borderColor: '#D9D2C8',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.82,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    textAlign: 'center',
  },
  lightButtonText: {
    color: '#171412',
  },
  disabledButtonText: {
    color: '#71685D',
  },
  sectionTitle: {
    gap: 2,
  },
  kicker: {
    color: '#8B6F56',
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  h2: {
    color: '#171412',
    fontFamily: fontFamily.display,
    fontSize: 28,
  },
  h3: {
    color: '#171412',
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    marginBottom: 6,
  },
  muted: {
    color: '#6D6258',
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  brandPillText: {
    fontFamily: fontFamily.display,
    fontSize: 22,
  },
  productImage: {
    width: '100%',
    aspectRatio: 0.84,
    borderRadius: 8,
    backgroundColor: '#E9E1D8',
  },
  progressOuter: {
    height: 9,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: '#E8DED2',
  },
  progressInner: {
    height: '100%',
    borderRadius: 99,
  },
  savingsBig: {
    color: '#171412',
    fontFamily: fontFamily.bodyBold,
    fontSize: 20,
  },
  savingsBadge: {
    borderRadius: 8,
    backgroundColor: '#EDF7E8',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savingsBadgeText: {
    color: '#24683A',
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
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#EFE7DE',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B8AA9C',
  },
  statusDotActive: {
    backgroundColor: '#2D7D46',
  },
  statusText: {
    color: '#6D6258',
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
  },
  statusTextActive: {
    color: '#171412',
  },
});

export const demoStyles = styles;
