import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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

const RootTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: palette.inkSoft },
        tabBarStyle: {
          backgroundColor: palette.ink,
          borderTopColor: '#00000000',
          height: 64,
          paddingTop: 6,
          paddingBottom: 12,
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
          return <Ionicons name={iconName} size={size} color={color} />;
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
