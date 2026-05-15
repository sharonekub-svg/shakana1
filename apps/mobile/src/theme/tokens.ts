// Black-and-white base with tiny hot-pink accent for kickers and badges only.
export const colors = {
  bg:        '#FFFFFF',
  s1:        '#FFFFFF',
  s2:        '#F5F5F5',
  s3:        '#EBEBEB',
  tx:        '#000000',
  mu:        '#767676',
  mu2:       '#9E9E9E',
  acc:       '#000000',
  hot:       '#FF2D55',
  hotSoft:   '#FFF0F3',
  lime:      '#F0F0F0',
  limeSoft:  '#F5F5F5',
  accLight:  '#F0F0F0',
  grn:       '#000000',
  err:       '#E53935',
  br:        '#E8E8E8',
  brBr:      '#D4D4D4',
  white:     '#FFFFFF',
  ink:       '#000000',
  pink:      '#FF2D55',
  gold:      '#000000',
  goldLight: '#F0F0F0',
  card:      '#FFFFFF',
  cardSoft:  '#F5F5F5',
  navy:      '#000000',
} as const;

export const radii = {
  sm:  12,
  md:  16,
  lg:  20,
  xl:  24,
  xxl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

export const shadow = {
  card: {
    shadowColor:   '#000000',
    shadowOpacity: 0.06,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 6 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#000000',
    shadowOpacity: 0.14,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 6 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#000000',
    shadowOpacity: 0.05,
    shadowRadius:  14,
    shadowOffset:  { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
