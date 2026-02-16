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
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';
import { GongButton } from '../components/GongButton';
import { ZenoxEngine, ZenProfilePayload } from '../bridge/ZenoxEngine';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { palette } from '../theme/palette';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 250;
const CARD_WIDTH = SCREEN_WIDTH - 24;

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
  scrollX: SharedValue<number>;
  onOpen: () => void;
};

const ProfileCard = ({ index, profile, imageUri, active, scrollX, onOpen }: ProfileCardProps) => {
  const containerStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const rotate = interpolate(scrollX.value, inputRange, [1.6, 0, -1.6], Extrapolation.CLAMP);

    return {
      opacity: interpolate(scrollX.value, inputRange, [0.38, 1, 0.38], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP) },
        { translateY: interpolate(scrollX.value, inputRange, [36, 0, 36], Extrapolation.CLAMP) },
        { rotateZ: `${rotate}deg` },
      ],
    };
  });

  const imageParallaxStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    return {
      transform: [{ translateX: interpolate(scrollX.value, inputRange, [-56, 0, 56], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[styles.card, containerStyle]}>
      <Pressable style={styles.cardPressable} onPress={onOpen}>
        <View style={styles.cardImageFrame}>
          <Animated.Image source={{ uri: imageUri }} style={[styles.cardImage, imageParallaxStyle]} />
        </View>

        <LinearGradient
          colors={['rgba(8,7,6,0.00)', 'rgba(8,7,6,0.18)', 'rgba(8,7,6,0.48)', 'rgba(8,7,6,0.78)']}
          locations={[0, 0.5, 0.76, 1]}
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
    expandProgress.value = withTiming(1, {
      duration: 520,
      easing: Easing.bezier(0.2, 0.85, 0.2, 1),
    });
  };

  const closeExpandedProfile = () => {
    expandProgress.value = withTiming(
      0,
      {
        duration: 400,
        easing: Easing.bezier(0.35, 0.05, 0.4, 1),
      },
      (finished) => {
        if (finished) runOnJS(setExpandedProfileIndex)(null);
      }
    );
  };

  const expandedBoundsStyle = useAnimatedStyle(() => ({
    top: interpolate(expandProgress.value, [0, 1], [carouselTop, 0], Extrapolation.CLAMP),
    left: interpolate(expandProgress.value, [0, 1], [12, 0], Extrapolation.CLAMP),
    width: interpolate(expandProgress.value, [0, 1], [CARD_WIDTH, SCREEN_WIDTH], Extrapolation.CLAMP),
    height: interpolate(expandProgress.value, [0, 1], [CARD_HEIGHT, SCREEN_HEIGHT], Extrapolation.CLAMP),
    borderRadius: interpolate(expandProgress.value, [0, 1], [18, 0], Extrapolation.CLAMP),
  }));

  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.55, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(expandProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP) }],
  }));

  const zenToneStyle = useAnimatedStyle(() => ({
    opacity: zenToneProgress.value,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Home</Text>

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
          decelerationRate="fast"
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
              scrollX={scrollX}
              onOpen={() => openProfile(index)}
            />
          )}
        />
      </View>

      {expandedProfile ? (
        <Animated.View style={[styles.expandedBounds, expandedBoundsStyle]}>
          <Image source={{ uri: PROFILE_IMAGES[expandedProfileIndex! % PROFILE_IMAGES.length] }} style={styles.expandedImage} />
          <Animated.View style={[styles.zenToneLayer, zenToneStyle]} />

          <LinearGradient
            colors={['rgba(4,3,2,0.10)', 'rgba(4,3,2,0.22)', 'rgba(4,3,2,0.58)', 'rgba(4,3,2,0.85)']}
            locations={[0, 0.42, 0.75, 1]}
            style={styles.expandedGradient}
          />

          <Animated.View style={[styles.expandedUi, expandedContentStyle]}>
            <SafeAreaView style={styles.expandedSafe}>
              <View style={styles.expandedHeader}>
                <TouchableOpacity onPress={closeExpandedProfile} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.expandedInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.expandedTitle}>{expandedProfile.name}</Text>
                  <View style={styles.tagActive}>
                    <Text style={styles.activeTagText}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.expandedSub}>Profile options</Text>
              </View>

              <View style={styles.optionsContainer}>
                {PROFILE_OPTIONS.map((option) => (
                  <TouchableOpacity key={option} style={styles.optionButton}>
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingBottom: 12,
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
    width: '130%',
    height: '100%',
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
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
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
  expandedInfo: {
    paddingHorizontal: 20,
    marginTop: 20,
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
