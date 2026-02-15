package com.zenbl.engine.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "schedules")
data class ScheduleEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val startHour: Int,
    val startMinute: Int,
    val endHour: Int,
    val endMinute: Int,
    val daysOfWeek: String = "1,2,3,4,5,6,7", // comma-separated day numbers (1=Mon..7=Sun)
    val isFortress: Boolean = false,
    val isEnabled: Boolean = true,
    val blockedAppsJson: String? = null // JSON array of package names, null = use global list
)
