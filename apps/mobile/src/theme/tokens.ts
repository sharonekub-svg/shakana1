// Designer clay palette: warm paper, cocoa ink, clay actions, and sand surfaces.
export const colors = {
  bg:        '#F4EDE3',
  s1:        '#FAF6EF',
  s2:        '#EFE6D6',
  s3:        '#E3D6BE',
  tx:        '#1E1812',
  mu:        '#6A5E50',
  mu2:       '#A89B89',
  acc:       '#C5654B',
  lime:      '#E3D6BE',
  limeSoft:  '#EFE6D6',
  accLight:  '#F1E0D6',
  grn:       '#7A2E3E',
  err:       '#C84D3A',
  br:        '#E1D5C4',
  brBr:      '#CBBBA5',
  white:     '#FAF6EF',
  ink:       '#1E1812',
  pink:      '#E8C7B7',
  gold:      '#D29A4A',
  goldLight: '#EFE6D6',
  card:      '#FAF6EF',
  cardSoft:  '#EFE6D6',
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
    shadowColor:   '#7A5B43',
    shadowOpacity: 0.08,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#9B503E',
    shadowOpacity: 0.18,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#7A5B43',
    shadowOpacity: 0.06,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 5 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
