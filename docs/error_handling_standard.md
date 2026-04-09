# Error Handling Standard

This document defines the required error handling system for the platform.

Its purpose is to make the product:

- reliable
- calm for users
- observable for admins
- easy to debug
- easy to maintain
- easy to scale

This standard applies to:

- frontend pages
- frontend components
- shared client helpers
- API routes
- server-side helpers
- Supabase data access helpers
- admin operational surfaces

This document extends:

- frontend_standard.md
- backend_rules.md
- security_rules.md

It does NOT replace business rules, database rules, or authorization rules.

---

# 1. Purpose

Error handling is not only about showing a message.

It must ensure that:

- users see safe, calm, non-technical feedback
- admins get structured operational visibility for real failures
- developers do not duplicate error logic everywhere
- important failures are logged consistently
- sensitive data is never exposed in UI or logs
- similar failures are grouped and diagnosable
- secondary UI issues do not create operational noise

The platform must not depend on raw exceptions, noisy logs, or user-facing technical errors.

---

# 2. Core Principles

## 2.1 No raw backend errors in UI

Users must never see:

- raw Supabase messages
- raw Postgres errors
- stack traces
- internal system details
- RLS or permission internals

Good:

- "Something went wrong. Please try again."
- "Unable to save your changes."
- "Your session has expired. Please log in again."

Bad:

- "duplicate key value violates unique constraint ..."
- "new row violates row-level security policy ..."
- "permission denied for table ..."
- raw stack traces

## 2.2 No raw Supabase error may cross a layer boundary

Supabase and database errors must be normalized before they leave the layer where they occur.

Meaning:

- lib/* helpers must not throw raw Supabase errors outward
- API routes must not return raw backend errors to clients
- pages must not display raw DB error strings

## 2.3 Logging must be centralized

Logging must go through shared helpers.

Never insert into `error_logs` inline from random files.

## 2.4 Logging must be non-blocking

Logging must never break UX.

If logging fails:

- the user flow must continue safely
- the UI must remain usable
- the original business flow must not crash because logging failed

## 2.5 Log real failures, not UI noise

The system must log real operational failures.

The system must NOT flood admin logs with:

- transient fetch failures during dev reload
- optional analytics failures
- retryable sidebar badge loads
- background refresh failures for secondary widgets
- expected empty states
- harmless fail-soft UI degradation

This is critical.

Excessive logging reduces signal quality, wastes admin attention, and creates false alarms.

## 2.6 Secondary UI must fail soft

Not every failed request is a product error.

If a request powers only secondary UI such as:

- sidebar badges
- dashboard counters
- optional analytics
- non-critical summaries
- passive refreshes
- decorative or convenience widgets

then the UI should usually:

- fall back to `0`, empty, or hidden state
- avoid user-facing error banners
- avoid writing to `error_logs`
- retry later if appropriate

## 2.7 Primary user flows must stay calm

For core flows such as:

- login
- signup
- role selection
- onboarding submit
- job creation
- bid submit
- approvals
- checkout
- document upload
- profile save

the platform must:

- log real failures
- show safe user feedback
- avoid technical language
- avoid duplicate or contradictory messages
- avoid reporting failure if the action already succeeded

## 2.8 Error handling must reduce duplication

Do not repeat the same try/catch/log/normalize pattern in every file.

Use shared helpers.

---

# 3. Required Helpers

These helpers are part of the standard system.

## 3.1 Client logging helper

Required:

- `lib/logError.ts`

Purpose:

- send structured client-side errors to `/api/errors/log`

## 3.2 Server logging helper

Required:

- `lib/server/logServerError.ts`

Purpose:

- write structured server/API errors into `error_logs`

## 3.3 Error normalization helper

Required:

- `lib/errors/normalizeError.ts`

Purpose:

- convert raw unknown errors into a stable app error shape

## 3.4 Supabase unwrap helper

Required:

- `lib/errors/unwrapSupabase.ts`

Purpose:

- remove repeated `if (error) throw ...`
- normalize Supabase result errors consistently

## 3.5 Client wrapper helper

Required:

- `lib/errors/withErrorLogging.ts`

Purpose:

- wrap async client operations
- auto-normalize
- auto-log when the failure is operationally important
- rethrow normalized errors

## 3.6 Server wrapper helper

Required:

- `lib/errors/withServerErrorLogging.ts`

Purpose:

- wrap async server/API operations
- auto-normalize
- auto-log when the failure is operationally important
- rethrow normalized errors

---

# 4. Standard Error Shape

Normalized application errors should follow this shape:

```ts
type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

Rules:

message must be safe enough for internal use, not necessarily for direct UI display
code must be stable
details may contain safe structured debugging context
statusCode is optional and mainly useful for API/server logic
5. Error Code Rules

Error codes must be:

stable
short
predictable
lowercase snake_case

Good:

login_failed
signup_failed
dashboard_load_failed
create_profile_duplicate
contractor_onboarding_submit_failed
admin_errors_load_failed

Bad:

Error loading profile 2
supabase_failed
bad_error
dynamic codes like submit_bid_job_123
5.1 Code naming pattern

Preferred pattern:

action + outcome

Examples:

get_profile_failed
create_profile_duplicate
load_jobs_failed
approve_doc_failed
admin_feedback_load_failed
5.2 Dynamic data must go into details

Do not put IDs or runtime data into the code.

Good:

code: "submit_bid_failed",
details: { jobId: "..." }

Bad:

code: "submit_bid_job_123_failed"
6. Layer Rules
6.1 In lib/* data helpers

Use:

normalizeError
unwrapSupabase
unwrapSupabaseNullable

Purpose:

normalize raw DB/auth/Supabase errors
keep shared logic clean
prevent raw errors from leaking upward

Good:

const result = await supabase.from("profiles").select("*").maybeSingle();
return unwrapSupabaseNullable(result, "get_profile_failed");

Bad:

const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
if (error) throw error;
return data;
6.2 Important rule for write operations

Do NOT use unwrapSupabase(...) for update, upsert, or insert operations unless you explicitly called .select(...) and truly require returned row data.

Reason:

Supabase write operations often succeed with data = null
treating data = null as failure creates false errors
this leads to broken UX, duplicate actions, and noisy logs

Good:

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
return unwrapSupabase(result, "create_profile_failed");
6.3 In client pages/components

Use:

withErrorLogging
or logError directly only when wrapping is not practical

Client pages still usually need catch for UI behavior.

The purpose of the helper is not to remove catch entirely.
The purpose is to remove repeated manual logging logic inside every catch.

Good:

try {
  await withErrorLogging(
    () => submitBid(payload),
    {
      message: "submit_bid_failed",
      code: "submit_bid_failed",
      source: "frontend",
      area: "bids",
      path: "/contractor/jobs/123",
      role: "contractor",
      details: { jobId: payload.jobId },
    }
  );

  router.push("/contractor/bids");
} catch {
  setErr("Unable to submit bid. Please try again.");
}

Bad:

try {
  await submitBid(payload);
} catch (e: any) {
  await logError("submit_bid_failed", {
    source: "frontend",
    area: "bids",
    path: "/contractor/jobs/123",
    code: "submit_bid_failed",
    details: {
      message: e?.message,
      originalCode: e?.code,
      originalDetails: e?.details,
    },
  });

  setErr(e.message);
}
6.4 In API routes and server logic

Use:

withServerErrorLogging
or logServerError directly when needed

API routes still need catch to return safe NextResponse.

Good:

try {
  const result = await withServerErrorLogging(
    async () => {
      return { ok: true };
    },
    {
      message: "create_job_failed",
      code: "create_job_failed",
      source: "api",
      area: "jobs",
      path: "/api/jobs",
    }
  );

  return NextResponse.json(result);
} catch {
  return NextResponse.json(
    { error: "Unable to create job." },
    { status: 500 }
  );
}

Bad:

try {
  // action
} catch (e: any) {
  return NextResponse.json(
    { error: e.message },
    { status: 500 }
  );
}
7. What Must Be Logged

Logging is required for:

failed primary page loads
failed primary form submissions
failed auth flows
failed onboarding submissions
failed job, bid, document, approval, checkout, and admin actions
failed API calls that represent real business operations
unexpected exceptions in server routes
important server/db failures
repeated failures that block user progress

Logging is NOT required for:

expected validation messages before any write
optional analytics request failures
secondary badge/counter/summary fetch failures
background refresh failures for non-critical widgets
temporary Failed to fetch during dev reload or route transition
intentionally canceled user actions
empty states
missing optional data that is handled safely

If uncertain, ask:

did this block a real user/admin action?
does admin need to investigate this?
does this indicate a real product problem, not just a transient UI/network blip?

If the answer is no, do not log it to error_logs.

8. Required Logging Fields

Every logged error should include as much safe context as possible.

Preferred fields:

message
code
source
area
path
role
level
statusCode
details
8.1 source

Allowed values:

frontend
api
db
auth
server
admin
8.2 level

Allowed values:

info
warning
error
critical

Default:

error

Important guidance:

use warning for non-blocking operational issues worth observing
use error only when a real action failed
do not use error for harmless sidebar or analytics noise
8.3 area

Use stable product areas such as:

auth
admin
customer
contractor
jobs
bids
documents
checkout
analytics
9. Security Rules for Error Handling

Logging must follow security_rules.md.

Never log:

passwords
tokens
API keys
service role keys
session secrets
full bank account numbers
routing/account numbers
full card numbers
CVV/CVC
raw payment payloads
raw authorization headers

Allowed safe context:

user_id
role
path
action name
safe business IDs
safe status values
safe metadata
9.1 Sanitize before writing

All logging helpers must sanitize details before persistence.

9.2 Do not expose internals to UI

UI must never display:

raw DB messages
stack traces
SQL details
RLS/policy internals
table/column internals unless explicitly intended for admin-only internal tools
10. User Experience Rules
10.1 User-facing messages must be calm

Good:

"Unable to save your changes."
"Something went wrong. Please try again."
"Your session has expired. Please log in again."

Bad:

"duplicate key value violates unique constraint ..."
"RLS check failed"
"insert into profiles failed"
10.2 Do not overload users with secondary errors

Do not show banners or alerts for:

failed badge refresh
failed analytics tracking
optional summary fetch failures
passive background refreshes

In these cases, the UI should stay calm and continue working.

10.3 Admin-facing visibility must be rich but clean

Admin must be able to:

see unresolved real errors
filter by source/area/level
inspect details
group by fingerprint
mark resolved
track recurring failures

But admin logs must stay high-signal.

Noise must be filtered out before it reaches error_logs.

11. Special Rules for Analytics and Secondary UI
11.1 Analytics must be non-blocking

Analytics must never:

block navigation
block onboarding
block login/signup
block save/submit actions
create user-facing errors

Frontend analytics helpers should usually fail silently.

API analytics routes should usually return success-like responses even when event persistence fails.

11.2 Sidebar and dashboard badges must fail silently

Admin sidebar loads such as:

feedback counts
error counts
pending approval counts
similar counters and summaries

must:

fall back to 0 or empty state on failure
not show user-facing banners
not write to error_logs on transient fetch failure
11.3 Polling and realtime refreshes must be quiet

Background reloads triggered by:

polling
focus
visibility change
realtime refresh
manual refresh events

must not flood logs when they fail transiently.

12. Minimal Patterns
12.1 Shared helper pattern in lib/*

For nullable select:

const result = await supabase.from("profiles").select("*").maybeSingle();
return unwrapSupabaseNullable(result, "get_profile_failed");

For write without selected rows:

const result = await supabase.from("profiles").upsert(payload);

if (result.error) {
  throw normalizeError(result.error, "create_profile_failed");
}

For write with selected rows:

const result = await supabase
  .from("contractor_companies")
  .insert(payload)
  .select("*")
  .single();

return unwrapSupabase(result, "create_company_failed");
12.2 Client page pattern for primary flow
try {
  await withErrorLogging(
    () => submitBid(payload),
    {
      message: "submit_bid_failed",
      code: "submit_bid_failed",
      source: "frontend",
      area: "bids",
      path: "/contractor/jobs/123",
      role: "contractor",
      details: { jobId: payload.jobId },
    }
  );

  router.push("/contractor/bids");
} catch {
  setErr("Unable to submit bid. Please try again.");
}
12.3 Client pattern for secondary UI
async function loadBadge() {
  try {
    const res = await fetch("/api/admin/errors?summary=true", {
      cache: "no-store",
    });

    if (!res.ok) {
      setCount(0);
      return;
    }

    const data = await res.json().catch(() => null);
    setCount(data?.count ?? 0);
  } catch {
    setCount(0);
  }
}
12.4 Analytics pattern
export async function track(event: string, options?: TrackOptions) {
  try {
    const res = await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...options }),
      keepalive: true,
    });

    if (!res.ok) return;
  } catch {
    // ignore
  }
}
12.5 API pattern
try {
  const result = await withServerErrorLogging(
    async () => {
      // db action
      return { ok: true };
    },
    {
      message: "approve_doc_failed",
      code: "approve_doc_failed",
      source: "api",
      area: "documents",
      path: "/api/admin/documents/approve",
      role: "admin",
    }
  );

  return NextResponse.json(result);
} catch {
  return NextResponse.json(
    { error: "Unable to approve document." },
    { status: 500 }
  );
}
13. Good vs Bad
Good
uses shared helpers
normalizes raw errors
logs only important operational failures
shows safe user messages
keeps admin visibility structured
avoids sensitive data
keeps code short and repeatable
allows optional UI pieces to fail soft
avoids false failure reporting after successful writes
Bad
throws raw Supabase errors out of lib/*
shows raw DB text in UI
inserts into error_logs manually from many places
logs passwords/tokens/payment data
duplicates logging logic in many files
logs badge/analytics noise as real errors
depends on console logs instead of structured logs
treats data: null write responses as failures
14. Migration Rule for Legacy Code

Legacy code does not need to be rewritten all at once.

When touching a file:

normalize raw Supabase errors
replace repeated if (error) throw error with shared helpers where reasonable
replace noisy non-critical logging with fail-soft handling
replace repeated manual client logging with withErrorLogging
replace repeated manual server logging with withServerErrorLogging
replace raw UI error messages with safe messages
stop logging analytics/sidebar/network noise as admin errors
avoid using unwrapSupabase on writes without .select()

Any newly created file must follow this standard from the start.

15. Required Files

The standard error-handling system should include these files:

lib/logError.ts
lib/server/logServerError.ts
lib/errors/normalizeError.ts
lib/errors/unwrapSupabase.ts
lib/errors/withErrorLogging.ts
lib/errors/withServerErrorLogging.ts

Optional but recommended:

lib/errors/errorCodes.ts
lib/errors/getSafeUserMessage.ts
16. Final Rule

Error handling is part of core product architecture.

It is not optional.
It is not decorative.
It is not a local coding preference.

Every new feature must be:

safe for users
visible to admin when truly important
normalized internally
centralized in implementation
secure in what it logs
calm in what it shows
selective in what it records

If unsure:

normalize
sanitize
log only if the failure is operationally meaningful
show a safe message only if the user action truly failed
do not expose internals
do not flood admin with noise
