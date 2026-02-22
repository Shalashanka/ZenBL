export interface AppInfo {
    packageName: string;
    appName: string;
}

export interface ZenStatus {
    isActive: boolean;
    remainingTime: number; // in ms
}

export interface EngineStatus {
    isActive: boolean;
    remainingSeconds: number;
    scheduleName: string;
    isFortress: boolean;
}

export interface DebugState {
    accessibilityEnabled: boolean;
    overlayAllowed: boolean;
    blockedAppsCount: number;
    isZenActive: boolean;
    remainingTime: number; // in ms
}

export interface ZenSchedule {
    id: number;
    name: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    daysOfWeek: string;
    isEnabled: boolean;
}
