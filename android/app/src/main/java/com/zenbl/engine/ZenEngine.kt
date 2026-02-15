package com.zenbl.engine

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.zenbl.engine.db.ScheduleEntity
import com.zenbl.engine.db.ZenDatabase
import java.util.Calendar
import kotlinx.coroutines.*

/**
 * ZenEngine — The brain of Zenox. Handles Zen Mode state, schedule checking, and service lifecycle.
 * React Native never handles timers or logic — only this engine does.
 */
object ZenEngine {
    private const val TAG = "ZenEngine"
    private const val PREFS_NAME = "ZenBlockedApps"
    private const val SCHEDULE_CHECK_INTERVAL = 30_000L // 30 seconds

    // State
    var isActive: Boolean = false
        private set
    var endTimeMs: Long = 0L
        private set
    var scheduleName: String = ""
        private set
    var isFortress: Boolean = false
        private set

    private lateinit var appContext: Context
    private lateinit var prefs: SharedPreferences
    private val handler = Handler(Looper.getMainLooper())
    private val engineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val scheduleChecker =
            object : Runnable {
                override fun run() {
                    checkSchedules()
                    handler.postDelayed(this, SCHEDULE_CHECK_INTERVAL)
                }
            }

    fun init(context: Context) {
        appContext = context.applicationContext
        prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        Log.d(TAG, "🧠 ZenEngine initialized")

        // Hydrate state from prefs (survives process death)
        isActive = prefs.getBoolean("is_zen_mode_active", false)
        endTimeMs = prefs.getLong("zen_end_time", 0L)
        scheduleName = prefs.getString("schedule_name", "") ?: ""
        isFortress = prefs.getBoolean("is_fortress_mode", false)

        if (isActive && endTimeMs > 0 && endTimeMs > System.currentTimeMillis()) {
            Log.d(TAG, "♻️ Restoring active Zen session: $scheduleName")
            startForegroundService()
        } else if (isActive && endTimeMs > 0 && endTimeMs <= System.currentTimeMillis()) {
            // Session expired while we were dead
            Log.d(TAG, "⏰ Session expired while inactive, cleaning up")
            stopZen()
        }

        // Start schedule checker
        handler.post(scheduleChecker)
    }

    fun startManualZen(durationSec: Int, fortress: Boolean = false) {
        val end = System.currentTimeMillis() + (durationSec * 1000L)
        activateZen("Quick Zen", end, fortress)
    }

    fun stopZen() {
        Log.d(TAG, "🌅 Stopping Zen Mode")

        // Play shakuhachi end sound
        playEndAudio()

        isActive = false
        endTimeMs = 0L
        scheduleName = ""
        isFortress = false

        prefs.edit()
                .putBoolean("is_zen_mode_active", false)
                .putLong("zen_end_time", 0L)
                .putString("schedule_name", "")
                .putBoolean("is_fortress_mode", false)
                .apply()

        stopForegroundService()
    }

    private fun playEndAudio() {
        try {
            val player =
                    android.media.MediaPlayer.create(appContext, com.zenbl.R.raw.shakuhachi_blow)
            player?.apply {
                setVolume(0.5f, 0.5f)
                start()
                setOnCompletionListener { it.release() }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play end audio", e)
        }
    }

    fun getStatus(): Map<String, Any> {
        val remaining =
                if (isActive && endTimeMs > 0) {
                    maxOf(0L, (endTimeMs - System.currentTimeMillis()) / 1000)
                } else 0L

        return mapOf(
                "isActive" to isActive,
                "remainingSeconds" to remaining,
                "scheduleName" to scheduleName,
                "isFortress" to isFortress
        )
    }

    /**
     * Syncs blocked apps to SharedPreferences for the accessibility service. Called after Room DB
     * is updated.
     */
    fun syncBlockListToPrefs(packageNames: List<String>) {
        prefs.edit().putStringSet("blocked_packages", packageNames.toSet()).apply()
        Log.d(TAG, "🔒 Synced ${packageNames.size} blocked apps to prefs")
    }

    // ── Internal ──

    private fun activateZen(name: String, endTime: Long, fortress: Boolean) {
        Log.d(
                TAG,
                "🧘 Activating Zen: $name, fortress=$fortress, duration=${(endTime - System.currentTimeMillis()) / 1000}s"
        )
        isActive = true
        endTimeMs = endTime
        scheduleName = name
        isFortress = fortress

        // Persist state (survives process death)
        prefs.edit()
                .putBoolean("is_zen_mode_active", true)
                .putLong("zen_end_time", endTime)
                .putString("schedule_name", name)
                .putBoolean("is_fortress_mode", fortress)
                .apply()

        // Sync block list from Room DB
        engineScope.launch {
            try {
                val db = ZenDatabase.getInstance(appContext)
                val packages = db.zenDao().getBlockedPackageNames()
                syncBlockListToPrefs(packages)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync block list", e)
            }
        }

        startForegroundService()
    }

    private fun checkSchedules() {
        if (isActive) return // Already in a session

        engineScope.launch {
            try {
                val db = ZenDatabase.getInstance(appContext)
                val schedules = db.zenDao().getEnabledSchedules()
                val now = Calendar.getInstance()
                val currentHour = now.get(Calendar.HOUR_OF_DAY)
                val currentMinute = now.get(Calendar.MINUTE)
                val currentDay = now.get(Calendar.DAY_OF_WEEK) // 1=Sun..7=Sat
                // Convert to our format: 1=Mon..7=Sun
                val dayOfWeek = if (currentDay == Calendar.SUNDAY) 7 else currentDay - 1

                for (schedule in schedules) {
                    if (isScheduleActiveNow(schedule, currentHour, currentMinute, dayOfWeek)) {
                        Log.d(TAG, "📅 Schedule match: ${schedule.name}")
                        val endTime = calculateEndTime(schedule)
                        handler.post { activateZen(schedule.name, endTime, schedule.isFortress) }
                        break
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Schedule check failed", e)
            }
        }
    }

    private fun isScheduleActiveNow(
            schedule: ScheduleEntity,
            hour: Int,
            minute: Int,
            dayOfWeek: Int
    ): Boolean {
        // Check day
        val days = schedule.daysOfWeek.split(",").mapNotNull { it.trim().toIntOrNull() }
        if (dayOfWeek !in days) return false

        // Check time window
        val nowMinutes = hour * 60 + minute
        val startMinutes = schedule.startHour * 60 + schedule.startMinute
        val endMinutes = schedule.endHour * 60 + schedule.endMinute

        return if (endMinutes > startMinutes) {
            nowMinutes in startMinutes until endMinutes
        } else {
            // Overnight schedule (e.g., 22:00 - 06:00)
            nowMinutes >= startMinutes || nowMinutes < endMinutes
        }
    }

    private fun calculateEndTime(schedule: ScheduleEntity): Long {
        val now = Calendar.getInstance()
        val end =
                Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, schedule.endHour)
                    set(Calendar.MINUTE, schedule.endMinute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
        // If end is before now (overnight), add a day
        if (end.before(now)) {
            end.add(Calendar.DAY_OF_MONTH, 1)
        }
        return end.timeInMillis
    }

    private fun startForegroundService() {
        try {
            val intent =
                    Intent(appContext, ZenForegroundService::class.java).apply {
                        putExtra("END_TIME", endTimeMs)
                        putExtra("SCHEDULE_NAME", scheduleName)
                    }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                appContext.startForegroundService(intent)
            } else {
                appContext.startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service", e)
        }
    }

    private fun stopForegroundService() {
        try {
            val intent = Intent(appContext, ZenForegroundService::class.java)
            appContext.stopService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop foreground service", e)
        }
    }
}
