# Contractor Workflow QA

Task: `TASK-0036`  
Scope: contractor company, bidding, compliance, resources, and workforce workflows.

## Safety Boundary

- Run QA only in the isolated workspace or preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record secrets, access tokens, private document URLs, or payment credentials.
- Treat cross-company access as a release blocker.

## Route Coverage

- `/contractor`
- `/contractor/onboarding`
- `/contractor/onboarding/company`
- `/contractor/onboarding/pending`
- `/contractor/company`
- `/contractor/company/change-request`
- `/contractor/settings/company`
- `/contractor/jobs`
- `/contractor/jobs/[id]`
- `/contractor/bids`
- `/contractor/customers`
- `/contractor/customers/[customerId]/resources`
- `/contractor/requests`
- `/contractor/resources`
- `/contractor/agreements`
- `/contractor/certifications`
- `/contractor/insurance`
- `/contractor/coi`
- `/contractor/teams`
- `/contractor/teams/new`
- `/contractor/teams/change-request`
- `/contractor/teams/requests`
- `/contractor/hr`
- `/contractor/hr/invitations`
- `/contractor/hr/vacancies`
- `/contractor/hr/workers`

## Core Workflow Checklist

- [ ] Contractor can sign in and land on `/contractor` without role leakage.
- [ ] Draft contractor is routed to onboarding and cannot bypass required company steps.
- [ ] Company onboarding validates legal name, contact, market, and profile fields.
- [ ] Pending onboarding page explains review state and prevents duplicate submission confusion.
- [ ] Company profile view reflects approved company data.
- [ ] Company change request flow validates requested changes and communicates pending review.
- [ ] Contractor jobs list shows available work with clear empty and loading states.
- [ ] Job detail page shows bid readiness, scope, customer approval state, schedule, and price entry.
- [ ] Bid submission blocks incomplete required fields and confirms submitted state.
- [ ] Bids list distinguishes draft, submitted, accepted, rejected, and withdrawn states when present.
- [ ] Customer list shows only customers connected to the contractor company.
- [ ] Customer resource access requires an approved customer relationship.
- [ ] Contractor requests page shows approval request status and next action.
- [ ] Contractor resources page links to customer-scoped resources without exposing unrelated files.
- [ ] Agreements page shows pending, signed, and active agreements with customer identity.
- [ ] Certifications page supports team/member selection, upload, review status, and deletion.
- [ ] Insurance page supports type selection, expiration date, upload, status, and deletion.
- [ ] COI page supports upload/open flow and communicates missing insurance clearly.
- [ ] Team creation validates required fields and assigns members safely.
- [ ] Team change requests and team requests show pending/reviewed states.
- [ ] HR dashboard links to invitations, vacancies, and workers.
- [ ] Vacancy creation/listing supports empty, loading, and failure states.
- [ ] Worker roster shows active workers without exposing workers from other contractors.

## Security And Permission Checks

- [ ] Customer, worker, guest, and admin accounts are redirected away from contractor-only routes.
- [ ] Contractor cannot access another contractor company's profile, teams, workers, insurance, certifications, bids, agreements, or resources.
- [ ] File open/download actions use scoped signed URLs and do not expose storage paths as authorization.
- [ ] API-backed contractor actions verify authenticated identity and company ownership server-side.
- [ ] Hidden buttons are not the only protection for restricted contractor actions.

## UX And State Checks

- [ ] Each list page has empty, loading, success, and error states.
- [ ] Forms preserve user input after validation errors where practical.
- [ ] Save/upload/open buttons communicate busy state and prevent duplicate submission.
- [ ] Status badges use readable text and not color alone.
- [ ] Contractor navigation works across desktop and mobile widths.
- [ ] Error messages are useful but do not expose raw Supabase or storage details.

## Verification Commands

Run after contractor workflow changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Contractor workflow QA is complete only when each route above has been exercised with an authorized contractor account, an unauthorized role account, and at least one empty or missing-data condition.
