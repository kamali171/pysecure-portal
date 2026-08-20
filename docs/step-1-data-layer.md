# Step 1 — Architecture & Data Layer Foundation

Status: **design + scaffolding only, not wired into the running app.**
No route, no visual output, and no existing behaviour changed.

## Current architecture (before this step)

- Framework: TanStack Start (React 19, file-based TanStack Router), Vite/Nitro build.
- State management: none — routes call synchronous functions in `src/lib/pysecure.ts`
  that read/write `window.localStorage` directly. `@tanstack/react-query` is installed
  and provided at the root but unused.
- Database/backend: none. `localStorage` is the only persistence — single browser,
  single device, unencrypted, editable via devtools.
- Auth: plaintext password equality in `pysecure.ts`; faculty/admin are two hardcoded
  demo accounts shipped in the client bundle; session is an unsigned object in
  `localStorage`.
- Data models: one flat set of types in `pysecure.ts` (`Student`, `Test`, `Question`,
  `Result`, `Violation`, `Submission`, `EditHistoryEntry`) with no explicit
  foreign-key discipline, no audit timestamps, and no separation between an
  in-progress attempt and its graded result.

## What was missing

1. No `Faculty` / `Admin` entities — just hardcoded credentials.
2. No `TestAttempt` — an attempt-in-progress and its graded `Result` were conflated.
3. No first-class `Answer` entity — the existing `Submission` type is defined in
   `pysecure.ts` but never actually written anywhere in the app.
4. No `ExamAnalytics` aggregate — analytics were computed ad hoc inline in components.
5. No distinction between a real violation and a simulated one — `type: string` was
   freeform, so a `Math.random()` fake and a real browser-event violation were
   indistinguishable in storage.
6. No repository abstraction — every component talked to `localStorage` directly,
   so swapping to a real database would mean touching every route file.

## Hardcoded / simulated / random data found (unchanged by this step, listed for tracking)

| Location | What | Nature |
|---|---|---|
| `src/lib/pysecure.ts` `DEMO_ACCOUNTS` | faculty/admin login | hardcoded credentials |
| `src/routes/dashboard.tsx` chart fallback | `[62,71,78,85]` | fabricated when no results exist |
| `src/routes/results.tsx` `topics.map` | `[78,64,88,71,59][i%5]` | hardcoded, not computed from real answers |
| `src/routes/exam.live.tsx` webcam interval | `Math.random() < 0.12` | fully simulated face/phone/gaze detection |
| `src/routes/proctor.tsx` | `face_detected: 1 · phone: 0 · gaze: centre` + "Simulate detection" button | hardcoded overlay + fake violation generator |
| `src/lib/pysecure.ts` `runPython()` | heuristic string check | simulated judge, not real execution |

These are **not touched in Step 1**. They're listed here so later steps can be
checked off against this list instead of re-discovering them.

## What Step 1 adds

### `src/lib/models.ts`
Production-ready entity types for every domain requested: `Student`, `Faculty`,
`Admin`, `Exam`, `Question`, `TestAttempt`, `Answer`, `Result`, `Violation`,
`MonitoringEvent`, `ExamAnalytics`. Every entity has `id` + `createdAt` + `updatedAt`.
Relationships are explicit foreign-key id fields rather than nested objects, matching
how they'd map onto relational tables later.

Notably: `Violation.source` is a required field
(`"browser_event" | "vision_model" | "manual_review"`). This is the concrete fix for
"don't add fake/random monitoring data" at the model level — a violation can never be
recorded without declaring where it actually came from, so a future `Math.random()`
placeholder can no longer be silently indistinguishable from a real detection.

### `src/lib/repositories/types.ts`
Promise-based repository interfaces (`StudentRepository`, `ExamRepository`, etc.).
Every method is `async` even though the only implementation today is synchronous
under the hood — so a real database client can be dropped in later as a new
implementation of the same interfaces, with zero changes to any calling code.

### `src/lib/repositories/local-storage.ts`
A `localStorage`-backed implementation of every interface, proving the seam works
end to end. It uses a **separate storage namespace** (`pysecure.v2.*`) from the
app's live data (`pysecure.*`), so it cannot collide with or corrupt anything the
running app currently depends on.

### `src/lib/repositories/index.ts`
Barrel export. Nothing in the app imports from it yet.

## What Step 1 deliberately does NOT do

- Does not touch `src/lib/pysecure.ts` or any route/component — the running app's
  behaviour is unchanged.
- Does not implement a real database — network access in this environment can't
  provision one, and the instruction was to prepare the architecture, not connect
  a live backend yet.
- Does not implement SEB changes, webcam AI detection, or any monitoring data.
- Does not change any visual design.

## Migration note for later steps

The new model's field names differ from the current live shapes in a few places
(e.g. `passwordHash` vs. `password`, `registerNumber` vs. `regNo`, `photoUrl` vs.
`photo`). When routes are actually migrated onto the repository layer, existing
`localStorage` data under the `pysecure.*` keys will need a one-time migration
pass — it will not be read automatically by the new `pysecure.v2.*`-namespaced
repositories.
