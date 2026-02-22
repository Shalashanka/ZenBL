package com.zentox.engine

import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

open class UsageTracker(
    private val context: Context,
) {
    open fun getTodayUsage(packageName: String): Long {
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val now = System.currentTimeMillis()
        val startOfDay = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        val stats = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now)
        val totalMs = stats
            .asSequence()
            .filter { it.packageName == packageName }
            .sumOf { it.totalTimeInForeground }
        return totalMs / 60_000L
    }
}
