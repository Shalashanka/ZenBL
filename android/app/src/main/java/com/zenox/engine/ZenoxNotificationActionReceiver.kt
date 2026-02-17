package com.zenox.engine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class ZenoxNotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val appContext = context.applicationContext
        val blockedDao = AppDatabase.getInstance(appContext).blockedAppDao()
        ZenoxManager.initialize(appContext, blockedDao)
        when (intent?.action) {
            ACTION_END_ZEN -> {
                ZenoxManager.stopZen()
                Log.i(TAG, "Notification action: END_ZEN")
            }
            ACTION_BREAK_5M -> {
                ZenoxManager.requestEmergencyBreak(durationMillis = 5 * 60_000L)
                Log.i(TAG, "Notification action: BREAK_5M")
            }
            else -> Unit
        }
    }

    companion object {
        const val ACTION_END_ZEN = "com.zenox.engine.action.NOTIF_END_ZEN"
        const val ACTION_BREAK_5M = "com.zenox.engine.action.NOTIF_BREAK_5M"
        private const val TAG = "ZenoxNotifActionRcvr"
    }
}
