package com.zenox.engine

import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Calendar
import java.util.Locale
import kotlin.random.Random

class ZenoxOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var selectedBreakDurationMillis: Long = BREAK_OPTIONS.first().first
    private val emergencyHoldRunnable = Runnable {
        ZenoxManager.requestEmergencyBreak(durationMillis = selectedBreakDurationMillis)
        hideOverlay()
    }
    private var showHoldHintRunnable: Runnable? = null
    private var holdAnimator: ValueAnimator? = null
    private var holdProgress = 0f

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
        holdAnimator?.cancel()
        holdAnimator = null
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
        val appDisplayName = resolveAppDisplayName(blockedPackageName)
        val blockedAttemptsToday = countBlockedAttemptsToday(blockedPackageName)
        val quote = pickQuote()
        val preservedMinutes = ZenoxManager.getActiveSessionElapsedMinutes()
        val totalSavedMinutes = ZenoxManager.getTotalTimeSavedTodayMinutes()

        val bgColor = Color.parseColor("#1F2A22")
        val surfaceColor = Color.parseColor("#2A3A2F")
        val accentColor = Color.parseColor("#2D6A4F")
        val textColor = Color.parseColor("#F4FFF8")
        val mutedTextColor = Color.parseColor("#A7C4B6")

        val root = FrameLayout(this).apply {
            setBackgroundColor(bgColor)
            isClickable = true
            isFocusable = true
            @Suppress("DEPRECATION")
            systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }

        val contentCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(20))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(22).toFloat()
                setColor(surfaceColor)
                setStroke(dp(1), Color.parseColor("#33FFFFFF"))
            }
        }

        val statusPill = TextView(this).apply {
            text = "ZEN MODE ACTIVE"
            setTextColor(textColor)
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(10), dp(6), dp(10), dp(6))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(999).toFloat()
                setColor(accentColor)
            }
        }

        val title = TextView(this).apply {
            text = "$appDisplayName is resting."
            setTextColor(textColor)
            textSize = 24f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(14), 0, dp(8))
        }

        val subtitle = TextView(this).apply {
            text = "You have preserved $preservedMinutes minutes of focus so far."
            setTextColor(mutedTextColor)
            textSize = 15f
            setLineSpacing(dp(2).toFloat(), 1.05f)
        }

        val statsWrap = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(14))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#1AFFFFFF"))
            }
        }

        val attemptsStat = TextView(this).apply {
            val suffix = if (blockedAttemptsToday == 1) "attempt" else "attempts"
            text = "This is your $blockedAttemptsToday $suffix to open this app today."
            setTextColor(textColor)
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
        }

        val savedStat = TextView(this).apply {
            text = "Total time saved today: ${formatMinutesToHourMinute(totalSavedMinutes)}"
            setTextColor(mutedTextColor)
            textSize = 13f
            setPadding(0, dp(6), 0, 0)
        }

        val quoteText = TextView(this).apply {
            text = "\"$quote\""
            setTextColor(mutedTextColor)
            textSize = 13f
            setPadding(0, dp(8), 0, 0)
            setLineSpacing(dp(2).toFloat(), 1.06f)
            typeface = Typeface.SERIF
        }

        val holdHint = TextView(this).apply {
            text = "Hold for 5 seconds to unlock"
            setTextColor(mutedTextColor)
            textSize = 12f
            gravity = Gravity.CENTER
            alpha = 0f
            setPadding(0, dp(8), 0, 0)
        }

        val holdButton = FrameLayout(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14).toFloat()
                setColor(Color.TRANSPARENT)
                setStroke(dp(1), accentColor)
            }
            minimumHeight = dp(52)
            isClickable = true
            isFocusable = true
        }

        val holdFill = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14).toFloat()
                setColor(accentColor)
            }
        }

        val holdLabel = TextView(this).apply {
            text = "Need a break? Hold to unlock"
            gravity = Gravity.CENTER
            setTextColor(textColor)
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }

        val durationWrap = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }
        val optionButtons = mutableMapOf<Long, TextView>()

        fun updateSelectedDuration(durationMillis: Long) {
            selectedBreakDurationMillis = durationMillis
            optionButtons.forEach { (optionDuration, button) ->
                val selected = optionDuration == durationMillis
                button.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dp(999).toFloat()
                    setColor(if (selected) accentColor else Color.TRANSPARENT)
                    setStroke(dp(1), if (selected) accentColor else Color.parseColor("#33FFFFFF"))
                }
                button.setTextColor(if (selected) textColor else mutedTextColor)
            }
            val label = BREAK_OPTIONS.firstOrNull { it.first == durationMillis }?.second ?: "5m"
            holdHint.text = "Hold 5s to unlock for $label"
        }

        BREAK_OPTIONS.forEachIndexed { index, (durationMillis, label) ->
            val optionButton = TextView(this).apply {
                text = label
                textSize = 12f
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(dp(12), dp(8), dp(12), dp(8))
                setOnClickListener {
                    updateSelectedDuration(durationMillis)
                }
            }
            optionButtons[durationMillis] = optionButton
            durationWrap.addView(
                optionButton,
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ).apply {
                    if (index > 0) leftMargin = dp(8)
                },
            )
        }
        updateSelectedDuration(selectedBreakDurationMillis)

        holdButton.addView(
            holdFill,
            FrameLayout.LayoutParams(0, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.START),
        )
        holdButton.addView(
            holdLabel,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER,
            ),
        )

        holdButton.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    showHoldHintRunnable = Runnable {
                        holdHint.animate().alpha(1f).setDuration(180).start()
                    }
                    mainHandler.postDelayed(showHoldHintRunnable!!, 1_000L)
                    startHoldAnimation(holdButton, holdFill)
                    true
                }

                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    showHoldHintRunnable?.let { mainHandler.removeCallbacks(it) }
                    showHoldHintRunnable = null
                    holdHint.animate().alpha(0f).setDuration(140).start()
                    resetHoldAnimation(holdFill)
                    true
                }

                else -> false
            }
        }

        val alternateAction = TextView(this).apply {
            text = "Take 3 deep breaths instead"
            gravity = Gravity.CENTER
            setTextColor(mutedTextColor)
            textSize = 13f
            setPadding(0, dp(12), 0, 0)
            setOnClickListener {
                holdHint.text = "Inhale 4s - Hold 4s - Exhale 6s"
                holdHint.alpha = 1f
            }
        }

        statsWrap.addView(attemptsStat)
        statsWrap.addView(savedStat)
        statsWrap.addView(quoteText)

        contentCard.addView(statusPill)
        contentCard.addView(title)
        contentCard.addView(subtitle)
        contentCard.addView(
            statsWrap,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply {
                topMargin = dp(16)
            },
        )
        contentCard.addView(
            durationWrap,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply {
                topMargin = dp(12)
            },
        )
        contentCard.addView(
            holdButton,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(56),
            ).apply {
                topMargin = dp(18)
            },
        )
        contentCard.addView(holdHint)
        contentCard.addView(alternateAction)

        root.addView(
            contentCard,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER,
            ).apply {
                leftMargin = dp(16)
                rightMargin = dp(16)
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
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
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
        private val BREAK_OPTIONS = listOf(
            30_000L to "30s",
            60_000L to "1m",
            120_000L to "2m",
            180_000L to "3m",
            300_000L to "5m",
        )
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

    private fun resolveAppDisplayName(packageName: String?): String {
        if (packageName.isNullOrBlank()) return "This app"
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            val label = packageManager.getApplicationLabel(appInfo).toString().trim()
            if (label.isNotBlank()) label else packageName
        } catch (_: Exception) {
            packageName
        }
    }

    private fun countBlockedAttemptsToday(packageName: String?): Int {
        if (packageName.isNullOrBlank()) return 0
        return try {
            val usageManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0
            val dayStart = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val now = System.currentTimeMillis()
            val events = usageManager.queryEvents(dayStart, now)
            val event = UsageEvents.Event()
            var attempts = 0
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (
                    event.packageName == packageName &&
                    event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
                ) {
                    attempts++
                }
            }
            attempts
        } catch (exception: Exception) {
            Log.w(TAG, "Unable to compute blocked attempts for $packageName", exception)
            0
        }
    }

    private fun pickQuote(): String {
        val quotes = listOf(
            "Discipline is choosing what matters most.",
            "Attention is your most valuable currency.",
            "Calm focus compounds over time.",
            "A clear mind creates better work.",
            "Small pauses protect big goals.",
        )
        return quotes[Random.nextInt(quotes.size)]
    }

    private fun startHoldAnimation(holdButton: View, holdFill: View) {
        holdAnimator?.cancel()
        val startProgress = holdProgress
        holdAnimator = ValueAnimator.ofFloat(startProgress, 1f).apply {
            duration = ((1f - startProgress) * EMERGENCY_HOLD_MS).toLong().coerceAtLeast(120L)
            interpolator = android.view.animation.LinearInterpolator()
            addUpdateListener { animator ->
                holdProgress = animator.animatedValue as Float
                val targetWidth = (holdButton.width * holdProgress).toInt()
                holdFill.layoutParams = (holdFill.layoutParams as FrameLayout.LayoutParams).apply {
                    width = targetWidth
                }
            }
            doOnEnd {
                if (holdProgress >= 0.999f) {
                    mainHandler.post(emergencyHoldRunnable)
                }
            }
        }
        holdAnimator?.start()
    }

    private fun resetHoldAnimation(holdFill: View) {
        holdAnimator?.cancel()
        holdAnimator = null
        holdProgress = 0f
        holdFill.layoutParams = (holdFill.layoutParams as FrameLayout.LayoutParams).apply {
            width = 0
        }
    }

    private fun ValueAnimator.doOnEnd(block: () -> Unit) {
        addListener(
            object : android.animation.Animator.AnimatorListener {
                override fun onAnimationStart(animation: android.animation.Animator) = Unit

                override fun onAnimationEnd(animation: android.animation.Animator) = block()

                override fun onAnimationCancel(animation: android.animation.Animator) = Unit

                override fun onAnimationRepeat(animation: android.animation.Animator) = Unit
            },
        )
    }

    private fun formatMinutesToHourMinute(totalMinutes: Int): String {
        val h = totalMinutes / 60
        val m = totalMinutes % 60
        return String.format(Locale.US, "%02d:%02d", h, m)
    }

    private fun dp(value: Int): Int {
        val density = resources.displayMetrics.density
        return (value * density).toInt()
    }
}
