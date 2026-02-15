package com.zenbl.engine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.zenbl.R

class ZenForegroundService : Service() {
    companion object {
        private const val TAG = "ZenForegroundService"
        private const val CHANNEL_ID = "zenox_channel"
        private const val NOTIFICATION_ID = 42
    }

    private var timer: CountDownTimer? = null
    private var currentScheduleName = "Zen Mode Active"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            intent?.getStringExtra("SCHEDULE_NAME")?.takeIf { it.isNotEmpty() }?.let {
                currentScheduleName = it
            }

            val endTime = intent?.getLongExtra("END_TIME", 0L) ?: 0L

            // Start as foreground immediately
            startForeground(NOTIFICATION_ID, buildNotification(currentScheduleName, "Starting..."))

            // Play flute on activation
            playAudio(R.raw.flute, 0.4f)

            if (endTime > 0) {
                startTimer(endTime)
            }
        } catch (e: Exception) {
            Log.e(TAG, "onStartCommand error", e)
            stopSelf()
        }
        return START_STICKY
    }

    private fun startTimer(endTime: Long) {
        timer?.cancel()

        val duration = endTime - System.currentTimeMillis()
        if (duration <= 0) {
            onTimerFinished()
            return
        }

        timer =
                object : CountDownTimer(duration, 1000) {
                            override fun onTick(millisUntilFinished: Long) {
                                val totalSeconds = millisUntilFinished / 1000
                                val minutes = totalSeconds / 60
                                val seconds = totalSeconds % 60
                                val timeStr = String.format("%02d:%02d", minutes, seconds)
                                updateNotification(timeStr)
                            }

                            override fun onFinish() {
                                onTimerFinished()
                            }
                        }
                        .start()
    }

    private fun onTimerFinished() {
        Log.d(TAG, "⏰ Timer finished!")

        // Play shakuhachi end sound
        playAudio(R.raw.shakuhachi_blow, 0.5f)

        // Tell the engine to stop
        ZenEngine.stopZen()

        // Delay stopping service so audio can play
        android.os.Handler(mainLooper)
                .postDelayed(
                        {
                            stopForeground(STOP_FOREGROUND_REMOVE)
                            stopSelf()
                        },
                        3000
                )
    }

    private fun playAudio(resId: Int, volume: Float) {
        try {
            val player = MediaPlayer.create(this, resId)
            player?.apply {
                setVolume(volume, volume)
                start()
                setOnCompletionListener { it.release() }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Audio playback failed", e)
        }
    }

    private fun updateNotification(timeStr: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(
                NOTIFICATION_ID,
                buildNotification(currentScheduleName, "Time Remaining: $timeStr")
        )
    }

    private fun buildNotification(title: String, text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel =
                    NotificationChannel(
                            CHANNEL_ID,
                            "Zenox Active Session",
                            NotificationManager.IMPORTANCE_LOW
                    )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        timer?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
