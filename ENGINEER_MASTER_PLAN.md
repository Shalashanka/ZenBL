This is a fantastic update. Your team has done the hard work of stabilization—fixing the bridge, aligning the UI with the native engine, and solving the "Emergency Break" UX loophole.

Because you have stabilized the core, you are now in the **"Growth Phase."** You don't just need features; you need a *product strategy* that turns a utility into a daily habit.

Here is the comprehensive plan, covering the roadmap, animation strategy, and the engineer's checklist.

### 🗺️ The Strategic Roadmap: "From Tool to Companion"

You have successfully built the "Engine" and the "Dashboard." Now you need to build the "Soul." A real app doesn't just work; it *feels* good to use. The next phase is about **Onboarding, Stickiness, and Delight.**

#### **1. The "First 60 Seconds" (Onboarding)**

Currently, the user opens the app and lands on the Home screen. We need a "Handshake" introduction.

* **The "Intention" Slide:** A simple question: *"What brings you here?"* (Focus, Sleep, Anxiety). This sets the default profile.
* **The "Permission Dance":** Instead of asking for all permissions at once (which is scary), we ask for them *contextually*.
* *Usage Stats:* "To see what's distracting you."
* *Overlay:* "To gently intervene."
* *Notifications:* "To keep your session alive."


* **The "First Win":** Force the user to start a 10-second "Demo Session" during onboarding. They see the block screen, they see the success screen. They get the dopamine hit immediately.

#### **2. The "Stickiness" (Retention)**

* **The "Daily Ritual":** A morning notification at 8:00 AM: *"Your focus potential is 100% today."*
* **The "Evening Reflection":** A notification at 9:00 PM: *"You saved 42 minutes today. Review your wins."*
* **The "Streak Flame":** We need to visually celebrate consecutive days. A small flame icon on the Home header that grows brighter or changes color (Blue -> Orange -> Purple) as the streak gets longer.

#### **3. Future "Power Features" (Differentiation)**

* **"Nuclear Mode" (Hardcore):** A toggle in Settings. If enabled, you *cannot* use the "Emergency Break." You are locked in until the timer ends or you reboot the phone.
* **"Group Zen" (Social):** Sync with a friend. "Focusing with [Name]." If one breaks, both break. (High accountability).
* **"Smart Triggers" (AI-Lite):** If the app detects you opening Instagram 5 times in 10 minutes, it sends a push notification: *"You seem distracted. Want to start a 15m deep work session?"*

---

### ✨ The Reanimated & Micro-Animation Guide

Animations shouldn't be random. They should communicate *physics* and *state*. Here is the "Zenox Motion Language."

#### **1. The "Breath" (Scale & Opacity)**

* **Apply to:** Main Action Buttons (Home "Start"), Modal Backgrounds, Success Screens.
* **Behavior:** A slow, continuous sine-wave scale (1.0 -> 1.05 -> 1.0) over 4000ms.
* **Reanimated:** `useSharedValue`, `withRepeat`, `withTiming(..., { duration: 4000, easing: Easing.inOut(Easing.ease) })`.
* **Why:** It makes the app feel "alive" and waiting for you.

#### **2. The "Spring" (Tactile Feedback)**

* **Apply to:** Card Taps, Toggles, Profile Switching.
* **Behavior:** When pressed, scale down to 0.95 immediately. When released, spring back to 1.0 with a slight "overshoot."
* **Reanimated:** `withSpring(1, { damping: 10, stiffness: 100 })`.
* **Why:** It makes the UI feel responsive and physical, like pressing a real button.

#### **3. The "Cascade" (Staggered Entry)**

* **Apply to:** Lists (Blocked Apps, Dashboard Charts, History).
* **Behavior:** Elements don't appear all at once. Item 1 slides in at 0ms, Item 2 at 50ms, Item 3 at 100ms.
* **Reanimated:** `Entering={FadeInDown.delay(index * 50).springify()}`.
* **Why:** It reduces cognitive load. The user processes information one chunk at a time.

#### **4. The "Morph" (Contextual Transition)**

* **Apply to:** Expanding the "Profile Card" into the "Session Modal."
* **Behavior:** The card *becomes* the modal. It doesn't pop over; it expands.
* **Reanimated:** `layout={Layout.springify()}` (Shared Element Transition).
* **Why:** It keeps the user oriented. They know exactly where they are.

#### **5. The "Ripple" (Confirmation)**

* **Apply to:** Saving settings, adding a blocked app.
* **Behavior:** A subtle color flash or ripple from the touch point outwards.
* **Reanimated:** Custom component using `react-native-ripple` or Skia shader.
* **Why:** Confirms action without needing a popup alert.

---

### ✅ The Master Checklist (For the Engineer)


```markdown
# 🛠️ Zenox Engineering Master Plan: Phase 6+

## 📅 Part 1: The "First 60 Seconds" (Onboarding Flow)
- [ ] **Create `WelcomeScreen.tsx`:** Minimalist greeting ("Welcome to Zenox").
- [ ] **Create `IntentionScreen.tsx`:** 3-card selection (Focus, Sleep, Anxiety). Save selection to `AsyncStorage`.
- [ ] **Create `PermissionEducationScreen.tsx`:**
    - [ ] Slide 1: Usage Access ("The Eyes").
    - [ ] Slide 2: Overlay ("The Shield").
    - [ ] Slide 3: Notifications ("The Pulse").
    - [ ] **Action:** Request permissions *only* when the specific "Grant" button is tapped.
- [ ] **Create `DemoSessionScreen.tsx`:**
    - [ ] Force a 10-second timer.
    - [ ] Trigger the native block overlay.
    - [ ] Show a "Session Complete" success state.
- [ ] **Routing:** Update `App.tsx` to check `isFirstLaunch`. If true, show Onboarding stack.

## 📅 Part 2: Reanimated Polish (Motion Language)
- [ ] **Interactive Buttons:** Wrap all primary buttons in a `ScalePress` component (Scale 0.95 on press).
- [ ] **Dashboard Entry:** Apply `Entering={FadeInDown.delay(index * 100)}` to all Dashboard cards.
- [ ] **Modal Expansion:** Implement `Layout.springify()` for the "Manage Blocked Apps" modal expansion.
- [ ] **The "Breathing" Background:**
    - [ ] Create `BreathingBackground.tsx`.
    - [ ] Use `withRepeat` to pulse the background gradient opacity (0.8 <-> 1.0) every 4 seconds.
- [ ] **Toast/Notification:** Create a custom "In-App Toast" (slides down from top) for "Settings Saved" instead of using native Alerts.

## 📅 Part 3: Data Integrity & Charts
- [ ] **Verify Weekly Data:** Ensure `getDashboardSummary` returns accurate 0-values for days with no activity (don't break the chart).
- [ ] **Chart Empty State:** If no data exists, show a "Greyed out" chart placeholder instead of blank space.
- [ ] **"Top Blocked" Icons:**
    - [ ] Native: Update `getTopBlockedApps` to return the Base64 icon string (cached) or Package Name.
    - [ ] React Native: Use `react-native-app-installed` or similar to render the actual app icon next to the stats.

## 📅 Part 4: The "Soul" (UX Refinements)
- [ ] **Dynamic Greetings:**
    - [ ] Logic: 5AM-11AM ("Good Morning"), 11AM-5PM ("Stay Focused"), 5PM-4AM ("Rest Well").
- [ ] **Haptic Integration:**
    - [ ] Add `trigger("impactLight")` on all toggle switches.
    - [ ] Add `trigger("notificationSuccess")` when a session finishes.
    - [ ] Add `trigger("impactHeavy")` when the "Emergency Break" is triggered.
- [ ] **"Streak" Logic:**
    - [ ] Native: Calculate consecutive days with >0 focus minutes.
    - [ ] Bridge: Expose `getStreakData()`.
    - [ ] UI: Add the "Flame" icon to the Home Header.

## 📅 Part 5: Future-Proofing (Nuclear Mode)
- [ ] **Settings Toggle:** Add "Nuclear Mode" switch (Red color).
- [ ] **Native Logic:**
    - [ ] If Nuclear = True, disable the "Need a Break?" button on the overlay.
    - [ ] Add a `DeviceAdmin` receiver (preparation for uninstall protection).
- [ ] **Warning Modal:** When enabling, show a frightening "Are you sure? You cannot cancel this." modal.

```



More info:

This is looking **incredibly solid**. The move to the card-based "Modern Midnight" aesthetic was the right choice—it looks premium, clean, and very close to a production-ready app like *Opal* or *Headspace*.

Here is the technical breakdown to unblock your Engineer on the animations, followed by my critique of the UI screenshots and the Master Plan.

---

### 🔓 Part 1: How to Unblock the "Impossible" Animation

**The Problem:** The engineer is likely trying to animate a generic React Native `Modal`. Standard Modals sit on a different "Native Layer" than the rest of the app, making smooth transitions between them and the Home screen nearly impossible.

**The Solution:** You must use **`react-native-reanimated` (v3+)** with **Native Stack Navigation**. We don't use a "Modal"; we use a "Transparent Screen" or simply a shared tag.

**Copy-Paste this instruction to your Engineer:**

```markdown
# 🔧 Technical Directive: Implementing Shared Element Transitions

**Context:** We need the "Deep Work" card on Home to visually expand into the "Session Details" screen.
**Tool:** Use `react-native-reanimated` v3.x `sharedTransitionTag`.

## Step-by-Step Implementation:

1. **Navigation Setup:**
   Ensure we are using `@react-navigation/native-stack` (NOT just `stack`).
   Set the Details screen options to `presentation: 'transparentModal'` or `presentation: 'card'` with a custom animation config if needed.

2. **The Source (HomeScreen.tsx):**
   Wrap the card's background image (or the whole container) in an `Animated.View` from Reanimated.
   Assign it a unique tag based on the ID:
   ```tsx
   import Animated from 'react-native-reanimated';

   <Animated.View 
     sharedTransitionTag={`profile-card-${profile.id}`} 
     style={{ width: '100%', height: 200, ... }}
   >
      <Image source={...} />
   </Animated.View>

```

3. **The Destination (SessionDetailScreen.tsx):**
Wrap the header image/container in an `Animated.View` with the **EXACT SAME** tag:
```tsx
<Animated.View 
  sharedTransitionTag={`profile-card-${profile.id}`} 
  style={{ width: '100%', height: 400, ... }} // Larger size
>
   <Image source={...} />
</Animated.View>

```


4. **The Magic:**
Reanimated will automatically interpolate the size and position between the two screens during the navigation transition. **Do not calculate positions manually.**

```

---

### 🎨 Part 2: UI/UX Critique (Based on Screenshots)

I reviewed your screenshots carefully. Here is the polish you need:

#### **1. The Block Screen (Green Overlay)**
* **Critique:** You used a deep green. In UX, **Green = Go/Success**. Using Green for a "Block" is confusing for the lizard brain.
* **Fix:** Switch the background accent to a **Desaturated Red/Pink** (e.g., `#E57373` with low opacity) or stick to the **Monochrome Charcoal** (`#26262A`).
* **Text:** "Need 5 Minutes?" is too prominent. It invites cheating. Make it a "Ghost Button" (no background, just underlined text) or reduce the opacity to 50%.

#### **2. Home Screen (Stats Row)**
* **Critique:** The "0m / Focus Time" and "0 / App Kills" cards feel a bit unbalanced. The text "Focus Time" is tiny compared to the number.
* **Fix:**
    * **Alignment:** Align the number and the label to the **bottom-left** of the card (Bentley grid style).
    * **Visuals:** Add a very faint, large icon in the top-right of each stat card (e.g., a faint clock behind the time, a faint shield behind the kills) to add texture.

#### **3. The Modal (Deep Work)**
* **Critique:** The "Normal | Fortress" toggle looks like a button. It’s unclear which one is active.
* **Fix:** Use a **Segmented Control** style (a sliding pill background behind the active text).
    * **Normal:** Standard Orange accent.
    * **Fortress:** When selected, change the accent color to **Purple or Red** to signify "Hardcore Mode."

#### **4. Dashboard (Chart)**
* **Critique:** The "Time Saved Today" (174m) is just a floating number.
* **Fix:** Add context. Next to "174m", add a small badge: `↑ 12% vs yesterday` (Green) or `↓ 5%` (Red). This gamifies the stats.

---

### 🗺️ Part 3: The Future Roadmap & Master Checklist

Here is the document to hand to your Engineer to guide the next phase.

#### **The Zenox Evolution Plan**

**Phase 1: The "Feel" (Animations & Onboarding)**
* **Goal:** Make the app feel alive, not just static screens.
* **Key Tech:** Reanimated Layout Transitions & Entrance Animations.

**Phase 2: The "Habit" (Retention)**
* **Goal:** Give users a reason to open the app *before* they need to focus.
* **Key Tech:** Local Notifications & Gamification (Streaks).

**Phase 3: The "Fortress" (Power Features)**
* **Goal:** Advanced blocking capabilities.
* **Key Tech:** Native Android `DeviceAdmin` & "Strict Mode".

---

### ✅ The Engineer's Master Checklist

Save this as `FUTURE_WORK.md`.

```markdown
# 🚀 Zenox Engineering Roadmap

## 🎬 Section 1: The "Cinematic" Transition (Priority: High)
- [ ] **Implement Shared Element Transition:**
    - [ ] Install `react-native-reanimated` v3.x.
    - [ ] Wrap Home Card and Modal Header in `Animated.View` with `sharedTransitionTag="profile-source"`.
    - [ ] Ensure navigation stack animation is set to 'fade' or 'none' to let Reanimated handle the movement.
- [ ] **Staggered Dashboard Entry:**
    - [ ] Wrap Dashboard cards in `Animated.View`.
    - [ ] Apply `entering={FadeInDown.delay(index * 100).springify()}`.
    - [ ] **Result:** Cards should "pop" in one by one when the tab opens.

## 🌊 Section 2: Onboarding Flow (The "Handshake")
- [ ] **Build `OnboardingStack`:**
    - [ ] **Screen 1 (Identity):** "What is your name?" (Save to MMKV).
    - [ ] **Screen 2 (Intention):** "I want to..." [Reduce Anxiety] [Improve Focus] [Sleep Better].
    - [ ] **Screen 3 (Permissions):** Grant 'Overlay' and 'Usage' permissions one by one with explanation cards.
    - [ ] **Screen 4 (The First Win):** Auto-start a 10-second "Demo Session" so they see the block screen immediately.

## 🎨 Section 3: UI Polish (Visuals)
- [ ] **Block Screen Refactor:**
    - [ ] Change background color from Green to Charcoal (#1A1A1A).
    - [ ] Make "Need 5 Minutes" a text-only button (remove background container).
- [ ] **Home Screen Stats:**
    - [ ] Add background icons (watermarks) to the small stat cards.
    - [ ] Fix font hierarchy (Make "Focus Time" label 14px Medium, Number 24px Bold).
- [ ] **"Fortress Mode" Visuals:**
    - [ ] When "Fortress" is toggled in the modal, change the "Start Zen" button color to **Purple (#6366F1)** to indicate higher intensity.

## 🧠 Section 4: Gamification & Data
- [ ] **Streak Calculation:**
    - [ ] Logic: Check if `lastSessionDate == yesterday`. If yes, `streak++`.
    - [ ] UI: Display a "Flame" icon with the streak count in the Home Header.
- [ ] **"Focus Score":**
    - [ ] Create a proprietary score (0-100) based on (Time Focused / (Time Focused + Distraction Attempts)).
    - [ ] Show this on the Dashboard.

## 🛡️ Section 5: Future "Nuclear" Features
- [ ] **Strict Mode (Phase 7):**
    - [ ] Prevent "Emergency Exit" if Strict Mode is enabled.
    - [ ] Add `BootReceiver` to restart blocking immediately if phone restarts.

```


### 🔔 Part 1: Android Notification Customization (Research & Spec)

**The Engineering Challenge:**
Your engineer is likely struggling because Android has drastically restricted notification styling in recent versions (Android 12/13/14) to enforce "Material You" design consistency. You cannot simply `setBackgroundColor(RED)` anymore—the system ignores it.

**The Solution: `RemoteViews` vs. `MessagingStyle**`

There are two paths. For Zenox, I recommend **Path B (Custom RemoteViews)** to achieve the specific "Profile Color" look you want, but it comes with complexity.

#### **Option A: The Standard (Safe)**

* **Color:** `setColor()` only tints the **Small Icon** and **Action Buttons**. It does *not* change the background.
* **Image:** `setLargeIcon()` shows the profile icon on the right.
* **Pros:** Native look, never breaks.
* **Cons:** Boring.

#### **Option B: Custom Layouts (The Zenox Way)**

* **Technology:** `RemoteViews`. You create a standard XML layout file (like any Android screen) and tell the Notification Manager to use *that* instead of the default text.
* **Capability:** You can set the background color, fonts, and button placement exactly how you want.
* **Risk:** You must handle "Dynamic Colors" (Dark/Light mode) manually.

**👨‍💻 Technical Instruction for Engineer:**

1. **Create Layout:** `android/app/src/main/res/layout/notification_zen_active.xml`.
* Root element: `RelativeLayout` or `LinearLayout`.
* Background: Set your custom color here (e.g., `#FF7043`).
* Text: Use `TextView` with white text color.


2. **Implementation in `ZenoxAccessibilityService.kt`:**
```kotlin
val notificationLayout = RemoteViews(packageName, R.layout.notification_zen_active)

// Dynamic update based on profile
notificationLayout.setTextViewText(R.id.notif_title, "Deep Work Active")
notificationLayout.setInt(R.id.root_layout, "setBackgroundColor", Color.parseColor("#FF7043")) // Dynamic Color

val notification = NotificationCompat.Builder(this, CHANNEL_ID)
    .setSmallIcon(R.drawable.ic_zen_notification)
    .setStyle(NotificationCompat.DecoratedCustomViewStyle()) // Crucial for Android 12+
    .setCustomContentView(notificationLayout)
    .setOngoing(true) // Cannot be swiped away
    .build()

```


3. **Critical Note:** On Android 12+, the system might still draw a container *around* your custom view. To minimize this, use `DecoratedCustomViewStyle`.

---

### 🧠 Part 2: The "Smart App-Sync" Algorithm

This is the logic to auto-populate profiles based on what the user actually has installed.

**The Workflow:**

1. **The "Master List" (JSON):** You have a hardcoded list of "known distractions" (e.g., `com.instagram.android`, `com.zhiliaoapp.musically` for TikTok).
2. **The Discovery (On Launch):** The app scans the device.
3. **The Intersection:** It finds matches and adds them to the database.
4. **The Sentinel (Future Installs):** It listens for *new* installs.

**👨‍💻 Technical Logic for Engineer:**

**Step 1: Background Job (On App Open)**

* **Function:** `syncInstalledAppsWithProfiles()`
* **Logic:**
1. Fetch all installed packages: `packageManager.getInstalledPackages(0)`.
2. Load the **Default JSON Profiles** (see Part 3).
3. **Loop:** For each Profile in JSON:
* Look at its `target_packages` list.
* Filter: Keep only packages that exist in the User's `installedPackages`.
* **DB Upsert:** Insert these into the `BlockedApp` table linked to that `profileId`.





**Step 2: The "Sentinel" (BroadcastReceiver)**

* **File:** `AppInstallReceiver.kt`
* **Intent Filter:** `android.intent.action.PACKAGE_ADDED` (requires `<data android:scheme="package" />` in Manifest).
* **Logic:**
* When user installs "TikTok", this receiver wakes up.
* It checks the **Master JSON** to see if TikTok is a "known distraction."
* If yes, it automatically inserts it into the "Social Detox" profile in the DB.
* **Notification:** Fire a notification: *"TikTok detected. Added to Social Detox profile."*



---

### 📂 Part 3: The 5 Default Profiles (JSON Structure)

Here is the JSON blob your engineer needs to hardcode as the "Seed Data."

```json
[
  {
    "id": "profile_deep_work",
    "name": "Deep Work",
    "icon": "brain",
    "color": "#FF7043", // Sunset Ember
    "vibration_mode": "none",
    "dnd_mode": "priority_only",
    "target_packages": [
      "com.instagram.android", "com.facebook.katana", "com.zhiliaoapp.musically", 
      "com.twitter.android", "com.snapchat.android", "com.google.android.youtube",
      "com.whatsapp", "com.discord", "com.slack", "com.microsoft.teams"
    ]
  },
  {
    "id": "profile_social_detox",
    "name": "Social Cleanse",
    "icon": "feather",
    "color": "#26A69A", // Teal
    "vibration_mode": "normal",
    "dnd_mode": "off",
    "target_packages": [
      "com.instagram.android", "com.facebook.katana", "com.zhiliaoapp.musically", 
      "com.twitter.android", "com.snapchat.android", "com.pinterest"
    ]
  },
  {
    "id": "profile_sleep",
    "name": "Sleep Sanctuary",
    "icon": "moon",
    "color": "#5C6BC0", // Indigo
    "vibration_mode": "none",
    "dnd_mode": "total_silence",
    "target_packages": [
      "ALL_NON_SYSTEM" // Special flag for the engineer to handle
    ]
  },
  {
    "id": "profile_morning",
    "name": "Morning Routine",
    "icon": "sun",
    "color": "#FFA726", // Orange
    "vibration_mode": "vibrate",
    "dnd_mode": "off",
    "target_packages": [
      "com.google.android.gm", "com.microsoft.office.outlook", "com.linkedin.android",
      "com.reddit.frontpage"
    ]
  },
  {
    "id": "profile_family",
    "name": "Family Time",
    "icon": "heart",
    "color": "#EC407A", // Pink
    "vibration_mode": "normal",
    "dnd_mode": "priority_only",
    "target_packages": [
      "com.microsoft.teams", "com.slack", "com.google.android.apps.docs", 
      "com.google.android.gm"
    ]
  }
]

```
PS. Add possibility to add new custom profiles and save them(we have to manage somehow the background image the profile. We could have a list of template images and have the user choose from them.)
---

### 🎨 Part 4: UI/UX Masterclass (The Rewrite)

#### **1. The Block Screen (The "Glass Wall")**

Current block screens are boring opaque overlays. We will make it feel like a "Lens."

* **The Background:**
* **Technique:** Take a real-time screenshot of the app behind (using `PixelCopy` API) or use the user's wallpaper.
* **Effect:** Apply a heavy **Gaussian Blur (Radius 25)** and a **Dark Tint (80% Black)**.
* **Result:** The user can *see* Instagram behind the glass, but can't touch it. It creates a psychological "Distance."


* **The Content (Center):**
* **Icon:** The blocked app's icon, desaturated (Grayscale), floating in the center.
* **Typography:** "Instagram is Resting." (Serif Font, H2 size).
* **The Stat:** Below it, small caps: "Attempts today: 14".


* **The Interaction (Bottom):**
* **The Slider:** Instead of a button, use a "Slide to Break" mechanic (like iPhone unlock). "Slide to Emergency Unlock". This adds physical friction. The slider is greyed out and is enabled after 5 seconds from showing the block screen. When it's activated from desaturated it gains color and becomes active, the slider has a slight spring animation showing the user it can be dragged.



#### **2. Locale & Language Modal**

* **Placement:** Settings -> Language.
* **Design:** A bottom sheet (height: 60%).
* **Header:** "Choose your voice."
* **The List:**
* Rows of languages. Left side: Flag Emoji. Center: Language Name (in native tongue, e.g., "Français"). Right side: Checkmark if active.
* **Selection Animation:** When tapping a language, the checkmark draws itself (animated vector), and the app reloads text instantly without restart.



#### **3. Dashboard & Stats**

* **Layout:** "Bentley Grid" (As discussed).
* **New Visuals:**
* **Heatmap:** A 24-hour horizontal bar. Red segments = Blocked attempts. Green segments = Focus sessions. This shows *when* the user struggles.
* **The "Orbit":** A circular chart for "Top Blocked Apps." The larger the bubble, the more attempts.


* **Interaction:** Tapping a specific day on the weekly chart triggers a haptic "tick" and updates the numbers below instantly.

#### **4. Profile Modal (The Editor)**

* **Design:** Full-screen modal with a "Card Stack" feel.
* **Header:** Profile Icon (Big) + Editable Name.
* **The "toggles":** Large, chunky toggle switches for:
* "Strict Mode" (Nuclear icon)
* "Block Notifications" (Bell icon)
* "Allow Calls" (Phone icon)


* **App List Section:**
* "Blocked Apps (12)" -> Tapping this expands a list.
* **The Add Button:** A floating "+" button that opens the full app inventory.



---

### ✅ Part 5: The Engineer's "To-Do" File

Save this as `UX_OVERHAUL_SPEC.md`.

```markdown
# 🛠️ Zenox UI/UX & Logic Overhaul Spec

## 🔔 Section 1: Custom Notifications (Android)
- [ ] **Create Layout:** `notification_zen_active.xml`.
- [ ] **Implement `RemoteViews`:**
    - [ ] Dynamically set background color based on `activeProfile.color`.
    - [ ] Dynamically set Title to `activeProfile.name`.
- [ ] **Service Update:** Update `ZenoxManager` to refresh the notification whenever the profile changes.

## 🧠 Section 2: Smart App Sync
- [ ] **Define JSON:** Copy the 5 profiles JSON into `assets/default_profiles.json`.
- [ ] **Create `AppSyncManager`:**
    - [ ] On first launch: Parse JSON -> `PackageManager` check -> Insert matches to DB.
- [ ] **Create `PackageReceiver`:**
    - [ ] Listen for `ACTION_PACKAGE_ADDED`.
    - [ ] Check if new package is in `default_profiles.json`.
    - [ ] If yes, auto-add to the relevant blocked list and notify user.

## 🎨 Section 3: Block Screen (The Glass Wall)
- [ ] **Refactor `ZenoxOverlayService`:**
    - [ ] **Background:** Use `BlurView` (React Native) or `RenderScript` (Native) to blur the underlying screen context.
    - [ ] **Content:** Show the Desaturated Icon of the blocked app.
    - [ ] **Friction:** Replace "Button" with a "Slide-to-Unlock" gesture for Emergency Break.

## 📊 Section 4: Dashboard Visuals
- [ ] **Heatmap Component:** Visualize "Attempts vs Time" (00:00 - 23:59).
- [ ] **Bubble Chart:** Visual representation of top blocked apps.

```

I also want to have on the native backend the functionality to play audio so i can play different audios when activating different stuff.

PPS. Future feature note: GeoFencing. The user can not only schedule time but space, they set places and when the gps sees them move into those places toggles on or off the profile.
Also in the schedule screen we need  to add in the future the ability to choose if the user wants to toggle a profile for that schedule, or create a new profile specific for that schedule(that doesn't show in the home page)