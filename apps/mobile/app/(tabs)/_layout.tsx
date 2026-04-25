import { Tabs } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

type IconProps = { color: string; active: boolean };
const StrokeWidth = (a: boolean) => (a ? 2.2 : 1.6);

function BuildingIcon({ color, active }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={StrokeWidth(active)} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={18} height={18} rx={2.5} />
      <Path d="M3 9h18" />
      <Path d="M9 21V9" />
    </Svg>
  );
}

function OrdersIcon({ color, active }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={StrokeWidth(active)} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <Line x1={3} y1={6} x2={21} y2={6} />
      <Path d="M16 10a4 4 0 01-8 0" />
    </Svg>
  );
}

function ProfileIcon({ color, active }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={StrokeWidth(active)} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.acc,
        tabBarInactiveTintColor: colors.mu,
        tabBarLabelStyle: { fontFamily: fontFamily.body, fontSize: 10 },
        tabBarStyle: {
          borderTopColor: colors.br,
          backgroundColor: 'rgba(250,248,244,0.96)',
          paddingTop: 6,
        },
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'building') return <BuildingIcon color={color} active={focused} />;
          if (route.name === 'orders') return <OrdersIcon color={color} active={focused} />;
          return <ProfileIcon color={color} active={focused} />;
        },
      })}
    >
      <Tabs.Screen name="building" options={{ title: 'בניין' }} />
      <Tabs.Screen name="orders" options={{ title: 'הזמנות' }} />
      <Tabs.Screen name="profile" options={{ title: 'פרופיל' }} />
    </Tabs>
  );
}
