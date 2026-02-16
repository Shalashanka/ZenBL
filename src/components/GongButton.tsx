import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ZenoxEngine } from '../bridge/ZenoxEngine';
import { useZenoxStatus } from '../hooks/useZenoxStatus';

type GongButtonProps = {
  visible?: boolean;
};

export const GongButton = ({ visible = true }: GongButtonProps) => {
  const status = useZenoxStatus();
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <TouchableOpacity
        onPress={() => (status.isActive ? ZenoxEngine.stopZen() : ZenoxEngine.startZen(60))}
        style={[styles.button, status.isActive ? styles.buttonActive : styles.buttonIdle]}
      >
        <Text style={styles.buttonText}>{status.isActive ? 'END ZEN' : 'QUICK ZEN'}</Text>
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
    backgroundColor: '#1a140f',
    borderColor: '#1a140f',
  },
  buttonActive: {
    backgroundColor: '#331f16',
    borderColor: '#3d8c4f',
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
