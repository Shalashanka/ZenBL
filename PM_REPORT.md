# Zenox – PM Report: Status and Fixes

## What was already done (previous AI / plan)

- **Full rename ZenBL → Zenox**
  - NPM/Expo: `package.json` (name `zenox`, codegen `com.zenox`), `package-lock.json`, `app.json` (name, slug, `android.package`: `com.zenox`).
  - Android: `namespace`/`applicationId` `com.zenox`, `rootProject.name` `Zenox`, deep link `exp+zenox`, `strings.xml` (app name and accessibility description).
  - Kotlin: New package `com.zenox` (and `com.zenox.engine` / `com.zenox.engine.db`), all 11 files moved and imports updated; old `com.zenbl` removed.
  - UI: Dashboard title and ZenBlockScreen comments updated to “Zenox”.
  - Prefs: SharedPreferences key `ZenoxBlockedApps` (optional rename from `ZenBlockedApps`).
- **Expo prebuild** for Android was run; Gradle clean failed once due to Windows file locks in `node_modules` (environmental).

---

## Requested fixes (this session)

### 1. Block screen not appearing when opening a blocked app during Zen mode

**Cause:**  
- **Kotlin compile error:** An extra closing brace in `ZenAccessibilityService.kt` closed the class too early, so `onInterrupt()`, `onServiceConnected()`, and `onUnbind()` were treated as top-level. The project did not build.  
- **Block list not applied for schedules:** When Zen was started by a **schedule** with a custom app list (`blockedAppsJson`), the engine always synced the **global** block list to SharedPreferences. The accessibility service therefore never got the schedule-specific list, so it didn’t block the right apps (or blocked using the wrong list).

**Changes made:**

- **ZenAccessibilityService.kt**
  - Removed the extra `}` in `removeOverlayGracefully()` so the class is closed in the right place and the file compiles.
  - Replaced assignment to `serviceInfo` with building an `AccessibilityServiceInfo` and calling `setServiceInfo(info)` in `onServiceConnected()` so the service is correctly registered and receives window events.
- **ZenEngine.kt**
  - `activateZen` now takes an optional fourth argument: **schedule-specific block list** (`List<String>?`). If `null`, the global list from Room is used (unchanged behavior for “Quick Zen”).
  - When a **schedule** triggers Zen, the engine parses `schedule.blockedAppsJson` and passes that list into `activateZen`; that list is synced to SharedPreferences so the accessibility service uses it.
  - Added `parseBlockedAppsJson()` to parse the stored JSON array of package names.
  - Manual Zen still uses the global list (`null`).

Result: The app builds, the accessibility service is configured correctly, and both manual Zen and schedule-triggered Zen (global or custom list) sync the correct block list so the block screen can appear when the user opens a blocked app.

---

### 2. App list not showing on schedule page when selecting “custom app list”

**Cause:**  
When the user chose “Specific Apps” and then tapped “Select Apps”, the app picker modal opened immediately while `loadApps()` (which fills `installedApps` via the native module) was still async. The list was often empty because the modal was shown before the load finished.

**Changes made (ScheduleScreen.tsx):**

- Added `appsLoading` state and ensure `loadApps()` sets it so the UI can show a loading state.
- Added `openAppPicker()`: it **awaits** `loadApps()` and then opens the app picker modal. The “Select Apps” / “X Apps Selected” button now calls `openAppPicker` instead of opening the modal directly.
- Button label shows “Loading apps…” while `appsLoading` is true and disables the button during load.
- In the app picker modal, if the list is still empty and we’re loading, show “Loading apps…” text until `installedApps` is populated.

Result: Tapping “Select Apps” (or “X Apps Selected”) loads installed apps first, then opens the modal so the list is visible when the user selects a custom app list for a schedule.

---

## Follow-up fixes (schedule not starting, block screen still not appearing)

### Schedule not starting at the set time

- **Cause:** Day-of-week mismatch between JS and native. ScheduleScreen sends `0=Sun, 1=Mon..6=Sat`; ZenEngine uses `7=Sun, 1=Mon..6=Sat`. Sunday was stored as `0`, so `dayOfWeek !in days` failed on Sundays, and any schedule that included Sunday never matched.
- **Changes:**
  - **ScheduleScreen.tsx:** When saving, convert `0` → `7` for Sunday so native always gets `7,1,2,3,4,5,6`. When loading for edit, convert `7` → `0` for the day chips. When rendering the schedule card, map `7` → `0` for the `days` array index so “Sun” displays correctly.
  - **ZenEngine.kt:** In `isScheduleActiveNow`, normalize stored `0` to `7` so old or mistaken data still matches Sunday.
  - Added debug log: “Schedule check: N enabled, now=H:M day=D” when there are enabled schedules.

### Block screen still not appearing

- **Cause:** Block list was synced to SharedPreferences in a fire-and-forget coroutine, so `blocked_packages` was often still empty when `is_zen_mode_active` was set to true. The accessibility service then saw Zen active but an empty block list.
- **Changes:**
  - **ZenEngine.kt:** In `activateZen`, sync the block list first inside the same coroutine, then `handler.post` to set Zen state and write `is_zen_mode_active` and start the foreground service. So `blocked_packages` is always written before the service (and the accessibility listener) sees Zen mode active.
  - **ZenAccessibilityService.kt:** Listen for `blocked_packages` in `onSharedPreferenceChanged`; when the list is updated and Zen is active, call `checkAndBlock(lastActivePackage)` again so the current app is re-evaluated without waiting for the next window event.

**Important:** The block screen only works if **Zenox** is enabled under **Settings → Accessibility**. If it’s off, no overlay will show.

---

## What still needs doing (recommendations)

- **Manual QA**
  - Enable **Zenox** in **Settings → Accessibility**, then start Zen (manual or wait for schedule) and open a blocked app; confirm the block screen appears.
  - Create a schedule for “in a few minutes” and confirm Zen starts when the time is reached (app in foreground or background; process must still be alive).
  - Confirm schedule “Specific Apps” picker and day display (including Sun) work.
- **Known limitations**
  - Schedule checker runs every 30s and only while the app process is alive. If the app is killed by the system before the schedule time, Zen won’t start until the user opens the app again.
  - Block screen requires the Zenox accessibility service to be enabled in system Settings.
- **Optional**
  - If Gradle clean fails on Windows due to file locks, run `.\gradlew :app:assembleDebug` without `clean`, or close other tools using `node_modules` before running clean.

---

## Summary for PM

| Item | Status |
|------|--------|
| Rename ZenBL → Zenox (code, package, branding) | Done (previous work) |
| Kotlin build (ZenAccessibilityService) | Fixed (brace + `setServiceInfo`) |
| Block screen when opening blocked app in Zen mode | Fixed (correct block list sync + service config) |
| Schedule custom app list not showing in picker | Fixed (load apps before opening modal + loading state) |
| PM report | This document |

All requested fixes are implemented. Build with `npx expo run:android` and verify behavior on device as above.
