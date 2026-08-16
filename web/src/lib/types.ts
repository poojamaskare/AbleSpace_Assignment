export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type UserSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type Label = { id: string; name: string };

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  columnId: string;
  projectId: string;
  assignees: UserSummary[];
  labels: Label[];
  _count: { subtasks: number; comments: number };
};

export type Column = {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
};

export type Board = {
  id: string;
  name: string;
  /** Null once the lead's account is gone; the board outlives them. */
  leadId: string | null;
  columns: Column[];
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: UserSummary;
};

export type Activity = {
  id: string;
  message: string;
  createdAt: string;
  actor: UserSummary | null;
};

export type TaskDetail = Task & {
  reporter: UserSummary | null;
  subtasks: Task[];
  comments: Comment[];
  activities: Activity[];
};
