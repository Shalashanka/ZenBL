import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  StatusBar,
  Switch,
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
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { X, Settings as SettingsIcon, UserCircle2, Clock3, ShieldBan, Target, CalendarClock, BellRing, Languages, Volume2, VolumeX, Vibrate } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { WeeklyStat, ZenoxEngine } from '../bridge/ZenoxEngine';
import { AppList } from './AppList';
import { ScheduleScreen } from './ScheduleScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { AppScanner } from '../services/AppScanner';
import { FocusCard } from '../components/FocusCard';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { useZenStore } from '../store/zenStore';
import { Theme, getThemeColors } from '../theme/Theme';
import { useAppPreferences } from '../preferences/AppPreferencesContext';

type Session = {
  id: string;
  title: string;
  durationMinutes: number;
  icon: 'focus' | 'pomodoro' | 'detox' | 'sleep';
  description: string;
  blockedApps: string[];
  imageUri: string;
};

type BlockedAppItem = {
  packageName: string;
  appName: string;
  iconBase64?: string;
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
const PROFILE_PREF_KEY = 'zenox_profile_prefs';
const QUICK_ZEN_MIN = 5;
const QUICK_ZEN_MAX = 120;
const QUICK_ZEN_STEP = 1;
const TIMER_SIZE = 176;
const TIMER_STROKE = 14;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
const DIAL_PAD = 28;
const DIAL_CANVAS = TIMER_SIZE + DIAL_PAD * 2;

const prettyDuration = (mins: number) => `${mins} min`;
const formatDuration = (mins: number) => `${mins}`;
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
  const { t, themeMode, setThemeMode, locale, setLocale, locales } = useAppPreferences();
  const navigation = useNavigation<any>();
  const status = useZenoxStatus();
  const blockedApps = useZenStore((s) => s.blockedApps);
  const fetchBlockedApps = useZenStore((s) => s.fetchBlockedApps);
  const setBlockedApps = useZenStore((s) => s.setBlockedApps);
  const installedApps = useZenStore((s) => s.installedApps);
  const setInstalledApps = useZenStore((s) => s.setInstalledApps);
  const [optimisticZen, setOptimisticZen] = useState(false);
  const statusActiveRef = useRef(status.isActive);
  const colors = getThemeColors(status.isActive || optimisticZen, themeMode);

  const { height, width } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.75);

  const [userName, setUserName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [isNameModalOpen, setNameModalOpen] = useState(false);
  const [quickZenMinutes, setQuickZenMinutes] = useState(60);
  const [activeTotalSeconds, setActiveTotalSeconds] = useState(60 * 60);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [profileBlockedMap, setProfileBlockedMap] = useState<Record<string, BlockedAppItem[]>>({});
  const [profilePrefsMap, setProfilePrefsMap] = useState<Record<string, { silence: boolean; vibrate: boolean }>>({});
  const [statModalType, setStatModalType] = useState<'focus' | 'kills' | 'goal' | null>(null);
  const [isDialDragging, setDialDragging] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isLanguageModalOpen, setLanguageModalOpen] = useState(false);
  const [reopenMenuAfterSheetClose, setReopenMenuAfterSheetClose] = useState(false);
  const [menuGrowRoute, setMenuGrowRoute] = useState<null | 'AppList' | 'Schedule' | 'Settings'>(null);
  const [menuGrowRect, setMenuGrowRect] = useState({ x: 14, y: 160, width: 260, height: 54 });
  const prevZenActiveRef = useRef(status.isActive);
  const dialLayoutRef = useRef({ x: 0, y: 0, width: DIAL_CANVAS, height: DIAL_CANVAS });
  const menuItemLayoutsRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const [sheetSession, setSheetSession] = useState<Session | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'profile' | 'apps' | 'schedule'>('profile');
  const [sheetReturnMode, setSheetReturnMode] = useState<'close' | 'profile' | 'menu'>('close');
  const [durationDraft, setDurationDraft] = useState(60);
  const [fortressMode, setFortressMode] = useState(false);
  const [enterKey, setEnterKey] = useState(0);

  const sheetY = useSharedValue(sheetHeight);
  const sheetExpandProgress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const menuX = useSharedValue(width);
  const menuBackdropOpacity = useSharedValue(0);
  const menuContentProgress = useSharedValue(0);
  const menuGrowProgress = useSharedValue(0);
  const headerThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const carouselThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const statsThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const ctaThemeProgress = useSharedValue(status.isActive ? 1 : 0);
  const audioNormalScale = useSharedValue(1);
  const audioVibrateScale = useSharedValue(1);
  const audioSilentScale = useSharedValue(1);
  const audioNormalRotate = useSharedValue(0);
  const audioVibrateShift = useSharedValue(0);
  const audioSilentRotate = useSharedValue(0);
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
          if (mounted && installedApps.length === 0) {
            const apps = await AppScanner.getInstalledApps();
            setInstalledApps(apps);
          }
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
    }, [fetchBlockedApps, installedApps.length, setInstalledApps])
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
    let mounted = true;
    const loadProfileBlockedMap = async () => {
      try {
        const entries = await Promise.all(
          SESSIONS.map(async (session) => [session.id, await ZenoxEngine.fetchProfileBlockedApps(session.id)] as const),
        );
        if (!mounted) return;
        const next: Record<string, BlockedAppItem[]> = {};
        entries.forEach(([sessionId, apps]) => {
          if (apps.length > 0) next[sessionId] = apps as BlockedAppItem[];
        });
        setProfileBlockedMap(next);
      } catch {
        if (mounted) setProfileBlockedMap({});
      }
    };
    loadProfileBlockedMap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const loadProfilePrefsMap = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_PREF_KEY);
        if (!raw) return;
        setProfilePrefsMap(JSON.parse(raw));
      } catch {
        setProfilePrefsMap({});
      }
    };
    loadProfilePrefsMap();
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
    if (!isSheetOpen) return;

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
  }, [isSheetOpen, sheetHeight, backdropOpacity, sheetY]);

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
      { label: t('home.focusTime'), value: formatMinutesCompact(totalMinutes), meta: t('home.thisWeek'), icon: 'clock' as const },
      { label: t('home.appKills'), value: `${totalAttempts}`, meta: t('home.blockedAppsCount', { count: blockedApps.length }), icon: 'kills' as const },
      { label: t('home.goal'), value: `${goalPct}%`, meta: t('home.toGoal', { count: Math.max(0, 100 - goalPct) }), icon: 'goal' as const },
    ];
  }, [blockedApps.length, t, weeklyStats]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
    height: interpolate(sheetExpandProgress.value, [0, 1], [sheetHeight, height]),
    borderTopLeftRadius: interpolate(sheetExpandProgress.value, [0, 1], [Theme.radius.xl, 0]),
    borderTopRightRadius: interpolate(sheetExpandProgress.value, [0, 1], [Theme.radius.xl, 0]),
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
  const menuGrowStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: interpolate(menuGrowProgress.value, [0, 1], [menuGrowRect.x, 0]),
    top: interpolate(menuGrowProgress.value, [0, 1], [menuGrowRect.y, 0]),
    width: interpolate(menuGrowProgress.value, [0, 1], [menuGrowRect.width, width]),
    height: interpolate(menuGrowProgress.value, [0, 1], [menuGrowRect.height, height]),
    borderRadius: interpolate(menuGrowProgress.value, [0, 1], [14, 0]),
    opacity: menuGrowRoute ? 1 : 0,
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
  const audioNormalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioNormalScale.value }],
  }));
  const audioVibrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioVibrateScale.value }],
  }));
  const audioSilentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioSilentScale.value }],
  }));
  const audioNormalIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${audioNormalRotate.value}deg` }],
  }));
  const audioVibrateIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: audioVibrateShift.value }],
  }));
  const audioSilentIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${audioSilentRotate.value}deg` }],
  }));

  const animateAudioIconTap = useCallback((target: typeof audioNormalScale) => {
    target.value = withSequence(
      withTiming(0.9, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1.12, { damping: 10, stiffness: 210 }),
      withSpring(1, { damping: 12, stiffness: 190 }),
    );
  }, []);
  const animateAudioGlyphTap = useCallback((mode: 'normal' | 'vibrate' | 'silent') => {
    if (mode === 'normal') {
      audioNormalRotate.value = withSequence(
        withTiming(-18, { duration: 70 }),
        withTiming(14, { duration: 70 }),
        withTiming(-10, { duration: 70 }),
        withTiming(8, { duration: 70 }),
        withTiming(0, { duration: 70 }),
      );
      return;
    }
    if (mode === 'vibrate') {
      audioVibrateShift.value = withSequence(
        withTiming(-3, { duration: 55 }),
        withTiming(3, { duration: 55 }),
        withTiming(-2, { duration: 55 }),
        withTiming(2, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
      return;
    }
    audioSilentRotate.value = withSequence(
      withTiming(-22, { duration: 110 }),
      withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) }),
    );
  }, [audioNormalRotate, audioSilentRotate, audioVibrateShift]);

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
    setSheetMode('profile');
    setSheetReturnMode('close');
    setSheetOpen(true);
    sheetExpandProgress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    setDurationDraft(session.durationMinutes);
    setFortressMode(false);
    ZenoxEngine.fetchProfileBlockedApps(session.id)
      .then((apps) => {
        if (apps.length > 0) {
          setProfileBlockedMap((prev) => ({ ...prev, [session.id]: apps as BlockedAppItem[] }));
        }
      })
      .catch(() => undefined);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const closeSessionSheet = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
    sheetExpandProgress.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
    sheetY.value = withTiming(
      sheetHeight,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setSheetSession)(null);
          runOnJS(setSheetMode)('profile');
          runOnJS(setSheetReturnMode)('close');
          runOnJS(setSheetOpen)(false);
        }
      }
    );
  }, [backdropOpacity, sheetExpandProgress, sheetHeight, sheetY]);

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

  const persistProfileBlockedApps = useCallback(async (profileId: string, apps: BlockedAppItem[]) => {
    const next = { ...profileBlockedMap, [profileId]: apps };
    setProfileBlockedMap(next);
    await ZenoxEngine.setProfileBlockedApps(profileId, JSON.stringify(apps));
  }, [profileBlockedMap]);

  const persistProfilePrefsMap = useCallback(async (next: Record<string, { silence: boolean; vibrate: boolean }>) => {
    setProfilePrefsMap(next);
    await AsyncStorage.setItem(PROFILE_PREF_KEY, JSON.stringify(next));
  }, []);

  const getProfileBlockedApps = useCallback(
    (sessionId: string): BlockedAppItem[] => {
      const existing = profileBlockedMap[sessionId];
      if (existing && existing.length > 0) return existing;
      return (blockedApps as BlockedAppItem[]) ?? [];
    },
    [blockedApps, profileBlockedMap]
  );

  const ensureZenPrerequisites = useCallback(async (): Promise<boolean> => {
    const [serviceEnabled, overlayAllowed] = await Promise.all([
      ZenoxEngine.isServiceEnabled(),
      ZenoxEngine.checkOverlayPermission(),
    ]);

    if (!serviceEnabled) {
      Alert.alert(
        t('alerts.accessibilityRequiredTitle'),
        t('alerts.accessibilityRequiredBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('alerts.openSettings'), onPress: () => ZenoxEngine.openAccessibilitySettings() },
        ],
      );
      return false;
    }

    if (!overlayAllowed) {
      Alert.alert(
        t('alerts.overlayRequiredTitle'),
        t('alerts.overlayRequiredBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('alerts.openSettings'), onPress: () => ZenoxEngine.requestOverlayPermission() },
        ],
      );
      return false;
    }

    const notificationAllowed = await ZenoxEngine.checkNotificationPermission();
    if (!notificationAllowed) {
      Alert.alert(
        t('alerts.notificationsDisabledTitle'),
        t('alerts.notificationsDisabledBody'),
        [
          { text: t('alerts.skip'), style: 'cancel' },
          { text: t('alerts.openSettings'), onPress: () => ZenoxEngine.requestNotificationPermission() },
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

  const dialPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => !status.isActive,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          !status.isActive && (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1),
        onStartShouldSetPanResponder: () => !status.isActive,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !status.isActive && (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          ringDragActiveRef.current = true;
          setDialDragging(true);
          applyQuickZenFromScreenPoint(event.nativeEvent.pageX, event.nativeEvent.pageY);
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
        onShouldBlockNativeResponder: () => true,
      }),
    [applyQuickZenFromScreenPoint, status.isActive]
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
    const profileApps = getProfileBlockedApps(sheetSession.id);
    if (profileApps.length === 0) {
      await syncBlockedAppsBeforeStart();
    }
    ZenoxEngine.setActiveProfile({
      id: Math.max(SESSIONS.findIndex((s) => s.id === sheetSession.id) + 1, 1),
      name: sheetSession.title,
      blockedApps: profileApps.map((a) => a.packageName),
    });
    if (status.isActive) {
      ZenoxEngine.stopZen();
      ZenoxEngine.setRingerMode('normal');
      closeSessionSheet();
    } else {
      setOptimisticZen(true);
      animateThemeCascade(1);
      ZenoxEngine.setRingerMode(profileAudioMode);
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
    ZenoxEngine.setActiveProfile({
      id: 0,
      name: t('home.quickZen'),
      blockedApps: (blockedApps as BlockedAppItem[]).map((a) => a.packageName),
    });
    if (status.isActive) {
      ZenoxEngine.stopZen();
      ZenoxEngine.setRingerMode('normal');
      setOptimisticZen(false);
      animateThemeCascade(0);
    } else {
      setOptimisticZen(true);
      animateThemeCascade(1);
      ZenoxEngine.setRingerMode('normal');
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

  const openFullSheet = useCallback((mode: 'apps' | 'schedule', returnMode: 'close' | 'profile' | 'menu') => {
    setSheetMode(mode);
    setSheetReturnMode(returnMode);
    setSheetOpen(true);
    sheetExpandProgress.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
  }, [sheetExpandProgress]);

  const goToBlockedApps = () => {
    if (sheetSession) {
      openFullSheet('apps', 'profile');
      return;
    }
    openFullSheet('apps', 'menu');
  };

  const goToSchedules = () => {
    if (sheetSession) {
      openFullSheet('schedule', 'profile');
      return;
    }
    openFullSheet('schedule', 'menu');
  };

  const returnFromFullSheet = useCallback(() => {
    if (sheetReturnMode === 'profile' && sheetSession) {
      setSheetMode('profile');
      sheetExpandProgress.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      return;
    }
    if (sheetReturnMode === 'menu') {
      setReopenMenuAfterSheetClose(true);
      closeSessionSheet();
      return;
    }
    closeSessionSheet();
  }, [closeSessionSheet, sheetExpandProgress, sheetReturnMode, sheetSession]);

  const openSideMenu = () => {
    setMenuOpen(true);
    menuX.value = width;
    menuContentProgress.value = 0;
    menuBackdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    menuX.value = withSpring(0, { damping: 18, stiffness: 180, mass: 0.9 });
    menuContentProgress.value = withDelay(120, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  };

  const closeSideMenu = useCallback(() => {
    menuContentProgress.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
    menuBackdropOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
    menuX.value = withSpring(width, { damping: 20, stiffness: 210, mass: 0.9 });
    setTimeout(() => setMenuOpen(false), 260);
  }, [menuBackdropOpacity, menuContentProgress, menuX, width]);

  useEffect(() => {
    if (reopenMenuAfterSheetClose && !isSheetOpen) {
      setReopenMenuAfterSheetClose(false);
      openSideMenu();
    }
  }, [isSheetOpen, reopenMenuAfterSheetClose]);

  const openSettingsFromMenu = () => {
    startMenuRouteTransition('settings', 'Settings');
  };

  const openAppsFromMenu = () => {
    startMenuRouteTransition('apps', 'AppList');
  };

  const openSchedulesFromMenu = () => {
    startMenuRouteTransition('schedule', 'Schedule');
  };

  const openNotificationPermissionFromMenu = () => {
    closeSideMenu();
    ZenoxEngine.requestNotificationPermission();
  };
  const openLanguageModalFromMenu = () => {
    closeSideMenu();
    setTimeout(() => setLanguageModalOpen(true), 240);
  };

  const onMenuItemLayout = (key: 'apps' | 'schedule' | 'settings', event: LayoutChangeEvent) => {
    const { x, y, width: itemWidth, height: itemHeight } = event.nativeEvent.layout;
    menuItemLayoutsRef.current[key] = { x, y, width: itemWidth, height: itemHeight };
  };

  const completeMenuRouteTransition = useCallback((route: 'AppList' | 'Schedule' | 'Settings') => {
    setMenuGrowRoute(null);
    menuGrowProgress.value = 0;
    setMenuOpen(false);
    navigation.navigate(route);
  }, [menuGrowProgress, navigation]);

  const startMenuRouteTransition = (key: 'apps' | 'schedule' | 'settings', route: 'AppList' | 'Schedule' | 'Settings') => {
    const layout = menuItemLayoutsRef.current[key];
    if (!layout) {
      closeSideMenu();
      navigation.navigate(route);
      return;
    }
    setMenuGrowRect(layout);
    setMenuGrowRoute(route);
    menuGrowProgress.value = 0;
    menuGrowProgress.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(completeMenuRouteTransition)(route);
      }
    });
  };

  const increaseDuration = () => setDurationDraft((prev) => Math.min(prev + 5, 180));
  const decreaseDuration = () => setDurationDraft((prev) => Math.max(prev - 5, 10));

  const handleModalPullDown = (deltaY: number) => {
    if (deltaY <= 0) return;
    sheetY.value = Math.min(sheetHeight, sheetDragStartY.current + deltaY);
  };

  const snapModal = (deltaY: number) => {
    if (deltaY > 120) {
      if ((sheetMode === 'apps' || sheetMode === 'schedule') && sheetReturnMode === 'profile' && sheetSession) {
        returnFromFullSheet();
        return;
      }
      closeSessionSheet();
      return;
    }
    sheetY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  };

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => false,
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          const isVerticalPull = gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
          const atTop = modalScrollY.current <= 20;
          const strongPullDown = gesture.dy > 24;
          return isVerticalPull && (atTop || strongPullDown);
        },
        onMoveShouldSetPanResponder: (_, gesture) =>
          modalScrollY.current <= 20 && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          sheetDragStartY.current = sheetY.value;
        },
        onPanResponderMove: (_, gesture) => {
          handleModalPullDown(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          snapModal(gesture.dy);
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [returnFromFullSheet, sheetMode, sheetReturnMode, sheetSession, sheetY]
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
          menuX.value = withSpring(0, { damping: 18, stiffness: 180, mass: 0.9 });
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
  const isZenPalette = status.isActive || optimisticZen;
  const appKillsWeek = weeklyStats.reduce((acc, item) => acc + Math.max(0, item.attempts), 0);
  const statPalette = isZenPalette
    ? {
        primaryBg: '#2B7A5E',
        primaryBorder: '#3E9D7B',
        primaryText: '#DBFFF1',
        secondary1Bg: '#1E6E64',
        secondary1Border: '#2E8D81',
        secondary1Text: '#D9FFF9',
        secondary2Bg: '#346EA9',
        secondary2Border: '#4A87C7',
        secondary2Text: '#E0F0FF',
      }
    : {
        primaryBg: '#EF6A3E',
        primaryBorder: '#F38B68',
        primaryText: '#FFEADD',
        secondary1Bg: '#226A58',
        secondary1Border: '#2F8A73',
        secondary1Text: '#D1FFF2',
        secondary2Bg: '#2E4FB7',
        secondary2Border: '#4E73E0',
        secondary2Text: '#E0E8FF',
      };
  const appIconByPackage = useMemo(() => {
    const map = new Map<string, string>();
    installedApps.forEach((app: any) => {
      if (app?.packageName) {
        map.set(app.packageName, app.icon ?? '');
      }
    });
    return map;
  }, [installedApps]);
  const appIconByName = useMemo(() => {
    const map = new Map<string, string>();
    installedApps.forEach((app: any) => {
      if (app?.appName) {
        map.set(String(app.appName).toLowerCase(), app.icon ?? '');
      }
    });
    return map;
  }, [installedApps]);
  const currentProfilePrefs =
    (sheetSession && profilePrefsMap[sheetSession.id]) || { silence: false, vibrate: false };
  const profileAudioMode: 'normal' | 'silent' | 'vibrate' =
    currentProfilePrefs.silence ? 'silent' : currentProfilePrefs.vibrate ? 'vibrate' : 'normal';

  const getBlockedIconsForSession = useCallback(
    (session: Session) => {
      const list = getProfileBlockedApps(session.id);
      const sourceApps =
        list.length > 0
          ? list
          : (session.blockedApps.map((name) => ({ packageName: name, appName: name })) as BlockedAppItem[]);
      return sourceApps
        .map((app) => app.iconBase64 || appIconByPackage.get(app.packageName) || appIconByName.get(app.appName.toLowerCase()) || '')
        .filter((icon) => icon.length > 0)
        .slice(0, 3);
    },
    [appIconByName, appIconByPackage, getProfileBlockedApps]
  );

  return (
    <Animated.View style={[styles.container, pageBackgroundStyle]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!isDialDragging}>
        <Animated.View key={`header-${enterKey}`} entering={FadeInDown.duration(620)} style={styles.headerRow}>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('home.welcome')} </Text>
              <Text style={[styles.headerTitle, styles.headerName, { color: colors.text }]}>{userName || t('home.there')}</Text>
            </View>
            {/* TODO(i18n): re-enable quotes after validating typography + character support across all supported languages. */}
            {/* <FocusQuote color={colors.mutedText} /> */}
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
                  {status.isActive ? t('home.zenInProgress') : t('home.minPreset', { minutes: quickZenMinutes })}
                </Text>
              </View>
            </View>

            <View style={styles.sliderSection}>
              <View style={styles.sliderHeaderRow}>
                <Text style={[styles.sliderLabel, { color: colors.mutedText }]}>{t('home.dragRing')}</Text>
                <Text style={[styles.sliderValue, { color: colors.text }]}>{quickZenMinutes}m</Text>
              </View>
              <View style={styles.sliderButtonsRow}>
                <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => nudgeQuickZen(-1)} disabled={status.isActive}>
                  <Text style={[styles.adjustBtnText, { color: colors.text }]}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => nudgeQuickZen(1)} disabled={status.isActive}>
                  <Text style={[styles.adjustBtnText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={[styles.instantButton, ctaStyle]}>
              <TouchableOpacity style={styles.instantButtonTouch} onPress={startInstantZen}>
                <Text style={[styles.instantButtonText, { color: colors.text }]}>{status.isActive ? t('home.endZen') : t('home.startZen')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View key={`stats-${enterKey}`} entering={FadeInDown.duration(620).delay(140)} style={styles.bentleyGrid}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setStatModalType('focus')}>
            <Animated.View style={[styles.primaryStatCard, { backgroundColor: statPalette.primaryBg, borderColor: statPalette.primaryBorder }]}>
              <View style={styles.statIconWrap}>
                <Clock3 color="#FFFFFF" size={16} />
                <Text style={styles.statMetaOnColor}>{stats[0].meta}</Text>
              </View>
              <Text style={[styles.primaryStatValue, { color: colors.text }]}>{stats[0].value}</Text>
              <Text style={[styles.primaryStatLabel, { color: statPalette.primaryText }]}>{stats[0].label}</Text>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.secondaryStatsCol}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setStatModalType('kills')}>
              <Animated.View style={[styles.secondaryStatCard, { backgroundColor: statPalette.secondary1Bg, borderColor: statPalette.secondary1Border }]}>
                <View style={styles.statIconWrap}>
                  <ShieldBan color="#FFFFFF" size={15} />
                  <Text style={styles.statMetaOnColor}>{stats[1].meta}</Text>
                </View>
                <Text style={[styles.secondaryStatValue, { color: colors.text }]}>{stats[1].value}</Text>
                <Text style={[styles.secondaryStatLabel, { color: statPalette.secondary1Text }]}>{stats[1].label}</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setStatModalType('goal')}>
              <Animated.View style={[styles.secondaryStatCard, { backgroundColor: statPalette.secondary2Bg, borderColor: statPalette.secondary2Border }]}>
              <View style={styles.statIconWrap}>
                <Target color="#FFFFFF" size={15} />
                <Text style={styles.statMetaOnColor}>{stats[2].meta}</Text>
              </View>
              <Text style={[styles.secondaryStatValue, { color: colors.text }]}>{stats[2].value}</Text>
              <Text style={[styles.secondaryStatLabel, { color: statPalette.secondary2Text }]}>{stats[2].label}</Text>
              </Animated.View>
            </TouchableOpacity>
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
                blockedAppsCount={getProfileBlockedApps(item.id).length || item.blockedApps.length}
                blockedAppIcons={getBlockedIconsForSession(item)}
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
              <Text style={[styles.sideMenuSub, { color: colors.mutedText }]}>{t('menu.accountControls')}</Text>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onLayout={(e) => onMenuItemLayout('apps', e)} onPress={openAppsFromMenu}>
                <ShieldBan color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>{t('menu.manageBlockedApps')}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onLayout={(e) => onMenuItemLayout('schedule', e)} onPress={openSchedulesFromMenu}>
                <CalendarClock color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>{t('menu.schedules')}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onLayout={(e) => onMenuItemLayout('settings', e)} onPress={openSettingsFromMenu}>
                <SettingsIcon color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>{t('common.settings')}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onPress={openNotificationPermissionFromMenu}>
                <BellRing color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text }]}>{t('common.notifications')}</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={menuItemStyle}>
              <View style={[styles.sideMenuItem, { borderColor: colors.border }]}>
                <Text style={[styles.sideMenuItemText, { color: colors.text, flex: 1 }]}>{t('common.lightMode')}</Text>
                <Switch
                  value={themeMode === 'light'}
                  onValueChange={(enabled) => {
                    setThemeMode(enabled ? 'light' : 'dark');
                  }}
                  trackColor={{ false: '#4B5563', true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Animated.View>
            <Animated.View style={menuItemStyle}>
              <TouchableOpacity style={[styles.sideMenuItem, { borderColor: colors.border }]} onPress={openLanguageModalFromMenu}>
                <Languages color={colors.text} size={18} />
                <Text style={[styles.sideMenuItemText, { color: colors.text, flex: 1 }]}>{t('common.language')}</Text>
                <Text style={[styles.sideMenuLangCode, { color: colors.mutedText }]}>{locale.toUpperCase()}</Text>
              </TouchableOpacity>
            </Animated.View>
            {menuGrowRoute ? <Animated.View style={[styles.menuGrowOverlay, { backgroundColor: colors.surface }, menuGrowStyle]} /> : null}
          </SafeAreaView>
        </Animated.View>
      </Modal>
      <Modal animationType="fade" transparent visible={isLanguageModalOpen} onRequestClose={() => setLanguageModalOpen(false)}>
        <View style={styles.statsBackdrop}>
          <Animated.View entering={FadeInDown.duration(420)} style={[styles.statsSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statsModalHeader}>
              <Text style={[styles.nameTitle, { color: colors.text }]}>{t('common.language')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalOpen(false)}>
                <Text style={[styles.closeTextInline, { color: colors.text }]}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.langChipWrap}>
              {locales.map((entry) => (
                <TouchableOpacity
                  key={entry.code}
                  style={[
                    styles.langChip,
                    { borderColor: colors.border, backgroundColor: entry.code === locale ? colors.accent : colors.surface },
                  ]}
                  onPress={async () => {
                    await setLocale(entry.code);
                    setLanguageModalOpen(false);
                  }}
                >
                  <Text style={[styles.langChipText, { color: colors.text }]}>{entry.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal animationType="none" transparent visible={isSheetOpen} onRequestClose={closeSessionSheet}>
        <View style={styles.sheetRoot}>
          <Animated.View style={[styles.sheetBackdrop, backdropStyle]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSessionSheet} />
          </Animated.View>

          <Animated.View
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }, sheetStyle]}
            {...sheetPanResponder.panHandlers}
          >
            {sheetMode === 'profile' && sheetSession ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
                disableScrollViewPanResponder
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
                  <View {...sheetPanResponder.panHandlers} style={styles.sheetDragTouch} />
                  <Animated.View entering={FadeInDown.duration(760)} style={styles.sheetGrabber} />
                </View>

                <Animated.View entering={FadeInDown.duration(760).delay(80)} style={styles.sheetHeroWrap}>
                  <ImageBackground
                    source={{ uri: sheetSession.imageUri }}
                    style={[styles.sheetHeroImage, { height: Math.round(sheetHeight * 0.62) }]}
                    imageStyle={styles.sheetHeroImageRounded}
                  >
                    <LinearGradient
                      colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.28)', colors.surface]}
                      locations={[0, 0.58, 1]}
                      style={styles.sheetHeroGradient}
                    />
                    <View style={styles.sheetHeroTextWrap}>
                      <Text style={[styles.sheetTitle, { color: '#FFFFFF' }]}>{sheetSession.title}</Text>
                      <Text style={[styles.sheetSubtitle, { color: '#E6EAF3' }]}>{sheetSession.description}</Text>
                    </View>
                  </ImageBackground>
                </Animated.View>

                <Animated.View entering={FadeInRight.duration(760).delay(150)} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t('profile.sessionLength')}</Text>
                  <View style={styles.durationAdjuster}>
                    <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={decreaseDuration}>
                      <Text style={[styles.adjustBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.durationValue, { color: colors.text }]}>{formatDuration(durationDraft)} {t('units.minutes')}</Text>
                    <TouchableOpacity style={[styles.adjustBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={increaseDuration}>
                      <Text style={[styles.adjustBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInLeft.duration(760).delay(220)} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t('profile.blockedApps')}</Text>
                  <View style={styles.appChips}>
                    {(getProfileBlockedApps(sheetSession.id).length > 0
                      ? getProfileBlockedApps(sheetSession.id)
                      : (sheetSession.blockedApps.map((name) => ({
                          packageName: name,
                          appName: name,
                        })) as BlockedAppItem[])).map((app) => {
                      const iconBase64 =
                        app.iconBase64 ||
                        appIconByPackage.get(app.packageName) ||
                        '';
                      return (
                        <View key={app.packageName + app.appName} style={[styles.appChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                          {iconBase64 ? <Image source={{ uri: `data:image/png;base64,${iconBase64}` }} style={styles.appChipIcon} /> : null}
                          <Text style={[styles.appChipText, { color: colors.text }]}>{app.appName}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInRight.duration(760).delay(300)} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t('profile.customize')}</Text>
                  <View style={styles.phoneToggleRow}>
                    <Text style={[styles.phoneToggleLabel, { color: colors.text }]}>{t('profile.audioMode')}</Text>
                    <View style={styles.audioIconsWrap}>
                      <Animated.View style={audioNormalStyle}>
                        <TouchableOpacity
                          style={[styles.audioIconBtn, { borderColor: colors.border, backgroundColor: colors.surface }, profileAudioMode === 'normal' ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                          onPress={async () => {
                            if (!sheetSession) return;
                            animateAudioIconTap(audioNormalScale);
                            animateAudioGlyphTap('normal');
                            const next = {
                              ...profilePrefsMap,
                              [sheetSession.id]: { ...currentProfilePrefs, silence: false, vibrate: false },
                            };
                            await persistProfilePrefsMap(next);
                            ZenoxEngine.setRingerMode('normal');
                          }}
                        >
                          <Animated.View style={audioNormalIconStyle}>
                            <Volume2 color={colors.text} size={15} />
                          </Animated.View>
                        </TouchableOpacity>
                      </Animated.View>
                      <Animated.View style={audioVibrateStyle}>
                        <TouchableOpacity
                          style={[styles.audioIconBtn, { borderColor: colors.border, backgroundColor: colors.surface }, profileAudioMode === 'vibrate' ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                          onPress={async () => {
                            if (!sheetSession) return;
                            animateAudioIconTap(audioVibrateScale);
                            animateAudioGlyphTap('vibrate');
                            const next = {
                              ...profilePrefsMap,
                              [sheetSession.id]: { ...currentProfilePrefs, silence: false, vibrate: true },
                            };
                            await persistProfilePrefsMap(next);
                            ZenoxEngine.setRingerMode('vibrate');
                          }}
                        >
                          <Animated.View style={audioVibrateIconStyle}>
                            <Vibrate color={colors.text} size={15} />
                          </Animated.View>
                        </TouchableOpacity>
                      </Animated.View>
                      <Animated.View style={audioSilentStyle}>
                        <TouchableOpacity
                          style={[styles.audioIconBtn, { borderColor: colors.border, backgroundColor: colors.surface }, profileAudioMode === 'silent' ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                          onPress={async () => {
                            if (!sheetSession) return;
                            animateAudioIconTap(audioSilentScale);
                            animateAudioGlyphTap('silent');
                            const next = {
                              ...profilePrefsMap,
                              [sheetSession.id]: { ...currentProfilePrefs, silence: true, vibrate: false },
                            };
                            await persistProfilePrefsMap(next);
                            ZenoxEngine.setRingerMode('silent');
                          }}
                        >
                          <Animated.View style={audioSilentIconStyle}>
                            <VolumeX color={colors.text} size={15} />
                          </Animated.View>
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  </View>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.modePill, { borderColor: colors.border, backgroundColor: colors.surface }, !fortressMode ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                      onPress={() => setFortressMode(false)}
                    >
                      <Text style={[styles.modePillText, { color: !fortressMode ? colors.text : colors.mutedText }]}>{t('profile.normal')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modePill, { borderColor: colors.border, backgroundColor: colors.surface }, fortressMode ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
                      onPress={() => setFortressMode(true)}
                    >
                      <Text style={[styles.modePillText, { color: fortressMode ? colors.text : colors.mutedText }]}>{t('profile.fortress')}</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(760).delay(360)} style={styles.sheetActions}>
                  <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={goToBlockedApps}>
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t('profile.changeBlockedApps')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={startSelectedSession}>
                    <Text style={[styles.primaryBtnText, { color: colors.text }]}>{status.isActive ? t('profile.endSession') : t('profile.startSession')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </ScrollView>
            ) : null}

            {sheetMode === 'apps' ? (
              <View style={styles.sheetNestedContent}>
                <AppList
                  title={sheetSession ? `${sheetSession.title} ${t('profile.blockedApps')}` : t('home.globalBlockedApps')}
                  onClose={returnFromFullSheet}
                  selectedApps={sheetSession ? getProfileBlockedApps(sheetSession.id) : undefined}
                  onSaveSelectedApps={
                    sheetSession
                      ? async (apps) => {
                          await persistProfileBlockedApps(sheetSession.id, apps);
                        }
                      : undefined
                  }
                />
              </View>
            ) : null}

            {sheetMode === 'schedule' ? (
              <View style={styles.sheetNestedContent}>
                <ScheduleScreen onClose={returnFromFullSheet} />
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isNameModalOpen}>
        <View style={styles.nameBackdrop}>
          <View style={[styles.nameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.nameTitle, { color: colors.text }]}>{t('nameModal.welcome')}</Text>
            <Text style={[styles.nameSubtitle, { color: colors.mutedText }]}>{t('nameModal.question')}</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              style={[styles.nameInput, { borderColor: colors.border, color: colors.text }]}
              placeholder={t('nameModal.placeholder')}
              placeholderTextColor={colors.mutedText}
            />
            <TouchableOpacity style={[styles.nameButton, { backgroundColor: colors.accent }]} onPress={saveName}>
              <Text style={[styles.nameButtonText, { color: colors.text }]}>{t('nameModal.continue')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={!!statModalType} onRequestClose={() => setStatModalType(null)}>
        <View style={styles.statsBackdrop}>
          <Animated.View entering={FadeInDown.duration(420)} style={[styles.statsSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statsModalHeader}>
              <Text style={[styles.nameTitle, { color: colors.text }]}>
                {statModalType === 'focus' ? t('home.focusDetails') : statModalType === 'kills' ? t('home.killsDetails') : t('home.goalDetails')}
              </Text>
              <TouchableOpacity onPress={() => setStatModalType(null)}>
                <Text style={[styles.closeTextInline, { color: colors.text }]}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
            {statModalType === 'focus' ? (
              <Text style={[styles.nameSubtitle, { color: colors.mutedText }]}>
                {t('home.focusDetails') + ': ' + weeklyStats.reduce((acc, item) => acc + item.minutes, 0) + ' ? ' + t('home.dailyAvg', { count: Math.round(weeklyStats.reduce((acc, item) => acc + item.minutes, 0) / Math.max(weeklyStats.length, 1)) })}
              </Text>
            ) : null}
            {statModalType === 'kills' ? (
              <Text style={[styles.nameSubtitle, { color: colors.mutedText }]}>
                {t('home.appKillsWeek', { count: appKillsWeek }) + ' ? ' + t('home.totalGlobalBlocked', { count: blockedApps.length })}
              </Text>
            ) : null}
            {statModalType === 'goal' ? (
              <Text style={[styles.nameSubtitle, { color: colors.mutedText }]}>
                {t('home.goalProgress', { value: stats[2].value }) + ' ? ' + t('home.goalPace')}
              </Text>
            ) : null}
            <ScrollView style={styles.statsModalList} showsVerticalScrollIndicator={false}>
              {statModalType === 'focus'
                ? weeklyStats.map((day, index) => (
                    <Animated.View key={`${day.day}-${index}`} entering={FadeInRight.delay(index * 45).duration(360)} style={[styles.statsModalItem, { borderColor: colors.border }]}>
                      <Text style={[styles.statsModalItemName, { color: colors.text }]}>{day.day}</Text>
                      <Text style={[styles.statsModalItemPkg, { color: colors.mutedText }]}>{day.minutes} {t('units.minutes')}</Text>
                    </Animated.View>
                  ))
                : null}
              {statModalType === 'kills'
                ? (blockedApps as BlockedAppItem[]).map((app, index) => (
                    <Animated.View key={app.packageName} entering={FadeInRight.delay(index * 45).duration(360)} style={[styles.statsModalItem, { borderColor: colors.border }]}>
                      <Text style={[styles.statsModalItemName, { color: colors.text }]}>{app.appName}</Text>
                      <Text style={[styles.statsModalItemPkg, { color: colors.mutedText }]} numberOfLines={1}>
                        {app.packageName}
                      </Text>
                    </Animated.View>
                  ))
                : null}
              {statModalType === 'goal'
                ? weeklyStats.map((day, index) => (
                    <Animated.View key={`${day.day}-goal-${index}`} entering={FadeInRight.delay(index * 45).duration(360)} style={[styles.statsModalItem, { borderColor: colors.border }]}>
                      <Text style={[styles.statsModalItemName, { color: colors.text }]}>{day.day}</Text>
                      <Text style={[styles.statsModalItemPkg, { color: colors.mutedText }]}>
                        {Math.min(100, Math.round((day.minutes / 45) * 100))}% {t('home.dailyTarget')}
                      </Text>
                    </Animated.View>
                  ))
                : null}
            </ScrollView>
          </Animated.View>
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
    gap: 12,
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
    padding: 12,
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
  menuGrowOverlay: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 40,
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
  sideMenuLangCode: {
    fontSize: 12,
    fontFamily: 'SNPro_Bold',
  },
  langChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -2,
  },
  langChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipText: {
    fontSize: 12,
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
    paddingTop: 4,
    paddingBottom: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  sheetDragTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetScrollContent: {
    paddingBottom: 8,
  },
  sheetNestedContent: {
    flex: 1,
    marginTop: 8,
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
  sheetHeroWrap: {
    marginBottom: Theme.spacing.md,
  },
  sheetHeroImage: {
    height: 220,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sheetHeroImageRounded: {
    borderRadius: Theme.radius.lg,
  },
  sheetHeroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetHeroTextWrap: {
    padding: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appChipIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  appChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  phoneToggleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audioIconsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  audioIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A41',
  },
  phoneToggleLabel: {
    fontSize: 14,
    fontFamily: 'SNPro_Regular',
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
  statsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeTextInline: {
    fontSize: 14,
    fontFamily: 'SNPro_Bold',
  },
  statsModalList: {
    maxHeight: 320,
  },
  statsSheet: {
    width: '100%',
    height: '75%',
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    borderWidth: 1,
    padding: Theme.spacing.lg,
    marginTop: 'auto',
  },
  statsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  statsModalItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  statsModalItemName: {
    fontSize: 15,
    fontFamily: 'SNPro_Bold',
  },
  statsModalItemPkg: {
    fontSize: 12,
    marginTop: 3,
    fontFamily: 'SNPro_Regular',
  },
  statsModalEmpty: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: 'SNPro_Regular',
  },
});
