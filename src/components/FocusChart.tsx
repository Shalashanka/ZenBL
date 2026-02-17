import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BarChart } from 'react-native-gifted-charts';
import { Theme } from '../theme/Theme';
import type { WeeklyStat } from '../bridge/ZenoxEngine';

type FocusChartProps = {
  data: WeeklyStat[];
};

export const FocusChart = memo(({ data }: FocusChartProps) => {
  const [selected, setSelected] = useState<WeeklyStat | null>(null);

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        value: Math.max(item.minutes, 0),
        label: item.day,
        frontColor: Theme.colors.accent,
      })),
    [data]
  );

  const maxValue = useMemo(() => Math.max(...chartData.map((d) => d.value), 1), [chartData]);

  return (
    <View>
      <BarChart
        data={chartData}
        barWidth={14}
        spacing={22}
        hideRules
        hideYAxisText
        hideAxesAndRules
        xAxisColor="transparent"
        yAxisColor="transparent"
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        noOfSections={4}
        maxValue={maxValue}
        isAnimated
        animationDuration={700}
        roundedTop
        roundedBottom
      />

      <View style={styles.touchRow}>
        {data.map((item, index) => (
          <Pressable
            key={`${item.day}-${index}`}
            onLongPress={() => {
              setSelected(item);
              Haptics.selectionAsync().catch(() => undefined);
            }}
            style={styles.touchHit}
          />
        ))}
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
  axisLabel: {
    color: Theme.colors.mutedText,
    fontSize: 11,
    fontFamily: 'SNPro_Regular',
  },
  hintText: {
    marginTop: 12,
    color: Theme.colors.mutedText,
    fontSize: Theme.type.caption,
    fontFamily: 'SNPro_Regular',
  },
  touchRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 170,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
  },
  touchHit: {
    width: 28,
  },
});
