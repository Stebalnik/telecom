# Error Handling Standard

This document defines the required error handling system for the platform.

It exists to make the product:

- observable
- safe
- consistent
- easy to debug
- easy to scale
- easy to maintain

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
- admins get structured operational visibility
- developers do not duplicate error logic everywhere
- all important failures are logged consistently
- sensitive data is never exposed in UI or logs
- similar failures are grouped and diagnosable

The platform must never rely on silent failures.

---

# 2. Core Principles

## 2.1 No silent failures

Every important failure must be visible somewhere:

- to the user as a safe message
- to admin as a structured error log
- to the system as a normalized error object

## 2.2 No raw backend errors in UI

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

## 2.3 No raw Supabase error may cross a layer boundary

Supabase and database errors must be normalized before they leave the layer where they occur.

Meaning:

- lib/* helpers must not throw raw Supabase errors outward
- API routes must not return raw backend errors to clients
- pages must not display raw DB error strings

## 2.4 Logging must be centralized

Logging must go through shared helpers.

Never insert into `error_logs` inline from random files.

## 2.5 Logging must be non-blocking

Error logging must never break UX.

If logging fails:

- the user flow must continue safely
- the UI must remain usable
- the original business flow must not crash because logging failed

## 2.6 Error handling must reduce duplication

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
- auto-log
- rethrow normalized errors

## 3.6 Server wrapper helper

Required:

- `lib/errors/withServerErrorLogging.ts`

Purpose:

- wrap async server/API operations
- auto-normalize
- auto-log
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

code: submit_bid_failed
details: { jobId: "..." }

Bad:

code: submit_bid_job_123_failed
6. Layer Rules
6.1 In lib/* data helpers

Use:

normalizeError
unwrapSupabase

Purpose:

normalize raw DB/auth/Supabase errors
keep shared logic clean
prevent raw errors from leaking upward
Required pattern

Good:

const result = await supabase.from("profiles").select("*").maybeSingle();
return unwrapSupabase(result, "get_profile_failed");

Bad:

const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
if (error) throw error;
return data;
6.2 In client pages/components

Use:

withErrorLogging
or logError directly when wrapping is not practical

Client pages still usually need catch for UI behavior.

The purpose of the helper is not to remove catch entirely.
The purpose is to remove repeated manual logging logic inside every catch.

Good:

try {
  await withErrorLogging(
    () => createMyProfile(role),
    {
      message: "dashboard_create_profile_failed",
      code: "dashboard_create_profile_failed",
      source: "frontend",
      area: "auth",
      path: "/dashboard",
      details: { selectedRole: role },
    }
  );

  router.push("/contractor");
} catch {
  setErr("Unable to save your role. Please try again.");
}

Bad:

try {
  await createMyProfile(role);
} catch (e: any) {
  await logError("dashboard_create_profile_failed", {
    source: "frontend",
    area: "auth",
    path: "/dashboard",
    code: "dashboard_create_profile_failed",
    details: {
      message: e?.message,
      originalCode: e?.code,
      originalDetails: e?.details,
    },
  });

  setErr(e.message);
}
6.3 In API routes and server logic

Use:

withServerErrorLogging
or logServerError directly when needed

API routes still need catch to return safe NextResponse.

Good:

try {
  const result = await withServerErrorLogging(
    async () => {
      // action
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
7. Required Logging Fields

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
7.1 source

Allowed values:

frontend
api
db
auth
server
admin
7.2 level

Allowed values:

info
warning
error
critical

Default:

error
7.3 area

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
8. Security Rules for Error Handling

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
8.1 Sanitize before writing

All logging helpers must sanitize details before persistence.

8.2 Do not expose internals to UI

UI must never display:

raw DB messages
stack traces
SQL details
RLS/policy internals
table/column internals unless explicitly intended for admin-only internal tools
9. User Experience Rules
9.1 User-facing messages must be calm

Good:

"Unable to save your changes."
"Something went wrong. Please try again."
"Your session has expired. Please log in again."

Bad:

"duplicate key value violates unique constraint ..."
"RLS check failed"
"insert into profiles failed"
9.2 Admin-facing visibility must be rich

Admin must be able to:

see unresolved errors
filter by source/area/level
inspect details
group by fingerprint
mark resolved
track recurring failures

Errors are part of the operational dashboard.

10. When Logging Is Required

Logging is required for:

failed page loads
failed important data loads
failed form submissions
failed API calls
failed admin actions
failed checkout starts
failed onboarding flows
failed auth flows
failed background operational actions
failed server/db operations in API routes
unexpected exceptions

Logging is not required for:

expected inline validation that never touches server state
purely cosmetic issues with no operational value
intentionally canceled user actions

But if uncertain, prefer logging.

11. Minimal Patterns
11.1 Shared helper pattern in lib/*
const result = await supabase.from("profiles").select("*").maybeSingle();
return unwrapSupabase(result, "get_profile_failed");
11.2 Client page pattern
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

  await track("submit_bid", { meta: { jobId: payload.jobId } });
} catch {
  setErr("Unable to submit bid. Please try again.");
}
11.3 API pattern
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
12. Good vs Bad
Good
uses shared helpers
normalizes raw errors
logs every important failure
shows safe user messages
keeps admin visibility structured
avoids sensitive data
keeps code short and repeatable
Bad
throws raw Supabase errors out of lib/*
shows raw DB text in UI
inserts into error_logs manually from many places
logs passwords/tokens/payment data
duplicates logging logic in many files
skips logging in admin flows
depends on console logs instead of structured logs
13. Migration Rule for Legacy Code

Legacy code does not need to be rewritten all at once.

When touching a file:

normalize raw Supabase errors
replace repeated if (error) throw error with shared helpers where reasonable
replace repeated manual client logging with withErrorLogging
replace repeated manual server logging with withServerErrorLogging
replace raw UI error messages with safe messages

Any newly created file must follow this standard from the start.

14. Required Files

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
15. Final Rule

Error handling is part of core product architecture.

It is not optional.
It is not decorative.
It is not a local coding preference.

Every new feature must be:

safe for users
visible to admin
normalized internally
centralized in implementation
secure in what it logs
consistent with shared helpers

If unsure:

normalize
sanitize
log
show a safe message
do not expose internals