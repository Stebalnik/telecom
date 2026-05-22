# Marketplace Production Readiness

This document tracks the production-readiness review backlog for the LEOTEOR Telecom Marketplace. It is intended for human review before any production deployment or merge to `main`.

## Commit Ready Capability Summary

The current generated queue preserves 15 `commit_ready` tasks. These tasks established the safe agent development system and delivered the first marketplace workflow expansions.

| Task | Implemented capability | Review notes |
| --- | --- | --- |
| TASK-0001 | Safe agent task orchestration foundation with execution rules, queue format, progress tracking, architecture documentation, and placeholder agent library types. | Documentation and local scripts only; no production runtime or deployment behavior. |
| TASK-0002 | Deterministic task execution loop for claiming one pending task, verifying it, completing it, and reporting status. | Runner uses local queue files and allowlisted commands only. |
| TASK-0003 | Branch and workspace isolation guard for agent execution. | Protects against running from production paths or protected branches. |
| TASK-0004 | Agent self-verification pipeline. | Checks branch isolation, current task state, implementation packet consistency, and safe verification metadata. |
| TASK-0005 | Merge readiness reporting. | Produces human-review readiness signals but does not merge or deploy. |
| TASK-0006 | Safe implementation packet and coding loop reports. | Codex receives task-scoped prompts; no AI API calls or automatic code execution from task text. |
| TASK-0007 | Improved deterministic task claiming. | Claiming is priority-aware, dependency-aware, and records claim metadata. |
| TASK-0008 | Retry handling for failed task verification. | A first verification failure returns a task to `pending`; repeated failures can be blocked for manual review. |
| TASK-0009 | Architecture review report generation. | Provides advisory route, security, and file-impact notes for the current packet. |
| TASK-0010 | Lint/build recovery report. | Classifies failed allowlisted verification commands and suggests scoped manual recovery without auto-fixing. |
| TASK-0011 | Customer dashboard workflow expansion. | Adds a customer workflow panel that turns existing dashboard stats into ordered customer actions. |
| TASK-0012 | Contractor dashboard workflow expansion. | Adds a contractor workflow panel for company readiness, insurance, crews, certifications, and jobs. |
| TASK-0013 | Admin analytics insight expansion. | Adds derived activity, onboarding, customer demand, and contractor supply insight cards. |
| TASK-0014 | Admin approval queue summaries. | Adds customer and contractor approval queue summary cards for faster triage. |
| TASK-0015 | Contractor workforce center expansion. | Adds workforce pipeline and readiness checklist to the contractor HR center. |

## Security Review Summary

- Agent automation remains local to `/var/www/telecom-agent-workspace`.
- Production paths, production PM2 processes, deployment commands, and merges are not part of the runner.
- Verification commands are allowlisted and do not execute arbitrary shell commands from task text.
- Marketplace UI changes in TASK-0011 through TASK-0015 are frontend-only and reuse existing data access patterns.
- Backend, Supabase, RLS, and Stripe behavior were not changed by the marketplace workflow UI expansions.

## Route Impact Summary

- `/customer` gained a customer workflow panel.
- `/contractor` gained a contractor workflow panel.
- `/admin/analytics` gained analytics insight cards.
- `/admin/contractor-approvals` gained contractor approval queue summaries.
- `/admin/customer-approvals` gained customer approval queue summaries.
- `/contractor/hr` gained a workforce pipeline and readiness checklist.

## Dashboard Smoke Test Checklist

Run these checks in the isolated preview workspace before release. Do not deploy, merge, or touch production while executing this checklist.

### Authentication And Routing

- [ ] Signed-out users who open `/dashboard` are redirected to `/login`.
- [ ] A customer user reaches the customer workspace from `/dashboard`.
- [ ] A contractor user reaches the contractor workspace from `/dashboard`.
- [ ] A worker user reaches the worker workspace from `/dashboard`.
- [ ] An admin user reaches the admin workspace from `/dashboard`.
- [ ] Users with an unsupported or missing role see a safe fallback instead of privileged content.

### Shared Dashboard Navigation

- [ ] Global logo and primary workspace links render without layout shift.
- [ ] Role-specific navigation entries point to the correct workspace routes.
- [ ] Logout remains visible and works from dashboard-adjacent screens.
- [ ] Dashboard cards and links do not expose routes for roles that should not use them.
- [ ] Mobile-width navigation remains readable and does not overlap content.

### Workspace Landing Checks

- [ ] `/customer` loads the customer dashboard and workflow panel for approved customers.
- [ ] `/contractor` loads the contractor overview and workflow panel for approved contractors.
- [ ] `/worker` loads the worker dashboard without console or render errors.
- [ ] `/admin` loads admin navigation and operational entry points for admins.
- [ ] Onboarding or pending users are redirected to their setup/pending screen instead of the full workspace.

### Data And Error States

- [ ] Empty dashboard data renders friendly empty states.
- [ ] Loading states render while profile/session checks complete.
- [ ] Failed data loads show non-sensitive error text.
- [ ] No dashboard response exposes secrets, tokens, or raw Supabase errors.
- [ ] Browser console is free of unhandled promise rejections during initial dashboard load.

### Verification Evidence

- [ ] Record preview URL and branch tested.
- [ ] Capture pass/fail notes for each role.
- [ ] Capture screenshots for desktop and mobile widths.
- [ ] Record `npm run build` result for the tested branch.
- [ ] Record any skipped checks and the reason they were skipped.

## Customer Workflow Smoke Test Checklist

Run these checks with a customer test account in the isolated preview workspace.

### Customer Access And Onboarding

- [ ] Signed-out access to `/customer` redirects to `/login`.
- [ ] Non-customer roles are redirected away from `/customer`.
- [ ] A customer without an organization is routed to `/customer/onboarding`.
- [ ] A submitted customer is routed to `/customer/onboarding/pending`.
- [ ] An approved customer can load `/customer` and see the dashboard workflow panel.

### Jobs And Bids

- [ ] `/customer/jobs` redirects to the active jobs view.
- [ ] `/customer/jobs/new` renders the job creation form without client errors.
- [ ] Active and archived job lists render empty states when no jobs exist.
- [ ] Opening a job bid review route does not expose another customer's job data.
- [ ] Bid review links from the customer dashboard resolve to `/customer/bids`.

### Contractors And Requests

- [ ] `/customer/contractors` loads the contractor management area.
- [ ] Approved and all contractor tabs render without overlap on mobile width.
- [ ] `/customer/requests` displays pending contractor requests or a friendly empty state.
- [ ] Approve/reject request actions show a busy state and do not duplicate submissions.
- [ ] Question threads on requests avoid leaking raw IDs beyond expected operational context.

### Resources And Compliance

- [ ] `/customer/resources` lists customer resource records or an empty state.
- [ ] Creating a new resource validates required fields before upload.
- [ ] Resource download/edit routes enforce customer ownership.
- [ ] `/customer/compliance` loads customer compliance controls.
- [ ] Insurance and certificate settings screens render current saved values.

### Customer Error And Security Checks

- [ ] Customer API failures show non-sensitive messages.
- [ ] Browser console has no unhandled promise rejections during customer navigation.
- [ ] Supabase queries return only rows owned by or shared with the current customer.
- [ ] Customer pages do not display service keys, tokens, or internal stack traces.
- [ ] Mobile layout keeps primary customer actions visible and readable.

## Contractor Workflow Smoke Test Checklist

Run these checks with a contractor test account in the isolated preview workspace.

### Contractor Access And Onboarding

- [ ] Signed-out access to `/contractor` redirects to `/login`.
- [ ] Non-contractor roles are redirected away from `/contractor`.
- [ ] A contractor without a company is routed to `/contractor/onboarding`.
- [ ] A submitted contractor is routed to `/contractor/onboarding/pending`.
- [ ] An approved contractor can load `/contractor` and see the workflow panel.

### Company, Compliance, And Profile

- [ ] `/contractor/company` displays legal company data without exposing private auth fields.
- [ ] `/contractor/settings/company` allows a scoped change request path to load.
- [ ] `/contractor/insurance` renders approved, pending, rejected, and empty document states.
- [ ] `/contractor/coi` loads COI controls and validates required upload metadata.
- [ ] `/contractor/certifications` displays team-member certification status without cross-company leakage.

### Teams, Customers, Jobs, And Bids

- [ ] `/contractor/teams` lists crews or an empty state.
- [ ] Team create/change request flows render validation errors before submission.
- [ ] `/contractor/customers` displays customer relationship status for the current contractor only.
- [ ] `/contractor/jobs` lists available jobs and prevents viewing restricted customer data.
- [ ] Bid submission from a job detail validates required fields and shows a clear success/failure state.

### Workforce And HR

- [ ] `/contractor/hr` displays the workforce pipeline and readiness checklist.
- [ ] `/contractor/hr/vacancies` renders vacancies or empty states.
- [ ] `/contractor/hr/workers` renders worker discovery without leaking private worker records.
- [ ] `/contractor/hr/invitations` shows invitation status and avoids duplicate invite actions.
- [ ] HR routes remain hidden or redirected for contractors that should not access them.

### Contractor Error And Security Checks

- [ ] Contractor API failures show non-sensitive messages.
- [ ] Browser console has no unhandled promise rejections during contractor navigation.
- [ ] Supabase queries return only the contractor company, teams, documents, and relationships allowed by RLS.
- [ ] Contractor pages do not display service keys, tokens, or raw stack traces.
- [ ] Mobile layout keeps dashboard, compliance, teams, and HR actions readable.

## Production Readiness Note

The branch is not production-ready solely because tasks are `commit_ready`. Human review, smoke testing, Supabase/RLS verification, Stripe checkout verification, and deployment readiness checks must still pass before release.
