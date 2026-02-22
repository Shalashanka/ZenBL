package com.zentox.engine

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "zen_schedules")
data class ZenSchedule(
    @PrimaryKey(autoGenerate = true) val id: Long = 0L,
    val name: String,
    val startTime: String,
    val endTime: String,
    val daysOfWeek: String,
    val isEnabled: Boolean,
)

@Dao
interface BlockedAppDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(blockedApp: BlockedApp)

    @Query("SELECT * FROM blocked_apps WHERE packageName = :packageName LIMIT 1")
    suspend fun getByPackageName(packageName: String): BlockedApp?

    @Query("SELECT * FROM blocked_apps WHERE dailyLimitMinutes > 0")
    suspend fun getAppsWithDailyLimit(): List<BlockedApp>

    @Query("SELECT * FROM blocked_apps")
    suspend fun getAll(): List<BlockedApp>

    @Query("SELECT * FROM blocked_apps WHERE isBlocked = 1")
    suspend fun getBlockedApps(): List<BlockedApp>

    @Query("SELECT COUNT(*) FROM blocked_apps WHERE isBlocked = 1")
    suspend fun getBlockedCount(): Int
}

@Dao
interface ZenScheduleDao {
    @Query("SELECT * FROM zen_schedules ORDER BY id DESC")
    suspend fun getAllSchedules(): List<ZenSchedule>

    @Query("SELECT * FROM zen_schedules WHERE isEnabled = 1")
    suspend fun getActiveSchedules(): List<ZenSchedule>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSchedule(schedule: ZenSchedule): Long

    @Query("DELETE FROM zen_schedules WHERE id = :id")
    suspend fun deleteById(id: Long): Int
}

@Database(
    entities = [BlockedApp::class, ZenSchedule::class],
    version = 2,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun blockedAppDao(): BlockedAppDao
    abstract fun zenScheduleDao(): ZenScheduleDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "zentox_engine.db",
                ).fallbackToDestructiveMigration()
                    .build().also { instance = it }
            }
        }
    }
}
