import { create } from 'zustand';
import { ZentoxService } from '../services/ZentoxBridge';
import { AppInfo, ZenSchedule } from '../types/native';

interface ZentoxState {
    blockedApps: AppInfo[];
    schedules: ZenSchedule[];
    isLoading: boolean;
    fetchBlockedApps: () => Promise<void>;
    fetchSchedules: () => Promise<void>;
    saveSchedule: (schedule: ZenSchedule) => Promise<void>;
    deleteSchedule: (id: number) => Promise<void>;
    toggleAppBlock: (packageName: string, appName: string, isBlocked: boolean) => void;
}

export const useStore = create<ZentoxState>((set, get) => ({
    blockedApps: [],
    schedules: [],
    isLoading: false,

    fetchBlockedApps: async () => {
        set({ isLoading: true });
        try {
            const apps = await ZentoxService.fetchBlockedApps();
            set({ blockedApps: apps });
        } catch (e) {
            console.error(e);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchSchedules: async () => {
        set({ isLoading: true });
        try {
            const schedules = await ZentoxService.fetchSchedules();
            set({ schedules });
        } catch (e) {
            console.error(e);
        } finally {
            set({ isLoading: false });
        }
    },

    saveSchedule: async (schedule: ZenSchedule) => {
        try {
            await ZentoxService.saveSchedule(schedule);
            await get().fetchSchedules();
        } catch (e) {
            console.error(e);
        }
    },

    deleteSchedule: async (id: number) => {
        try {
            await ZentoxService.deleteSchedule(id);
            await get().fetchSchedules();
        } catch (e) {
            console.error(e);
        }
    },

    toggleAppBlock: (packageName: string, appName: string, isBlocked: boolean) => {
        ZentoxService.toggleAppBlock(packageName, appName, isBlocked);
        // Optimistic update
        set((state) => ({
            blockedApps: state.blockedApps.map((app) =>
                app.packageName === packageName ? { ...app, isBlocked } : app
            ) as AppInfo[], // simplified
        }));
    }
}));
