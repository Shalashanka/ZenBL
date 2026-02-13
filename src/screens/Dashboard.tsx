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

export const Dashboard = ({ onOpenAppList }: { onOpenAppList: () => void }) => {
    const { isServiceEnabled, openSettings } = useAccessibilityPermission();
    const [hasOverlayPermission, setHasOverlayPermission] = React.useState(false);

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

        const interval = setInterval(checkOverlay, 2000);
        return () => clearInterval(interval);
    }, []);

    // Timer Logic
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isZenModeActive && remainingTime > 0) {
            timer = setInterval(() => {
                decrementTime();
            }, 1000);
        } else if (remainingTime === 0 && isZenModeActive) {
            exitZenMode();
        }
        return () => clearInterval(timer);
    }, [isZenModeActive, remainingTime]);

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

            <TouchableOpacity style={[styles.card, styles.menuItem]} onPress={onOpenAppList}>
                <Text style={styles.menuText}>Manage Block List</Text>
                <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <TouchableOpacity style={styles.activateButton} onPress={startZenMode}>
                <Text style={styles.activateButtonText}>ACTIVATE ZEN MODE</Text>
            </TouchableOpacity>

            {/* Reanimated Full Screen Overlay */}
            {isZenModeActive && (
                <Animated.View style={[styles.zenOverlay, overlayStyle]}>
                    <Text style={styles.zenTitle}>Zen Mode</Text>
                    <Text style={styles.zenTimer}>{formatTime(remainingTime)}</Text>
                    <Text style={styles.zenQuote}>"Quiet the mind, and the soul will speak."</Text>

                    <TouchableOpacity style={styles.exitButton} onPress={exitZenMode}>
                        <Text style={styles.exitButtonText}>End Session</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
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

    // Zen Overlay Styles
    zenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0F2027', // The Deep Zen Blue
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000, // Cover everything
    },
    zenTitle: {
        fontSize: 32,
        fontWeight: '300',
        color: '#FFFFFF',
        marginBottom: 20,
        letterSpacing: 2,
    },
    zenTimer: {
        fontSize: 80,
        fontWeight: '200',
        color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
        marginBottom: 40,
    },
    zenQuote: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontStyle: 'italic',
        maxWidth: '80%',
        marginBottom: 60,
    },
    exitButton: {
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 30,
    },
    exitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    spacer: {
        height: 20,
    },
});
