# Accessibility QA

Task: `TASK-0048`  
Scope: public, auth, customer, contractor, worker, admin, shared dashboard, and API-backed workflow surfaces.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not include secrets, payment details, private documents, or personal data in accessibility notes or screenshots.
- Do not use production users to test accessibility flows.
- Treat inaccessible primary actions, keyboard traps, unreadable status messages, or role-leaking assistive text as release blockers.

## Baseline Accessibility Coverage

- [ ] Pages expose one clear top-level heading.
- [ ] Heading levels follow a logical order.
- [ ] Landmarks identify header, navigation, main content, forms, and footer where applicable.
- [ ] Links have descriptive text outside visual context.
- [ ] Buttons describe the action they perform.
- [ ] Icon-only controls include accessible names.
- [ ] Decorative icons and imagery are hidden from assistive technology.
- [ ] Dynamic status messages are announced where needed.
- [ ] Color is not the only way to understand status, errors, active routes, or required actions.

## Keyboard And Focus Checklist

- [ ] Every interactive control is reachable by keyboard.
- [ ] Focus order follows visual and workflow order.
- [ ] Focus rings are visible on links, buttons, tabs, fields, menus, and dialogs.
- [ ] Skip or direct navigation is available where repeated navigation blocks are long.
- [ ] Modal, drawer, menu, and dialog focus is contained and restored correctly.
- [ ] Disabled controls are not focusable unless they provide necessary explanation.
- [ ] Loading and submit states do not strand focus.
- [ ] Error summaries or field errors are reachable after failed submission.

## Forms And Validation Checklist

- [ ] Labels are programmatically associated with inputs, selects, textareas, checkboxes, and radio controls.
- [ ] Required fields are indicated in text or accessible metadata.
- [ ] Validation errors identify the field and the correction needed.
- [ ] File upload controls explain accepted file types, size limits, and upload state.
- [ ] Date, amount, phone, address, certification, insurance, and availability fields expose clear input expectations.
- [ ] Success, pending, failed, and retry states are announced for submit actions.
- [ ] Forms preserve user-entered values after recoverable validation failures.

## Role Workflow Coverage

- [ ] Customer job creation, bid review, contractor discovery, resources, settings, compliance, and agreement flows are keyboard and screen-reader usable.
- [ ] Contractor onboarding, bid submission, customer resources, certifications, insurance, teams, HR, and agreement flows are keyboard and screen-reader usable.
- [ ] Worker profile, availability, vacancies, applications, invitations, certifications, and insurance flows are keyboard and screen-reader usable.
- [ ] Admin approvals, analytics, feedback, errors, and change request workflows are keyboard and screen-reader usable.
- [ ] Auth, logout, reset-password, and protected route redirects remain understandable to assistive technology.

## Tables, Lists, And Dashboards

- [ ] Tables have meaningful headers and captions or nearby context.
- [ ] Card lists expose item names, status, and primary actions in a predictable order.
- [ ] Dashboard metrics include labels and do not rely on position or color alone.
- [ ] Status badges include readable text.
- [ ] Pagination, tabs, filters, and search controls announce current state.
- [ ] Empty, loading, and error states are distinct and accessible.
- [ ] Analytics visualizations include text summaries or accessible equivalents.

## Mobile And Responsive Accessibility

- [ ] Touch targets are large enough and not crowded at 320px, 390px, tablet, and desktop widths.
- [ ] Text remains readable without viewport-based font scaling.
- [ ] Zoom to 200 percent does not hide primary actions or required status text.
- [ ] Mobile navigation remains reachable by keyboard and touch.
- [ ] Sticky elements do not obscure focused controls, validation messages, or submit actions.
- [ ] Orientation changes do not lose form state or workflow context.

## Security And Privacy Checks

- [ ] Accessible names and descriptions do not expose hidden IDs, internal errors, secrets, or private data.
- [ ] Role-gated controls are not announced to unauthorized users.
- [ ] RLS-denied, unauthorized, forbidden, and not-found states have distinct accessible messages.
- [ ] Payment and checkout states do not expose raw provider session details.
- [ ] Error details are useful to users without leaking implementation internals.

## Verification Commands

Run after accessibility changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Accessibility QA is complete only when primary marketplace workflows can be completed with keyboard and assistive technology, status and validation states are understandable, responsive layouts remain usable, and no protected data is exposed through accessible text.
