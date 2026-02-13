import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Switch,
    TextInput,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { AppScanner, AppInfo } from '../services/AppScanner';
import database from '../database';
import { BlockedApp } from '../database/models';
import { Q } from '@nozbe/watermelondb';
import { useZenStore } from '../store/zenStore';

export const AppList = ({ onClose }: { onClose: () => void }) => {
    const { installedApps, setInstalledApps } = useZenStore();
    const [apps, setApps] = useState<AppInfo[]>(installedApps);
    const [searchText, setSearchText] = useState('');
    const [blockedPackageNames, setBlockedPackageNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(installedApps.length === 0);

    useEffect(() => {
        const load = async () => {
            try {
                // Only fetch if not already in store (Dashboard should have pre-fetched)
                let currentApps = installedApps;
                if (currentApps.length === 0) {
                    const installed = await AppScanner.getInstalledApps();
                    setInstalledApps(installed);
                    setApps(installed);
                    currentApps = installed;
                } else {
                    setApps(currentApps);
                }

                // Load blocked apps from DB
                const blockedAppsCollection = database.get<BlockedApp>('blocked_apps');
                const blockedRecords = await blockedAppsCollection.query().fetch();
                const blockedSet = new Set(blockedRecords.map(r => r.packageName));

                setBlockedPackageNames(blockedSet);

                // Sync with Native Module to ensure it's up to date
                AppScanner.setBlockedApps(Array.from(blockedSet));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggleAppBlock = useCallback(async (app: AppInfo, newValue: boolean) => {
        try {
            if (newValue) {
                // Add to DB
                await database.write(async () => {
                    await database.get<BlockedApp>('blocked_apps').create(promo => {
                        promo.packageName = app.packageName;
                        promo.appName = app.appName;
                        promo.iconUrl = app.icon; // Storing base64 directly for MVP
                    });
                });

                setBlockedPackageNames(prev => {
                    const next = new Set(prev);
                    next.add(app.packageName);
                    AppScanner.setBlockedApps(Array.from(next));
                    return next;
                });

            } else {
                // Remove from DB
                const blockedAppsCollection = database.get<BlockedApp>('blocked_apps');
                const appsToDelete = await blockedAppsCollection.query(
                    Q.where('package_name', app.packageName)
                ).fetch();

                if (appsToDelete.length > 0) {
                    await database.write(async () => {
                        for (const a of appsToDelete) {
                            await a.destroyPermanently();
                        }
                    });
                }

                setBlockedPackageNames(prev => {
                    const next = new Set(prev);
                    next.delete(app.packageName);
                    AppScanner.setBlockedApps(Array.from(next));
                    return next;
                });
            }
        } catch (e) {
            console.error('Failed to toggle app block:', e);
        }
    }, []);

    const filteredApps = apps.filter(app =>
        app.appName.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderItem = ({ item }: { item: AppInfo }) => {
        const isBlocked = blockedPackageNames.has(item.packageName);
        return (
            <View style={styles.itemContainer}>
                {item.icon ? (
                    <Image
                        source={{ uri: `data:image/png;base64,${item.icon}` }}
                        style={styles.icon}
                    />
                ) : (
                    <View style={[styles.icon, { backgroundColor: '#ccc' }]} />
                )}
                <View style={styles.infoContainer}>
                    <Text style={styles.appName} numberOfLines={1}>{item.appName}</Text>
                    <Text style={styles.packageName} numberOfLines={1}>{item.packageName}</Text>
                </View>
                <Switch
                    value={isBlocked}
                    onValueChange={(val) => toggleAppBlock(item, val)}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={isBlocked ? '#007AFF' : '#f4f3f4'}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Block List</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>Done</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                style={styles.searchBar}
                placeholder="Search apps..."
                value={searchText}
                onChangeText={setSearchText}
            />

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredApps}
                    keyExtractor={item => item.packageName}
                    renderItem={renderItem}
                    initialNumToRender={15}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50, // Safe area ish
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    closeButton: {
        padding: 10,
    },
    closeText: {
        fontSize: 17,
        color: '#007AFF',
        fontWeight: '600',
    },
    searchBar: {
        height: 40,
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
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
        fontWeight: '500',
        color: '#000',
    },
    packageName: {
        fontSize: 12,
        color: '#8E8E93',
    },
});
