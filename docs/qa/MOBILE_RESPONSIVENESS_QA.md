# Mobile Responsiveness QA

Task: `TASK-0044`  
Scope: mobile and tablet usability across public, auth, customer, contractor, worker, admin, and shared workflow surfaces.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not capture screenshots containing secrets, private documents, payment details, or personal data.
- Treat clipped primary actions, unreadable text, or inaccessible protected navigation as release blockers.

## Viewport Coverage

- [ ] 320px wide phone viewport.
- [ ] 360px wide phone viewport.
- [ ] 390px wide phone viewport.
- [ ] 430px wide large-phone viewport.
- [ ] 768px tablet viewport.
- [ ] 1024px small desktop/tablet landscape viewport.
- [ ] Desktop viewport remains unchanged after mobile fixes.

## Route Family Coverage

- [ ] Public landing, mission, privacy, and terms routes.
- [ ] Auth routes: login, signup, forgot password, reset password, logout.
- [ ] Shared dashboard route.
- [ ] Customer dashboard, jobs, bids, contractors, requests, resources, settings, agreements, and compliance.
- [ ] Contractor dashboard, onboarding, jobs, bids, customers, resources, agreements, certifications, insurance, teams, and HR.
- [ ] Worker dashboard, profile, availability, vacancies, applications, invitations, certifications, and insurance.
- [ ] Admin dashboard, approvals, analytics, errors, feedback, and change requests.

## Layout Checklist

- [ ] Page title and primary action remain visible without horizontal scrolling.
- [ ] Cards stack cleanly and do not nest into cramped layouts.
- [ ] Filter bars wrap cleanly and do not overflow.
- [ ] Tables or table-like lists collapse into readable cards or scroll intentionally.
- [ ] Long file names, event names, company names, emails, and paths wrap without breaking containers.
- [ ] Form controls span usable width on small screens.
- [ ] Buttons do not clip text at common mobile widths.
- [ ] Sticky or fixed elements do not cover form fields, messages, or actions.
- [ ] Empty, loading, success, and error states fit inside their containers.

## Navigation Checklist

- [ ] Role navigation is reachable on mobile.
- [ ] Back links and parent navigation remain visible.
- [ ] Tap targets are large enough for primary navigation and actions.
- [ ] Active route indication remains readable.
- [ ] Multi-level role sections do not trap users on narrow screens.
- [ ] Logout remains reachable without exposing protected content after session end.

## Form And Workflow Checklist

- [ ] Onboarding forms can be completed on mobile.
- [ ] File upload controls are usable on mobile browsers.
- [ ] Date, select, checkbox, and textarea controls have enough spacing.
- [ ] Validation messages appear near the relevant field.
- [ ] Submit buttons remain visible after validation errors.
- [ ] Busy states prevent duplicate taps.
- [ ] Checkout redirection can be started from mobile without double-submit confusion.

## Accessibility And Visual Checks

- [ ] Text remains readable without viewport-based font scaling.
- [ ] Status badges include text and wrap as needed.
- [ ] Focus rings are visible on mobile keyboards and tablet keyboards.
- [ ] Color contrast remains strong for primary buttons, links, and status states.
- [ ] Touch targets are not too close together in dense lists.

## Verification Commands

Run after mobile responsiveness changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Mobile responsiveness QA is complete only when route families are checked at the listed viewport widths, no unintended horizontal scrolling is present, primary actions remain reachable, and any route-specific defects are fixed or tracked as release blockers.
