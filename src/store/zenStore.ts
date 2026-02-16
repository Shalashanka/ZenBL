import { create } from 'zustand';
import { ZenoxEngine } from '../bridge/ZenoxEngine';

interface ZenState {
    isZenModeActive: boolean;
    zenDuration: number; // in seconds
    remainingTime: number; // in seconds
    zenEndTime: number | null;
    fortressModeEnabled: boolean;
    scheduleName: string;
    // Data
    installedApps: any[];
    schedules: any[];
    blockedApps: any[];

    // Actions
    setZenModeActive: (active: boolean) => void;
    setZenDuration: (duration: number) => void;
    setRemainingTime: (time: number) => void;
    setFortressModeEnabled: (enabled: boolean) => void;
    setInstalledApps: (apps: any[]) => void;
    decrementTime: () => void;

    // Engine-powered actions
    startZenMode: (durationSec: number, scheduleName: string, fortress: boolean) => void;
    stopZenMode: () => void;
    pollEngineStatus: () => Promise<void>;

    // CRUD
    fetchSchedules: () => Promise<void>;
    saveSchedule: (schedule: any) => Promise<void>;
    deleteSchedule: (id: number) => Promise<void>;
    fetchBlockedApps: () => Promise<void>;
    setBlockedApps: (apps: any[]) => Promise<void>;
}

export const useZenStore = create<ZenState>()((set, get) => ({
    isZenModeActive: false,
    zenDuration: 1500, // 25 min default
    remainingTime: 1500,
    zenEndTime: null,
    fortressModeEnabled: false,
    scheduleName: '',
    installedApps: [],
    schedules: [],
    blockedApps: [],

    setZenModeActive: (active) => set({ isZenModeActive: active }),
    setZenDuration: (duration) => set({ zenDuration: duration, remainingTime: duration }),
    setRemainingTime: (time) => set({ remainingTime: time }),
    setFortressModeEnabled: (enabled) => set({ fortressModeEnabled: enabled }),
    setInstalledApps: (apps) => set({ installedApps: apps }),
    decrementTime: () => {
        const { remainingTime } = get();
        if (remainingTime > 0) {
            set({ remainingTime: remainingTime - 1 });
        }
    },

    startZenMode: (durationSec, scheduleName, fortress) => {
        const endTime = Date.now() + durationSec * 1000;
        const startedAt = Date.now();
        set({
            isZenModeActive: true,
            zenEndTime: endTime,
            remainingTime: durationSec,
            fortressModeEnabled: fortress,
            scheduleName: scheduleName,
        });

        if (ZenoxEngine.isAvailable()) {
            console.log(`[ZenStore] triggerManualZen -> t=${startedAt} duration=${durationSec}s fortress=${fortress}`);
            ZenoxEngine.startZen(durationSec, fortress);
            console.log(`[ZenStore] triggerManualZen dispatched -> t=${Date.now()}`);
        } else {
            console.warn('[ZenStore] ZenEngine Native Module not found');
        }

        console.log(`[ZenStore] Starting Zen: ${scheduleName}, Fortress: ${fortress}`);
    },

    stopZenMode: () => {
        set({
            isZenModeActive: false,
            zenEndTime: null,
            fortressModeEnabled: false,
            scheduleName: '',
        });
        if (ZenoxEngine.isAvailable()) {
            console.log(`[ZenStore] Stopping Zen Mode`);
            ZenoxEngine.stopZen();
        }
    },

    pollEngineStatus: async () => {
        if (!ZenoxEngine.isAvailable()) return;
        try {
            const status = await ZenoxEngine.getZenStatus();
            set({
                isZenModeActive: status.isActive,
                remainingTime: status.remainingSeconds,
                scheduleName: status.scheduleName,
                fortressModeEnabled: status.isFortress,
            });
        } catch (e) {
            console.warn('[ZenStore] pollEngineStatus failed', e);
        }
    },

    fetchSchedules: async () => {
        if (!ZenoxEngine.isAvailable()) return;
        try {
            const list = await ZenoxEngine.fetchSchedules();
            set({ schedules: list });
        } catch (e) {
            console.error('[ZenStore] fetchSchedules failed', e);
        }
    },

    saveSchedule: async (schedule) => {
        if (!ZenoxEngine.isAvailable()) return;
        try {
            await ZenoxEngine.saveSchedule(JSON.stringify(schedule));
            await get().fetchSchedules(); // Refresh list
        } catch (e) {
            console.error('[ZenStore] saveSchedule failed', e);
            throw e;
        }
    },

    deleteSchedule: async (id) => {
        if (!ZenoxEngine.isAvailable()) return;
        try {
            await ZenoxEngine.deleteSchedule(id);
            await get().fetchSchedules(); // Refresh list
        } catch (e) {
            console.error('[ZenStore] deleteSchedule failed', e);
            throw e;
        }
    },

    fetchBlockedApps: async () => {
        if (!ZenoxEngine.isAvailable()) return;
        try {
            const list = await ZenoxEngine.fetchBlockedApps();
            set({ blockedApps: list });
        } catch (e) {
            console.error('[ZenStore] fetchBlockedApps failed', e);
        }
    },

    setBlockedApps: async (apps) => {
        if (!ZenoxEngine.isAvailable()) return;
        try {
            ZenoxEngine.setBlockedApps(JSON.stringify(apps));
            set({ blockedApps: apps });
        } catch (e) {
            console.error('[ZenStore] setBlockedApps failed', e);
        }
    },
}));
