import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScanner } from '../services/AppScanner';
import { useAccessibilityPermission } from '../hooks/useAccessibilityPermission';
import { palette } from '../theme/palette';

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
    backgroundColor: palette.inkSoft,
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textPrimary,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#5b4634',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#34281f',
  },
  label: {
    fontSize: 14,
    color: palette.paper,
    marginBottom: 8,
  },
  button: {
    backgroundColor: palette.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6f543d',
  },
  buttonText: {
    color: palette.paper,
    fontWeight: '600',
    fontSize: 14,
  },
});
