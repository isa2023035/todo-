
import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, TaskComment } from './types';
import { TIME_SLOTS, INITIAL_TASKS, TIME_OPTIONS } from './constants';
import { TimeSlot } from './components/TimeSlot';
import { TaskCard } from './components/TaskCard';
import { Calendar } from './components/Calendar';

const CURRENT_USER = '山田 太郎';

type TabType = 'calendar' | 'schedule' | 'completed';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isAdding, setIsAdding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [filterPerson, setFilterPerson] = useState<string>('All');
  const [filterType, setFilterType] = useState<'All' | 'Routine' | 'One-off'>('All');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [commentText, setCommentText] = useState('');

  const [newTask, setNewTask] = useState({
    title: '',
    startTime: '09:00',
    duration: 60,
    isRoutine: false,
    priority: 'Medium' as Priority,
    notificationMinutesBefore: 0,
    assignee: CURRENT_USER,
    creator: CURRENT_USER,
    notes: '',
    attachments: [] as { id: string, name: string, url: string, type: string }[]
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      const todayStr = now.toISOString().split('T')[0];

      tasks.forEach(task => {
        if (task.date === todayStr && task.status !== 'done' && task.notificationMinutesBefore) {
          const [taskH, taskM] = task.startTime.split(':').map(Number);
          const taskTotalMinutes = taskH * 60 + taskM;
          const notifyTime = taskTotalMinutes - task.notificationMinutesBefore;
          
          if (currentTotalMinutes >= notifyTime && currentTotalMinutes < taskTotalMinutes) {
            if (!notifiedTasksRef.current.has(task.id)) {
              notifiedTasksRef.current.add(task.id);
              
              const message = `タスク「${task.title}」が${task.notificationMinutesBefore}分後に始まります`;
              
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('スマート・プランナー', { body: message });
              }
              
              const notifId = Date.now().toString() + Math.random();
              setNotifications(prev => [...prev, { id: notifId, message }]);
              
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notifId));
              }, 5000);
            }
          }
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [tasks]);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'done') return;
    
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTimeUpdate = (taskId: string, newStartTime: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, startTime: newStartTime, status: task.status === 'done' ? 'done' : 'todo' } : task
      )
    );
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          const isCurrentlyDone = task.status === 'done';
          return {
            ...task,
            status: isCurrentlyDone ? 'todo' : 'done',
            completedBy: isCurrentlyDone ? undefined : CURRENT_USER
          };
        }
        return task;
      })
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? {
        ...prev,
        status: prev.status === 'done' ? 'todo' : 'done'
      } : null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskToDelete));
      setTaskToDelete(null);
    }
  };

  const executeNextDayReset = () => {
    setIsTransitioning(true);
    setShowSummary(false);

    setTimeout(() => {
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      setTasks(prev => {
        const currentRoutines = prev.filter(t => t.isRoutine && t.date === selectedDateStr);
        const nextDayRoutines = currentRoutines.map(t => ({
          ...t,
          id: `${t.id.split('-')[0]}-${nextDateStr}`,
          status: 'todo' as const,
          date: nextDateStr,
          completedBy: undefined
        }));

        const cleanedTasks = prev.filter(t => t.status !== 'done' || t.date !== selectedDateStr);
        return [...cleanedTasks, ...nextDayRoutines];
      });
      
      setSelectedDate(nextDate);
      setActiveTab('schedule');

      setTimeout(() => {
        setIsTransitioning(false);
      }, 800);
    }, 1000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      assignee: newTask.assignee,
      creator: newTask.creator,
      priority: newTask.priority,
      status: 'todo',
      date: selectedDateStr,
      startTime: newTask.startTime,
      durationMinutes: newTask.duration,
      isRoutine: newTask.isRoutine,
      notes: newTask.notes,
      comments: [],
      attachments: newTask.attachments.length > 0 ? newTask.attachments : undefined,
      notificationMinutesBefore: newTask.notificationMinutesBefore > 0 ? newTask.notificationMinutesBefore : undefined
    };

    setTasks([...tasks, task]);
    setIsAdding(false);
    setNewTask({ 
      title: '', 
      startTime: '09:00', 
      duration: 60, 
      isRoutine: false, 
      priority: 'Medium', 
      notificationMinutesBefore: 0,
      assignee: CURRENT_USER,
      creator: CURRENT_USER,
      notes: '',
      attachments: []
    });
    setActiveTab('schedule');
  };

  const handlePaste = (e: React.ClipboardEvent, isNewTask: boolean, taskId?: string) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const newAttachment = {
              id: Date.now().toString() + Math.random(),
              name: `Screenshot_${new Date().toLocaleTimeString()}.png`,
              url: base64,
              type: 'image/png'
            };

            if (isNewTask) {
              setNewTask(prev => ({
                ...prev,
                attachments: [...prev.attachments, newAttachment]
              }));
            } else if (taskId) {
              setTasks(prev => prev.map(t => t.id === taskId ? {
                ...t,
                attachments: [...(t.attachments || []), newAttachment]
              } : t));
              setSelectedTask(prev => prev?.id === taskId ? {
                ...prev,
                attachments: [...(prev.attachments || []), newAttachment]
              } : prev);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNewTask: boolean, taskId?: string) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newAttachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          url: base64,
          type: file.type
        };

        if (isNewTask) {
          setNewTask(prev => ({
            ...prev,
            attachments: [...prev.attachments, newAttachment]
          }));
        } else if (taskId) {
          setTasks(prev => prev.map(t => t.id === taskId ? {
            ...t,
            attachments: [...(t.attachments || []), newAttachment]
          } : t));
          setSelectedTask(prev => prev?.id === taskId ? {
            ...prev,
            attachments: [...(prev.attachments || []), newAttachment]
          } : prev);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (attachmentId: string, isNewTask: boolean, taskId?: string) => {
    if (isNewTask) {
      setNewTask(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }));
    } else if (taskId) {
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        attachments: t.attachments?.filter(a => a.id !== attachmentId)
      } : t));
      setSelectedTask(prev => prev?.id === taskId ? {
        ...prev,
        attachments: prev.attachments?.filter(a => a.id !== attachmentId)
      } : prev);
    }
  };

  const addComment = (taskId: string) => {
    if (!commentText.trim()) return;

    const newComment: TaskComment = {
      id: Date.now().toString(),
      text: commentText,
      author: CURRENT_USER,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      comments: [...(t.comments || []), newComment]
    } : t));

    setSelectedTask(prev => prev?.id === taskId ? {
      ...prev,
      comments: [...(prev.comments || []), newComment]
    } : prev);

    setCommentText('');
  };

  const filteredTasks = tasks.filter(t => {
    const matchesDate = t.date === selectedDateStr;
    const matchesPerson = filterPerson === 'All' || t.assignee === filterPerson || t.creator === filterPerson;
    const matchesType = filterType === 'All' || (filterType === 'Routine' ? t.isRoutine : !t.isRoutine);
    return matchesDate && matchesPerson && matchesType;
  });

  const activeTasksForDay = filteredTasks.filter(t => t.status !== 'done');
  const completedTasksForDay = filteredTasks.filter(t => t.status === 'done');
  
  const isOverdue = (task: Task) => {
    if (task.status === 'done') return false;
    const now = currentTime;
    const todayStr = now.toISOString().split('T')[0];
    if (task.date !== todayStr) return task.date < todayStr;
    
    const [h, m] = task.startTime.split(':').map(Number);
    const taskStartMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes > taskStartMinutes;
  };

  const overdueTasksCount = tasks.filter(t => t.date === selectedDateStr && isOverdue(t)).length;
  
  // Stats should probably be based on the full day's tasks, not filtered ones, 
  // or maybe filtered ones? Usually stats are for the whole day.
  // Let's keep stats for the whole day for now.
  const allTasksForDay = tasks.filter(t => t.date === selectedDateStr);
  const allCompletedTasksForDay = allTasksForDay.filter(t => t.status === 'done');
  const routineTasksForDay = allTasksForDay.filter(t => t.isRoutine);
  const completedRoutineTasks = routineTasksForDay.filter(t => t.status === 'done');
  const oneOffTasksForDay = allTasksForDay.filter(t => !t.isRoutine);
  const oneOffTasksDoneForDay = oneOffTasksForDay.filter(t => t.status === 'done');

  const remainingTimeMinutes = allTasksForDay.filter(t => t.status !== 'done').reduce((acc, task) => acc + (task.durationMinutes || 0), 0);
  const completedTimeMinutes = allCompletedTasksForDay.reduce((acc, task) => acc + (task.durationMinutes || 0), 0);

  const people = Array.from(new Set(tasks.flatMap(t => [t.assignee, t.creator])));

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}時間${m > 0 ? ` ${m}分` : ''}`;
    return `${m}分`;
  };

  const formattedDate = selectedDate.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    weekday: 'short'
  });

  const totalTasksForDay = tasks.filter(t => t.date === selectedDateStr);
  const completionRate = totalTasksForDay.length === 0 
    ? 0 
    : Math.round((completedTasksForDay.length / totalTasksForDay.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden relative">
      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">タスクを削除しますか？</h3>
              <p className="text-sm text-slate-500 mb-6">この操作は取り消せません。本当に削除してもよろしいですか？</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-100 transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {notifications.map(notif => (
          <div key={notif.id} className="bg-white border-l-4 border-indigo-500 shadow-lg rounded-r-lg p-4 max-w-sm flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto">
            <div className="text-indigo-500 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">通知</h4>
              <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
            </div>
            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Day Transition Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 p-6 text-center">
          <div className="text-white animate-pulse">
            <svg className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707" />
            </svg>
            <h2 className="text-xl lg:text-2xl font-bold mb-2">翌日の準備中...</h2>
            <p className="text-slate-400 text-sm">カレンダーを更新し、ルーティンを引き継いでいます</p>
          </div>
        </div>
      )}

      {/* Daily Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-6 lg:p-8 text-white relative flex-shrink-0">
              <h2 className="text-xl lg:text-2xl font-bold mb-1">一日の振り返り</h2>
              <p className="text-indigo-100 text-sm">{formattedDate} の業務終了</p>
              
              <div className="flex gap-4 mt-6">
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className="text-[10px] font-bold uppercase opacity-70">完了</div>
                  <div className="text-xl font-bold">{completedTasksForDay.length}</div>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className="text-[10px] font-bold uppercase opacity-70">未完了</div>
                  <div className="text-xl font-bold">{activeTasksForDay.length}</div>
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 bg-slate-50 overflow-y-auto">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">翌日に引き継ぐ (ルーティン)</h3>
                <div className="space-y-2">
                  {routineTasksForDay.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-sm">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="font-medium text-slate-700 truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">終了して消去 (単発)</h3>
                <div className="space-y-2">
                  {oneOffTasksDoneForDay.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-sm">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      <span className="font-medium text-emerald-700 truncate line-through">{t.title}</span>
                    </div>
                  ))}
                  {oneOffTasksDoneForDay.length === 0 && (
                    <p className="text-xs text-slate-400 italic">完了した単発タスクはありません</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-slate-100 flex gap-4 bg-white flex-shrink-0">
              <button onClick={() => setShowSummary(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl">キャンセル</button>
              <button onClick={executeNextDayReset} className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-lg">実行</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 lg:py-4 flex-shrink-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="bg-indigo-600 p-1.5 lg:p-2 rounded-lg lg:rounded-xl text-white">
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm lg:text-xl font-bold text-slate-800 truncate max-w-[120px] lg:max-w-none">スマート・プランナー</h1>
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span className="hidden lg:inline text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Schedule & Calendar</span>
              <span className="text-[10px] lg:text-xs text-indigo-500 font-bold leading-none">{formattedDate}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <button 
            onClick={() => setShowSummary(true)} 
            className="flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-2 border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs lg:text-sm font-bold transition-all"
          >
            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>更新</span>
          </button>
          
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-semibold shadow-md transition-all flex items-center gap-1.5 lg:gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <span className="hidden xs:inline">追加</span>
            <span className="inline xs:hidden">予定</span>
          </button>

          <div className="hidden lg:block w-px h-6 bg-slate-200" />
          <div className="w-8 h-8 rounded-full bg-slate-100 hidden lg:flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">{CURRENT_USER.substring(0, 1)}</div>
        </div>
      </header>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[400] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className={`p-6 lg:p-8 text-white relative flex-shrink-0 ${selectedTask.status === 'done' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    {selectedTask.priority} Priority
                  </span>
                  {selectedTask.isRoutine && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Routine
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-white/70 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <h2 className={`text-2xl lg:text-3xl font-bold mb-2 ${selectedTask.status === 'done' ? 'line-through opacity-80' : ''}`}>
                {selectedTask.title}
              </h2>
              <div className="flex flex-wrap gap-4 text-white/80 text-sm">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {selectedTask.startTime} ({selectedTask.durationMinutes}分)
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  担当: {selectedTask.assignee}
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8 space-y-8 bg-slate-50 overflow-y-auto">
              {/* Notes Section */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  メモ・詳細
                </h3>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-h-[100px] relative group">
                  <textarea
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-700 resize-none min-h-[80px]"
                    placeholder="ここにメモを入力... (Ctrl+Vで画像を貼り付け可能)"
                    value={selectedTask.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, notes: val } : t));
                      setSelectedTask(prev => prev ? { ...prev, notes: val } : null);
                    }}
                    onPaste={(e) => handlePaste(e, false, selectedTask.id)}
                  />
                </div>
              </section>

              {/* Comments Section */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  コメント
                </h3>
                <div className="space-y-3 mb-4">
                  {selectedTask.comments?.map(comment => (
                    <div key={comment.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-indigo-600">{comment.author}</span>
                        <span className="text-[9px] text-slate-400">{comment.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{comment.text}</p>
                    </div>
                  ))}
                  {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                    <p className="text-[10px] text-slate-400 text-center py-2">コメントはまだありません</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="コメントを入力..." 
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment(selectedTask.id)}
                  />
                  <button 
                    onClick={() => addComment(selectedTask.id)}
                    className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </section>

              {/* Attachments Section */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    添付ファイル・写真
                  </h3>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      写真を撮る
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, false, selectedTask.id)} />
                    </label>
                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      ファイル
                      <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, false, selectedTask.id)} />
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {selectedTask.attachments?.map(file => (
                    <div key={file.id} className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all aspect-square flex flex-col">
                      {file.type.startsWith('image/') ? (
                        <div className="flex-1 overflow-hidden bg-slate-100">
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50">
                          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <div className="p-2 bg-white border-t border-slate-100">
                        <p className="text-[10px] font-medium text-slate-600 truncate">{file.name}</p>
                      </div>
                      <button 
                        onClick={() => removeAttachment(file.id, false, selectedTask.id)}
                        className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <a 
                        href={file.url} 
                        download={file.name}
                        className="absolute bottom-1 right-1 bg-white/90 text-slate-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                    </div>
                  ))}
                  {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                    <div className="col-span-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-xs">ファイルなし (Ctrl+Vで画像を貼り付け)</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="p-4 lg:p-6 border-t border-slate-100 flex gap-4 bg-white flex-shrink-0">
              <button 
                onClick={() => {
                  handleToggleTaskStatus(selectedTask.id);
                }} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  selectedTask.status === 'done' 
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {selectedTask.status === 'done' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    未完了に戻す
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    完了にする
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  handleDeleteTask(selectedTask.id);
                  setSelectedTask(null);
                }} 
                className="px-6 py-3 text-sm font-bold text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adding Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{formattedDate} に追加</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleAddTask} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">作成者</label>
                  <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="作成者名" value={newTask.creator} onChange={e => setNewTask({...newTask, creator: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">担当者</label>
                  <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="担当者名" value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">件名</label>
                <input autoFocus className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="タスクを入力..." value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">開始時間</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={newTask.startTime} onChange={e => setNewTask({...newTask, startTime: e.target.value})}>
                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">所要時間 (分)</label>
                  <input type="number" step="5" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={newTask.duration} onChange={e => setNewTask({...newTask, duration: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">優先度</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as Priority})}>
                    <option value="High">高</option>
                    <option value="Medium">中</option>
                    <option value="Low">低</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">通知</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={newTask.notificationMinutesBefore} onChange={e => setNewTask({...newTask, notificationMinutesBefore: parseInt(e.target.value)})}>
                    <option value={0}>なし</option>
                    <option value={5}>5分前</option>
                    <option value={10}>10分前</option>
                    <option value={15}>15分前</option>
                    <option value={30}>30分前</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">メモ・詳細</label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm min-h-[80px]" 
                  placeholder="メモを入力... (Ctrl+Vで画像を貼り付け可能)" 
                  value={newTask.notes} 
                  onChange={e => setNewTask({...newTask, notes: e.target.value})}
                  onPaste={(e) => handlePaste(e, true)}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">添付ファイル・写真</label>
                  <div className="flex gap-3">
                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      撮影
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                    </label>
                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      選択
                      <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newTask.attachments.map(file => (
                    <div key={file.id} className="relative group w-16 h-16 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => removeAttachment(file.id, true)}
                        className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {newTask.attachments.length === 0 && (
                    <div className="w-full py-4 border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-[10px]">
                      ファイルなし
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <input type="checkbox" id="routine-check" className="w-4 h-4 text-indigo-600 rounded" checked={newTask.isRoutine} onChange={e => setNewTask({...newTask, isRoutine: e.target.checked})} />
                <label htmlFor="routine-check" className="text-sm font-semibold text-indigo-700 cursor-pointer flex-1 leading-none">ルーティンとして登録</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-lg">キャンセル</button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Sidebar (Calendar & Stats) - Visible on Desktop or when 'calendar' tab active */}
        <aside className={`
          ${activeTab === 'calendar' ? 'flex w-full' : 'hidden'} 
          lg:flex lg:w-72 border-r border-slate-200 bg-white flex-col p-6 overflow-y-auto z-10 pb-24 lg:pb-6
        `}>
          <Calendar selectedDate={selectedDate} onDateSelect={(d) => { setSelectedDate(d); if(window.innerWidth < 1024) setActiveTab('schedule'); }} tasks={tasks} />
          
          <div className="mt-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">本日の統計</h3>
            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">達成率</div>
                <div className="flex items-end gap-3">
                  <span className="text-2xl font-bold text-slate-800 leading-none">{completionRate}%</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full mb-1 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${completionRate}%` }} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">ルーティン業務</div>
                  <div className="text-lg font-bold text-slate-700">
                    {completedRoutineTasks.length} <span className="text-xs text-slate-400 font-medium">/ {routineTasksForDay.length}</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">単発タスク</div>
                  <div className="text-lg font-bold text-slate-700">
                    {oneOffTasksDoneForDay.length} <span className="text-xs text-slate-400 font-medium">/ {oneOffTasksForDay.length}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                  <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">合計作業時間</div>
                  <div className="text-sm font-bold text-indigo-700">
                    {formatTime(completedTimeMinutes)}
                  </div>
                </div>
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                  <div className="text-[10px] text-amber-500 font-bold uppercase mb-1">予想残り時間</div>
                  <div className="text-sm font-bold text-amber-700">
                    {formatTime(remainingTimeMinutes)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 block lg:hidden">
              <button 
                onClick={() => setShowSummary(true)}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md"
              >
                一日の振り返りへ
              </button>
            </div>
          </div>
        </aside>

        {/* Center: Main Timeline - Visible when 'schedule' tab active on mobile, always on Desktop */}
        <main className={`
          ${activeTab === 'schedule' ? 'flex w-full' : 'hidden'} 
          lg:flex lg:flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50 flex-col
        `}>
          {overdueTasksCount > 0 && (
            <div className="w-full max-w-4xl mx-auto mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 text-rose-700 shadow-sm">
                <div className="bg-rose-500 text-white p-2 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-sm">未完了のタスクがあります</div>
                  <div className="text-xs opacity-80">予定時間を過ぎているタスクが {overdueTasksCount} 件あります。確認してください。</div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full max-w-4xl mx-auto mb-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">種別</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                >
                  <option value="All">すべて</option>
                  <option value="Routine">ルーティン</option>
                  <option value="One-off">単発</option>
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">人でフィルタ</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={filterPerson}
                  onChange={e => setFilterPerson(e.target.value)}
                >
                  <option value="All">全員</option>
                  {people.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-20 lg:mb-0">
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-3 lg:p-4">
                <div className="w-16 lg:w-20 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">時間</div>
                <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-3">スケジュール</div>
              </div>
              <div className="flex flex-col">
                {TIME_SLOTS.map((slotLabel) => {
                  const [slotH, slotM] = slotLabel.split(':').map(Number);
                  const slotMinutes = slotH * 60 + slotM;

                  return (
                    <TimeSlot
                      key={slotLabel}
                      label={slotLabel}
                      tasks={activeTasksForDay.filter((task) => {
                        const [taskH, taskM] = task.startTime.split(':').map(Number);
                        const taskMinutes = taskH * 60 + taskM;
                        return taskMinutes >= slotMinutes && taskMinutes < slotMinutes + 10;
                      })}
                      onDrop={handleTimeUpdate}
                      onDragStart={handleDragStart}
                      onComplete={handleToggleTaskStatus}
                      onDelete={handleDeleteTask}
                      isOverdue={isOverdue}
                      onClick={(task) => setSelectedTask(task)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Right: Completed - Visible when 'completed' tab active on mobile, always on Desktop */}
        <aside className={`
          ${activeTab === 'completed' ? 'flex w-full' : 'hidden'} 
          lg:flex lg:w-80 border-l border-slate-200 bg-white flex-col shadow-2xl z-10
        `}>
          <div className="p-4 lg:p-6 border-b border-slate-100 bg-emerald-50/20 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              完了済み
            </h2>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">{completedTasksForDay.length}件</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-20 lg:mb-0">
            {completedTasksForDay.length === 0 ? (
              <div className="h-40 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 text-[10px] text-center p-6">
                <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                完了したタスクがここに表示されます
              </div>
            ) : (
              completedTasksForDay.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={() => {}} 
                  onComplete={handleToggleTaskStatus} 
                  onDelete={handleDeleteTask} 
                  isOverdue={isOverdue(task)}
                  onClick={(task) => setSelectedTask(task)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'calendar' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
            <span className="text-[10px] font-bold">カレンダー</span>
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'schedule' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] font-bold">予定</span>
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'completed' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {completedTasksForDay.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className="text-[10px] font-bold">完了</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
