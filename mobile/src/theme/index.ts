export const Colors = {
  canvas: '#F7F6F3',
  surface: '#FFFFFF',
  border: '#EAEAEA',
  textPrimary: '#111111',
  textMuted: '#787774',
  ctaBg: '#111111',
  ctaText: '#FFFFFF',
  badge: {
    green: { bg: '#EDF3EC', text: '#346538' },
    red: { bg: '#FDEBEC', text: '#9F2F2D' },
    yellow: { bg: '#FBF3DB', text: '#956400' },
    blue: { bg: '#E1F3FE', text: '#1F6C9F' },
  },
} as const;

export const Typography = {
  title: { fontSize: 24, fontWeight: '600' as const, color: Colors.textPrimary },
  heading: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400' as const, color: Colors.textPrimary },
  secondary: { fontSize: 13, fontWeight: '400' as const, color: Colors.textMuted },
  label: { fontSize: 12, fontWeight: '500' as const, color: Colors.textMuted },
} as const;

export const Radius = {
  sm: 4,
  md: 6,
  lg: 12,
  pill: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
