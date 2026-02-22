package com.zentox.engine

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

class ZentoxAlarmManager(
    private val nowProvider: () -> Long = { System.currentTimeMillis() },
) {
    fun scheduleNextAlarm(context: Context, schedule: ZenSchedule) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val triggerAtMillis = computeNextTriggerAt(schedule, nowProvider())
        val durationMillis = computeDurationMillis(schedule)
        val intent = Intent(context, ZentoxReceiver::class.java).apply {
            action = ZentoxReceiver.ACTION_ZENOX_SCHEDULE_TRIGGER
            putExtra(ZentoxReceiver.EXTRA_SCHEDULE_ID, schedule.id)
            putExtra(ZentoxReceiver.EXTRA_DURATION_MILLIS, durationMillis)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            schedule.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            pendingIntent,
        )
    }

    fun cancelAlarm(context: Context, scheduleId: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, ZentoxReceiver::class.java).apply {
            action = ZentoxReceiver.ACTION_ZENOX_SCHEDULE_TRIGGER
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            scheduleId.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.cancel(pendingIntent)
    }

    internal fun computeNextTriggerAt(schedule: ZenSchedule, nowMillis: Long): Long {
        val (hour, minute) = parseTime(schedule.startTime)
        val allowedDays = parseDaysOfWeek(schedule.daysOfWeek)
        val base = Calendar.getInstance().apply { timeInMillis = nowMillis }

        for (offset in 0..7) {
            val candidate = (base.clone() as Calendar).apply {
                add(Calendar.DAY_OF_YEAR, offset)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val validDay = allowedDays.isEmpty() || allowedDays.contains(candidate.get(Calendar.DAY_OF_WEEK))
            if (!validDay) continue
            if (candidate.timeInMillis > nowMillis) return candidate.timeInMillis
        }

        return (base.clone() as Calendar).apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    internal fun computeDurationMillis(schedule: ZenSchedule): Long {
        val (startHour, startMinute) = parseTime(schedule.startTime)
        val (endHour, endMinute) = parseTime(schedule.endTime)
        val startMins = startHour * 60 + startMinute
        val endMins = endHour * 60 + endMinute
        val diffMins = if (endMins >= startMins) endMins - startMins else (24 * 60 - startMins) + endMins
        return (if (diffMins <= 0) 1 else diffMins) * 60_000L
    }

    private fun parseTime(time: String): Pair<Int, Int> {
        val parts = time.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 0
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
        return hour.coerceIn(0, 23) to minute.coerceIn(0, 59)
    }

    private fun parseDaysOfWeek(daysOfWeek: String): Set<Int> {
        return daysOfWeek.split(",")
            .mapNotNull { it.trim().toIntOrNull() }
            .filter { it in 1..7 }
            .toSet()
    }
}
