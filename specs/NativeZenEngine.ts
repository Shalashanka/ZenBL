import type { TurboModule } from 'react-native';
import { NativeModules, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
    // Core Methods
    getEngineStatus(): Promise<{
        isActive: boolean;
        remainingSeconds: number;
        scheduleName: string;
        isFortress: boolean;
    }>;
    triggerManualZen(durationSec: number, isFortress: boolean): void;
    getInstalledApps(): Promise<Object[]>;
    stopZen(): void;

    // Blocked Apps CRUD
    setBlockedApps(json: string): Promise<boolean>;
    fetchBlockedApps(): Promise<Object[]>;

    // Schedules CRUD
    fetchSchedules(): Promise<Object[]>;
    saveSchedule(json: string): Promise<number>;
    deleteSchedule(id: number): Promise<boolean>;

    // Utility methods
    openAccessibilitySettings(): void;
    isServiceEnabled(): Promise<boolean>;
    checkOverlayPermission(): Promise<boolean>;
    requestOverlayPermission(): void;
    checkNotificationPermission?(): Promise<boolean>;
    requestNotificationPermission?(): void;
    checkExactAlarmPermission?(): Promise<boolean>;
    requestExactAlarmPermission?(): void;
    setRingerMode?(mode: string): void;
    setActiveProfile?(profileJson: string): void;
    fetchProfileBlockedApps?(profileId: string): Promise<Object[]>;
    setProfileBlockedApps?(profileId: string, json: string): Promise<boolean>;
    getWeeklyStats?(): Promise<
        {
            day: string;
            minutes: number;
            attempts: number;
        }[]
    >;
}

const turbo = TurboModuleRegistry.get<Spec>('ZenoxBridge');

const legacy = (NativeModules as Record<string, Spec | undefined>).ZenoxBridge;

export default (turbo ?? legacy ?? null) as Spec | null;
