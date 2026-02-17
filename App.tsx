import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
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
  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}
