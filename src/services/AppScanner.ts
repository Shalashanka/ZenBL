import NativeZenEngine from '../../specs/NativeZenEngine';

const Engine = NativeZenEngine;

export interface AppInfo {
    packageName: string;
    appName: string;
    icon: string;
}

export const AppScanner = {
    getInstalledApps: async (): Promise<AppInfo[]> => {
        try {
            if (!Engine) throw new Error('ZenEngine not available');
            const apps = await Engine.getInstalledApps();
            return apps as unknown as AppInfo[];
        } catch (error) {
            console.error("Failed to fetch apps", error);
            return [];
        }
    },

    checkOverlayPermission: async (): Promise<boolean> => {
        try {
            if (Engine?.checkOverlayPermission) {
                return await Engine.checkOverlayPermission();
            }
            return false;
        } catch (error) {
            console.error('Failed to check overlay permission:', error);
            return false;
        }
    },

    requestOverlayPermission: () => {
        try {
            Engine?.requestOverlayPermission();
        } catch (error) {
            console.error('Failed to request overlay permission:', error);
        }
    }
};
