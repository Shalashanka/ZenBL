package com.zenox

import android.content.Intent
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.provider.Settings
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.zenox.engine.ZenEngine
import com.zenox.engine.db.BlockedAppEntity
import com.zenox.engine.db.ScheduleEntity
import com.zenox.engine.db.ZenDatabase
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.*

/**
 * Thin Bridge — only 4 methods exposed to JS:
 * 1. syncConfig(json) — push config from JS to Room DB
 * 2. getEngineStatus() — pull engine state for UI
 * 3. triggerManualZen(sec, fortress) — start a manual session
 * 4. getInstalledApps() — scan device for launchable apps
 */
class ZenEngineModule(reactContext: ReactApplicationContext) : NativeZenEngineSpec(reactContext) {

    companion object {
        const val NAME = "ZenEngine"
        private const val TAG = "ZenEngineModule"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val gson = Gson()

    override fun getName() = NAME

    /** ── Blocked Apps CRUD ── */
    override fun setBlockedApps(json: String) {
        scope.launch {
            try {
                val db = ZenDatabase.getInstance(reactApplicationContext)
                val apps =
                        gson.fromJson<List<BlockedApp>>(
                                json,
                                object : TypeToken<List<BlockedApp>>() {}.type
                        )

                val entities =
                        apps.map {
                            BlockedAppEntity(
                                    packageName = it.packageName,
                                    appName = it.appName,
                                    iconBase64 = it.iconBase64
                            )
                        }
                db.zenDao().replaceAllBlockedApps(entities)
                ZenEngine.syncBlockListToPrefs(entities.map { it.packageName })
                Log.d(TAG, "✅ Set ${entities.size} blocked apps")
            } catch (e: Exception) {
                Log.e(TAG, "setBlockedApps failed", e)
            }
        }
    }

    override fun fetchBlockedApps(promise: Promise) {
        scope.launch {
            try {
                val db = ZenDatabase.getInstance(reactApplicationContext)
                val apps = db.zenDao().getAllBlockedApps()
                val result = Arguments.createArray()
                apps.forEach { app ->
                    result.pushMap(
                            Arguments.createMap().apply {
                                putString("packageName", app.packageName)
                                putString("appName", app.appName)
                                putString("iconBase64", app.iconBase64)
                            }
                    )
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("FETCH_ERROR", e)
            }
        }
    }

    /** ── Schedules CRUD ── */
    override fun fetchSchedules(promise: Promise) {
        scope.launch {
            try {
                val db = ZenDatabase.getInstance(reactApplicationContext)
                val schedules = db.zenDao().getAllSchedules()
                val result = Arguments.createArray()
                schedules.forEach { s ->
                    result.pushMap(
                            Arguments.createMap().apply {
                                putDouble("id", s.id.toDouble())
                                putString("name", s.name)
                                putInt("startHour", s.startHour)
                                putInt("startMinute", s.startMinute)
                                putInt("endHour", s.endHour)
                                putInt("endMinute", s.endMinute)
                                putString("daysOfWeek", s.daysOfWeek)
                                putBoolean("isFortress", s.isFortress)
                                putBoolean("isEnabled", s.isEnabled)
                                putString("blockedAppsJson", s.blockedAppsJson)
                            }
                    )
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("FETCH_ERROR", e)
            }
        }
    }

    override fun saveSchedule(json: String, promise: Promise) {
        scope.launch {
            try {
                val db = ZenDatabase.getInstance(reactApplicationContext)
                val data = gson.fromJson(json, ScheduleData::class.java)

                val entity =
                        ScheduleEntity(
                                id = data.id ?: 0L, // 0 = insert, >0 = update
                                name = data.name,
                                startHour = data.startHour,
                                startMinute = data.startMinute,
                                endHour = data.endHour,
                                endMinute = data.endMinute,
                                daysOfWeek = data.daysOfWeek ?: "1,2,3,4,5,6,7",
                                isFortress = data.isFortress ?: false,
                                isEnabled = data.isEnabled ?: true,
                                blockedAppsJson = data.blockedAppsJson
                        )

                val id = db.zenDao().insertSchedule(entity)
                promise.resolve(id.toDouble())
            } catch (e: Exception) {
                promise.reject("SAVE_ERROR", e)
            }
        }
    }

    override fun deleteSchedule(id: Double, promise: Promise) {
        scope.launch {
            try {
                val db = ZenDatabase.getInstance(reactApplicationContext)
                db.zenDao().deleteScheduleById(id.toLong())
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("DELETE_ERROR", e)
            }
        }
    }

    override fun getEngineStatus(promise: Promise) {
        try {
            val status = ZenEngine.getStatus()
            val result =
                    Arguments.createMap().apply {
                        putBoolean("isActive", status["isActive"] as Boolean)
                        putDouble(
                                "remainingSeconds",
                                (status["remainingSeconds"] as Long).toDouble()
                        )
                        putString("scheduleName", status["scheduleName"] as String)
                        putBoolean("isFortress", status["isFortress"] as Boolean)
                    }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ENGINE_ERROR", e.message)
        }
    }

    override fun triggerManualZen(durationSec: Double, isFortress: Boolean) {
        ZenEngine.startManualZen(durationSec.toInt(), isFortress)
    }

    override fun getInstalledApps(promise: Promise) {
        Thread {
                    try {
                        val pm = reactApplicationContext.packageManager
                        val mainIntent =
                                Intent(Intent.ACTION_MAIN, null).apply {
                                    addCategory(Intent.CATEGORY_LAUNCHER)
                                }

                        val apps =
                                pm.queryIntentActivities(mainIntent, 0)
                                        .sortedWith(ResolveInfo.DisplayNameComparator(pm))

                        val appList = Arguments.createArray()

                        for (info in apps) {
                            try {
                                val appInfo = info.activityInfo.applicationInfo ?: continue
                                val packageName = appInfo.packageName

                                // Skip our own app
                                if (packageName == reactApplicationContext.packageName) continue

                                val appName = appInfo.loadLabel(pm).toString()
                                val icon = appInfo.loadIcon(pm)
                                val iconBase64 = convertIconToBase64(icon)

                                appList.pushMap(
                                        Arguments.createMap().apply {
                                            putString("packageName", packageName)
                                            putString("appName", appName)
                                            putString("icon", iconBase64)
                                        }
                                )
                            } catch (_: Exception) {}
                        }

                        promise.resolve(appList)
                    } catch (e: Exception) {
                        promise.reject("ERR_FETCH_APPS", e)
                    }
                }
                .start()
    }

    // ── Utility Methods (not exposed to JS) ──

    override fun openAccessibilitySettings() {
        val intent =
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
        reactApplicationContext.startActivity(intent)
    }

    override fun isServiceEnabled(promise: Promise) {
        try {
            val enabledServices =
                    Settings.Secure.getString(
                            reactApplicationContext.contentResolver,
                            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                    )
                            ?: ""

            val myService =
                    android.content.ComponentName(
                            reactApplicationContext,
                            ZenAccessibilityService::class.java
                    )

            val isEnabled =
                    enabledServices.split(":").any {
                        android.content.ComponentName.unflattenFromString(it) == myService
                    }

            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    override fun checkOverlayPermission(promise: Promise) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
        } else {
            promise.resolve(true)
        }
    }

    override fun requestOverlayPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M &&
                        !Settings.canDrawOverlays(reactApplicationContext)
        ) {
            val intent =
                    Intent(
                                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                    android.net.Uri.parse(
                                            "package:${reactApplicationContext.packageName}"
                                    )
                            )
                            .apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            reactApplicationContext.startActivity(intent)
        }
    }

    override fun stopZen() {
        ZenEngine.stopZen()
    }

    private fun convertIconToBase64(drawable: Drawable): String {
        val bitmap =
                when (drawable) {
                    is BitmapDrawable -> drawable.bitmap
                    else -> {
                        val w = drawable.intrinsicWidth.coerceAtLeast(48)
                        val h = drawable.intrinsicHeight.coerceAtLeast(48)
                        Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also {
                            val canvas = Canvas(it)
                            drawable.setBounds(0, 0, canvas.width, canvas.height)
                            drawable.draw(canvas)
                        }
                    }
                }.let {
                    if (it.width > 96 || it.height > 96) {
                        Bitmap.createScaledBitmap(it, 96, 96, true)
                    } else it
                }

        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
    }

    // ── Data Classes for JSON parsing ──

    data class ConfigPayload(
            val blockedApps: List<BlockedApp>? = null,
            val schedules: List<ScheduleData>? = null
    )

    data class BlockedApp(
            val packageName: String,
            val appName: String,
            val iconBase64: String? = null
    )

    data class ScheduleData(
            val id: Long? = null,
            val name: String,
            val startHour: Int,
            val startMinute: Int,
            val endHour: Int,
            val endMinute: Int,
            val daysOfWeek: String? = null,
            val isFortress: Boolean? = null,
            val isEnabled: Boolean? = null,
            val blockedAppsJson: String? = null
    )
}
