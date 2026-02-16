package com.zenox.engine

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView

class ZenoxOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val emergencyHoldRunnable = Runnable {
        ZenoxManager.requestEmergencyBreak()
        hideOverlay()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand action=${intent?.action} startId=$startId")
        when (intent?.action) {
            ACTION_SHOW -> showOverlay(intent.getStringExtra(EXTRA_PACKAGE_NAME))
            ACTION_HIDE -> hideOverlay()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        hideOverlay()
        super.onDestroy()
    }

    private fun showOverlay(blockedPackageName: String?) {
        Log.i(TAG, "showOverlay requested for package=$blockedPackageName")
        if (overlayView != null) {
            overlayVisible = true
            return
        }
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return
        val view = createOverlayView(blockedPackageName)

        try {
            windowManager?.addView(view, createLayoutParams())
            overlayView = view
            overlayVisible = true
            Log.i(TAG, "Overlay attached successfully")
        } catch (securityException: SecurityException) {
            overlayVisible = false
            Log.e(TAG, "Unable to show overlay. Missing overlay permission.", securityException)
            stopSelf()
        } catch (exception: Exception) {
            overlayVisible = false
            Log.e(TAG, "Overlay failed to attach.", exception)
            stopSelf()
        }
    }

    private fun createOverlayView(blockedPackageName: String?): View {
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            isClickable = true
            isFocusable = true
        }

        val title = TextView(this).apply {
            text = if (blockedPackageName.isNullOrBlank()) {
                "Zenox is Active"
            } else {
                "Zenox is Active\n$blockedPackageName is blocked"
            }
            setTextColor(Color.WHITE)
            textSize = 24f
            gravity = Gravity.CENTER
        }

        val button = Button(this).apply {
            text = "Need 5 Minutes?"
            setOnClickListener {
                ZenoxManager.requestEmergencyBreak()
                hideOverlay()
            }
            setOnTouchListener { _, event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        mainHandler.postDelayed(emergencyHoldRunnable, EMERGENCY_HOLD_MS)
                        true
                    }

                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        mainHandler.removeCallbacks(emergencyHoldRunnable)
                        false
                    }

                    else -> false
                }
            }
        }

        root.addView(
            title,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER,
            ),
        )
        root.addView(
            button,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER_HORIZONTAL or Gravity.BOTTOM,
            ).apply {
                bottomMargin = 160
            },
        )
        return root
    }

    private fun createLayoutParams(): WindowManager.LayoutParams {
        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT,
        )
    }

    private fun hideOverlay() {
        val view = overlayView ?: return
        Log.i(TAG, "hideOverlay requested")
        try {
            windowManager?.removeView(view)
        } catch (_: Exception) {
            // Best effort cleanup.
        } finally {
            overlayView = null
            overlayVisible = false
        }
        stopSelf()
    }

    companion object {
        private const val TAG = "ZenoxOverlayService"
        private const val EMERGENCY_HOLD_MS = 5_000L
        private const val ACTION_SHOW = "com.zenox.engine.action.OVERLAY_SHOW"
        private const val ACTION_HIDE = "com.zenox.engine.action.OVERLAY_HIDE"
        private const val EXTRA_PACKAGE_NAME = "packageName"
        @Volatile
        private var overlayVisible: Boolean = false

        fun show(context: Context, packageName: String) {
            val intent = Intent(context, ZenoxOverlayService::class.java).apply {
                action = ACTION_SHOW
                putExtra(EXTRA_PACKAGE_NAME, packageName)
            }
            try {
                context.startService(intent)
            } catch (exception: Exception) {
                Log.e(TAG, "Unable to request overlay show.", exception)
            }
        }

        fun hide(context: Context) {
            if (!overlayVisible) return
            val intent = Intent(context, ZenoxOverlayService::class.java).apply {
                action = ACTION_HIDE
            }
            try {
                context.startService(intent)
            } catch (exception: Exception) {
                Log.e(TAG, "Unable to request overlay hide.", exception)
            }
        }

        fun isOverlayVisible(): Boolean = overlayVisible
    }
}
