package com.zenox.engine

import android.Manifest
import android.app.PendingIntent
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.zenox.R

class ZenoxNotificationManager(
    private val context: Context,
) {
    fun showOrUpdate(profileName: String, remainingMillis: Long) {
        if (!canPostNotifications()) return
        ensureChannel()
        val remainingLabel = formatRemaining(remainingMillis)
        val title = "Zen Active - $profileName"
        val body = "Time left: $remainingLabel"
        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
        val launchPendingIntent = launchIntent?.let {
            PendingIntent.getActivity(
                context,
                0,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$body\nKeep breathing, one focused step at a time."))
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(launchPendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    fun cancel() {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existing = manager.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Zen Sessions",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Shows active Zen session status and countdown."
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }

    private fun canPostNotifications(): Boolean {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun formatRemaining(remainingMillis: Long): String {
        val totalSec = (remainingMillis.coerceAtLeast(0L) / 1000L).toInt()
        val min = totalSec / 60
        val sec = totalSec % 60
        return "%02d:%02d".format(min, sec)
    }

    companion object {
        private const val CHANNEL_ID = "zenox_active_session_channel"
        private const val NOTIFICATION_ID = 20261
    }
}
