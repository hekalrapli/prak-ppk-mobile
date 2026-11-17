# Design Specification — PrakPresensi

| Field | Value |
| --- | --- |
| Product | PrakPresensi (`prak-ppk-mobile`) |
| Document version | 2.0 (coral redesign) |
| Scope | UI/UX and design system for the Expo app |
| Product source of truth | `PRD.md` |
| Implementation stack | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript |

This document is implementation-oriented. Every value listed here lives in
`src/constants/theme.ts` or `src/constants/pastel.ts` unless stated otherwise.
Behavior, data, and security are owned by `PRD.md`, `README.md`, and
`firestore.rules`; this file only describes presentation.

---

## 1. Design Direction

The interface follows a soft, warm schedule-app language:

- White screens with generous whitespace.
- Coral accent for the next/active session, primary actions, and the floating
  bottom navigation.
- Pastel cards for sessions (lavender, mint, cream) with stable colors per
  practicum.
- Very rounded cards (radius 20), pill buttons and segmented controls, and a
  rounded white sheet for detail screens.
- Thin warm hairline borders only on inputs/secondary buttons. Cards use
  shadow instead of borders.
- No gradients, illustrations, glassmorphism, or decorative blobs. The only
  decoration is a faint ring on the coral detail header.
- No photo assets are introduced. Identities use initials.

The reference screenshot is used as a visual direction, not a pixel target.
Features that do not exist in this app (sidebar, notification bell, class
description, attachments, download/share actions, member avatars, overflow
menus) are intentionally **not** added.

---

## 2. Design Tokens

### 2.1 Color

Semantic tokens only; screens must not import raw hex values.

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | `#141110` | Screen background |
| `surface` | `#FFFFFF` | `#1D1917` | Cards, sheets, app bar |
| `surfaceWarm` | `#FFF8F2` | `#181412` | Auth shell, warm sections |
| `surfaceSubtle` | `#FFF4EC` | `#2A2320` | Subtle blocks, request items, skeleton |
| `surfacePressed` | `#FFEADF` | `#332A26` | Pressed card/row |
| `textPrimary` | `#241C18` | `#F5EEE9` | Titles and primary content |
| `textSecondary` | `#6B5F59` | `#C3B6AE` | Metadata, descriptions |
| `textTertiary` | `#8A7E78` | `#A1938B` | Placeholders and low-emphasis hints |
| `border` | `#F0E5DE` | `#332B27` | Hairline borders/dividers |
| `borderStrong` | `#DCCBC1` | `#4A3E38` | Timeline rail, handle, emphasized line |
| `primary` | `#C9492B` | `#C9492B` | Primary button, coral header, accent fill |
| `primaryPressed` | `#B03E24` | `#B03E24` | Pressed primary |
| `primarySoft` | `#FFE9D6` | `#3A2018` | Avatar chip, selected role card |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | Text/icons on `primary` |
| `accent` | `#FF8A68` | `#C9492B` | Highlight card, bottom nav pill, accents |
| `accentPressed` | `#F27452` | `#B03E24` | Pressed accent surface |
| `accentSoft` | `#FFE9D6` | `#3A2018` | Soft accent background |
| `onAccent` | `#2A1A14` | `#FFFFFF` | Text/icons on `accent` |
| `secondary` | `#5B4C45` | `#C3B6AE` | Neutral secondary emphasis |
| `link` | `#C9492B` | `#FF8A68` | Text links on normal surfaces |
| `success` | `#177A57` | `#7ED3A6` | Open session, success |
| `successSoft` | `#E8F7EF` | `#12231B` | Success panel |
| `warning` | `#8A6A12` | `#E3C06A` | Pending / caution |
| `warningSoft` | `#FFF7DF` | `#2A2316` | Warning panel |
| `error` | `#A63A34` | `#F0918C` | Errors, destructive fill |
| `errorSoft` | `#FDECEC` | `#2B1514` | Error panel, offline banner |
| `disabledBg` | `#F2EAE4` | `#2A2320` | Disabled control |
| `disabledText` | `#9C8F88` | `#8E8078` | Disabled label |
| `focusRing` | `#E08A6E` | `#FF9F7F` | Focus accent |
| `overlay` | `rgba(36,28,24,0.36)` | `rgba(0,0,0,0.62)` | Modal backdrop |

Rules:

- Text on `accent` uses `onAccent` (7.2:1 in light, 4.7:1 in dark). In dark
  mode the coral surface is deepened so light text stays accessible.
- Buttons with white text use `primary` (4.7:1 in both modes).
- Text links use `link`: deep coral on light surfaces, light coral on dark
  surfaces.
- Destructive buttons use `error` fill with `background`-colored label for
  contrast in both modes.
- Status never relies on color alone; the label is always written.
- Do not use raw hex values in screen files.

### 2.2 Pastel session palettes

Defined in `src/constants/pastel.ts` and selected by a stable hash of
`practicum.id`, so the same practicum always gets the same card color.

| Palette | Light surface | Light accent | Dark surface | Dark accent |
| --- | --- | --- | --- | --- |
| Lavender | `#EEF0FF` | `#4A5BD4` | `#232437` | `#B9C2FF` |
| Mint | `#E9FFF3` | `#177A57` | `#16281F` | `#8FE3BA` |
| Cream | `#FFFBEA` | `#8A6A12` | `#2A2418` | `#E6C877` |

All accent/surface pairs were verified at ≥4.5:1 contrast.

### 2.3 Typography

System font only; no font package. Defined as `Typography` in `theme.ts`.

| Token | Size | Line height | Weight | Usage |
| --- | --- | --- | --- | --- |
| `display` | 30 | 38 | 700 | Auth wordmark |
| `screenTitle` | 26 | 34 | 700 | Detail title, profile name |
| `sectionTitle` | 19 | 27 | 600 | Section headings, dialog titles |
| `cardTitle` | 17 | 24 | 600 | Card titles, app bar title |
| `body` | 16 | 24 | 400 | Descriptions, values |
| `bodyStrong` | 16 | 24 | 600 | Names, emphasized values |
| `label` | 14 | 20 | 600 | Field labels, buttons |
| `caption` | 13 | 18 | 500 | Metadata, helper text, status |

Rules: allow system font scaling; do not use sizes below 12; no more than
three weights on one screen; keep body copy short and scannable.

### 2.4 Spacing

Unchanged 4-based scale: `half 2`, `one 4`, `two 8`, `three 16`, `four 24`,
`five 32`, `six 64`.

- Screen padding: 16.
- Card padding: 16 (highlight card: 24).
- Gap between cards: 8–12.
- Section gap: 24.
- Bottom content padding: 32 plus the floating tab bar.

### 2.5 Radius

| Token | Value | Usage |
| --- | --- | --- |
| `xs` | 6 | Skeleton, small chips |
| `sm` | 8 | Small chips |
| `md` | 12 | Compact blocks |
| `lg` | 16 | Inputs, request items, compact cards |
| `xl` | 24 | Legacy modals |
| `card` | 20 | Session cards, info cards, profile cards |
| `sheet` | 28 | Detail sheet, confirmation modal |
| `pill` | 999 | Buttons, segmented control, tab bar |
| `full` | 999 | Avatar, dots, halos |

### 2.6 Elevation

| Token | iOS | Android |
| --- | --- | --- |
| `Shadow.soft` | warm shadow, opacity 0.10, radius 18, y 8 | `elevation: 3` |
| `Shadow.floating` | coral shadow, opacity 0.22, radius 20, y 10 | `elevation: 8` |
| `Shadow.sheet` | warm shadow, opacity 0.12, radius 24, y −6 | `elevation: 10` |

Android ignores `shadowColor`; shadows render neutral. This is expected and
was checked in code review; no alternative shadow library is added.

---

## 3. Navigation and Shells

### 3.1 Route tree

```
Root Stack (src/app/_layout.tsx, headerShown: false)
├── (auth)/login, (auth)/register        native header on surfaceWarm
├── praktikan/(tabs)/index               Jadwal
├── praktikan/(tabs)/history             Riwayat
├── praktikan/(tabs)/profile             Profil
├── praktikan/session/[sessionId]        Detail Sesi (custom coral header)
├── asisten/(tabs)/index                 Jadwal
├── asisten/(tabs)/history               Riwayat
├── asisten/(tabs)/profile               Profil
├── asisten/session/[sessionId]/index    Kelola Sesi (custom coral header)
└── asisten/session/[sessionId]/recap    Rekap Kehadiran (custom coral header)
```

Role access is unchanged (`AuthGate`, `RoleGuard`, route-level checks).

### 3.2 Tab app bar (`ScreenHeader` + `TabScreen`)

- Height: safe-area top + 8 + 40 + 8.
- Left: 40 px avatar circle with initials (`primarySoft` background, `primary`
  text). Static identity, **not** a button.
- Center: screen title (`cardTitle`), one line, ellipsized.
- Right: circular `ThemeToggle` (44 px). Icon is sun in light mode and moon in
  dark mode. Pressing it switches and persists the choice; accessibility role
  remains `switch`.

No hamburger menu and no notification bell are added.

### 3.3 Bottom navigation (`AppTabBar`)

- Floating coral pill: horizontal margin 24, max width 480, min height 64,
  radius `pill`, `Shadow.floating`.
- Three items: Jadwal, Riwayat, Profil, with Material Symbols on Android/web
  and SF Symbols on iOS (confirmed supported by `expo-symbols` SDK 58).
- Active item: `onAccent` icon and bold label with a 3 px underline indicator.
  No dark inner pill.
- Inactive item: transparent, `onAccent` icon and label (dark ink in light,
  white in dark).
- Labels are always visible; status is not communicated by color alone.
- The bar reserves layout height, so list content is never hidden behind it.
- Hidden while a keyboard is open.

### 3.4 Detail header (`DetailHeader` + `DetailScreen`)

- Background `primary` (deep coral in both light and dark).
- 42 px circular back button with `onPrimary` border/icon, plus two faint ring
  decorations.
- Centered title (`cardTitle`, `onPrimary`), one line.
- The white sheet starts 24 px above the header bottom with top radius 28 and
  a 44×4 grab handle. Drag is visual only; there is no swipe gesture.

### 3.5 Auth header

Native stack header on `surfaceWarm`, no shadow, `textPrimary` tint. Login has
no back button; register keeps the native back button.

---

## 4. Components

### 4.1 AppButton

- Pill shape, min height 52, horizontal padding 24.
- `primary`: `primary` fill + `onPrimary` text.
- `secondary`: `surface` fill, 1 px `border`, `textPrimary` label.
- `destructive`: `error` fill + `onPrimary` text (logout and close-session
  confirmation).
- Disabled: `disabledBg` + `disabledText`.
- Loading: `ActivityIndicator` in the current text color; press disabled.
- One primary action per footer.

### 4.2 CircleButton

- 44×44 default, fully round, 1 px border.
- `surface` tone (white app bar) or `primary` tone (coral detail header).
- Static variant without `onPress` is allowed for identity/decorative slots.
- Always has an `accessibilityLabel`; minimum 44 dp hit area.

### 4.3 AppTextField

- Label (`label`) + 8 gap + field + helper/error (`caption`).
- Field: min height 52, radius 16, `surface` background, 1 px `border`.
- Focus border `primary`; error border `error` with error caption.
- Placeholder `textTertiary`; value `textPrimary`.
- Disabled uses `disabledBg`/`disabledText`.

### 4.4 StatusDot / StatusBadge

- 7 px colored dot + 8 gap + status text.
- Session labels are unchanged: **Belum dibuka**, **Dibuka**, **Ditutup**.
- On pastel cards the label color is the palette accent; on the coral highlight
  card it is `onAccent`.
- Tones: success = green, warning = mustard, error = red, muted/neutral = gray.
- `StatusBadge` is the single source for session status.

### 4.5 SegmentedControl

- Pill container (`surfaceSubtle`, 1 px `border`), 4 px padding.
- Selected segment: `surface` pill with `Shadow.soft`, bold label.
- Optional count is shown as `Label (n)`.
- Used for session tabs (Ringkasan/Kehadiran/Izin) and Praktikan history
  (Kehadiran/Izin Saya).

### 4.6 Session cards

- Background: pastel palette by `practicum.id`.
- Radius `card`, padding 16, no border, no shadow (flat pastel).
- Top row: practicum title (2 lines max) + status dot/label.
- Then: time `08:00–09:40 WIB`, class · room, assistant name (existing
  denormalized field), and optional `N peserta` from `studentIds.length`.
- Whole card pressable; pressed state uses 0.86 opacity.
- Accessibility label includes practicum, date, time, assistant, and status.

### 4.7 Session highlight card

- Coral (`accent`) card with `Shadow.floating`, radius `card`, padding 24.
- Eyebrow: **Sesi berlangsung** when the session is open, otherwise
  **Sesi berikutnya**.
- The status dot/label is top-right; all text uses `onAccent`.
- Shows title, date, time range + WIB, class · room, participant count, and
  assistant name as text. No teacher photo.
- Selection rule: first `open` session; otherwise the nearest `upcoming`
  session; otherwise the card is hidden. A highlighted session is not repeated
  in the list below.

### 4.8 Schedule timeline (Praktikan)

- Sessions are grouped by their existing date string with a `SessionDateHeader`.
- Each row: 48 px time column (`startTime`), a 20 px rail with a 1 px
  `borderStrong` line, and the pastel card on the right.
- The "now" marker is a coral dot with an `accentSoft` halo. It is purely
  visual and only appears when the device date matches the session date and
  the device time falls inside the session range. It never changes status.
- Asisten schedules use the same date grouping and cards **without** the
  timeline rail (denser management view).

### 4.9 Session detail sheet

- Custom coral header from the route wrapper.
- White sheet: handle, pill tabs, scrollable content, optional action footer.
- Summary: date, StatusBadge, title (`screenTitle`), time + WIB, class · room.
- Info card (`Shadow.soft`) lists asisten, kelas, ruang, opened/closed time when
  available.
- Guidance card uses `successSoft` when open, `surfaceSubtle` otherwise.
- Tabs preserve the current behavior:
  - Asisten: Ringkasan / Kehadiran (recap) / Izin (pending count).
  - Praktikan: Ringkasan / Izin (own request).
- Footer actions are unchanged: open/close for the assigned asisten, attendance
  for eligible praktikan, disabled explanatory buttons otherwise.
- All existing toasts, confirmation modal, and one-attendance rule stay intact.

### 4.10 Recap and history rows

- Recap summary card and each record are white with `Shadow.soft`, radius 20.
- Record row: name (`bodyStrong`), identifier (`caption`), status dot, and
  recorded time (`bodyStrong`, tabular numerals).
- Praktikan history: white card rows; leave cards show status dot, session
  date/time, reason, and assistant note in `surfaceSubtle`.
- Asisten history: closed sessions grouped by date, opening the recap route.

### 4.11 Empty / loading / error

- `EmptyState`: 56 px `surfaceSubtle` circle with a coral dot, section title,
  body description, optional primary action.
- `LoadingState`: activity indicator + label.
- `ErrorState`: title + message + secondary retry button.
- `SkeletonCardList`: white cards with `Shadow.soft` and pulsing
  `surfaceSubtle` lines.
- Descriptions stay short and factual.

### 4.12 Modals, toast, offline banner

- `ConfirmModal`: centered white card, radius 28, `Shadow.soft`, overlay
  backdrop; two buttons side by side. Behavior, pending state, and destructive
  styling are unchanged.
- Toast: floating white card, radius 20, `Shadow.soft`, colored icon circle;
  auto-dismiss unchanged.
- Offline banner: full-width `errorSoft` strip with `error` text; no border.

### 4.13 Leave components

- `LeaveRequestModal`: white sheet-style card, radius 28, `Shadow.soft`,
  bilingual-free Indonesian copy, pink/tinted textarea with 1 px border.
- `LeaveStatusCard`: white card with `Shadow.soft`; status dot; edit/cancel
  actions remain only for pending requests.
- `AsistenLeaveReviewPanel`: white card; requests in `surfaceSubtle` blocks;
  review modal radius 28; reject requires a note.
- `AICategoryBadge` (asisten only): AI category dot/label and the fixed
  disclaimer **“Prediksi otomatis, bukan keputusan.”** Praktikan never sees
  the AI result.

---

## 5. Screen Specifications

### 5.1 Login / Register

- Background `surfaceWarm`; native header.
- Login wordmark `display`, fields stacked, coral primary **Masuk** button in
  the footer, error panel in `errorSoft`.
- Register: role cards (Praktikan/Asisten) in a row, data fields, assistant
  invitation code section when needed; same footer button pattern.
- Validation, error copy, and navigation are unchanged.

### 5.2 Praktikan — Jadwal

```
TabScreen "Jadwal"
└── SectionList (date sections)
    ├── Highlight card (open/upcoming, or hidden)
    ├── Date header
    ├── Timeline rows (time · rail · pastel card)
    └── EmptyState when no sessions
```

- Pull-to-refresh, skeleton, and error retry are unchanged.
- The card opens the session detail route.

### 5.3 Asisten — Jadwal

```
TabScreen "Jadwal"
└── SectionList
    ├── Highlight card
    ├── Status summary (dibuka / belum dibuka / ditutup)
    ├── Date header
    └── Pastel card rows (no timeline)
```

- Only practicums assigned to the signed-in assistant are shown (existing
  query/guard).

### 5.4 Praktikan — Riwayat

- TabScreen "Riwayat", segmented control Kehadiran / Izin Saya.
- Attendance rows are white cards (name, date, Hadir, time) and open the
  session.
- Leave cards show status, date/time, reason, and review note.

### 5.5 Asisten — Riwayat

- Closed sessions grouped by date as pastel cards; tapping opens the recap.

### 5.6 Profil (both roles)

- TabScreen "Profil"; white cards with shadow.
- Identity: 64 px initials avatar, name, identifier, email, role.
- Practicum list: coral dot + name + class (+ assistant for praktikan).
- Red destructive **Keluar dari akun** button.
- App version caption.

### 5.7 Detail Sesi / Kelola Sesi / Rekap

- Coral header + white sheet (see §3.4 and §4.9).
- Loading, error, and not-found states are wrapped in the same header shell so
  the back button is always available.
- Recap uses the white sheet with summary + record list and keeps the session
  summary visible when empty.

---

## 6. Data Constraints

The redesign uses only data already returned by hooks:

- `Practicum.assistantName` — shown as text; no photo.
- `Practicum.studentIds.length` — shown as “N peserta”; no avatars or member
  list.
- `Session.date/startTime/endTime/room/status/openedAt/closedAt`.
- Attendance and leave documents already used by the existing screens.

Not added: new queries, fields, Firestore calls, chat, sharing, attachments,
descriptions, notifications, or dashboard statistics.

AI visibility is unchanged: the classification is rendered only inside the
asisten review panel, with the disclaimer above.

---

## 7. Accessibility and Platform Notes

- Text pairs meet WCAG AA: body text ≥4.5:1, icons/UI ≥3:1. Verified pairs:
  primary/onPrimary 4.70:1 (both modes), onAccent/accent 7.23:1 (light) and
  4.70:1 (dark), pastel labels 4.88–5.07:1 (light) and 8.86–10.21:1 (dark).
- Touch targets: 44×44 minimum (CircleButton, tabs, secondary buttons).
- Status always includes a text label; color is supplementary.
- Text uses `numberOfLines` only for titles, never for status/time.
- System font scaling is respected; controls use `minHeight`.
- Android hardware back closes modals (existing `onRequestClose`).
- Shadows: iOS uses warm `shadow*`; Android uses `elevation` (neutral color).
- `expo-symbols` provides SF Symbols on iOS and Material Symbols on Android/web.
- No new dependencies.

---

## 8. Manual Verification Checklist

Automated: `npx tsc --noEmit` and `npm run lint` must be clean.

### Flow 1 — Attendance (two accounts)

1. Asisten: open a session from Jadwal → detail sheet → **Buka sesi** →
   confirm modal → toast + status **Dibuka**.
2. Praktikan: the session appears as the coral highlight (open) and in the
   timeline; open it → **Catat kehadiran**.
3. Button is replaced by the success panel with the recorded time; a duplicate
   tap is not possible.
4. Asisten: **Kehadiran** tab updates in real time (name, Hadir, time).
5. Asisten: **Tutup sesi** → confirm destructive → status **Ditutup**; the
   praktikan button becomes disabled with an explanation.
6. Both roles: check pull-to-refresh, loading skeleton, and the bottom pill
   navigation on Jadwal/Riwayat/Profil.

### Flow 2 — Leave request

1. Praktikan: open a session → **Izin** tab → **Ajukan izin** → submit ≥10
   characters → toast; the request shows **Menunggu**.
2. Praktikan never sees the AI category; only the request status/note.
3. Asisten: **Izin** tab shows the request, the AI category, and the disclaimer
   “Prediksi otomatis, bukan keputusan.”
4. Asisten accepts/rejects (note required for reject) → toast; recap/tab
   counts update.
5. Praktikan sees the decision and note in Izin Saya and in Riwayat.
6. Check empty, error, and offline states on both roles.

### Visual spot checks

- Long practicum names wrap to two lines without pushing the status label out.
- Multiple sessions on one date group under a single date header.
- The “now” dot appears only for today's session within its time range.
- Theme toggle switches light/dark, persists after restart, and both modes keep
  readable text on coral and pastel surfaces.
- 360 px width: no horizontal scroll, pill nav fits, cards remain tappable.
