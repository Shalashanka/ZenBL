import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NativeZenEngine from '../../specs/NativeZenEngine';

const Engine = NativeZenEngine;

export const useAccessibilityPermission = () => {
    const [isServiceEnabled, setIsServiceEnabled] = useState(false);

    const checkPermission = useCallback(async () => {
        try {
            if (Engine?.isServiceEnabled) {
                const enabled = await Engine.isServiceEnabled();
                setIsServiceEnabled(enabled);
            } else {
                console.warn('ZenEngine Native Module not found');
            }
        } catch (error) {
            console.error('Failed to check accessibility service status:', error);
        }
    }, []);

    const openSettings = useCallback(() => {
        if (Engine?.openAccessibilitySettings) {
            Engine.openAccessibilitySettings();
        } else {
            console.warn('ZenEngine Native Module not found');
        }
    }, []);

    useEffect(() => {
        checkPermission();
        const timer = setTimeout(checkPermission, 1000);

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                checkPermission();
            }
        });

        return () => {
            clearTimeout(timer);
            subscription.remove();
        };
    }, [checkPermission]);

    return {
        isServiceEnabled,
        checkPermission,
        openSettings,
    };
};
