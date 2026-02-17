import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ImageBackground } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Focus, MoonStar, ShieldBan, Timer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme/Theme';

type FocusIconName = 'focus' | 'pomodoro' | 'detox' | 'sleep';

type FocusCardProps = {
  title: string;
  description: string;
  durationLabel: string;
  icon: FocusIconName;
  imageUri: string;
  onPress: () => void;
};

const ICON_SIZE = 18;

const IconByName = ({ icon }: { icon: FocusIconName }) => {
  const color = Theme.colors.text;
  if (icon === 'focus') return <Focus color={color} size={ICON_SIZE} />;
  if (icon === 'pomodoro') return <Timer color={color} size={ICON_SIZE} />;
  if (icon === 'detox') return <ShieldBan color={color} size={ICON_SIZE} />;
  return <MoonStar color={color} size={ICON_SIZE} />;
};

export const FocusCard = ({ title, description, durationLabel, icon, imageUri, onPress }: FocusCardProps) => {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(1.02, { duration: 140 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 180 });
  };

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      iconScale.value = withSequence(
        withTiming(1.14, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })
      );
    }, 4200);

    return () => {
      scale.value = 1;
      iconScale.value = 1;
      clearInterval(pulseInterval);
    };
  }, [iconScale, scale]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, cardStyle]}>
        <ImageBackground source={{ uri: imageUri }} style={styles.imageBg} imageStyle={styles.imageRounded}>
          <LinearGradient
            colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.68)']}
            locations={[0.15, 0.52, 1]}
            style={styles.overlay}
          >
            <Animated.View style={[styles.iconWrap, iconStyle]}>
              <IconByName icon={icon} />
            </Animated.View>
            <View>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.description} numberOfLines={2}>{description}</Text>
            </View>
            <Text style={styles.duration}>{durationLabel}</Text>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 250,
    height: 180,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: Theme.spacing.md,
    overflow: 'hidden',
  },
  imageBg: {
    flex: 1,
  },
  imageRounded: {
    borderRadius: Theme.radius.lg,
  },
  overlay: {
    flex: 1,
    padding: Theme.spacing.md,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,30,35,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: Theme.colors.text,
    fontSize: Theme.type.h2,
    fontWeight: '800',
    fontFamily: 'SNPro_Bold',
  },
  description: {
    marginTop: 6,
    color: '#E4E8F0',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'SNPro_Regular',
  },
  duration: {
    color: '#F2F5FB',
    fontSize: Theme.type.body,
    fontWeight: '700',
    fontFamily: 'SNPro_Bold',
  },
});
