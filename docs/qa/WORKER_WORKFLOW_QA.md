# Worker Workflow QA

Task: `TASK-0037`  
Scope: worker onboarding-adjacent profile, availability, applications, invitations, and compliance workflows.

## Safety Boundary

- Execute QA only in the isolated workspace or preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record private worker documents, signed URLs, tokens, or secrets.
- Treat cross-worker or cross-contractor data exposure as a release blocker.

## Route Coverage

- `/worker`
- `/worker/profile`
- `/worker/availability`
- `/worker/vacancies`
- `/worker/applications`
- `/worker/invitations`
- `/worker/certifications`
- `/worker/insurance`

## Core Workflow Checklist

- [ ] Worker can sign in and land on `/worker` without role leakage.
- [ ] Worker dashboard links to profile, vacancies, applications, invitations, certifications, insurance, and availability.
- [ ] Profile page validates required personal, contact, market, and preference fields.
- [ ] Profile save confirms success and preserves entered values after reload.
- [ ] Availability page enables only for part-time, temporary, project-based, or contract preferences.
- [ ] Availability page supports weekdays, all days, clear days, market selection, and time notes.
- [ ] Availability save handles missing session, Supabase error, and success states clearly.
- [ ] Vacancy list shows available contractor vacancies with useful empty and loading states.
- [ ] Vacancy detail or action flow allows workers to apply only when eligible.
- [ ] Applications page separates submitted, reviewed, accepted, rejected, or withdrawn states when available.
- [ ] Invitations page shows contractor invitations with accept/decline state feedback.
- [ ] Certification upload validates certificate type, expiration date, and file attachment.
- [ ] Certification list shows verification status and expiration date.
- [ ] Insurance upload validates insurance type, expiration date, and file attachment.
- [ ] Insurance list shows verification status and expiration date.
- [ ] Worker agreement route remains reachable from relevant onboarding or dashboard surfaces when applicable.

## Security And Permission Checks

- [ ] Customer, contractor, guest, and admin accounts are redirected away from worker-only routes.
- [ ] Worker cannot view another worker's profile, documents, applications, invitations, or availability.
- [ ] Worker cannot apply to vacancies hidden from their market, role, or eligibility context.
- [ ] Worker document uploads are scoped to the authenticated worker identity server-side.
- [ ] File access uses scoped authorization and does not rely on guessed storage paths.
- [ ] Hidden UI controls are not the only protection for worker-only actions.

## UX And State Checks

- [ ] Every worker list page has a useful empty state.
- [ ] Loading states appear while profile, application, invitation, and document data loads.
- [ ] Error messages are safe, actionable, and do not expose raw backend details.
- [ ] Save/upload buttons show disabled or busy states during requests.
- [ ] Status badges include text labels and remain readable on mobile.
- [ ] Worker navigation and form layouts fit mobile and desktop widths.
- [ ] Keyboard focus is visible on links, buttons, inputs, selects, and upload controls.

## Verification Commands

Run after worker workflow changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Worker workflow QA is complete only after each route is tested with an authorized worker account, at least one unauthorized role account, empty-data conditions, and one failed write or upload path.
