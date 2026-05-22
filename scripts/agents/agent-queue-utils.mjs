import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export const root = process.cwd();
export const reportsDir = join(root, "reports", "agents");
export const historyDir = join(reportsDir, "history");
export const currentTaskPath = join(reportsDir, "current-task.json");
export const currentVerificationPath = join(reportsDir, "current-task-verification.json");
export const currentImplementationPacketPath = join(reportsDir, "current-implementation-packet.md");

const queueFilePriority = [
  "docs/AGENT_TASK_QUEUE.generated.md",
  "docs/AGENT_TASK_QUEUE.md",
];

export function ensureReportDirs() {
  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(historyDir, { recursive: true });
}

export function readQueueFiles() {
  return queueFilePriority
    .map((file) => ({
      file,
      path: join(root, file),
    }))
    .filter((queueFile) => existsSync(queueFile.path))
    .map((queueFile) => ({
      ...queueFile,
      content: readFileSync(queueFile.path, "utf8"),
    }));
}

export function extractTasksFromQueue(queueFile) {
  const taskHeadingPattern = /^##\s+(TASK-\d{4})\s*$/gm;
  const headings = [...queueFile.content.matchAll(taskHeadingPattern)];

  return headings.map((match, index) => {
    const start = match.index ?? 0;
    const next = headings[index + 1];
    const end = next?.index ?? queueFile.content.length;
    const markdown = queueFile.content.slice(start, end);

    return {
      task_id: match[1],
      queue_file: queueFile.file,
      queue_path: queueFile.path,
      start,
      end,
      markdown,
      ...parseTaskFields(markdown),
    };
  });
}

export function parseTaskFields(markdown) {
  const fieldValue = (field) => {
    const match = markdown.match(new RegExp(`^- ${field}:\\s*(.*)$`, "im"));
    return match ? match[1].trim() : "";
  };

  return {
    title: fieldValue("title"),
    area: fieldValue("area"),
    type: fieldValue("type"),
    priority: fieldValue("priority"),
    status: fieldValue("status"),
    assigned_agent: fieldValue("assigned_agent"),
    dependencies: fieldValue("dependencies"),
    notes: fieldValue("notes"),
  };
}

export function parseTaskList(markdown, field) {
  const lines = markdown.split(/\r?\n/);
  const fieldIndex = lines.findIndex((line) => line.trim() === `- ${field}:`);
  if (fieldIndex === -1) return [];

  const values = [];
  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^- [a-z_]+:/.test(line)) break;

    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) {
      values.push(match[1].trim());
    }
  }

  return values;
}

export function findFirstPendingTask() {
  for (const queueFile of readQueueFiles()) {
    const task = extractTasksFromQueue(queueFile).find((candidate) => candidate.status === "pending");
    if (task) {
      return task;
    }
  }

  return null;
}

export function findTaskById(queueFileName, taskId) {
  const queueFile = readQueueFiles().find((candidate) => candidate.file === queueFileName);
  if (!queueFile) return null;

  return extractTasksFromQueue(queueFile).find((task) => task.task_id === taskId) ?? null;
}

export function replaceTaskField(markdown, field, value) {
  const pattern = new RegExp(`^- ${field}:.*$`, "im");
  const replacement = `- ${field}: ${value}`;

  if (pattern.test(markdown)) {
    return markdown.replace(pattern, replacement);
  }

  return `${markdown.trimEnd()}\n${replacement}\n`;
}

export function updateTaskInQueue(task, updater) {
  const queuePath = task.queue_path ?? join(root, task.queue_file);
  const content = readFileSync(queuePath, "utf8");
  const latestTask = extractTasksFromQueue({
    file: task.queue_file,
    path: queuePath,
    content,
  }).find((candidate) => candidate.task_id === task.task_id);

  if (!latestTask) {
    throw new Error(`Could not find ${task.task_id} in ${task.queue_file}`);
  }

  const updatedMarkdown = updater(latestTask.markdown);
  const updatedContent = `${content.slice(0, latestTask.start)}${updatedMarkdown}${content.slice(latestTask.end)}`;
  writeFileSync(queuePath, updatedContent, "utf8");

  return {
    ...latestTask,
    markdown: updatedMarkdown,
    ...parseTaskFields(updatedMarkdown),
  };
}

export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJsonFile(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function removeFileIfExists(path) {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export function archiveCurrentTask(task) {
  if (!existsSync(currentTaskPath)) return null;

  ensureReportDirs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const taskId = task?.task_id ?? "unknown-task";
  const archivedPath = join(historyDir, `${timestamp}-${taskId}-${basename(currentTaskPath)}`);
  renameSync(currentTaskPath, archivedPath);
  return archivedPath;
}

export function countStatuses() {
  const counts = {
    pending: 0,
    in_progress: 0,
    blocked: 0,
    failed: 0,
    completed: 0,
    commit_ready: 0,
    "commit-ready": 0,
  };

  for (const queueFile of readQueueFiles()) {
    for (const task of extractTasksFromQueue(queueFile)) {
      if (Object.prototype.hasOwnProperty.call(counts, task.status)) {
        counts[task.status] += 1;
      }
    }
  }

  return {
    ...counts,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    commit_ready_total: counts.commit_ready + counts["commit-ready"],
  };
}
