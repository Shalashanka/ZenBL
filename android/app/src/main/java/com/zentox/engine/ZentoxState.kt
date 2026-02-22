package com.zentox.engine

import android.content.Context
import java.util.concurrent.atomic.AtomicReference

sealed class ZenStatus {
    data object INACTIVE : ZenStatus()

    data class ACTIVE(
        val triggerType: String,
        val endTimeEpochMillis: Long,
    ) : ZenStatus()
}

object ZentoxState {
    private const val PREF_NAME = "zentox_state"
    private const val KEY_ACTIVE = "active"
    private const val KEY_TRIGGER = "trigger"
    private const val KEY_END_TIME = "end_time"

    private val statusRef = AtomicReference<ZenStatus>(ZenStatus.INACTIVE)
    @Volatile
    private var appContext: Context? = null

    fun initialize(context: Context) {
        appContext = context.applicationContext
        readPersistedStatus()?.let { statusRef.set(it) }
    }

    fun getStatus(): ZenStatus {
        readPersistedStatus()?.let {
            statusRef.set(it)
            return it
        }
        return statusRef.get()
    }

    internal fun setStatus(newStatus: ZenStatus) {
        statusRef.set(newStatus)
        persistStatus(newStatus)
    }

    private fun persistStatus(status: ZenStatus) {
        val context = appContext ?: return
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        when (status) {
            is ZenStatus.INACTIVE -> {
                editor.putBoolean(KEY_ACTIVE, false)
                editor.remove(KEY_TRIGGER)
                editor.remove(KEY_END_TIME)
            }

            is ZenStatus.ACTIVE -> {
                editor.putBoolean(KEY_ACTIVE, true)
                editor.putString(KEY_TRIGGER, status.triggerType)
                editor.putLong(KEY_END_TIME, status.endTimeEpochMillis)
            }
        }
        editor.commit()
    }

    private fun readPersistedStatus(): ZenStatus? {
        val context = appContext ?: return null
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val active = prefs.getBoolean(KEY_ACTIVE, false)
        if (!active) return ZenStatus.INACTIVE
        val trigger = prefs.getString(KEY_TRIGGER, "UNKNOWN").orEmpty().ifBlank { "UNKNOWN" }
        val endTime = prefs.getLong(KEY_END_TIME, 0L)
        return if (endTime <= System.currentTimeMillis()) {
            ZenStatus.INACTIVE
        } else {
            ZenStatus.ACTIVE(triggerType = trigger, endTimeEpochMillis = endTime)
        }
    }
}
