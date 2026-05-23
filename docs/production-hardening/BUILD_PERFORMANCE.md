# Build Performance

Task: `TASK-0056`  
Scope: local and CI build performance practices for the Next.js marketplace workspace.

## Safety Boundary

- Do not deploy, merge, restart production services, or touch production files.
- Do not disable TypeScript, lint, route generation, security checks, or verification to make builds appear faster.
- Do not remove user-facing functionality, API coverage, or role-isolation checks for build speed.
- Treat skipped verification, hidden type errors, or unreviewed build config changes as release blockers.

## Current Build Baseline

- Framework: Next.js 16 with Turbopack build.
- Required command: `npm run build`.
- Required agent verification path: `npm run agents:verify`, `npm run agents:self-verify`, `npm run build`.
- Build output should include successful compilation, TypeScript validation, page data collection, and static page generation.
- Latest successful build ID is recorded in `reports/agents/agent-progress-audit.json`.

## Measurement Checklist

- [ ] Record wall-clock duration for `npm run build` before and after meaningful build-related changes.
- [ ] Record whether compilation, TypeScript, page data, or static generation dominates build time.
- [ ] Record route count from build output.
- [ ] Record latest build ID and timestamp from agent audit.
- [ ] Compare cold build and warm build separately.
- [ ] Keep build timing notes out of production secrets or environment values.

## Safe Optimization Targets

- [ ] Remove unused imports, dead components, and unreachable route code during normal feature work.
- [ ] Keep heavyweight server-only code out of client components.
- [ ] Avoid importing broad modules into shared layouts when route-specific imports are sufficient.
- [ ] Keep API/provider SDK usage server-side when client bundles do not need it.
- [ ] Prefer route-local data helpers over global imports that force large dependency graphs.
- [ ] Keep generated reports and docs outside runtime import paths.
- [ ] Preserve TypeScript incremental build support.

## Unsafe Optimization Patterns

- [ ] Do not set `ignoreBuildErrors` or equivalent type-check bypasses.
- [ ] Do not bypass lint/build verification in agent completion.
- [ ] Do not remove protected route checks to reduce static generation work.
- [ ] Do not cache secrets, signed URLs, provider responses, or private documents in build artifacts.
- [ ] Do not change production deployment settings from the autonomous runner.
- [ ] Do not make build behavior depend on unreviewed local-only environment variables.

## Review Checklist

- [ ] Build remains deterministic on the workspace branch.
- [ ] Build still succeeds after clearing `.next` when validating major build changes.
- [ ] Route output does not unexpectedly drop protected or public routes.
- [ ] TypeScript errors are fixed rather than suppressed.
- [ ] Static generation does not call production-only services during local validation.
- [ ] Build performance changes include notes on expected impact and rollback path.

## Verification Commands

Run after build performance changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Build performance is ready when build time is measured, obvious dependency and import bloat is avoided, verification remains complete, route output is stable, and no optimization weakens type safety, security, or role isolation.
