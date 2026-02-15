package com.zenox

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.PixelFormat
import android.media.MediaPlayer
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.content.pm.ResolveInfo
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Standalone accessibility service. Reads kill list from SharedPreferences (synced by ZenEngine
 * from Room DB). Zero JS dependency.
 */
class ZenAccessibilityService :
        AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {

    companion object {
        private const val TAG = "ZenAccessibility"
        private const val REMOVE_OVERLAY_DELAY_MS = 1200L
        private const val OVERLAY_ADD_RETRY_DELAY_MS = 150L
        private const val HOME_TRANSITION_GRACE_MS = 1200L
    }

    private var wm: WindowManager? = null
    private var lastActivePackage = ""
    private lateinit var prefs: SharedPreferences
    private var overlayView: FrameLayout? = null
    private var overlayParams: WindowManager.LayoutParams? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var removeOverlayRunnable: Runnable? = null
    private var isRemovingOverlay = false
    private var suppressRemoveUntilMs = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val raw = event.packageName?.toString()?.trim() ?: return
            val packageName = normalizePackageName(raw)
            lastActivePackage = packageName
            checkAndBlock(packageName)
        }
    }

    /** Strip process suffix (e.g. ":push") so we match the base package name. */
    private fun normalizePackageName(raw: String): String {
        val s = raw.trim()
        val colon = s.indexOf(':')
        return if (colon > 0) s.substring(0, colon) else s
    }

    private fun checkAndBlock(packageName: String) {
        if (!::prefs.isInitialized) {
            prefs = getSharedPreferences("ZenoxBlockedApps", Context.MODE_PRIVATE)
        }

        val isZenActive = prefs.getBoolean("is_zen_mode_active", false)
        if (!isZenActive) {
            cancelRemoveOverlayPending()
            return
        }

        // Copy to new set — getStringSet can return a cached set that must not be modified
        val blockedPackages = (prefs.getStringSet("blocked_packages", emptySet()) ?: emptySet()).toSet()
        val normalizedBlocked = blockedPackages.map { normalizePackageName(it) }.toSet()

        val isBlocked = normalizedBlocked.contains(packageName)

        Log.d(
                TAG,
                "Window: $packageName | Blocked(${blockedPackages.size}): $isBlocked"
        )

        if (isBlocked) {
            cancelRemoveOverlayPending()
            Log.d(TAG, "🔴 BLOCKING: $packageName")
            blockApp()
        } else {
            // When we force HOME after blocking, transient launcher events should not immediately
            // tear down the overlay. Give the window stack time to settle.
            if (overlayView != null && (isHomePackage(packageName) || System.currentTimeMillis() < suppressRemoveUntilMs)) {
                return
            }
            // Debounce remove: transient windows (splash, dialog) can fire before the real app;
            // delay remove so we don't hide the overlay too early only to show it again.
            scheduleRemoveOverlayDelayed()
        }
    }

    private fun isHomePackage(packageName: String): Boolean {
        return try {
            val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolveInfo: ResolveInfo? = packageManager.resolveActivity(homeIntent, 0)
            val homePackage = resolveInfo?.activityInfo?.packageName
            homePackage != null && normalizePackageName(homePackage) == packageName
        } catch (_: Exception) {
            false
        }
    }

    private fun cancelRemoveOverlayPending() {
        removeOverlayRunnable?.let { mainHandler.removeCallbacks(it) }
        removeOverlayRunnable = null
    }

    private fun scheduleRemoveOverlayDelayed() {
        cancelRemoveOverlayPending()
        removeOverlayRunnable = Runnable {
            removeOverlayRunnable = null
            removeOverlayGracefully()
        }
        mainHandler.postDelayed(removeOverlayRunnable!!, REMOVE_OVERLAY_DELAY_MS)
    }

    override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
        when (key) {
            "is_zen_mode_active" -> {
                val isActive = sharedPreferences?.getBoolean(key, false) ?: false
                Log.d(TAG, "⚡ Zen Mode toggled: $isActive")
                if (isActive) {
                    cancelRemoveOverlayPending()
                    if (wm == null) wm = getSystemService(WINDOW_SERVICE) as WindowManager
                    checkAndBlock(lastActivePackage)
                } else {
                    cancelRemoveOverlayPending()
                    removeOverlayGracefully()
                }
            }
            "blocked_packages" -> {
                cancelRemoveOverlayPending()
                if (::prefs.isInitialized && prefs.getBoolean("is_zen_mode_active", false) && lastActivePackage.isNotEmpty()) {
                    Log.d(TAG, "⚡ Block list updated, re-checking: $lastActivePackage")
                    checkAndBlock(lastActivePackage)
                }
            }
        }
    }

    /**
     * Must run overlay and WindowManager.addView on the main thread.
     * onAccessibilityEvent is delivered on a binder thread, not the main thread.
     */
    private fun blockApp() {
        if (wm == null) wm = getSystemService(WINDOW_SERVICE) as WindowManager
        playBlockingAudio()

        mainHandler.post {
            suppressRemoveUntilMs = System.currentTimeMillis() + HOME_TRANSITION_GRACE_MS
            if (overlayView != null) {
                performGlobalAction(GLOBAL_ACTION_HOME)
                return@post
            }
            if (isRemovingOverlay) {
                performGlobalAction(GLOBAL_ACTION_HOME)
                return@post
            }
            if (!setupOverlay()) {
                mainHandler.postDelayed(
                    { if (overlayView == null) setupOverlay() },
                    OVERLAY_ADD_RETRY_DELAY_MS
                )
            }
            performGlobalAction(GLOBAL_ACTION_HOME)
        }
    }

    /** @return true if overlay was added successfully, false to retry later */
    private fun setupOverlay(): Boolean {
        overlayView = FrameLayout(this).apply { setBackgroundColor(0xFF0F2027.toInt()) }

        val content =
                LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                }

        // Emoji
        content.addView(
                TextView(this).apply {
                    text = "💨"
                    textSize = 60f
                    gravity = Gravity.CENTER
                }
        )

        // Title
        content.addView(
                TextView(this).apply {
                    text = "Time to find your Zen."
                    textSize = 24f
                    setTextColor(0xFFFFFFFF.toInt())
                    gravity = Gravity.CENTER
                    setPadding(0, 40, 0, 20)
                }
        )

        // Schedule name
        val scheduleName = prefs.getString("schedule_name", "") ?: ""
        if (scheduleName.isNotEmpty()) {
            content.addView(
                    TextView(this).apply {
                        text = "Blocked by: $scheduleName"
                        textSize = 16f
                        setTextColor(0xFFAAAAAA.toInt())
                        gravity = Gravity.CENTER
                        setPadding(0, 0, 0, 40)
                    }
            )
        }

        // Emergency exit (non-fortress only) — 10 second long press
        val isFortress = prefs.getBoolean("is_fortress_mode", false)
        if (!isFortress) {
            // Progress bar container
            val progressContainer =
                    FrameLayout(this).apply {
                        val lp = LinearLayout.LayoutParams(600, 12)
                        lp.topMargin = 60
                        layoutParams = lp
                        setBackgroundColor(0xFF333333.toInt())
                    }

            // Progress bar fill
            val progressFill =
                    android.view.View(this).apply {
                        layoutParams =
                                FrameLayout.LayoutParams(0, FrameLayout.LayoutParams.MATCH_PARENT)
                        setBackgroundColor(0xFFFF4444.toInt())
                    }
            progressContainer.addView(progressFill)

            // Status text
            val statusText =
                    TextView(this).apply {
                        text = "Hold to Emergency Exit (10s)"
                        textSize = 13f
                        setTextColor(0xFF888888.toInt())
                        gravity = Gravity.CENTER
                        setPadding(0, 16, 0, 0)
                    }

            val exitButton =
                    Button(this).apply {
                        text = "🔓 Emergency Exit"
                        setBackgroundColor(0x44FF4444.toInt())
                        setTextColor(0xFFFFFFFF.toInt())
                        setPadding(40, 20, 40, 20)
                    }

            var holdTimer: CountDownTimer? = null

            exitButton.setOnTouchListener { _, event ->
                when (event.action) {
                    android.view.MotionEvent.ACTION_DOWN -> {
                        statusText.text = "Keep holding... 10s"
                        holdTimer =
                                object : CountDownTimer(10000, 100) {
                                            override fun onTick(millisLeft: Long) {
                                                val elapsed = 10000 - millisLeft
                                                val progress =
                                                        (elapsed.toFloat() / 10000f * 600f).toInt()
                                                progressFill.layoutParams =
                                                        FrameLayout.LayoutParams(
                                                                progress,
                                                                FrameLayout.LayoutParams
                                                                        .MATCH_PARENT
                                                        )
                                                val secsLeft = (millisLeft / 1000) + 1
                                                statusText.text = "Keep holding... ${secsLeft}s"
                                            }

                                            override fun onFinish() {
                                                // Success — stop Zen and relaunch blocked app
                                                statusText.text = "Unlocked!"
                                                progressFill.layoutParams =
                                                        FrameLayout.LayoutParams(
                                                                600,
                                                                FrameLayout.LayoutParams
                                                                        .MATCH_PARENT
                                                        )
                                                progressFill.setBackgroundColor(0xFF44FF44.toInt())

                                                // Stop Zen Mode
                                                prefs.edit()
                                                        .putBoolean("is_zen_mode_active", false)
                                                        .apply()
                                                com.zenox.engine.ZenEngine.stopZen()

                                                // Relaunch the blocked app after a short delay
                                                val appToRelaunch = lastActivePackage
                                                Handler(Looper.getMainLooper())
                                                        .postDelayed(
                                                                {
                                                                    try {
                                                                        val launchIntent =
                                                                                packageManager
                                                                                        .getLaunchIntentForPackage(
                                                                                                appToRelaunch
                                                                                        )
                                                                        launchIntent?.addFlags(
                                                                                Intent.FLAG_ACTIVITY_NEW_TASK
                                                                        )
                                                                        if (launchIntent != null) {
                                                                            startActivity(
                                                                                    launchIntent
                                                                            )
                                                                        }
                                                                    } catch (e: Exception) {
                                                                        Log.e(
                                                                                TAG,
                                                                                "Failed to relaunch $appToRelaunch",
                                                                                e
                                                                        )
                                                                    }
                                                                },
                                                                300
                                                        )
                                            }
                                        }
                                        .start()
                        true
                    }
                    android.view.MotionEvent.ACTION_UP, android.view.MotionEvent.ACTION_CANCEL -> {
                        holdTimer?.cancel()
                        holdTimer = null
                        progressFill.layoutParams =
                                FrameLayout.LayoutParams(0, FrameLayout.LayoutParams.MATCH_PARENT)
                        progressFill.setBackgroundColor(0xFFFF4444.toInt())
                        statusText.text = "Hold to Emergency Exit (10s)"
                        true
                    }
                    else -> false
                }
            }

            content.addView(exitButton)
            content.addView(progressContainer)
            content.addView(statusText)
        } else {
            content.addView(
                    TextView(this).apply {
                        text = "🔒 Fortress Mode Active\nNo exit until timer ends"
                        textSize = 16f
                        setTextColor(0xFFFF4444.toInt())
                        gravity = Gravity.CENTER
                        setPadding(0, 60, 0, 0)
                    }
            )
        }

        overlayView!!.addView(
                content,
                FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.WRAP_CONTENT,
                                FrameLayout.LayoutParams.WRAP_CONTENT
                        )
                        .apply { gravity = Gravity.CENTER }
        )

        overlayParams =
                WindowManager.LayoutParams().apply {
                    type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                    format = PixelFormat.TRANSLUCENT
                    flags =
                            WindowManager.LayoutParams.FLAG_FULLSCREEN or
                                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
                    width = WindowManager.LayoutParams.MATCH_PARENT
                    height = WindowManager.LayoutParams.MATCH_PARENT
                    gravity = Gravity.CENTER
                }

        return try {
            wm?.addView(overlayView, overlayParams)
            Log.d(TAG, "🚀 Overlay added")
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to add overlay", e)
            overlayView = null
            false
        }
    }

    private fun removeOverlayGracefully() {
        if (isRemovingOverlay) return
        cancelRemoveOverlayPending()
        val viewToRemove = overlayView ?: return
        overlayView = null
        isRemovingOverlay = true

        mainHandler.post {
            try {
                val anim =
                        ValueAnimator.ofFloat(0f, 1f).apply {
                            duration = 800
                            addUpdateListener { animation ->
                                val progress = animation.animatedValue as Float
                                try {
                                    overlayParams?.alpha = 1f - progress
                                    wm?.updateViewLayout(viewToRemove, overlayParams)
                                    viewToRemove.scaleX = 1f + progress * 0.5f
                                    viewToRemove.scaleY = 1f + progress * 0.5f
                                } catch (_: Exception) {}
                            }
                            addListener(
                                    object : android.animation.AnimatorListenerAdapter() {
                                        override fun onAnimationEnd(
                                                animation: android.animation.Animator
                                        ) {
                                            try {
                                                wm?.removeView(viewToRemove)
                                            } catch (_: Exception) {}
                                            isRemovingOverlay = false
                                        }
                                    }
                            )
                        }
                anim.start()
            } catch (_: Exception) {
                try {
                    wm?.removeView(viewToRemove)
                } catch (_: Exception) {}
                isRemovingOverlay = false
            }
        }
    }

    private fun playBlockingAudio() {
        try {
            MediaPlayer.create(this, R.raw.flute)?.apply {
                setVolume(0.04f, 0.04f)
                start()
                setOnCompletionListener { it.release() }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Audio failed", e)
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "Service interrupted")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "🟢 Zenox Accessibility Service CONNECTED")
        com.zenox.engine.ZenEngine.init(applicationContext)

        val info =
                AccessibilityServiceInfo().apply {
                    eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                    feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
                    notificationTimeout = 100
                }
        setServiceInfo(info)

        prefs = getSharedPreferences("ZenoxBlockedApps", Context.MODE_PRIVATE)
        prefs.registerOnSharedPreferenceChangeListener(this)
    }

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        if (::prefs.isInitialized) {
            prefs.unregisterOnSharedPreferenceChangeListener(this)
        }
        return super.onUnbind(intent)
    }
}
