import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { fontFamily } from '@/theme/fonts';

const CLAY = '#000000';
const LEAF = '#3F5F54';
const FIELD_GREEN = '#000000';
const FIELD_ORANGE = '#CAAA98';

export function PlantMark({ size = 44, grainColor = CLAY, leafColor = LEAF }: { size?: number; grainColor?: string; leafColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      {/* Stalk */}
      <Path d="M22 40 L22 14" stroke={grainColor} strokeWidth="2" strokeLinecap="round" />
      {/* Main grain head */}
      <Ellipse cx="22" cy="9.5" rx="3.5" ry="5.5" fill={grainColor} />
      {/* Side grains */}
      <Ellipse cx="17.5" cy="14.5" rx="2.4" ry="4" fill={grainColor} transform="rotate(-22 17.5 14.5)" />
      <Ellipse cx="26.5" cy="14.5" rx="2.4" ry="4" fill={grainColor} transform="rotate(22 26.5 14.5)" />
      <Ellipse cx="15.5" cy="20" rx="2.1" ry="3.5" fill={grainColor} transform="rotate(-28 15.5 20)" />
      <Ellipse cx="28.5" cy="20" rx="2.1" ry="3.5" fill={grainColor} transform="rotate(28 28.5 20)" />
      {/* Left leaf */}
      <Path d="M22 28 C20 24 11 22 9.5 26 C8 30 20 30 22 28 Z" fill={leafColor} />
      {/* Right leaf */}
      <Path d="M22 28 C24 24 33 22 34.5 26 C36 30 24 30 22 28 Z" fill={leafColor} />
    </Svg>
  );
}

export function RollingFields({ width = 320, height = 90 }: { width?: number; height?: number }) {
  const w = width;
  const h = height;
  const mid = w / 2;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      {/* Green hill */}
      <Path
        d={`M0 ${h} L0 ${h * 0.45} C${w * 0.1} ${h * 0.06} ${w * 0.36} 0 ${mid} ${h * 0.22} L${mid} ${h} Z`}
        fill={FIELD_GREEN}
      />
      {[1, 2, 3, 4, 5].map((i) => {
        const t = i / 7;
        return (
          <Path
            key={i}
            d={`M0 ${h * (0.45 + t * 0.45)} C${w * 0.1} ${h * (0.06 + t * 0.45)} ${w * 0.36} ${h * t * 0.45} ${mid} ${h * (0.22 + t * 0.45)}`}
            stroke="rgba(250,246,239,0.22)"
            strokeWidth="1.4"
            fill="none"
          />
        );
      })}
      {/* Orange hill */}
      <Path
        d={`M${w} ${h} L${w} ${h * 0.45} C${w * 0.9} ${h * 0.06} ${w * 0.64} 0 ${mid} ${h * 0.22} L${mid} ${h} Z`}
        fill={FIELD_ORANGE}
      />
      {[1, 2, 3, 4, 5].map((i) => {
        const t = i / 7;
        return (
          <Path
            key={i}
            d={`M${w} ${h * (0.45 + t * 0.45)} C${w * 0.9} ${h * (0.06 + t * 0.45)} ${w * 0.64} ${h * t * 0.45} ${mid} ${h * (0.22 + t * 0.45)}`}
            stroke="rgba(250,246,239,0.22)"
            strokeWidth="1.4"
            fill="none"
          />
        );
      })}
    </Svg>
  );
}

// Full logo: plant mark + SHAKANA text + rolling fields
export function ShakanaLogoHero({ width = 300 }: { width?: number }) {
  return (
    <View style={[s.hero, { width }]}>
      <PlantMark size={56} />
      <Text style={s.heroText}>SHAKANA</Text>
      <View style={s.fields}>
        <RollingFields width={width} height={88} />
      </View>
    </View>
  );
}

// Compact: plant mark + "shakana" text side by side (for headers)
export function ShakanaLogoCompact({ light = false, size = 28 }: { light?: boolean; size?: number }) {
  const textColor = light ? '#FAF6EF' : CLAY;
  const leafColor = light ? '#7DBF7E' : LEAF;
  return (
    <View style={s.compact}>
      <PlantMark size={size} grainColor={light ? '#FAF6EF' : CLAY} leafColor={leafColor} />
      <Text style={[s.compactText, { color: textColor, fontSize: size * 0.75 }]}>shakana</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  heroText: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    color: CLAY,
    letterSpacing: 2,
    lineHeight: 58,
  },
  fields: {
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: 24,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactText: {
    fontFamily: fontFamily.display,
    letterSpacing: 0.5,
  },
});
