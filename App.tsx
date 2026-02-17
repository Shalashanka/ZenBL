import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useFonts, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AppNavigator } from './src/navigation/TabNavigator';
import { Theme } from './src/theme/Theme';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Theme.colors.background,
    card: Theme.colors.surface,
    text: Theme.colors.text,
    border: Theme.colors.border,
    primary: Theme.colors.accent,
  },
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
    <NavigationContainer theme={navTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}
