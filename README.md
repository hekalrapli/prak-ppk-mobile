# PrakPresensi

A mobile practicum attendance app for a university, built with Expo / React Native. Two roles — **Praktikan** (student) and **Asisten** (teaching assistant) — share live data through **Firebase Authentication** and **Cloud Firestore**. Praktikans can also submit leave requests (**izin**), whose reasons are categorized by an AI model for the assistant's review.

> **Implementation status**
> - **Sprint 1 (complete):** frontend-only prototype with local dummy data and React state (role selection, schedules, session open/close, attendance, history, recap).
> - **Sprint 2 (complete):** Firebase Authentication, Firestore (CRUD, real-time listeners, Security Rules), leave requests, and AI classification of leave reasons. See [`PRD.md`](./PRD.md) §7.
> - **Sprint 3 (active):** Geolocation Attendance, Interactive Lab Maps, Geofencing, and Push Notifications. See [Sprint 3 Specification](#sprint-3-geolocation-maps--push-notifications-task-breakdown).

## Objectives

- Let many users sign in with their own accounts and see the same data in real time.
- Show different information and actions per role, enforced by Firestore Security Rules and not only by the UI.
- Record attendance once per praktikan per session, only while the session is open.
- Let praktikans submit leave requests; an AI model suggests a reason category, and the assistant makes the final decision.

## Key Features

| Feature | Praktikan | Asisten |
| --- | --- | --- |
| Register, login, logout (Firebase Auth) | Yes | Yes (requires invitation code) |
| Persistent login after app restart | Yes | Yes |
| Practicum, participant, and session CRUD | — | Yes (assigned asisten only) |
| View schedule and session detail | Own practicums only | All |
| Open / close a session (with confirmation) | — | Yes (assigned asisten only) |
| Record attendance (once per session) | Yes | — |
| Real-time attendance recap | — | Yes |
| Personal attendance history | Yes | — |
| Submit a leave request (**izin**) | Yes | — |
| AI category for the leave reason | Sees own result | Sees on each request |
| Approve / reject leave request with note | Sees decision | Yes (assigned asisten only) |
| Offline banner, loading, empty, and error states | Yes | Yes |

The AI result is **supporting information only**. It never approves or rejects a request automatically.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Expo (SDK 58), React Native 0.88, React 19 |
| Navigation | Expo Router |
| Language | TypeScript (strict) |
| Authentication | Firebase Authentication (email/password) |
| Database | Cloud Firestore (real-time `onSnapshot` listeners) |
| Local session storage | `@react-native-async-storage/async-storage` |
| Access control | Firestore Security Rules (`firestore.rules`) |
| AI | Leave-reason classifier `model-edom` (LinearSVC 3 kelas), berjalan on-device via pure JS di `src/lib/model-edom/` |
| Animation / icons / images | `react-native-reanimated`, `expo-symbols`, `expo-image` |
| Development build | `expo-dev-client` |
| Linting | ESLint + `eslint-config-expo` |
| Package manager | npm (`package-lock.json`) |

The project uses the **Firebase JS SDK** (not `@react-native-firebase`), so no `google-services.json` or Firebase config plugin is needed in `app.json`. The project has no UI kit and no state-management library.

> Use **npm** and `npx`, not `bun`/`bunx`.

## Project Structure

```
.
├── app.json
├── firestore.rules                # Firestore Security Rules (publish in Firebase Console)
├── .env.example                   # Variable names only; copy to .env
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   └── FIREBASE_SETUP.md
├── src/
│   ├── app/                       # Expo Router routes
│   │   ├── _layout.tsx            # Root layout, auth gate, providers
│   │   ├── (auth)/                # Login and register screens
│   │   ├── praktikan/             # Schedule, session detail, history, leave requests
│   │   └── asisten/               # Schedule, session management, recap, leave review, CRUD forms
│   ├── components/
│   │   ├── ui/                    # Buttons, inputs, badges, modal, toast, empty/error states
│   │   └── attendance/            # Schedule, session, attendance, and leave items
│   ├── services/                  # All Firebase and AI access (no Firestore calls in UI components)
│   │   ├── firebase.ts            # App, Auth (AsyncStorage persistence), Firestore
│   │   ├── auth.ts
│   │   ├── practicums.ts
│   │   ├── sessions.ts
│   │   ├── attendance.ts
│   │   ├── leaves.ts
│   │   └── leaveClassifier.ts     # AI adapter
│   ├── hooks/                     # Real-time listener hooks (loading / error / data)
│   ├── store/                     # Auth/profile context
│   ├── types/                     # Shared domain types
│   └── constants/theme.ts         # Design tokens
└── package.json
```

The `@/*` path alias maps to `src/*`. Sprint 1 dummy data (`dummy-data`, `demo-data-context`) has been removed: schedules and practicum ownership now come from Firestore (FR-13), and the app reads them with role-scoped queries.

## Prerequisites

- Node.js 22.13 or newer and npm.
- A physical Android device or emulator running a **development build** (the project uses `expo-dev-client`), or a browser for the web target.
- A Firebase project (see below). Team members must be invited as **Editor** in Firebase Console → Project settings → Users and permissions.

## Firebase Setup (project owner, once)

Full step-by-step instructions are in [`docs/FIREBASE_SETUP.md`](./docs/FIREBASE_SETUP.md). Summary:

1. Create a Firebase project and register a **Web app** to obtain the `firebaseConfig` values.
2. Enable **Authentication → Email/Password**.
3. Create **Firestore Database** in **production mode**.
4. Paste the contents of `firestore.rules` into Firestore → **Rules** and **Publish**. The file in the repository is not applied automatically.
5. Create the document `config/registration` with the string field `asistenCode` (the invitation code required to register as asisten).
6. Create the Firestore composite/collection-group indexes when the console prompts for them (open the link in the first error message).
7. Seed the demo practice sessions so Security Rules can resolve `practicums/{pid}` and `sessions/{sid}` (see below). Without this, attendance and leave submissions are rejected with `permission-denied`.

## Installation and Setup (developers)

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file
cp .env.example .env      # then fill in the values provided by the project owner

# 3. Seed demo data (once, requires a service account key)
#    Creates users/{uid} for the dummy accounts and practicums/sessions
#    required by the Firestore Security Rules. At least one asisten and one
#    praktikan account must exist; practicums are assigned to asistens
#    round-robin so each asisten only sees their own practicums.
npm run seed:dummy -- --key secrets/service-account.json
npm run seed:demo -- --key secrets/service-account.json

# 4. Start the dev server (clear cache so .env is read)
npx expo start -c
```

`.env` variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

- `.env` is git-ignored. Do not commit it.
- Building in the cloud with EAS does not include `.env`; provide the same `EXPO_PUBLIC_*` variables through `eas.json` (`build.<profile>.env`) or EAS environment variables.
- After adding a new native dependency (for example AsyncStorage), rebuild the development build.

Native development builds:

```bash
npm run android   # expo run:android; requires Android Studio/SDK
npm run ios       # expo run:ios; macOS only
npm run web       # web target
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo dev server. |
| `npm run android` | Build and run the Android development build. |
| `npm run ios` | Build and run the iOS development build (macOS only). |
| `npm run web` | Start the web target. |
| `npm run lint` | Run `expo lint`. |
| `npx tsc --noEmit` | Type-check the project. |
| `npx expo-doctor` | Diagnose dependency and configuration issues. |
| `npx expo install --fix` | Align package versions with the installed Expo SDK. |

`npm run reset-project` exists in `package.json` but deletes or moves starter code. **Do not run it.**

## Data Model (Firestore)

```
config/registration                     { asistenCode }                       # not readable by clients
users/{uid}                             { name, identifier, email, role, createdAt }
laboratorium/{labId}                    { nama, gedung, latitude, longitude, radius_meter, updated_at }
practicums/{pid}                        { name, className, assistantId, studentIds[], createdAt }
  sessions/{sid}                        { date, startTime, endTime, room, labId?, status, openedAt?, closedAt? }
    attendance/{uid}                    { praktikanId, praktikanName, praktikanNim, status, recordedAt, distance_meter?, device_lat?, device_lng?, is_location_verified? }
    leaveRequests/{uid}                 { praktikanId, praktikanName, praktikanNim, reason, status, ai, createdAt, decidedBy?, decidedAt?, reviewNote? }
```

- Attendance and leave request documents use the **praktikan's UID as the document ID**, so at most one record per praktikan per session is guaranteed at the data level.
- Attendance geofence fields (`distance_meter`, `device_lat`, `device_lng`, `is_location_verified`) are optional so records created before Sprint 3 stay valid.
- Session status transitions are `upcoming → open → closed` only. A closed session cannot be reopened.
- Attendance time uses the Firestore server timestamp and is displayed as `HH:mm` (WIB).
- `sessions.labId` points to `laboratorium/{labId}`. Sessions without it fall back to matching the room name against laboratory names (legacy demo data).

## Roles and Security Rules

| Resource | Praktikan | Asisten (assigned) | Asisten (other) |
| --- | --- | --- | --- |
| `users/{uid}` | read/update own name | read | read |
| `practicums`, `sessions` | read if participant | create, update, delete | read |
| `laboratorium` | read | read, write (FR-P2-03) | read |
| `attendance` | read own; create while session is open | read | read |
| `leaveRequests` | create/read own; edit reason while pending | read; approve/reject | read |

Rules enforce identity (`request.auth.uid`), role (from `users/{uid}`), session status, field whitelists, and string lengths. Role cannot be changed after registration, and registering as asisten requires the invitation code.

## AI Leave-Reason Classification

- When a praktikan submits a leave request, the reason is analyzed **on-device** in two layers:
  1. **Izin analyzer** (`src/services/izinAnalyzer.ts`) — rule-based keyword analysis of the *leave reason itself*; determines the category `positif` / `netral` / `negatif` (strong/verifiable reason, ambiguous reason, avoidance).
  2. **model-edom** (`src/lib/model-edom/`) — LinearSVC sentiment model trained on the public EDOM review dataset; kept as a **secondary sentiment signal** (`ai.sentiment`), not shown in the UI.
- The classification is stored in `practicums/{pid}/sessions/{sid}/leaveClassifications/{uid}` (`ai` object) — a document that only asisten can read. The leave request document itself contains no AI data.
- Category meaning (leave-reason quality, supporting info only):
  - **Positif** — strong, specific, verifiable reason: "dirawat di rumah sakit karena demam berdarah", "anggota keluarga meninggal", "mewakili kampus lomba", "rumah kena banjir".
  - **Netral** — generic/ambiguous reason: "ada keperluan keluarga", "ada acara keluarga", "urusan mendadak", "kurang sehat".
  - **Negatif** — indicates avoidance: "mager, gak niat datang", "malas, mau bolos", "nongkrong", "main game sampai malam", "gak mood".
- Decision logic: strong keyword without avoidance → `positif`; avoidance keyword without strong reason → `negatif`; both → `netral` (ambiguous); neither → `netral`. Confidence reflects the amount of keyword evidence, not a probability.
- The result is displayed as "Prediksi otomatis, bukan keputusan". The decision (`approved` / `rejected`) is made only by the assigned asisten — no code path changes the status based on the AI category.
- All classification details live in `src/services/leaveClassifier.ts`.

> Why model-edom alone is not used for the category: its vocabulary comes from EDOM lecturer-evaluation comments, so leave-reason words like "sakit", "demam", "keluarga", "mager" are unknown, and valid reasons were misclassified (e.g. "dirawat di rumah sakit" → negative). model-edom still runs and its sentiment is stored as a secondary signal for transparency.

## Demonstrating the Main Flows

**Flow 1 — Attendance (two accounts, two devices or windows)**

1. Register/login as **Asisten**, open a session, and confirm **Buka sesi**.
2. Register/login as **Praktikan** (a participant of that practicum). The session shows **Dibuka** without refresh.
3. Tap **Catat kehadiran**. The button changes to the completed state with the recorded time.
4. On the asisten device, the recap updates in real time.
5. Close the session with **Tutup sesi**. The praktikan's attendance action becomes unavailable.

**Flow 2 — Leave request**

1. Login as **Praktikan**, open a session, tap **Ajukan izin**, enter a reason, and submit.
2. The request is stored with status **Menunggu**. The AI result is **not shown to the praktikan** — only the asisten can see it.
3. Login as **Asisten**, open **Izin Masuk**, review the reason and AI category, then **Terima** or **Tolak** with a note.
4. The praktikan sees the decision and note in **Izin Saya** in real time.

## Sprint 3: Geolocation, Maps & Push Notification Task Breakdown

### Overview & Goals
In Sprint 3, PrakPresensi expands physical presence verification and proactive communication through:
1. **Location-based Presence (Geofencing):** Practical sessions require device geolocation check within a defined laboratory radius.
2. **Interactive Informatics Lab Map:** Dynamic map with laboratory markers, active student tracking marker, and realtime practicum status bottom sheet.
3. **Event-driven Push Notifications (FCM):** Instant alerts when a session opens, schedules change, or leave requests are approved/rejected.
4. **Device State & Permission Hardening:** Graceful handling when GPS is disabled, location permission denied, or push notifications blocked.

---

### Implementation Progress — Programmer 1

| Ticket | Branch | Status |
| :--- | :--- | :--- |
| **FR-P1-01** | `feat/FR-P1-01/geo-location-engine` | Done — `src/services/locationService.ts`, permission/GPS fallback panel, `expo-location` plugin |
| **FR-P1-02** | `feat/FR-P1-02/location-presence` | Done — presence screen, geofence validation, distance audit on attendance |
| **FR-P1-03** | `feat/FR-P1-03/interactive-lab-map` | In progress |
| **FR-P1-04** | `feat/FR-P1-04/lab-activity-sheet` | Planned |
| **FR-P1-05** | — | Skipped (optional; needs assistant-side QR token generation) |

**Notes for FR-P1-01/02**

- `expo-location` is a native module: after pulling this branch, install dependencies and rebuild the development build (`npm run android` / `npm run ios`). Expo Go is not enough for the rest of Sprint 3.
- The updated `firestore.rules` must be published. It adds the `laboratorium` collection and the optional geofence fields on `attendance`.
- `npm run seed:demo -- --key secrets/service-account.json` now also creates `laboratorium/{labId}` documents and sets `sessions.labId`, so the 50 m demo radius can be tested immediately.
- Radius verification runs on the device (Haversine). Security Rules validate field types only; a modified client could still forge the reported distance. This is documented as a limitation, same as the AI classification result.

---

### Task Allocation Matrix (Programmer 1 vs Programmer 2)

| Ticket ID | Module & Feature | Assignee | Story Points | Dependencies |
| :--- | :--- | :---: | :---: | :--- |
| **FR-P1-01** | Device Geolocation & Permission Engine | **Programmer 1** | 3 | - |
| **FR-P1-02** | Dedicated Location Presence Screen (Praktikan) | **Programmer 1** | 5 | FR-P1-01, FR-P2-03 |
| **FR-P1-03** | Interactive Laboratory Map & User Live Marker | **Programmer 1** | 5 | FR-P1-01, FR-P2-03 |
| **FR-P1-04** | Lab Activity Bottom Sheet (Ongoing & Next Session) | **Programmer 1** | 3 | FR-P1-03 |
| **FR-P1-05** | *(Optional)* QR Code Presence Scanner | **Programmer 1** | 2 | FR-P1-02 |
| **FR-P2-01** | Firebase Cloud Messaging (FCM) Core Setup | **Programmer 2** | 5 | - |
| **FR-P2-02** | Event-Driven Push Notification Dispatcher | **Programmer 2** | 5 | FR-P2-01 |
| **FR-P2-03** | Laboratory Location & Geofence CRUD (Asisten) | **Programmer 2** | 3 | - |
| **FR-P2-04** | Realtime Attendance Monitoring & Radius Recap (Asisten) | **Programmer 2** | 3 | FR-P1-02 |
| **FR-P2-05** | Leave Request Decision Feedback & Notification Flow | **Programmer 2** | 2 | FR-P2-02 |

---

### Detailed Functional Requirements (FR)

#### 👨‍💻 Programmer 1: Geo-Location, Presence Engine & Interactive Maps

##### `FR-P1-01`: Device Geolocation & Permission Engine
* **Goal:** Provide a centralized location service to request permissions, fetch live GPS coordinates, detect device location state, and calculate distances using the Haversine formula.
* **Technical Tasks:**
  - Install & configure `expo-location` (or `@react-native-community/geolocation`).
  - Create `src/services/locationService.ts` containing:
    - `requestLocationPermission(): Promise<boolean>`
    - `getCurrentCoordinates(): Promise<{ latitude: number, longitude: number, accuracy: number }>`
    - `calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number` (returns distance in meters).
  - Create user-friendly fallback modal/banner when location permission is denied or location services are turned off, with direct link to device settings.
* **Acceptance Criteria (DoD):**
  - App prompts for foreground location permission with explanatory rationale.
  - Correctly calculates distance between practical lab coordinates and student device.
  - Catches location timeouts, mock/fake locations (if supported), and GPS off states gracefully.

##### `FR-P1-02`: Dedicated Location Presence Screen (Praktikan)
* **Goal:** Provide a dedicated presence screen (separated from session detail) where students verify geofence distance and submit attendance.
* **Technical Tasks:**
  - Create screen `src/app/praktikan/session/[sessionId]/presence.tsx` (or route `src/app/praktikan/presence/[sessionId].tsx`).
  - Display practicum details: Course Name, Class, Lab Name, Target Radius, Current Session Status, and Live Distance Indicator (e.g., "Jarak Anda: 18m / Maks 50m").
  - Validate attendance conditions before submission:
    1. Session must be in status `OPEN`.
    2. Student coordinates must be $\le$ laboratory `radius_meter`.
    3. Student has not previously checked in for this session.
  - Disable presence button and display informative banner if out-of-radius (e.g., *"Anda berada 120 meter di luar radius laboratorium"*).
  - Write attendance record to Firestore via `src/services/attendance.ts` including recorded timestamp, student coordinates, and calculated distance.
* **Acceptance Criteria (DoD):**
  - Attendance succeeds ONLY when within allowed radius and session is `OPEN`.
  - Duplicate check-in is strictly prevented.
  - Clear visual feedback for within-radius (green badge) vs outside-radius (red warning).

##### `FR-P1-03`: Interactive Laboratory Map & User Live Marker
* **Goal:** Display a full-screen interactive map showing all Informatics laboratories with custom markers, geofence radius circles, and real-time student location tracking.
* **Technical Tasks:**
  - Install & configure `react-native-maps`.
  - Create route `src/app/maps/index.tsx` (accessible from tab/drawer navigation for both roles).
  - Fetch lab coordinates dynamically from Firestore `laboratorium` collection.
  - Render `<Marker>` for each laboratory and `<Circle>` representing its allowed presence radius.
  - Render user live position marker with periodic tracking updates while screen is active.
  - Add quick action button to re-center camera to user's current GPS position.
* **Acceptance Criteria (DoD):**
  - Map renders smoothly with all lab pins and student live dot.
  - Tapping a lab marker highlights the selected lab and pans camera smoothly.

##### `FR-P1-04`: Lab Activity Bottom Sheet (Ongoing & Next Session)
* **Goal:** When a user taps a laboratory marker on the map, show a bottom sheet / modal with current active and upcoming practicum schedules.
* **Technical Tasks:**
  - Integrate bottom sheet component (e.g., `@gorhom/bottom-sheet` or custom animated view).
  - Query Firestore `sessions` collection filtered by `lab_id == selectedLab.id`.
  - Calculate:
    - **Ongoing Practicum:** Session where current time falls within `waktu_mulai` and `waktu_selesai` (or status == `OPEN`).
    - **Next Practicum:** Next upcoming session sorted by `waktu_mulai`.
  - Display Course Title, Class, Assistant Name, Schedule Time, and real-time Session Status Badge (`Dibuka`, `Berlangsung`, `Kosong`).
* **Acceptance Criteria (DoD):**
  - Real-time updates: If an assistant opens a session at that lab, the status badge on the map sheet updates immediately without reload.
  - Shows friendly empty state if no practicums are scheduled for today.

##### `FR-P1-05`: *(Optional)* QR Code Presence Scanner
* **Goal:** Provide an alternate camera QR scanner for students as a secondary presence verification option.
* **Technical Tasks:**
  - Integrate `expo-camera` scanner to parse session QR code token generated by assistant.

---

#### 👨‍💻 Programmer 2: Push Notifications, Lab Geofence CRUD & Asisten Monitoring

##### `FR-P2-01`: Firebase Cloud Messaging (FCM) Core Setup & Token Management
* **Goal:** Initialize push notifications, request notification permissions, register device FCM tokens, and manage foreground/background notification handlers.
* **Technical Tasks:**
  - Configure push notification library (e.g., `expo-notifications` or `@react-native-firebase/messaging`).
  - Request notification permission upon login.
  - Save/update FCM token in user document: `users/{uid}/fcmTokens` (supports multiple devices per user).
  - Remove token on user logout.
  - Handle foreground notifications with in-app banner/toast and notification sound.
* **Acceptance Criteria (DoD):**
  - Token successfully registers to Firestore user document upon login.
  - Notification permission rejection is handled gracefully without crashing the app.

##### `FR-P2-02`: Event-Driven Push Notification Dispatcher
* **Goal:** Send automated push notifications to relevant users based on practicum events.
* **Technical Tasks:**
  - Implement notification triggers (via Cloud Functions or backend service):
    1. **Event: Session Opened (`session.status == 'OPEN'`):**
       - Recipient: Enrolled students of the practicum class.
       - Title: *"Sesi Praktikum Dibuka!"*
       - Body: *"Sesi [Nama Praktikum] di [Nama Lab] telah dibuka. Silakan lakukan presensi di lokasi."*
    2. **Event: Schedule Rescheduled / Modified:**
       - Recipient: Enrolled students and assigned assistants.
       - Title: *"Perubahan Jadwal Praktikum"*
       - Body: *"Jadwal praktikum [Nama Praktikum] mengalami perubahan. Periksa detail sesi terbaru."*
    3. **Event: Leave Request Decision (`leaveRequest.status` updated):**
       - Recipient: Requesting student.
       - Title: *"Status Pengajuan Izin"*
       - Body: *"Pengajuan izin Anda untuk praktikum [Nama Praktikum] telah [Disetujui/Ditolak] oleh asisten."*
  - Support notification response tapping to navigate directly to target screen.
* **Acceptance Criteria (DoD):**
  - Targeted users receive prompt push notification within 3-5 seconds of event trigger.

##### `FR-P2-03`: Laboratory Location & Geofence CRUD (Asisten)
* **Goal:** Allow assistants to manage laboratory geographic reference points and presence validation radii.
* **Technical Tasks:**
  - Create management screen `src/app/asisten/labs/` (List, Add, Edit).
  - Form fields:
    - Lab Name (e.g., "Laboratorium Rekayasa Perangkat Lunak")
    - Building / Floor description (e.g., "Gedung E Lantai 3")
    - Latitude & Longitude (decimal degrees)
    - Allowed Presence Radius (e.g., 30m, 50m, 100m)
  - Quick action: *"Gunakan Lokasi Saya Saat Ini"* using device GPS to auto-populate coordinates.
  - Persist to Firestore `laboratorium` collection with validation.
* **Acceptance Criteria (DoD):**
  - Assistant can create, update, and view labs with coordinates.
  - Data updates propagate immediately to students' map and presence screens.

##### `FR-P2-04`: Realtime Attendance Monitoring & Radius Recap (Asisten)
* **Goal:** Enhance assistant's session recap screen with location verification data.
* **Technical Tasks:**
  - Update `src/app/asisten/session/[sessionId]/recap.tsx`:
    - Display distance recorded during check-in (e.g., *"Hadir - 14 meter dari titik lab"*).
    - Status badge indicating verified geofence check.
  - Keep real-time Firestore listener `onSnapshot` for instant list updates as students arrive.
* **Acceptance Criteria (DoD):**
  - Recap displays timestamp, student name, NIM, and verified check-in distance.
  - Non-verified or out-of-bounds attempts are excluded from success count.

##### `FR-P2-05`: Leave Request Decision Feedback & Notification Flow
* **Goal:** Connect assistant's approval/rejection of leave requests directly to the notification dispatch pipeline.
* **Technical Tasks:**
  - In `asisten/session/[sessionId]/leaveReview.tsx`, upon tapping "Terima" or "Tolak":
    - Update Firestore `leaveRequests/{requestId}` document with status and optional note.
    - Trigger `FR-P2-02` notification dispatcher with student's UID.
* **Acceptance Criteria (DoD):**
  - Student receives instant push notification with assistant's decision and note.

---

### Shared Firestore Data Contracts

```json
// Collection: laboratorium
{
  "id": "lab-basis-data",
  "nama": "Laboratorium Basis Data",
  "gedung": "Gedung E Lantai 2",
  "latitude": -7.049821,
  "longitude": 110.439123,
  "radius_meter": 50,
  "updated_at": "2026-11-20T08:00:00Z"
}

// Collection: sessions (enhanced)
{
  "id": "sesi-prak-01",
  "practicum_id": "prak-mobile",
  "matakuliah": "Pemrograman Mobile",
  "kelas": "IF-A",
  "lab_id": "lab-basis-data",
  "waktu_mulai": "2026-11-20T08:00:00Z",
  "waktu_selesai": "2026-11-20T10:00:00Z",
  "status": "OPEN", // "OPEN", "CLOSED", "UPCOMING"
  "asisten_id": "aslab-uid"
}

// Collection: attendance (enhanced with geofence audit)
{
  "id": "att-001",
  "session_id": "sesi-prak-01",
  "user_id": "mhs-uid",
  "user_name": "Rian Pratama",
  "user_nim": "24060122140001",
  "recorded_at": "2026-11-20T08:05:12Z",
  "status": "Hadir",
  "distance_meter": 16.4,
  "device_lat": -7.049810,
  "device_lng": 110.439115,
  "is_location_verified": true
}

// Collection: users (enhanced with FCM)
{
  "uid": "mhs-uid",
  "email": "rian@students.undip.ac.id",
  "role": "praktikan",
  "fcm_tokens": ["fcm_token_device_1", "fcm_token_device_2"]
}
```

---

### Demonstration & QA Verification Checklist (3 Main Flows)

1. **Flow 1 — Location-Based Presence:**
   - Assistant opens session at Lab Basis Data (50m radius).
   - Student > 50m away opens presence screen $\rightarrow$ Submit button is disabled; distance error displayed.
   - Student enters lab ($\le 50$m) $\rightarrow$ Submit button is enabled; attendance recorded successfully.
   - Student attempts duplicate check-in $\rightarrow$ Rejected with clear feedback.
   - Assistant recap updates in real time with student distance badge.

2. **Flow 2 — Interactive Map & Lab Activities:**
   - User opens Maps screen $\rightarrow$ Current GPS position marker appears; all lab markers rendered.
   - User taps Lab Basis Data $\rightarrow$ Bottom sheet shows ongoing practicum and next scheduled session.
   - Assistant changes session status $\rightarrow$ Map sheet reflects change live.

3. **Flow 3 — Activity Push Notifications:**
   - Assistant opens session $\rightarrow$ Enrolled students receive "Sesi Dibuka" push notification.
   - Assistant modifies schedule $\rightarrow$ Affected users receive "Perubahan Jadwal" notification.
   - Assistant approves/rejects leave $\rightarrow$ Requesting student receives decision notification.

---

## Current Limitations

- Classification runs entirely in the client (on-device), so the stored `ai` result is informational. It never influences the decision.
- The `ai` result lives in a separate `leaveClassifications/{uid}` document readable **only by asisten**; praktikan writes it without being able to read it back. It is still tamper-able by a modified client because the write happens client-side.
- No Cloud Functions or custom backend (Firebase Spark plan); all logic runs in the client and Security Rules.
- No push notifications, export, analytics, or Google sign-in.
- Session status is managed manually and is not derived from the clock.
- No automated tests; verification is manual (see the definition of done in `PRD.md` §7.12).
- Leave decisions are final in this version.

## Team Workflow

| Area | Owner |
| --- | --- |
| Authentication, asisten features (CRUD, open/close, recap, leave review), Rules for `users`/`practicums`/`sessions` | Programmer A |
| Praktikan features (schedule, attendance, history), leave requests, AI integration, real-time hooks, Rules for `attendance`/`leaveRequests` | Programmer B |
| Firebase project, Rules integration, QA, documentation | Project manager |

- One branch per feature (`feat/auth`, `feat/attendance`, …); merge into `main` through reviewed pull requests.
- Components never call Firestore directly; use `src/services/` and `src/hooks/`.
- Tick the acceptance criteria in `PRD.md` as each requirement is completed.

## Documentation

- [`docs/PRD.md`](./docs/PRD.md) — requirements, flows, data model, and definition of done (Sprint 1 and Sprint 2).
- [`docs/DESIGN.md`](./docs/DESIGN.md) — design tokens, component rules, and screen specifications.
- [`docs/FIREBASE_SETUP.md`](./docs/FIREBASE_SETUP.md) — Firebase project setup.
- [`AGENTS.md`](./AGENTS.md) — repository conventions for AI-assisted development.

## Assumptions

- Authentication uses email/password only.
- UI copy is in Indonesian; developer documentation is in English.
- Times are displayed in WIB (UTC+7).
- Attendance is a single status, **Hadir**; approved leave is shown as **Izin** in the recap.

## License

See [`LICENSE`](./LICENSE).
