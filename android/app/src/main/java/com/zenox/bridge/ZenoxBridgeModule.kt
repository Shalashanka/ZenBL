package com.zenox.bridge

import android.content.Intent
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.app.AlarmManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.os.Build
import android.net.Uri
import android.provider.Settings
import android.util.Log
import com.google.gson.JsonParser
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.zenox.engine.AppDatabase
import com.zenox.engine.BlockedApp
import com.zenox.engine.ZenSchedule
import com.zenox.engine.ZenStatus
import com.zenox.engine.ZenoxAlarmManager
import com.zenox.engine.ZenoxManager
import com.zenox.engine.ZenoxState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.max

class ZenoxBridgeModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private val bridgeScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val blockedAppDao by lazy {
        AppDatabase.getInstance(reactApplicationContext).blockedAppDao()
    }
    private val scheduleDao by lazy {
        AppDatabase.getInstance(reactApplicationContext).zenScheduleDao()
    }
    init {
        ZenoxState.initialize(reactApplicationContext)
        ZenoxManager.initialize(reactApplicationContext, blockedAppDao)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun startZen(duration: Int) {
        Log.i(TAG, "Bridge startZen called: durationMs=$duration")
        ZenoxManager.startZen(duration.toLong(), "MANUAL")
        emitStatusChanged()
    }

    @ReactMethod
    fun triggerManualZen(durationSec: Int, isFortress: Boolean) {
        val durationMs = durationSec.toLong().coerceAtLeast(1L) * 1000L
        Log.i(TAG, "triggerManualZen durationSec=$durationSec isFortress=$isFortress")
        ZenoxManager.startZen(durationMs, "MANUAL")
        emitStatusChanged()
    }

    @ReactMethod
    fun stopZen() {
        Log.i(TAG, "Bridge stopZen called")
        ZenoxManager.stopZen()
        emitStatusChanged()
    }

    @ReactMethod
    fun getZenStatus(promise: Promise) {
        val now = System.currentTimeMillis()
        val status = ZenoxState.getStatus()
        val map = Arguments.createMap()
        if (status is ZenStatus.ACTIVE) {
            map.putBoolean("isActive", true)
            map.putDouble("remainingTime", ZenoxManager.getEffectiveRemainingMillis(now).toDouble())
        } else {
            map.putBoolean("isActive", false)
            map.putDouble("remainingTime", 0.0)
        }
        Log.d(TAG, "Bridge getZenStatus -> status=$status")
        promise.resolve(map)
    }

    @ReactMethod
    fun getEngineStatus(promise: Promise) {
        val now = System.currentTimeMillis()
        val status = ZenoxState.getStatus()
        val map = Arguments.createMap()
        if (status is ZenStatus.ACTIVE) {
            val remainingMillis = ZenoxManager.getEffectiveRemainingMillis(now)
            map.putBoolean("isActive", true)
            map.putDouble("remainingSeconds", max(remainingMillis / 1000L, 0L).toDouble())
            map.putString("scheduleName", status.triggerType)
            map.putBoolean("isFortress", false)
        } else {
            map.putBoolean("isActive", false)
            map.putDouble("remainingSeconds", 0.0)
            map.putString("scheduleName", "")
            map.putBoolean("isFortress", false)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun getDebugState(promise: Promise) {
        bridgeScope.launch {
            try {
                val now = System.currentTimeMillis()
                val status = ZenoxState.getStatus()
                val blockedCount = blockedAppDao.getBlockedCount()
                val map = Arguments.createMap().apply {
                    putBoolean("accessibilityEnabled", isAccessibilityServiceEnabled())
                    putBoolean("overlayAllowed", Settings.canDrawOverlays(reactApplicationContext))
                    putInt("blockedAppsCount", blockedCount)
                    putBoolean("isZenActive", status is ZenStatus.ACTIVE)
                    val remaining = if (status is ZenStatus.ACTIVE) ZenoxManager.getEffectiveRemainingMillis(now) else 0L
                    putDouble("remainingTime", remaining.toDouble())
                }
                Log.d(TAG, "getDebugState -> $map")
                promise.resolve(map)
            } catch (exception: Exception) {
                Log.e(TAG, "getDebugState failed", exception)
                promise.reject("GET_DEBUG_STATE_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        bridgeScope.launch {
            try {
                val packageManager = reactApplicationContext.packageManager
                val ownPackageName = reactApplicationContext.packageName
                val totalInstalled = packageManager.getInstalledApplications(PackageManager.GET_META_DATA).size
                val installedApps = packageManager
                    .getInstalledApplications(PackageManager.GET_META_DATA)
                    .asSequence()
                    .filter { appInfo ->
                        (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0 &&
                            appInfo.packageName != ownPackageName
                    }
                    .sortedBy { appInfo -> packageManager.getApplicationLabel(appInfo).toString().lowercase() }
                    .toList()

                val result = Arguments.createArray()
                installedApps.forEach { appInfo ->
                    result.pushMap(
                        Arguments.createMap().apply {
                            putString("packageName", appInfo.packageName)
                            putString("appName", packageManager.getApplicationLabel(appInfo).toString())
                        },
                    )
                }
                Log.i(
                    TAG,
                    "getInstalledApps totalInstalled=$totalInstalled nonSystemReturned=${installedApps.size} ownPackage=$ownPackageName",
                )
                installedApps.take(5).forEach {
                    Log.d(TAG, "App sample: ${it.packageName}")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "getInstalledApps failed", e)
                promise.reject("GET_APPS_FAILED", e.message, e)
            }
        }
    }

    @ReactMethod
    fun fetchBlockedApps(promise: Promise) {
        bridgeScope.launch {
            try {
                val blocked = blockedAppDao.getBlockedApps()
                val result = Arguments.createArray()
                blocked.forEach { app ->
                    result.pushMap(
                        Arguments.createMap().apply {
                            putString("packageName", app.packageName)
                            putString("appName", app.appName)
                        },
                    )
                }
                promise.resolve(result)
            } catch (exception: Exception) {
                Log.e(TAG, "fetchBlockedApps failed", exception)
                promise.reject("FETCH_BLOCKED_APPS_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun setBlockedApps(json: String, promise: Promise) {
        bridgeScope.launch {
            try {
                val incoming = mutableMapOf<String, String>()
                val root = JsonParser.parseString(json)
                if (root.isJsonArray) {
                    root.asJsonArray.forEach { item ->
                        val obj = item.takeIf { it.isJsonObject }?.asJsonObject ?: return@forEach
                        val packageName = obj.get("packageName")?.asString?.trim().orEmpty()
                        if (packageName.isBlank()) return@forEach
                        val appName = obj.get("appName")?.asString?.trim().orEmpty().ifBlank { packageName }
                        incoming[packageName] = appName
                    }
                }

                val existing = blockedAppDao.getAll()
                val existingByPackage = existing.associateBy { it.packageName }

                incoming.forEach { (packageName, appName) ->
                    val current = existingByPackage[packageName]
                    blockedAppDao.upsert(
                        BlockedApp(
                            packageName = packageName,
                            appName = appName,
                            isBlocked = true,
                            dailyLimitMinutes = current?.dailyLimitMinutes ?: 0L,
                        ),
                    )
                }

                existing.filter { it.packageName !in incoming.keys && it.isBlocked }.forEach { app ->
                    blockedAppDao.upsert(app.copy(isBlocked = false))
                }
                promise.resolve(true)
            } catch (exception: Exception) {
                Log.e(TAG, "setBlockedApps failed", exception)
                promise.reject("SET_BLOCKED_APPS_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun fetchSchedules(promise: Promise) {
        bridgeScope.launch {
            try {
                val schedules = scheduleDao.getAllSchedules()
                val result = Arguments.createArray()
                schedules.forEach { schedule ->
                    val (startHour, startMinute) = parseTime(schedule.startTime)
                    val (endHour, endMinute) = parseTime(schedule.endTime)
                    result.pushMap(
                        Arguments.createMap().apply {
                            putDouble("id", schedule.id.toDouble())
                            putString("name", schedule.name)
                            putInt("startHour", startHour)
                            putInt("startMinute", startMinute)
                            putInt("endHour", endHour)
                            putInt("endMinute", endMinute)
                            putString("daysOfWeek", schedule.daysOfWeek)
                            putBoolean("isFortress", false)
                            putBoolean("isEnabled", schedule.isEnabled)
                            putNull("blockedAppsJson")
                        },
                    )
                }
                promise.resolve(result)
            } catch (exception: Exception) {
                Log.e(TAG, "fetchSchedules failed", exception)
                promise.reject("FETCH_SCHEDULES_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun saveSchedule(json: String, promise: Promise) {
        bridgeScope.launch {
            try {
                val obj = JsonParser.parseString(json).asJsonObject
                val id = obj.get("id")?.asLong ?: 0L
                val name = obj.get("name")?.asString?.trim().orEmpty().ifBlank { "Unnamed Schedule" }
                val startHour = obj.get("startHour")?.asInt ?: 0
                val startMinute = obj.get("startMinute")?.asInt ?: 0
                val endHour = obj.get("endHour")?.asInt ?: 0
                val endMinute = obj.get("endMinute")?.asInt ?: 0
                val daysOfWeek = obj.get("daysOfWeek")?.asString?.trim().orEmpty().ifBlank { "1,2,3,4,5" }
                val isEnabled = obj.get("isEnabled")?.asBoolean ?: true

                val schedule = ZenSchedule(
                    id = id,
                    name = name,
                    startTime = formatTime(startHour, startMinute),
                    endTime = formatTime(endHour, endMinute),
                    daysOfWeek = daysOfWeek,
                    isEnabled = isEnabled,
                )
                val savedId = scheduleDao.insertSchedule(schedule)
                ZenoxManager.refreshSchedules()
                promise.resolve(savedId.toDouble())
            } catch (exception: Exception) {
                Log.e(TAG, "saveSchedule failed", exception)
                promise.reject("SAVE_SCHEDULE_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun deleteSchedule(id: Double, promise: Promise) {
        bridgeScope.launch {
            try {
                val scheduleId = id.toLong()
                ZenoxAlarmManager().cancelAlarm(reactApplicationContext, scheduleId)
                val deletedRows = scheduleDao.deleteById(scheduleId)
                ZenoxManager.refreshSchedules()
                promise.resolve(deletedRows > 0)
            } catch (exception: Exception) {
                Log.e(TAG, "deleteSchedule failed", exception)
                promise.reject("DELETE_SCHEDULE_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun isServiceEnabled(promise: Promise) {
        promise.resolve(isAccessibilityServiceEnabled())
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (exception: Exception) {
            Log.e(TAG, "openAccessibilitySettings failed", exception)
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
    }

    @ReactMethod
    fun requestOverlayPermission() {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}"),
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (exception: Exception) {
            Log.e(TAG, "requestOverlayPermission failed", exception)
        }
    }

    @ReactMethod
    fun checkNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            promise.resolve(true)
            return
        }
        val granted = reactApplicationContext.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestNotificationPermission() {
        try {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (exception: Exception) {
            Log.e(TAG, "requestNotificationPermission failed", exception)
        }
    }

    @ReactMethod
    fun checkExactAlarmPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(true)
            return
        }
        val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        promise.resolve(alarmManager?.canScheduleExactAlarms() == true)
    }

    @ReactMethod
    fun requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        try {
            val intent = Intent(
                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:${reactApplicationContext.packageName}"),
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (exception: Exception) {
            Log.e(TAG, "requestExactAlarmPermission failed", exception)
        }
    }

    @ReactMethod
    fun setActiveProfile(profileJson: String) {
        try {
            reactApplicationContext
                .getSharedPreferences("zenox_profile_sync", Context.MODE_PRIVATE)
                .edit()
                .putString("active_profile_json", profileJson)
                .apply()
            Log.i(TAG, "Active profile synced to native engine context")
        } catch (exception: Exception) {
            Log.e(TAG, "setActiveProfile failed", exception)
        }
    }

    @ReactMethod
    fun getWeeklyStats(promise: Promise) {
        bridgeScope.launch {
            try {
                val result = queryDailyStats(7)
                promise.resolve(result)
            } catch (exception: Exception) {
                Log.e(TAG, "getWeeklyStats failed", exception)
                promise.reject("GET_WEEKLY_STATS_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun getDashboardSummary(promise: Promise) {
        bridgeScope.launch {
            try {
                val weekly = queryDailyStats(7)
                var weekMinutes = 0
                var weekAttempts = 0
                var todayMinutes = 0
                var todayAttempts = 0
                for (i in 0 until weekly.size()) {
                    val entry = weekly.getMap(i) ?: continue
                    val minutes = entry.getInt("minutes")
                    val attempts = entry.getInt("attempts")
                    weekMinutes += minutes
                    weekAttempts += attempts
                    if (i == weekly.size() - 1) {
                        todayMinutes = minutes
                        todayAttempts = attempts
                    }
                }

                val blockedCount = blockedAppDao.getBlockedCount()
                val goalProgressPct = ((weekMinutes.toFloat() / 300f) * 100f).toInt().coerceIn(0, 100)
                val streakDays = (weekMinutes / 120).coerceAtLeast(0)

                val map = Arguments.createMap().apply {
                    putInt("todayMinutes", todayMinutes)
                    putInt("weekMinutes", weekMinutes)
                    putInt("attemptsToday", todayAttempts)
                    putInt("attemptsWeek", weekAttempts)
                    putInt("blockedAppsCount", blockedCount)
                    putInt("goalProgressPct", goalProgressPct)
                    putInt("currentStreakDays", streakDays)
                }
                promise.resolve(map)
            } catch (exception: Exception) {
                Log.e(TAG, "getDashboardSummary failed", exception)
                promise.reject("GET_DASHBOARD_SUMMARY_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun getTopBlockedApps(limit: Int, promise: Promise) {
        bridgeScope.launch {
            try {
                val usageManager = reactApplicationContext
                    .getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
                val blockedApps = blockedAppDao.getBlockedApps()
                val blockedPackages = blockedApps.map { it.packageName }.toSet()
                val appNameByPackage = blockedApps.associate { it.packageName to it.appName }
                val cappedLimit = limit.coerceIn(1, 20)

                val now = Calendar.getInstance()
                val todayStart = Calendar.getInstance().apply {
                    timeInMillis = now.timeInMillis
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }.timeInMillis
                val weekStart = Calendar.getInstance().apply {
                    timeInMillis = now.timeInMillis
                    add(Calendar.DAY_OF_YEAR, -6)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }.timeInMillis
                val end = now.timeInMillis

                val attemptsToday = mutableMapOf<String, Int>()
                val attemptsWeek = mutableMapOf<String, Int>()

                if (blockedPackages.isNotEmpty()) {
                    val todayEvents = usageManager.queryEvents(todayStart, end)
                    val weekEvents = usageManager.queryEvents(weekStart, end)
                    val event = UsageEvents.Event()
                    while (todayEvents.hasNextEvent()) {
                        todayEvents.getNextEvent(event)
                        if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && blockedPackages.contains(event.packageName)) {
                            attemptsToday[event.packageName] = (attemptsToday[event.packageName] ?: 0) + 1
                        }
                    }
                    while (weekEvents.hasNextEvent()) {
                        weekEvents.getNextEvent(event)
                        if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && blockedPackages.contains(event.packageName)) {
                            attemptsWeek[event.packageName] = (attemptsWeek[event.packageName] ?: 0) + 1
                        }
                    }
                }

                val sorted = blockedApps
                    .map { app ->
                        val week = attemptsWeek[app.packageName] ?: 0
                        val today = attemptsToday[app.packageName] ?: 0
                        Triple(app.packageName, today, week)
                    }
                    .sortedByDescending { it.third }
                    .take(cappedLimit)

                val result = Arguments.createArray()
                sorted.forEach { (packageName, today, week) ->
                    result.pushMap(
                        Arguments.createMap().apply {
                            putString("packageName", packageName)
                            putString("appName", appNameByPackage[packageName] ?: packageName)
                            putInt("attemptsToday", today)
                            putInt("attemptsWeek", week)
                        },
                    )
                }
                promise.resolve(result)
            } catch (exception: Exception) {
                Log.e(TAG, "getTopBlockedApps failed", exception)
                promise.reject("GET_TOP_BLOCKED_APPS_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun getSessionHistory(days: Int, promise: Promise) {
        bridgeScope.launch {
            try {
                val cappedDays = days.coerceIn(1, 60)
                val history = queryDailyStats(cappedDays)
                val result = Arguments.createArray()
                for (i in 0 until history.size()) {
                    val item = history.getMap(i) ?: continue
                    result.pushMap(
                        Arguments.createMap().apply {
                            putString("id", "${item.getString("day")}-${i}")
                            putString("day", item.getString("day"))
                            putInt("minutes", item.getInt("minutes"))
                            putInt("attempts", item.getInt("attempts"))
                            putString("source", "usage_stats")
                        },
                    )
                }
                promise.resolve(result)
            } catch (exception: Exception) {
                Log.e(TAG, "getSessionHistory failed", exception)
                promise.reject("GET_SESSION_HISTORY_FAILED", exception.message, exception)
            }
        }
    }

    @ReactMethod
    fun toggleAppBlock(packageName: String, appName: String, isBlocked: Boolean) {
        bridgeScope.launch {
            val existing = blockedAppDao.getByPackageName(packageName)
            blockedAppDao.upsert(
                BlockedApp(
                    packageName = packageName,
                    appName = appName,
                    isBlocked = isBlocked,
                    dailyLimitMinutes = existing?.dailyLimitMinutes ?: 0L,
                ),
            )
            Log.i(TAG, "ZENOX_DB: App $packageName ($appName) status changed -> isBlocked=$isBlocked")
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        Log.d(TAG, "addListener called for event=$eventName")
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        Log.d(TAG, "removeListeners called count=$count")
    }

    private fun emitStatusChanged() {
        if (!reactApplicationContext.hasActiveCatalystInstance()) return
        val payload = Arguments.createMap()
        val status = ZenoxState.getStatus()
        val now = System.currentTimeMillis()
        payload.putBoolean("isActive", status is ZenStatus.ACTIVE)
        val remaining = if (status is ZenStatus.ACTIVE) ZenoxManager.getEffectiveRemainingMillis(now) else 0L
        payload.putDouble("remainingTime", remaining.toDouble())
        Log.d(TAG, "emitStatusChanged isActive=${status is ZenStatus.ACTIVE} remainingMs=$remaining")
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("ZenoxStatusChanged", payload)
    }

    companion object {
        const val MODULE_NAME = "ZenoxBridge"
        private const val TAG = "ZenoxBridgeModule"
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        val expected = "${reactApplicationContext.packageName}/${com.zenox.engine.ZenoxAccessibilityService::class.java.name}"
        return enabledServices.split(":").any { it.equals(expected, ignoreCase = true) }
    }

    private fun parseTime(time: String): Pair<Int, Int> {
        val parts = time.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull()?.coerceIn(0, 23) ?: 0
        val minute = parts.getOrNull(1)?.toIntOrNull()?.coerceIn(0, 59) ?: 0
        return hour to minute
    }

    private fun formatTime(hour: Int, minute: Int): String {
        val safeHour = hour.coerceIn(0, 23)
        val safeMinute = minute.coerceIn(0, 59)
        return "%02d:%02d".format(safeHour, safeMinute)
    }

    private suspend fun queryDailyStats(days: Int): com.facebook.react.bridge.WritableArray {
        val usageManager = reactApplicationContext
            .getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val blockedPackages = blockedAppDao.getBlockedApps().map { it.packageName }.toSet()
        val ownPackage = reactApplicationContext.packageName
        val dayFormat = SimpleDateFormat("EEE", Locale.US)
        val result = Arguments.createArray()
        val window = days.coerceIn(1, 60)

        for (offset in (window - 1) downTo 0) {
            val dayStartCal = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, -offset)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val dayStart = dayStartCal.timeInMillis
            val dayEnd = dayStart + 24L * 60L * 60L * 1000L

            val usageStats = usageManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                dayStart,
                dayEnd,
            )
            val totalUserForegroundMs = usageStats
                .asSequence()
                .filter { stat ->
                    stat.packageName != ownPackage && isUserApp(stat.packageName)
                }
                .sumOf { it.totalTimeInForeground.coerceAtLeast(0L) }
            val minutes = (totalUserForegroundMs / 60000L).toInt()

            var attempts = 0
            if (blockedPackages.isNotEmpty()) {
                val events = usageManager.queryEvents(dayStart, dayEnd)
                val event = UsageEvents.Event()
                while (events.hasNextEvent()) {
                    events.getNextEvent(event)
                    if (
                        event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND &&
                        blockedPackages.contains(event.packageName)
                    ) {
                        attempts++
                    }
                }
            }

            result.pushMap(
                Arguments.createMap().apply {
                    putString("day", dayFormat.format(dayStartCal.time))
                    putInt("minutes", minutes)
                    putInt("attempts", attempts)
                },
            )
        }

        return result
    }

    private fun isUserApp(packageName: String): Boolean {
        return try {
            val info = reactApplicationContext.packageManager.getApplicationInfo(packageName, 0)
            (info.flags and ApplicationInfo.FLAG_SYSTEM) == 0
        } catch (_: Exception) {
            false
        }
    }
}
