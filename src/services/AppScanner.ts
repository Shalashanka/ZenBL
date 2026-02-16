import { ZenoxEngine } from '../bridge/ZenoxEngine';

export interface AppInfo {
    packageName: string;
    appName: string;
    icon: string;
}

export const AppScanner = {
    getInstalledApps: async (): Promise<AppInfo[]> => {
        try {
            if (!ZenoxEngine.isAvailable()) throw new Error('ZenEngine not available');
            const apps = await ZenoxEngine.getInstalledApps();
            return apps as unknown as AppInfo[];
        } catch (error) {
            console.error("Failed to fetch apps", error);
            return [];
        }
    },

    checkOverlayPermission: async (): Promise<boolean> => {
        try {
            return await ZenoxEngine.checkOverlayPermission();
        } catch (error) {
            console.error('Failed to check overlay permission:', error);
            return false;
        }
    },

    requestOverlayPermission: () => {
        try {
            ZenoxEngine.requestOverlayPermission();
        } catch (error) {
            console.error('Failed to request overlay permission:', error);
        }
    }
};
