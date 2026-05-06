import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale, type Language } from '@/i18n/locale';

type IconProps = { color: string; active: boolean };
const strokeWidth = (active: boolean) => (active ? 2.2 : 1.7);

function HomeIcon({ color, active }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth(active)} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11l9-7 9 7" />
      <Path d="M5 10v10h14V10" />
      <Path d="M9 20v-6h6v6" />
    </Svg>
  );
}

function OrdersIcon({ color, active }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth(active)} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={4} width={18} height={16} rx={4} />
      <Line x1={7} y1={9} x2={17} y2={9} />
      <Line x1={7} y1={13} x2={13} y2={13} />
      <Path d="M16 13l1.5 1.5L21 11" />
    </Svg>
  );
}

function ProfileIcon({ color, active }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth(active)} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

export default function TabsLayout() {
  const { language, setLanguage, t } = useLocale();
  const mainRoutes = new Set(['building', 'orders', 'account', 'language']);

  const selectLanguage = (nextLanguage: Language) => {
    if (nextLanguage === language) return;
    void setLanguage(nextLanguage);
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tx,
        tabBarInactiveTintColor: colors.mu2,
        tabBarLabelStyle: { fontFamily: fontFamily.bodyBold, fontSize: 9 },
        tabBarItemStyle: { flex: 1, minWidth: 0, paddingTop: 3 },
        tabBarStyle: {
          borderTopColor: colors.br,
          borderTopWidth: 1,
          backgroundColor: 'rgba(247,245,240,0.98)',
          paddingTop: 6,
          paddingBottom: 8,
          height: 76,
          flexDirection: 'row',
          ...shadow.card,
        },
        tabBarHideOnKeyboard: true,
        tabBarButton: mainRoutes.has(route.name) ? undefined : () => null,
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'building') return <HomeIcon color={color} active={focused} />;
          if (route.name === 'orders') return <OrdersIcon color={color} active={focused} />;
          return <ProfileIcon color={color} active={focused} />;
        },
      })}
    >
      <Tabs.Screen name="building" options={{ title: t('tabs.home.title') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders.title') }} />
      <Tabs.Screen name="account" options={{ title: t('tabs.profile.title') }} />
      <Tabs.Screen
        name="language"
        options={{
          title: t('language.label'),
          tabBarButton: () => (
            <View style={styles.languageSlot}>
              <View style={styles.languagePill}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="עברית"
                  accessibilityState={{ selected: language === 'he' }}
                  onPress={() => selectLanguage('he')}
                  style={[styles.languageOption, language === 'he' && styles.languageOptionActive]}
                >
                  <Text style={[styles.languageText, language === 'he' && styles.languageTextActive]}>עברית</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="English"
                  accessibilityState={{ selected: language === 'en' }}
                  onPress={() => selectLanguage('en')}
                  style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}
                >
                  <Text style={[styles.languageText, language === 'en' && styles.languageTextActive]}>EN</Text>
                </Pressable>
              </View>
              <Text style={styles.languageLabel}>{t('language.label')}</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  languageSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
    paddingTop: 3,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
    padding: 1,
  },
  languageOption: {
    minWidth: 28,
    minHeight: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  languageOptionActive: {
    backgroundColor: colors.tx,
  },
  languageText: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
  },
  languageTextActive: {
    color: colors.white,
  },
  languageLabel: {
    color: colors.mu2,
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
  },
});
