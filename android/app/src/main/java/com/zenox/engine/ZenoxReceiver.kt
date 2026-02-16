package com.zenox.engine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ZenoxReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val safeContext = context ?: return
        val action = intent?.action ?: return

        if (action == Intent.ACTION_BOOT_COMPLETED) {
            val db = AppDatabase.getInstance(safeContext)
            ZenoxManager.initialize(safeContext, db.blockedAppDao())
            ZenoxManager.refreshSchedules()
            return
        }

        if (action != ACTION_ZENOX_SCHEDULE_TRIGGER) return
        val durationMillis = intent.getLongExtra(EXTRA_DURATION_MILLIS, 60_000L)
        ZenoxManager.startZen(durationMillis = durationMillis, type = "SCHEDULE")
    }

    companion object {
        const val ACTION_ZENOX_SCHEDULE_TRIGGER = "com.zenox.engine.action.SCHEDULE_TRIGGER"
        const val EXTRA_SCHEDULE_ID = "scheduleId"
        const val EXTRA_DURATION_MILLIS = "durationMillis"
    }
}
