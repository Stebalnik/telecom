# Empty-State QA

Task: `TASK-0046`  
Scope: customer, contractor, worker, admin, public, auth, and shared workflow surfaces that can render with no records, no access, no search results, or no configured data.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not create production data to manufacture empty states.
- Do not expose secrets, payment details, private documents, or personal data in screenshots or notes.
- Treat misleading calls to action, cross-role data leakage, or empty states that hide required next steps as release blockers.

## Empty-State Categories

- [ ] First-use state for a newly approved customer, contractor, worker, or admin account.
- [ ] No-records state for list, table, card grid, and dashboard summary surfaces.
- [ ] No-results state after search, filter, tab, or segment changes.
- [ ] No-access state for role-gated, approval-gated, or permission-gated surfaces.
- [ ] Configuration-missing state for settings-driven workflows.
- [ ] Archived, inactive, cancelled, rejected, expired, or completed-only state where no active work remains.
- [ ] Error state remains visually distinct from a valid empty state.

## Customer Workflow Coverage

- [ ] Customer dashboard explains next steps when no jobs, bids, contractors, requests, resources, agreements, or compliance items exist.
- [ ] Job lists distinguish no active jobs, no archived jobs, and no matching filtered jobs.
- [ ] Job detail linked empty states guide users back to job creation or parent lists.
- [ ] Bid pages explain when no contractors have submitted bids and do not imply hidden bid data.
- [ ] Contractor discovery distinguishes no approved contractors from no search results.
- [ ] Resource pages explain how to upload or create the first resource.
- [ ] Settings and compliance pages identify missing certification, insurance, or scope requirements.

## Contractor Workflow Coverage

- [ ] Contractor dashboard explains next steps when no jobs, bids, customers, resources, agreements, certifications, insurance, teams, or HR records exist.
- [ ] Marketplace/job pages distinguish no available jobs from no matching filters.
- [ ] Bid submission surfaces guide the contractor when there are no eligible jobs.
- [ ] Customer resource pages explain when a customer has shared no resources.
- [ ] Team and HR lists distinguish no teams, no workers, no vacancies, no applications, and no invitations.
- [ ] Certification, insurance, and COI pages clearly identify missing documents and renewal states.
- [ ] Onboarding or pending approval states do not expose approved-only empty dashboards as usable workflows.

## Worker Workflow Coverage

- [ ] Worker dashboard explains next steps when no invitations, vacancies, applications, certifications, insurance, or availability records exist.
- [ ] Applications distinguish no submitted applications from no matching status filters.
- [ ] Invitation pages distinguish no invitations, expired invitations, and accepted invitations.
- [ ] Vacancy pages explain when no eligible vacancies are available.
- [ ] Profile, availability, certification, and insurance pages identify missing setup steps.

## Admin Workflow Coverage

- [ ] Admin dashboard handles no pending approvals, no feedback, no errors, no change requests, and no analytics events.
- [ ] Approval queues distinguish empty pending queues from failed data loading.
- [ ] Feedback and message threads explain when there are no messages yet.
- [ ] Error monitoring pages distinguish no logged errors from filtered-out errors.
- [ ] Analytics pages show neutral zero-data states without fabricated trends or percentages.
- [ ] Change request detail pages provide a safe parent route when records are missing or inaccessible.

## UI And Content Checklist

- [ ] Empty-state title is specific to the surface and does not overpromise.
- [ ] Body copy explains why the surface is empty in plain language.
- [ ] Primary action is present only when the user can actually take that action.
- [ ] Secondary navigation returns users to a safe parent workflow.
- [ ] Empty-state icons or illustrations are decorative only and do not replace text.
- [ ] Copy does not reveal whether another role has private records.
- [ ] Empty states fit at 320px, 390px, tablet, and desktop widths.
- [ ] Empty-state buttons and links have visible focus states and descriptive accessible names.

## Backend And Security Checks

- [ ] API-backed empty states render from valid empty arrays or null-safe summaries.
- [ ] 401, 403, 404, and 500 responses do not collapse into the same empty-state message.
- [ ] Supabase RLS-denied data is not represented as "no records" when access is the real issue.
- [ ] Empty states do not require unsafe service-role data access.
- [ ] Client-side filtering does not expose hidden records before displaying a no-results state.

## Verification Commands

Run after empty-state changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Empty-state QA is complete only when every role workflow has clear first-use, no-records, no-results, no-access, and error-distinct states with role-safe copy, reachable next actions, and no misleading zero-data behavior.
