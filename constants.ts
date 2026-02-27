
import { Task, HourRow } from './types';

// Generate 10-minute slots for the timeline (e.g., 00:00, 00:10, ...)
export const TIME_SLOTS: string[] = [];
for (let h = 0; h <= 23; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

// Generate time options for the creation modal (5-minute increments)
export const TIME_OPTIONS: string[] = [];
for (let h = 0; h <= 23; h++) {
  for (let m = 0; m < 60; m += 5) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const today = new Date().toISOString().split('T')[0];

export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'メールチェック・返信',
    assignee: '山田 太郎',
    creator: '山田 太郎',
    priority: 'Medium',
    status: 'todo',
    date: today,
    startTime: '08:00',
    durationMinutes: 30,
    isRoutine: true
  },
  {
    id: '2',
    title: 'デイリースクラム',
    assignee: 'チーム全員',
    creator: '山田 太郎',
    priority: 'High',
    status: 'todo',
    date: today,
    startTime: '09:05',
    durationMinutes: 15,
    isRoutine: true
  },
  {
    id: '3',
    title: 'クライアントA商談用資料作成',
    assignee: '佐藤 花子',
    creator: '山田 太郎',
    priority: 'High',
    status: 'todo',
    date: today,
    startTime: '10:15',
    durationMinutes: 90,
    isRoutine: false
  },
  {
    id: '4',
    title: '週次進捗レポート作成',
    assignee: '鈴木 一郎',
    creator: '山田 太郎',
    priority: 'Medium',
    status: 'todo',
    date: today,
    startTime: '13:30',
    durationMinutes: 60,
    isRoutine: false
  }
];
