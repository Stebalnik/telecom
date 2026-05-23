import type { AgentTask } from "./types";

export function createPlaceholderTask(task_id: string, title: string): AgentTask {
  return {
    task_id,
    title,
    area: "infrastructure",
    type: "chore",
    priority: "medium",
    status: "pending",
    assigned_agent: "unassigned",
    dependencies: [],
    files_expected: [],
    acceptance_criteria: ["Define specific, verifiable acceptance criteria before implementation."],
    verification_commands: ["npm run lint", "npm run build"],
    notes: "Placeholder task created by the agent foundation planner.",
  };
}
