import type { AgentTask } from "./types";

export interface AgentReviewChecklist {
  task_id: string;
  required_reviews: string[];
}

export function createReviewChecklist(task: AgentTask): AgentReviewChecklist {
  const required_reviews = [
    "acceptance criteria",
    "lint",
    "build",
    "security review",
    "route impact review",
  ];

  const backendIndicators = ["api", "auth", "supabase", "server", "storage", "database", "rls"];
  const taskText = [
    task.area,
    task.title,
    ...task.files_expected,
    task.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (backendIndicators.some((indicator) => taskText.includes(indicator))) {
    required_reviews.push("Supabase/RLS review");
  }

  return {
    task_id: task.task_id,
    required_reviews,
  };
}
