#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const docsDir = join(root, "docs");
const reportsDir = join(root, "reports", "agents");
const outputPath = join(reportsDir, "agent-progress-audit.json");
const buildIdPath = join(root, ".next", "BUILD_ID");

const statuses = ["pending", "in_progress", "blocked", "failed", "completed", "commit_ready", "commit-ready"];

function readQueueFiles() {
  if (!existsSync(docsDir)) return [];

  return readdirSync(docsDir)
    .filter((file) => /^AGENT_TASK_QUEUE.*\.md$/.test(file))
    .sort()
    .map((file) => ({
      file: `docs/${file}`,
      content: readFileSync(join(docsDir, file), "utf8"),
    }));
}

function countStatuses(files) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  let total = 0;

  for (const queueFile of files) {
    const content = queueFile.content.replace(/```[\s\S]*?```/g, "");
    const matches = content.matchAll(/^- status:\s*([a-z_-]+)\s*$/gim);
    for (const match of matches) {
      const status = match[1];
      if (statuses.includes(status)) {
        counts[status] += 1;
        total += 1;
      }
    }
  }

  return { counts, total };
}

const files = readQueueFiles();
const { counts, total } = countStatuses(files);
const latestSuccessfulBuild = existsSync(buildIdPath)
  ? {
      build_id: readFileSync(buildIdPath, "utf8").trim(),
      detected_at: statSync(buildIdPath).mtime.toISOString(),
    }
  : null;

mkdirSync(reportsDir, { recursive: true });

const audit = {
  generated_at: new Date().toISOString(),
  queue_files: files.map((file) => file.file),
  total_tasks: total,
  completed: counts.completed + counts.commit_ready + counts["commit-ready"],
  failed: counts.failed,
  blocked: counts.blocked,
  in_progress: counts.in_progress,
  pending: counts.pending,
  commit_ready: counts.commit_ready + counts["commit-ready"],
  latest_successful_build: latestSuccessfulBuild,
};

writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(audit, null, 2));
