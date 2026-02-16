import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { palette } from '../theme/palette';

export const DashboardScreen = () => {
  const status = useZenoxStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Zen Status</Text>
          <Text style={styles.cardText}>Active: {status.isActive ? 'Yes' : 'No'}</Text>
          <Text style={styles.cardText}>Remaining: {status.remainingSeconds}s</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bonsai (Placeholder)</Text>
          <Text style={styles.cardText}>Growth metrics and streaks will appear here.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.inkSoft,
  },
  content: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.paper,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: palette.paperSoft,
    marginBottom: 4,
  },
});
