
import React, { useState } from 'react';
import { Task } from '../types';
import { TaskCard } from './TaskCard';

interface TimeSlotProps {
  label: string;
  tasks: Task[];
  onDrop: (taskId: string, newTime: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isOverdue: (task: Task) => boolean;
  onClick?: (task: Task) => void;
}

export const TimeSlot: React.FC<TimeSlotProps> = ({ label, tasks, onDrop, onDragStart, onComplete, onDelete, isOverdue, onClick }) => {
  const [isOver, setIsOver] = useState(false);
  
  const isFullHour = label.endsWith(':00');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    onDrop(taskId, label);
  };

  return (
    <div 
      className={`flex group border-b border-slate-100 last:border-0 ${
        isFullHour ? 'bg-slate-50/30' : 'bg-transparent'
      }`}
    >
      {/* Time Label Column */}
      <div className="w-16 lg:w-20 flex-shrink-0 flex justify-end pr-3 lg:pr-4 pt-1.5 border-r border-slate-100/50">
        <span className={`text-[10px] lg:text-[11px] font-bold tracking-tighter transition-colors ${
          isFullHour ? 'text-slate-600' : 'text-slate-300'
        } group-hover:text-indigo-500`}>
          {label}
        </span>
      </div>

      {/* Drop Zone & Task Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-2 transition-colors duration-200 relative min-h-[44px] lg:min-h-[48px] ${
          isOver ? 'bg-indigo-50' : 'bg-transparent'
        }`}
      >
        <div className="flex flex-col lg:flex-row flex-wrap gap-2">
          {tasks.map((task) => (
            <div key={task.id} className="w-full lg:w-72 flex-shrink-0">
              <TaskCard 
                task={task} 
                onDragStart={onDragStart} 
                onComplete={onComplete} 
                onDelete={onDelete} 
                isOverdue={isOverdue(task)}
                onClick={onClick}
              />
            </div>
          ))}
          {tasks.length === 0 && isOver && (
            <div className="absolute inset-0 border-2 border-dashed border-indigo-200 m-1 rounded-lg pointer-events-none" />
          )}
        </div>
        
        {!isOver && tasks.length === 0 && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center pl-4">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          </div>
        )}
      </div>
    </div>
  );
};
