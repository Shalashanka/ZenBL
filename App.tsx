import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { Dashboard } from './src/screens/Dashboard';
import { AppList } from './src/screens/AppList';
import { ZenBlockScreen } from './src/screens/ZenBlockScreen';

export default function App() {
  const [showAppList, setShowAppList] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (event.url && event.url.includes('block')) {
        setIsZenMode(true);
      }
    };

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('block')) {
        setIsZenMode(true);
      }
    });

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  if (isZenMode) {
    return <ZenBlockScreen onExit={() => setIsZenMode(false)} />;
  }

  if (showAppList) {
    return <AppList onClose={() => setShowAppList(false)} />;
  }

  return (
    <Dashboard onOpenAppList={() => setShowAppList(true)} />
  );
}
