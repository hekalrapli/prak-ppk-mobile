# PrakPresensi

A mobile practicum attendance app for a university, built with Expo / React Native. Two roles — **Praktikan** (student) and **Asisten** (teaching assistant) — share live data through **Firebase Authentication** and **Cloud Firestore**. Praktikans can also submit leave requests (**izin**), whose reasons are categorized by an AI model for the assistant's review.

> **Implementation status**
> - **Sprint 1 (complete):** frontend-only prototype with local dummy data and React state (role selection, schedules, session open/close, attendance, history, recap).
> - **Sprint 2 (in progress):** Firebase Authentication, Firestore (CRUD, real-time listeners, Security Rules), leave requests, and AI classification of leave reasons. See [`PRD.md`](./PRD.md) §7.

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
| AI | Leave-reason classifier served over HTTP (URL set in `EXPO_PUBLIC_AI_API_URL`) |
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

The `@/*` path alias maps to `src/*`. Files from Sprint 1 (`dummy-data`, `demo-data-context`) are replaced as the Firebase features land.

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

## Installation and Setup (developers)

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file
cp .env.example .env      # then fill in the values provided by the project owner

# 3. Start the dev server (clear cache so .env is read)
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
EXPO_PUBLIC_AI_API_URL=
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
practicums/{pid}                        { name, className, assistantId, studentIds[], createdAt }
  sessions/{sid}                        { date, startTime, endTime, room, status, openedAt?, closedAt? }
    attendance/{uid}                    { praktikanId, praktikanName, praktikanNim, status, recordedAt }
    leaveRequests/{uid}                 { praktikanId, praktikanName, praktikanNim, reason, status, ai, createdAt, decidedBy?, decidedAt?, reviewNote? }
```

- Attendance and leave request documents use the **praktikan's UID as the document ID**, so at most one record per praktikan per session is guaranteed at the data level.
- Session status transitions are `upcoming → open → closed` only. A closed session cannot be reopened.
- Attendance time uses the Firestore server timestamp and is displayed as `HH:mm` (WIB).

## Roles and Security Rules

| Resource | Praktikan | Asisten (assigned) | Asisten (other) |
| --- | --- | --- | --- |
| `users/{uid}` | read/update own name | read | read |
| `practicums`, `sessions` | read if participant | create, update, delete | read |
| `attendance` | read own; create while session is open | read | read |
| `leaveRequests` | create/read own; edit reason while pending | read; approve/reject | read |

Rules enforce identity (`request.auth.uid`), role (from `users/{uid}`), session status, field whitelists, and string lengths. Role cannot be changed after registration, and registering as asisten requires the invitation code.

## AI Leave-Reason Classification

- When a praktikan submits a leave request, the app sends the reason text to the classifier at `EXPO_PUBLIC_AI_API_URL` and stores the result in the request's `ai` field (`category`, `confidence`, `model`, `classifiedAt`, `state`).
- Timeout is 10 seconds with one automatic retry. If the service fails, the request is still saved with `ai.state = "failed"` and can be reclassified later.
- The result is displayed as "Prediksi otomatis, bukan keputusan". The decision (`approved` / `rejected`) is made only by the assigned asisten.
- All request/response details live in `src/services/leaveClassifier.ts`.

> The classifier is served from the AI model repository provided for this project. Its API contract and hosting URL are configured through `EXPO_PUBLIC_AI_API_URL`.

## Demonstrating the Main Flows

**Flow 1 — Attendance (two accounts, two devices or windows)**

1. Register/login as **Asisten**, open a session, and confirm **Buka sesi**.
2. Register/login as **Praktikan** (a participant of that practicum). The session shows **Dibuka** without refresh.
3. Tap **Catat kehadiran**. The button changes to the completed state with the recorded time.
4. On the asisten device, the recap updates in real time.
5. Close the session with **Tutup sesi**. The praktikan's attendance action becomes unavailable.

**Flow 2 — Leave request**

1. Login as **Praktikan**, open a session, tap **Ajukan izin**, enter a reason, and submit.
2. The AI category appears on the request; the status is **Menunggu**.
3. Login as **Asisten**, open **Izin Masuk**, review the reason and AI category, then **Terima** or **Tolak** with a note.
4. The praktikan sees the decision and note in **Izin Saya** in real time.

## Current Limitations

- Calls to the AI service are made from the client, so the stored `ai` field is informational and not tamper-proof. It never influences the decision.
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
