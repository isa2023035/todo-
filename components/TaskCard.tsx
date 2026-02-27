
import React from 'react';
import { Task, Priority, ColumnStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onClick?: (task: Task) => void;
  isOverdue?: boolean;
}

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const styles = {
    Low: 'bg-blue-100 text-blue-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-rose-100 text-rose-700',
  };

  return (
    <span className={`text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${styles[priority]}`}>
      {priority}
    </span>
  );
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onComplete, onDelete, onClick, isOverdue }) => {
  const isDone = task.status === 'done';

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(task.id);
  };

  return (
    <div
      draggable={!isDone}
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onClick ? onClick(task) : onComplete(task.id)}
      className={`bg-white p-3 lg:p-4 rounded-xl border transition-all relative overflow-hidden group cursor-pointer active:scale-[0.98] ${
        isDone 
          ? 'border-emerald-100 bg-emerald-50/30 opacity-90 hover:border-emerald-300 hover:bg-emerald-50 shadow-sm' 
          : isOverdue
            ? 'border-rose-300 bg-rose-50 shadow-md hover:border-rose-400'
            : task.isRoutine 
              ? 'border-indigo-200 border-dashed hover:border-indigo-400 bg-indigo-50/10 shadow-sm' 
              : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
        isDone ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : task.isRoutine ? 'bg-indigo-400' : 'bg-slate-200'
      }`} />
      
      <div className="flex justify-between items-start mb-2 relative z-0">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.isRoutine && (
              <span className="bg-indigo-600 text-white text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <svg className="w-2 h-2 lg:w-2.5 lg:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                ルーティン
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button 
            type="button"
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-rose-50 cursor-pointer"
            title="削除"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div className={`transition-all ${isDone ? 'text-emerald-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>
            {isDone ? (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold opacity-0 lg:group-hover:opacity-100 transition-opacity hidden sm:inline">元に戻す</span>
                <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:hidden" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <svg className="w-4 h-4 lg:w-5 lg:h-5 hidden lg:group-hover:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[10px] lg:text-[11px] font-bold text-indigo-500 mb-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {task.startTime}
      </div>

      <h3 className={`text-slate-800 font-semibold text-xs lg:text-sm leading-tight mb-3 line-clamp-2 ${isDone ? 'line-through text-slate-400' : ''}`}>
        {task.title}
      </h3>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
              isDone ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : isOverdue ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            }`}>
              {task.assignee.substring(0, 1)}
            </div>
            <span className={`text-[10px] lg:text-[11px] font-medium truncate max-w-[80px] ${isOverdue && !isDone ? 'text-rose-700' : 'text-slate-500'}`}>{task.assignee}</span>
          </div>
          {task.creator !== task.assignee && (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-[8px] text-slate-400 uppercase font-bold">By</span>
              <span className="text-[9px] text-slate-400 font-medium truncate max-w-[60px]">{task.creator}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(task.notes || (task.attachments && task.attachments.length > 0)) && (
            <div className="flex items-center gap-1.5">
              {task.notes && (
                <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-0.5">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <span className="text-[9px] font-bold text-indigo-500">{task.attachments.length}</span>
                </div>
              )}
            </div>
          )}
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            {task.durationMinutes}m
          </div>
        </div>
      </div>
    </div>
  );
};
