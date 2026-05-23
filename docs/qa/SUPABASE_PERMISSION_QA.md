# Supabase Permission QA

Task: `TASK-0040`  
Scope: Supabase RLS, storage access, tenant ownership checks, and role-scoped data access.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not print service-role keys, JWTs, refresh tokens, signed URLs, or private document contents.
- Treat any cross-tenant read/write as a release blocker.

## Reference Surfaces

- `docs/export_latest/SUPABASE_SCHEMA.sql`
- `docs/security_rules.md`
- `docs/backend_rules.md`
- `docs/error_handling_standard.md`
- Supabase client modules:
  - `lib/supabaseClient.ts`
  - `lib/supabase/browser.ts`
  - `lib/supabase/server.ts`

## Permission Matrix

- [ ] Guest cannot read customer, contractor, worker, admin, bid, resource, agreement, feedback, or document records.
- [ ] Customer can read and mutate only records owned by that customer or explicitly shared with that customer.
- [ ] Contractor can read and mutate only its company, teams, workers, bids, documents, agreements, and customer resources allowed by relationship.
- [ ] Worker can read and mutate only its own profile, availability, applications, invitations, certifications, and insurance records.
- [ ] Admin can read review queues, analytics, feedback, errors, approvals, and change requests without bypassing unrelated ownership checks in user flows.
- [ ] Service-role access is limited to server-side operations that explicitly require it.

## Table And Policy Checklist

- [ ] RLS is enabled for user-owned and tenant-owned marketplace tables.
- [ ] Customer-owned tables use trusted customer ownership checks, not client-supplied customer IDs alone.
- [ ] Contractor-owned tables use trusted company ownership checks, not client-supplied company IDs alone.
- [ ] Worker-owned tables use `auth.uid()` or equivalent trusted identity linkage.
- [ ] Admin policies require trusted admin role lookup.
- [ ] Insert policies validate ownership in `WITH CHECK`, not just `USING`.
- [ ] Update policies validate both readable target rows and replacement row ownership.
- [ ] Delete policies are restricted to owners/admins where deletion is permitted.
- [ ] Public or anon grants do not bypass RLS for protected marketplace records.

## Storage And Signed URL Checklist

- [ ] Customer resource file URLs require authenticated customer ownership or approved contractor relationship.
- [ ] Agreement file URLs require customer owner, assigned contractor, or admin authorization.
- [ ] Insurance and certification file URLs require owning contractor/worker or admin authorization.
- [ ] Upload routes validate session, role, ownership, file name, content type, and intended storage bucket.
- [ ] Signed URLs are short-lived and not logged.
- [ ] Storage paths are not treated as authorization by themselves.

## API Permission Checks

- [ ] `/api/customer/resources/*` verifies authenticated customer ownership before upload/open actions.
- [ ] `/api/contractor/hr/*` verifies contractor company ownership before worker/vacancy/invitation actions.
- [ ] `/api/worker/*` verifies authenticated worker identity before profile/document/application actions.
- [ ] `/api/admin/*` verifies trusted admin role before returning protected records or performing approval actions.
- [ ] `/api/feedback/*` limits feedback threads to owner/admin access.
- [ ] `/api/analytics/*` avoids exposing tenant data outside approved aggregate/admin contexts.

## Negative Test Cases

- [ ] Customer A cannot read Customer B jobs, settings, resources, agreements, bids, requests, or contractors.
- [ ] Contractor A cannot read Contractor B company, teams, workers, documents, bids, agreements, or HR data.
- [ ] Worker A cannot read Worker B profile, applications, invitations, documents, or availability.
- [ ] Non-admin cannot call admin approval, analytics, feedback, or errors endpoints.
- [ ] Expired session cannot reuse a previously visible protected page or signed URL flow.
- [ ] Tampered IDs in request body, query string, and route params are rejected.

## Verification Commands

Run after Supabase permission changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Supabase permission QA is complete only when the permission matrix, policy review, storage review, API checks, and negative tests are documented as passing or tracked with explicit release-blocking follow-ups.
