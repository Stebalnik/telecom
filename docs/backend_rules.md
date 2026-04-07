Backend Rules

Backend is implemented using:

Next.js API routes
Supabase
API Structure

All backend endpoints live in:

app/api/

Examples:

app/api/jobs/route.ts
app/api/analytics/track/route.ts
app/api/errors/log/route.ts
Responsibilities

API routes handle:

validation
authentication
authorization
database operations
structured error responses
logging
analytics persistence (centralized)
Supabase Usage

Two Supabase clients may exist.

Client side:
Supabase anon key
Server side:
Supabase server client
service role only when strictly required
Rules:
service role must NEVER reach frontend
do not expose secrets
prefer authenticated server client
never return raw Supabase errors to client
all Supabase errors must be normalized before leaving backend
Validation

All requests must validate:

user authentication
user role
input data

Before any DB write.

Authentication

All protected routes require auth:

/dashboard
/customer
/contractor
/admin
Authorization

Always check role on server:

customer
contractor
admin

Never trust frontend for role decisions.

Supabase RLS

RLS must be enabled.

Rules:

users can only access their own data
admin access must be explicit and controlled
never bypass RLS unless absolutely required
API Protection

All endpoints must:

validate input
validate role
prevent abuse
return safe errors
Error Responses

Always return structured errors:

{
  "error": "Invalid request"
}
Rules:
no stack traces to user
no internal system messages
no Supabase / Postgres messages
no secrets
user-friendly messages only
🔥 Error Handling System (Core)

Error handling is a required system, not optional.

Core Rules
no raw Supabase error may cross a layer boundary
all unexpected errors MUST be logged
logging must be centralized
logging must be non-blocking
logs must be structured and sanitized
API must return safe messages only
Required Error Helpers

Backend must use shared helpers:

lib/server/logServerError.ts
lib/errors/normalizeError.ts
lib/errors/unwrapSupabase.ts
lib/errors/withServerErrorLogging.ts
Supabase Error Handling
Required pattern
const result = await supabase.from("profiles").select("*").maybeSingle();
return unwrapSupabase(result, "get_profile_failed");
Forbidden
if (error) throw error;
API Error Pattern
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
Forbidden Pattern
catch (e) {
  return NextResponse.json({ error: e.message });
}
Error Logging (Separate System)

Errors must go to a dedicated system.

API:
app/api/errors/log/route.ts
app/api/admin/errors/route.ts
Table:

public.error_logs

Error Logs Structure

Each error must be structured.

Fields:

id
user_id
role
message
details
path
level (info | warning | error | critical)
source (frontend | api | db | auth | server | admin)
area (contractor | customer | admin | auth | jobs | bids | documents)
code (stable error code)
status_code (optional)
fingerprint (for grouping)
created_at
resolved_at (nullable)
resolved_by (nullable)
Error Logging Rules

All unexpected errors MUST be logged.

Applies to:

API routes
server actions
admin actions
DB operations
Rules:
use shared helper (no inline inserts)
logs must be structured
logs must be sanitized
logging must NOT break user flow
Server Error Logging

Backend must use:

lib/server/logServerError.ts

Rules:
log inside catch or wrapper
sanitize all data
never log secrets
never log raw request bodies
Error Normalization Rule

All errors must be normalized before:

logging
rethrow
returning to client

Never pass raw:

Supabase errors
Postgres errors
stack traces
Error Boundary Rule

Server must separate:

Internal:
full error details
stack
DB codes

→ goes to logs

External:
safe message

→ goes to client

Admin Error System

Admin must have full visibility.

Capabilities:

view all errors
filter by level / source / area / date
group similar errors
inspect details
mark resolved
track unresolved

Errors are part of operational dashboard.

Security Logging Rules

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
Logging

Important operations must log:

user_id
operation
timestamp

Examples:

approvals
onboarding
company updates
critical failures
Analytics System

Analytics must be centralized.

Frontend

Use ONLY:

track("event_name", { meta })

Do NOT use raw fetch.

Backend

All events go through:

app/api/analytics/track/route.ts

Handles:

validation
auth
DB insert
Analytics Storage

Table:

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

Where to Track

Track only meaningful actions:

Auth:

login
signup

Contractor:

onboarding started
onboarding submitted
submit bid

Customer:

create job

Admin:

approvals
When to Track

ONLY after success.

Correct:

after DB insert

Wrong:

before action completes
Keep It Lightweight

Rules:

one helper (track)
no duplicate logic
no noise
only meaningful events
File Uploads

Use:

signed URLs
secure buckets

Never expose public write access.

Frontend Rule

Frontend must call:

Next.js API routes

NOT Supabase directly (except safe cases).

Shared Helpers

All shared logic goes to:

lib/

Examples:

lib/track.ts
lib/logError.ts
lib/server/logServerError.ts
lib/errors/*
Default Minimal Pattern

Every feature:

do action
on success → track()
on failure → error helper (auto log)
Final Rule

System must be:

centralized
secure
observable
consistent
easy to extend
clean in code

Analytics and error handling are NOT optional.
They are part of core product architecture.