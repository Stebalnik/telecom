# Error Recovery

Task: `TASK-0053`  
Scope: safe recovery patterns for user workflows, API routes, background UI, autonomous agent runs, and human release review.

## Safety Boundary

- Do not deploy, merge, restart production services, or touch production files.
- Do not expose raw backend errors, stack traces, secrets, tokens, signed URLs, payment data, or private documents.
- Do not retry destructive operations automatically unless idempotency is explicit.
- Treat unrecoverable auth, checkout, upload, approval, and role-isolation failures as release blockers.

## Recovery Principles

- [ ] Primary workflows fail calmly with a clear next action.
- [ ] Secondary UI fails soft without blocking the page.
- [ ] Retries are bounded and never infinite.
- [ ] Mutations guard against duplicate submits.
- [ ] Recovery paths preserve user-entered data where safe.
- [ ] Error copy distinguishes retryable failures from permission or validation failures.
- [ ] Logs capture enough context for diagnosis without sensitive data.
- [ ] Recovery never bypasses authorization or Supabase/RLS checks.

## User Workflow Recovery

- [ ] Auth/session failures route users to login or reset flow with non-technical copy.
- [ ] Onboarding submission failures preserve form state and allow retry.
- [ ] Job creation failures preserve entered job details and attachments that are safe to retry.
- [ ] Bid submission failures preserve pricing, scope, and notes while preventing duplicate bids.
- [ ] Approval action failures leave the request in its previous state and show a retry-safe message.
- [ ] Checkout creation failures do not create duplicate sessions without user confirmation.
- [ ] Upload failures identify whether retry should restart upload, request a new signed URL, or contact support.
- [ ] Feedback/message failures preserve draft content and avoid duplicate sends.

## API Recovery Checklist

- [ ] API routes return consistent success/error envelopes.
- [ ] Validation failures return 400 with safe field-level guidance where possible.
- [ ] Unauthorized failures return 401 and do not imply record existence.
- [ ] Forbidden failures return 403 and do not expose RLS internals.
- [ ] Not-found failures return 404 without leaking ownership details.
- [ ] Server failures return safe user-facing messages and structured server logs.
- [ ] Retryable upstream failures are identified separately from permanent failures.
- [ ] Mutating endpoints document idempotency expectations.

## Autonomous Agent Recovery

- [ ] Failed verification writes a clear reason to `reports/agents/current-task-verification.json`.
- [ ] Completion marks failed tasks accurately and preserves retry history.
- [ ] Blocked tasks include a human-readable reason and archived current-task record.
- [ ] Controller mode stops on dirty working tree, wrong branch, missing packet, or missing current task.
- [ ] Build failures generate enough report context for safe correction.
- [ ] Auto-push happens only after verification, build, commit, and branch checks pass.

## Human Triage Checklist

- [ ] Identify whether the failure is user-impacting, admin-only, secondary UI, or agent-only.
- [ ] Confirm whether data was written, partially written, or not written.
- [ ] Confirm whether retry is safe, requires cleanup, or requires manual support.
- [ ] Confirm whether the issue is code, data, configuration, auth, RLS, or provider-related.
- [ ] Record affected route family, role, workflow, error fingerprint, and recovery action.
- [ ] Verify recovery in preview before any production approval.

## Verification Commands

Run after error recovery changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Error recovery is ready when primary marketplace workflows fail safely, preserve recoverable user work, prevent duplicate mutations, distinguish auth/permission/not-found/server outcomes, and leave clear operational traces for human triage.
