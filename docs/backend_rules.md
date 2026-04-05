# Backend Rules

Backend is implemented using:

- Next.js API routes
- Supabase

---

# API Structure

All backend endpoints live in:

app/api/

Examples:

- app/api/jobs/route.ts
- app/api/analytics/track/route.ts
- app/api/errors/log/route.ts

---

# Responsibilities

API routes handle:

- validation
- authentication
- authorization
- database operations
- structured error responses
- logging
- analytics persistence (centralized)

---

# Supabase Usage

Two Supabase clients may exist.

Client side:

- Supabase anon key

Server side:

- Supabase server client
- service role only when strictly required

Rules:

- service role must NEVER reach frontend
- do not expose secrets
- prefer authenticated server client

---

# Validation

All requests must validate:

- user authentication
- user role
- input data

Before any DB write.

---

# Error Responses

Always return structured errors:

{
  "error": "Invalid request"
}

Rules:

- no stack traces to user
- no secrets
- user-friendly messages only

---

# Logging

Important operations must log:

- user_id
- operation
- timestamp

Examples:

- company changes
- approvals
- critical failures

---

# Default Analytics Rule

Analytics must be built-in by default but centralized.

Goals:

- easy to use
- consistent
- no code duplication
- minimal noise in features

---

# Analytics Architecture

Frontend:

- use ONLY helper:
  
  track("event_name", { meta })

- do NOT use raw fetch everywhere

Backend:

- all events go through:

  app/api/analytics/track/route.ts

This route handles:

- validation
- auth
- DB insert

Storage:

Table: public.analytics_events

Fields:

- id
- user_id
- event
- path
- role
- meta
- created_at

---

# Event Naming

Use simple stable names:

Good:

- login
- signup
- submit_bid

Bad:

- submit_bid_job_123

Dynamic data → meta

Example:

track("submit_bid", { jobId })

---

# Where to Track

Track ONLY important actions:

Auth:

- login
- signup

Contractor:

- onboarding started
- onboarding submitted
- submit bid

Customer:

- create job

Mission:

- open page
- start checkout

Admin:

- approvals

---

# When to Track

ONLY after success.

Correct:

- after DB insert
- after API success

Wrong:

- before action completes

---

# Keep It Lightweight

Rules:

- one helper (track)
- no duplicated fetch logic
- no over-tracking
- only meaningful events

---

# Error Logging (Separate)

Errors must go to a separate system.

API:

app/api/errors/log/route.ts

Table:

public.error_logs

Fields:

- id
- user_id
- role
- message
- details
- path
- created_at

Frontend helper:

logError("message", details)

---

# Security Logging Rules

Never log:

- passwords
- tokens
- keys
- payment data

---

# Authentication

All protected routes require auth:

- /dashboard
- /customer
- /contractor
- /admin

---

# Authorization

Always check role:

- customer
- contractor
- admin

On server side only.

---

# Supabase RLS

Must be enabled.

Rules:

- users see only their data
- admin has controlled access

---

# API Protection

All endpoints must:

- validate input
- validate role
- prevent abuse
- return safe errors

---

# File Uploads

Use:

- signed URLs
- secure buckets

Never expose open access.

---

# Frontend Rule

Frontend must call:

- Next.js API routes

NOT Supabase directly (except safe cases).

---

# Shared Helpers

All shared logic goes to:

lib/

Examples:

- lib/track.ts
- lib/logError.ts

---

# Default Minimal Pattern

Every feature:

1. do action
2. on success → track()
3. on failure → logError()

---

# Final Rule

System must be:

- centralized
- secure
- easy to extend
- clean in code

Analytics is NOT optional.
It is part of core product behavior.
