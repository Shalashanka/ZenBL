import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import { useZentox } from '../hooks/useZentox';
import { Button } from '../components/Button';
import { createComponentLogger } from '../utils/logger';

const componentLog = createComponentLogger('HomeScreen');

export const HomeScreen: React.FC = () => {
    const { debugState, ZentoxService, fetchState } = useZentox();

    const handleOpenAccessibility = () => {
        componentLog.info('User triggered handleOpenAccessibility');
        ZentoxService.openAccessibilitySettings();
    };

    const handleRequestOverlay = () => {
        componentLog.info('User triggered handleRequestOverlay');
        ZentoxService.requestOverlayPermission();
    };

    const handleStartZen = () => {
        componentLog.info('User triggered handleStartZen -> 60s without Fortress mode');
        ZentoxService.triggerManualZen(60, false);
    };

    const handleStopZen = () => {
        componentLog.info('User triggered handleStopZen');
        ZentoxService.stopZen();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Animated.Text
                    entering={FadeInUp.duration(1000)}
                    style={styles.header}
                >
                    Zentox Debug UI
                </Animated.Text>

                <Animated.View
                    entering={ZoomIn.duration(800).delay(200)}
                    style={styles.statusCard}
                >
                    <Text style={styles.statusText}>
                        Accessibility Enabled: {debugState?.accessibilityEnabled ? '✅ YES' : '❌ NO'}
                    </Text>
                    <Text style={styles.statusText}>
                        Overlay Allowed: {debugState?.overlayAllowed ? '✅ YES' : '❌ NO'}
                    </Text>
                    <Text style={styles.statusText}>
                        Zen Active: {debugState?.isZenActive ? '✅ YES' : '❌ NO'}
                    </Text>
                    {debugState?.isZenActive && (
                        <Text style={styles.statusText}>
                            Remaining Time: {Math.round((debugState?.remainingTime || 0) / 1000)}s
                        </Text>
                    )}
                    <Text style={styles.statusText}>
                        Blocked Apps Count: {debugState?.blockedAppsCount || 0}
                    </Text>
                </Animated.View>

                <Animated.View
                    entering={SlideInDown.springify().damping(15).delay(400)}
                    style={styles.actions}
                >
                    <Button
                        title="Refresh State"
                        onPress={fetchState}
                        variant="secondary"
                    />
                    <Button
                        title="Open Accessibility Settings"
                        onPress={handleOpenAccessibility}
                    />
                    <Button
                        title="Request Overlay Permission"
                        onPress={handleRequestOverlay}
                    />

                    <View style={styles.divider} />

                    <Button
                        title="Start Zen Mode (60s)"
                        onPress={handleStartZen}
                        variant="primary"
                    />
                    <Button
                        title="Stop Zen Mode"
                        onPress={handleStopZen}
                        variant="danger"
                    />
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    container: {
        padding: 24,
        flexGrow: 1,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 24,
        textAlign: 'center',
    },
    statusCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statusText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
        fontWeight: '500',
    },
    actions: {
        flex: 1,
        gap: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#C6C6C8',
        marginVertical: 16,
    },
});
