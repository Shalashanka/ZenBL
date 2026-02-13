import { useState, useEffect, useCallback } from 'react';
import { NativeModules, AppState, AppStateStatus } from 'react-native';

const { AppBlocker } = NativeModules;

export const useAccessibilityPermission = () => {
    const [isServiceEnabled, setIsServiceEnabled] = useState(false);

    const checkPermission = useCallback(async () => {
        try {
            if (AppBlocker?.isServiceEnabled) {
                const enabled = await AppBlocker.isServiceEnabled();
                setIsServiceEnabled(enabled);
            } else {
                console.warn('AppBlocker Native Module not found');
            }
        } catch (error) {
            console.error('Failed to check accessibility service status:', error);
        }
    }, []);

    const openSettings = useCallback(() => {
        if (AppBlocker?.openAccessibilitySettings) {
            AppBlocker.openAccessibilitySettings();
        } else {
            console.warn('AppBlocker Native Module not found');
        }
    }, []);

    useEffect(() => {
        checkPermission();
        // Retry logic: sometimes native module is not ready or returns false initially
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
