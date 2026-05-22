# Operational Metrics

Task: `TASK-0052`  
Scope: production-readiness metrics for marketplace operations, engineering health, and autonomous agent safety.

## Safety Boundary

- Do not deploy, merge, restart production services, or touch production files.
- Do not collect raw secrets, tokens, signed URLs, payment card data, or private document contents.
- Do not add metrics that require service-role access from user-facing code.
- Treat metrics as aggregate operational signals, not user surveillance.

## Core Marketplace Metrics

- [ ] New customer signups, onboarding starts, onboarding submissions, approvals, and rejections.
- [ ] New contractor signups, onboarding starts, onboarding submissions, approvals, and rejections.
- [ ] Worker invitations, accepted invitations, applications, and availability updates.
- [ ] Job creation, job publication, contractor discovery, bid submissions, bid selections, and archived jobs.
- [ ] Agreement views, acceptances, declines, and stale agreement states.
- [ ] Resource uploads, acknowledgements, signed URL creation failures, and document access failures.
- [ ] Certification, insurance, and COI submission, expiry, renewal, and rejection states.
- [ ] Feedback creation, admin response, unresolved threads, and stale support items.

## Reliability Metrics

- [ ] API request failure counts by route family, status code, role, and area.
- [ ] Client-side error log counts by role, route, area, level, and fingerprint.
- [ ] Server-side error log counts by source, code, status code, area, and fingerprint.
- [ ] Auth/session failure counts for login, signup, reset password, logout, and session refresh.
- [ ] Checkout session creation success, failure, cancellation, and invalid-role attempts.
- [ ] Upload and signed URL success/failure rates.
- [ ] Approval action success/failure rates.
- [ ] Background/secondary widget failures tracked separately from primary workflow failures.

## Agent And Build Metrics

- [ ] Pending, in-progress, blocked, failed, and commit-ready task counts.
- [ ] Latest successful build ID and timestamp.
- [ ] Verification command pass/fail state by task.
- [ ] Task retry counts and blocked-task reasons.
- [ ] Merge-readiness report state and human-review requirement.
- [ ] Autonomous controller stop reason and iteration count.
- [ ] Current branch and clean working tree state before task claim.

## Metric Quality Checklist

- [ ] Every metric has a clear owner or review audience.
- [ ] Every metric has a release-readiness interpretation.
- [ ] Critical metrics distinguish zero activity from failed collection.
- [ ] Metrics use stable names and avoid dynamic user-generated labels.
- [ ] Metrics are grouped by role and workflow without exposing private record contents.
- [ ] Dashboards separate operational facts from recommendations.
- [ ] Metric gaps are tracked as release risks instead of hidden as healthy zeroes.

## Review Cadence

- [ ] Daily during pre-production stabilization: review auth, checkout, uploads, approvals, errors, and build status.
- [ ] Before human merge review: confirm latest build, agent audit, merge-readiness, and task queue state.
- [ ] Before production deployment approval: confirm no open release-blocking metrics or unresolved critical failures.
- [ ] After release: compare primary workflow failures and conversion drop-offs against pre-release baseline.

## Verification Commands

Run after operational metrics changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Operational metrics are ready when the team can evaluate marketplace workflow health, reliability, checkout readiness, upload/document safety, agent queue health, and merge readiness from aggregate, privacy-safe signals.
