# Autonomous Agent Loop

This document explains how to run the safe multi-task controller. The controller prepares one task at a time and stops for Codex implementation. It does not call AI APIs, deploy, merge, restart PM2, or touch production files.

## Run One Task

```bash
npm run agents:loop -- --max=1
```

The controller checks branch isolation, requires a clean working tree, runs status, claims one pending task, generates `reports/agents/current-implementation-packet.md`, writes loop state/log files, and stops.

Codex then implements the packet manually. After implementation:

```bash
npm run agents:finalize-cycle
npm run build
git add <changed files>
git commit -m "Clear task message"
git push origin agents/dev-system
```

## Run Five Tasks

```bash
npm run agents:loop -- --max=5
```

The controller still stops after preparing the first task because Codex must implement the packet. Run the command again after each verified commit to process the next task.

## Run Until Queue Empty

Use repeated bounded runs:

```bash
npm run agents:loop -- --max=5
```

When no pending tasks exist, the controller runs:

```bash
npm run agents:plan
npm run agents:audit
```

If the regenerated queue still has no pending tasks, the controller stops successfully.

## Stop Conditions

The loop stops when:

- The max-iteration limit is reached.
- A task packet is ready for Codex implementation.
- The queue is empty after regeneration.
- Branch isolation fails.
- The working tree is not clean before claiming.
- A required script fails.

## Inspect Logs

State:

```bash
cat reports/agents/autonomous-cycle-state.json
```

Event log:

```bash
cat reports/agents/autonomous-cycle-log.json
```

Pending tasks:

```bash
npm run agents:pending
```

Current status:

```bash
npm run agents:status
```

## Recover From A Blocked Task

If the current task cannot be completed safely:

```bash
npm run agents:block-current -- --reason="Explain the blocker"
```

This marks the current task `blocked`, archives `reports/agents/current-task.json`, and updates the audit report. Then run:

```bash
npm run agents:loop -- --max=1
```

## Safety Rules

- Work only in `/var/www/telecom-agent-workspace`.
- Do not touch `/var/www/telecom`.
- Do not deploy.
- Do not restart PM2 production.
- Do not merge to `main`.
- Use the implementation packet as the task source of truth.
- Commit and push only after verification and build pass.
