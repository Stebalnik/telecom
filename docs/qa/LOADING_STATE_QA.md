# Loading-State QA

Task: `TASK-0047`  
Scope: public, auth, customer, contractor, worker, admin, API-backed, and checkout-adjacent workflows that fetch, submit, upload, or transition data.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not run load tests against production services.
- Do not capture secrets, payment details, private documents, or personal data in screenshots or logs.
- Treat duplicate submissions, stuck loading states, or loading states that expose cross-role data as release blockers.

## Loading-State Categories

- [ ] Initial page load while session, profile, role, or approval state is resolved.
- [ ] Data fetch load for dashboards, lists, details, analytics, and settings pages.
- [ ] Search, filter, tab, and pagination transitions.
- [ ] Form submission and server action/API mutation states.
- [ ] File upload, signed URL, certification, insurance, COI, and resource attachment states.
- [ ] Checkout session creation and external redirect preparation.
- [ ] Background refresh or optimistic update rollback states.
- [ ] Retry state after transient network or API failures.

## Customer Workflow Coverage

- [ ] Customer dashboard summaries show stable placeholders while jobs, bids, contractors, resources, requests, agreements, and compliance data load.
- [ ] Job creation and editing actions disable duplicate submit while saving.
- [ ] Job lists keep filters, tabs, and pagination stable during refetch.
- [ ] Bid review pages show loading without exposing partial contractor data from another job.
- [ ] Contractor discovery and approved roster searches distinguish loading from no results.
- [ ] Resource upload and signed URL flows show progress or disabled actions until complete.
- [ ] Checkout creation displays a clear pending state before redirect.

## Contractor Workflow Coverage

- [ ] Contractor dashboard summaries remain stable while marketplace, bid, customer, resource, agreement, certification, insurance, team, and HR data load.
- [ ] Bid submission disables duplicate submit and preserves form state during validation.
- [ ] Job detail pages show a safe loading state before protected job data renders.
- [ ] Customer resource views do not flash unauthorized customer data while loading.
- [ ] Certification, insurance, and COI uploads show pending states until the API responds.
- [ ] Team and HR actions show loading for worker invitations, vacancy creation, application review, and profile updates.
- [ ] Onboarding and pending-approval screens do not flash approved-only navigation while role state loads.

## Worker Workflow Coverage

- [ ] Worker dashboard summaries remain stable while invitations, vacancies, applications, certifications, insurance, and availability data load.
- [ ] Profile and availability saves disable repeated submissions and preserve input values.
- [ ] Application and invitation actions show clear pending states for accept, decline, submit, and withdraw actions.
- [ ] Document upload surfaces show loading until signed URLs and persistence complete.
- [ ] Protected worker routes do not flash another role's navigation while session state loads.

## Admin Workflow Coverage

- [ ] Admin dashboard shows neutral placeholders while approvals, analytics, feedback, errors, and change requests load.
- [ ] Approval actions disable duplicate approve, return-to-draft, and request-review actions.
- [ ] Feedback message sends show pending state without duplicating messages.
- [ ] Error and analytics filters remain stable while queries refetch.
- [ ] Detail pages show safe loading before protected request, feedback, or analytics records render.
- [ ] Admin-only loading states do not expose admin controls to non-admin roles during role resolution.

## UI And Accessibility Checklist

- [ ] Loading indicators have accessible text or `aria-busy` context where appropriate.
- [ ] Skeletons reserve stable dimensions and do not shift surrounding controls.
- [ ] Spinners are paired with meaningful labels for long-running actions.
- [ ] Buttons, links, and form controls show disabled or busy state only when interaction is intentionally blocked.
- [ ] Keyboard focus is not lost after loading completes.
- [ ] Loading states fit at mobile, tablet, and desktop widths.
- [ ] Long-running operations provide retry, cancel, or safe navigation where the workflow requires it.

## Backend And Security Checks

- [ ] API loading states distinguish pending, success, empty, unauthorized, forbidden, not found, and error outcomes.
- [ ] Mutations are idempotent or guarded against duplicate client submits.
- [ ] Supabase/RLS checks complete before protected data is rendered.
- [ ] Client components do not render stale privileged data while a new role/session is loading.
- [ ] Upload flows do not expose signed URLs after failed or cancelled operations.
- [ ] Checkout state does not expose raw provider secrets or session internals.

## Verification Commands

Run after loading-state changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Loading-state QA is complete only when data fetches, mutations, uploads, checkout preparation, role resolution, and retries have stable, accessible, duplicate-safe states across every marketplace role.
