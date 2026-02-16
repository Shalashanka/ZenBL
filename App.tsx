import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <RootNavigator />
      </View>
    </NavigationContainer>
  );
}
