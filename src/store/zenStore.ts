import { create } from 'zustand';

interface ZenState {
    isZenModeActive: boolean;
    zenDuration: number; // in seconds
    remainingTime: number; // in seconds
    setZenModeActive: (active: boolean) => void;
    setZenDuration: (duration: number) => void;
    setRemainingTime: (time: number) => void;
    decrementTime: () => void;

    installedApps: any[]; // Using any for simplicity in this step, ideally AppInfo interface
    setInstalledApps: (apps: any[]) => void;
}

export const useZenStore = create<ZenState>((set) => ({
    isZenModeActive: false,
    zenDuration: 20 * 60, // Default 20 mins
    remainingTime: 20 * 60,
    setZenModeActive: (active) => set({ isZenModeActive: active }),
    setZenDuration: (duration) => set({ zenDuration: duration, remainingTime: duration }),
    setRemainingTime: (time) => set({ remainingTime: time }),
    decrementTime: () => set((state) => ({ remainingTime: Math.max(0, state.remainingTime - 1) })),

    // App Cache
    installedApps: [],
    setInstalledApps: (apps) => set({ installedApps: apps }),
}));
