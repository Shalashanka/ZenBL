import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

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
    setBlockedApps(json: string): void;
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
}

export default TurboModuleRegistry.get<Spec>('ZenEngine');
