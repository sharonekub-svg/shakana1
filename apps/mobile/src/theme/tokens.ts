// App palette after login: deep navy, cocoa, taupe, and soft clay.
export const colors = {
  bg:        '#202940',
  s1:        '#2A334C',
  s2:        '#4B4038',
  s3:        '#9A8678',
  tx:        '#FFF8F2',
  mu:        '#D8C8BE',
  mu2:       '#AFA096',
  acc:       '#CAAA98',
  lime:      '#CAAA98',
  limeSoft:  '#4B4038',
  accLight:  '#5B4A40',
  grn:       '#7A2E3E',
  err:       '#C84D3A',
  br:        '#5B514A',
  brBr:      '#9A8678',
  white:     '#FFF8F2',
  ink:       '#202940',
  pink:      '#6A3340',
  gold:      '#CAAA98',
  goldLight: '#4B4038',
  card:      '#2A334C',
  cardSoft:  '#4B4038',
  navy:      '#202940',
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
    shadowOpacity: 0.24,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#CAAA98',
    shadowOpacity: 0.28,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#000000',
    shadowOpacity: 0.18,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 5 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
