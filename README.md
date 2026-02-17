# Zenox

Zenox is a hybrid React Native + native Android focus app.
It combines:
- Expo/React Native UI for navigation and experience
- Native Kotlin engine for enforcement, scheduling, overlay blocking, and notifications

## Current Architecture
- UI layer: `src/` (React Native + Reanimated + Navigation)
- Native engine: `android/app/src/main/java/com/zenox/engine`
- Native bridge: `android/app/src/main/java/com/zenox/bridge/ZenoxBridgeModule.kt`

## Implemented Features

### Core Zen Engine
- Manual Zen start/stop from UI
- Native active status tracking with countdown
- Profile name sync from UI to native (`active_profile_json`)
- Blocked app enforcement through Accessibility Service
- Native full-screen block overlay

### Emergency Break System
- Hold-to-unlock from overlay
- Custom break duration options: `30s`, `1m`, `2m`, `3m`, `5m`
- Break now freezes Zen countdown (no hidden timer drain)
- Auto-resume after break with preserved remaining time

### Scheduling
- Native schedule storage and refresh
- Exact alarm permission support flow
- Graceful fallback when exact alarm permission is unavailable

### Permissions UX
- Accessibility permission checks + deep-link
- Overlay permission checks + deep-link
- Notification permission checks + deep-link
- Exact alarm permission checks + deep-link (for schedule flows)

### Notification System
- Persistent active Zen notification with live countdown
- App icon shown in notification
- Tapping notification opens Zenox app

### Home / UI
- Bottom tab navigation (Home, Dashboard, Life-Hub, Settings)
- Profile carousel cards with modal session details
- Pre-start theme transition cascade before modal close
- Circular Zen timer dial on Home
- Circular ring-based Quick Zen duration control around timer (10m-120m, 5m step)

### Dashboard
- Focus momentum chart + reflections cards
- App graveyard list with attempt bars
- Most blocked app display with icon fallback
- Focus chart rendering stabilized (pixel height bars)

### Native Overlay Styling
- Themed Zen overlay with:
  - app display name (not package name)
  - focus quote
  - blocked attempts today
  - preserved/session context
  - hold-to-unlock CTA

## Major Fixes Completed
- Reanimated module initialization crash fixed
- Native module wiring and bridge compatibility fixes
- Overlay/Accessibility flows restored when native folder was merged
- Schedule crash fixed for missing exact alarm permission
- Status bar / gesture area visual mismatch fixed on block overlay
- Notification + blocking regressions resolved after permission flow updates
- Home start flow now updates theme before modal dismissal to remove delayed/cheap feel
- Emergency break behavior corrected (pause instead of invisible countdown)

## Build & Run

### Dev
- `npm run start`
- `npm run android`

### APK
- Debug APK: `npm run apk:debug`
- Release APK: `npm run apk:release`
- Install debug APK: `npm run apk:install:debug`

Default debug APK output:
- `android/app/build/outputs/apk/debug/app-debug.apk`

## Future Features Roadmap
- Real data binding across all UI cards (replace placeholders)
- Advanced dashboard analytics:
  - true weekly stats from Room logs
  - distraction heatmap
  - peak focus windows
- Session history and trend comparisons
- Profile editor with app-category presets
- White noise / ambient audio toggle
- Automation rules (morning/evening auto profiles)
- Enhanced notification style (actions + richer visuals)
- Optional haptic tuning for carousel/profile interactions

## Notes
- Project origin: native-first implementation was merged into Expo UI layer to preserve working engine reliability while keeping modern React Native UX.
