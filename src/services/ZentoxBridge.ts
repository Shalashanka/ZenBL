import { NativeModules, NativeEventEmitter } from 'react-native';
import { AppInfo, DebugState, EngineStatus, ZenSchedule, ZenStatus } from '../types/native';

const { ZentoxBridge } = NativeModules;

if (!ZentoxBridge) {
    console.error("ZentoxBridge native module is not available.");
}

export const ZentoxEventEmitter = new NativeEventEmitter(ZentoxBridge);

export const ZentoxService = {
    startZen: (durationMs: number) => {
        ZentoxBridge.startZen(durationMs);
    },
    triggerManualZen: (durationSec: number, isFortress: boolean) => {
        ZentoxBridge.triggerManualZen(durationSec, isFortress);
    },
    stopZen: () => {
        ZentoxBridge.stopZen();
    },
    getZenStatus: async (): Promise<ZenStatus> => {
        return ZentoxBridge.getZenStatus();
    },
    getEngineStatus: async (): Promise<EngineStatus> => {
        return ZentoxBridge.getEngineStatus();
    },
    getDebugState: async (): Promise<DebugState> => {
        return ZentoxBridge.getDebugState();
    },
    getInstalledApps: async (): Promise<AppInfo[]> => {
        return ZentoxBridge.getInstalledApps();
    },
    fetchBlockedApps: async (): Promise<AppInfo[]> => {
        return ZentoxBridge.fetchBlockedApps();
    },
    setBlockedApps: (apps: AppInfo[]) => {
        ZentoxBridge.setBlockedApps(JSON.stringify(apps));
    },
    fetchSchedules: async (): Promise<ZenSchedule[]> => {
        return ZentoxBridge.fetchSchedules();
    },
    saveSchedule: async (schedule: ZenSchedule): Promise<number> => {
        return ZentoxBridge.saveSchedule(JSON.stringify(schedule));
    },
    deleteSchedule: async (id: number): Promise<boolean> => {
        return ZentoxBridge.deleteSchedule(id);
    },
    isServiceEnabled: async (): Promise<boolean> => {
        return ZentoxBridge.isServiceEnabled();
    },
    openAccessibilitySettings: () => {
        ZentoxBridge.openAccessibilitySettings();
    },
    checkOverlayPermission: async (): Promise<boolean> => {
        return ZentoxBridge.checkOverlayPermission();
    },
    requestOverlayPermission: () => {
        ZentoxBridge.requestOverlayPermission();
    },
    toggleAppBlock: (packageName: string, appName: string, isBlocked: boolean) => {
        ZentoxBridge.toggleAppBlock(packageName, appName, isBlocked);
    }
};
