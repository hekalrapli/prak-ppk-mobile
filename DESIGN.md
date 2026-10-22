# Design Specification — PrakPresensi

| Field | Value |
| --- | --- |
| Product | PrakPresensi (repository: `prak-ppk-mobile`) |
| Document version | 1.0 |
| Scope | UI/UX and design system for the frontend-only prototype |
| Product source of truth | `PRD.md` |
| Implementation stack | Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript |

This document is implementation-oriented. Values are recommendations to be placed in `src/constants/theme.ts`; behavior and scope are owned by `PRD.md`.

---

## 7.1 Design Goals

The interface should feel like a **quiet, polished university utility**, not an admin dashboard compressed into a phone.

| Goal | How the design achieves it |
| --- | --- |
| **Simple** | One primary task per screen. Session lists lead to details; details hold the action. No tabs, drawers, charts, or dashboards. |
| **Minimal** | Neutral background, white surfaces, thin borders, no decorative illustrations or gradients. A single blue accent for primary actions. |
| **Comfortable** | 16 px screen padding, 44 px minimum touch targets, 52 px primary buttons, generous vertical rhythm, and readable body text. |
| **Consistent** | A small semantic token set, one button system, one card style, and the same components across both roles. |
| **Status-first** | Every session shows a text status badge. Attendance availability is explained in plain language. |
| **Responsive** | Flexbox layouts, full-width cards, wrapping text, bounded content width, safe areas, and scrollable content with a stable action footer. |

The visual reference is a modern campus app: calm, sparse, and legible. The interface should remain clear in a five-minute evaluation and in bright classroom lighting.

---

## 7.2 Design Principles

1. **Clarity over decoration.** Remove anything that does not help the user understand a session, its status, or the next action.
2. **One primary action per screen.** A screen may have secondary actions, but only one visually dominant button.
3. **Minimal surfaces.** Use a border and background contrast instead of shadows. Reserve elevation for modals and toasts.
4. **Status is text plus color.** Never rely on green/gray alone. Use labels such as **Belum dibuka**, **Dibuka**, and **Ditutup**.
5. **Explain unavailability.** A disabled action must be accompanied by a reason, not just a gray button.
6. **Reuse, do not fork.** Both roles use the same `StatusBadge`, `AppButton`, `EmptyState`, `SessionCard`, and list item components.
7. **Comfortable density.** Keep 16 px between related elements and 24 px between sections. Do not fill every gap with a card.
8. **Design for real content.** Long practicum names, long student names, and small screens are normal cases, not edge cases.
9. **Feedback is immediate.** Every state-changing action produces a pending state and a visible result.
10. **Keyboard and safe areas matter.** Primary actions must remain reachable on devices with notches, home indicators, and open keyboards.

---

## 7.3 Design Tokens

All tokens should live in `src/constants/theme.ts` (extend the existing `Colors`, `Spacing`, and `Fonts`) and be imported by components. Do not scatter hex values or raw spacing throughout screens.

### 7.3.1 Color tokens

Tokens are semantic. Use the token name, not the color description, in components.

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `background` | `#F6F7F9` | `#0E1116` | App and screen background. |
| `surface` | `#FFFFFF` | `#171B21` | Cards, modal surfaces, input backgrounds. |
| `surfaceSubtle` | `#F1F3F6` | `#21262E` | Secondary blocks, date chips, neutral badges, skeleton-free empty areas. |
| `surfacePressed` | `#E8ECF1` | `#2A3039` | Pressed state for cards and secondary buttons. |
| `textPrimary` | `#111827` | `#F3F5F8` | Titles, names, primary content. |
| `textSecondary` | `#5B6472` | `#A7B0BD` | Metadata, supporting copy, labels. |
| `textTertiary` | `#6B7480` | `#9099A6` | Captions and low-emphasis hints. Still must remain readable. |
| `border` | `#DDE2E8` | `#2A303A` | Default borders and dividers. |
| `borderStrong` | `#C6CDD6` | `#3B4450` | Selected/neutral badge outline or emphasized divider. |
| `primary` | `#2563EB` | `#7AA6FF` | Primary buttons, links, focus accents, selected controls. |
| `primaryPressed` | `#1D4ED8` | `#5F91F2` | Pressed primary button. |
| `primarySoft` | `#EAF1FF` | `#182744` | Selected control background, soft info panels. |
| `onPrimary` | `#FFFFFF` | `#08111F` | Text/icons on primary fill. |
| `secondary` | `#475569` | `#CBD5E1` | Neutral secondary emphasis such as a date block label or supporting icon. This is not a second brand accent and never replaces `primary` for actions. |
| `success` | `#15803D` | `#6DDB95` | Open status text, successful attendance text, success icon. |
| `successSoft` | `#E8F6EC` | `#122C1D` | Success badge/panel background. |
| `warning` | `#9A4A08` | `#F0B36A` | Non-blocking caution text (used sparingly). |
| `warningSoft` | `#FFF3E3` | `#332612` | Warning panel background. |
| `error` | `#B91C1C` | `#FF9A9A` | Destructive confirm fill/text, error text. |
| `errorSoft` | `#FDECEC` | `#361A1A` | Error panel background. |
| `disabledBg` | `#E5E7EB` | `#252A32` | Disabled button/input background. |
| `disabledText` | `#7A8492` | `#7F8895` | Disabled labels and icons. |
| `focusRing` | `#93B4F8` | `#4C7FE0` | Keyboard focus outline on web and focus accent. |
| `overlay` | `rgba(17, 24, 39, 0.48)` | `rgba(0, 0, 0, 0.62)` | Modal backdrop. |

Rules:

- Use **green** only for open sessions, successful attendance, and success feedback.
- Use **red** only for destructive confirmations and errors. A closed session is neutral, not an error.
- Use **gray/neutral** for upcoming and closed states; the text label distinguishes them.
- Never use the primary blue for a destructive action.
- Body and label text should meet WCAG AA contrast (4.5:1). Large text may meet 3:1. Verify any new color pair.
- Avoid gradients entirely. The only exception is an existing branded splash asset outside the app screens.

### 7.3.2 Typography

Use the system font already configured through `Fonts.sans` in `src/constants/theme.ts`. Do not add a font package.

| Token | Size | Line height | Weight | Usage |
| --- | --- | --- | --- | --- |
| `display` | 30 | 38 | 700 | Role selection headline only. |
| `screenTitle` | 24 | 32 | 700 | Main screen titles when not using the native header. |
| `sectionTitle` | 18 | 26 | 600 | Section headings such as **Jadwal Praktikum**. |
| `body` | 16 | 24 | 400 | Paragraphs, guidance, empty-state descriptions. |
| `bodyStrong` | 16 | 24 | 600 | Names, card titles, values. |
| `label` | 14 | 20 | 600 | Field labels, button labels, metadata emphasis. |
| `caption` | 12 | 16 | 500 | Dates, NIM, helper text, badge labels. |
| `button` | 16 | 22 | 600 | Button text. |
| `time` | 16 | 24 | 600 | Attendance times; enable `fontVariant: ['tabular-nums']`. |

Rules:

- Use `textPrimary` for titles and `textSecondary` for metadata.
- Avoid all-caps text except tiny labels where readability is preserved; sentence case is preferred.
- Do not use font sizes below 12.
- Allow system font scaling. Prefer `minHeight` over fixed `height` for text-containing controls.
- Keep body copy to roughly 65 characters per line; use the content max width to prevent overly long lines on tablets/web.
- Do not use more than three weights on one screen.

### 7.3.3 Spacing

Reuse and extend the existing 4-based scale. Values not currently in `Spacing` may be added, but do not create a second competing scale.

| Token | Value | Usage |
| --- | --- | --- |
| `Spacing.half` | 2 | Hairline offsets, dot alignment. |
| `Spacing.one` | 4 | Icon-to-label gap, badge vertical padding. |
| `Spacing.two` | 8 | Tight gaps, badge horizontal padding, list item internal gaps. |
| `Spacing.three` | 16 | Screen horizontal padding, card padding, standard vertical gap. |
| `Spacing.four` | 24 | Section separation, larger card padding, footer padding. |
| `Spacing.five` | 32 | Empty state vertical spacing, top of major screens. |
| `Spacing.six` | 64 | Rare large breathing room on role selection/web. |

Default rhythm:

- Screen horizontal padding: **16**.
- Gap between list cards: **8**.
- Gap between sections: **24**.
- Card internal padding: **16**.
- Gap between a label and its field: **8**.
- Bottom content padding: **24** plus bottom safe area.

Do not use more than 32 px of spacing on a phone unless it creates a deliberate empty state. Avoid nested cards with their own padding.

### 7.3.4 Radii, sizes, and elevation

| Token | Value | Usage |
| --- | --- | --- |
| `radius.xs` | 6 | Status badge shape (not a full pill). |
| `radius.sm` | 8 | Small chips, date blocks. |
| `radius.md` | 12 | Buttons, inputs, compact surfaces. |
| `radius.lg` | 16 | Session cards, panels, recap summary. |
| `radius.xl` | 24 | Modal top corners and bottom sheet. |
| `radius.full` | 999 | Status dot and avatar only. |
| `control.buttonLarge` | 52 | Primary footer actions and **Masuk**. |
| `control.buttonMedium` | 44 | Secondary/modal actions. Must meet 44 px touch target. |
| `control.input` | 52 | Text inputs and selection rows. |
| `control.icon` | 20 | Inline icons; 24 for standalone affordances. |
| `control.minTouch` | 44 | Minimum interactive area for all controls. |
| `card.padding` | 16 | Standard card padding. |
| `layout.contentMaxWidth` | 560 | Centered content on tablets and web. |
| `layout.screenPadding` | 16 | Horizontal screen padding. |
| `modal.maxWidth` | 420 | Confirmation modal width. |
| `toast.maxWidth` | 480 | Toast content width. |

Elevation:

- Cards: no shadow. Use `surface` plus a 1 px `border`.
- Confirmation modal: `overlay` backdrop and a soft shadow (iOS `shadowOpacity` ≤ 0.18, `shadowRadius` 24; Android `elevation` 8).
- Toast: minimal shadow, same values; never stack multiple toasts.
- No other shadows. No glow effects.

### 7.3.5 Motion

- Default press feedback: background/opacity change, no spring animation.
- Modal: fade for the backdrop; optional 180–220 ms fade/scale for the card.
- Bottom sheet: 220 ms slide-up, respecting reduced-motion settings if easily available.
- Toast: fade in/out. Do not animate list items, badges, or page transitions beyond the platform default.
- No looping animations, parallax, or decorative motion.

---

## 7.4 Layout and Flexbox

### Screen shell

Every screen uses this structure:

```
SafeAreaView / content area (flex: 1, background)
├── Scrollable content (ScrollView or FlatList, flex: 1)
│   └── Content wrapper (width: 100%, maxWidth: 560, alignSelf: center,
│                        paddingHorizontal: 16)
└── Footer action area (optional; padding 16, borderTop, safe-area bottom)
```

- The header comes from the Expo Router Stack. Do not duplicate a full navigation bar inside the screen.
- Scrollable content must have enough bottom padding to clear the footer and the home indicator.
- On web/tablet, center content at `maxWidth: 560`; do not stretch cards across the entire browser.
- Use `flexGrow: 1` on scroll content containers so empty states can center vertically without absolute positioning.

### Cards

- Full width of the content column; never a fixed pixel width.
- `borderWidth: 1`, `borderColor: border`, `borderRadius: 16`, `backgroundColor: surface`, `padding: 16`.
- Use `flexDirection: 'row'` for metadata rows and `flexShrink: 1` / `minWidth: 0` on the text column so long names cannot push badges out of view.
- Cards are pressable as a whole only when they navigate. If a card contains multiple actions, use explicit buttons instead of making the entire card pressable.
- Do not nest cards. Use a subtle divider or `surfaceSubtle` block for secondary content.

### Lists

- Use `FlatList` for schedules, recap, and history; the datasets are small but the pattern is correct.
- `keyExtractor` uses the domain ID.
- Use `ItemSeparatorComponent` with an 8 px gap rather than margins between items.
- `contentContainerStyle` includes horizontal screen padding, top padding, and bottom padding.
- Provide `ListEmptyComponent` with `EmptyState`; do not render an empty `FlatList` with no explanation.
- Lists should fill available height and scroll; never set a fixed list height.
- When the keyboard may be open (role selection), wrap the form in `KeyboardAvoidingView` and use a `ScrollView`.

### Flexbox alignment

- Primary text columns: `flex: 1`, `minWidth: 0`.
- Status badges: `flexShrink: 0`, aligned to the top or end of a row.
- Metadata rows: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 8`, `alignItems: 'center'`.
- Buttons in footers: `alignSelf: 'stretch'` on phones; cap width at `contentMaxWidth` on larger screens.
- Avoid `position: 'absolute'` except for the overlay/toast layer. Do not absolutely position core content.

### Responsive behavior

- Test at 360 px width: no horizontal scrolling, no clipped text, and status badges remain visible.
- At larger widths, increase the typography/composition breathing room but keep the single content column. Do not create a two-column dashboard.
- Role selection cards may sit side-by-side on widths ≥ 360; if a device is narrower or text scales up, stack them.
- Allow text scaling; avoid fixed heights for text blocks. If a button's label wraps, it may grow beyond 52 px while keeping horizontal padding.
- Long text: use `numberOfLines={2}` plus `ellipsizeMode="tail"` for card titles and names; never truncate status or time. Show full names in detail/recap where space allows.

### Safe areas and keyboard

- Use `useSafeAreaInsets` (already installed via `react-native-safe-area-context`) or `SafeAreaView` for top/bottom insets.
- The action footer includes bottom safe-area padding plus 16 px.
- The toast sits above the footer and bottom inset.
- Role selection uses keyboard avoidance. No session screen has free-text input, so keyboard handling is limited to the selection form.
- On Android, modal dismissal must respond to the hardware back button via `onRequestClose`.
- Do not hide content behind the notch or home indicator.

---

## 7.5 Navigation

### Recommended model

Use an **Expo Router Stack** with a small role-separated route tree. Do not use tabs, drawers, or nested modal stacks.

```
Root Stack (src/app/_layout.tsx)
├── index                                  Role and identity selection (no header)
├── praktikan/                             Praktikan Stack
│   ├── index                              Jadwal Praktikan
│   ├── session/[sessionId]                Detail Sesi
│   └── history                            Riwayat Kehadiran
└── asisten/                               Asisten Stack
    ├── index                              Jadwal Asisten
    └── session/[sessionId]/
        ├── index                          Kelola Sesi
        └── recap                          Rekap Kehadiran
```

The current starter `NativeTabs` layout should be replaced by this Stack structure. There is no requirement for persistent bottom tabs, and two roles do not justify duplicating tab navigation.

### Entry and role switching

- App launch opens `/` (role selection). No role is preselected on a clean start.
- When entering through **Ganti peran**, `/` preselects the active identity so the user can see the current session's perspective; selecting a different role clears the identity selection.
- **Masuk** stores the identity in the shared demo provider and calls `router.replace('/praktikan')` or `router.replace('/asisten')`, so the role home is the root of the visible stack.
- **Ganti peran** in role headers calls `router.replace('/')`. The demo provider is not reset; only the active identity changes after the user enters the other role.
- Close any open modal/toast before changing roles.
- Role layouts guard access:
  - No active identity → redirect to `/`.
  - Active role does not match the route group → redirect to the correct role home.
- A deep link to a role route without an identity redirects to `/`.

### Movement within a role

| From | To | Mechanism |
| --- | --- | --- |
| Role selection | Role schedule | **Masuk** (`router.replace`). |
| Schedule | Session detail | Tap a session card (`router.push` with `sessionId`). |
| Session detail | Schedule | Native header back. |
| Praktikan schedule | Personal history | **Riwayat** button (`router.push('/praktikan/history')`). |
| History | Session detail | Tap a record (`router.push` to the matching praktikan session). |
| Asisten session detail | Attendance recap | **Lihat rekap kehadiran** (`router.push`). |
| Recap | Session detail | Native header back. |
| Any role screen | Role selection | **Ganti peran** header action. |

### Header behavior

- Use the native Stack header with `headerShadowVisible: false`, background `background`, tint `textPrimary`, and title in the same system font at `screenTitle`.
- Titles:
  - Jadwal (both roles)
  - Detail Sesi (praktikan)
  - Kelola Sesi (asisten)
  - Riwayat Kehadiran
  - Rekap Kehadiran
- Header right: **Ganti peran** as a text button with a 44 px touch target. Use `textSecondary` or `primary` for the label; no ambiguous icon-only control.
- Do not add a second custom in-screen header.
- The role selection route uses `headerShown: false` and handles its own safe area.

### Navigation rules

- Back always returns to the previous screen in the same role.
- Android hardware back follows the same stack behavior.
- A modal is a screen-level overlay, not a route, and closes before any navigation.
- Do not add a tab bar, drawer, hamburger menu, or settings stack.

---

## 7.6 Component Specifications

Components are shared across roles unless stated otherwise. Put generic primitives in `src/components/ui/` and attendance-specific components in `src/components/attendance/`.

### 7.6.1 AppButton

**Purpose:** The single button primitive for all actions.

| Variant | Visual | Usage |
| --- | --- | --- |
| `primary` | `primary` fill, `onPrimary` text, radius 12, height 52 | **Masuk**, **Catat kehadiran**, **Buka sesi**, **Tutup sesi**, modal confirm for open, report recap. |
| `secondary` | `surface` fill, 1 px `border`, `textPrimary` label, height 44 or 52 | **Lihat rekap kehadiran**, **Batal**, **Riwayat**, **Ganti peran** when presented as a button. |
| `destructive` | `error` fill, white text | Final confirmation of **Tutup sesi** only. Do not use it for the trigger button on the detail screen. |

**Structure:** optional leading icon (20 px) + label. Primary actions are full width in the footer. Modal actions are at least 44 px high. Avoid icon-only buttons; if an icon is used, it accompanies a label.

**States**

| State | Behavior |
| --- | --- |
| Default | Static fill/border per variant. |
| Pressed | `primaryPressed` for primary; `surfacePressed` for secondary; darker `error` for destructive. No scale animation required. |
| Disabled | `disabledBg` background, `disabledText` label, no press response, `accessibilityState.disabled = true`. Keep the label meaningful (**Presensi belum tersedia**). |
| Loading | Show a small `ActivityIndicator` in `onPrimary` / current text color while keeping the label visible; disable press and set `accessibilityState.busy = true`. |
| Focus (web) | 2 px `focusRing` outline or `boxShadow` equivalent. |

**Rules**

- One primary button per screen/footer.
- Never use red for attendance, open session, or role switching.
- Minimum touch target 44×44; the large variant is 52.
- Full-width buttons in footers; auto-width for header/modal secondary actions.
- Do not place two primary buttons side by side.

### 7.6.2 Secondary button

Uses `AppButton variant="secondary"`. Used for cancellation, recap access, and non-destructive alternatives. It must never visually compete with the primary action: border only, no filled primary color, no shadow.

### 7.6.3 Destructive button

Uses `AppButton variant="destructive"`. Only for the final **Tutup sesi** confirmation. On the asisten detail screen, the trigger for closing is a secondary/outlined action; confirmation is where the red button appears. This prevents accidental destructive emphasis while still making the consequence clear.

### 7.6.4 Text input

**Purpose:** A labeled field for future forms and the role screen's minimal input needs. The prototype's role/identity selection uses selection controls, but this component is part of the shared form system.

**Structure:** label (`label`, `textPrimary`, optional required marker) + 8 px gap + field + helper/error text (`caption`).

- Height: 52 px minimum; radius 12; `surface` background; 1 px `border`.
- Padding horizontal: 16.
- Placeholder: `textTertiary`; value: `textPrimary`, `body`.
- Focus: border `primary`, 1 px (or 2 px) and optional focus ring.
- Error: border `error`, helper text `error`; retain the label.
- Disabled: `disabledBg` background, `disabledText` text.
- Use `autoCapitalize`, `autoCorrect`, and `keyboardType` appropriately.
- Do not rely on placeholder as a label.
- Do not build a search field; there is no search feature.

### 7.6.5 Selection control

**Purpose:** Role cards and identity radio rows on the role selection screen.

**Role cards**

- Two equal-width cards in a row (stack if needed on very narrow screens).
- Each card: label **Praktikan** / **Asisten**, a one-line description, and a selected indicator.
- Unselected: `surface`, `border`, `textPrimary`. Selected: `primarySoft` background, `primary` border, `primary` text/indicator.
- Minimum height 88; padding 16; radius 12.
- Pressed: `surfacePressed`.
- Accessibility role: button or radio; expose `selected`/`checked`.

**Identity rows**

- A vertical list of radio-style rows, each at least 52 px high, full width.
- Left: a 20 px radio indicator. Center: name (`bodyStrong`) + identifier/class (`caption`, `textSecondary`). Right: optional check.
- Unselected: transparent/surface, `border`. Selected: `primarySoft` background, 1 px `primary` border. Do not use a filled pill shape.
- Pressed: `surfacePressed`.
- The whole row is pressable; minimum 44 px target.
- Show only identities for the selected role.
- When the role changes, clear the selected identity.

### 7.6.6 Session status badge

**Purpose:** Communicate session status and availability at a glance.

| Status | Label | Light styling | Notes |
| --- | --- | --- | --- |
| `upcoming` | **Belum dibuka** | `surfaceSubtle` bg, `textSecondary` text, 1 px `border` | Neutral; attendance not yet available. |
| `open` | **Dibuka** | `successSoft` bg, `success` text | The only green status. Attendance available if not recorded. |
| `closed` | **Ditutup** | `surface` bg, `borderStrong` border, `textSecondary` text | Neutral, not red. Attendance unavailable. |

**Structure:** 6 px dot + 8 px gap + label; 4/8 px vertical/horizontal padding; `radius.xs` (6); `caption` type (600 weight, or `label` at 12–14). The badge is not a button and does not navigate.

**Rules**

- Always show text. A colored dot alone is insufficient.
- Place the badge at the top-right of a session card or in the session detail header row. It must not be truncated.
- Use a single badge component everywhere, including the recap summary.
- Do not use the same green badge for "attendance recorded"; use the dedicated success panel/toast for that.

### 7.6.7 Schedule list item / Session card

**Purpose:** A scannable summary of a session in a schedule list.

**List item structure**

```
┌────────────────────────────────────────┐
│ Senin, 26 Okt 2026          [Dibuka]  │
│ Praktikum Pemrograman Mobile           │
│ IF-3A · Lab Mobile 2                   │
│ 08:00–09:40                            │
└────────────────────────────────────────┘
```

- Container: full-width, `surface`, 1 px `border`, radius 16, padding 16.
- Row 1: date caption (`textSecondary`) on the left, `StatusBadge` on the right, `alignItems: 'flex-start'`; allow the date to wrap only if necessary.
- Row 2: practicum title `bodyStrong`, up to two lines, `flexShrink: 1`.
- Row 3: class and room in `caption`/`label` with `textSecondary`, wrapping as needed.
- Row 4: time `bodyStrong` or `time`, with an optional clock icon; keep it separate from metadata for scanning.
- Gap between rows: 8.
- Pressed: `surfacePressed`; entire card pressable with `accessibilityRole="button"` and a label combining practicum, date, status, and "Buka detail sesi".
- Do not place action buttons inside a list card. Navigation only.

**Session card (detail header)**

- A larger version of the same visual language, not a distinct style.
- Contains the title, status badge, and a 2-column metadata grid (date/time, room, class, assistant) with 16 px padding.
- On narrow screens, metadata stacks vertically rather than compressing into unreadable columns.
- Long title: allow up to three lines in detail; never truncate essential metadata.

### 7.6.8 Attendance record item

**Purpose:** Display one attendance record in a recap or personal history.

```
┌────────────────────────────────────────┐
│ Nabila Putri                 Hadir     │
│ 2211102034 · 08:42                     │
└────────────────────────────────────────┘
```

- Recap version: name (`bodyStrong`), identifier (`caption`), status badge **Hadir**, recorded time (`time`).
- History version: practicum name (`bodyStrong`), session date (`caption`), status **Hadir**, recorded time; tap opens the session detail.
- Use a row layout with the time/status at the end; wrap the name column, never the time.
- Dividers: a 1 px `border` line between rows is optional; use one or the other, not both border and card chrome for every row. Prefer grouped rows inside a single bordered card/panel to reduce visual noise.
- If an item is pressable (history), show a subtle trailing chevron or rely on the row press state; include an accessibility label.

### 7.6.9 EmptyState

**Purpose:** Explain a zero-data state and offer a next step.

- Centered within the available content area, with `paddingVertical: 32` (or `flexGrow: 1` centering).
- Optional 32 px icon in a `surfaceSubtle` circle; do not add illustrations.
- Title `sectionTitle` or `bodyStrong`; description `body` in `textSecondary`; optional secondary action.
- Examples:
  - **Belum ada jadwal** — "Jadwal praktikum akan muncul di sini."
  - **Belum ada kehadiran** — "Kehadiran yang dicatat akan muncul di sini."
  - **Belum ada riwayat kehadiran** — "Catat kehadiran pada sesi yang dibuka untuk melihat riwayat."
  - **Sesi tidak ditemukan** — with **Kembali ke jadwal**.
- Do not show a spinner or a disabled button in an empty state.
- Do not use a large decorative hero.

### 7.6.10 Confirmation modal

**Purpose:** Confirm consequential session status changes.

- Centered card over `overlay`; max width 420; `surface`; radius 16; padding 24.
- Title: **Buka sesi?** or **Tutup sesi?** in `sectionTitle`.
- Body names the practicum and date and explains the consequence.
- Buttons: **Batal** (secondary, left) and **Buka sesi** / **Tutup sesi** (primary for open, destructive for close) on the right; stack vertically on very narrow screens.
- Dismissal: **Batal**, backdrop tap, Android back. All are treated as cancel.
- While pending, disable both actions and show a loading indicator on the confirm button.
- Accessibility: `accessibilityViewIsModal`, focus on the title, labels include the session name; return focus to the trigger on close.
- Do not use this modal for attendance; attendance is immediate and gets a toast/success panel.
- Do not use this modal for informational content.

### 7.6.11 Informational bottom sheet

**Purpose:** Optional supplementary information without leaving the screen (for example, a short status legend or session note). Not required for the primary flow.

- `Modal` with a transparent backdrop and a bottom-anchored surface.
- Top corners radius 24; content padding 24; bottom padding includes safe area.
- Optional 4×36 grabber in `borderStrong`.
- Title `sectionTitle`, body `body`, close button or **Mengerti** button.
- Dismiss via backdrop, swipe-down affordance, Android back, or the close button.
- Max height 80% of the screen; body scrolls if needed.
- Never use a bottom sheet for destructive confirmation. Never use it for a form that must survive dismissal.

### 7.6.12 Success toast / banner

**Purpose:** Confirm the result of an action after the state has changed.

- In-app overlay near the bottom, above the action footer and safe area; max width 480; `surface` with `border`, radius 12, padding 16, subtle shadow.
- Leading check icon in `success`; message `body`/`bodyStrong` in `textPrimary`; optional short detail.
- Examples:
  - **Kehadiran berhasil dicatat** — "Pukul 08:42."
  - **Sesi dibuka** — "Praktikan dapat mencatat kehadiran."
  - **Sesi ditutup** — "Presensi tidak lagi tersedia."
- Auto-dismiss after 3 seconds. One toast at a time; a new message replaces the old.
- Accessibility: `accessibilityLiveRegion="polite"` on Android and an appropriate announcement on iOS; do not steal focus.
- Do not use an OS `Alert` for success. Do not block interaction with the footer.
- For persistent information (recorded attendance), use the success panel on the screen in addition to the toast.

### 7.6.13 Success/completed attendance panel

**Purpose:** Replace the attendance button after a successful record.

- Full-width panel inside the footer or at the end of the detail content: `successSoft` background, 1 px `success` border, radius 12, padding 16.
- Row: check icon + **Kehadiran sudah dicatat** (`bodyStrong`, `success`) and the time (`time`, `textPrimary`).
- Not pressable. Include an accessibility label with the time.
- If the session is later closed, this panel remains; the status guidance changes to closed.
- This is not a button and must not look like a disabled gray button.

### 7.6.14 Header text button

- Label **Ganti peran** or **Riwayat**; `label` type, `primary` color, padding 8, minimum 44×44 touch area.
- No icon-only header actions.
- The header right action is secondary to the screen content; do not make it a filled button.

### 7.6.15 Status legend

A compact, low-emphasis block at the bottom of schedule screens:

| Badge | Meaning |
| --- | --- |
| **Belum dibuka** | Asisten belum membuka presensi. |
| **Dibuka** | Presensi dapat dicatat sampai sesi ditutup. |
| **Ditutup** | Sesi selesai; presensi tidak lagi tersedia. |

Use `caption` text, 8 px gaps. It is informational, not a card with its own heavy chrome. Keep it below the list and above the bottom padding; do not repeat it on every session card.

---

## 7.7 Screen Specifications

Each screen is described as content hierarchy, actions, and states. Wireframes are schematic, not pixel-perfect.

### 7.7.1 Screen 1 — Role and identity selection (`/`)

**Purpose:** Enter the app with a simulated role and identity.

**Layout hierarchy**

```
SafeAreaView (background)
└── KeyboardAvoidingView
    └── ScrollView (content max width 560, padding 16)
        ├── Brand block
        │   ├── Wordmark "PrakPresensi" (display)
        │   └── "Presensi praktikum dalam satu aplikasi." (bodySecondary)
        ├── Section "Pilih peran" (sectionTitle)
        │   └── Two role cards: Praktikan | Asisten
        ├── Section "Pilih identitas" (sectionTitle)
        │   ├── Identity radio rows for the selected role (3 or 2)
        │   └── Helper: "Data ini hanya untuk demonstrasi."
        └── Footer area
            └── Primary button "Masuk" (disabled until valid)
```

**Main information:** Role choices and identity details.

**Primary action:** **Masuk**.

**Secondary interactions:** Select/change role; select identity; read the local-data note.

**States**

| State | Presentation |
| --- | --- |
| Initial | No role selected; identity section shows a short instruction; **Masuk** disabled. |
| Role selected, no identity | Identity rows appear; **Masuk** remains disabled. |
| Valid selection | Selected card/row uses `primarySoft` and primary border; **Masuk** enabled. |
| Invalid submit | Inline message **Pilih peran dan identitas terlebih dahulu**; no navigation. The button should already be disabled, so this is a guard. |
| Return via **Ganti peran** | Current role and identity are preselected; data is not reset. |
| Long names | Rows wrap to two lines; radio and identifier stay aligned. |
| Keyboard open | Scroll content; footer stays reachable; no clipped fields. |

**Navigation:** **Masuk** replaces the route with the selected role home. There is no back action from the initial selection.

**Feedback:** Inline only; no success toast is needed because navigation itself is the confirmation.

---

### 7.7.2 Screen 2 — Praktikan schedule (`/praktikan`)

**Purpose:** See all practicum sessions and enter one.

**Layout hierarchy**

```
Native header: "Jadwal"                        right: "Ganti peran"
Scrollable / FlatList content
├── Greeting row
│   ├── "Halo, Nabila Putri" (screenTitle)
│   └── "2211102034 · IF-3A" (caption)
├── Section row: "Jadwal Praktikum"   "4 sesi"   [Riwayat]
├── Session list (gap 8)
│   └── ScheduleListItem × 4
├── Status legend
└── Bottom padding
```

**Main information:** Session name, date, time, room, class, status.

**Primary action:** Open a session card.

**Secondary interactions:** **Riwayat**; **Ganti peran**.

**States**

- Default: list of four sessions.
- Empty: **Belum ada jadwal** (with explanation). This is not expected with seed data but must be implemented.
- Long content: two-line title, wrapping metadata.
- No loading or error state; data is local and synchronous.

**Navigation:** Card → `/praktikan/session/[sessionId]`; **Riwayat** → `/praktikan/history`; **Ganti peran** → `/`.

---

### 7.7.3 Screen 3 — Praktikan session detail (`/praktikan/session/[sessionId]`)

**Purpose:** Understand the session and record attendance when allowed.

**Layout hierarchy**

```
Native header: "Detail Sesi" (back)
ScrollView
├── SessionCard
│   ├── Title + StatusBadge
│   └── Metadata: date, 08:00–09:40, Lab Mobile 2, Raka Pratama
├── Guidance panel
│   ├── Upcoming: "Presensi belum tersedia."
│   ├── Open: "Presensi tersedia sampai asisten menutup sesi."
│   ├── Closed: "Sesi telah ditutup. Presensi tidak lagi tersedia."
│   └── Recorded: successful attendance message and time
└── Footer
    ├── Primary action (only when open and not recorded)
    │   └── "Catat kehadiran"
    └── Completed panel (when recorded)
        └── "Kehadiran sudah dicatat pukul 08:42"
```

**Main information:** Title, status, schedule, room, assistant, availability, own attendance state.

**Primary action:** **Catat kehadiran** only when `open` and no existing record.

**Secondary interactions:** Back; scroll to read metadata. No management actions.

**States**

| Condition | Footer / action |
| --- | --- |
| `upcoming` | Disabled button **Presensi belum tersedia**; guidance says the asisten has not opened the session. |
| `open`, no record | Enabled primary **Catat kehadiran**. |
| Pending attendance | Button disabled with loading indicator; label remains. |
| `open`, recorded | Non-interactive success panel with recorded time. |
| `closed` | If no record: disabled **Sesi telah ditutup** with guidance. If recorded: success panel remains, guidance confirms it is closed. |
| Error (guard rejects) | Toast/inline error; status is refreshed. |
| Invalid session ID | Full-screen **Sesi tidak ditemukan** and **Kembali ke jadwal**. |
| Long title | Up to three lines; metadata wraps below. |

**Navigation:** Back to schedule. The screen must not expose session-management controls even if the active user is changed via a stale route; the role layout guard handles mismatches.

---

### 7.7.4 Screen 4 — Praktikan attendance history (`/praktikan/history`)

**Purpose:** Verify personal attendance records.

**Layout hierarchy**

```
Native header: "Riwayat Kehadiran" (back)
ScrollView / FlatList
├── Summary: "3 kehadiran" + caption "Hanya menampilkan data Anda."
├── Grouped record list
│   ├── Praktikum Pemrograman Mobile
│   │   Senin, 26 Okt 2026   [Hadir]   08:42
│   └── ...
└── EmptyState when zero records
```

**Main information:** Practicum, session date, status **Hadir**, attendance time.

**Primary action:** Open a record's session detail (optional but useful).

**Secondary interactions:** Back to schedule.

**States**

- Default: records for the active praktikan, newest first.
- Empty: **Belum ada riwayat kehadiran** with guidance.
- Long names: wrap title; keep time/status visible.
- No filtering, sorting controls, or pagination.

**Navigation:** Record → matching `/praktikan/session/[sessionId]`; back returns to schedule.

---

### 7.7.5 Screen 5 — Asisten schedule (`/asisten`)

**Purpose:** Browse sessions and choose one to manage.

**Layout hierarchy**

```
Native header: "Jadwal"                        right: "Ganti peran"
Scrollable / FlatList content
├── Greeting row
│   ├── "Halo, Raka Pratama" (screenTitle)
│   └── "Asisten · 2211101008" (caption)
├── Section row: "Sesi Praktikum"   "4 sesi"
├── Session list (gap 8)
│   └── ScheduleListItem × 4
└── Status legend
```

**Main information:** Session name, class, date, time, room, status.

**Primary action:** Open a session card.

**Secondary interactions:** **Ganti peran**.

**States**

- Default: four sessions.
- Empty: **Belum ada jadwal**.
- All statuses visible with the same `StatusBadge`.
- No session-management action directly in the list; keep the list scannable and prevent accidental status changes.

**Navigation:** Card → `/asisten/session/[sessionId]`; **Ganti peran** → `/`.

---

### 7.7.6 Screen 6 — Asisten session detail / manage session (`/asisten/session/[sessionId]`)

**Purpose:** Manage the attendance window and access the recap.

**Layout hierarchy**

```
Native header: "Kelola Sesi" (back)
ScrollView
├── SessionCard (title + StatusBadge + metadata)
├── Status guidance
│   ├── Belum dibuka: "Buka sesi agar praktikan dapat mencatat kehadiran."
│   ├── Dibuka: "Presensi sedang berlangsung. Tutup sesi untuk menghentikan presensi."
│   └── Ditutup: "Sesi telah ditutup. Rekap tetap dapat dilihat."
└── Footer
    ├── Primary: "Buka sesi" / "Tutup sesi" (depending on status)
    └── Secondary: "Lihat rekap kehadiran" (always)
```

When the session is closed, the recap action becomes the primary footer action and no open/close action is shown.

**Main information:** Session metadata, status, consequence of the current state.

**Primary action:** **Buka sesi** when upcoming; **Tutup sesi** when open; **Lihat rekap kehadiran** when closed.

**Secondary interactions:** **Lihat rekap kehadiran** for upcoming/open; back.

**States**

| Condition | Footer |
| --- | --- |
| `upcoming` | Primary **Buka sesi**; secondary **Lihat rekap kehadiran**. |
| `open` | Primary **Tutup sesi**; secondary **Lihat rekap kehadiran**. |
| `closed` | Primary **Lihat rekap kehadiran**; no management action. |
| Confirm modal open | Footer remains visible but non-interactive behind the modal; modal is the focus. |
| Pending | Confirm disabled with loading; prevent double submission. |
| Success | Badge updates immediately; toast shows; footer swaps to the new state. |
| Error/invalid transition | Error toast/banner; refresh status; do not pretend the action succeeded. |
| Invalid session ID | **Sesi tidak ditemukan** with a back action. |

**Navigation:** Back to asisten schedule. Recap via push. The detail screen uses the same `SessionCard` component as the praktikan screen, not a duplicated layout.

---

### 7.7.7 Screen 7 — Attendance recap (`/asisten/session/[sessionId]/recap`)

**Purpose:** Inspect attendance for one session.

**Layout hierarchy**

```
Native header: "Rekap Kehadiran" (back)
ScrollView / FlatList
├── Summary card
│   ├── Practicum name + StatusBadge
│   └── "Senin, 26 Okt 2026 · 08:00–09:40 · IF-3A"
├── Count row: "2 kehadiran tercatat"
├── Record list (grouped, gap 8)
│   └── AttendanceRecordItem × n
│       Nabila Putri | 2211102034 | [Hadir] | 08:42
└── EmptyState when zero records
```

**Main information:** Session identity, attendee count, name/identifier, status, attendance time.

**Primary action:** Back to session detail.

**Secondary interactions:** None; no filters or export.

**States**

- Records exist: list ordered by attendance time ascending.
- Empty: **Belum ada kehadiran** with "Kehadiran yang dicatat akan muncul di sini." Keep the session summary visible.
- Open or closed: both allowed; the badge reflects current status.
- Long names: wrap name column; NIM and time remain visible.
- No loading state; data is local.

**Navigation:** Back to asisten detail. No praktikan access via route guard.

---

### 7.7.8 Overlays

| Overlay | Content | Dismissal |
| --- | --- | --- |
| Open confirmation | "Buka sesi?" + practicum/date + consequence + **Batal** / **Buka sesi** | Backdrop, Batal, Android back. |
| Close confirmation | "Tutup sesi?" + practicum/date + warning + **Batal** / **Tutup sesi** (destructive) | Backdrop, Batal, Android back. |
| Info bottom sheet | Optional supplementary notes/legend | Backdrop, close, Android back, swipe-down affordance if implemented. |
| Success toast | Short result message | Auto-dismiss 3 s; no action required. |

---

## 7.8 Interaction and Feedback

### Assistant opens a session

1. On an `upcoming` session, the footer primary is **Buka sesi**.
2. Tap opens a centered confirmation modal: **Buka sesi?**, session name/date, "Praktikan dapat mencatat kehadiran setelah sesi dibuka."
3. **Batal** or backdrop dismiss leaves the screen unchanged and returns focus to the trigger.
4. Confirm sets the button to loading, rejects a double tap, and dispatches `openSession`.
5. On success, close the modal, update the badge to **Dibuka**, swap the footer to **Tutup sesi** + recap, and show the toast **Sesi dibuka**.
6. The list screen reflects the status on return because it reads the same provider state.

### Assistant closes a session

1. On an `open` session, the footer primary is **Tutup sesi**; the trigger itself is not filled red.
2. Tap opens **Tutup sesi?** with the session name and "Presensi tidak akan diterima lagi setelah sesi ditutup."
3. Cancel leaves it open.
4. Confirm uses the destructive button, sets pending state, and dispatches `closeSession`.
5. On success, close the modal, update the badge to **Ditutup**, remove management actions, keep **Lihat rekap kehadiran**, and show the toast **Sesi ditutup**.
6. Existing attendance is preserved. The recap remains accessible.

### Praktikan records attendance

1. When `open` and no record exists, show the primary **Catat kehadiran**.
2. Tap immediately sets a pending state; no confirmation modal.
3. The store validates `open` + no duplicate. On success, append a record with the current local time.
4. Replace the footer action with the success panel **Kehadiran sudah dicatat pukul HH:mm**.
5. Show the toast **Kehadiran berhasil dicatat**. The same time appears in history.
6. If the session is no longer open, show the error **Sesi sudah ditutup. Kehadiran tidak dapat dicatat.** and refresh the status; do not create a record.

### Duplicate attendance representation

- The presence of `(sessionId, praktikanId)` is the source of truth.
- The screen shows the success/completed panel rather than an active button. It also displays the recorded time.
- The disabled state must not look like an error. Use the success panel, not a red or gray error button.
- A duplicate attempt is never presented as a new success; the existing time remains.

### Attendance availability messaging

| Session state | Praktikan sees |
| --- | --- |
| `upcoming` | **Belum dibuka** badge; guidance "Asisten belum membuka presensi untuk sesi ini."; disabled button **Presensi belum tersedia**. |
| `open`, no record | **Dibuka** badge; guidance "Presensi tersedia sampai asisten menutup sesi."; enabled **Catat kehadiran**. |
| `open`, recorded | **Dibuka** badge (or status still current); success panel with time. |
| `closed`, no record | **Ditutup** badge; guidance "Sesi telah ditutup. Presensi tidak lagi tersedia."; disabled **Sesi telah ditutup**. |
| `closed`, recorded | **Ditutup** badge; success panel remains; guidance confirms attendance is already recorded. |

### Modal versus bottom sheet

| Need | Pattern | Reason |
| --- | --- | --- |
| Open/close confirmation | Centered confirmation modal | Consequential, short, requires an explicit decision. |
| Result of attendance/open/close | Toast + inline state | Non-blocking, immediate, keeps context. |
| Supplementary info or status legend | Optional informational bottom sheet | Browsing context, dismissible, does not require a decision. |
| Form or identity selection | Full screen | Needs space, validation, and a clear entry action. |
| Errors | Inline text or toast | Contextual and non-blocking; do not use an OS alert for routine validation. |

### Dismissal rules

- **Batal**, backdrop, and Android back dismiss confirmation modals. All count as cancel.
- The sheet closes via backdrop, close button, Android back, or an implemented swipe-down gesture.
- Toasts auto-dismiss and never trap focus; users can continue interacting.
- Changing role closes any overlay before navigation. A stale success toast must not appear over the new role's screen.
- Never dismiss a modal automatically after a state change without showing the result; close it only after the state update and feedback are scheduled.

### Feedback principles

- Success: green check + concise message + the changed value (time/status).
- Error: plain-language explanation + what to do next; red for the error indicator, not for the entire screen.
- Disabled: label explains why; pair with a guidance line.
- Pending: disable repeated actions and show a small spinner; do not change layout width.
- No silent actions. No OS alerts for success or routine validation. No confetti or celebratory animation.

---

## 7.9 UI Consistency and Anti-Patterns

### Must follow

- **One token source.** All colors, spacing, radii, and font sizes come from `src/constants/theme.ts` or a centralized extension. No raw hex values in screen files.
- **One button system.** Use `AppButton` variants. Do not create role-specific button styles.
- **One badge system.** Use `StatusBadge` for all session states. Do not hand-build status pills.
- **One card language.** Cards use the same border, radius, padding, and background. Do not mix 8, 12, 16, and 20 px radii for similar cards.
- **One layout shell.** Same screen padding, max width, and footer pattern across screens.
- **Clear labels.** Text is preferred over ambiguous icons. Icons are supplementary.
- **Status always visible.** Never hide the session status behind a tap or rely on color alone.
- **One primary action per screen.** Do not stack two filled primary buttons.
- **Consistent role language.** Use the same terms everywhere: **Praktikan**, **Asisten**, **Sesi**, **Presensi**, **Kehadiran**, **Rekap Kehadiran**, **Riwayat Kehadiran**, **Belum dibuka**, **Dibuka**, **Ditutup**.
- **Reusable components across roles.** The schedule list, session card, badge, empty state, and modal are shared. Role-specific screens compose them rather than forking them.
- **Honest states.** Do not show a fake loading spinner for synchronous local data. Do not show attendance as available when the status is not `open`.
- **Respect safe areas and touch targets.** Minimum 44×44; footer actions clear of the home indicator.
- **Test long content.** Long names/titles are the default test case, not an afterthought.

### Avoid

- Gradients, glassmorphism, neon colors, glow, or decorative blobs.
- Excessive pill shapes: badges are 6 px rounded rectangles, not capsules; buttons are 12 px rounded.
- Giant hero sections and marketing illustrations in a utility flow.
- Dense dashboards, charts, statistics cards, calendars, or bottom tab bars.
- Multiple accent colors or a different palette per role. Both roles use the same blue accent.
- Red for closed sessions, disabled states, or ordinary errors in copy. Red is for destructive actions/errors only.
- Shadows on cards, double borders, or nested cards.
- Floating action buttons (FABs) for attendance or session management.
- Icon-only header actions, especially for **Ganti peran**.
- Truncating the status label, attendance time, or identifier.
- Alert dialogs for every interaction.
- Animating list items or adding unnecessary transitions.
- Adding a UI library or icon library to achieve this design. Use existing modules and React Native primitives.
- Duplicating whole screens for praktikan and asisten when a shared component or data selector is enough.
- Promising server sync, real authentication, or persistence anywhere in the UI.

### Copy rules

- Use sentence case and direct language.
- Prefer "Catat kehadiran" over "Absen" for the action; use "Kehadiran" for the record.
- Do not say "Login" or "Akun" because there is no real authentication.
- Use "Ganti peran" consistently, not "Logout" or "Switch user".
- Time format `HH:mm` (for example, `08:42`). Date format `Senin, 26 Okt 2026`.
- Empty states should say what will appear and, when useful, what to do next.

---

## 7.10 Implementation Notes

### Token implementation

Extend the existing `src/constants/theme.ts` rather than creating a parallel theme system:

```ts
export const Colors = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F3F6',
    surfacePressed: '#E8ECF1',
    textPrimary: '#111827',
    textSecondary: '#5B6472',
    textTertiary: '#6B7480',
    border: '#DDE2E8',
    borderStrong: '#C6CDD6',
    primary: '#2563EB',
    primaryPressed: '#1D4ED8',
    primarySoft: '#EAF1FF',
    onPrimary: '#FFFFFF',
    secondary: '#475569',
    success: '#15803D',
    successSoft: '#E8F6EC',
    warning: '#9A4A08',
    warningSoft: '#FFF3E3',
    error: '#B91C1C',
    errorSoft: '#FDECEC',
    disabledBg: '#E5E7EB',
    disabledText: '#7A8492',
    focusRing: '#93B4F8',
  },
  dark: {
    background: '#0E1116',
    surface: '#171B21',
    surfaceSubtle: '#21262E',
    surfacePressed: '#2A3039',
    textPrimary: '#F3F5F8',
    textSecondary: '#A7B0BD',
    textTertiary: '#9099A6',
    border: '#2A303A',
    borderStrong: '#3B4450',
    primary: '#7AA6FF',
    primaryPressed: '#5F91F2',
    primarySoft: '#182744',
    onPrimary: '#08111F',
    secondary: '#CBD5E1',
    success: '#6DDB95',
    successSoft: '#122C1D',
    warning: '#F0B36A',
    warningSoft: '#332612',
    error: '#FF9A9A',
    errorSoft: '#361A1A',
    disabledBg: '#252A32',
    disabledText: '#7F8895',
    focusRing: '#4C7FE0',
  },
} as const;
```

- Keep the existing `useTheme` hook and `useColorScheme` behavior. The starter already follows the system color scheme (`app.json` has `userInterfaceStyle: "automatic"`).
- The current `Colors` object uses `text`, `background`, `backgroundElement`, `backgroundSelected`, and `textSecondary`. Keep those keys as aliases during migration, or update `ThemedText`/`ThemedView` and all starter usages at the same time. Do not leave two parallel color systems in the final app.
- Add `Typography`, `Radius`, `Control`, and layout constants next to `Spacing`. Preserve existing spacing values to avoid churn in starter components.
- `ThemedText` and `ThemedView` can remain, but extend `ThemedText` with the typography variants above. Do not maintain a second typography scale in screens.
- Use semantic token names in components. Screens should not import raw palette values.

### Suggested component files

| File | Contents |
| --- | --- |
| `src/components/ui/app-button.tsx` | `AppButton` with primary/secondary/destructive, loading, disabled. |
| `src/components/ui/text-input.tsx` | Labeled input for any form; not required for the main flow's selection controls. |
| `src/components/ui/role-card.tsx` | Role selection card. |
| `src/components/ui/identity-row.tsx` | Radio-style identity row. |
| `src/components/ui/status-badge.tsx` | Session status badge. |
| `src/components/ui/empty-state.tsx` | Shared empty state. |
| `src/components/ui/confirm-modal.tsx` | Confirmation modal with pending state. |
| `src/components/ui/info-sheet.tsx` | Optional informational bottom sheet. |
| `src/components/ui/toast.tsx` | In-app success/error toast. |
| `src/components/attendance/schedule-list-item.tsx` | Session list card. |
| `src/components/attendance/session-card.tsx` | Detail summary card. |
| `src/components/attendance/attendance-record-item.tsx` | Recap/history row. |
| `src/components/attendance/status-legend.tsx` | Compact status legend. |

### State implementation

- Create `src/store/demo-data-context.tsx` with `useReducer` and a typed action union.
- Seed data in `src/data/dummy-data.ts`; domain types in `src/types/attendance.ts`.
- Wrap the root Stack in the provider in `src/app/_layout.tsx`.
- Keep `activeRole`/`activeUserId` in the same provider so role switching re-renders both list/detail selectors consistently.
- Do not use AsyncStorage, a database, or a state library. State resets on reload by design.
- Enforce guards in the reducer:
  - `open` only from `upcoming`.
  - `close` only from `open`.
  - attendance only when `open` and no `(sessionId, praktikanId)` exists.
- Use `useMemo` for derived lists (session + practicum + assistant display models) and `useCallback` for handlers where it keeps the code clear. Do not prematurely optimize.

### Navigation implementation

- Replace the starter `NativeTabs` component with Expo Router Stack layouts.
- Use typed routes (already enabled in `app.json`).
- Route params are strings; resolve `sessionId` and render a not-found state if no session matches.
- Role layouts should use a `Redirect` to `/` when `activeUserId` is missing, and to the correct role home when the role does not match.
- The current `explore.tsx` and starter home content are examples only; they are outside the target app and should be removed or replaced during implementation.
- Keep route files thin: data lookup, screen-level UI state, and composition of reusable components. Put layout logic in components/helpers.

### Platform and accessibility

- Use `react-native-safe-area-context` (installed) for insets.
- Use React Native `Modal` with `transparent`, `animationType`, and `onRequestClose`.
- Use `Pressable` for cards/buttons and `FlatList` for lists.
- Use `ActivityIndicator` for pending states.
- Icons: use `expo-symbols` only with a clear label or as supplementary decoration. If a symbol is unavailable on a platform, the text label must still communicate the meaning. Do not add an icon package.
- Accessibility:
  - `accessibilityRole="button"` for pressables.
  - `accessibilityState={{ disabled, busy, selected }}` as appropriate.
  - Session cards: label includes practicum, date, time, and status.
  - Status badge: accessible label includes the text ("Status sesi: Dibuka").
  - Toast: announce without stealing focus.
  - Modal: `accessibilityViewIsModal`, focus title, restore focus.
  - Test with system font scaling and a screen reader where available.
- Web: center content at 560 px, ensure focus outlines are visible, and avoid hover-only behavior. The app is mobile-first, but `npm run web` must remain usable.

### Verification checklist for implementation

- [ ] Every screen uses the same background, padding, and content max width.
- [ ] Every session status is rendered through `StatusBadge`.
- [ ] All button styles come from `AppButton`; no raw button styling in screens.
- [ ] Confirmation modals are used for open and close; attendance uses a toast + success panel.
- [ ] The attendance action becomes a success panel after recording and cannot be triggered twice.
- [ ] Closed sessions are neutral, not red; destructive red is limited to the close confirmation.
- [ ] Long practicum/student names do not break layout at 360 px.
- [ ] Footer actions remain reachable above safe areas; role selection handles the keyboard.
- [ ] No new dependencies were added for UI, icons, state, or persistence.
- [ ] Typecheck and lint pass.

---

## Cross-Document Consistency

| Decision | PRD reference | Design reference | README reference |
| --- | --- | --- | --- |
| Roles: Praktikan and Asisten | §6.1, §6.3 | §7.5, §7.7 | Supported Roles |
| Session states `upcoming` / `open` / `closed` | §6.7 | §7.3.1, §7.6.6 | Dummy Data and Local State |
| Shared in-memory demo state, reset on reload | §6.7 | §7.10 | Dummy Data and Local State |
| Attendance once per `(sessionId, praktikanId)` | §6.4 FR-07 | §7.8 | Dummy Data and Local State |
| Open/close confirmation modal | §6.4 FR-04/05/10 | §7.6.10, §7.8 | Demonstrating the Main Flow |
| Attendance success toast + completed state | §6.4 FR-06/10 | §7.6.12/13, §7.8 | Demonstrating the Main Flow |
| Route structure | §6.6 | §7.5 | Project Structure |
| Seed identities and sessions | §6.7 | §7.7 | Dummy Data and Local State |
| No backend, auth, or persistence | Non-goals, §6.9 | §7.9, §7.10 | Current Limitations |
