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
  lightColors: {
    background: '#F4F1EA',
    surface: '#FFFFFF',
    accent: '#E67A4F',
    accentLight: '#F1A281',
    text: '#1F2329',
    mutedText: '#64707D',
    border: 'rgba(20,24,29,0.10)',
    success: '#2F9A74',
    danger: '#C44949',
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
  zenLightColors: {
    background: '#EAF4ED',
    surface: '#F9FFFC',
    accent: '#2D6A4F',
    accentLight: '#4B9473',
    text: '#173126',
    mutedText: '#567063',
    border: 'rgba(20,24,29,0.10)',
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

export const getThemeColors = (isZenActive: boolean, mode: 'dark' | 'light' = 'dark') => {
  if (mode === 'light') {
    return isZenActive ? Theme.zenLightColors : Theme.lightColors;
  }
  return isZenActive ? Theme.zenColors : Theme.colors;
};
