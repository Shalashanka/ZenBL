# Zentox - Technical Documentation

## 1. Overview
**Zentox** (formerly Zenox/ZenBL) is a productivity, app-blocking application tailored for the Android ecosystem utilizing React Native (v0.81.x, New Architecture) and a deeply integrated Kotlin Native Core. 
Unlike typical React Native apps where logic is scattered between JS bridging boundaries, Zentox embraces a **Native-First Engine Philosophy**. All rules, timers, blocking, notifications, and states are driven directly by a persistent Android foreground service. The React Native app effectively serves as a powerful "UI shell" visualizing the current Native State map and dispatching commands back over the Bridge.

---

## 2. Core Architecture Philosophy
* **Global vs. Profile-Specific Dispatching:** A core architectural tenet of Zentox is centralizing the "Zen Start" action. 
Whether the user requests a "Quick Zen" from the HomeScreen or triggers a predefined "Profile/Schedule," the React Native layer dispatches a single native command (`triggerManualZen(durationSec)`) alongside necessary profile arguments. 
The Native Kotlin Engine (via `ZentoxManager` and `ZentoxBridgeModule`) accepts incoming payloads containing specific lists of blocked apps. This allows multiple overlapping schedules or manual quick-starts to remain fully isolated, ensuring their own independent block lists do not bleed into global variables.
* **Declarative UI**: Uses Zustand for fast reactive bridging (acting as an in-memory database abstraction fed by Native SQL Room emissions) without directly hitting disk via JS.
* **Debugging-First**: Built with a production-ready, standardized logging framework from Day 1.

---

## 3. The Debugging & Logging Framework
To maintain visibility over both sides of the bridge, a standardized logging infrastructure is implemented using `react-native-logs`.

### **`src/utils/logger.ts`**
* **Purpose**: Replaces raw `console.log` with categorized, severity-leveled transports.
* **Usage**:
  ```typescript
  import { log, createComponentLogger } from '../utils/logger';
  const componentLog = createComponentLogger('HomeScreen');
  componentLog.info('User triggered a Zen Action');
  ```
* **Why it matters**: In production, raw console logs block the event loop or get stripped inconsistently. This allows us to reroute `.error` to Crashlytics or `.debug` to a local trace file without touching every component once complexity scales.

---

## 4. React Native System (TypeScript / TSX)

### **`App.tsx`**
* **Role**: Root component of the React Native layer.
* **Behavior**: Initializes the `SafeAreaProvider` (resolving legacy native edge-rendering issues) and renders the `HomeScreen`. It also initializes the core logger on mount.

### **`src/types/native.ts`**
* **Role**: The Single Source of Truth mapping Native Bridge responses to TypeScript.
* **Key Interfaces**: 
  * `AppInfo`: Holds `packageName` and `appName`.
  * `ZenStatus`/`EngineStatus`: Tracks whether a blocking session is active, what the current countdown is, and if it's running under "Fortress" rules.
  * `ZenSchedule`: Defines repeatable profile blocks.
  * `DebugState`: The master payload used by our debugging dashboard (Accessibility Flags, Counts, Timers).

### **`src/services/ZentoxBridge.ts`**
* **Role**: Wraps the raw, unsafe `NativeModules.ZentoxBridge` in a strictly-typed asynchronous service layer.
* **Exported Object**: `ZentoxService` containing strictly modeled Promise routines (`getZenStatus`, `setBlockedApps`, `triggerManualZen`, `openAccessibilitySettings`, etc.).
* **Also Exports**: `ZentoxEventEmitter` bound to the global scope to hear native pings (such as `ZenoxStatusChanged`).

### **`src/hooks/useZentox.ts`**
* **Role**: A custom React Hook designed specifically to bind Native Event streams to React State lifecycles organically.
* **Behavior**:
  1. Mounts an `AppState` listener. Every time the app moves from `background` to `foreground`, it re-syncs state immediately.
  2. Subscribes to `ZentoxEventEmitter` looking for `ZenoxStatusChanged`.
  3. Returns `debugState`, `ZentoxService` and a manual `fetchState` to be cleanly destructured in screens.

### **`src/store/useStore.ts`**
* **Role**: Zustand state management acting as the persistent memory map of the Native Engine's Room DB database.
* **Behavior**: Caches fetched Arrays representing `blockedApps` and `schedules` yielding instantaneous UI loads, while dispatching silent writes back to `ZentoxBridge`.

### **`src/components/Button.tsx`**
* **Role**: A bespoke Reanimated (v4) UI module, discarding generic native buttons in favor of fully customized fluid springs and scaling aesthetics.

### **`src/screens/HomeScreen.tsx`**
* **Role**: The main scaffold/testing grounds for Native interplay. It presents actual raw signals fed from Android (Permission availability, Blocked arrays list) and allows instant interactive testing of Accessibility overlays.

---

## 5. Android Native Engine (Kotlin / Java)

### **`com.zentox.bridge.ZentoxBridgeModule`**
* **Role**: The core `ReactContextBaseJavaModule`. This is where React Native makes its initial handshake.
* **Methods**:
  * `startZen(duration)` / `triggerManualZen()` (Accepts the command, forwards to `ZentoxManager` running the background thread).
  * Data Retrieval: `getDebugState()`, `fetchBlockedApps()`, `getInstalledApps()` map directly back to JS Promises over non-blocking Coroutine IO thread jobs.

### **`com.zentox.engine.ZentoxManager`**
* **Role**: The "Brain" of the App. Stores alarms, handles triggering conditions, fires overlapping tasks, and emits updates globally over DeviceEventEmitters down to JS layers.
* **Architecture Goal**: If the React Native thread crashes, gets suspended, or is fully destroyed, ZentoxManager must survive and maintain active screen-blocking operations by leveraging true Android services and Broadcast triggers.

### **`com.zentox.engine.AppDatabase` & Entities (`BlockedApp.kt`, `ZenSchedule.kt`)**
* **Role**: The persistent disk store mapping Room SQL tables to our Kotlin models.
* **Note**: Any profile-specific list isolation happens within these relational tables.

---

## 6. Local Development & Testing

### Running the Application

To test this natively on your physical Android Device over USB Debugging / Wireless Debugging (with developer tools initialized):

1. **Clear Legacy Gradle Build (Crucial post-rename)**
   ```powershell
   cd android
   ./gradlew clean
   cd ..
   ```

2. **Start the Metro Bundler**
   This handles serving JS logic.
   ```powershell
   npm start
   ```

3. **Install the Native App**
   Open a new terminal session, and run the following command to compile Android source files and push them to your physical device.
   ```powershell
   npm run android
   ```

### Debugging Best Practices

If something breaks between the UI and Native connection:
1. **Check Logcat**: Ensure your terminal has an Android Studio window running `Logcat` targeting `com.zentox` (or whichever variant it built under), filtering by `"ZentoxBridgeModule"` tags.
2. **Check the React Console**: Thanks to our new `logger.ts`, you will see colorized readouts immediately telling you precisely what the UI *attempts* to send to Native. 
3. **Open the "Refresh State" Debug card** on your app home screen.

*End of Document. Update this dynamically as features extend.*
