# Customer Workflow QA

Task: `TASK-0035`  
Scope: customer-facing marketplace workflows in the isolated workspace branch.

## Safety Boundary

- Do not deploy, merge, or touch production while executing this checklist.
- Use preview or local workspace runtime only.
- Do not expose customer, contractor, payment, or Supabase secrets in notes.
- Treat role and ownership failures as release blockers.

## Route Coverage

- `/customer`
- `/customer/onboarding`
- `/customer/onboarding/pending`
- `/customer/jobs`
- `/customer/jobs/new`
- `/customer/jobs/active`
- `/customer/jobs/archive`
- `/customer/bids`
- `/customer/bids/[jobId]`
- `/customer/contractors`
- `/customer/contractors/all`
- `/customer/contractors/approved`
- `/customer/requests`
- `/customer/resources`
- `/customer/resources/new`
- `/customer/resources/[id]`
- `/customer/resources/[id]/edit`
- `/customer/settings`
- `/customer/settings/insurance`
- `/customer/settings/certs-per-scope`
- `/customer/agreements`
- `/customer/compliance`

## Core Workflow Checklist

- [ ] Customer can sign in and land on `/customer` without role leakage.
- [ ] New customer onboarding shows required company fields and blocks incomplete submission.
- [ ] Pending onboarding state explains next steps and prevents access confusion.
- [ ] Customer dashboard links reach jobs, contractors, bids, resources, requests, agreements, settings, and compliance.
- [ ] Job creation validates title, scope, market, budget, timing, and required contractor expectations.
- [ ] Jobs list separates draft, active, and archived work clearly.
- [ ] Active job details expose bid status and contractor activity without stale action labels.
- [ ] Archived jobs are readable but do not expose active-job actions.
- [ ] Bid review page shows contractor identity, price, schedule, scope, and approval readiness.
- [ ] Contractor discovery supports all, verified, requirements, and onboarded filtering.
- [ ] Approved contractors list is reachable and separates approved roster from discovery.
- [ ] Approval requests show pending, ready, insurance, and question states.
- [ ] Resource library search covers title, description, revision, market, category, and file name.
- [ ] Resource upload validates file, title, category, requirement flag, and market scope.
- [ ] Resource edit preserves existing file metadata and updates only intended fields.
- [ ] Insurance settings show required coverage fields and clear save feedback.
- [ ] Certification settings by scope show required certs and prevent ambiguous empty selections.
- [ ] Agreements workflow shows active templates, awaiting signatures, signed records, and manual uploads.
- [ ] Compliance hub links to the live customer compliance surfaces.

## Empty, Loading, And Error States

- [ ] Every customer list page has a useful empty state.
- [ ] Long-running customer data loads show loading text or disabled actions.
- [ ] Failed Supabase/API reads show non-sensitive error messages.
- [ ] Failed writes preserve form input where practical.
- [ ] Disabled buttons communicate saving, opening, or uploading state.

## Security And Role Isolation

- [ ] Contractor, worker, guest, and admin accounts are redirected away from customer-only routes.
- [ ] Customer cannot view another customer's jobs, resources, agreements, requests, settings, or contractors.
- [ ] Signed resource URLs are generated only for authorized customer-owned resources.
- [ ] File upload routes require an authenticated customer session.
- [ ] Settings changes are scoped to the current customer record.
- [ ] Customer pages do not rely on hidden buttons as the only authorization control.

## Responsive And Accessibility Pass

- [ ] Customer navigation works on mobile and desktop widths.
- [ ] Tables, cards, and filters remain readable at narrow widths.
- [ ] Inputs have visible labels or clear accessible names.
- [ ] Focus states are visible for buttons, links, selects, inputs, and upload controls.
- [ ] Status badges use text, not color alone, to communicate state.

## Verification Commands

Run after customer workflow changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Customer workflow QA is complete only when all checklist items are either passing or documented with a tracked follow-up, and the build is green.
