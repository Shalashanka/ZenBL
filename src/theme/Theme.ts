export const Theme = {
  colors: {
    background: '#26262A',
    surface: '#323236',
    accent: '#FF7043',
    accentLight: '#FF9A76',
    text: '#FFFFFF',
    mutedText: '#9CA3AF',
    border: 'rgba(255,255,255,0.10)',
    success: '#34D399',
    danger: '#F87171',
  },
  zenColors: {
    background: '#1F2A22',
    surface: '#2A3A2F',
    accent: '#2D6A4F',
    accentLight: '#5AAE86',
    text: '#F4FFF8',
    mutedText: '#A7C4B6',
    border: 'rgba(255,255,255,0.12)',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  type: {
    h1: 32,
    h2: 18,
    body: 14,
    caption: 12,
  },
};

export const getThemeColors = (isZenActive: boolean) => (isZenActive ? Theme.zenColors : Theme.colors);
