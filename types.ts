
export type Priority = 'Low' | 'Medium' | 'High';

export type ColumnStatus = 'todo' | 'in-progress' | 'done';

export interface Column {
  id: ColumnStatus;
  title: string;
}

export interface TaskComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  creator: string;
  priority: Priority;
  status: ColumnStatus;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  durationMinutes: number;
  isRoutine: boolean; // True for recurring tasks
  notes?: string;
  comments?: TaskComment[];
  attachments?: Attachment[];
  completedBy?: string;
  notificationMinutesBefore?: number; // e.g., 5, 10, 15, 30
}

export interface HourRow {
  hour: number;
  label: string;
}
