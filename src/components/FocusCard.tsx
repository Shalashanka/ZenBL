import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ImageBackground, Image } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Focus, MoonStar, ShieldBan, Timer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme/Theme';

type FocusIconName = 'focus' | 'pomodoro' | 'detox' | 'sleep';

type FocusCardProps = {
  title: string;
  description: string;
  durationLabel: string;
  blockedAppsCount: number;
  blockedAppIcons: string[];
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

export const FocusCard = ({ title, description, durationLabel, blockedAppsCount, blockedAppIcons, icon, imageUri, onPress }: FocusCardProps) => {
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

  const topIcons = blockedAppIcons.slice(0, 3);
  const extraCount = Math.max(0, blockedAppsCount - topIcons.length);

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
            <View style={styles.footerRow}>
              <View style={styles.footerLeft}>
                <Text style={styles.duration}>{durationLabel}</Text>
                <View style={styles.blockedMeta}>
                  <View style={styles.stackWrap}>
                    {[0, 1, 2].map((idx) => {
                      const iconBase64 = topIcons[idx];
                      return (
                        <View key={`icon-${idx}`} style={[styles.stackDot, { left: idx * 10, zIndex: 3 - idx }]}>
                          {iconBase64 ? (
                            <Image source={{ uri: `data:image/png;base64,${iconBase64}` }} style={styles.stackDotImage} />
                          ) : (
                            <View style={styles.stackDotFallback} />
                          )}
                        </View>
                      );
                    })}
                    {extraCount > 0 ? (
                      <View style={[styles.stackPlusWrap, { left: 30 }]}>
                        <Text style={styles.stackPlus}>+</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.blockedText}>{blockedAppsCount} apps</Text>
                </View>
              </View>
              <View />
            </View>
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stackWrap: {
    width: 52,
    height: 22,
    position: 'relative',
  },
  stackDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  stackDotImage: {
    width: '100%',
    height: '100%',
  },
  stackDotFallback: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  stackPlusWrap: {
    position: 'absolute',
    top: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    zIndex: 6,
  },
  stackPlus: {
    color: '#FFFFFF',
    fontFamily: 'SNPro_Bold',
    fontSize: 12,
    marginTop: -1,
  },
  blockedText: {
    color: '#F2F5FB',
    fontSize: 12,
    fontFamily: 'SNPro_Regular',
  },
});
