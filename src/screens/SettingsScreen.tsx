import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScanner } from '../services/AppScanner';
import { useAccessibilityPermission } from '../hooks/useAccessibilityPermission';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { isServiceEnabled, openSettings } = useAccessibilityPermission();
  const [overlayAllowed, setOverlayAllowed] = useState(false);

  useEffect(() => {
    const checkOverlay = async () => {
      const allowed = await AppScanner.checkOverlayPermission();
      setOverlayAllowed(allowed);
    };
    checkOverlay();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Accessibility: {isServiceEnabled ? 'Enabled' : 'Disabled'}</Text>
        {!isServiceEnabled ? (
          <TouchableOpacity style={styles.button} onPress={openSettings}>
            <Text style={styles.buttonText}>Enable Accessibility</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Overlay: {overlayAllowed ? 'Granted' : 'Missing'}</Text>
        {!overlayAllowed ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              AppScanner.requestOverlayPermission();
            }}
          >
            <Text style={styles.buttonText}>Grant Overlay</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AppList')}>
          <Text style={styles.buttonText}>Manage Blocked Apps</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#f7f7f7',
  },
  label: {
    fontSize: 14,
    color: '#222222',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#111111',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
