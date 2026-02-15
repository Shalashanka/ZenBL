package com.zenox.engine

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.zenox.engine.db.ScheduleEntity
import com.zenox.engine.db.ZenDatabase
import org.json.JSONArray
import java.util.Calendar
import kotlinx.coroutines.*

/**
 * ZenEngine — The brain of Zenox. Handles Zen Mode state, schedule checking, and service lifecycle.
 * React Native never handles timers or logic — only this engine does.
 */
object ZenEngine {
    private const val TAG = "ZenEngine"
    private const val PREFS_NAME = "ZenoxBlockedApps"
    private const val SCHEDULE_CHECK_INTERVAL = 15_000L // 15 seconds so we don't miss the start minute

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
    @Volatile private var isInitialized = false

    private val scheduleChecker =
            object : Runnable {
                override fun run() {
                    checkSchedules()
                    handler.postDelayed(this, SCHEDULE_CHECK_INTERVAL)
                }
            }

    fun init(context: Context) {
        if (isInitialized) return
        isInitialized = true

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
        activateZen("Quick Zen", end, fortress, null) // null = use global block list
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
                    android.media.MediaPlayer.create(appContext, com.zenox.R.raw.shakuhachi_blow)
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

    /**
     * @param scheduleBlockList If non-null, use this list for blocking (schedule-specific).
     *                         If null, use global block list from Room DB.
     */
    private fun activateZen(
        name: String,
        endTime: Long,
        fortress: Boolean,
        scheduleBlockList: List<String>?
    ) {
        Log.d(
                TAG,
                "🧘 Activating Zen: $name, fortress=$fortress, duration=${(endTime - System.currentTimeMillis()) / 1000}s"
        )

        // Sync block list FIRST so accessibility service has blocked_packages before is_zen_mode_active is true
        engineScope.launch {
            try {
                val packages = scheduleBlockList
                    ?: run {
                        val db = ZenDatabase.getInstance(appContext)
                        db.zenDao().getBlockedPackageNames()
                    }
                syncBlockListToPrefs(packages)
                Log.d(TAG, "🔒 Block list synced (${packages.size} packages), then activating Zen state")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync block list", e)
            }
            handler.post { applyZenStateAndStartService(name, endTime, fortress) }
        }
    }

    private fun applyZenStateAndStartService(name: String, endTime: Long, fortress: Boolean) {
        isActive = true
        endTimeMs = endTime
        scheduleName = name
        isFortress = fortress

        prefs.edit()
                .putBoolean("is_zen_mode_active", true)
                .putLong("zen_end_time", endTime)
                .putString("schedule_name", name)
                .putBoolean("is_fortress_mode", fortress)
                .apply()

        startForegroundService()
    }

    private fun parseBlockedAppsJson(json: String?): List<String> {
        if (json.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(json)
            List(arr.length()) { i -> arr.optString(i, "") }.filter { it.isNotEmpty() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse blockedAppsJson", e)
            emptyList()
        }
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
                // Convert to our format: 7=Sun, 1=Mon..6=Sat
                val dayOfWeek = if (currentDay == Calendar.SUNDAY) 7 else currentDay - 1

                if (schedules.isNotEmpty()) {
                    Log.d(TAG, "📅 Schedule check: ${schedules.size} enabled, now=$currentHour:$currentMinute day=$dayOfWeek")
                }

                for (schedule in schedules) {
                    if (isScheduleActiveNow(schedule, currentHour, currentMinute, dayOfWeek)) {
                        Log.d(TAG, "📅 Schedule match: ${schedule.name}")
                        val endTime = calculateEndTime(schedule)
                        val packageList =
                            if (!schedule.blockedAppsJson.isNullOrBlank()) {
                                parseBlockedAppsJson(schedule.blockedAppsJson)
                            } else {
                                null
                            }
                        handler.post {
                            activateZen(
                                schedule.name,
                                endTime,
                                schedule.isFortress,
                                packageList
                            )
                        }
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
        // Check day. Engine uses 7=Sun, 1=Mon..6=Sat; normalize stored 0 (Sun from old JS) to 7
        val days = schedule.daysOfWeek.split(",").mapNotNull { it.trim().toIntOrNull() }.map { if (it == 0) 7 else it }
        if (dayOfWeek !in days) return false

        // Check time window (inclusive of start and end minute)
        val nowMinutes = hour * 60 + minute
        val startMinutes = schedule.startHour * 60 + schedule.startMinute
        val endMinutes = schedule.endHour * 60 + schedule.endMinute

        return if (endMinutes > startMinutes) {
            nowMinutes in startMinutes..endMinutes
        } else if (endMinutes == startMinutes) {
            nowMinutes == startMinutes
        } else {
            // Overnight schedule (e.g., 22:00 - 06:00)
            nowMinutes >= startMinutes || nowMinutes <= endMinutes
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
