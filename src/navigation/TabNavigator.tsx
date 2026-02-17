import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarChart2, Home, Settings } from 'lucide-react-native';
import { AppList } from '../screens/AppList';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Theme, getThemeColors } from '../theme/Theme';
import { useZenoxStatus } from '../hooks/useZenoxStatus';

export type RootStackParamList = {
  Tabs: undefined;
  AppList: undefined;
  Schedule: undefined;
};

type TabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabIcon = ({ routeName, color, size }: { routeName: string; color: string; size: number }) => {
  return (
    <View style={styles.iconWrap}>
      {routeName === 'Home' ? <Home color={color} size={size} /> : null}
      {routeName === 'Dashboard' ? <BarChart2 color={color} size={size} /> : null}
      {routeName === 'Settings' ? <Settings color={color} size={size} /> : null}
    </View>
  );
};

const Tabs = () => {
  const status = useZenoxStatus();
  const colors = getThemeColors(status.isActive);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => <TabIcon routeName={route.name} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AppList"
        component={AppList}
        options={{
          title: 'Manage Apps',
          headerStyle: { backgroundColor: Theme.colors.surface },
          headerTintColor: Theme.colors.text,
        }}
      />
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Edit Schedules',
          headerStyle: { backgroundColor: Theme.colors.surface },
          headerTintColor: Theme.colors.text,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 32,
  },
});
