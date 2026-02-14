import BackgroundTimer from 'react-native-background-timer';
import database from '../database';
import Schedule from '../database/models/Schedule';
import { BlockedApp } from '../database/models';
import { Q } from '@nozbe/watermelondb';
import { NativeModules } from 'react-native';
import { ZenAudio } from './ZenAudio';
import { useZenStore } from '../store/zenStore';

const { AppBlocker } = NativeModules;

class ScheduleManagerService {
    private timerId: number | null = null;
    private isZenModeActive = false;

    start() {
        if (this.timerId) return;

        console.log('🕒 ScheduleManager Started');

        // Check immediately
        this.checkSchedules();

        // Calculate time to next minute for precision
        const now = new Date();
        const msToNextMinute = 60000 - (now.getTime() % 60000);

        console.log(`⏳ Waiting ${msToNextMinute}ms to align with minute start...`);

        setTimeout(() => {
            console.log('⏱️ Minute Aligned! Starting regular checks.');
            this.checkSchedules();

            // Start the regular interval aligned to the minute
            this.timerId = BackgroundTimer.setInterval(() => {
                this.checkSchedules();
            }, 60000) as unknown as number;

        }, msToNextMinute);
    }

    stop() {
        if (this.timerId) {
            BackgroundTimer.clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    private async checkSchedules() {
        try {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            console.log(`⏰ Checking Schedules: ${currentHour}:${currentMinute} (Day ${dayOfWeek})`);

            const schedules = await database.get<Schedule>('schedules')
                .query(
                    Q.where('day_of_week', dayOfWeek),
                    Q.where('is_enabled', true)
                ).fetch();

            console.log(`📋 Found ${schedules.length} active schedules for today.`);

            let activeSchedule: Schedule | null = null;

            for (const schedule of schedules) {
                const [startH, startM] = schedule.startTime.split(':').map(Number);
                const [endH, endM] = schedule.endTime.split(':').map(Number);

                const startTotal = startH * 60 + startM;
                const endTotal = endH * 60 + endM;

                console.log(`🔍 Comparing: Now(${currentTime}) vs Start(${startTotal}) - End(${endTotal})`);

                if (currentTime >= startTotal && currentTime < endTotal) {
                    activeSchedule = schedule;
                    break;
                }
            }

            if (activeSchedule) {
                const [endH, endM] = activeSchedule.endTime.split(':').map(Number);
                const endTimeDate = new Date();
                endTimeDate.setHours(endH, endM, 0, 0);

                const diffInMs = endTimeDate.getTime() - new Date().getTime();
                const diffInSec = Math.floor(diffInMs / 1000);

                if (!this.isZenModeActive) { // Only activate if not already active
                    this.activateZenMode(diffInSec > 0 ? diffInSec : 60);
                } else {
                    // Update duration? 
                }
            } else {
                if (this.isZenModeActive) {
                    this.deactivateZenMode();
                } else {
                    // Ensure UI is off just in case (e.g. app restart)
                    if (useZenStore.getState().isZenModeActive) {
                        console.log('🧹 Cleanup: Disabling stale Zen Mode');
                        this.deactivateZenMode();
                    }
                }
            }

        } catch (error) {
            console.error('Failed to check schedules', error);
        }
    }

    private async activateZenMode(durationSeconds: number) {
        console.log(`🧘 Auto-Activating Zen Mode for ${durationSeconds}s`);
        this.isZenModeActive = true;

        // 1. Update UI Store
        useZenStore.getState().setZenDuration(durationSeconds);
        useZenStore.getState().setRemainingTime(durationSeconds);
        useZenStore.getState().setZenModeActive(true);

        // 2. Sync Block List (Critical for native module)
        try {
            const blockedAppsCollection = database.get<BlockedApp>('blocked_apps');
            const blockedRecords = await blockedAppsCollection.query().fetch();
            const blockedPackages = blockedRecords.map(r => r.packageName);

            console.log(`🔒 Syncing ${blockedPackages.length} blocked apps to Native Module`);
            if (AppBlocker?.setBlockedApps) {
                AppBlocker.setBlockedApps(blockedPackages);
            }
        } catch (e) {
            console.error('Failed to sync block list on activation', e);
        }

        // 3. Trigger Native Blocking
        if (AppBlocker?.setBlockEnabled) {
            AppBlocker.setBlockEnabled(true);
        }

        // 4. Play Sound
        ZenAudio.playFlute();
    }

    private deactivateZenMode() {
        console.log('🌅 Auto-Deactivating Zen Mode');
        this.isZenModeActive = false;

        // 1. Update UI Store
        useZenStore.getState().setZenModeActive(false);

        // 2. Disable Native Blocking
        if (AppBlocker?.setBlockEnabled) {
            AppBlocker.setBlockEnabled(false);
        }
    }
}

export const ScheduleManager = new ScheduleManagerService();
