export const colors = {
  bg: '#faf8f4',
  s1: '#f2ede5',
  s2: '#e8e1d6',
  s3: '#ddd7cc',
  tx: '#1e1c18',
  mu: 'rgba(30,28,24,0.45)',
  mu2: 'rgba(30,28,24,0.12)',
  acc: '#c96a3b',
  accLight: '#f5e8de',
  grn: '#4a7c59',
  err: '#c0392b',
  br: 'rgba(30,28,24,0.08)',
  brBr: 'rgba(30,28,24,0.14)',
  white: '#ffffff',
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 22,
  xxl: 26,
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
    shadowColor: '#1e1c18',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cta: {
    shadowColor: '#c96a3b',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export type Colors = typeof colors;
