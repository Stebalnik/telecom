# Deployment Safety Checks

Task: `TASK-0058`  
Scope: pre-production deployment safety gates for human release review and local automation safeguards.

## Safety Boundary

- Autonomous agents must not deploy, merge main, restart production PM2, or touch production files.
- Production deployment is manual until explicitly enabled by a human operator.
- `scripts/release_auto.sh` must skip remote deployment unless `ALLOW_PRODUCTION_DEPLOY=1`.
- `SKIP_DEPLOY=1` remains the safest default for dry-run release validation.
- Treat any script that can deploy without an explicit human-controlled gate as a release blocker.

## Required Pre-Deployment Checks

- [ ] Current branch is reviewed and approved for release.
- [ ] Working tree is clean before release commands run.
- [ ] `npm run agents:verify` passes.
- [ ] `npm run agents:self-verify` passes.
- [ ] `npm run build` passes.
- [ ] Agent audit has no failed, blocked, or in-progress tasks.
- [ ] Merge-readiness report requires human review and keeps runner-side merge disabled.
- [ ] Route impact review is complete.
- [ ] Security review is complete.
- [ ] Supabase/RLS review is complete if backend, database, or data-access files changed.
- [ ] Stripe checkout review is complete if checkout, payment, or pricing files changed.

## Release Script Safeguards

- [ ] Remote deployment is skipped when `SKIP_DEPLOY=1`.
- [ ] Remote deployment is skipped when `ALLOW_PRODUCTION_DEPLOY` is unset or not `1`.
- [ ] SSH readiness checks only run when deployment is both not skipped and explicitly allowed.
- [ ] Deployment command and host are never printed with secrets.
- [ ] Tags and pushes remain visible in git history for human review.
- [ ] The autonomous runner does not call release or deployment scripts.

## Human Approval Gate

- [ ] Human reviewer confirms the exact commit being released.
- [ ] Human reviewer confirms rollback plan.
- [ ] Human reviewer confirms environment variables and provider configuration are ready.
- [ ] Human reviewer confirms no secrets are present in changed files or reports.
- [ ] Human reviewer explicitly enables deployment only when ready.
- [ ] Human reviewer monitors auth, checkout, uploads, approvals, and error logs after release.

## Verification Commands

Run after deployment safety changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Deployment safety is ready when automation can validate and prepare a release without deploying, and production deployment requires an explicit human-controlled environment gate plus successful verification, build, security, route, and RLS reviews.
