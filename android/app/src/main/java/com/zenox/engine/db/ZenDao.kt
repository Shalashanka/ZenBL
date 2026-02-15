package com.zenox.engine.db

import androidx.room.*

@Dao
interface ZenDao {
    // ── Blocked Apps ──
    @Query("SELECT * FROM blocked_apps ORDER BY appName ASC")
    suspend fun getAllBlockedApps(): List<BlockedAppEntity>

    @Query("SELECT packageName FROM blocked_apps")
    suspend fun getBlockedPackageNames(): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBlockedApps(apps: List<BlockedAppEntity>)

    @Query("DELETE FROM blocked_apps") suspend fun clearBlockedApps()

    @Query("DELETE FROM blocked_apps WHERE packageName = :packageName")
    suspend fun deleteBlockedApp(packageName: String)

    @Transaction
    suspend fun replaceAllBlockedApps(apps: List<BlockedAppEntity>) {
        clearBlockedApps()
        insertBlockedApps(apps)
    }

    // ── Schedules ──
    @Query("SELECT * FROM schedules ORDER BY startHour ASC, startMinute ASC")
    suspend fun getAllSchedules(): List<ScheduleEntity>

    @Query("SELECT * FROM schedules WHERE isEnabled = 1")
    suspend fun getEnabledSchedules(): List<ScheduleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSchedule(schedule: ScheduleEntity): Long

    @Delete suspend fun deleteSchedule(schedule: ScheduleEntity)

    @Query("DELETE FROM schedules WHERE id = :id") suspend fun deleteScheduleById(id: Long)

    @Query("DELETE FROM schedules") suspend fun clearSchedules()

    @Transaction
    suspend fun replaceAllSchedules(schedules: List<ScheduleEntity>) {
        clearSchedules()
        for (s in schedules) insertSchedule(s)
    }
}
