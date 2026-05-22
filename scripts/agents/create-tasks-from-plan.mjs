#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join } from "node:path";

const root = process.cwd();
const planPath = join(root, "docs", "IMPLEMENTATION_PLAN.md");
const outputPath = join(root, "docs", "AGENT_TASK_QUEUE.generated.md");

const slugAreaMap = [
  ["customer", "customer"],
  ["contractor", "contractor"],
  ["worker", "worker"],
  ["admin", "admin"],
  ["onboarding", "onboarding"],
  ["approval", "approvals"],
  ["analytics", "analytics"],
  ["bid", "bids"],
  ["resource", "resources"],
  ["agreement", "agreements"],
  ["hr", "hr-workforce"],
  ["workforce", "hr-workforce"],
  ["feedback", "feedback"],
  ["api", "api"],
  ["security", "security"],
  ["supabase", "security"],
];

function normalizeTitle(value) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/^[-*]\s+\[[ xX]\]\s*/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferArea(title) {
  const lowered = title.toLowerCase();
  const match = slugAreaMap.find(([keyword]) => lowered.includes(keyword));
  return match ? match[1] : "infrastructure";
}

function inferType(title) {
  const lowered = title.toLowerCase();
  if (lowered.includes("test") || lowered.includes("verify")) return "test";
  if (lowered.includes("security") || lowered.includes("rls")) return "security";
  if (lowered.includes("docs") || lowered.includes("document")) return "docs";
  if (lowered.includes("refactor")) return "refactor";
  if (lowered.includes("bug") || lowered.includes("fix")) return "bugfix";
  return "feature";
}

function extractItems(markdown) {
  const items = [];
  let currentHeading = "";

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^#{2,4}\s+/.test(line)) {
      currentHeading = normalizeTitle(line);
      items.push(currentHeading);
      continue;
    }

    if (/^[-*]\s+(\[[ xX]\]\s*)?/.test(line)) {
      const title = normalizeTitle(line);
      if (title) {
        items.push(currentHeading ? `${currentHeading}: ${title}` : title);
      }
    }
  }

  return [...new Set(items.filter(Boolean))];
}

function parseGeneratedTasks(markdown) {
  const taskHeadingPattern = /^##\s+(TASK-\d{4})\s*$/gm;
  const headings = [...markdown.matchAll(taskHeadingPattern)];

  return headings.map((match, index) => {
    const start = match.index ?? 0;
    const next = headings[index + 1];
    const end = next?.index ?? markdown.length;
    const taskMarkdown = markdown.slice(start, end);
    const fieldValue = (field) => {
      const fieldMatch = taskMarkdown.match(new RegExp(`^- ${field}:\\s*(.*)$`, "im"));
      return fieldMatch ? fieldMatch[1].trim() : "";
    };

    return {
      task_id: match[1],
      title: fieldValue("title"),
      status: fieldValue("status"),
      assigned_agent: fieldValue("assigned_agent"),
    };
  });
}

function readCommittedGeneratedQueue() {
  const result = spawnSync("git", ["show", "HEAD:docs/AGENT_TASK_QUEUE.generated.md"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });

  return result.status === 0 ? result.stdout : "";
}

function buildExistingTaskMap() {
  const existingMarkdown = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  const committedMarkdown = readCommittedGeneratedQueue();
  const taskMap = new Map();

  for (const task of [
    ...parseGeneratedTasks(existingMarkdown),
    ...parseGeneratedTasks(committedMarkdown),
  ]) {
    const existing = taskMap.get(task.title) ?? taskMap.get(task.task_id);
    const shouldReplace =
      !existing ||
      (existing.status === "pending" && task.status && task.status !== "pending");

    if (shouldReplace) {
      taskMap.set(task.title, task);
      taskMap.set(task.task_id, task);
    }
  }

  return taskMap;
}

function renderTask(index, title, existingTaskMap) {
  const id = `TASK-${String(index + 1).padStart(4, "0")}`;
  const area = inferArea(title);
  const type = inferType(title);
  const existingTask = existingTaskMap.get(title) ?? existingTaskMap.get(id);
  const status = existingTask?.status || "pending";
  const assignedAgent = existingTask?.assigned_agent || "unassigned";

  return `## ${id}

- task_id: ${id}
- title: ${title}
- area: ${area}
- type: ${type}
- priority: medium
- status: ${status}
- assigned_agent: ${assignedAgent}
- dependencies: none
- files_expected:
  - TBD
- acceptance_criteria:
  - Implement the task described by "${title}" with scoped, reviewable changes.
  - Confirm security and route impact have been reviewed.
- verification_commands:
  - npm run lint
  - npm run build
- notes: Generated deterministically from ${basename(planPath)}.
`;
}

const hasPlan = existsSync(planPath);
const plan = hasPlan ? readFileSync(planPath, "utf8") : "";
const items = hasPlan ? extractItems(plan) : [];
const existingTaskMap = buildExistingTaskMap();

const body = `# Generated Agent Task Queue

Generated by \`scripts/agents/create-tasks-from-plan.mjs\`.

- source_plan: ${hasPlan ? "docs/IMPLEMENTATION_PLAN.md" : "none"}
- total_tasks: ${items.length}
- deterministic: true
- ai_apis_used: false

${items.length > 0 ? items.map((item, index) => renderTask(index, item, existingTaskMap)).join("\n") : "No implementation plan was found, so no task entries were generated.\n"}
`;

writeFileSync(outputPath, body, "utf8");
console.log(`Generated ${items.length} task(s) at docs/AGENT_TASK_QUEUE.generated.md`);
