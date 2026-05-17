// Mobile-app palette: soft grey canvas, white cards, black actions, lime accent.
export const colors = {
  bg:        '#F2F3F2',
  s1:        '#FFFFFF',
  s2:        '#E9ECEA',
  s3:        '#DADFDA',
  tx:        '#151515',
  mu:        '#6C706C',
  mu2:       '#9A9F9A',
  acc:       '#C8F25F',
  hot:       '#C8F25F',
  hotSoft:   '#EFF8D9',
  lime:      '#C8F25F',
  limeSoft:  '#EFF8D9',
  accLight:  '#E8F6C8',
  grn:       '#6E8F34',
  err:       '#B65348',
  br:        '#E1E5E1',
  brBr:      '#D0D6D0',
  white:     '#FFFFFF',
  ink:       '#151515',
  pink:      '#E7D8D0',
  gold:      '#C8F25F',
  goldLight: '#EFF8D9',
  card:      '#FFFFFF',
  cardSoft:  '#E9ECEA',
  navy:      '#151515',
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
    shadowColor:   '#151515',
    shadowOpacity: 0.06,
    shadowRadius:  28,
    shadowOffset:  { width: 0, height: 14 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#151515',
    shadowOpacity: 0.12,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#151515',
    shadowOpacity: 0.05,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 8 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
