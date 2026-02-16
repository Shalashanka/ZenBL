import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LifeHubScreen } from '../screens/LifeHubScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AppList } from '../screens/AppList';
import { ScheduleScreen } from '../screens/ScheduleScreen';

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
        tabBarStyle: { backgroundColor: '#ffffff' },
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#777777',
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
