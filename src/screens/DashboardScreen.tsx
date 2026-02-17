import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { AppScanner, AppInfo } from '../services/AppScanner';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { ZenoxEngine, WeeklyStat } from '../bridge/ZenoxEngine';
import { FocusChart } from '../components/FocusChart';
import { Theme, getThemeColors } from '../theme/Theme';

const FALLBACK_WEEK: WeeklyStat[] = [
  { day: 'Mon', minutes: 35, attempts: 6 },
  { day: 'Tue', minutes: 44, attempts: 4 },
  { day: 'Wed', minutes: 40, attempts: 5 },
  { day: 'Thu', minutes: 62, attempts: 3 },
  { day: 'Fri', minutes: 58, attempts: 4 },
  { day: 'Sat', minutes: 30, attempts: 7 },
  { day: 'Sun', minutes: 48, attempts: 5 },
];

const BLOCKED = [
  { app: 'Instagram', attempts: 78 },
  { app: 'TikTok', attempts: 64 },
  { app: 'YouTube', attempts: 51 },
  { app: 'X', attempts: 44 },
];

export const DashboardScreen = () => {
  const status = useZenoxStatus();
  const colors = getThemeColors(status.isActive);

  const [enterKey, setEnterKey] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setEnterKey((prev) => prev + 1);

      const load = async () => {
        try {
          const [stats, apps] = await Promise.all([ZenoxEngine.getWeeklyStats(), AppScanner.getInstalledApps()]);
          setWeeklyStats(stats);
          setInstalledApps(apps);
        } catch {
          setWeeklyStats([]);
          setInstalledApps([]);
        }
      };

      load();
      return () => undefined;
    }, [])
  );

  const iconByAppName = useMemo(() => {
    const map = new Map<string, string>();
    installedApps.forEach((app) => {
      map.set(app.appName.toLowerCase(), app.icon ?? '');
    });
    return map;
  }, [installedApps]);

  const effectiveStats = weeklyStats.length > 0 ? weeklyStats : FALLBACK_WEEK;
  const totalMinutes = effectiveStats.reduce((acc, item) => acc + item.minutes, 0);
  const currentStreak = Math.max(1, Math.round(totalMinutes / 120));
  const topBlocked = BLOCKED[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Your Reflections</Text>

        {weeklyStats.length === 0 ? (
          <Animated.View
            key={`empty-${enterKey}`}
            entering={FadeInUp.delay(100).duration(500)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>No reflections yet. Start your first session.</Text>
          </Animated.View>
        ) : null}

        <Animated.View
          key={`chart-${enterKey}`}
          entering={FadeInUp.delay(100).duration(500)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Focus Momentum</Text>
          <FocusChart data={effectiveStats} />
        </Animated.View>

        <View style={styles.grid}>
          <Animated.View
            key={`saved-${enterKey}`}
            entering={FadeInUp.delay(200).duration(500)}
            style={[styles.largeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>Time Saved Today</Text>
            <Text style={[styles.largeNumber, { color: colors.accent }]}>{Math.round(totalMinutes * 0.55)}m</Text>
          </Animated.View>

          <View style={styles.rightCol}>
            <Animated.View
              key={`streak-${enterKey}`}
              entering={FadeInUp.delay(300).duration(500)}
              style={[styles.smallCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.smallLabel, { color: colors.mutedText }]}>Current Streak</Text>
              <Text style={[styles.smallValue, { color: colors.text }]}>{currentStreak} days</Text>
            </Animated.View>

            <Animated.View
              key={`blocked-top-${enterKey}`}
              entering={FadeInUp.delay(400).duration(500)}
              style={[styles.smallCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.smallLabel, { color: colors.mutedText }]}>Most Blocked</Text>
              <View style={styles.topBlockedRow}>
                {iconByAppName.get(topBlocked.app.toLowerCase()) ? (
                  <Image
                    source={{ uri: `data:image/png;base64,${iconByAppName.get(topBlocked.app.toLowerCase())}` }}
                    style={styles.appIcon}
                  />
                ) : (
                  <View style={styles.fallbackIcon}>
                    <Text style={styles.fallbackIconText}>{topBlocked.app[0]}</Text>
                  </View>
                )}
                <Text style={[styles.smallValue, { color: colors.text }]}>{topBlocked.app}</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <Animated.View
          key={`graveyard-${enterKey}`}
          entering={FadeInUp.delay(500).duration(500)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>App Graveyard</Text>
          {BLOCKED.map((item) => {
            const maxAttempts = BLOCKED[0].attempts;
            const width = `${Math.round((item.attempts / maxAttempts) * 100)}%` as `${number}%`;
            const icon = iconByAppName.get(item.app.toLowerCase());
            return (
              <View key={item.app} style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={styles.appCell}>
                    {icon ? (
                      <Image source={{ uri: `data:image/png;base64,${icon}` }} style={styles.appIcon} />
                    ) : (
                      <View style={styles.fallbackIcon}>
                        <Text style={styles.fallbackIconText}>{item.app[0]}</Text>
                      </View>
                    )}
                    <Text style={[styles.rowName, { color: colors.text }]}>{item.app}</Text>
                  </View>
                  <Text style={[styles.rowPct, { color: colors.mutedText }]}>{item.attempts}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width, backgroundColor: Theme.colors.accent }]} />
                </View>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
    paddingBottom: 24,
  },
  title: {
    fontSize: Theme.type.h1,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  card: {
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    padding: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.type.h2,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
  },
  emptyText: {
    fontSize: Theme.type.body,
  },
  grid: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  largeCard: {
    flex: 1.4,
    minHeight: 146,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    padding: Theme.spacing.md,
    justifyContent: 'space-between',
  },
  rightCol: {
    flex: 1,
    gap: Theme.spacing.sm,
  },
  smallCard: {
    flex: 1,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    padding: Theme.spacing.sm,
    justifyContent: 'space-between',
  },
  largeNumber: {
    fontSize: 42,
    fontWeight: '700',
  },
  smallLabel: {
    fontSize: Theme.type.caption,
  },
  smallValue: {
    fontSize: Theme.type.body,
    fontWeight: '700',
  },
  topBlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    marginBottom: Theme.spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  fallbackIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#45454f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIconText: {
    color: '#f5f5f5',
    fontWeight: '700',
    fontSize: 12,
  },
  rowName: {
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
  rowPct: {
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3A3A41',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
