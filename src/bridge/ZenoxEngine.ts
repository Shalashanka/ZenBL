import NativeZenEngine from '../../specs/NativeZenEngine';

type EngineStatus = {
  isActive: boolean;
  remainingSeconds: number;
  scheduleName: string;
  isFortress: boolean;
};

export type ZenProfilePayload = {
  id: number;
  name: string;
  blockedApps: string[];
};

const engine = NativeZenEngine as (typeof NativeZenEngine & {
  getZenStatus?: () => Promise<{ isActive: boolean; remainingTime: number }>;
  setActiveProfile?: (profileJson: string) => void;
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
    engine.triggerManualZen(durationSeconds, fortressMode);
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

  setBlockedApps(json: string): void {
    engine?.setBlockedApps(json);
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

  setActiveProfile(profile: ZenProfilePayload): void {
    if (!engine?.setActiveProfile) return;
    engine.setActiveProfile(JSON.stringify(profile));
  },
};

