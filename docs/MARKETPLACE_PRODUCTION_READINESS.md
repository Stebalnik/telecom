# Marketplace Production Readiness

This document tracks the production-readiness review backlog for the LEOTEOR Telecom Marketplace. It is intended for human review before any production deployment or merge to `main`.

## Commit Ready Capability Summary

The current generated queue preserves 15 `commit_ready` tasks. These tasks established the safe agent development system and delivered the first marketplace workflow expansions.

| Task | Implemented capability | Review notes |
| --- | --- | --- |
| TASK-0001 | Safe agent task orchestration foundation with execution rules, queue format, progress tracking, architecture documentation, and placeholder agent library types. | Documentation and local scripts only; no production runtime or deployment behavior. |
| TASK-0002 | Deterministic task execution loop for claiming one pending task, verifying it, completing it, and reporting status. | Runner uses local queue files and allowlisted commands only. |
| TASK-0003 | Branch and workspace isolation guard for agent execution. | Protects against running from production paths or protected branches. |
| TASK-0004 | Agent self-verification pipeline. | Checks branch isolation, current task state, implementation packet consistency, and safe verification metadata. |
| TASK-0005 | Merge readiness reporting. | Produces human-review readiness signals but does not merge or deploy. |
| TASK-0006 | Safe implementation packet and coding loop reports. | Codex receives task-scoped prompts; no AI API calls or automatic code execution from task text. |
| TASK-0007 | Improved deterministic task claiming. | Claiming is priority-aware, dependency-aware, and records claim metadata. |
| TASK-0008 | Retry handling for failed task verification. | A first verification failure returns a task to `pending`; repeated failures can be blocked for manual review. |
| TASK-0009 | Architecture review report generation. | Provides advisory route, security, and file-impact notes for the current packet. |
| TASK-0010 | Lint/build recovery report. | Classifies failed allowlisted verification commands and suggests scoped manual recovery without auto-fixing. |
| TASK-0011 | Customer dashboard workflow expansion. | Adds a customer workflow panel that turns existing dashboard stats into ordered customer actions. |
| TASK-0012 | Contractor dashboard workflow expansion. | Adds a contractor workflow panel for company readiness, insurance, crews, certifications, and jobs. |
| TASK-0013 | Admin analytics insight expansion. | Adds derived activity, onboarding, customer demand, and contractor supply insight cards. |
| TASK-0014 | Admin approval queue summaries. | Adds customer and contractor approval queue summary cards for faster triage. |
| TASK-0015 | Contractor workforce center expansion. | Adds workforce pipeline and readiness checklist to the contractor HR center. |

## Security Review Summary

- Agent automation remains local to `/var/www/telecom-agent-workspace`.
- Production paths, production PM2 processes, deployment commands, and merges are not part of the runner.
- Verification commands are allowlisted and do not execute arbitrary shell commands from task text.
- Marketplace UI changes in TASK-0011 through TASK-0015 are frontend-only and reuse existing data access patterns.
- Backend, Supabase, RLS, and Stripe behavior were not changed by the marketplace workflow UI expansions.

## Route Impact Summary

- `/customer` gained a customer workflow panel.
- `/contractor` gained a contractor workflow panel.
- `/admin/analytics` gained analytics insight cards.
- `/admin/contractor-approvals` gained contractor approval queue summaries.
- `/admin/customer-approvals` gained customer approval queue summaries.
- `/contractor/hr` gained a workforce pipeline and readiness checklist.

## Production Readiness Note

The branch is not production-ready solely because tasks are `commit_ready`. Human review, smoke testing, Supabase/RLS verification, Stripe checkout verification, and deployment readiness checks must still pass before release.
