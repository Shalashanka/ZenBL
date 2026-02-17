import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme/Theme';
import type { WeeklyStat } from '../bridge/ZenoxEngine';

type FocusChartProps = {
  data: WeeklyStat[];
};

export const FocusChart = memo(({ data }: FocusChartProps) => {
  const [selected, setSelected] = useState<WeeklyStat | null>(null);

  const maxMinutes = useMemo(() => {
    const maxVal = Math.max(...data.map((d) => d.minutes), 1);
    return maxVal;
  }, [data]);

  return (
    <View>
      <View style={styles.row}>
        {data.map((item, index) => {
          const heightPct = Math.max((item.minutes / maxMinutes) * 100, 8);
          return (
            <Pressable
              key={`${item.day}-${index}`}
              style={styles.barCol}
              onLongPress={() => {
                setSelected(item);
                Haptics.selectionAsync().catch(() => undefined);
              }}
            >
              <Animated.View entering={FadeInUp.delay(index * 100).duration(500)} style={[styles.barWrap, { height: `${heightPct}%` }]}>
                <LinearGradient
                  colors={[Theme.colors.accentLight, Theme.colors.accent, 'rgba(255,112,67,0.12)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.bar}
                />
              </Animated.View>
              <Text style={styles.dayLabel}>{item.day}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <Text style={styles.hintText}>
          {selected.day}: {selected.minutes} min, {selected.attempts} attempts
        </Text>
      ) : (
        <Text style={styles.hintText}>Long press a bar to inspect a day</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barCol: {
    width: 26,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barWrap: {
    width: 14,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 10,
  },
  bar: {
    flex: 1,
    borderRadius: 10,
  },
  dayLabel: {
    color: Theme.colors.mutedText,
    fontSize: 11,
    marginTop: 8,
  },
  hintText: {
    marginTop: 12,
    color: Theme.colors.mutedText,
    fontSize: Theme.type.caption,
  },
});
