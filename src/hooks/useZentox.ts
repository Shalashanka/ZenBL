import { useState, useEffect, useCallback } from 'react';
import { ZentoxService, ZentoxEventEmitter } from '../services/ZentoxBridge';
import { DebugState } from '../types/native';
import { AppState, AppStateStatus } from 'react-native';

export function useZentox() {
    const [debugState, setDebugState] = useState<DebugState | null>(null);

    const fetchState = useCallback(async () => {
        try {
            const state = await ZentoxService.getDebugState();
            setDebugState(state);
        } catch (e) {
            console.error("Failed to fetch Zentox debug state", e);
        }
    }, []);

    useEffect(() => {
        fetchState();

        // Listen to native events
        const subscription = ZentoxEventEmitter.addListener('ZentoxStatusChanged', (payload) => {
            console.log('ZentoxStatusChanged emitted:', payload);
            fetchState();
        });

        // Refresh state when app comes back to foreground
        const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                fetchState();
            }
        });

        return () => {
            subscription.remove();
            appStateSubscription.remove();
        };
    }, [fetchState]);

    return {
        debugState,
        fetchState,
        ZentoxService
    };
}
