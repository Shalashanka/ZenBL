import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppScanner } from '../services/AppScanner';
import { useAccessibilityPermission } from '../hooks/useAccessibilityPermission';
import { Theme, getThemeColors } from '../theme/Theme';
import { useZenoxStatus } from '../hooks/useZenoxStatus';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { isServiceEnabled, openSettings } = useAccessibilityPermission();
  const status = useZenoxStatus();
  const colors = getThemeColors(status.isActive);

  const [overlayAllowed, setOverlayAllowed] = useState(false);
  const [emergencyExit, setEmergencyExit] = useState(true);
  const [enterKey, setEnterKey] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setEnterKey((prev) => prev + 1);
      return () => undefined;
    }, [])
  );

  useEffect(() => {
    const checkOverlay = async () => {
      const allowed = await AppScanner.checkOverlayPermission();
      setOverlayAllowed(allowed);
    };
    checkOverlay();
  }, []);

  const onToggleEmergency = (value: boolean) => {
    setEmergencyExit(value);
    Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: colors.text }]}>Command Center</Text>

      <Animated.View
        key={`group1-${enterKey}`}
        entering={FadeInDown.duration(600)}
        style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AppList')}>
          <Text style={[styles.rowText, { color: colors.text }]}>Manage Apps</Text>
          <Text style={[styles.rowHint, { color: colors.accent }]}>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Schedule')}>
          <Text style={[styles.rowText, { color: colors.text }]}>Edit Schedules</Text>
          <Text style={[styles.rowHint, { color: colors.accent }]}>Open</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        key={`group2-${enterKey}`}
        entering={FadeInDown.duration(600).delay(90)}
        style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.row}>
          <View>
            <Text style={[styles.rowText, { color: colors.text }]}>Emergency Exit</Text>
            <Text style={[styles.subText, { color: colors.mutedText }]}>Allow ending sessions early</Text>
          </View>
          <Switch
            value={emergencyExit}
            onValueChange={onToggleEmergency}
            trackColor={{ false: '#4B5563', true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Animated.View>

      <Animated.View
        key={`group3-${enterKey}`}
        entering={FadeInDown.duration(600).delay(180)}
        style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.row}>
          <Text style={[styles.rowText, { color: colors.text }]}>Accessibility</Text>
          {isServiceEnabled ? (
            <Text style={[styles.okText, { color: Theme.colors.success }]}>Enabled</Text>
          ) : (
            <TouchableOpacity onPress={openSettings}>
              <Text style={[styles.rowHint, { color: colors.accent }]}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowText, { color: colors.text }]}>Overlay</Text>
          {overlayAllowed ? (
            <Text style={[styles.okText, { color: Theme.colors.success }]}>Granted</Text>
          ) : (
            <TouchableOpacity onPress={() => AppScanner.requestOverlayPermission()}>
              <Text style={[styles.rowHint, { color: colors.accent }]}>Grant</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.type.h1,
    fontWeight: '700',
    marginBottom: Theme.spacing.sm,
  },
  group: {
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#3B3B42',
  },
  rowText: {
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
  rowHint: {
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
  okText: {
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
  subText: {
    fontSize: Theme.type.caption,
    marginTop: 2,
  },
});
