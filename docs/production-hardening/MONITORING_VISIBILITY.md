# Monitoring Visibility

Task: `TASK-0051`  
Scope: production-readiness monitoring visibility for the LEOTEOR Telecom Marketplace without enabling deployment or changing production runtime.

## Safety Boundary

- Do not deploy, merge, restart production services, or touch production files.
- Do not expose secrets, raw auth tokens, payment identifiers, private documents, or personal data in monitoring views.
- Do not add monitoring that depends on service-role access from user-facing routes.
- Treat missing visibility for auth, checkout, approvals, uploads, and role isolation as a release risk.

## Required Monitoring Surfaces

- [ ] Admin error log view shows source, area, level, status code, code, path, role, timestamp, and fingerprint.
- [ ] Build and verification reports show latest successful build ID, task ID, finished timestamp, and command outcomes.
- [ ] Agent audit reports show pending, in-progress, failed, blocked, and commit-ready counts.
- [ ] Merge-readiness reports show human-review status and explicitly state that runner-side merge is disabled.
- [ ] API error logs group repeated failures by fingerprint.
- [ ] Checkout creation failures are visible without exposing provider secrets.
- [ ] Supabase/RLS failures are visible as permission failures without leaking protected records.
- [ ] Upload and signed URL failures are visible without logging signed URL values.

## Signal Inventory

- [ ] Authentication: login, signup, password reset, logout, session expiry, role resolution.
- [ ] Customer workflows: job creation, bid review, contractor discovery, resources, compliance, agreements.
- [ ] Contractor workflows: onboarding, bids, documents, teams, HR, customer resources, agreements.
- [ ] Worker workflows: profile, availability, applications, invitations, documents.
- [ ] Admin workflows: approvals, feedback, errors, analytics, change requests.
- [ ] Payments: checkout session creation, redirect failures, cancelled checkout, invalid role attempts.
- [ ] Background or secondary UI: badge counts, dashboard summaries, analytics panels, optional refreshes.

## Dashboard Review Checklist

- [ ] Operational dashboards separate user-impacting failures from low-priority secondary UI failures.
- [ ] Filters support source, role, area, level, status code, and time range.
- [ ] Failure groups include a stable fingerprint and last-seen timestamp.
- [ ] Latest build/verification state is visible before any human merge review.
- [ ] Monitoring pages have empty, loading, error, and no-results states.
- [ ] Monitoring pages are admin-only and fail closed for all other roles.
- [ ] Sensitive details are redacted before storage and display.

## Alerting Readiness Checklist

- [ ] Critical auth, checkout, upload, approval, and role-isolation failures have clear alert candidates.
- [ ] Repeated identical failures can be grouped to avoid alert fatigue.
- [ ] Secondary UI failures are tracked at lower severity unless they affect primary workflows.
- [ ] Alert candidates include owner, severity, suggested triage action, and rollback/escalation path.
- [ ] Alerts never include secrets, signed URLs, raw database errors, or private user content.

## Verification Commands

Run after monitoring visibility changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Monitoring visibility is sufficient only when admins can distinguish primary workflow failures, security-sensitive failures, secondary UI noise, build readiness, and agent queue health without exposing sensitive data.
