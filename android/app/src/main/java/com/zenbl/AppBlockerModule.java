package com.zenbl;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import android.content.Intent;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.ApplicationInfo;
import android.graphics.drawable.Drawable;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.Arguments;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Set;
import java.util.HashSet;

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

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext));
        } else {
            promise.resolve(true); // Permission not needed below Android M
        }
    }

    @ReactMethod
    public void requestOverlayPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(reactContext)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:" + reactContext.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
            }
        }
    }

    // Placeholder for future methods to communicate with the service
    @ReactMethod
    public void isServiceEnabled(Promise promise) {
        try {
            String enabledServicesSetting = Settings.Secure.getString(
                    reactContext.getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);

            if (enabledServicesSetting == null) {
                promise.resolve(false);
                return;
            }

            android.text.TextUtils.SimpleStringSplitter colonSplitter = new android.text.TextUtils.SimpleStringSplitter(
                    ':');
            colonSplitter.setString(enabledServicesSetting);

            android.content.ComponentName myService = new android.content.ComponentName(
                    reactContext,
                    ZenAccessibilityService.class);

            while (colonSplitter.hasNext()) {
                String componentNameString = colonSplitter.next();
                android.content.ComponentName enabledService = android.content.ComponentName
                        .unflattenFromString(componentNameString);

                if (enabledService != null && enabledService.equals(myService)) {
                    promise.resolve(true);
                    return;
                }
            }

            promise.resolve(false);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getInstalledApps(Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    PackageManager pm = reactContext.getPackageManager();
                    Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                    mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

                    List<ResolveInfo> apps = pm.queryIntentActivities(mainIntent, 0);
                    WritableArray appList = Arguments.createArray();

                    // Sort alphabetically
                    Collections.sort(apps, new ResolveInfo.DisplayNameComparator(pm));

                    for (ResolveInfo info : apps) {
                        try {
                            ApplicationInfo appInfo = info.activityInfo.applicationInfo;
                            String packageName = appInfo.packageName;
                            String appName = appInfo.loadLabel(pm).toString();

                            // Skip our own app
                            if (packageName.equals(reactContext.getPackageName()))
                                continue;

                            Drawable icon = appInfo.loadIcon(pm);
                            String iconBase64 = convertIconToBase64(icon);

                            WritableMap map = Arguments.createMap();
                            map.putString("packageName", packageName);
                            map.putString("appName", appName);
                            map.putString("icon", iconBase64);

                            appList.pushMap(map);
                        } catch (Exception e) {
                            // Skip app if we fail to load info
                        }
                    }

                    promise.resolve(appList);
                } catch (Exception e) {
                    promise.reject("ERR_FETCH_APPS", e);
                }
            }
        }).start();
    }

    @ReactMethod
    public void setBlockedApps(ReadableArray packageNames) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences("ZenBlockedApps", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            Set<String> set = new HashSet<>();
            for (int i = 0; i < packageNames.size(); i++) {
                set.add(packageNames.getString(i));
            }

            editor.putStringSet("blocked_packages", set);
            editor.apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String convertIconToBase64(Drawable drawable) {
        Bitmap bitmap;
        if (drawable instanceof BitmapDrawable) {
            bitmap = ((BitmapDrawable) drawable).getBitmap();
        } else {
            // Handle vector drawables / adaptive icons
            int width = drawable.getIntrinsicWidth();
            int height = drawable.getIntrinsicHeight();
            // Default to 48x48 if intrinsic size is -1 or 0
            if (width <= 0)
                width = 48;
            if (height <= 0)
                height = 48;

            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
        }

        // Resize if too large to save memory/transfer time
        if (bitmap.getWidth() > 96 || bitmap.getHeight() > 96) {
            bitmap = Bitmap.createScaledBitmap(bitmap, 96, 96, true);
        }

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        return Base64.encodeToString(byteArray, Base64.NO_WRAP);
    }
}
