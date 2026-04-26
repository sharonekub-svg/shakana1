export const colors = {
  bg: '#F4F0E8',
  s1: '#E7DED1',
  s2: '#D5C9B7',
  s3: '#C3B39D',
  tx: '#171411',
  mu: '#665C51',
  mu2: '#B3A896',
  acc: '#A14E22',
  accLight: '#E6D1BE',
  grn: '#3F5C48',
  err: '#8B2E24',
  br: '#C9BCA9',
  brBr: '#9D8F7B',
  white: '#ffffff',
} as const;

export const radii = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  xxl: 0,
  pill: 0,
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
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cta: {
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
} as const;

export type Colors = typeof colors;
