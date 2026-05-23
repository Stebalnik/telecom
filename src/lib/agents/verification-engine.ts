import type { AgentTask, AgentVerificationResult } from "./types";

const requiredStringFields = ["task_id", "title", "area", "type", "priority", "status"] as const;
const forbiddenProductionPathPatterns = [
  /\/var\/www\/telecom(?!-agent-workspace)/,
  /file:\/\/\/var\/www\/telecom(?!-agent-workspace)/,
];

function hasNonEmptyStrings(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some((value) => value.trim().length > 0);
}

export function verifyTaskStructure(task: Partial<AgentTask>): AgentVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of requiredStringFields) {
    const value = task[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`Missing required task field: ${field}`);
    }
  }

  if (!Array.isArray(task.dependencies)) {
    errors.push("Task dependencies must be an array");
  }

  if (!Array.isArray(task.files_expected)) {
    errors.push("Task files_expected must be an array");
  }

  if (!Array.isArray(task.acceptance_criteria)) {
    errors.push("Task acceptance_criteria must be an array");
  }

  if (!Array.isArray(task.verification_commands)) {
    errors.push("Task verification_commands must be an array");
  }

  const serializedTask = JSON.stringify(task);
  for (const pattern of forbiddenProductionPathPatterns) {
    if (pattern.test(serializedTask)) {
      errors.push("Task references a forbidden production path");
    }
  }

  if (task.status === "completed" && !hasNonEmptyStrings(task.acceptance_criteria)) {
    warnings.push("Completed tasks should retain acceptance criteria for auditability");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function verifyAcceptanceCriteria(task: Partial<AgentTask>): AgentVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasNonEmptyStrings(task.acceptance_criteria)) {
    errors.push("Task must include at least one acceptance criterion");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function verifyVerificationCommands(task: Partial<AgentTask>): AgentVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasNonEmptyStrings(task.verification_commands)) {
    errors.push("Task must include at least one verification command");
  }

  const commands = task.verification_commands ?? [];
  if (!commands.includes("npm run lint")) {
    warnings.push("Task does not include npm run lint");
  }

  if (!commands.includes("npm run build")) {
    warnings.push("Task does not include npm run build");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
