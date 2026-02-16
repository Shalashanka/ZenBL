package com.zenox.engine

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

object ZenoxManager {
    private const val TAG = "ZenoxManager"
    private const val HEARTBEAT_MS = 30_000L
    private const val USAGE_LIMIT_ZEN_MS = 60_000L
    private const val EMERGENCY_BREAK_MS = 5 * 60_000L

    private val managerScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var heartbeatJob: Job? = null
    private var blockedAppDao: BlockedAppDao? = null
    private var scheduleDao: ZenScheduleDao? = null
    private var usageTracker: UsageTracker? = null
    private var appContext: Context? = null
    private var zenoxAlarmManager: ZenoxAlarmManager = ZenoxAlarmManager()
    @Volatile
    private var emergencyBreakUntilEpochMillis: Long = 0L

    @Synchronized
    fun initialize(context: Context, dao: BlockedAppDao) {
        appContext = context.applicationContext
        ZenoxState.initialize(context.applicationContext)
        blockedAppDao = dao
        scheduleDao = AppDatabase.getInstance(context.applicationContext).zenScheduleDao()
        usageTracker = UsageTracker(context.applicationContext)
        Log.i(TAG, "initialize called. daoReady=${blockedAppDao != null}")
        startHeartbeat()
        refreshSchedules()
    }

    @Synchronized
    internal fun initializeForTest(
        dao: BlockedAppDao,
        tracker: UsageTracker,
        schedules: ZenScheduleDao? = null,
        alarms: ZenoxAlarmManager? = null,
        context: Context? = null,
    ) {
        blockedAppDao = dao
        usageTracker = tracker
        scheduleDao = schedules
        zenoxAlarmManager = alarms ?: ZenoxAlarmManager()
        appContext = context
    }

    @Synchronized
    fun startZen(durationMillis: Long, type: String?): ZenStatus {
        if (durationMillis <= 0L) {
            ZenoxState.setStatus(ZenStatus.INACTIVE)
            Log.w(TAG, "startZen received non-positive duration=$durationMillis; forcing INACTIVE")
            return ZenoxState.getStatus()
        }

        val triggerType = type?.trim().takeUnless { it.isNullOrEmpty() } ?: "UNKNOWN"
        val now = System.currentTimeMillis()
        val requestedEnd = now + durationMillis

        val nextStatus = when (val current = ZenoxState.getStatus()) {
            is ZenStatus.INACTIVE -> ZenStatus.ACTIVE(triggerType = triggerType, endTimeEpochMillis = requestedEnd)
            is ZenStatus.ACTIVE -> {
                // Never create a second session. Keep one active session and only extend end time.
                current.copy(
                    endTimeEpochMillis = maxOf(current.endTimeEpochMillis, requestedEnd),
                )
            }
        }

        ZenoxState.setStatus(nextStatus)
        Log.i(TAG, "ZENOX_ENGINE: Zen Started by $triggerType, durationMs=$durationMillis, nextStatus=$nextStatus")
        return nextStatus
    }

    @Synchronized
    fun stopZen() {
        Log.i(TAG, "stopZen called")
        ZenoxState.setStatus(ZenStatus.INACTIVE)
        emergencyBreakUntilEpochMillis = 0L
    }

    @Synchronized
    fun shutdown() {
        Log.i(TAG, "shutdown called")
        heartbeatJob?.cancel()
        heartbeatJob = null
        blockedAppDao = null
        scheduleDao = null
        usageTracker = null
        appContext = null
        zenoxAlarmManager = ZenoxAlarmManager()
        emergencyBreakUntilEpochMillis = 0L
    }

    @Synchronized
    fun requestEmergencyBreak(nowMillis: Long = System.currentTimeMillis()) {
        emergencyBreakUntilEpochMillis = nowMillis + EMERGENCY_BREAK_MS
        Log.i(TAG, "ZENOX_ENGINE: Emergency break granted for 5 minutes until=$emergencyBreakUntilEpochMillis")
    }

    fun isEmergencyBreakActive(nowMillis: Long = System.currentTimeMillis()): Boolean {
        val active = nowMillis < emergencyBreakUntilEpochMillis
        if (!active && emergencyBreakUntilEpochMillis != 0L) {
            Log.i(TAG, "Emergency break expired")
            emergencyBreakUntilEpochMillis = 0L
        }
        return active
    }

    @Synchronized
    private fun startHeartbeat() {
        if (heartbeatJob?.isActive == true) return
        Log.i(TAG, "Starting heartbeat every ${HEARTBEAT_MS}ms")
        heartbeatJob = managerScope.launch {
            while (isActive) {
                Log.d(TAG, "Heartbeat tick: status=${ZenoxState.getStatus()}")
                checkUsageLimits()
                delay(HEARTBEAT_MS)
            }
        }
    }

    private suspend fun checkUsageLimits() {
        val dao = blockedAppDao ?: return
        val tracker = usageTracker ?: return
        val limitedApps = dao.getAppsWithDailyLimit()
        Log.d(TAG, "checkUsageLimits limitedApps=${limitedApps.size}")

        for (app in limitedApps) {
            val usageMinutes = tracker.getTodayUsage(app.packageName)
            Log.d(
                TAG,
                "checkUsageLimits pkg=${app.packageName} usage=$usageMinutes limit=${app.dailyLimitMinutes}",
            )
            if (usageMinutes < app.dailyLimitMinutes) continue

            val currentStatus = ZenoxState.getStatus()
            if (currentStatus is ZenStatus.ACTIVE && currentStatus.triggerType == "MANUAL") {
                Log.d(TAG, "Usage limit reached but MANUAL zen is active; preserving manual session")
                return
            }
            startZen(durationMillis = USAGE_LIMIT_ZEN_MS, type = "USAGE_LIMIT")
            Log.i(TAG, "Usage limit triggered zen for ${app.packageName}")
            return
        }
    }

    internal suspend fun runUsageLimitCheckForTest() {
        checkUsageLimits()
    }

    fun refreshSchedules() {
        val dao = scheduleDao ?: return
        val context = appContext ?: return
        managerScope.launch {
            val enabledSchedules = dao.getActiveSchedules()
            Log.i(TAG, "refreshSchedules enabledSchedules=${enabledSchedules.size}")
            val nearest = enabledSchedules.minByOrNull {
                zenoxAlarmManager.computeNextTriggerAt(it, System.currentTimeMillis())
            } ?: return@launch
            Log.i(TAG, "refreshSchedules scheduling id=${nearest.id} name=${nearest.name}")
            zenoxAlarmManager.scheduleNextAlarm(context, nearest)
        }
    }
}
