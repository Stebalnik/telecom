#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const docsDir = join(root, "docs");
const forbiddenProductionPaths = [
  "/var/www/telecom",
  "file:///var/www/telecom",
];

const requiredFields = [
  "task_id",
  "title",
  "area",
  "type",
  "priority",
  "status",
  "assigned_agent",
  "dependencies",
  "files_expected",
  "acceptance_criteria",
  "verification_commands",
  "notes",
];

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

function extractTasks(markdown) {
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");
  const sections = withoutCodeBlocks.split(/^##\s+/gm).slice(1);
  return sections
    .filter((section) => /^TASK-\d{4}/.test(section.trim()))
    .map((section) => `## ${section.trim()}`);
}

function hasField(task, field) {
  return new RegExp(`^- ${field}:`, "im").test(task);
}

function hasListItemAfter(task, field) {
  const lines = task.split(/\r?\n/);
  const fieldIndex = lines.findIndex((line) => line.trim() === `- ${field}:`);
  if (fieldIndex === -1) return false;

  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^- [a-z_]+:/.test(line)) break;
    if (/^\s+-\s+\S+/.test(line)) return true;
  }

  return false;
}

function verifyTask(file, task) {
  const errors = [];
  const headerMatch = task.match(/^##\s+(TASK-\d{4})/);
  const taskId = headerMatch ? headerMatch[1] : "unknown";

  for (const field of requiredFields) {
    if (!hasField(task, field)) {
      errors.push(`${file} ${taskId} is missing field: ${field}`);
    }
  }

  if (!hasListItemAfter(task, "acceptance_criteria")) {
    errors.push(`${file} ${taskId} must include at least one acceptance criterion`);
  }

  if (!hasListItemAfter(task, "verification_commands")) {
    errors.push(`${file} ${taskId} must include at least one verification command`);
  }

  for (const forbiddenPath of forbiddenProductionPaths) {
    if (task.includes(forbiddenPath)) {
      errors.push(`${file} ${taskId} references forbidden production path: ${forbiddenPath}`);
    }
  }

  return errors;
}

const queueFiles = readQueueFiles();
const errors = [];
let taskCount = 0;

for (const queueFile of queueFiles) {
  const tasks = extractTasks(queueFile.content);
  taskCount += tasks.length;

  if (forbiddenProductionPaths.some((path) => queueFile.content.includes(path))) {
    errors.push(`${queueFile.file} references a forbidden production path`);
  }

  for (const task of tasks) {
    errors.push(...verifyTask(queueFile.file, task));
  }
}

if (errors.length > 0) {
  console.error("Agent task verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Agent task verification passed for ${taskCount} task(s) across ${queueFiles.length} queue file(s).`);
