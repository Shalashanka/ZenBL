import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';
import { GongButton } from '../components/GongButton';
import { ZenoxEngine, ZenProfilePayload } from '../bridge/ZenoxEngine';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { palette } from '../theme/palette';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 130;
const CARD_WIDTH = SCREEN_WIDTH - 24;
const CARD_INSET_X = 12;
const CARD_INSET_TOP = 12;
const CARD_INSET_BOTTOM = 12;
const CARD_VISIBLE_HEIGHT = CARD_HEIGHT - CARD_INSET_TOP - CARD_INSET_BOTTOM;
const HERO_MOVE_END = 0.84;
const HERO_SECONDARY_START = 0.9;
const EXPAND_SPRING = {
  damping: 20,
  stiffness: 70,
  mass: 1.2,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
} as const;
const COLLAPSE_SPRING = {
  damping: 20,
  stiffness: 96,
  mass: 1.0,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
} as const;

const PROFILES: ZenProfilePayload[] = [
  { id: 1, name: 'Deep Work', blockedApps: ['com.instagram.android', 'com.zhiliaoapp.musically'] },
  { id: 2, name: 'Social Detox', blockedApps: ['com.instagram.android', 'com.facebook.katana', 'com.twitter.android'] },
  { id: 3, name: 'Sleep', blockedApps: ['com.netflix.mediaclient', 'com.google.android.youtube'] },
];

const PROFILE_IMAGES = [
  Image.resolveAssetSource(require('../../assets/profiles/deep-work.jpg')).uri,
  Image.resolveAssetSource(require('../../assets/profiles/social-detox.jpg')).uri,
  Image.resolveAssetSource(require('../../assets/profiles/sleep.jpg')).uri,
];

const PROFILE_OPTIONS = ['Edit Profile', 'Edit Block List', 'Schedules', 'Notes'];

type ProfileCardProps = {
  index: number;
  profile: ZenProfilePayload;
  imageUri: string;
  active: boolean;
  carouselTop: number;
  scrollX: SharedValue<number>;
  onOpen: () => void;
};

type AnimatedOptionRowProps = {
  index: number;
  label: string;
  expandProgress: SharedValue<number>;
};

type PaginationDotProps = {
  index: number;
  scrollX: SharedValue<number>;
};

const AnimatedOptionRow = ({ index, label, expandProgress }: AnimatedOptionRowProps) => {
  const optionStyle = useAnimatedStyle(() => {
    const start = HERO_SECONDARY_START + index * 0.12;
    const end = start + 0.42;
    return {
      opacity: interpolate(expandProgress.value, [start, end], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(expandProgress.value, [start, end], [72, 0], Extrapolation.CLAMP) },
        { scale: interpolate(expandProgress.value, [start, end], [0.95, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={optionStyle}>
      <TouchableOpacity style={styles.optionButton}>
        <Text style={styles.optionText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const PaginationDot = ({ index, scrollX }: PaginationDotProps) => {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const intensity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return {
      width: interpolate(scrollX.value, inputRange, [8, 18, 8], Extrapolation.CLAMP),
      opacity: intensity,
      backgroundColor: `rgba(244, 235, 222, ${interpolate(
        scrollX.value,
        inputRange,
        [0.45, 1, 0.45],
        Extrapolation.CLAMP
      )})`,
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
};

const ProfileCard = ({ index, profile, imageUri, active, carouselTop, scrollX, onOpen }: ProfileCardProps) => {
  const containerStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

    return {
      opacity: interpolate(scrollX.value, inputRange, [0.76, 1, 0.76], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP) },
        { translateY: interpolate(scrollX.value, inputRange, [12, 0, 12], Extrapolation.CLAMP) },
      ],
    };
  });

  const imageParallaxStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    return {
      transform: [{ translateX: interpolate(scrollX.value, inputRange, [-26, 0, 26], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[styles.card, containerStyle]}>
      <Pressable style={styles.cardPressable} onPress={onOpen}>
        <View style={styles.cardImageFrame}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.cardImage,
              {
                top: -(carouselTop + CARD_INSET_TOP),
                left: -CARD_INSET_X,
              },
              imageParallaxStyle,
            ]}
          />
        </View>

        <LinearGradient
          colors={['rgba(8,7,6,0.00)', 'rgba(8,7,6,0.18)', 'rgba(8,7,6,0.62)', 'rgba(8, 7, 6, 0.95)']}
          locations={[0, 0.3, 0.66, 1]}
          style={styles.cardGradient}
        />

        <View style={styles.cardOverlay}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{profile.name}</Text>
            <View style={[styles.activeTag, active ? styles.tagActive : styles.tagInactive]}>
              <Text style={styles.activeTagText}>{active ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
          </View>
          <Text style={styles.cardText}>Blocked Apps: {profile.blockedApps.length}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const HomeScreen = () => {
  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [expandedProfileIndex, setExpandedProfileIndex] = useState<number | null>(null);
  const [carouselTop, setCarouselTop] = useState(0);

  const scrollX = useSharedValue(0);
  const zenToneProgress = useSharedValue(0);
  const expandProgress = useSharedValue(0);
  const status = useZenoxStatus();

  useEffect(() => {
    zenToneProgress.value = withTiming(status.isActive ? 1 : 0, { duration: 550, easing: Easing.out(Easing.cubic) });
  }, [status.isActive, zenToneProgress]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const syncProfile = (profile: ZenProfilePayload) => {
    ZenoxEngine.setActiveProfile(profile);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (nextIndex < 0 || nextIndex >= PROFILES.length) return;
    setActiveProfileIndex(nextIndex);
    syncProfile(PROFILES[nextIndex]);
  };

  const expandedProfile = useMemo(
    () => (expandedProfileIndex === null ? null : PROFILES[expandedProfileIndex]),
    [expandedProfileIndex]
  );

  const openProfile = (index: number) => {
    setExpandedProfileIndex(index);
    syncProfile(PROFILES[index]);
    expandProgress.value = 0;
    expandProgress.value = withSpring(1, EXPAND_SPRING);
  };

  const closeExpandedProfile = () => {
    expandProgress.value = withSpring(
      0,
      COLLAPSE_SPRING,
      (finished) => {
        if (finished) runOnJS(setExpandedProfileIndex)(null);
      }
    );
  };

  const expandedBoundsStyle = useAnimatedStyle(() => ({
    top: interpolate(expandProgress.value, [0, 1], [carouselTop + CARD_INSET_TOP, 0], Extrapolation.CLAMP),
    left: interpolate(expandProgress.value, [0, 1], [CARD_INSET_X, 0], Extrapolation.CLAMP),
    width: interpolate(expandProgress.value, [0, 1], [CARD_WIDTH, SCREEN_WIDTH], Extrapolation.CLAMP),
    height: interpolate(expandProgress.value, [0, 1], [CARD_VISIBLE_HEIGHT, SCREEN_HEIGHT], Extrapolation.CLAMP),
    borderRadius: interpolate(expandProgress.value, [0, 0.9, 1], [18, 18, 0], Extrapolation.CLAMP),
  }));

  const expandedImageStyle = useAnimatedStyle(() => ({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    top: -interpolate(expandProgress.value, [0, 1], [carouselTop + CARD_INSET_TOP, 0], Extrapolation.CLAMP),
    left: -interpolate(expandProgress.value, [0, 1], [CARD_INSET_X, 0], Extrapolation.CLAMP),
  }));

  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.1], [0, 1], Extrapolation.CLAMP),
  }));

  const heroMetaStyle = useAnimatedStyle(() => ({
    top: interpolate(
      expandProgress.value,
      [0, HERO_MOVE_END],
      [CARD_VISIBLE_HEIGHT - 84, 90],
      Extrapolation.CLAMP
    ),
    opacity: interpolate(expandProgress.value, [0, 0.08, HERO_MOVE_END], [0, 1, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(expandProgress.value, [0, HERO_MOVE_END], [18, 0], Extrapolation.CLAMP) }],
  }));

  const backButtonAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      expandProgress.value,
      [HERO_SECONDARY_START, HERO_SECONDARY_START + 0.22],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateX: interpolate(
          expandProgress.value,
          [HERO_SECONDARY_START, HERO_SECONDARY_START + 0.22],
          [-12, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const zenToneStyle = useAnimatedStyle(() => ({
    opacity: zenToneProgress.value,
  }));

  const blurOverlayStyle = useAnimatedStyle(() => {
    const baseBlur = interpolate(expandProgress.value, [0, 1], [0, 0.16], Extrapolation.CLAMP);
    const zenBoost = interpolate(zenToneProgress.value, [0, 1], [0, 0.22], Extrapolation.CLAMP);
    return {
      opacity: baseBlur + zenBoost,
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View
        style={styles.carouselWrap}
        onLayout={(event) => {
          setCarouselTop(event.nativeEvent.layout.y);
        }}
      >
        <Animated.FlatList
          data={PROFILES}
          horizontal
          pagingEnabled
          decelerationRate="normal"
          disableIntervalMomentum
          snapToAlignment="start"
          snapToInterval={SCREEN_WIDTH}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <ProfileCard
              index={index}
              profile={item}
              imageUri={PROFILE_IMAGES[index % PROFILE_IMAGES.length]}
              active={index === activeProfileIndex}
              carouselTop={carouselTop}
              scrollX={scrollX}
              onOpen={() => openProfile(index)}
            />
          )}
        />
        {expandedProfile ? null : (
          <View style={styles.paginationRow}>
            {PROFILES.map((profile, idx) => (
              <PaginationDot key={profile.id} index={idx} scrollX={scrollX} />
            ))}
          </View>
        )}
      </View>

      {expandedProfile ? (
        <Animated.View style={[styles.expandedBounds, expandedBoundsStyle]}>
          <Animated.Image
            source={{ uri: PROFILE_IMAGES[expandedProfileIndex! % PROFILE_IMAGES.length] }}
            style={[styles.expandedImage, expandedImageStyle]}
          />
          <Animated.Image
            source={{ uri: PROFILE_IMAGES[expandedProfileIndex! % PROFILE_IMAGES.length] }}
            blurRadius={16}
            style={[styles.expandedImage, expandedImageStyle, blurOverlayStyle]}
          />
          <Animated.View style={[styles.zenToneLayer, zenToneStyle]} />

          <LinearGradient
            colors={['rgba(8,7,6,0.18)', 'rgba(8,7,6,0.24)', 'rgba(8,7,6,0.58)', 'rgba(8,7,6,0.84)']}
            locations={[0, 0.42, 0.74, 1]}
            style={styles.expandedGradient}
          />

          <Animated.View style={[styles.expandedUi, expandedContentStyle]}>
            <SafeAreaView style={styles.expandedSafe}>
              <View style={styles.expandedHeader}>
                <Animated.View style={backButtonAnimStyle}>
                  <TouchableOpacity onPress={closeExpandedProfile} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <Animated.View style={[styles.heroMeta, heroMetaStyle]}>
                <View style={styles.titleRow}>
                  <Text style={styles.expandedTitle}>{expandedProfile.name}</Text>
                  <View style={styles.tagActive}>
                    <Text style={styles.activeTagText}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.expandedSub}>Blocked Apps: {expandedProfile.blockedApps.length}</Text>
              </Animated.View>

              <View style={styles.optionsContainer}>
                {PROFILE_OPTIONS.map((option, idx) => (
                  <AnimatedOptionRow key={option} index={idx} label={option} expandProgress={expandProgress} />
                ))}
              </View>
            </SafeAreaView>

            <GongButton visible />
          </Animated.View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.inkSoft,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textPrimary,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  carouselWrap: {
    flex: 1,
  },
  card: {
    width: SCREEN_WIDTH,
    height: CARD_HEIGHT,
    paddingHorizontal: CARD_INSET_X,
    paddingBottom: CARD_INSET_BOTTOM,
    paddingTop: CARD_INSET_TOP,
  },
  cardPressable: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 18,
  },
  cardImageFrame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 18,
  },
  cardImage: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#46352a',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  cardOverlay: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff8ec',
    marginRight: 10,
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    color: '#eadfce',
  },
  activeTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  tagActive: {
    backgroundColor: '#3d8c4f',
  },
  tagInactive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  activeTagText: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  expandedBounds: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#0b0908',
    zIndex: 100,
  },
  expandedImage: {
    position: 'absolute',
  },
  zenToneLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#747474',
  },
  expandedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  expandedUi: {
    ...StyleSheet.absoluteFillObject,
  },
  expandedSafe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  expandedHeader: {
    paddingHorizontal: 14,
    paddingTop: 4,
    zIndex: 5,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(14, 12, 10, 0.56)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: '#f8ead7',
    fontWeight: '600',
    fontSize: 14,
  },
  heroMeta: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  expandedTitle: {
    color: '#f8ead7',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 10,
  },
  expandedSub: {
    color: '#cdb8a1',
    marginTop: 10,
    fontSize: 14,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 150,
    gap: 10,
  },
  paginationRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 235, 222, 0.45)',
  },
  optionButton: {
    borderRadius: 10,
    backgroundColor: 'rgba(16, 12, 9, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(242, 218, 188, 0.32)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionText: {
    color: '#f4e6d1',
    fontSize: 15,
    fontWeight: '600',
  },
});
