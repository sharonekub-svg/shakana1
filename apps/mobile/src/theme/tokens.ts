export const colors = {
  bg: '#FAF8FC',
  s1: '#FFFFFF',
  s2: '#F4F0F8',
  s3: '#EDE7F4',
  tx: '#141225',
  mu: '#6F6A7D',
  mu2: '#A79FB7',
  acc: '#6B4CE6',
  accLight: '#EEE7FF',
  grn: '#2E8B57',
  err: '#E45B5B',
  br: '#E3DDEE',
  brBr: '#CFC6DE',
  white: '#FFFFFF',
  ink: '#0F0D1A',
  pink: '#F5A9C7',
  card: '#FFFFFF',
  cardSoft: '#F7F4FA',
  navy: '#16112C',
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
