import NativeZenEngine from '../../specs/NativeZenEngine';

type EngineStatus = {
  isActive: boolean;
  remainingSeconds: number;
  scheduleName: string;
  isFortress: boolean;
};

export type WeeklyStat = {
  day: string;
  minutes: number;
  attempts: number;
};

export type DashboardSummary = {
  todayMinutes: number;
  weekMinutes: number;
  attemptsToday: number;
  attemptsWeek: number;
  blockedAppsCount: number;
  goalProgressPct: number;
  currentStreakDays: number;
};

export type TopBlockedApp = {
  packageName: string;
  appName: string;
  attemptsToday: number;
  attemptsWeek: number;
};

export type SessionHistoryItem = {
  id: string;
  day: string;
  minutes: number;
  attempts: number;
  source: string;
};

export type ZenProfilePayload = {
  id: number;
  name: string;
  blockedApps: string[];
};

const engine = NativeZenEngine as (typeof NativeZenEngine & {
  getZenStatus?: () => Promise<{ isActive: boolean; remainingTime: number }>;
  setActiveProfile?: (profileJson: string) => void;
  startZen?: (durationMs: number) => void;
  getWeeklyStats?: () => Promise<WeeklyStat[]>;
  getDashboardSummary?: () => Promise<DashboardSummary>;
  getTopBlockedApps?: (limit: number) => Promise<TopBlockedApp[]>;
  getSessionHistory?: (days: number) => Promise<SessionHistoryItem[]>;
}) | null;

export const ZenoxEngine = {
  isAvailable(): boolean {
    return !!engine;
  },

  async getZenStatus(): Promise<EngineStatus> {
    if (!engine) {
      return { isActive: false, remainingSeconds: 0, scheduleName: '', isFortress: false };
    }

    try {
      return await engine.getEngineStatus();
    } catch {
      if (engine.getZenStatus) {
        const fallback = await engine.getZenStatus();
        return {
          isActive: fallback.isActive,
          remainingSeconds: Math.max(Math.floor((fallback.remainingTime ?? 0) / 1000), 0),
          scheduleName: '',
          isFortress: false,
        };
      }
      return { isActive: false, remainingSeconds: 0, scheduleName: '', isFortress: false };
    }
  },

  startZen(durationSeconds: number, fortressMode = false): void {
    if (!engine) return;
    try {
      engine.triggerManualZen(durationSeconds, fortressMode);
      return;
    } catch {
      // Fallback for older native bridge implementations that expose startZen(durationMs).
      if (engine.startZen) {
        engine.startZen(durationSeconds * 1000);
      }
    }
  },

  stopZen(): void {
    engine?.stopZen();
  },

  async getInstalledApps(): Promise<object[]> {
    if (!engine) return [];
    return engine.getInstalledApps();
  },

  async fetchBlockedApps(): Promise<object[]> {
    if (!engine) return [];
    return engine.fetchBlockedApps();
  },

  async setBlockedApps(json: string): Promise<boolean> {
    if (!engine) return false;
    try {
      return await engine.setBlockedApps(json);
    } catch {
      return false;
    }
  },

  async fetchSchedules(): Promise<object[]> {
    if (!engine) return [];
    return engine.fetchSchedules();
  },

  async saveSchedule(json: string): Promise<number> {
    if (!engine) return 0;
    return engine.saveSchedule(json);
  },

  async deleteSchedule(id: number): Promise<boolean> {
    if (!engine) return false;
    return engine.deleteSchedule(id);
  },

  openAccessibilitySettings(): void {
    engine?.openAccessibilitySettings();
  },

  async isServiceEnabled(): Promise<boolean> {
    if (!engine) return false;
    return engine.isServiceEnabled();
  },

  async checkOverlayPermission(): Promise<boolean> {
    if (!engine) return false;
    return engine.checkOverlayPermission();
  },

  requestOverlayPermission(): void {
    engine?.requestOverlayPermission();
  },

  async checkNotificationPermission(): Promise<boolean> {
    if (!engine?.checkNotificationPermission) return true;
    return engine.checkNotificationPermission();
  },

  requestNotificationPermission(): void {
    engine?.requestNotificationPermission?.();
  },

  async checkExactAlarmPermission(): Promise<boolean> {
    if (!engine?.checkExactAlarmPermission) return true;
    return engine.checkExactAlarmPermission();
  },

  requestExactAlarmPermission(): void {
    engine?.requestExactAlarmPermission?.();
  },

  async getWeeklyStats(): Promise<WeeklyStat[]> {
    if (!engine?.getWeeklyStats) return [];
    const result = await engine.getWeeklyStats();
    return Array.isArray(result) ? result : [];
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    if (!engine?.getDashboardSummary) {
      return {
        todayMinutes: 0,
        weekMinutes: 0,
        attemptsToday: 0,
        attemptsWeek: 0,
        blockedAppsCount: 0,
        goalProgressPct: 0,
        currentStreakDays: 0,
      };
    }
    return engine.getDashboardSummary();
  },

  async getTopBlockedApps(limit = 5): Promise<TopBlockedApp[]> {
    if (!engine?.getTopBlockedApps) return [];
    const result = await engine.getTopBlockedApps(limit);
    return Array.isArray(result) ? result : [];
  },

  async getSessionHistory(days = 14): Promise<SessionHistoryItem[]> {
    if (!engine?.getSessionHistory) return [];
    const result = await engine.getSessionHistory(days);
    return Array.isArray(result) ? result : [];
  },

  setActiveProfile(profile: ZenProfilePayload): void {
    if (!engine?.setActiveProfile) return;
    engine.setActiveProfile(JSON.stringify(profile));
  },
};
