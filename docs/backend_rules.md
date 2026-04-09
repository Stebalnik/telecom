# Backend Rules

Backend is implemented using:

- Next.js API routes
- Supabase

---

# 1. API Structure

All backend endpoints live in:

app/api/

Examples:

- app/api/jobs/route.ts
- app/api/analytics/track/route.ts
- app/api/errors/log/route.ts

---

# 2. Responsibilities

API routes are responsible for:

- validation
- authentication
- authorization
- database operations
- structured error responses
- logging
- analytics persistence (centralized)

---

# 3. Supabase Usage

Two Supabase clients may exist.

## Client side:
- Supabase anon key

## Server side:
- Supabase server client
- service role ONLY when strictly required

Rules:

- service role must NEVER reach frontend
- do not expose secrets
- prefer authenticated server client
- never return raw Supabase errors to client
- all Supabase errors must be normalized before leaving backend

---

# 4. Validation

All requests must validate:

- authentication
- role
- input data

Before any DB write.

---

# 5. Authentication

All protected routes require auth:

- /dashboard
- /customer
- /contractor
- /admin

---

# 6. Authorization

Always check role on server:

- customer
- contractor
- admin

Never trust frontend for role decisions.

---

# 7. Supabase RLS

RLS must be enabled.

Rules:

- users can only access their own data
- admin access must be explicit
- never bypass RLS unless absolutely required

---

# 8. API Protection

All endpoints must:

- validate input
- validate role
- prevent abuse
- return safe errors

---

# 9. Error Responses

Always return structured errors:

```json
{
  "error": "Invalid request"
}

Rules:

no stack traces
no internal messages
no Supabase / Postgres errors
no secrets
only safe user-friendly messages
10. Error Handling System (CORE)

Error handling is mandatory.

Core Rules
no raw Supabase error may cross a layer boundary
unexpected errors MUST be logged
logging must be centralized
logging must be non-blocking
logs must be structured and sanitized
API must return safe messages only
11. Required Error Helpers

Backend must use:

lib/server/logServerError.ts
lib/errors/normalizeError.ts
lib/errors/unwrapSupabase.ts
lib/errors/withServerErrorLogging.ts
12. Supabase Error Handling
✅ Correct usage (READS)
const result = await supabase
  .from("profiles")
  .select("*")
  .maybeSingle();

return unwrapSupabase(result, "get_profile_failed");
❌ Forbidden
if (error) throw error;
⚠️ IMPORTANT: Writes MUST NOT use unwrapSupabase

Supabase writes often return:

data = null
error = null

This is SUCCESS.

❌ Wrong
unwrapSupabase(
  await supabase.from("analytics_events").insert({...}),
  "analytics_failed"
);
✅ Correct
const result = await supabase.from("analytics_events").insert({...});

if (result.error) {
  throw normalizeError(result.error, "analytics_failed");
}
13. API Error Pattern
Standard
try {
  const result = await withServerErrorLogging(
    async () => {
      // db logic
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
❌ Forbidden
catch (e) {
  return NextResponse.json({ error: e.message });
}
14. Special Case: Non-blocking Operations

Some operations must NEVER break user flow:

analytics
logging itself
background signals
Rule

These must:

never throw to client
never block response
fail silently (or log internally)
Example (analytics)
try {
  await withServerErrorLogging(...);
} catch {
  return NextResponse.json({ ok: true, skipped: true });
}
15. Error Logging System

Dedicated system:

app/api/errors/log/route.ts
app/api/admin/errors/route.ts

Table:

public.error_logs

16. Error Logs Structure

Fields:

id
user_id
role
message
details
path
level
source
area
code
status_code
fingerprint
created_at
resolved_at
resolved_by
17. Logging Rules

Log ONLY meaningful errors.

Must log:
failed primary business actions
failed DB operations affecting user flow
unexpected exceptions
admin-critical failures
Must NOT log:
analytics failures
transient network errors
retries
optional UI data failures

Rules:

use shared helpers
sanitize everything
logging must NOT break flow
18. Server Error Logging

Use:

lib/server/logServerError.ts

Rules:

log inside catch or wrapper
sanitize all data
never log secrets
never log raw request bodies
19. Error Normalization Rule

All errors must be normalized before:

logging
rethrow
returning to client

Never pass raw:

Supabase errors
Postgres errors
stack traces
20. Error Boundary Rule

Server must separate:

Internal (logs)
full error
stack
DB codes
External (client)
safe message
21. Admin Error System

Admin must:

see real errors
filter by level / source / area
group errors
inspect details
resolve issues

Critical rule:

👉 No noise. Only operational failures.

22. Security Logging Rules

Never log:

passwords
tokens
API keys
service role keys
payment data
sensitive personal data

Always sanitize:

request data
error messages
stack traces
23. Analytics System
Frontend

Use ONLY:

track("event_name", { meta })

Do NOT use raw fetch.

Backend

All events go through:

app/api/analytics/track/route.ts

Storage

public.analytics_events

Fields:

id
user_id
event
path
role
meta
created_at
Event Naming

Good:

login
signup
submit_bid

Bad:

submit_bid_job_123

Dynamic data → meta

When to Track

ONLY after success.

Critical Rule

Analytics must be:

non-blocking
silent on failure
never logged as system error
never break UX
24. File Uploads

Use:

signed URLs
secure buckets

Never expose public write access.

25. Frontend Interaction Rule

Frontend must call:

API routes

NOT Supabase directly (except safe read cases).

26. Shared Helpers

All shared logic:

lib/

Examples:

lib/track.ts
lib/logError.ts
lib/server/logServerError.ts
lib/errors/*
27. Default Minimal Pattern

Every feature:

perform action
success → track()
failure → handled via helpers
safe response
28. Final Rule

System must be:

centralized
secure
observable (without noise)
consistent
scalable
production-ready

Analytics and error handling are NOT optional.

But:

👉 Logging must create signal, not noise.
👉 UX must never suffer because of logging.
👉 Not every failure is an error worth logging.
