// Wispr Flow — warm cream, sage green, editorial warmth
export const colors = {
  bg:        '#F8F7F2', // Wispr Flow style warm cream
  s1:        '#FFFFFF',
  s2:        '#F1EEE8', // warm surface tint
  s3:        '#E8E3DA', // warm mid-tone
  tx:        '#111111', // Wispr ink
  mu:        '#68635D', // warm muted
  mu2:       '#9B958C', // warm muted 2
  acc:       '#0B6B3A', // Wispr green action
  lime:      '#DDF8B7', // soft lime highlight
  limeSoft:  '#EEF7E6', // very light sage
  accLight:  '#EAF4E7', // warm green tint
  grn:       '#0B6B3A', // same as acc
  err:       '#E35D5B', // warm red
  br:        '#E6E0D7', // warm border
  brBr:      '#D6CEC2', // warm border strong
  white:     '#FFFFFF',
  ink:       '#111111', // Wispr ink
  pink:      '#E5C1FF',
  gold:      '#C9A84C',
  goldLight: '#FBF4E0',
  card:      '#FFFFFF',
  cardSoft:  '#F1EEE8', // warm surface tint
  navy:      '#111111', // primary dark ink
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
    shadowColor:   '#111111',
    shadowOpacity: 0.045,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 6 },
    elevation: 2,
  },
  cta: {
    shadowColor:   '#111111',
    shadowOpacity: 0.08,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 8 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#111111',
    shadowOpacity: 0.035,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
