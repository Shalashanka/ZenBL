import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppList, DashboardScreen, HomeScreen, LifeHubScreen, ScheduleScreen, SettingsScreen } from '../screens';
import { palette } from '../theme/palette';

export type RootStackParamList = {
  Tabs: undefined;
  AppList: undefined;
  Schedule: undefined;
};

type RootTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  'Life-Hub': undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

type AnimatedTabIconProps = {
  focused: boolean;
  color: string;
  size: number;
  iconName: keyof typeof Ionicons.glyphMap;
};

const AnimatedTabIcon = ({ focused, color, size, iconName }: AnimatedTabIconProps) => {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
  }, [focused, progress]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withTiming(focused ? -3 : 0, { duration: 280, easing: Easing.out(Easing.cubic) }) },
      { scale: withTiming(focused ? 1.14 : 1, { duration: 280, easing: Easing.out(Easing.cubic) }) },
    ],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: withTiming(focused ? 1 : 0.6, { duration: 280, easing: Easing.out(Easing.cubic) }) }],
  }));

  return (
    <Animated.View style={styles.iconWrap}>
      <Animated.View style={[styles.iconBubble, bubbleStyle]} />
      <Animated.View style={iconWrapStyle}>
        <Ionicons name={iconName} size={size} color={color} />
      </Animated.View>
    </Animated.View>
  );
};

const RootTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: palette.inkSoft },
        tabBarStyle: {
          backgroundColor: palette.ink,
          borderTopColor: '#00000000',
          height: 80,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: palette.paper,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'Dashboard') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          if (route.name === 'Life-Hub') iconName = focused ? 'leaf' : 'leaf-outline';
          if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <AnimatedTabIcon focused={focused} color={color} size={size} iconName={iconName} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Life-Hub" component={LifeHubScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={RootTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AppList" component={AppList} options={{ title: 'Blocked Apps' }} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Schedules' }} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    position: 'absolute',
    width: 34,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 235, 222, 0.14)',
  },
});
