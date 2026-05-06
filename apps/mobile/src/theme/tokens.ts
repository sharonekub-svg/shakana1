// Claude-inspired: warm ivory, clay, cocoa ink, and soft paper surfaces.
export const colors = {
  bg:        '#F7F1E8',
  s1:        '#FFFCF7',
  s2:        '#F1E7DA',
  s3:        '#E4D5C4',
  tx:        '#2B2118',
  mu:        '#6F6257',
  mu2:       '#A19183',
  acc:       '#B35C37',
  lime:      '#E9D3BF',
  limeSoft:  '#F3E6D8',
  accLight:  '#F6E4D6',
  grn:       '#7A5B43',
  err:       '#C84D3A',
  br:        '#E3D5C6',
  brBr:      '#CDBBA9',
  white:     '#FFFCF7',
  ink:       '#2B2118',
  pink:      '#E8C7B7',
  gold:      '#C96442',
  goldLight: '#F5E4D6',
  card:      '#FFFCF7',
  cardSoft:  '#F1E7DA',
  navy:      '#2B2118',
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
    shadowColor:   '#2B2118',
    shadowOpacity: 0.055,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 6 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#7A3F29',
    shadowOpacity: 0.14,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 8 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#2B2118',
    shadowOpacity: 0.045,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
