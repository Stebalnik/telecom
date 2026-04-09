# Frontend Standard

This document defines frontend architecture and implementation rules.

UI/UX decisions are defined in:

- `ui_design_rules.md`

This document combines:

- frontend architecture
- component rules
- page structure
- interaction rules
- analytics-aware frontend behavior
- error handling behavior

It should be used as the default source of truth for frontend work.

IMPORTANT:

This file defines frontend architecture, UI behavior, component patterns, and presentation.

It must not override:

- backend logic
- database rules
- authentication rules
- business rules

---

# 1. Frontend Philosophy

Frontend must be:

- clear
- fast
- operational
- scalable
- easy to maintain
- calm for users
- observable in a practical way

The product is a B2B workflow platform, not a decorative marketing site.

Observability matters, but frontend must not create noise, false alarms, or UX degradation in the name of logging.

---

# 2. Framework Standard

Framework:

- Next.js App Router

Core structure:

- `app/`
- `components/`
- `lib/`

---

# 3. Folder Standard

## `app/`

Used for:

- routes
- layouts
- page composition

## `components/`

Used for:

- reusable UI blocks
- shared layout parts
- shared states
- shared view-level pieces

## `lib/`

Used for:

- helpers
- analytics
- error handling
- utilities
- shared domain logic

---

# 4. Route Structure Standard

## Public routes

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/terms`
- `/mission`

## Protected routes

- `/dashboard`
- `/customer`
- `/contractor`
- `/admin`

Protected routes must not expose authenticated UI without valid session and role checks.

---

# 5. Layout Standard

Use layered layouts:

- root layout → global config
- app layout → dashboard shell
- role layouts → role-specific UI

Layouts must stay predictable and consistent across the platform.

---

# 6. Navigation Standard

Navigation must be:

- predictable
- consistent
- centralized

Do not scatter role navigation logic and link definitions across many files when a shared pattern is possible.

---

# 7. Authentication Frontend Standard

Frontend auth behavior must:

- check session
- redirect properly
- avoid showing protected UI to unauthenticated users
- avoid showing the wrong role workspace
- fail calmly when session is missing or expired

Users should see safe messages, not auth internals.

---

# 8. API Communication Standard

Preferred pattern:

- use API routes for business actions
- avoid direct DB writes from frontend unless explicitly intended and safe
- keep client behavior thin when server/API orchestration is more reliable

Important:

For direct Supabase usage in frontend, error handling must follow shared standards and must not leak raw backend errors.

---

# 9. UI System Standard

Frontend must use a clean enterprise UI with:

- strong hierarchy
- minimal clutter
- readable states
- consistent spacing
- predictable actions

Design choices belong in `ui_design_rules.md`.
This document defines implementation behavior, not visual taste.

---

# 10. Component Standard

Use reusable components and patterns for:

- buttons
- cards
- inputs
- state blocks
- loading states
- empty states
- error states where appropriate

Do not rebuild the same interaction pattern differently in multiple places without reason.

---

# 11. Page Pattern Standard

Prefer structured page types:

- dashboard
- list
- detail
- form
- admin

Pages must be easy to scan and operationally clear.

---

# 12. Form Standard

Forms must be:

- structured
- resilient
- clear
- safe
- calm in failure states

Every important form should:

- validate clearly
- show loading state
- show safe error feedback when the action truly fails
- avoid technical or contradictory messages

---

# 13. Interaction Standard

Every important primary action should have:

- loading
- success path
- error path

But not every action needs visible feedback for every minor failure.

Important distinction:

## Primary actions

Examples:

- login
- signup
- role selection
- onboarding submit
- save profile
- create job
- submit bid
- approve/reject
- checkout

These require explicit and calm handling.

## Secondary actions

Examples:

- badge loads
- passive refreshes
- analytics
- counters
- optional summaries

These should usually fail softly without noisy UI.

---

# 14. Analytics Standard

Use:

- `lib/track.ts`

Rules:

- only meaningful events
- usually after success, not before
- centralized
- non-blocking
- must never break primary flows
- must not create admin noise for transient network failure

Analytics failures should usually be ignored in frontend UX.

Do not treat analytics transport failures as user-facing errors.

---

# 15. Error Logging Standard

Use:

- `lib/logError.ts`

Log only operationally meaningful failures.

Must usually log:

- failed primary actions
- failed primary page loads
- failed admin business actions
- failed API-backed operations that block progress
- unexpected exceptions

Do NOT log as admin errors by default:

- analytics request failures
- sidebar badge fetch failures
- optional summary fetch failures
- passive background refresh failures
- transient `Failed to fetch`
- secondary UI degradation that safely falls back

Rules:

- structured logs
- sanitized data
- no secrets
- non-blocking
- high signal, low noise

---

# 15A. Shared Error Handling Helpers Standard

Frontend error handling must use shared helpers.

Required helpers:

- `lib/logError.ts`
- `lib/errors/normalizeError.ts`
- `lib/errors/unwrapSupabase.ts`
- `lib/errors/withErrorLogging.ts`

Rules:

- direct raw Supabase errors must not cross layer boundaries
- repeated `if (error) throw error` should be replaced with shared helpers where practical
- repeated manual `logError(...)` blocks should be replaced with `withErrorLogging(...)` where practical
- important async failures should be logged
- user-facing messages must stay safe and non-technical
- logging must be non-blocking
- no sensitive data in logs

Important refinement:

- `withErrorLogging(...)` is for important operational failures
- it should not be used automatically for every secondary widget fetch
- fail-soft secondary UI should usually avoid `error_logs`

## Client page pattern

Typical primary flow:

- action
- `withErrorLogging(...)`
- local `catch` only for user-facing UI state such as `setErr(...)`

Purpose of helpers:

- reduce duplication
- standardize logging shape
- standardize normalization
- prevent missing logs on important flows
- keep UI code clean

The goal is NOT to eliminate `catch` entirely.
The goal is to eliminate duplicated logging and normalization logic.

---

# 16. Error Handling UX Standard

## User

User-facing errors must be:

- calm
- short
- non-technical
- only shown when the user action actually failed

Good:

- "Unable to save your changes."
- "Something went wrong. Please try again."
- "Your session has expired. Please log in again."

Bad:

- raw DB errors
- raw Supabase errors
- stack traces
- contradictory messages after success

## Admin

Admin should have rich operational visibility for real failures.

But admin visibility must stay clean.

Noise reduces usefulness.

## UI guidance

Use error UI only when helpful.

Possible patterns:

- inline safe error text
- retry option where appropriate
- quiet fallback for secondary UI

Do not force a visible error state for every non-critical request.

---

# 17. Observability Standard

Frontend should be observable in a practical way.

This means:

- important failures are logged
- critical actions are trackable
- admin can inspect real system problems
- false alarms are minimized

The system must avoid two extremes:

- silent failure for important business flows
- noisy over-logging for harmless UI/network events

Noisy observability is bad observability.

---

# 18. Minimal Feature Pattern

For a primary feature:

- render
- input
- action
- success path
- optional tracking after success
- safe error handling for true failure

Preferred pattern:

- success → track
- primary failure → log and show safe message
- secondary failure → fail soft

Do not default every fetch failure to `logError(...)`.

---

# 19. Clean Code Standard

Frontend code must avoid:

- duplication
- scattered action logic
- repeated logging boilerplate
- inline hacks
- overcomplicated defensive code for simple UI
- noisy instrumentation patterns

Prefer simple, repeatable patterns.

---

# 20. Performance Standard

Frontend must be:

- fast
- lightweight
- minimally blocking

Secondary fetches, analytics, counters, and admin badges must not degrade responsiveness of primary user flows.

---

# 21. Responsiveness Standard

Frontend must work across supported devices and screen sizes.

Responsive behavior must not break:

- login
- onboarding
- forms
- approvals
- navigation
- dashboard workflows

---

# 22. Consistency Standard

Same meaning must produce same UI behavior.

Examples:

- same kind of save failure → same kind of calm error message
- same kind of passive widget failure → same kind of quiet fallback
- same kind of loading → same kind of loading treatment

Do not mix noisy and quiet patterns inconsistently.

---

# 23. Admin UX Standard

Admin must be able to:

- see real unresolved errors
- understand current system state
- act on issues

Admin UI is an operational control panel.

That means admin surfaces must prioritize:

- signal over noise
- grouped failures over repeated fetch spam
- meaningful operational visibility over low-value technical chatter

## 23A. Frontend Error Boundary Rule

No raw Supabase or database-style error may be shown to the user.

Good:

- "Unable to save your changes."
- "Something went wrong. Please try again."

Bad:

- "duplicate key value violates unique constraint ..."
- "row-level security policy violation ..."
- raw stack traces

## 23B. Admin Sidebar and Dashboard Widget Rule

Admin sidebar and similar widgets are secondary UI.

Failures in these surfaces must usually:

- fall back quietly
- avoid user-facing alerts
- avoid writing to `error_logs`
- retry later on focus, interval, visibility change, or manual refresh

Badge and summary widgets must not flood the admin error system.

---

# 24. Supabase Frontend Rule

When using Supabase results directly in frontend:

- use `unwrapSupabase(...)` for reads that must return data
- use `unwrapSupabaseNullable(...)` for nullable reads such as `maybeSingle()`
- do not use `unwrapSupabase(...)` for writes unless `.select()` is used and returned data is truly required

Reason:

Supabase write operations often succeed with `data = null`.

Treating that as failure creates false UI errors and false admin logs.

Good:

```ts
const result = await supabase.from("profiles").upsert(payload);

if (result.error) {
  throw normalizeError(result.error, "create_profile_failed");
}

Good:

const result = await supabase
  .from("contractor_companies")
  .insert(payload)
  .select("*")
  .single();

return unwrapSupabase(result, "create_company_failed");

Bad:

const result = await supabase.from("profiles").upsert(payload);
unwrapSupabase(result, "create_profile_failed");
25. Final Rule

Frontend must be:

clean
centralized
calm
scalable
production-ready

Default system:

shared UI
shared analytics
shared error handling
API-first behavior where appropriate
fail-soft secondary UI
high-signal admin visibility

Do not invent new patterns.

Build everything from this system by default.

When unsure:

protect the user experience first
avoid technical UI messages
log only what is operationally meaningful
keep analytics and secondary UI non-blocking
prefer signal over noise
