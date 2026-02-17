import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { AppScanner, AppInfo } from '../services/AppScanner';
import { useZenStore } from '../store/zenStore';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { Theme, getThemeColors } from '../theme/Theme';
import { useAppPreferences } from '../preferences/AppPreferencesContext';

type BlockedAppItem = {
  packageName: string;
  appName: string;
  iconBase64?: string;
};

type AppListProps = {
  onClose?: () => void;
  selectedApps?: BlockedAppItem[];
  onSaveSelectedApps?: (apps: BlockedAppItem[]) => void;
  title?: string;
};

export const AppList = ({ onClose, selectedApps, onSaveSelectedApps, title }: AppListProps) => {
  const navigation = useNavigation<any>();
  const status = useZenoxStatus();
  const { t, themeMode } = useAppPreferences();
  const colors = getThemeColors(status.isActive, themeMode);

  const { installedApps, setInstalledApps, blockedApps, fetchBlockedApps, setBlockedApps } = useZenStore();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(installedApps.length === 0);

  const isCustomSelectionMode = !!onSaveSelectedApps;
  const [localSelection, setLocalSelection] = useState<BlockedAppItem[]>(selectedApps ?? []);
  const effectiveSelectedApps = isCustomSelectionMode ? localSelection : blockedApps;
  const blockedSet = useMemo(() => new Set(effectiveSelectedApps.map((a: any) => a.packageName)), [effectiveSelectedApps]);

  useEffect(() => {
    const load = async () => {
      try {
        if (installedApps.length === 0) {
          const installed = await AppScanner.getInstalledApps();
          setInstalledApps(installed);
        }
        if (!isCustomSelectionMode) {
          await fetchBlockedApps();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchBlockedApps, installedApps.length, isCustomSelectionMode, setInstalledApps]);

  useEffect(() => {
    if (selectedApps) {
      setLocalSelection(selectedApps);
    }
  }, [selectedApps]);

  const toggleAppBlock = useCallback(
    async (app: AppInfo, newValue: boolean) => {
      try {
        let newBlockedList = [...effectiveSelectedApps];
        if (newValue) {
          if (!newBlockedList.some((a: any) => a.packageName === app.packageName)) {
            newBlockedList.push({
              packageName: app.packageName,
              appName: app.appName,
              iconBase64: app.icon,
            });
          }
        } else {
          newBlockedList = newBlockedList.filter((a: any) => a.packageName !== app.packageName);
        }
        if (isCustomSelectionMode) {
          setLocalSelection(newBlockedList);
          onSaveSelectedApps?.(newBlockedList);
        } else {
          await setBlockedApps(newBlockedList);
        }
      } catch (e) {
        console.error('Failed to toggle app block:', e);
      }
    },
    [effectiveSelectedApps, isCustomSelectionMode, onSaveSelectedApps, setBlockedApps]
  );

  const filteredApps = useMemo(
    () =>
      installedApps.filter((app: AppInfo) => app.appName.toLowerCase().includes(searchText.toLowerCase())),
    [installedApps, searchText]
  );

  const renderItem = ({ item }: { item: AppInfo }) => {
    const isBlocked = blockedSet.has(item.packageName);
    return (
      <Animated.View entering={FadeInRight.duration(320)} style={styles.itemContainer}>
        {item.icon ? (
          <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.icon} />
        ) : (
          <View style={[styles.icon, { backgroundColor: '#4A4D57' }]} />
        )}
        <View style={styles.infoContainer}>
          <Text style={[styles.appName, { color: colors.text }]} numberOfLines={1}>
            {item.appName}
          </Text>
          <Text style={[styles.packageName, { color: colors.mutedText }]} numberOfLines={1}>
            {item.packageName}
          </Text>
        </View>
        <Switch
          value={isBlocked}
          onValueChange={(val) => toggleAppBlock(item, val)}
          trackColor={{ false: '#4B5563', true: colors.accent }}
          thumbColor="#FFFFFF"
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Animated.View entering={FadeInDown.duration(340)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title ?? t('appList.title')}</Text>
        <TouchableOpacity
          onPress={() => (onClose ? onClose() : navigation.goBack())}
          style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.closeText, { color: colors.text }]}>{t('common.done')}</Text>
        </TouchableOpacity>
      </Animated.View>

      <TextInput
        style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder={t('appList.search')}
        placeholderTextColor={colors.mutedText}
        value={searchText}
        onChangeText={setSearchText}
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.packageName}
          renderItem={renderItem}
          initialNumToRender={20}
          contentContainerStyle={{ paddingBottom: 28 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SNPro_Bold',
  },
  closeButton: {
    minHeight: 36,
    minWidth: 70,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 14,
    fontFamily: 'SNPro_Bold',
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 10,
    fontFamily: 'SNPro_Regular',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#343843',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    marginRight: 10,
  },
  appName: {
    fontSize: 16,
    fontFamily: 'SNPro_Bold',
  },
  packageName: {
    fontSize: 12,
    fontFamily: 'SNPro_Regular',
  },
});
