// Wispr Flow — warm cream, sage green, editorial warmth
export const colors = {
  bg:        '#F7F5F0', // warm cream background
  s1:        '#FFFFFF',
  s2:        '#F2EFE9', // warm surface tint
  s3:        '#EBE7E0', // warm mid-tone
  tx:        '#1C1917', // warm near-black
  mu:        '#78716C', // warm muted
  mu2:       '#A8A29E', // warm muted 2
  acc:       '#3D6B4F', // sage green (calm vitality)
  lime:      '#D4E8C2', // soft sage highlight (replaces neon lime)
  limeSoft:  '#EDF4EF', // very light sage
  accLight:  '#EDF4EF', // warm green tint
  grn:       '#3D6B4F', // same as acc
  err:       '#DC2626', // warm red
  br:        '#E8E2DA', // warm border
  brBr:      '#D4CEC6', // warm border strong
  white:     '#FFFFFF',
  ink:       '#1C1917', // warm near-black
  pink:      '#F5A9C7',
  card:      '#FFFFFF',
  cardSoft:  '#F2EFE9', // warm surface tint
  navy:      '#1C1917', // primary dark (warm charcoal, not cold navy)
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
    shadowColor:   '#1C1917',
    shadowOpacity: 0.07,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 4 },
    elevation: 3,
  },
  cta: {
    shadowColor:   '#1C1917',
    shadowOpacity: 0.10,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 6 },
    elevation: 4,
  },
  glass: {
    shadowColor:   '#1C1917',
    shadowOpacity: 0.05,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

export type Colors = typeof colors;
