import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const QUOTES = [
  'Focus is a practice, not a destination.',
  'Small disciplined blocks create deep work.',
  'Calm attention beats frantic effort.',
  'Protect your focus and your time compounds.',
];

type FocusQuoteProps = {
  color: string;
};

export const FocusQuote = memo(({ color }: FocusQuoteProps) => {
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);
  const advanceQuote = () => setIndex((prev) => (prev + 1) % QUOTES.length);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(advanceQuote)();
          opacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) });
        }
      });
    }, 6500);

    return () => clearInterval(interval);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const quote = useMemo(() => QUOTES[index], [index]);

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.text, { color }]}>{quote}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
