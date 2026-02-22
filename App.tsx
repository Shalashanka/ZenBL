import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { log } from './src/utils/logger';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  useEffect(() => {
    log.info('Zentox App Started Successfully.');
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {activeTab === 'dashboard' && <HomeScreen />}
        {activeTab !== 'dashboard' && (
          <View style={{ flex: 1, backgroundColor: '#F2F2F7' }} />
        )}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});

