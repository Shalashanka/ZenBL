package com.zenox.bridge

import android.content.Intent
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
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
            map.putDouble("remainingTime", max(status.endTimeEpochMillis - now, 0L).toDouble())
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
            map.putBoolean("isActive", true)
            map.putDouble("remainingSeconds", max((status.endTimeEpochMillis - now) / 1000L, 0L).toDouble())
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
                    val remaining = if (status is ZenStatus.ACTIVE) max(status.endTimeEpochMillis - now, 0L) else 0L
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
    fun setBlockedApps(json: String) {
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
            } catch (exception: Exception) {
                Log.e(TAG, "setBlockedApps failed", exception)
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
        val remaining = if (status is ZenStatus.ACTIVE) max(status.endTimeEpochMillis - now, 0L) else 0L
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
}
