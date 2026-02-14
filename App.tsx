import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Linking } from 'react-native';
import { Dashboard } from './src/screens/Dashboard';
import { AppList } from './src/screens/AppList';
import { ZenBlockScreen } from './src/screens/ZenBlockScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { GlobalZenOverlay } from './src/components/GlobalZenOverlay';

type Screen = 'dashboard' | 'appList' | 'schedules';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (event.url && event.url.includes('block')) {
        setIsZenMode(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url && url.includes('block')) {
        setIsZenMode(true);
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  if (isZenMode) {
    return <ZenBlockScreen onExit={() => setIsZenMode(false)} />;
  }

  const renderScreen = () => {
    if (currentScreen === 'appList') {
      return <AppList onClose={() => setCurrentScreen('dashboard')} />;
    }
    if (currentScreen === 'schedules') {
      return <ScheduleScreen onClose={() => setCurrentScreen('dashboard')} />;
    }
    return (
      <Dashboard
        onOpenAppList={() => setCurrentScreen('appList')}
        onOpenSchedules={() => setCurrentScreen('schedules')}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      <GlobalZenOverlay />
    </View>
  );
}
