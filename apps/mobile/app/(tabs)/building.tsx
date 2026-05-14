import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useState } from 'react';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';
import { useUserOrders } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { formatCompactDuration } from '@/utils/timer';
import { useLocale } from '@/i18n/locale';

const SHOPPING_FLOWS = [
  {
    id: 'paste-link',
    enName: 'Paste any link',
    heName: 'הדבק כל קישור',
    enNote: 'Shakana detects the store from the domain automatically.',
    heNote: 'Shakana מזהה את החנות אוטומטית לפי הדומיין.',
    enCategory: 'Fashion',
    heCategory: 'אופנה',
    tone: '#6B4CE6',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'auto-product',
    enName: 'Auto product read',
    heName: 'קריאת מוצר אוטומטית',
    enNote: 'Looks for product name, image, price, SKU and promotions.',
    heNote: 'מחפש שם מוצר, תמונה, מחיר, SKU ומבצעים.',
    enCategory: 'Product',
    heCategory: 'מוצר',
    tone: '#2F9E44',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'shared-cart',
    enName: 'Shared cart',
    heName: 'סל משותף',
    enNote: 'Friends join by link and add their own items before the timer ends.',
    heNote: 'חברים מצטרפים בקישור ומוסיפים פריטים לפני שהטיימר מסתיים.',
    enCategory: 'Cart',
    heCategory: 'סל',
    tone: '#16112C',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
  },
];

const CATEGORY_CHIPS = [
  { enName: 'Fashion', heName: 'אופנה', enDetail: 'Clothes, shoes, sizes and color choices.', heDetail: 'בגדים, נעליים, מידות וצבעים.' },
  { enName: 'Beauty', heName: 'טיפוח', enDetail: 'Care products, makeup and pharmacy essentials.', heDetail: 'טיפוח, איפור ומוצרי פארם.' },
  { enName: 'Home', heName: 'בית', enDetail: 'Home goods, cleaning, kitchen and decor.', heDetail: 'בית, ניקיון, מטבח ועיצוב.' },
  { enName: 'Kids', heName: 'ילדים', enDetail: 'Kids clothes, toys and school basics.', heDetail: 'בגדי ילדים, צעצועים וציוד לימודים.' },
  { enName: 'Electronics', heName: 'אלקטרוניקה', enDetail: 'Gadgets, chargers and building tech buys.', heDetail: 'גאדג׳טים, מטענים וקניות טכנולוגיה.' },
  { enName: 'Grocery', heName: 'סופר', enDetail: 'Food, pantry and shared delivery orders.', heDetail: 'אוכל, מזווה והזמנות משלוח משותפות.' },
];

function HomeMark() {
  return (
    <View style={styles.markWrap}>
      <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
        <Rect x="2" y="2" width="24" height="24" rx="12" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        <Path d="M7.5 9.5h13" stroke={colors.white} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M7.5 18.5h13" stroke={colors.white} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="14" y1="5.5" x2="14" y2="22.5" stroke={colors.white} strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="14" cy="14" r="3.2" stroke={colors.white} strokeWidth="1.5" />
      </Svg>
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

const AVATAR_COLORS = ['#C5654B', '#D29A4A', '#E3D6BE', '#7A5B43', '#B8956A'];

function OrderCard({
  title,
  subtitle,
  status,
  meta,
  storeInitial,
  participantCount,
  onPress,
}: {
  title: string;
  subtitle: string;
  status: string;
  meta: string;
  storeInitial: string;
  participantCount: number;
  onPress: () => void;
}) {
  const avatars = Array.from({ length: Math.min(participantCount, 4) }, (_, i) => i);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.orderCard, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={styles.orderTopRow}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>{storeInitial}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={styles.orderTitle}>{title}</Text>
            {status === 'OPEN' || status === 'JOINED' ? (
              <View style={styles.orderStatus}>
                <Text style={styles.orderStatusText}>{status}</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.orderSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.orderFooter}>
        <View style={styles.orderAvatarRow}>
          {avatars.map((i) => (
            <View key={i} style={[styles.orderAvatar, { marginLeft: i ? -6 : 0, backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
              <Text style={styles.orderAvatarText}>{i + 1}</Text>
            </View>
          ))}
          {participantCount > 4 ? <Text style={styles.orderAvatarMore}>+{participantCount - 4}</Text> : null}
        </View>
        <View style={styles.orderTimer}>
          <Text style={styles.orderMeta}>{meta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function BuildingTab() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState(0);
  const { language, setLanguage, t } = useLocale();
  const isHebrew = language === 'he';
  const homeCopy = isHebrew
    ? {
        smartFlow: 'זרימת הזמנה חכמה',
        anyStore: 'קישור מכל חנות',
        order: 'הזמנה',
        seats: 'מקומות',
      }
    : {
        smartFlow: 'Smart order flow',
        anyStore: 'Any store link',
        order: 'Order',
        seats: 'seats',
      };
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user?.id);
  const { data: orders = [] } = useUserOrders(user?.id);

  const first = profile?.first_name ?? '';
  const completedOrders = orders.filter((order) => order.status === 'completed').length;
  const openOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const topOrders = orders.slice(0, 3);
  const orderMeta = (order: (typeof orders)[number]) => {
    const timing = order.closes_at
      ? `${isHebrew ? 'נסגר בעוד' : 'closes in'} ${formatCompactDuration(Math.max(0, new Date(order.closes_at).getTime() - Date.now()))}`
      : isHebrew ? 'ללא טיימר' : 'No timer';
    return `${formatAgorot(order.product_price_agorot)} · ${timing}`;
  };
  const dashboardStats = [
    { value: String(openOrders.length), label: t('tabs.home.openOrders'), featured: true },
    { value: String(completedOrders), label: t('tabs.home.completed') },
    { value: String(topOrders.length), label: isHebrew ? 'הזמנות מוכנות' : 'Ready orders' },
    { value: '1', label: isHebrew ? 'שיתוף עובד' : 'Share flow' },
  ];
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
          <View style={styles.topRight}>
            <View style={styles.langPill}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void setLanguage('he')}
                style={[styles.langOpt, language === 'he' && styles.langOptActive]}
              >
                <Text style={[styles.langOptText, language === 'he' && styles.langOptTextActive]}>עברית</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void setLanguage('en')}
                style={[styles.langOpt, language === 'en' && styles.langOptActive]}
              >
                <Text style={[styles.langOptText, language === 'en' && styles.langOptTextActive]}>EN</Text>
              </Pressable>
            </View>
            <Pressable style={styles.topAction} onPress={() => router.push('/(tabs)/account' as never)}>
              <Text style={styles.topActionText}>{t('tabs.home.profile')}</Text>
            </Pressable>
          </View>
          </View>

          {/* Dark savings hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroMeta}>
              <Text style={styles.heroKicker}>
                {completedOrders > 0
                  ? (isHebrew ? 'אתה + שכניך חסכתם' : 'You + your neighbors saved')
                  : (isHebrew ? 'קנה ביחד · חסוך בשליח' : 'Buy together · split shipping')}
              </Text>
            </View>
            <View style={styles.heroAmountRow}>
              {completedOrders > 0 ? (
                <>
                  <Text style={styles.heroAmount}>₪{Math.round(completedOrders * 42).toLocaleString()}</Text>
                  <Text style={styles.heroAmountSub}>{isHebrew ? 'השנה' : 'this year'}</Text>
                </>
              ) : (
                <Text style={styles.heroAmount}>{isHebrew ? 'הזמן ראשון' : 'First order'}</Text>
              )}
            </View>
            <View style={styles.heroFooter}>
              <View style={styles.heroAvatarRow}>
                {['AL','YE','NO'].map((initials, i) => (
                  <View key={initials} style={[styles.heroAvatar, { marginLeft: i ? -8 : 0, backgroundColor: ['#D29A4A','#E3D6BE','#C5654B'][i] }]}>
                    <Text style={styles.heroAvatarText}>{initials}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.heroNeighbors}>
                {completedOrders > 0
                  ? `${openOrders.length} ${isHebrew ? 'שכנים פעילים' : 'active neighbors'}`
                  : (isHebrew ? 'בחר חנות · קבע טיימר · שתף' : 'pick store · set timer · share')}
              </Text>
              <Pressable style={styles.heroButton} onPress={() => router.push('/order/new')}>
                <Text style={styles.heroButtonText}>{t('tabs.home.createOrder')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            {dashboardStats.map((stat) => (
              <View key={stat.label} style={[styles.statCard, stat.featured && styles.statCardFeatured]}>
                <Text style={[styles.statValue, stat.featured && styles.statValueFeatured]}>{stat.value}</Text>
                <Text style={[styles.statLabel, stat.featured && styles.statLabelFeatured]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_CHIPS.map((category, index) => (
              <Pressable
                key={category.enName}
                style={[styles.categoryChip, index === selectedCat && styles.categoryChipActive]}
                onPress={() => {
                  setSelectedCat(index);
                  router.push(`/order/new?store=${encodeURIComponent(category.enName.toLowerCase())}`);
                }}
              >
                <Text style={[styles.categoryChipText, index === selectedCat && styles.categoryChipTextActive]}>
                  {isHebrew ? category.heName : category.enName}
                </Text>
                <Text style={[styles.categoryChipDetail, index === selectedCat && styles.categoryChipDetailActive]}>
                  {isHebrew ? category.heDetail : category.enDetail}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{homeCopy.smartFlow}</Text>
            <Text style={styles.sectionLink}>{homeCopy.anyStore}</Text>
          </View>

          <View style={styles.featureGrid}>
            {SHOPPING_FLOWS.map((store) => (
              <FeaturedCard
                key={store.id}
                name={isHebrew ? store.heName : store.enName}
                note={isHebrew ? store.heNote : store.enNote}
                image={store.image}
                tone={store.tone}
                onPress={() => router.push('/order/new')}
              />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tabs.home.recent')}</Text>
            <Text style={styles.sectionLink}>{t('common.recommended')}</Text>
          </View>

          {openOrders.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isHebrew ? 'פעיל בבניין שלך' : 'ACTIVE IN YOUR BUILDING'}</Text>
              <Text style={styles.sectionLink}>{openOrders.length} {isHebrew ? 'פתוח' : 'open'}</Text>
            </View>
          ) : null}

          <View style={styles.ordersList}>
            {topOrders.length > 0 ? (
              topOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  title={order.store_label ?? order.product_title ?? t('tabs.home.noOrdersTitle')}
                  subtitle={order.product_title ?? order.product_url}
                  status={order.status === 'open' ? (isHebrew ? 'פתוחה' : 'JOINED') : order.status.toUpperCase()}
                  meta={orderMeta(order)}
                  storeInitial={(order.store_label ?? order.product_title ?? 'ORD').slice(0, 1).toUpperCase()}
                  participantCount={order.max_participants}
                  onPress={() => router.push(`/order/${order.id}`)}
                />
              ))
            ) : (
              <Pressable style={styles.emptyBlock} onPress={() => router.push('/order/new')}>
                <Text style={styles.emptyTitle}>{isHebrew ? 'אין הזמנות עדיין' : 'No orders yet'}</Text>
                <Text style={styles.emptyBody}>
                  {isHebrew
                    ? 'צור הזמנה קבוצתית ראשונה — שלח קישור לשכנים ויחד תחסכו בדמי שליח.'
                    : 'Start your first group order — share the link with neighbors and split shipping costs together.'}
                </Text>
                <View style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>{isHebrew ? '+ הזמנה חדשה' : '+ New order'}</Text>
                </View>
              </Pressable>
            )}
          </View>

          <Pressable style={({ pressed }) => [styles.newOrderCta, pressed && { opacity: 0.88 }]} onPress={() => router.push('/order/new')}>
            <View style={styles.newOrderCtaLeft}>
              <Text style={styles.newOrderCtaPlus}>+</Text>
              <View>
                <Text style={styles.newOrderCtaTitle}>{isHebrew ? 'התחל הזמנה חדשה' : 'Start a new order'}</Text>
                <Text style={styles.newOrderCtaSub}>{isHebrew ? 'בחר חנות · קבע טיימר · הזמן שכנים' : 'Pick a store · set a timer · invite your stairwell'}</Text>
              </View>
            </View>
            <Text style={styles.newOrderCtaArrow}>→</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 96,
  },
  shell: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
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
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.acc,
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
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
    padding: 2,
    ...shadow.glass,
  },
  langOpt: {
    minWidth: 32,
    minHeight: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  langOptActive: { backgroundColor: colors.tx },
  langOptText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 10 },
  langOptTextActive: { color: colors.white },
  topAction: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
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
    backgroundColor: colors.ink,
    padding: 22,
    gap: 8,
    position: 'relative',
    ...shadow.cta,
  },
  heroMeta: {
    marginBottom: 2,
  },
  heroKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  heroAmount: {
    fontFamily: fontFamily.display,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    color: colors.white,
    fontStyle: 'italic',
  },
  heroAmountSub: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  heroAvatarRow: {
    flexDirection: 'row',
  },
  heroAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  heroAvatarText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 7,
    color: colors.ink,
  },
  heroNeighbors: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  heroButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.white,
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
    backgroundColor: colors.s1,
  },
  categoryChipActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  categoryChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.tx,
  },
  categoryChipTextActive: {
    color: colors.navy,
  },
  categoryChipDetail: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.mu,
  },
  categoryChipDetailActive: {
    color: colors.tx,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
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
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: '100%',
  },
  featureCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 280,
    minWidth: 0,
    borderRadius: 26,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    overflow: 'hidden',
    ...shadow.card,
  },
  featureImageWrap: {
    padding: 8,
  },
  featureImage: {
    height: 164,
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
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 150,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  statCardFeatured: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
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
  statValueFeatured: {
    color: colors.navy,
  },
  statLabelFeatured: {
    color: colors.acc,
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    gap: 8,
    ...shadow.card,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    flexShrink: 0,
  },
  orderBadgeText: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderStatusText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  orderTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.tx,
  },
  orderSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
  },
  orderFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  orderAvatarText: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
  },
  orderAvatarMore: {
    marginLeft: 4,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.mu,
  },
  orderTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderMeta: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.acc,
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
    backgroundColor: colors.s1,
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
  newOrderCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.acc,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    ...shadow.cta,
  },
  newOrderCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  newOrderCtaPlus: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    color: colors.white,
    lineHeight: 36,
  },
  newOrderCtaTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.white,
    fontStyle: 'italic',
  },
  newOrderCtaSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 17,
  },
  newOrderCtaArrow: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 20,
    color: colors.white,
  },
});
