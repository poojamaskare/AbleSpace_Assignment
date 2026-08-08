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
  columns: Column[];
};
