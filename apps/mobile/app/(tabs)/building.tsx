import { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';
import { useUserOrders } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { useLocale } from '@/i18n/locale';

const SHOPPING_FLOWS = [
  {
    id: 'paste-link',
    name: 'Paste any link',
    note: 'Shakana detects the store from the domain automatically.',
    category: 'Fashion',
    tone: '#6B4CE6',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'auto-product',
    name: 'Auto product read',
    note: 'Looks for product name, image, price, SKU and promotions.',
    category: 'Product',
    tone: '#2F9E44',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'shared-cart',
    name: 'Shared cart',
    note: 'Friends join by link and add their own items before the timer ends.',
    category: 'Cart',
    tone: '#16112C',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
  },
];

const CATEGORY_CHIPS = [
  { name: 'Fashion', detail: 'Clothes, shoes, sizes and color choices.' },
  { name: 'Beauty', detail: 'Care products, makeup and pharmacy essentials.' },
  { name: 'Home', detail: 'Home goods, cleaning, kitchen and decor.' },
  { name: 'Kids', detail: 'Kids clothes, toys and school basics.' },
  { name: 'Electronics', detail: 'Gadgets, chargers and building tech buys.' },
  { name: 'Grocery', detail: 'Food, pantry and shared delivery orders.' },
];

function HomeMark() {
  return (
    <View style={styles.markWrap}>
      <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
        <Rect x="2" y="2" width="24" height="24" rx="12" stroke={colors.br} strokeWidth="1.5" />
        <Path d="M7.5 9.5h13" stroke={colors.acc} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M7.5 18.5h13" stroke={colors.acc} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="14" y1="5.5" x2="14" y2="22.5" stroke={colors.tx} strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="14" cy="14" r="3.2" stroke={colors.tx} strokeWidth="1.5" />
      </Svg>
    </View>
  );
}

function SearchBar({
  label,
  value,
  onChange,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.searchBar}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Circle cx="11" cy="11" r="7" stroke={colors.mu} strokeWidth="2" />
        <Line x1="16.5" y1="16.5" x2="21" y2="21" stroke={colors.mu} strokeWidth="2" strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder={label}
        placeholderTextColor={colors.mu}
        style={styles.searchInput}
        autoCapitalize="none"
        returnKeyType="search"
      />
      <View style={styles.cameraPill}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="7" width="16" height="11" rx="3" stroke={colors.navy} strokeWidth="2" />
          <Circle cx="12" cy="12.5" r="2.8" stroke={colors.navy} strokeWidth="2" />
          <Path d="M8.5 7l1.4-2h4.2l1.4 2" stroke={colors.navy} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}

function FeaturedCard({
  name,
  note,
  image,
  tone,
  onPress,
}: {
  name: string;
  note: string;
  image: string;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.featureCard, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.featureImageWrap}>
        <ImageBackground source={{ uri: image }} style={styles.featureImage} imageStyle={styles.featureImageRadius}>
          <View style={[styles.featureChip, { backgroundColor: tone }]}>
            <Text style={styles.featureChipText}>{name.slice(0, 1)}</Text>
          </View>
        </ImageBackground>
      </View>
      <View style={styles.featureBody}>
        <Text style={styles.featureName}>{name}</Text>
        <Text style={styles.featureNote}>{note}</Text>
      </View>
    </Pressable>
  );
}

function OrderCard({
  title,
  subtitle,
  status,
  meta,
  onPress,
}: {
  title: string;
  subtitle: string;
  status: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.orderCard, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={styles.orderTopRow}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>ORD</Text>
        </View>
        <View style={styles.orderStatus}>
          <Text style={styles.orderStatusText}>{status}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.orderTitle}>
        {title}
      </Text>
      <Text numberOfLines={1} style={styles.orderSubtitle}>
        {subtitle}
      </Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderMeta}>{meta}</Text>
        <Text style={styles.orderAction}>OPEN</Text>
      </View>
    </Pressable>
  );
}

export default function BuildingTab() {
  const router = useRouter();
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user?.id);
  const { data: orders = [] } = useUserOrders(user?.id);

  const first = profile?.first_name ?? '';
  const completedOrders = orders.filter((order) => order.status === 'completed').length;
  const openOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const topOrders = orders.slice(0, 3);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredFlows = normalizedSearch
    ? SHOPPING_FLOWS.filter((store) =>
        [store.name, store.note, store.category].some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : SHOPPING_FLOWS;
  const filteredOrders = normalizedSearch
    ? orders.filter((order) =>
        [order.product_title ?? '', order.product_url, order.store_label ?? ''].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        ),
      )
    : [];
  const submitSearch = () => {
    if (/^https?:\/\//i.test(search.trim())) {
      router.push(`/order/new?url=${encodeURIComponent(search.trim())}`);
      return;
    }
    const firstOrder = filteredOrders[0];
    if (firstOrder) {
      router.push(`/order/${firstOrder.id}`);
    } else if (normalizedSearch) {
      router.push(`/order/new?title=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.shell}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <HomeMark />
              <View style={{ flex: 1 }}>
                <Text style={styles.brandTag}>SHAKANA</Text>
                <Text style={styles.brandTitle}>{t('tabs.home.title')}</Text>
              </View>
            </View>
          <Pressable style={styles.topAction} onPress={() => router.push('/(tabs)/account' as never)}>
              <Text style={styles.topActionText}>{t('tabs.home.profile')}</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <ImageBackground
              source={{
                uri: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=80',
              }}
              style={styles.heroImage}
              imageStyle={styles.heroImageRadius}
            >
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <Text style={styles.heroKicker}>{t('tabs.home.promoted')}</Text>
                <Text style={styles.heroTitle}>{t('tabs.home.heroTitle')}</Text>
                <Text style={styles.heroBody}>
                  {profile ? t('tabs.home.heroSigned', { first: first ? `, ${first}` : '' }) : t('tabs.home.heroGuest')}
                </Text>
                <Pressable style={styles.heroButton} onPress={() => router.push('/order/new')}>
                  <Text style={styles.heroButtonText}>{t('tabs.home.createOrder')}</Text>
                </Pressable>
              </View>
            </ImageBackground>
          </View>

          <SearchBar
            label={t('tabs.home.searchPlaceholder')}
            value={search}
            onChange={setSearch}
            onSubmit={submitSearch}
          />

          {normalizedSearch ? (
            <View style={styles.searchResults}>
              {filteredFlows.slice(0, 3).map((store) => (
                <Pressable
                  key={store.id}
                  style={styles.searchResult}
                  onPress={() => router.push('/order/new')}
                >
                  <Text style={styles.searchResultTitle}>{store.name}</Text>
                  <Text style={styles.searchResultBody}>{store.note}</Text>
                </Pressable>
              ))}
              {filteredOrders.slice(0, 2).map((order) => (
                <Pressable key={order.id} style={styles.searchResult} onPress={() => router.push(`/order/${order.id}`)}>
                  <Text style={styles.searchResultTitle}>{order.product_title ?? 'Order'}</Text>
                  <Text style={styles.searchResultBody}>{order.store_label ?? order.product_url}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_CHIPS.map((category, index) => (
              <Pressable
                key={category.name}
                style={[styles.categoryChip, index === 0 && styles.categoryChipActive]}
                onPress={() => router.push(`/order/new?store=${encodeURIComponent(category.name.toLowerCase())}`)}
              >
                <Text style={[styles.categoryChipText, index === 0 && styles.categoryChipTextActive]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryChipDetail, index === 0 && styles.categoryChipDetailActive]}>
                  {category.detail}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Smart order flow</Text>
            <Text style={styles.sectionLink}>Any store link</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featureRow}>
            {filteredFlows.map((store) => (
              <FeaturedCard
                key={store.id}
                name={store.name}
                note={store.note}
                image={store.image}
                tone={store.tone}
                onPress={() => router.push('/order/new')}
              />
            ))}
          </ScrollView>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{String(openOrders.length)}</Text>
              <Text style={styles.statLabel}>{t('tabs.home.openOrders')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{String(completedOrders)}</Text>
              <Text style={styles.statLabel}>{t('tabs.home.completed')}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tabs.home.recent')}</Text>
            <Text style={styles.sectionLink}>{t('common.recommended')}</Text>
          </View>

          <View style={styles.ordersList}>
            {topOrders.length > 0 ? (
              topOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  title={order.product_title ?? t('tabs.home.noOrdersTitle')}
                  subtitle={order.product_url}
                  status={order.status.toUpperCase()}
                  meta={`${formatAgorot(order.product_price_agorot)} · ${order.max_participants} seats`}
                  onPress={() => router.push(`/order/${order.id}`)}
                />
              ))
            ) : (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyTitle}>{t('tabs.home.noOrdersTitle')}</Text>
                <Text style={styles.emptyBody}>{t('tabs.home.noOrdersBody')}</Text>
                <Pressable style={styles.emptyButton} onPress={() => router.push('/order/new')}>
                  <Text style={styles.emptyButtonText}>{t('common.newOrder')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 28,
  },
  shell: {
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  markWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  brandTag: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
  },
  brandTitle: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.tx,
    lineHeight: 28,
  },
  topAction: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glass,
  },
  topActionText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.tx,
  },
  heroCard: {
    borderRadius: radii.xxl,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadow.card,
  },
  heroImage: {
    minHeight: 320,
    justifyContent: 'flex-end',
  },
  heroImageRadius: {
    borderRadius: radii.xxl,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 13, 26, 0.38)',
  },
  heroContent: {
    padding: 18,
    gap: 10,
  },
  heroKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: colors.white,
  },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 36,
    color: colors.white,
    maxWidth: 260,
  },
  heroBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    maxWidth: 320,
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.navy,
  },
  searchBar: {
    minHeight: 58,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 16,
    color: colors.tx,
    paddingVertical: 0,
  },
  cameraPill: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    gap: 8,
    paddingRight: 4,
  },
  categoryChip: {
    width: 164,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.tx,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  categoryChipDetail: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.mu,
  },
  categoryChipDetailActive: {
    color: 'rgba(255,255,255,0.78)',
  },
  searchResults: {
    gap: 8,
    marginTop: -8,
  },
  searchResult: {
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
  },
  searchResultTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  searchResultBody: {
    marginTop: 3,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.tx,
  },
  sectionLink: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.acc,
  },
  featureRow: {
    gap: 12,
    paddingRight: 4,
  },
  featureCard: {
    width: 168,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    overflow: 'hidden',
    ...shadow.card,
  },
  featureImageWrap: {
    padding: 8,
  },
  featureImage: {
    height: 162,
    justifyContent: 'space-between',
    borderRadius: 22,
    overflow: 'hidden',
  },
  featureImageRadius: {
    borderRadius: 22,
  },
  featureChip: {
    alignSelf: 'flex-start',
    margin: 10,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureChipText: {
    color: colors.white,
    fontFamily: fontFamily.display,
    fontSize: 16,
    lineHeight: 18,
  },
  featureBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 4,
  },
  featureName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    color: colors.tx,
  },
  featureNote: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.grn,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.tx,
    lineHeight: 28,
  },
  statLabel: {
    marginTop: 8,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    gap: 8,
    ...shadow.card,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  orderBadgeText: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  orderStatus: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderStatusText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  orderTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    color: colors.tx,
  },
  orderSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
  },
  orderFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderMeta: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.grn,
  },
  orderAction: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.acc,
  },
  emptyBlock: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    gap: 10,
    ...shadow.card,
  },
  emptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  emptyBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.mu,
  },
  emptyButton: {
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.white,
  },
});
