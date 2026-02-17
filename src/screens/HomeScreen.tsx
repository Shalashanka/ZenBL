import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Flame, X, Settings as SettingsIcon, UserCircle2, Clock3, ShieldBan, Target, CalendarClock, BellRing } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { WeeklyStat, ZenoxEngine } from '../bridge/ZenoxEngine';
import { FocusCard } from '../components/FocusCard';
import { FocusQuote } from '../components/FocusQuote';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { useZenStore } from '../store/zenStore';
import { Theme, getThemeColors } from '../theme/Theme';

type Session = {
  id: string;
  title: string;
  durationMinutes: number;
  icon: 'focus' | 'pomodoro' | 'detox' | 'sleep';
  description: string;
  blockedApps: string[];
  imageUri: string;
};

const SESSIONS: Session[] = [
  {
    id: 'deep-work',
    title: 'Deep Work',
    durationMinutes: 60,
    icon: 'focus',
    description: 'High-focus mode for coding, writing, and strategic work.',
    blockedApps: ['Instagram', 'TikTok', 'YouTube'],
    imageUri: Image.resolveAssetSource(require('../../assets/profiles/deep-work.webp')).uri,
  },
  {
    id: 'pomodoro',
    title: '25m Pomodoro',
    durationMinutes: 25,
    icon: 'pomodoro',
    description: 'Fast concentration sprint with low cognitive overhead.',
    blockedApps: ['Instagram', 'X', 'Reddit'],
    imageUri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'social-detox',
    title: 'Social Detox',
    durationMinutes: 90,
    icon: 'detox',
    description: 'Aggressive social-media block for mental reset.',
    blockedApps: ['Instagram', 'TikTok', 'Facebook', 'X'],
    imageUri: Image.resolveAssetSource(require('../../assets/profiles/social-detox.webp')).uri,
  },
  {
    id: 'sleep-mode',
    title: 'Sleep Prep',
    durationMinutes: 45,
    icon: 'sleep',
    description: 'Wind-down profile for evening calm and no doomscrolling.',
    blockedApps: ['YouTube', 'Netflix', 'X'],
    imageUri: Image.resolveAssetSource(require('../../assets/profiles/sleep.webp')).uri,
  },
];

const NAME_KEY = 'zenox_local_user_name';
const QUICK_ZEN_MIN = 5;
const QUICK_ZEN_MAX = 120;
const QUICK_ZEN_STEP = 1;
const TIMER_SIZE = 220;
const TIMER_STROKE = 14;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
const DIAL_PAD = 28;
const DIAL_CANVAS = TIMER_SIZE + DIAL_PAD * 2;

const prettyDuration = (mins: number) => `${mins} min`;
const formatDuration = (mins: number) => `${mins} minutes`;
const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const min = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const sec = (safe % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
};

const formatMinutesCompact = (minutes: number) => {
  const safe = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins <= 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const status = useZenoxStatus();
  const blockedApps = useZenStore((s) => s.blockedApps);
  const fetchBlockedApps = useZenStore((s) => s.fetchBlockedApps);
  const setBlockedApps = useZenStore((s) => s.setBlockedApps);
  const [optimisticZen, setOptimisticZen] = useState(false);
  const statusActiveRef = useRef(status.isActive);
  const colors = getThemeColors(status.isActive || optimisticZen);

  const { height, width } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.75);

  const [userName, setUserName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [isNameModalOpen, setNameModalOpen] = useState(false);
  const [streakDays] = useState(6);
  const [quickZenMinutes, setQuickZenMinutes] = useState(60);
  const [activeTotalSeconds, setActiveTotalSeconds] = useState(60 * 60);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [isDialDragging, setDialDragging] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const prevZenActiveRef = useRef(status.isActive);
  const dialLayoutRef = useRef({ x: 0, y: 0, width: DIAL_CANVAS, height: DIAL_CANVAS });

  const [sheetSession, setSheetSession] = useState<Session | null>(null);
  const [durationDraft, setDurationDraft] = useState(60);
  const [fortressMode, setFortressMode] = useState(false);
  const [enterKey, setEnterKey] = useState(0);

  const sheetY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const menuX = useSharedValue(width);
  const menuBackdropOpacity = useSharedValue(0);
  const menuContentProgress = useSharedValue(0);
  const headerThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const carouselThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const statsThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const ctaThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const sheetDragStartY = useRef(0);
  const modalScrollY = useRef(0);
  const ringDragActiveRef = useRef(false);
  const menuDragStartX = useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      setEnterKey((prev) => prev + 1);
      let mounted = true;
      const loadLiveData = async () => {
        try {
          const [stats] = await Promise.all([ZenoxEngine.getWeeklyStats(), fetchBlockedApps()]);
          if (mounted) {
            setWeeklyStats(stats);
          }
        } catch {
          if (mounted) {
            setWeeklyStats([]);
          }
        }
      };
      loadLiveData();
      return () => {
        mounted = false;
      };
    }, [fetchBlockedApps])
  );

  useEffect(() => {
    const loadName = async () => {
      const stored = await AsyncStorage.getItem(NAME_KEY);
      if (!stored) {
        setNameModalOpen(true);
        return;
      }
      setUserName(stored);
    };

    loadName();
  }, []);

  useEffect(() => {
    statusActiveRef.current = status.isActive;
    if (status.isActive) {
      setOptimisticZen(false);
    }
  }, [status.isActive]);

  useEffect(() => {
    const becameActive = !prevZenActiveRef.current && status.isActive;
    if (becameActive) {
      setActiveTotalSeconds(Math.max(status.remainingSeconds, quickZenMinutes * 60, 1));
    }
    if (status.isActive && status.remainingSeconds > activeTotalSeconds) {
      setActiveTotalSeconds(status.remainingSeconds);
    }
    prevZenActiveRef.current = status.isActive;
  }, [activeTotalSeconds, quickZenMinutes, status.isActive, status.remainingSeconds]);

  const animateThemeCascade = useCallback(
    (target: 0 | 1) => {
      const duration = target === 1 ? 520 : 280;
      const easing = target === 1 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad);
      headerThemeProgress.value = withDelay(0, withTiming(target, { duration, easing }));
      carouselThemeProgress.value = withDelay(target === 1 ? 100 : 0, withTiming(target, { duration, easing }));
      statsThemeProgress.value = withDelay(target === 1 ? 200 : 0, withTiming(target, { duration, easing }));
      ctaThemeProgress.value = withDelay(target === 1 ? 300 : 0, withTiming(target, { duration, easing }));
    },
    [headerThemeProgress, carouselThemeProgress, ctaThemeProgress, statsThemeProgress]
  );

  useEffect(() => {
    animateThemeCascade(status.isActive ? 1 : 0);
  }, [animateThemeCascade, status.isActive]);

  useEffect(() => {
    if (!sheetSession) return;

    sheetY.value = sheetHeight;
    backdropOpacity.value = 0;

    sheetY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });

    backdropOpacity.value = withDelay(
      500,
      withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [sheetSession, sheetHeight, backdropOpacity, sheetY]);

  useEffect(() => {
    if (!isMenuOpen) {
      menuX.value = width;
      menuBackdropOpacity.value = 0;
      menuContentProgress.value = 0;
    }
  }, [isMenuOpen, menuBackdropOpacity, menuContentProgress, menuX, width]);

  const stats = useMemo(() => {
    const totalMinutes = weeklyStats.reduce((acc, item) => acc + Math.max(0, item.minutes), 0);
    const totalAttempts = weeklyStats.reduce((acc, item) => acc + Math.max(0, item.attempts), 0);
    const goalPct = Math.min(100, Math.round((totalMinutes / 300) * 100));
    return [
      { label: 'Focus Time', value: formatMinutesCompact(totalMinutes), meta: 'This week', icon: 'clock' as const },
      { label: 'App Kills', value: `${totalAttempts}`, meta: `${blockedApps.length} blocked apps`, icon: 'kills' as const },
      { label: 'Goal', value: `${goalPct}%`, meta: `${Math.max(0, 100 - goalPct)}% to weekly goal`, icon: 'goal' as const },
    ];
  }, [blockedApps.length, weeklyStats]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: menuX.value }],
  }));

  const menuBackdropStyle = useAnimatedStyle(() => ({
    opacity: menuBackdropOpacity.value,
  }));

  const menuHeaderStyle = useAnimatedStyle(() => ({
    opacity: menuContentProgress.value,
    transform: [{ translateX: (1 - menuContentProgress.value) * 18 }],
  }));

  const menuItemStyle = useAnimatedStyle(() => ({
    opacity: menuContentProgress.value,
    transform: [{ translateX: (1 - menuContentProgress.value) * 28 }],
  }));

  const pageBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      headerThemeProgress.value,
      [0, 1],
      [Theme.colors.background, Theme.zenColors.background]
    ),
  }));

  const headerSurfaceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      headerThemeProgress.value,
      [0, 1],
      [Theme.colors.surface, Theme.zenColors.surface]
    ),
    borderColor: interpolateColor(
      headerThemeProgress.value,
      [0, 1],
      [Theme.colors.border, Theme.zenColors.border]
    ),
  }));

  const statPrimaryStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      statsThemeProgress.value,
      [0, 1],
      [Theme.colors.surface, Theme.zenColors.surface]
    ),
    borderColor: interpolateColor(
      statsThemeProgress.value,
      [0, 1],
      [Theme.colors.border, Theme.zenColors.border]
    ),
  }));

  const carouselSurfaceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      carouselThemeProgress.value,
      [0, 1],
      [Theme.colors.background, Theme.zenColors.background]
    ),
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      ctaThemeProgress.value,
      [0, 1],
      [Theme.colors.accent, Theme.zenColors.accent]
    ),
  }));

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    setUserName(trimmed);
    setNameModalOpen(false);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const openSessionSheet = (session: Session) => {
    setSheetSession(session);
    setDurationDraft(session.durationMinutes);
    setFortressMode(false);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const closeSessionSheet = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
    sheetY.value = withTiming(
      sheetHeight,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setSheetSession)(null);
      }
    );
  }, [backdropOpacity, sheetHeight, sheetY]);

  const syncBlockedAppsBeforeStart = useCallback(async () => {
    let currentBlocked = blockedApps;
    if (currentBlocked.length === 0) {
      await fetchBlockedApps();
      currentBlocked = useZenStore.getState().blockedApps;
    }
    if (currentBlocked.length > 0) {
      await setBlockedApps(currentBlocked);
    }
  }, [blockedApps, fetchBlockedApps, setBlockedApps]);

  const ensureZenPrerequisites = useCallback(async (): Promise<boolean> => {
    const [serviceEnabled, overlayAllowed] = await Promise.all([
      ZenoxEngine.isServiceEnabled(),
      ZenoxEngine.checkOverlayPermission(),
    ]);

    if (!serviceEnabled) {
      Alert.alert(
        'Accessibility Required',
        'Enable Zenox Accessibility Service to enforce app blocking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => ZenoxEngine.openAccessibilitySettings() },
        ],
      );
      return false;
    }

    if (!overlayAllowed) {
      Alert.alert(
        'Overlay Required',
        'Allow overlay permission so the block screen can appear.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => ZenoxEngine.requestOverlayPermission() },
        ],
      );
      return false;
    }

    const notificationAllowed = await ZenoxEngine.checkNotificationPermission();
    if (!notificationAllowed) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications to see the Zen countdown in your status bar.',
        [
          { text: 'Skip', style: 'cancel' },
          { text: 'Open Settings', onPress: () => ZenoxEngine.requestNotificationPermission() },
        ],
      );
    }

    return true;
  }, []);

  const applyQuickZenFromRatio = useCallback((ratio: number) => {
    const clamped = Math.min(1, Math.max(0, ratio));
    const raw = QUICK_ZEN_MIN + clamped * (QUICK_ZEN_MAX - QUICK_ZEN_MIN);
    const stepped = Math.round(raw / QUICK_ZEN_STEP) * QUICK_ZEN_STEP;
    setQuickZenMinutes(Math.min(QUICK_ZEN_MAX, Math.max(QUICK_ZEN_MIN, stepped)));
  }, []);

  const applyQuickZenFromScreenPoint = useCallback((screenX: number, screenY: number) => {
    const centerX = dialLayoutRef.current.x + dialLayoutRef.current.width / 2;
    const centerY = dialLayoutRef.current.y + dialLayoutRef.current.height / 2;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    let radians = Math.atan2(dy, dx) + Math.PI / 2;
    if (radians < 0) radians += Math.PI * 2;
    const ratio = radians / (Math.PI * 2);
    applyQuickZenFromRatio(ratio);
  }, [applyQuickZenFromRatio]);

  const onDialLayout = useCallback((event: LayoutChangeEvent) => {
    const node = event.currentTarget as unknown as {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    };
    node.measureInWindow?.((x, y, width, height) => {
      dialLayoutRef.current = { x, y, width, height };
    });
  }, []);

  const isNearRing = useCallback((locationX: number, locationY: number) => {
    const center = DIAL_CANVAS / 2;
    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const ringInner = TIMER_RADIUS - 16;
    const ringOuter = TIMER_RADIUS + 18;
    return distance >= ringInner && distance <= ringOuter;
  }, []);

  const dialPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) =>
          !status.isActive && isNearRing(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onMoveShouldSetPanResponderCapture: (event) =>
          !status.isActive && (ringDragActiveRef.current || isNearRing(event.nativeEvent.locationX, event.nativeEvent.locationY)),
        onStartShouldSetPanResponder: (event) =>
          !status.isActive && isNearRing(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onMoveShouldSetPanResponder: (event) =>
          !status.isActive && (ringDragActiveRef.current || isNearRing(event.nativeEvent.locationX, event.nativeEvent.locationY)),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          ringDragActiveRef.current = true;
          setDialDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          applyQuickZenFromScreenPoint(gesture.moveX, gesture.moveY);
        },
        onPanResponderRelease: () => {
          ringDragActiveRef.current = false;
          setDialDragging(false);
        },
        onPanResponderTerminate: () => {
          ringDragActiveRef.current = false;
          setDialDragging(false);
        },
      }),
    [applyQuickZenFromScreenPoint, isNearRing, status.isActive]
  );

  const nudgeQuickZen = useCallback((direction: -1 | 1) => {
    ringDragActiveRef.current = false;
    setDialDragging(false);
    setQuickZenMinutes((prev) => {
      const next = prev + direction * QUICK_ZEN_STEP;
      return Math.max(QUICK_ZEN_MIN, Math.min(QUICK_ZEN_MAX, next));
    });
  }, []);

  const startSelectedSession = async () => {
    if (!sheetSession) return;
    const ready = await ensureZenPrerequisites();
    if (!ready) return;
    await syncBlockedAppsBeforeStart();
    if (status.isActive) {
      ZenoxEngine.stopZen();
      closeSessionSheet();
    } else {
      setOptimisticZen(true);
      animateThemeCascade(1);
      ZenoxEngine.startZen(durationDraft * 60, fortressMode);
      setTimeout(() => {
        closeSessionSheet();
      }, 360);
      setTimeout(() => {
        if (!statusActiveRef.current) {
          setOptimisticZen(false);
          animateThemeCascade(0);
        }
      }, 3000);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const startInstantZen = async () => {
    const ready = await ensureZenPrerequisites();
    if (!ready) return;
    await syncBlockedAppsBeforeStart();
    if (status.isActive) {
      ZenoxEngine.stopZen();
      setOptimisticZen(false);
      animateThemeCascade(0);
    } else {
      setOptimisticZen(true);
      animateThemeCascade(1);
      const durationSeconds = quickZenMinutes * 60;
      setActiveTotalSeconds(durationSeconds);
      ZenoxEngine.startZen(durationSeconds);
      setTimeout(() => {
        if (!statusActiveRef.current) {
          setOptimisticZen(false);
          animateThemeCascade(0);
        }
      }, 3000);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const goToBlockedApps = () => {
    navigation.navigate('AppList');
  };

  const openSideMenu = () => {
    setMenuOpen(true);
    menuX.value = width;
    menuContentProgress.value = 0;
    menuBackdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    menuX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    menuContentProgress.value = withDelay(120, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  };

  const closeSideMenu = useCallback(() => {
    menuContentProgress.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
    menuBackdropOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
    menuX.value = withTiming(width, { duration: 260, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setMenuOpen(false), 260);
  }, [menuBackdropOpacity, menuContentProgress, menuX, width]);

  const openSettingsFromMenu = () => {
    closeSideMenu();
    navigation.navigate('Settings');
  };

  const openAppsFromMenu = () => {
    closeSideMenu();
    navigation.navigate('AppList');
  };

  const openSchedulesFromMenu = () => {
    closeSideMenu();
    navigation.navigate('Schedule');
  };

  const openNotificationPermissionFromMenu = () => {
    closeSideMenu();
    ZenoxEngine.requestNotificationPermission();
  };

  const increaseDuration = () => setDurationDraft((prev) => Math.min(prev + 5, 180));
  const decreaseDuration = () => setDurationDraft((prev) => Math.max(prev - 5, 10));

  const handleModalPullDown = (deltaY: number) => {
    if (deltaY <= 0) return;
    sheetY.value = Math.min(sheetHeight, sheetDragStartY.current + deltaY);
  };

  const snapModal = (deltaY: number) => {
    if (deltaY > 120) {
      closeSessionSheet();
      return;
    }
    sheetY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  };

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          const isVerticalPull = gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
          const atTop = modalScrollY.current <= 8;
          const strongPullDown = gesture.dy > 22 && gesture.vy > 0.6;
          return isVerticalPull && (atTop || strongPullDown);
        },
        onMoveShouldSetPanResponder: (_, gesture) =>
          modalScrollY.current <= 8 && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          sheetDragStartY.current = sheetY.value;
        },
        onPanResponderMove: (_, gesture) => {
          handleModalPullDown(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          snapModal(gesture.dy);
        },
      }),
    [sheetY]
  );

  const sideMenuPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > Math.abs(gesture.dy) && gesture.dx > 6,
        onPanResponderGrant: () => {
          menuDragStartX.current = menuX.value;
        },
        onPanResponderMove: (_, gesture) => {
          const nextX = Math.max(0, Math.min(width, menuDragStartX.current + gesture.dx));
          menuX.value = nextX;
          menuBackdropOpacity.value = 1 - nextX / width;
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldClose = gesture.dx > width * 0.18 || gesture.vx > 0.85;
          if (shouldClose) {
            closeSideMenu();
            return;
          }
          menuX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
          menuBackdropOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
        },
      }),
    [closeSideMenu, menuBackdropOpacity, menuX, width]
  );

  const displayTotalSeconds = status.isActive ? Math.max(activeTotalSeconds, 1) : quickZenMinutes * 60;
  const displayRemainingSeconds = status.isActive ? status.remainingSeconds : displayTotalSeconds;
  const progressRatio = Math.min(1, Math.max(0, displayRemainingSeconds / displayTotalSeconds));
  const sliderRatio = (quickZenMinutes - QUICK_ZEN_MIN) / (QUICK_ZEN_MAX - QUICK_ZEN_MIN);
  const ringRatio = status.isActive ? progressRatio : sliderRatio;
  const dashOffset = TIMER_CIRCUMFERENCE * (1 - ringRatio);
  const dialAngle = sliderRatio * Math.PI * 2 - Math.PI / 2;
  const knobX = DIAL_CANVAS / 2 + TIMER_RADIUS * Math.cos(dialAngle);
  const knobY = DIAL_CANVAS / 2 + TIMER_RADIUS * Math.sin(dialAngle);

  return (
    <Animated.View style={[styles.container, pageBackgroundStyle]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!isDialDragging}>
        <Animated.View key={`header-${enterKey}`} entering={FadeInDown.duration(620)} style={styles.headerRow}>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Welcome </Text>
              <Text style={[styles.headerTitle, styles.headerName, { color: colors.text }]}>{userName || 'there'}</Text>
              <View style={styles.streakPill}>
                <Flame color={colors.accent} size={14} />
                <Text style={[styles.streakText, { color: colors.text }]}>{streakDays}</Text>
              </View>
            </View>
            <FocusQuote color={colors.mutedText} />
          </View>
          <TouchableOpacity onPress={openSideMenu} activeOpacity={0.85}>
            <Animated.View style={[styles.headerIconWrap, headerSurfaceStyle]}>
              <UserCircle2 color={colors.text} size={18} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View key={`cta-${enterKey}`} entering={FadeInDown.duration(620).delay(80)}>
          <Animated.View style={[styles.timerCard, statPrimaryStyle]}>
            <View style={styles.timerDialWrap} onLayout={onDialLayout} {...dialPanResponder.panHandlers}>
              <Svg width={DIAL_CANVAS} height={DIAL_CANVAS} style={styles.timerSvg}>
                <Circle
                  cx={DIAL_CANVAS / 2}
                  cy={DIAL_CANVAS / 2}
                  r={TIMER_RADIUS}
                  stroke={status.isActive ? '#262D37' : '#0B0E13'}
                  strokeWidth={TIMER_STROKE}
                  fill="transparent"
                />
                <Circle
                  cx={DIAL_CANVAS / 2}
                  cy={DIAL_CANVAS / 2}
                  r={TIMER_RADIUS}
                  stroke={colors.accent}
                  strokeWidth={TIMER_STROKE}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={`${TIMER_CIRCUMFERENCE} ${TIMER_CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${DIAL_CANVAS / 2} ${DIAL_CANVAS / 2})`}
                />
                {!status.isActive ? (
                  <Circle
                    cx={knobX}
                    cy={knobY}
                    r={15}
                    fill={colors.surface}
                    stroke={colors.accent}
                    strokeWidth={3}
                  />
                ) : null}
              </Svg>
              <View style={styles.timerCenter}>
                <Text style={[styles.timerClock, { color: colors.text }]}>{formatClock(displayRemainingSeconds)}</Text>
                <Text style={[styles.timerSubText, { color: colors.mutedText }]}>
                  {status.isActive ? 'Zen in progress' : `${quickZenMinutes} min preset`}
                </Text>
              </View>
            </View>

            <View style={styles.sliderSection}>
              <View style={styles.sliderHeaderRow}>
                <Text style={[styles.sliderLabel, { color: colors.mutedText }]}>Drag the ring to set minutes</Text>
                <Text style={[styles.sliderValue, { color: colors.text }]}>{quickZenMinutes}m</Text>
              </View>
              <View style={styles.sliderButtonsRow}>
                <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border }]} onPress={() => nudgeQuickZen(-1)} disabled={status.isActive}>
                  <Text style={[styles.adjustBtnText, { color: colors.text }]}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border }]} onPress={() => nudgeQuickZen(1)} disabled={status.isActive}>
                  <Text style={[styles.adjustBtnText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={[styles.instantButton, ctaStyle]}>
              <TouchableOpacity style={styles.instantButtonTouch} onPress={startInstantZen}>
                <Text style={[styles.instantButtonText, { color: colors.text }]}>{status.isActive ? 'End Zen' : 'Start Zen'}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View key={`stats-${enterKey}`} entering={FadeInDown.duration(620).delay(140)} style={styles.bentleyGrid}>
          <Animated.View style={[styles.primaryStatCard, { backgroundColor: '#EF6A3E', borderColor: '#F38B68' }]}>
            <View style={styles.statIconWrap}>
              <Clock3 color="#FFFFFF" size={16} />
              <Text style={styles.statMetaOnColor}>{stats[0].meta}</Text>
            </View>
            <Text style={[styles.primaryStatValue, { color: colors.text }]}>{stats[0].value}</Text>
            <Text style={[styles.primaryStatLabel, { color: '#FFEADD' }]}>{stats[0].label}</Text>
          </Animated.View>

          <View style={styles.secondaryStatsCol}>
            <Animated.View style={[styles.secondaryStatCard, { backgroundColor: '#226A58', borderColor: '#2F8A73' }]}>
              <View style={styles.statIconWrap}>
                <ShieldBan color="#FFFFFF" size={15} />
                <Text style={styles.statMetaOnColor}>{stats[1].meta}</Text>
              </View>
              <Text style={[styles.secondaryStatValue, { color: colors.text }]}>{stats[1].value}</Text>
              <Text style={[styles.secondaryStatLabel, { color: '#D1FFF2' }]}>{stats[1].label}</Text>
            </Animated.View>
            <Animated.View style={[styles.secondaryStatCard, { backgroundColor: '#2E4FB7', borderColor: '#4E73E0' }]}>
              <View style={styles.statIconWrap}>
                <Target color="#FFFFFF" size={15} />
                <Text style={styles.statMetaOnColor}>{stats[2].meta}</Text>
              </View>
              <Text style={[styles.secondaryStatValue, { color: colors.text }]}>{stats[2].value}</Text>
              <Text style={[styles.secondaryStatLabel, { color: '#E0E8FF' }]}>{stats[2].label}</Text>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View
          key={`carousel-${enterKey}`}
          entering={FadeInDown.duration(620).delay(200)}
          style={[styles.carouselBleed, carouselSurfaceStyle]}
        >
          <FlatList
            data={SESSIONS}
            horizontal
            snapToAlignment="start"
            snapToInterval={266}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={() => {
              Haptics.selectionAsync().catch(() => undefined);
            }}
            renderItem={({ item }) => (
              <FocusCard
                title={item.title}
                description={item.description}
                durationLabel={prettyDuration(item.durationMinutes)}
                icon={item.icon}
                imageUri={item.imageUri}
                onPress={() => openSessionSheet(item)}
              />
            )}
          />
        </Animated.View>
      </ScrollView>

      <Modal animationType="none" transparent visible={isMenuOpen} onRequestClose={closeSideMenu}>
        <Animated.View pointerEvents="auto" style={[styles.menuBackdrop, menuBackdropStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSideMenu} />
        </Animated.View>
        <Animated.View
          style={[styles.sideMenu, { backgroundColor: colors.surface, borderColor: colors.border }, menuStyle]}
          {...sideMenuPanResponder.panHandlers}
        >
          <SafeAreaView style={styles.sideMenuSafe} edges={['top', 'bottom']}>
            <TouchableOpacity style={styles.menuCloseIcon} onPress={closeSideMenu}>
              <X color={colors.text} size={26} />
            </TouchableOpacity>

            <Animated.View style={[styles.sideMenuHeader, menuHeaderStyle]}>
              <UserCircle2 color={colors.accent} size={88} />
              <Text style={[styles.sideMenuTitle, { color: colors.text }]}>{userName || 'Zenox User'}</Text>
              <Text style={[styles.sideMenuSub, { color: colors.mutedText }]}>Account & Controls</Text>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onPress={openAppsFromMenu}>
                <ShieldBan color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>Manage Blocked Apps</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onPress={openSchedulesFromMenu}>
                <CalendarClock color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>Schedules</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onPress={openSettingsFromMenu}>
                <SettingsIcon color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>Settings</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onPress={openNotificationPermissionFromMenu}>
                <BellRing color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>Notifications</Text>
              </TouchableOpacity>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      <Modal animationType="none" transparent visible={!!sheetSession} onRequestClose={closeSessionSheet}>
        <View style={styles.sheetRoot}>
          <Animated.View style={[styles.sheetBackdrop, backdropStyle]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSessionSheet} />
          </Animated.View>

          <Animated.View
            style={[styles.sheet, { height: sheetHeight, backgroundColor: colors.surface, borderColor: colors.border }, sheetStyle]}
            {...sheetPanResponder.panHandlers}
          >
            {sheetSession ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
                onScroll={(event) => {
                  modalScrollY.current = event.nativeEvent.contentOffset.y;
                  if (event.nativeEvent.contentOffset.y < -40) {
                    closeSessionSheet();
                  }
                }}
                onScrollEndDrag={(event) => {
                  const y = event.nativeEvent.contentOffset.y;
                  const vy = event.nativeEvent.velocity?.y ?? 0;
                  if (y <= 2 && vy < -0.9) {
                    closeSessionSheet();
                  }
                }}
                scrollEventThrottle={16}
                bounces
                alwaysBounceVertical
              >
                <View style={styles.sheetDragArea}>
                  <Animated.View entering={FadeInDown.duration(760)} style={styles.sheetGrabber} />
                </View>

                <Animated.View entering={FadeInDown.duration(760).delay(80)}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{sheetSession.title}</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.mutedText }]}>{sheetSession.description}</Text>
                </Animated.View>

                <Animated.View entering={FadeInRight.duration(760).delay(150)} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Session Length</Text>
                  <View style={styles.durationAdjuster}>
                    <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border }]} onPress={decreaseDuration}>
                      <Text style={[styles.adjustBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.durationValue, { color: colors.text }]}>{formatDuration(durationDraft)}</Text>
                    <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border }]} onPress={increaseDuration}>
                      <Text style={[styles.adjustBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInLeft.duration(760).delay(220)} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Blocked Apps</Text>
                  <View style={styles.appChips}>
                    {sheetSession.blockedApps.map((app) => (
                      <View key={app} style={[styles.appChip, { borderColor: colors.border }]}>
                        <Text style={[styles.appChipText, { color: colors.text }]}>{app}</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInRight.duration(760).delay(300)} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Customize</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.modePill, { borderColor: colors.border }, !fortressMode ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                      onPress={() => setFortressMode(false)}
                    >
                      <Text style={[styles.modePillText, { color: !fortressMode ? colors.text : colors.mutedText }]}>Normal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modePill, { borderColor: colors.border }, fortressMode ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                      onPress={() => setFortressMode(true)}
                    >
                      <Text style={[styles.modePillText, { color: fortressMode ? colors.text : colors.mutedText }]}>Fortress</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(760).delay(360)} style={styles.sheetActions}>
                  <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={goToBlockedApps}>
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Change Blocked Apps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={startSelectedSession}>
                    <Text style={[styles.primaryBtnText, { color: colors.text }]}>{status.isActive ? 'End Session' : 'Start Session'}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </ScrollView>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isNameModalOpen}>
        <View style={styles.nameBackdrop}>
          <View style={[styles.nameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.nameTitle, { color: colors.text }]}>Welcome to Zenox</Text>
            <Text style={[styles.nameSubtitle, { color: colors.mutedText }]}>What should we call you?</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              style={[styles.nameInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={colors.mutedText}
            />
            <TouchableOpacity style={[styles.nameButton, { backgroundColor: colors.accent }]} onPress={saveName}>
              <Text style={[styles.nameButtonText, { color: colors.text }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
    gap: Theme.spacing.lg,
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  headerTitle: {
    fontSize: Theme.type.h1,
    fontWeight: '400',
    fontFamily: 'SNPro_Bold',
    letterSpacing: 0.1,
  },
  headerName: {
    fontStyle: 'normal',
    fontFamily: 'SNPro_Bold',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#3A3A41',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  carouselContent: {
    paddingVertical: 4,
    paddingRight: Theme.spacing.md,
  },
  carouselBleed: {
    marginRight: -Theme.spacing.md,
  },
  bentleyGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  primaryStatCard: {
    flex: 1.4,
    minHeight: 92,
    borderWidth: 1,
    borderRadius: Theme.radius.md,
    padding: 10,
    justifyContent: 'space-between',
  },
  primaryStatValue: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'SNPro_Bold',
  },
  primaryStatLabel: {
    fontSize: 13,
    fontFamily: 'SNPro_Bold',
  },
  secondaryStatsCol: {
    flex: 1,
    gap: Theme.spacing.sm,
  },
  secondaryStatCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Theme.radius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  secondaryStatValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'SNPro_Bold',
  },
  secondaryStatLabel: {
    fontSize: 12,
    fontFamily: 'SNPro_Bold',
  },
  statIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statMetaOnColor: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontFamily: 'SNPro_Regular',
  },
  instantButton: {
    marginTop: Theme.spacing.md,
    height: 56,
    borderRadius: Theme.radius.lg,
  },
  instantButtonTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timerCard: {
    borderWidth: 1,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.md,
  },
  timerDialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSvg: {
    transform: [{ rotate: '0deg' }],
  },
  timerCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: TIMER_SIZE,
  },
  timerClock: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 0,
    minWidth: 170,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    fontFamily: 'SNPro_Bold',
  },
  timerSubText: {
    marginTop: 6,
    fontSize: Theme.type.body,
    fontFamily: 'SNPro_Regular',
  },
  sliderSection: {
    marginTop: Theme.spacing.md,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: Theme.type.body,
    fontWeight: '700',
  },
  sliderButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 20,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 21,
  },
  sideMenuSafe: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  menuCloseIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  sideMenuHeader: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  sideMenuTitle: {
    marginTop: 6,
    fontSize: 26,
    fontFamily: 'SNPro_Bold',
    textAlign: 'center',
  },
  sideMenuSub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  sideMenuItem: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  sideMenuItemText: {
    fontSize: 15,
    fontFamily: 'SNPro_Bold',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
  },
  sheetGrabber: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#4B5563',
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  sheetDragArea: {
    paddingTop: 2,
    paddingBottom: 6,
  },
  sheetScrollContent: {
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: Theme.type.body,
    marginTop: 8,
    marginBottom: Theme.spacing.md,
  },
  detailRow: {
    marginBottom: Theme.spacing.md,
  },
  detailLabel: {
    fontSize: Theme.type.h2,
    fontWeight: '700',
    marginBottom: 10,
  },
  durationAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3E3E46',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  adjustBtnText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  appChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#3A3A41',
    borderWidth: 1,
  },
  appChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#3A3A41',
  },
  modePillText: {
    fontWeight: '600',
  },
  sheetActions: {
    marginTop: 2,
    gap: 10,
    paddingBottom: 8,
  },
  primaryBtn: {
    height: 50,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontWeight: '700',
    fontSize: Theme.type.body,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A41',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: Theme.type.body,
  },
  nameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  nameCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
  },
  nameTitle: {
    fontSize: Theme.type.h2,
    fontWeight: '700',
  },
  nameSubtitle: {
    fontSize: Theme.type.body,
    marginTop: 6,
    marginBottom: Theme.spacing.md,
  },
  nameInput: {
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    backgroundColor: '#2A2A2F',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameButton: {
    marginTop: Theme.spacing.md,
    height: 48,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameButtonText: {
    fontSize: Theme.type.body,
    fontWeight: '700',
  },
});
