package com.zenox.engine

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

class ZenoxAccessibilityService : AccessibilityService() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var appDatabase: AppDatabase
    private lateinit var enforcer: ZenoxEnforcer
    private val enforcementGuard = EnforcementLoopGuard()

    override fun onCreate() {
        super.onCreate()
        appDatabase = AppDatabase.getInstance(this)
        ZenoxManager.initialize(this, appDatabase.blockedAppDao())
        enforcer = ZenoxEnforcer(this, appDatabase.blockedAppDao())
        Log.i(TAG, "Accessibility service created and initialized")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = serviceInfo
        Log.i(
            TAG,
            "Accessibility service connected. eventTypes=${info?.eventTypes} feedbackType=${info?.feedbackType}",
        )
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString()?.takeIf { it.isNotBlank() } ?: return
        Log.d(TAG, "onAccessibilityEvent type=${event.eventType} package=$packageName")
        serviceScope.launch {
            if (!enforcer.shouldEnforce(packageName)) {
                Log.d(TAG, "No enforcement for package=$packageName")
                val isTransientSystemUi = packageName == SYSTEM_UI_PACKAGE
                if (
                    ZenoxOverlayService.isOverlayVisible() &&
                    packageName != applicationContext.packageName &&
                    !isTransientSystemUi
                ) {
                    Log.d(TAG, "Hiding overlay because foreground moved to package=$packageName")
                    ZenoxOverlayService.hide(this@ZenoxAccessibilityService)
                }
                return@launch
            }
            if (enforcementGuard.shouldSuppress(packageName, System.currentTimeMillis())) {
                Log.d(TAG, "Enforcement suppressed by cooldown guard for package=$packageName")
                return@launch
            }

            ZenoxOverlayService.show(this@ZenoxAccessibilityService, packageName)
            Log.i(TAG, "ZENOX_ENFORCEMENT: Blocked $packageName. Showing overlay.")
        }
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        ZenoxOverlayService.hide(this)
        ZenoxManager.shutdown()
        Log.i(TAG, "Accessibility service destroyed")
    }

    companion object {
        private const val TAG = "ZenoxAccessibility"
        private const val SYSTEM_UI_PACKAGE = "com.android.systemui"
    }
}

class ZenoxEngine(
    private val context: Context,
    private val blockedAppDao: BlockedAppDao,
) {
    suspend fun isBlocked(packageName: String): Boolean = kotlinx.coroutines.withContext(Dispatchers.IO) {
        val activeProfileBlocked = readActiveProfileBlockedPackages(context)
        if (activeProfileBlocked.isNotEmpty()) {
            return@withContext activeProfileBlocked.contains(packageName)
        }
        blockedAppDao.getByPackageName(packageName)?.isBlocked == true
    }
}

class ZenoxEnforcer(
    private val context: Context,
    private val blockedAppDao: BlockedAppDao,
) {
    private val tag = "ZenoxEnforcer"
    private val engine = ZenoxEngine(context, blockedAppDao)

    suspend fun shouldEnforce(packageName: String?): Boolean {
        val normalizedPackage = packageName?.trim().takeUnless { it.isNullOrEmpty() } ?: return false
        if (ZenoxManager.isEmergencyBreakActive()) {
            Log.d(tag, "Emergency break active. Skipping enforcement for $normalizedPackage")
            return false
        }
        val status = ZenoxState.getStatus()
        if (status !is ZenStatus.ACTIVE) {
            Log.d(tag, "Zen inactive. Skipping enforcement for $normalizedPackage")
            return false
        }
        if (System.currentTimeMillis() >= status.endTimeEpochMillis) {
            Log.d(tag, "Zen expired at ${status.endTimeEpochMillis}. Stopping zen.")
            ZenoxManager.stopZen()
            return false
        }
        val blocked = engine.isBlocked(normalizedPackage)
        Log.d(tag, "Enforcement check package=$normalizedPackage blocked=$blocked trigger=${status.triggerType}")
        return blocked
    }
}

private fun readActiveProfileBlockedPackages(context: Context): Set<String> {
    return try {
        val raw = context
            .getSharedPreferences("zenox_profile_sync", Context.MODE_PRIVATE)
            .getString("active_profile_json", null)
            ?: return emptySet()
        val obj = JSONObject(raw)
        val arr = obj.optJSONArray("blockedApps") ?: return emptySet()
        buildSet {
            for (i in 0 until arr.length()) {
                val pkg = arr.optString(i).trim()
                if (pkg.isNotEmpty()) add(pkg)
            }
        }
    } catch (_: Exception) {
        emptySet()
    }
}

internal class EnforcementLoopGuard(
    private val cooldownMillis: Long = 700L,
) {
    private var lastPackageName: String? = null
    private var lastRedirectAt: Long = 0L

    @Synchronized
    fun shouldSuppress(packageName: String, nowMillis: Long): Boolean {
        val isRapidRepeat = lastPackageName == packageName && (nowMillis - lastRedirectAt) < cooldownMillis
        if (isRapidRepeat) return true
        lastPackageName = packageName
        lastRedirectAt = nowMillis
        return false
    }
}
