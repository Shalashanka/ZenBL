package com.zenbl;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import android.content.Intent;
import android.provider.Settings;

public class AppBlockerModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    AppBlockerModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "AppBlocker";
    }

    @ReactMethod
    public void openAccessibilitySettings() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }
    
    // Placeholder for future methods to communicate with the service
    @ReactMethod
    public void isServiceEnabled(Promise promise) {
        // This is a naive check; a more robust one involves checking system settings
        // For now, we'll let the UI handle the prompt
        promise.resolve(false); 
    }
}
