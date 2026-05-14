// Shein-inspired palette: clean white, neutral grays, bold pink-red accent.
export const colors = {
  bg:        '#FFFFFF',
  s1:        '#FFFFFF',
  s2:        '#F5F5F5',
  s3:        '#EBEBEB',
  tx:        '#222222',
  mu:        '#767676',
  mu2:       '#9E9E9E',
  acc:       '#FE3F61',
  lime:      '#FFE0E6',
  limeSoft:  '#FFF0F2',
  accLight:  '#FFD6DF',
  grn:       '#FE3F61',
  err:       '#E53935',
  br:        '#E8E8E8',
  brBr:      '#D4D4D4',
  white:     '#FFFFFF',
  ink:       '#222222',
  pink:      '#FFD6DF',
  gold:      '#FE3F61',
  goldLight: '#FFD6DF',
  card:      '#FFFFFF',
  cardSoft:  '#F5F5F5',
  navy:      '#222222',
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
    shadowOpacity: 0.07,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#FE3F61',
    shadowOpacity: 0.22,
    shadowRadius:  22,
    shadowOffset:  { width: 0, height: 8 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#000000',
    shadowOpacity: 0.06,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 8 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
