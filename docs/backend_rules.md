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
Validation

All requests must validate:

user authentication
user role
input data

Before any DB write.

Error Responses

Always return structured errors:

{
  "error": "Invalid request"
}

Rules:

no stack traces to user
no secrets
user-friendly messages only
Logging

Important operations must log:

user_id
operation
timestamp

Examples:

company changes
approvals
critical failures
Default Analytics Rule

Analytics must be built-in by default but centralized.

Goals:

easy to use
consistent
no code duplication
minimal noise in features
Analytics Architecture

Frontend:

use ONLY helper:

track("event_name", { meta })

do NOT use raw fetch everywhere

Backend:

all events go through:

app/api/analytics/track/route.ts

This route handles:

validation
auth
DB insert

Storage:

Table: public.analytics_events

Fields:

id
user_id
event
path
role
meta
created_at
Event Naming

Use simple stable names:

Good:

login
signup
submit_bid

Bad:

submit_bid_job_123

Dynamic data → meta

Example:

track("submit_bid", { jobId })

Where to Track

Track ONLY important actions:

Auth:

login
signup

Contractor:

onboarding started
onboarding submitted
submit bid

Customer:

create job

Mission:

open page
start checkout

Admin:

approvals
When to Track

ONLY after success.

Correct:

after DB insert
after API success

Wrong:

before action completes
Keep It Lightweight

Rules:

one helper (track)
no duplicated fetch logic
no over-tracking
only meaningful events
Error Logging (Separate System)

Errors must go to a dedicated system.

API:

app/api/errors/log/route.ts

Admin API:

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
source (frontend | api | db | auth)
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
critical DB operations

Rules:

every try/catch must log error
use shared helper (no inline DB inserts)
logs must be structured
logs must be sanitized
logging must NOT break user flow
Frontend Error Logging

Frontend must use:

logError("message", details)

Rules:

must be called on every failure
must be non-blocking
must NOT expose sensitive data
must include useful context (path, action, ids)
Server Error Logging

Backend must use a shared helper:

lib/server/logServerError.ts

Rules:

log inside catch blocks
sanitize all data before insert
never log raw request bodies
never log secrets
Error Visibility

User:

sees safe message only
no technical details

Admin:

sees full structured error logs
can filter and inspect
Admin Error System

Admin must have full access to errors.

Capabilities:

view all errors
filter by level, source, area, date
group similar errors
inspect full details
mark as resolved
track unresolved issues

Errors are part of operational dashboard, not optional.

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
Authentication

All protected routes require auth:

/dashboard
/customer
/contractor
/admin
Authorization

Always check role:

customer
contractor
admin

On server side only.

Supabase RLS

Must be enabled.

Rules:

users see only their data
admin has controlled access
API Protection

All endpoints must:

validate input
validate role
prevent abuse
return safe errors
File Uploads

Use:

signed URLs
secure buckets

Never expose open access.

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
lib/errors/errorCodes.ts
Default Minimal Pattern

Every feature:

do action
on success → track()
on failure → logError()
Final Rule

System must be:

centralized
secure
observable
easy to extend
clean in code

Analytics and error logging are NOT optional.
They are part of core product behavior.
