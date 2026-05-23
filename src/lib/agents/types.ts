export type AgentRole =
  | "plan-reader"
  | "task-splitter"
  | "architect"
  | "coder"
  | "reviewer"
  | "verification"
  | "deployment-advisor";

export type AgentTaskStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "failed"
  | "completed"
  | "commit_ready"
  | "commit-ready"
  | "not_implemented";

export type AgentTaskType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "test"
  | "docs"
  | "security"
  | "chore";

export type AgentTaskPriority = "low" | "medium" | "high" | "critical";

export interface AgentTask {
  task_id: string;
  title: string;
  area: string;
  type: AgentTaskType;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  assigned_agent: AgentRole | "unassigned";
  dependencies: string[];
  files_expected: string[];
  acceptance_criteria: string[];
  verification_commands: string[];
  notes?: string;
}

export interface AgentVerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AgentExecutionResult {
  task_id: string;
  status: AgentTaskStatus;
  summary: string;
  verification?: AgentVerificationResult;
  changed_files?: string[];
}
