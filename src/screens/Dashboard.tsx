import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useAccessibilityPermission } from '../hooks/useAccessibilityPermission';
import { AppScanner } from '../services/AppScanner';
import { useZenStore } from '../store/zenStore';
import { ZenAudio } from '../services/ZenAudio';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';

import { ScheduleManager } from '../services/ScheduleManager';
// Screens handled by App.tsx now

interface DashboardProps {
    onOpenAppList: () => void;
    onOpenSchedules: () => void;
}

export const Dashboard = ({ onOpenAppList, onOpenSchedules }: DashboardProps) => {
    const { isServiceEnabled, openSettings } = useAccessibilityPermission();
    const [hasOverlayPermission, setHasOverlayPermission] = React.useState(false);
    // Local nav state removed

    // Zen Store
    const {
        isZenModeActive,
        setZenModeActive,
        remainingTime,
        decrementTime,
        zenDuration,
        setZenDuration
    } = useZenStore();

    // Animations
    const overlayOpacity = useSharedValue(0);

    const overlayStyle = useAnimatedStyle(() => {
        return {
            opacity: overlayOpacity.value,
        };
    });

    useEffect(() => {
        const checkOverlay = async () => {
            const hasPermission = await AppScanner.checkOverlayPermission();
            setHasOverlayPermission(hasPermission);
        };
        checkOverlay();

        // Pre-fetch apps in background
        AppScanner.loadApps();

        // Start Schedule Manager
        ScheduleManager.start();

        const interval = setInterval(checkOverlay, 2000);
        return () => clearInterval(interval);
    }, []);

    // Timer Logic moved to GlobalZenOverlay

    const startZenMode = () => {
        setZenModeActive(true);
        ZenAudio.playFlute();

        overlayOpacity.value = withTiming(1, { duration: 3000 }); // Slow fade over 2.5s
    };

    const exitZenMode = () => {
        overlayOpacity.value = withTiming(0, { duration: 1000 }, () => {
            // runOnJS(setZenModeActive)(false); // If needed
        });
        setTimeout(() => setZenModeActive(false), 1000);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isZenModeActive ? "light-content" : "dark-content"} />

            {/* Main Dashboard Content */}
            <View style={styles.header}>
                <Text style={styles.title}>ZenBL</Text>
                <Text style={styles.subtitle}>Focus & Balance</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>System Permissions</Text>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Accessibility</Text>
                    <View style={styles.statusAction}>
                        <View style={[styles.indicator, { backgroundColor: isServiceEnabled ? '#4CAF50' : '#F44336' }]} />
                        {!isServiceEnabled && (
                            <TouchableOpacity style={styles.miniButton} onPress={openSettings}>
                                <Text style={styles.miniButtonText}>Enable</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Overlay</Text>
                    <View style={styles.statusAction}>
                        <View style={[styles.indicator, { backgroundColor: hasOverlayPermission ? '#4CAF50' : '#F44336' }]} />
                        {!hasOverlayPermission && (
                            <TouchableOpacity style={styles.miniButton} onPress={AppScanner.requestOverlayPermission}>
                                <Text style={styles.miniButtonText}>Grant</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.menuContainer}>
                <TouchableOpacity style={[styles.card, styles.menuItem]} onPress={() => {
                    console.log('🔘 Manage Block List Pressed');
                    onOpenAppList();
                }}>
                    <Text style={styles.menuText}>Manage Block List</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, styles.menuItem]} onPress={() => {
                    console.log('🔘 Manage Schedules Pressed');
                    onOpenSchedules();
                }}>
                    <Text style={styles.menuText}>Manage Schedules</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            <TouchableOpacity style={styles.activateButton} onPress={startZenMode}>
                <Text style={styles.activateButtonText}>ACTIVATE ZEN MODE</Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        padding: 20,
        justifyContent: 'center',
    },
    menuContainer: {
        width: '100%',
        gap: 12, // Gap for modern spacing, or use margins if gap not supported in this RN version (0.71+ supports it)
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#8E8E93',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    statusLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    statusAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    miniButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    miniButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginVertical: 12,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
    },
    menuText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    chevron: {
        fontSize: 20,
        color: '#C7C7CC',
        fontWeight: '600',
    },
    activateButton: {
        backgroundColor: '#000000',
        paddingVertical: 20,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    activateButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },

    spacer: {
        height: 20,
    },
});
