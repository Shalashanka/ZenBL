package com.zenox.engine.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [BlockedAppEntity::class, ScheduleEntity::class],
    version = 1,
    exportSchema = true
)
abstract class ZenDatabase : RoomDatabase() {
    abstract fun zenDao(): ZenDao

    companion object {
        @Volatile
        private var INSTANCE: ZenDatabase? = null

        fun getInstance(context: Context): ZenDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ZenDatabase::class.java,
                    "zenox_engine.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
