package com.zenbl;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

public class ZenAccessibilityService extends AccessibilityService {
    private static final String TAG = "ZenAccessibilityService";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "unknown";
            // Log the foreground app package name
            Log.d(TAG, "Foreground App: " + packageName);
            
            // TODO: In the future, we will check this package against our blocklist
            // and perform blocking actions (e.g., performGlobalAction(GLOBAL_ACTION_HOME))
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service Interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Service Connected");
        
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        // We need to listen to window state changes to detect app launches
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        // We want to receive events from all apps
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        // Moderate notification timeout
        info.notificationTimeout = 100;
        
        this.setServiceInfo(info);
    }
}
