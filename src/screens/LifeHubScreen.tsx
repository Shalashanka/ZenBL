import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    backgroundColor: '#ffffff',
  },
  content: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  rowText: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 6,
  },
});

