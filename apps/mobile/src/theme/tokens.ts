// Login-aligned clay palette: cocoa app background, warm paper text, clay actions, and layered dark surfaces.
export const colors = {
  bg:        '#1B1612',
  s1:        '#241D18',
  s2:        '#30261F',
  s3:        '#4A382D',
  tx:        '#FAF6EF',
  mu:        '#CBBEAD',
  mu2:       '#8C7E70',
  acc:       '#C5654B',
  lime:      '#D29A4A',
  limeSoft:  '#3A2D24',
  accLight:  '#3B241D',
  grn:       '#7A2E3E',
  err:       '#C84D3A',
  br:        '#3B3028',
  brBr:      '#554438',
  white:     '#FAF6EF',
  ink:       '#1E1812',
  pink:      '#6A3340',
  gold:      '#D29A4A',
  goldLight: '#3A2D24',
  card:      '#241D18',
  cardSoft:  '#30261F',
  navy:      '#1E1812',
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
    shadowColor:   '#C5654B',
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
