import { create } from 'zustand';

interface ZenState {
    isZenModeActive: boolean;
    zenDuration: number; // in seconds
    remainingTime: number; // in seconds
    zenEndTime: number | null; // Timestamp in ms
    setZenModeActive: (active: boolean) => void;
    setZenDuration: (duration: number) => void;
    setRemainingTime: (time: number) => void;
    decrementTime: () => void;

    installedApps: any[]; // Using any for simplicity in this step, ideally AppInfo interface
    setInstalledApps: (apps: any[]) => void;
}

export const useZenStore = create<ZenState>((set, get) => ({
    isZenModeActive: false,
    zenDuration: 20 * 60,
    remainingTime: 20 * 60,
    zenEndTime: null, // New field

    setZenModeActive: (active) => {
        set({ isZenModeActive: active });
        if (!active) {
            set({ zenEndTime: null });
        }
    },

    setZenDuration: (duration) => {
        const now = Date.now();
        const endTime = now + (duration * 1000);
        set({
            zenDuration: duration,
            remainingTime: duration,
            zenEndTime: endTime
        });
    },

    setRemainingTime: (time) => set({ remainingTime: time }),

    decrementTime: () => set((state) => {
        if (!state.zenEndTime) {
            // Fallback if no end time set (manual start without duration?)
            return { remainingTime: Math.max(0, state.remainingTime - 1) };
        }

        const now = Date.now();
        const remaining = Math.ceil((state.zenEndTime - now) / 1000);

        if (remaining <= 0) {
            return { remainingTime: 0, isZenModeActive: false, zenEndTime: null };
        }

        return { remainingTime: remaining };
    }),

    // App Cache
    installedApps: [],
    setInstalledApps: (apps) => set({ installedApps: apps }),
}));
