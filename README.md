# PrakPresensi

A small Expo/React Native prototype for managing practicum attendance at a university. The app demonstrates two roles — **Praktikan** and **Asisten** — through a complete, frontend-only attendance flow.

> **Implementation status:** this repository currently contains the Expo starter template. The product, requirements, and design in [`PRD.md`](./PRD.md) and [`DESIGN.md`](./DESIGN.md) describe the target implementation. Screens and attendance logic are **not implemented yet**. This README documents how the project is set up today and how the planned app will be developed and demonstrated.

## Objectives

- Demonstrate a complete practicum attendance flow in one mobile app.
- Show a clear separation of capabilities between praktikan and asisten.
- Keep the implementation small enough for one developer: local dummy data, React state, and no backend.
- Produce a consistent, responsive UI that looks like a polished university utility rather than an admin dashboard.

## Key Features

| Feature | Praktikan | Asisten |
| --- | --- | --- |
| Role and dummy identity selection | Yes | Yes |
| Practicum schedule and session status | Yes | Yes |
| Session detail | Yes | Yes |
| Open a session | — | Yes |
| Close a session | — | Yes |
| Record attendance during an open session | Yes | — |
| Duplicate attendance prevention | Yes | — |
| Personal attendance history | Yes | — |
| Attendance recap per session | — | Yes |
| Confirmation modal and success feedback | Yes | Yes |

Supported session statuses are **Belum dibuka** (`upcoming`), **Dibuka** (`open`), and **Ditutup** (`closed`). Statuses are changed through app interactions, not real-time scheduling.

## Supported Roles

| Role | Capabilities |
| --- | --- |
| **Praktikan** | Select a dummy student identity, view schedules, open session details, record attendance when a session is open, see the recorded time, view personal attendance history. Attendance cannot be recorded twice for the same session. |
| **Asisten** | Select a dummy assistant identity, view schedules and session details, open and close sessions with confirmation, view the attendance recap for a session, and see status changes immediately. |

Role switching is available at any time from the app header. No restart is required.

## Technology Stack

Versions below come from the current `package.json` and `package-lock.json`.

| Layer | Technology | Version |
| --- | --- | --- |
| Runtime/framework | Expo | `~57.0.31` |
| UI runtime | React Native | `0.86.3` |
| UI library | React | `19.2.3` |
| Navigation | Expo Router | `~57.0.29` |
| Language | TypeScript (strict) | `~6.0.3` |
| Safe areas | `react-native-safe-area-context` | `~5.7.0` |
| Icons | `expo-symbols` | `~57.0.3` |
| Images | `expo-image` | `~57.0.5` |
| Animation | `react-native-reanimated` | `4.5.1` |
| Web support | `react-native-web` | `~0.21.0` |
| Package manager | npm (`package-lock.json`) | — |

The project does **not** currently include a UI kit, state-management library, backend client, database, or test framework. The planned implementation requires none of them. Use React Context/`useReducer`, React Native core components, and the already-installed modules.

> `package-lock.json` is present and no Bun/pnpm/Yarn lockfile exists. Use **npm** and `npx`, not `bun`/`bunx`.

## Project Structure

### Current repository

```
.
├── app.json
├── assets/
│   └── images/                 # Expo starter icons and images
├── scripts/
│   └── reset-project.js        # Expo starter reset script (do not run)
├── src/
│   ├── app/                    # Expo Router routes
│   │   ├── _layout.tsx         # Starter tab layout
│   │   ├── index.tsx           # Starter home screen
│   │   └── explore.tsx         # Starter explore screen
│   ├── components/             # Starter components
│   │   ├── ui/
│   │   ├── app-tabs.tsx
│   │   ├── themed-text.tsx
│   │   └── themed-view.tsx
│   ├── constants/
│   │   └── theme.ts            # Existing colors, spacing, fonts
│   ├── hooks/
│   │   ├── use-color-scheme.ts
│   │   └── use-theme.ts
│   └── global.css
├── AGENTS.md
├── DESIGN.md
├── LICENSE
├── PRD.md
├── package.json
└── tsconfig.json
```

### Planned implementation structure

This is the recommended target layout described in `DESIGN.md` §7.10. It is **not present in the repository yet**; the starter screens and native tab layout will be replaced during implementation.

```
src/
├── app/
│   ├── _layout.tsx                         # Root Stack + demo data provider
│   ├── index.tsx                           # Role and identity selection
│   ├── praktikan/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                       # Praktikan schedule
│   │   ├── history.tsx                     # Personal attendance history
│   │   └── session/[sessionId].tsx         # Praktikan session detail
│   └── asisten/
│       ├── _layout.tsx
│       ├── index.tsx                       # Asisten schedule
│       └── session/[sessionId]/
│           ├── index.tsx                   # Asisten session detail
│           └── recap.tsx                   # Attendance recap
├── components/
│   ├── ui/                                 # Buttons, inputs, badges, modal, etc.
│   └── attendance/                         # Schedule, session, attendance items
├── constants/theme.ts                      # Design tokens (extended)
├── data/dummy-data.ts                      # Users, sessions, seeded attendance
├── hooks/
├── store/demo-data-context.tsx             # In-memory state and actions
└── types/attendance.ts                     # Shared TypeScript types
```

The `@/*` path alias maps to `src/*` (configured in `tsconfig.json`).

## Prerequisites

- Node.js 20 LTS or newer (the repository does not pin a version; this is an assumption based on the Expo SDK).
- npm (bundled with Node.js).
- One of:
  - a physical device with **Expo Go**, or
  - an Android emulator via Android Studio, or
  - an iOS simulator via Xcode on macOS, or
  - a modern browser for the web target.
- Internet access for the initial dependency install and Expo tooling.

The planned feature set uses only modules already listed in `package.json`. If a development build is needed for any existing native module, run it locally or with EAS. The repository does not include `ios/` or `android/` directories; they are generated when needed.

## Installation and Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the Expo development server
npx expo start
```

From the Expo terminal UI:

- press `a` to open Android
- press `i` to open iOS (macOS only)
- press `w` to open the web build
- scan the QR code with Expo Go on a physical device

You can also launch a platform directly:

```bash
npm run android
npm run ios      # macOS only
npm run web
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo dev server (same as `npx expo start`). |
| `npm run android` | Start Expo and open the Android target. |
| `npm run ios` | Start Expo and open the iOS simulator (macOS only). |
| `npm run web` | Start Expo and open the web target. |
| `npm run lint` | Run `expo lint`. |
| `npx tsc --noEmit` | Type-check the project with the installed TypeScript compiler. |
| `npx expo-doctor` | Diagnose dependency and configuration issues. |
| `npx expo install --fix` | Align package versions with the installed Expo SDK. |

Notes:

- There is **no test script** and no test framework configured yet. Verification is currently manual, following the definition of done in `PRD.md`.
- `npm run lint` runs `expo lint`; the repository has no committed ESLint configuration or direct ESLint dependency yet. Expo may offer to create that setup on first use.
- At the time of writing, `npx tsc --noEmit` reports two pre-existing starter errors: missing type declarations for `src/components/animated-icon.module.css` and the `@/global.css` side-effect import. These are unrelated to the attendance feature and should disappear when the starter UI is replaced or CSS module declarations are added.
- `npm run reset-project` exists in `package.json` but deletes/moves starter code. **Do not run it** on this repository.

## Dummy Data and Local State

The prototype uses local, in-memory data only.

- Seed data lives in `src/data/dummy-data.ts` (planned) and is loaded into a React Context provider at app start.
- Role, selected identity, session statuses, and attendance records are held in React state. No network request, database, or cloud service is involved.
- The two role views read the **same in-memory demo store during a single app run**, so the main demonstration can be performed without restarting. This is local UI state sharing, not backend or cross-device synchronization.
- All state resets to the seed data when the app is reloaded. There is no persistence.
- Session status is an explicit property (`upcoming`, `open`, `closed`); it is not derived from the real clock. The date and time shown on screen are display data.
- Attendance is keyed by `(sessionId, praktikanId)`, so the same praktikan cannot be recorded twice for one session. The reducer also rejects a duplicate write, not only the button UI.
- An attendance record stores the session, praktikan, status `Hadir`, and the local time at which the user pressed the attendance button.

### Seed Data

Dummy identities:

| User ID | Role | Name | Identifier | Class |
| --- | --- | --- | --- | --- |
| `P-01` | Praktikan | Nabila Putri | `2211102034` | IF-3A |
| `P-02` | Praktikan | Bagas Saputra | `2211102041` | IF-3A |
| `P-03` | Praktikan | Salsabila Rahma | `2211102052` | IF-3A |
| `A-01` | Asisten | Raka Pratama | `2211101008` | — |
| `A-02` | Asisten | Dinda Maharani | `2211101015` | — |

Dummy sessions:

| Session ID | Praktikum | Class | Date | Time | Room | Initial status |
| --- | --- | --- | --- | --- | --- | --- |
| `S-01` | Praktikum Pemrograman Mobile | IF-3A | Senin, 26 Okt 2026 | 08:00–09:40 | Lab Mobile 2 | Belum dibuka |
| `S-02` | Praktikum Basis Data | IF-3A | Selasa, 27 Okt 2026 | 10:00–11:40 | Lab Basis Data 1 | Dibuka |
| `S-03` | Praktikum Jaringan Komputer | IF-3A | Senin, 19 Okt 2026 | 13:00–14:40 | Lab Jaringan | Ditutup |
| `S-04` | Praktikum Struktur Data | IF-3A | Rabu, 28 Okt 2026 | 15:00–16:40 | Lab Komputer 3 | Belum dibuka |

Seeded attendance (illustrative):

- `S-02`: `P-02` at 10:06, `P-03` at 10:11.
- `S-03`: `P-01` at 13:04, `P-02` at 13:02, `P-03` at 13:09.

All dummy praktikans are treated as enrolled in all listed sessions. There is no enrollment or class-filtering feature.

## Demonstrating the Main Flow

Start the app, then follow these steps. This script matches `PRD.md` §6.5 and `DESIGN.md` §7.8.

1. **Select Asisten.** On the role screen, choose **Asisten**, select **Raka Pratama**, then tap **Masuk**.
2. **Choose a session.** Open **Praktikum Pemrograman Mobile** (`S-01`, Senin 26 Okt 2026, 08:00–09:40). Its badge reads **Belum dibuka**.
3. **Open the session.** Tap **Buka sesi**. A confirmation modal appears; confirm. The badge changes to **Dibuka**, and a success toast is shown.
4. **Switch to Praktikan.** Tap **Ganti peran**, choose **Praktikan**, select **Nabila Putri**, and enter.
5. **View the same session.** Open **Praktikum Pemrograman Mobile**. Attendance is available because `S-01` is now open in the shared local demo state.
6. **Record attendance.** Tap **Catat kehadiran**. The button becomes a completed state showing the recorded time, and a success toast appears.
7. **Check history.** Open **Riwayat** from the praktikan header. The new record appears with the session name, date, status **Hadir**, and attendance time.
8. **View the recap.** Tap **Ganti peran**, return as **Asisten**, open `S-01`, and tap **Lihat rekap kehadiran**. The recap lists Nabila Putri with status **Hadir** and the recorded time.
9. **Close the session.** Go back to the session detail, tap **Tutup sesi**, and confirm. The badge changes to **Ditutup**.
10. **Verify attendance is unavailable.** Switch back to **Praktikan** and open `S-01`. The attendance action is disabled and the screen states that the session has been closed. The existing record remains visible in history.

Reloading the app resets all sessions and attendance to the seed data, which makes the scenario repeatable.

## Current Limitations and Out of Scope

- No backend, database, cloud service, or persistent storage.
- No real authentication, authorization, or user accounts; roles and identities are selected locally.
- No synchronization across devices or app instances. State is shared only between role views inside one running app.
- No automatic schedule/status calculation from the current time; statuses are managed manually.
- No notifications, reminders, QR/NFC check-in, geolocation, or biometrics.
- No attendance recap filtering, exporting, analytics, or pagination.
- No enrollment management; all dummy praktikans see all dummy sessions.
- No profile editing, password flows, or admin screens.
- No automated tests yet; no test framework is installed.
- The repository still contains Expo starter screens and a starter native tab layout; the app described by the docs is not implemented.

## Documentation

- [`PRD.md`](./PRD.md) — product behavior, requirements, flows, data model, scope, and definition of done.
- [`DESIGN.md`](./DESIGN.md) — design tokens, component rules, screen layouts, and interaction specifications.
- [`AGENTS.md`](./AGENTS.md) — repository conventions for AI-assisted development.

## Assumptions

These are stated explicitly because the repository does not pin them:

- Node.js 20+ and npm are assumed to be compatible with Expo SDK 57.
- Expo Go is assumed to support all modules used by the planned feature set. If a native module requires a development build, use `npx expo run:android` / `npx expo run:ios` or an EAS development build.
- UI copy is in Indonesian; developer documentation is in English.
- Dates use WIB (UTC+7) display labels. The prototype does not perform timezone conversion.
- Attendance is a single status, **Hadir**. There is no permission/sick/absent workflow.

## License

See [`LICENSE`](./LICENSE).
