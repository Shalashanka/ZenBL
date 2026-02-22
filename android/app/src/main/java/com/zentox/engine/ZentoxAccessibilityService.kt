package com.zentox.engine

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class ZentoxAccessibilityService : AccessibilityService() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var appDatabase: AppDatabase
    private lateinit var enforcer: ZentoxEnforcer
    private val enforcementGuard = EnforcementLoopGuard()

    override fun onCreate() {
        super.onCreate()
        appDatabase = AppDatabase.getInstance(this)
        ZentoxManager.initialize(this, appDatabase.blockedAppDao())
        enforcer = ZentoxEnforcer(appDatabase.blockedAppDao())
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
                    ZentoxOverlayService.isOverlayVisible() &&
                    packageName != applicationContext.packageName &&
                    !isTransientSystemUi
                ) {
                    Log.d(TAG, "Hiding overlay because foreground moved to package=$packageName")
                    ZentoxOverlayService.hide(this@ZentoxAccessibilityService)
                }
                return@launch
            }
            if (enforcementGuard.shouldSuppress(packageName, System.currentTimeMillis())) {
                Log.d(TAG, "Enforcement suppressed by cooldown guard for package=$packageName")
                return@launch
            }

            ZentoxOverlayService.show(this@ZentoxAccessibilityService, packageName)
            Log.i(TAG, "ZENOX_ENFORCEMENT: Blocked $packageName. Showing overlay.")
        }
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        ZentoxOverlayService.hide(this)
        ZentoxManager.shutdown()
        Log.i(TAG, "Accessibility service destroyed")
    }

    companion object {
        private const val TAG = "ZentoxAccessibility"
        private const val SYSTEM_UI_PACKAGE = "com.android.systemui"
    }
}

class ZentoxEngine(
    private val blockedAppDao: BlockedAppDao,
) {
    suspend fun isBlocked(packageName: String): Boolean = kotlinx.coroutines.withContext(Dispatchers.IO) {
        blockedAppDao.getByPackageName(packageName)?.isBlocked == true
    }
}

class ZentoxEnforcer(
    private val blockedAppDao: BlockedAppDao,
) {
    private val tag = "ZentoxEnforcer"
    private val engine = ZentoxEngine(blockedAppDao)

    suspend fun shouldEnforce(packageName: String?): Boolean {
        val normalizedPackage = packageName?.trim().takeUnless { it.isNullOrEmpty() } ?: return false
        if (ZentoxManager.isEmergencyBreakActive()) {
            Log.d(tag, "Emergency break active. Skipping enforcement for $normalizedPackage")
            return false
        }
        val status = ZentoxState.getStatus()
        if (status !is ZenStatus.ACTIVE) {
            Log.d(tag, "Zen inactive. Skipping enforcement for $normalizedPackage")
            return false
        }
        if (System.currentTimeMillis() >= status.endTimeEpochMillis) {
            Log.d(tag, "Zen expired at ${status.endTimeEpochMillis}. Stopping zen.")
            ZentoxManager.stopZen()
            return false
        }
        val blocked = engine.isBlocked(normalizedPackage)
        Log.d(tag, "Enforcement check package=$normalizedPackage blocked=$blocked trigger=${status.triggerType}")
        return blocked
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
