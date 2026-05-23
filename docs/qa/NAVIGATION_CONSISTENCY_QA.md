# Navigation Consistency QA

Task: `TASK-0045`  
Scope: public, auth, shared dashboard, customer, contractor, worker, and admin navigation behavior.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record screenshots containing secrets, private documents, payment data, or personal data.
- Treat broken protected navigation or cross-role navigation leakage as release blockers.

## Layout Coverage

- `app/layout.tsx`
- `app/(app)/layout.tsx`
- `app/customer/layout.tsx`
- `app/contractor/layout.tsx`
- `app/worker/layout.tsx`
- `app/admin/layout.tsx`

## Public And Auth Navigation

- [ ] Public home links reach login, signup, mission, privacy, and terms where shown.
- [ ] Login page links to signup and forgot-password flows where expected.
- [ ] Signup page links back to login where expected.
- [ ] Forgot-password and reset-password pages provide a clear path back to login.
- [ ] Logout clears session and does not leave protected navigation visible after refresh.
- [ ] Public legal routes do not expose protected role navigation.

## Shared Dashboard Navigation

- [ ] `/dashboard` routes users toward the correct role workspace.
- [ ] Dashboard primary actions do not duplicate or contradict role-specific navigation.
- [ ] Support/checkout actions remain separate from marketplace workflow navigation.
- [ ] Users with missing or expired session are routed safely to login.

## Customer Navigation

- [ ] Customer dashboard links to jobs, bids, contractors, requests, resources, settings, agreements, and compliance.
- [ ] Customer nested job pages provide a clear path back to jobs.
- [ ] Customer contractor discovery and approved roster links are distinct.
- [ ] Customer resource create/edit/detail pages provide clear parent navigation.
- [ ] Customer settings subpages link back to settings or customer dashboard.
- [ ] Non-customer roles cannot use customer navigation to view customer pages.

## Contractor Navigation

- [ ] Contractor dashboard links to jobs, bids, customers, resources, agreements, certifications, insurance, COI, teams, and HR.
- [ ] Contractor onboarding and pending pages do not imply access to approved-only pages.
- [ ] Contractor job detail and bid flows provide a clear return path.
- [ ] Contractor customer resource views return to customer list.
- [ ] Contractor team and HR subpages provide parent navigation.
- [ ] Non-contractor roles cannot use contractor navigation to view contractor pages.

## Worker Navigation

- [ ] Worker dashboard links to profile, availability, vacancies, applications, invitations, certifications, and insurance.
- [ ] Worker document pages provide clear return paths.
- [ ] Worker application and invitation flows distinguish active actions from historical state.
- [ ] Non-worker roles cannot use worker navigation to view worker pages.

## Admin Navigation

- [ ] Admin dashboard links to approvals, analytics, feedback, errors, and change requests.
- [ ] Admin detail pages provide a clear return path to the parent list.
- [ ] Admin analytics segment pages provide a clear return path to analytics overview.
- [ ] Non-admin roles cannot use admin navigation to view admin pages.

## Responsive And Accessibility Checks

- [ ] Navigation is reachable at 320px, 390px, 768px, and desktop widths.
- [ ] Active route indication remains readable and does not rely on color alone.
- [ ] Keyboard focus is visible on navigation links.
- [ ] Link text is descriptive enough outside visual context.
- [ ] Navigation tap targets are not cramped on mobile.

## Verification Commands

Run after navigation changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Navigation consistency QA is complete only when public, auth, dashboard, customer, contractor, worker, and admin route families have clear forward/back paths, role-safe visibility, mobile reachability, and no broken links.
