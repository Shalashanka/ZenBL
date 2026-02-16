import React, { useMemo, useState } from 'react';
import { Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { GongButton } from '../components/GongButton';
import { ZenoxEngine, ZenProfilePayload } from '../bridge/ZenoxEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 250;

const PROFILES: ZenProfilePayload[] = [
  { id: 1, name: 'Deep Work', blockedApps: ['com.instagram.android', 'com.zhiliaoapp.musically'] },
  { id: 2, name: 'Social Detox', blockedApps: ['com.instagram.android', 'com.facebook.katana', 'com.twitter.android'] },
  { id: 3, name: 'Sleep', blockedApps: ['com.netflix.mediaclient', 'com.google.android.youtube'] },
];

const PLACEHOLDER_IMAGES = [
    Image.resolveAssetSource(require('../../assets/profiles/deep-work.jpg')).uri,
    Image.resolveAssetSource(require('../../assets/profiles/social-detox.jpg')).uri,
    Image.resolveAssetSource(require('../../assets/profiles/sleep.jpg')).uri,
];

type ProfileCardProps = {
  index: number;
  name: string;
  blockedAppsCount: number;
  imageUri: string;
  scrollX: SharedValue<number>;
};

const ProfileCard = ({ index, name, blockedAppsCount, imageUri, scrollX }: ProfileCardProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.65, 1, 0.65], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.96, 1, 0.96], Extrapolation.CLAMP) },
        { translateY: interpolate(scrollX.value, inputRange, [18, 0, 18], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Image source={{ uri: imageUri }} style={styles.cardImage} />
      <View style={styles.cardOverlay}>
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.cardText}>Blocked Apps: {blockedAppsCount}</Text>
      </View>
    </Animated.View>
  );
};

export const HomeScreen = () => {
  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const activeProfile = useMemo(() => PROFILES[activeProfileIndex] ?? PROFILES[0], [activeProfileIndex]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      <Text style={styles.subtitle}>Active Profile: {activeProfile.name}</Text>

      <Animated.FlatList
        data={PROFILES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <ProfileCard
            index={index}
            name={item.name}
            blockedAppsCount={item.blockedApps.length}
            imageUri={PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]}
            scrollX={scrollX}
          />
        )}
      />

      <GongButton />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#444444',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  card: {
    width: SCREEN_WIDTH,
    height: CARD_HEIGHT,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#e5e5e5',
  },
  cardOverlay: {
    position: 'absolute',
    left: 28,
    bottom: 30,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    color: '#f0f0f0',
  },
});
