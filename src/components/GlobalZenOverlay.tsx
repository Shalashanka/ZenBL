import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useZenStore } from '../store/zenStore';

export const GlobalZenOverlay = () => {
    const { isZenModeActive, remainingTime, stopZenMode, decrementTime, fortressModeEnabled } = useZenStore();
    const overlayOpacity = useSharedValue(0);

    const overlayStyle = useAnimatedStyle(() => {
        return {
            opacity: overlayOpacity.value,
        };
    });

    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isZenModeActive) {
            overlayOpacity.value = withTiming(1, { duration: 3000 });

            // Start Timer tick
            interval = setInterval(() => {
                decrementTime();
            }, 1000);

        } else {
            overlayOpacity.value = withTiming(0, { duration: 1000 });
        }

        return () => clearInterval(interval);
    }, [isZenModeActive]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Always render, just control opacity/pointerEvents
    // if (!isVisible) return null; // Removed for stability

    return (
        <Animated.View style={[styles.zenOverlay, overlayStyle, !isZenModeActive && { pointerEvents: 'none' }]}>
            <Text style={styles.zenTitle}>Zen Mode</Text>
            <Text style={styles.zenTimer}>{formatTime(remainingTime)}</Text>
            <Text style={styles.zenQuote}>"Quiet the mind, and the soul will speak."</Text>

            {!fortressModeEnabled && (
                <TouchableOpacity style={styles.exitButton} onPress={() => stopZenMode()}>
                    <Text style={styles.exitButtonText}>End Session</Text>
                </TouchableOpacity>
            )}

            {fortressModeEnabled && (
                <Text style={[styles.zenQuote, { marginTop: 20, fontSize: 14 }]}>🔒 Fortress Mode Active</Text>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    zenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0F2027', // The Deep Zen Blue
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Cover everything
        elevation: 10000,
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
});
