import { NativeModules } from 'react-native';
import { useZenStore } from '../store/zenStore';

const { AppBlocker } = NativeModules;

export interface AppInfo {
    packageName: string;
    appName: string;
    icon: string; // Base64 or file path
}

export const AppScanner = {
    getInstalledApps: async (): Promise<AppInfo[]> => {
        try {
            const apps = await AppBlocker.getInstalledApps();
            return apps;
        } catch (error) {
            console.error("Failed to fetch apps", error);
            return [];
        }
    },

    loadApps: async () => {
        const { setInstalledApps, installedApps } = useZenStore.getState();

        // Only fetch if not already in store
        if (installedApps.length === 0) {
            console.log("Fetching installed apps...");
            try {
                const apps = await AppBlocker.getInstalledApps();
                setInstalledApps(apps);
                console.log("Apps cached in ZenStore");
            } catch (e) {
                console.error("Failed to cache apps", e);
            }
        } else {
            console.log("Using cached apps");
        }
    },

    setBlockedApps: async (packageNames: string[]): Promise<void> => {
        try {
            if (AppBlocker?.setBlockedApps) {
                AppBlocker.setBlockedApps(packageNames);
            }
        } catch (error) {
            console.error('Failed to set blocked apps:', error);
        }
    },

    checkOverlayPermission: async (): Promise<boolean> => {
        try {
            if (AppBlocker?.checkOverlayPermission) {
                return await AppBlocker.checkOverlayPermission();
            }
            return false;
        } catch (error) {
            console.error('Failed to check overlay permission:', error);
            return false;
        }
    },

    requestOverlayPermission: () => {
        try {
            if (AppBlocker?.requestOverlayPermission) {
                AppBlocker.requestOverlayPermission();
            }
        } catch (error) {
            console.error('Failed to request overlay permission:', error);
        }
    }
};
