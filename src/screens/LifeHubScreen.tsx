import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../theme/palette';

const HABITS = ['Morning planning', 'No social before noon', 'Wind-down at 22:30'];
const SUBSCRIPTIONS = ['Focus Plan', 'Accountability Partner'];

export const LifeHubScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Life-Hub</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscriptions</Text>
          {SUBSCRIPTIONS.map((item) => (
            <Text key={item} style={styles.rowText}>
              - {item}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Habits</Text>
          {HABITS.map((item) => (
            <Text key={item} style={styles.rowText}>
              - {item}
            </Text>
          ))}
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
  rowText: {
    fontSize: 14,
    color: palette.paperSoft,
    marginBottom: 6,
  },
});
