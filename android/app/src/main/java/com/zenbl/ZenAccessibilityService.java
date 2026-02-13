package com.zenbl;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityEvent;
import android.content.Intent;
import android.content.Context;
import android.content.SharedPreferences;
import java.util.Set;
import java.util.HashSet;
import android.util.Log;
import android.media.MediaPlayer;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.view.Gravity;
import android.graphics.PixelFormat;
import android.view.View;
import android.animation.ValueAnimator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.os.Handler;
import android.os.Looper;

public class ZenAccessibilityService extends AccessibilityService {
    private static final String TAG = "ZenAccessibilityService";
    private WindowManager wm;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "unknown";

            SharedPreferences prefs = getSharedPreferences("ZenBlockedApps", Context.MODE_PRIVATE);
            Set<String> blockedPackages = prefs.getStringSet("blocked_packages", new HashSet<>());

            Log.d(TAG, "Active Window: " + packageName + " | Blocked List Size: " + blockedPackages.size());

            if (blockedPackages.contains(packageName)) {
                Log.d(TAG, "🔴 MATCH FOUND! Blocking " + packageName);
                blockAppSequence();
            }
        }
    }

    private void blockAppSequence() {
        if (wm == null) {
            wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        }

        // 1. Play Audio (Flute Only, Low Volume)
        playBlockingAudio();

        // 2. Setup Overlay View
        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(0xFF0F2027); // Deep Zen Blue/Black

        TextView text = new TextView(this);
        text.setText("Time to find your Zen.\n\n💨");
        text.setTextSize(24);
        text.setTextColor(0xFFFFFFFF);
        text.setGravity(Gravity.CENTER);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT);
        params.gravity = Gravity.CENTER;
        layout.addView(text, params);

        // Ensure fresh state
        layout.setAlpha(1.0f);
        layout.setScaleX(1.0f);
        layout.setScaleY(1.0f);

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
        lp.type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY;
        lp.format = PixelFormat.TRANSLUCENT;
        lp.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED;
        lp.width = WindowManager.LayoutParams.MATCH_PARENT;
        lp.height = WindowManager.LayoutParams.MATCH_PARENT;
        lp.gravity = Gravity.CENTER;

        try {
            wm.addView(layout, lp);
            Log.d(TAG, "🚀 Overlay added");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to add overlay", e);
            return;
        }

        // 3. Go Home (Underneath the overlay)
        performGlobalAction(GLOBAL_ACTION_HOME);

        // 4. Puff Animation (Expand + Fade)
        new Handler(Looper.getMainLooper()).post(() -> {
            // Wait 1s before starting puff
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    ValueAnimator puffAnim = ValueAnimator.ofFloat(0f, 1f);
                    puffAnim.setDuration(3000); // 3 seconds
                    puffAnim.addUpdateListener(animation -> {
                        float progress = (float) animation.getAnimatedValue();

                        // Alpha: 1 -> 0
                        float alpha = 1.0f - progress;

                        // Scale: 1.0 -> 1.5 (Expand)
                        float scale = 1.0f + (progress * 0.5f);

                        try {
                            lp.alpha = alpha;
                            wm.updateViewLayout(layout, lp);

                            layout.setScaleX(scale);
                            layout.setScaleY(scale);
                        } catch (Exception e) {
                            puffAnim.cancel();
                        }
                    });
                    puffAnim.start();

                } catch (Exception e) {
                    Log.e(TAG, "Animation failed", e);
                }

                // Remove after animation
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        wm.removeView(layout);
                        Log.d(TAG, "✨ Overlay removed (Puffed away)");
                    } catch (Exception e) {
                        // ignore
                    }
                }, 3100);
            }, 1000);
        });
    }

    private void playBlockingAudio() {
        try {
            // Flute Only
            MediaPlayer flute = MediaPlayer.create(this, R.raw.flute);
            float volume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) / 15f;
            if (flute != null) {
                flute.setVolume(volume, volume);
                flute.start();
                flute.setOnCompletionListener(MediaPlayer::release);
                flute.setOnErrorListener((mp, what, extra) -> {
                    Log.e(TAG, "MediaPlayer Error: " + what + ", " + extra);
                    return true;
                });
            } else {
                Log.e(TAG, "MediaPlayer failed to create (null)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Audio playback failed", e);
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service Interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "🟢 SERVICE STARTED: PUFF EDITION 💨");

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 100;
        this.setServiceInfo(info);
    }
}
