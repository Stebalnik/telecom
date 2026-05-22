#!/usr/bin/env node

import { ensureReportDirs, listPendingTasks } from "./agent-queue-utils.mjs";

ensureReportDirs();

const pendingTasks = listPendingTasks();

if (pendingTasks.length === 0) {
  console.log("No pending tasks found.");
  process.exit(0);
}

console.log(`Pending tasks: ${pendingTasks.length}`);
for (const task of pendingTasks) {
  console.log(`- ${task.task_id} | ${task.title} | ${task.assigned_agent || "unassigned"} | ${task.priority || "medium"}`);
}
