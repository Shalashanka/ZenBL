import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ZenoxEngine } from '../bridge/ZenoxEngine';
import { useZenoxStatus } from '../hooks/useZenoxStatus';

export const GongButton = () => {
  const status = useZenoxStatus();

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <TouchableOpacity
        onPress={() => ZenoxEngine.startZen(60)}
        style={[styles.button, status.isActive ? styles.buttonActive : styles.buttonIdle]}
      >
        <Text style={styles.buttonText}>{status.isActive ? 'QUICK ZEN ACTIVE' : 'QUICK ZEN'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    minWidth: 160,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
  },
  buttonIdle: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  buttonActive: {
    backgroundColor: '#2d2d2d',
    borderColor: '#4caf50',
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
