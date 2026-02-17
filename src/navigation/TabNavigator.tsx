import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome6 } from '@expo/vector-icons';
import { BarChart2 } from 'lucide-react-native';
import { AppList } from '../screens/AppList';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Theme, getThemeColors } from '../theme/Theme';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { useAppPreferences } from '../preferences/AppPreferencesContext';

export type RootStackParamList = {
  Tabs: undefined;
  AppList: undefined;
  Schedule: undefined;
  Settings: undefined;
};

type TabParamList = {
  Home: undefined;
  Dashboard: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabIcon = ({ routeName, color, size }: { routeName: string; color: string; size: number }) => {
  return (
    <View style={styles.iconWrap}>
      {routeName === 'Home' ? <FontAwesome6 name="torii-gate" color={color} size={size + 1} /> : null}
      {routeName === 'Dashboard' ? <BarChart2 color={color} size={size} /> : null}
    </View>
  );
};

const Tabs = () => {
  const status = useZenoxStatus();
  const { t, themeMode } = useAppPreferences();
  const colors = getThemeColors(status.isActive, themeMode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopLeftRadius: Theme.radius.lg,
          borderTopRightRadius: Theme.radius.lg,
          height: 82,
          paddingBottom: 14,
          paddingTop: 10,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarLabel: route.name === 'Home' ? t('tabs.home') : t('tabs.dashboard'),
        tabBarIcon: ({ color, size }) => <TabIcon routeName={route.name} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { t, themeMode } = useAppPreferences();
  const colors = getThemeColors(false, themeMode);

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AppList"
        component={AppList}
        options={{
          title: t('stack.manageApps'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: t('stack.editSchedules'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('stack.commandCenter'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
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
