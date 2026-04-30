export const colors = {
  bg: '#EEF1EE',
  s1: '#FFFFFF',
  s2: '#EEF4EE',
  s3: '#DDEBDD',
  tx: '#101814',
  mu: '#66746B',
  mu2: '#9AA89F',
  acc: '#0F7A43',
  lime: '#B7F36A',
  limeSoft: '#E8FBD2',
  accLight: '#E4F5EA',
  grn: '#0F7A43',
  err: '#E45B5B',
  br: '#DCE7DE',
  brBr: '#C4D4C8',
  white: '#FFFFFF',
  ink: '#0F0D1A',
  pink: '#F5A9C7',
  card: '#FFFFFF',
  cardSoft: '#F7FAF6',
  navy: '#062E1B',
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  xxl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const shadow = {
  card: {
    shadowColor: '#120F24',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cta: {
    shadowColor: '#120F24',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  glass: {
    shadowColor: '#120F24',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
