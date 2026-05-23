# Role-Isolation QA

Task: `TASK-0049`  
Scope: customer, contractor, worker, admin, public, auth, shared dashboard, API, Supabase/RLS, document access, and checkout-adjacent boundaries.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not test with production users, production records, or production payment sessions.
- Do not bypass application authorization with service-role credentials during user-path QA.
- Do not include secrets, private documents, payment details, personal data, or raw auth tokens in notes.
- Treat any cross-role data visibility, unauthorized action, or protected route flash as a release blocker.

## Role Matrix Coverage

- [ ] Anonymous users can access only public and auth routes.
- [ ] Pending customers can access only allowed onboarding or pending-review routes.
- [ ] Approved customers can access customer routes and shared routes intended for customers.
- [ ] Pending contractors can access only allowed onboarding or pending-review routes.
- [ ] Approved contractors can access contractor routes and shared routes intended for contractors.
- [ ] Workers can access worker routes and shared worker surfaces only.
- [ ] Admin users can access admin surfaces without inheriting customer, contractor, or worker data accidentally.
- [ ] Suspended, rejected, deleted, or incomplete profiles fail closed.
- [ ] Users with multiple profile records resolve to one explicit active role path.

## Route Isolation Checklist

- [ ] `/customer` routes reject contractor, worker, admin, pending, and anonymous users.
- [ ] `/contractor` routes reject customer, worker, admin, pending, and anonymous users.
- [ ] `/worker` routes reject customer, contractor, admin, pending, and anonymous users.
- [ ] `/admin` routes reject customer, contractor, worker, pending, and anonymous users.
- [ ] Shared `/dashboard` routes redirect users to the correct role workspace.
- [ ] Authenticated users cannot reach onboarding routes for another role.
- [ ] Protected routes do not flash another role's navigation or data while session state loads.
- [ ] Back/forward browser navigation does not reveal stale protected content after logout.

## API Isolation Checklist

- [ ] Admin APIs reject non-admin roles and anonymous users.
- [ ] Customer APIs reject contractor, worker, admin, pending, and anonymous users unless explicitly shared.
- [ ] Contractor APIs reject customer, worker, admin, pending, and anonymous users unless explicitly shared.
- [ ] Worker APIs reject customer, contractor, admin, pending, and anonymous users unless explicitly shared.
- [ ] Feedback and support APIs enforce ownership or admin-only visibility.
- [ ] Analytics APIs expose only role-appropriate aggregation and never raw unauthorized records.
- [ ] Checkout APIs verify the authenticated user's eligible role and ownership before creating sessions.
- [ ] API errors distinguish 401, 403, 404, validation, and server failures without leaking protected record existence.

## Data And Supabase/RLS Checklist

- [ ] Customer records are visible only to owning customers, approved linked contractors where intended, and admins where intended.
- [ ] Contractor records are visible only to owning contractors, approved linked customers where intended, and admins where intended.
- [ ] Worker records are visible only to owning workers, their contractor employer where intended, and admins where intended.
- [ ] Job, bid, request, agreement, resource, certification, insurance, invitation, vacancy, and application tables enforce role-appropriate RLS.
- [ ] Signed upload and download URLs verify ownership before creation.
- [ ] Database queries do not use service-role access in user-facing paths unless wrapped in explicit authorization checks.
- [ ] Empty results caused by RLS are not presented as authorized access to missing records.
- [ ] Record IDs guessed from another role do not reveal record content, metadata, or attachment URLs.

## Navigation And UI Isolation

- [ ] Role navigation shows only routes available to the current role.
- [ ] Dashboard cards and primary actions do not link to unauthorized role surfaces.
- [ ] Search, filter, and autocomplete controls do not suggest unauthorized records.
- [ ] Empty, loading, and error states avoid revealing another role's private counts or record names.
- [ ] Status badges and approval messages match the current user's role.
- [ ] Admin controls never render for non-admin roles, including during loading states.
- [ ] Logout clears role-specific UI state before redirecting to public/auth routes.

## Negative Test Scenarios

- [ ] Customer attempts direct contractor, worker, and admin route URLs.
- [ ] Contractor attempts direct customer, worker, and admin route URLs.
- [ ] Worker attempts direct customer, contractor, and admin route URLs.
- [ ] Anonymous user attempts protected route URLs and API endpoints.
- [ ] Pending user attempts approved-only route URLs and API endpoints.
- [ ] User tampers with route params, query params, job IDs, bid IDs, resource IDs, feedback IDs, and document IDs.
- [ ] User retries stale links after logout, role change, approval rejection, or session expiry.
- [ ] User opens protected pages in multiple tabs while role/session state changes.

## Verification Commands

Run after role-isolation changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Role-isolation QA is complete only when every route, API endpoint, RLS-protected query, signed URL flow, dashboard action, and navigation surface fails closed for unauthorized roles and preserves clear, non-leaking user feedback.
