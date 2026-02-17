import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAppPreferences } from '../preferences/AppPreferencesContext';

type FocusQuoteProps = {
  color: string;
};

export const FocusQuote = memo(({ color }: FocusQuoteProps) => {
  const { t } = useAppPreferences();
  const quotes = useMemo(
    () => [t('quotes.q1'), t('quotes.q2'), t('quotes.q3'), t('quotes.q4')],
    [t],
  );

  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const advanceQuote = () => setIndex((prev) => (prev + 1) % quotes.length);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withSpring(1.025, { damping: 9, stiffness: 85, mass: 1 }),
        withSpring(1, { damping: 9, stiffness: 85, mass: 1 }),
      ),
      -1,
      false,
    );

    const interval = setInterval(() => {
      opacity.value = withTiming(0.2, { duration: 520, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(advanceQuote)();
          opacity.value = withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) });
        }
      });
    }, 7600);

    return () => clearInterval(interval);
  }, [opacity, quotes.length, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const quote = useMemo(() => quotes[index] ?? quotes[0] ?? '', [index, quotes]);

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
    fontFamily: 'SNPro_Regular',
  },
});
