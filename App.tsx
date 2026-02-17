import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useFonts, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AppNavigator } from './src/navigation/TabNavigator';
import { AppPreferencesProvider, useAppPreferences } from './src/preferences/AppPreferencesContext';
import { getThemeColors } from './src/theme/Theme';

const AppShell = () => {
  const { themeMode } = useAppPreferences();
  const colors = getThemeColors(false, themeMode);

  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    }),
    [colors.accent, colors.background, colors.border, colors.surface, colors.text],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    PlaywriteCUGuides_400Regular: require('./assets/fonts/PlaywriteCUGuides-Regular.ttf'),
    SNPro_Regular: require('./assets/fonts/SNPro-Regular.ttf'),
    SNPro_Bold: require('./assets/fonts/SNPro-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <AppPreferencesProvider>
      <AppShell />
    </AppPreferencesProvider>
  );
}
